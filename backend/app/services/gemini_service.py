import os
import re
import httpx
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Model fallback list — trimmed for speed.  Ordered by quality.
GEMINI_MODELS = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemma-3-4b-it",
]

# Outline extraction only needs the lightest/fastest model.
GEMINI_MODELS_OUTLINE = [
    "gemini-2.0-flash-lite",
]


def _gemini_url(model: str) -> str:
    return (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={GEMINI_API_KEY}"
    )


# ===================================================================
# PUBLIC API
# ===================================================================

async def summarize_gemini(
    text: str, mode: str, *, cached_outline: str | None = None,
) -> str:
    """Summarization with tiered strategy per mode.

    - brief:    single-pass (no outline), 0 retries
    - medium:   two-pass (outline + summary), 1 retry
    - detailed: two-pass (outline + summary), 2 retries

    Args:
        text: The cleaned OCR text.
        mode: 'brief', 'medium', or 'detailed'.
        cached_outline: Reuse this outline instead of re-extracting.

    Returns:
        Complete summary string.
    """
    max_retries = {"brief": 0, "medium": 1, "detailed": 2}.get(mode, 1)

    # --- BRIEF: single-pass, no outline ---
    if mode == "brief":
        print(f"  📝 Single-pass brief summary (Gemini)...")
        summary, _ = await _generate_direct_summary(text, mode)
        print(f"  ✅ Brief summary complete ({len(summary.split())} words)")
        return summary

    # --- MEDIUM / DETAILED: two-pass ---
    if cached_outline:
        print("  📋 Using cached outline")
        outline = cached_outline
    else:
        print("  📋 Pass 1: Extracting document structure...")
        outline = await _extract_outline(text)
    section_labels = _parse_section_labels(outline)
    print(f"  📋 Extracted {len(section_labels)} sections from outline")

    print(f"  📝 Pass 2: Generating {mode} summary...")
    summary, was_truncated = await _generate_constrained_summary(
        text, outline, mode
    )

    # --- Validation + repair loop (tiered retries) ---
    for attempt in range(max_retries):
        validation = _validate_summary(
            summary, section_labels, text, mode, was_truncated
        )
        if validation["passed"]:
            break
        reasons = "; ".join(validation["issues"])
        print(f"  ⚠️  Validation failed (attempt {attempt+1}): {reasons}")
        print(f"  🔄 Repairing...")
        summary, was_truncated = await _repair_summary(
            text, outline, summary, mode, validation["issues"]
        )

    print(f"  ✅ {mode.capitalize()} summary complete "
          f"({len(summary.split())} words)")
    return summary


# ===================================================================
# PASS 1 — STRUCTURAL OUTLINE EXTRACTION
# ===================================================================

_EXTRACT_PROMPT = """\
Analyse the following document and produce a STRUCTURAL OUTLINE listing
every distinct section, sub-section, and key concept/item found in the
text, in the exact order they appear.

OUTPUT FORMAT — return a numbered list, one item per line:
1. [Section/Heading name] — [one-line description of what it covers]
2. ...

Rules:
- List EVERY heading, sub-heading, numbered/labelled item, definition,
  example, formula, classification, table, and key data point.
- Preserve the document's original ordering — do NOT reorder or group.
- If the text has no explicit headings, create descriptive labels for
  each logical block of content.
- Do NOT summarize content — only catalogue WHAT is there.
- IGNORE page artifacts: page numbers, dates in headers/footers,
  "Teacher's Signature", short institutional abbreviations (e.g. PPU,
  VTU), and any text that is clearly not part of the document content.
- Be exhaustive. Missing an item here means it will be missing from
  ALL summary levels.
- Continue until you have listed the VERY LAST item in the document.

DOCUMENT:
\"\"\"
{text}
\"\"\"

STRUCTURAL OUTLINE:"""


async def _extract_outline(text: str) -> str:
    """Pass 1: extract a structural outline of the document."""
    prompt = _EXTRACT_PROMPT.replace("{text}", text)
    result, _ = await _call_gemini(
        prompt,
        temperature=0.1,
        max_tokens=_estimate_outline_tokens(text),
        timeout=30,
        task_label="outline extraction",
        models=GEMINI_MODELS_OUTLINE,
    )
    return result


def _estimate_outline_tokens(text: str) -> int:
    """Outline is shorter than source — but be generous to avoid truncation."""
    return max(4096, min(len(text) // 4, 16384))


def _parse_section_labels(outline: str) -> list[str]:
    """Extract section labels from the numbered outline for validation."""
    labels = []
    for line in outline.splitlines():
        line = line.strip()
        m = re.match(r'^\d+[\.\)]\s*(.+?)(?:\s*[—–\-]\s*.+)?$', line)
        if m:
            label = m.group(1).strip().rstrip(":")
            if label:
                labels.append(label)
    if not labels:
        labels = [
            l.strip() for l in outline.splitlines()
            if l.strip() and not l.strip().startswith("#")
        ]
    return labels


# ===================================================================
# PASS 2 — CONSTRAINED SUMMARIZATION
# ===================================================================

_SHARED_RULES = (
    "ABSOLUTE RULES:\n"
    "1. CONCEPTUAL UNIFORMITY — ALL three summary levels (brief, medium,\n"
    "   detailed) must cover the SAME set of concepts. No concept that\n"
    "   appears in one level may be absent from another. The ONLY\n"
    "   difference between levels is how many words each concept gets:\n"
    "     brief  = name + one key fact (minimal words)\n"
    "     medium = definition + classification + key detail (moderate)\n"
    "     detailed = everything in medium + reasoning, impact,\n"
    "               context as stated in the source (thorough)\n"
    "2. NATURAL PROSE — Write connected sentences and paragraphs that\n"
    "   read like a condensed version of the original. Do NOT produce\n"
    "   bullet lists, labelled extractions, or mechanical entries.\n"
    "3. STRUCTURE MIRRORING — Follow the source's section order. Use\n"
    "   its headings. Do NOT merge, reorder, or restructure.\n"
    "4. EXPLICIT CLASSIFICATIONS — When the source assigns a\n"
    "   classification to ANY item (e.g. 'Classification: Functional\n"
    "   Requirement' or 'Non-functional Requirement'), you MUST\n"
    "   explicitly state that classification in ALL three levels.\n"
    "   NEVER leave a classification implied or unstated.\n"
    "   NEVER re-classify — reproduce the source's exact label.\n"
    "5. STRICTLY NO ADDITIONS — Every sentence must trace to a\n"
    "   specific passage in the source. Do NOT add interpretations,\n"
    "   evaluations, or commentary. FORBIDDEN: concluding sentences\n"
    "   that evaluate significance ('This ensures...', 'This\n"
    "   demonstrates...', 'This is crucial...'). Do NOT add a\n"
    "   closing/concluding sentence at the end.\n"
    "6. COMPRESS, NEVER DROP — Compression means fewer WORDS, not\n"
    "   fewer COMPONENTS. Every sub-point, condition, qualifier,\n"
    "   classification element, and logical step in the checklist\n"
    "   must appear in the summary — even if stated in just a few\n"
    "   words. NEVER silently omit a sub-point because it seems\n"
    "   minor or implied by a parent point.\n"
    "7. PRESERVE KEY DATA — Numbers, dates, formulas, names,\n"
    "   classifications, and technical terms kept exactly.\n"
    "8. MUST FINISH — Cover ALL content through to the document end.\n"
    "   If running low on space, compress more — NEVER stop early.\n"
    "9. IGNORE PAGE ARTIFACTS — Skip page numbers, signatures,\n"
    "   institutional abbreviations (PPU, VTU, etc.).\n"
    "10. ALWAYS SHORTER — The summary MUST be shorter than the original.\n"
    "11. LOGICAL SYMMETRY — If you state a classification, justification,\n"
    "    impact, or comparison for ONE item, you MUST state the same\n"
    "    kind of element for EVERY similar item in the source. Do NOT\n"
    "    selectively provide detail for some items while omitting it\n"
    "    for others of the same type.\n"
    "12. PRESERVE IMPLICIT LOGIC — When the source establishes a logical\n"
    "    connection (cause → effect, condition → consequence, premise →\n"
    "    conclusion), state that connection explicitly in the summary.\n"
    "    The reader should NOT need to infer relationships that the\n"
    "    source spelled out.\n"
)


def _build_constrained_prompt(text: str, outline: str, mode: str) -> str:
    """Build the Pass 2 prompt for flowing prose summarization."""
    word_count = len(text.split())
    targets = _word_targets(word_count)
    target = targets[mode]

    mode_instructions = {
        "brief": (
            f"COMPRESSION LEVEL: BRIEF (~{target} words total).\n"
            "Write a short, continuous paragraph (or a few short paragraphs\n"
            "following the source's sections). For each concept in the\n"
            "checklist: mention it by name with its single most important\n"
            "fact — nothing more. Impact statements, failure consequences,\n"
            "and classifications must still be MENTIONED, but in minimal\n"
            "words (e.g. 'Failing NFRs can make the system unusable').\n"
            "Sub-points and qualifiers: compress to a word or clause, but\n"
            "do NOT skip them. No elaboration. No concluding sentences.\n"
            "Flowing text only.\n"
        ),
        "medium": (
            f"COMPRESSION LEVEL: MEDIUM (~{target} words total).\n"
            "Write a condensed version in connected prose using the\n"
            "source's section headings. For each concept: state what it\n"
            "is, its classification (as stated in the source), and its\n"
            "key details or metrics — in 1-3 sentences.\n"
            "Impact statements and failure consequences from the source\n"
            "MUST be included but stated briefly (1 sentence max each).\n"
            "Do NOT elaborate on reasoning or justifications — just state\n"
            "the facts and classifications.\n"
            "PROPORTIONAL DEPTH: every section and every item of the same\n"
            "type must receive approximately the same depth. Do NOT give\n"
            "2 sentences to one requirement and 0 to another. If a\n"
            "classification is stated for item X, state it for item Y too.\n"
            "No added commentary.\n"
        ),
        "detailed": (
            f"COMPRESSION LEVEL: DETAILED (~{target} words total).\n"
            "Write a thorough condensed version in flowing prose using the\n"
            "source's section headings. Include everything from medium PLUS\n"
            "the following additional layers (ONLY if present in source):\n"
            "  • The author's reasoning/justification for classifications\n"
            "  • Expanded impact and consequence statements\n"
            "  • Relationships and comparisons between concepts\n"
            "  • Supporting context and elaboration from the source\n"
            "UNIFORM EXPANSION: the additional depth must be spread evenly\n"
            "across ALL sections and items. Do NOT expand only some sections\n"
            "while leaving others at medium depth. Every section should be\n"
            "noticeably more thorough than its medium counterpart.\n"
            "Write connected paragraphs. Every sentence must trace to the\n"
            "source. No added commentary.\n"
        ),
    }

    prompt = (
        "You are a summariser. You will condense the source text into\n"
        "natural, flowing prose at the specified compression level.\n\n"
        "The STRUCTURAL OUTLINE below is your COMPLETENESS CHECKLIST —\n"
        "verify that every item in it appears in your summary. But do\n"
        "NOT use the outline as a formatting template. Write the summary\n"
        "as if you are rewriting the original document in fewer words,\n"
        "not as if you are filling in an outline.\n\n"
        "═══ COMPLETENESS CHECKLIST ═══\n"
        f"{outline}\n\n"
        "═══ COMPRESSION INSTRUCTIONS ═══\n"
        f"{mode_instructions[mode]}\n"
        f"{_SHARED_RULES}\n"
        f"TARGET LENGTH: ~{target} words (original is {word_count} words).\n"
        f"Hierarchy: brief({targets['brief']}w) < medium({targets['medium']}w)"
        f" < detailed({targets['detailed']}w) < original({word_count}w).\n\n"
        f"═══ FULL SOURCE TEXT ═══\n\"\"\"\n{text}\n\"\"\"\n\n"
        f"{mode.upper()} SUMMARY:"
    )
    return prompt


async def _generate_constrained_summary(
    text: str, outline: str, mode: str
) -> tuple[str, bool]:
    """Pass 2: generate summary. Returns (summary, was_truncated)."""
    prompt = _build_constrained_prompt(text, outline, mode)
    timeout = {"brief": 30, "medium": 45, "detailed": 60}.get(mode, 45)
    return await _call_gemini(
        prompt,
        temperature=0.15,
        max_tokens=_max_tokens(text, mode),
        timeout=timeout,
        task_label=f"{mode} summary",
    )


# ===================================================================
# SINGLE-PASS DIRECT SUMMARY (for brief mode — no outline needed)
# ===================================================================

_DIRECT_PROMPT = """\
Summarize the following document in a short, flowing paragraph.
Mention every key topic by name with its single most important fact.
Do NOT use bullet points. Do NOT add commentary or conclusions.
Keep it under {target} words.

DOCUMENT:
\"\"\"
{text}
\"\"\"

BRIEF SUMMARY:"""


async def _generate_direct_summary(
    text: str, mode: str,
) -> tuple[str, bool]:
    """Single-pass summary without outline extraction."""
    word_count = len(text.split())
    target = max(20, int(word_count * 0.25))
    prompt = _DIRECT_PROMPT.replace("{text}", text).replace("{target}", str(target))
    return await _call_gemini(
        prompt,
        temperature=0.15,
        max_tokens=max(2048, min(word_count, 8192)),
        timeout=30,
        task_label="brief direct summary",
    )


# ===================================================================
# VALIDATION — catches truncation, missing sections, length violations
# ===================================================================

def _validate_summary(
    summary: str,
    section_labels: list[str],
    source_text: str,
    mode: str,
    was_truncated: bool = False,
) -> dict:
    """Validate summary completeness. Returns {passed, issues}."""
    issues = []
    source_words = len(source_text.split())
    summary_words = len(summary.split())

    # 1. API-level truncation (finishReason was MAX_TOKENS)
    if was_truncated:
        issues.append("API reported output was truncated (MAX_TOKENS)")

    # 2. Heuristic truncation — ends mid-sentence
    stripped = summary.rstrip()
    if stripped and stripped[-1] not in '.!?:)"]|*_`~>—–-':
        issues.append("ends mid-sentence (no terminal punctuation)")

    # 3. Summary longer than original — a summary must be SHORTER
    if summary_words > source_words * 0.95:
        issues.append(
            f"summary ({summary_words}w) is not shorter than original ({source_words}w)"
        )

    # 4. Suspiciously short
    targets = _word_targets(source_words)
    target = targets[mode]
    if summary_words < target * 0.20:
        issues.append(
            f"too short ({summary_words}w vs target ~{target}w)"
        )

    # 5. Section coverage — overall
    if section_labels:
        summary_lower = summary.lower()
        found = 0
        missing = []
        for label in section_labels:
            if _label_found_in(label, summary_lower):
                found += 1
            else:
                missing.append(label)

        coverage = found / len(section_labels)
        if coverage < 0.70:
            issues.append(
                f"only {found}/{len(section_labels)} sections covered "
                f"({coverage:.0%}). Missing: {', '.join(missing[:8])}"
            )

        # 6. TAIL coverage — last 30% of outline items must also appear
        #    This catches the "starts fine but stops halfway" pattern.
        tail_start = max(0, len(section_labels) - max(2, len(section_labels) * 3 // 10))
        tail_labels = section_labels[tail_start:]
        if tail_labels:
            tail_found = sum(
                1 for lb in tail_labels
                if _label_found_in(lb, summary_lower)
            )
            tail_cov = tail_found / len(tail_labels)
            if tail_cov < 0.50:
                tail_missing = [
                    lb for lb in tail_labels
                    if not _label_found_in(lb, summary_lower)
                ]
                issues.append(
                    f"tail sections missing ({tail_found}/{len(tail_labels)} "
                    f"of last items covered). Missing: "
                    f"{', '.join(tail_missing[:5])}"
                )

    return {"passed": len(issues) == 0, "issues": issues}


def _label_found_in(label: str, text_lower: str) -> bool:
    """Check if a section label's key words appear in the summary text."""
    _STOP_WORDS = {
        "the", "and", "for", "with", "from", "that", "this",
        "are", "was", "were", "been", "have", "has", "had",
        "will", "shall", "should", "could", "would", "about",
        "into", "also", "each", "such", "over", "only", "more",
        "based", "using", "their", "them", "they", "which",
    }
    key_words = [
        w for w in label.lower().split()
        if len(w) > 3 and w not in _STOP_WORDS
    ]
    if not key_words:
        return True  # label has only stop words — assume covered
    matches = sum(1 for w in key_words if w in text_lower)
    return matches >= max(1, len(key_words) * 0.5)


# ===================================================================
# REPAIR PASS
# ===================================================================

async def _repair_summary(
    text: str, outline: str, failed_summary: str,
    mode: str, issues: list[str]
) -> tuple[str, bool]:
    """Re-generate with explicit problem description. Returns (text, truncated)."""
    word_count = len(text.split())
    targets = _word_targets(word_count)
    target = targets[mode]
    issue_text = "\n".join(f"  - {i}" for i in issues)

    prompt = (
        "A summary was generated but FAILED validation:\n\n"
        f"PROBLEMS:\n{issue_text}\n\n"
        "STRUCTURAL OUTLINE (every item MUST be covered):\n"
        f"{outline}\n\n"
        f"ORIGINAL SOURCE TEXT:\n\"\"\"\n{text}\n\"\"\"\n\n"
        "INSTRUCTIONS — produce a COMPLETE, CORRECTED "
        f"{mode.upper()} summary:\n"
        f"- Cover EVERY outline item from first to last (~{target} words)\n"
        "- End with a proper sentence — no truncation\n"
        "- Do NOT exceed the original's length\n"
        "- Do NOT add content not in the source\n"
        "- Follow the source's section order\n"
        "- If space is tight, compress more aggressively — NEVER skip items\n\n"
        "Output ONLY the corrected summary:\n\n"
        f"CORRECTED {mode.upper()} SUMMARY:"
    )

    timeout = {"brief": 30, "medium": 45, "detailed": 60}.get(mode, 45)
    return await _call_gemini(
        prompt,
        temperature=0.10,
        max_tokens=_max_tokens(text, mode),
        timeout=timeout,
        task_label=f"{mode} repair",
    )


# ===================================================================
# LOW-LEVEL GEMINI CALL — returns (text, was_truncated)
# ===================================================================

async def _call_gemini(
    prompt: str,
    temperature: float,
    max_tokens: int,
    timeout: float,
    task_label: str,
    models: list[str] | None = None,
) -> tuple[str, bool]:
    """Call Gemini with model fallback. Returns (text, was_truncated).

    Checks the API's `finishReason` field:
      - "STOP"       → normal completion
      - "MAX_TOKENS" → output was truncated
    """
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
        },
    }

    use_models = models or GEMINI_MODELS
    errors = []
    async with httpx.AsyncClient() as client:
        for model in use_models:
            url = _gemini_url(model)
            try:
                print(f"    🔹 [{task_label}] Trying {model}...")
                response = await client.post(url, json=payload, timeout=timeout)

                if response.status_code == 200:
                    data = response.json()
                    try:
                        candidate = data["candidates"][0]
                        result = (
                            candidate["content"]["parts"][0]["text"].strip()
                        )
                        # Check finishReason for truncation
                        finish = candidate.get("finishReason", "STOP")
                        was_truncated = finish in (
                            "MAX_TOKENS", "RECITATION", "OTHER"
                        )
                        if was_truncated:
                            print(
                                f"    ⚠️  [{task_label}] {model} — "
                                f"finishReason={finish} (truncated)"
                            )
                        else:
                            print(f"    ✅ [{task_label}] Success with {model}")
                        return result, was_truncated

                    except (KeyError, IndexError) as e:
                        errors.append(f"{model}: bad response format – {e}")
                        continue

                if response.status_code == 429:
                    errors.append(f"{model}: quota exhausted (429)")
                    print(f"    ⚠️  {model} quota exhausted, trying next...")
                    continue

                if response.status_code >= 500:
                    errors.append(f"{model}: server error ({response.status_code})")
                    print(f"    ⚠️  {model} server error, trying next...")
                    continue

                errors.append(
                    f"{model}: API error {response.status_code}: "
                    f"{response.text[:200]}"
                )
                print(f"    ⚠️  {model} returned {response.status_code}")

            except httpx.TimeoutException:
                errors.append(f"{model}: timed out ({timeout}s)")
                print(f"    ⚠️  {model} timed out, trying next...")
            except Exception as e:
                errors.append(f"{model}: {e}")
                print(f"    ⚠️  {model} failed ({e}), trying next...")

    raise Exception(
        f"All Gemini models failed for {task_label}: {'; '.join(errors)}"
    )


# ===================================================================
# HELPERS
# ===================================================================

def _word_targets(word_count: int) -> dict:
    """Proportional word targets that NEVER exceed the source length.

    For a 200-word doc  → brief ~50, medium ~100, detailed ~150
    For a 2000-word doc → brief ~500, medium ~1000, detailed ~1500
    Always: brief < medium < detailed < original.
    """
    raw = {
        "brief": int(word_count * 0.25),
        "medium": int(word_count * 0.50),
        "detailed": int(word_count * 0.75),
    }
    # Small minimums only for very tiny documents (< 80 words)
    mins = {"brief": 20, "medium": 40, "detailed": 60}
    cap = int(word_count * 0.90)  # never exceed 90% of source

    targets = {}
    for mode in ("brief", "medium", "detailed"):
        t = max(mins[mode], raw[mode])
        t = min(t, cap)  # hard cap below source length
        targets[mode] = t

    # Enforce strict hierarchy: brief < medium < detailed
    if targets["medium"] <= targets["brief"]:
        targets["medium"] = targets["brief"] + max(10, word_count // 20)
    if targets["detailed"] <= targets["medium"]:
        targets["detailed"] = targets["medium"] + max(10, word_count // 20)

    # Final safety: none can exceed source
    for mode in targets:
        targets[mode] = min(targets[mode], word_count)

    return targets


def _max_tokens(text: str, mode: str) -> int:
    """Generous token ceiling to prevent truncation.

    The prompt's word targets control actual length; this is just
    a safety ceiling so the model has room to finish.
    """
    estimated_input_tokens = len(text) // 4

    # Very generous — we'd rather the model finishes than truncates
    ratios = {"brief": 0.50, "medium": 0.75, "detailed": 1.0}
    ratio = ratios.get(mode, 0.75)
    tokens = int(estimated_input_tokens * ratio)

    # High minimums — short docs need room too
    mins = {"brief": 4096, "medium": 8192, "detailed": 12288}
    token_min = mins.get(mode, 8192)

    return max(token_min, min(tokens, 65536))
