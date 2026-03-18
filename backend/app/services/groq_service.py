import os
import re
import httpx
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

# Model lists — outline extraction uses fast model, summaries use quality.
GROQ_MODELS_OUTLINE = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
]

GROQ_MODELS_SUMMARY = {
    "brief": ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"],
    "medium": ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    "detailed": ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
}


# ===================================================================
# PUBLIC API
# ===================================================================

async def summarize_groq(
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
        Complete, validated summary string.
    """
    max_retries = {"brief": 0, "medium": 1, "detailed": 2}.get(mode, 1)

    # --- BRIEF: single-pass, no outline ---
    if mode == "brief":
        print(f"  📝 Single-pass brief summary (Groq)...")
        summary, _ = await _generate_direct_summary(text, mode)
        print(f"  ✅ Brief summary complete ({len(summary.split())} words) [Groq]")
        return summary

    # --- MEDIUM / DETAILED: two-pass ---
    if cached_outline:
        print("  📋 Using cached outline (Groq)")
        outline = cached_outline
    else:
        print("  📋 Pass 1: Extracting document structure (Groq)...")
        outline = await _extract_outline(text)
    section_labels = _parse_section_labels(outline)
    print(f"  📋 Extracted {len(section_labels)} sections from outline")

    print(f"  📝 Pass 2: Generating {mode} summary (Groq)...")
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
        print(f"  🔄 Repairing (Groq)...")
        summary, was_truncated = await _repair_summary(
            text, outline, summary, mode, validation["issues"]
        )

    print(f"  ✅ {mode.capitalize()} summary complete "
          f"({len(summary.split())} words) [Groq]")
    return summary


# ===================================================================
# PASS 1 — STRUCTURAL OUTLINE EXTRACTION
# ===================================================================

_EXTRACT_SYSTEM = (
    "You are a document analyst. Produce an exhaustive structural "
    "outline — every section, heading, key concept, and data point, "
    "in the document's original order. Do NOT summarize."
)

_EXTRACT_USER = """\
Analyse the following document and produce a STRUCTURAL OUTLINE listing
every distinct section, sub-section, and key concept/item found in the
text, in the exact order they appear.

OUTPUT FORMAT — numbered list, one item per line:
1. [Section/Heading name] — [one-line description]
2. ...

Rules:
- List EVERY heading, sub-heading, numbered/labelled item, definition,
  example, formula, classification, table, and key data point.
- Preserve original ordering — do NOT reorder or group.
- If no explicit headings, create descriptive labels for each block.
- Do NOT summarize — only list WHAT is there.
- IGNORE page artifacts: page numbers, dates in headers/footers,
  "Teacher's Signature", short institutional abbreviations (e.g. PPU,
  VTU), and any text clearly not part of the document content.
- Be exhaustive. Continue until the VERY LAST item.

DOCUMENT:
\"\"\"
{text}
\"\"\"

STRUCTURAL OUTLINE:"""


async def _extract_outline(text: str) -> str:
    user_prompt = _EXTRACT_USER.replace("{text}", text)
    result, _ = await _call_groq(
        system=_EXTRACT_SYSTEM,
        user=user_prompt,
        models=GROQ_MODELS_OUTLINE,
        temperature=0.1,
        max_tokens=_estimate_outline_tokens(text),
        timeout=20,
        task_label="outline extraction",
    )
    return result


def _estimate_outline_tokens(text: str) -> int:
    return max(4096, min(len(text) // 4, 12000))


def _parse_section_labels(outline: str) -> list[str]:
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

_SUMMARY_SYSTEM = (
    "You are a summariser. Condense source text into natural, flowing prose. "
    "Cover 100% of concepts without adding, interpreting, or reordering. "
    "Use the structural outline as a completeness checklist, NOT as a "
    "formatting template. Write connected paragraphs that read like a "
    "shorter version of the original document. When the source classifies "
    "something, reproduce that EXACT classification. Do NOT add concluding "
    "or evaluative sentences not present in the source. NEVER produce "
    "bullet-point lists or mechanical item-by-item extractions."
)

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
        "Condense the source text into natural, flowing prose at the\n"
        "specified compression level.\n\n"
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
        f"TARGET LENGTH: ~{target} words (original: {word_count} words).\n"
        f"Hierarchy: brief({targets['brief']}w) < medium({targets['medium']}w)"
        f" < detailed({targets['detailed']}w) < original({word_count}w).\n\n"
        f"═══ FULL SOURCE TEXT ═══\n\"\"\"\n{text}\n\"\"\"\n\n"
        f"{mode.upper()} SUMMARY:"
    )
    return prompt


async def _generate_constrained_summary(
    text: str, outline: str, mode: str
) -> tuple[str, bool]:
    user_prompt = _build_constrained_prompt(text, outline, mode)
    models = GROQ_MODELS_SUMMARY.get(mode, GROQ_MODELS_SUMMARY["medium"])
    return await _call_groq(
        system=_SUMMARY_SYSTEM,
        user=user_prompt,
        models=models,
        temperature=0.15,
        max_tokens=_max_tokens(text, mode),
        timeout={"brief": 20, "medium": 35, "detailed": 50}.get(mode, 35),
        task_label=f"{mode} summary",
    )


# ===================================================================
# SINGLE-PASS DIRECT SUMMARY (for brief mode — no outline needed)
# ===================================================================

_DIRECT_SYSTEM = (
    "You are a summariser. Write a short, flowing paragraph that mentions "
    "every key topic by name with its single most important fact. "
    "Do NOT use bullet points. Do NOT add commentary or conclusions."
)

_DIRECT_USER = """\
Summarize the following document in a short, flowing paragraph.
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
    user_prompt = _DIRECT_USER.replace("{text}", text).replace("{target}", str(target))
    models = GROQ_MODELS_SUMMARY.get("brief", GROQ_MODELS_SUMMARY["medium"])
    return await _call_groq(
        system=_DIRECT_SYSTEM,
        user=user_prompt,
        models=models,
        temperature=0.15,
        max_tokens=max(2048, min(word_count, 8192)),
        timeout=20,
        task_label="brief direct summary",
    )


# ===================================================================
# VALIDATION
# ===================================================================

def _validate_summary(
    summary: str,
    section_labels: list[str],
    source_text: str,
    mode: str,
    was_truncated: bool = False,
) -> dict:
    issues = []
    source_words = len(source_text.split())
    summary_words = len(summary.split())

    # 1. API-level truncation
    if was_truncated:
        issues.append("API reported truncation (finish_reason=length)")

    # 2. Heuristic truncation
    stripped = summary.rstrip()
    if stripped and stripped[-1] not in '.!?:)"]|*_`~>—–-':
        issues.append("ends mid-sentence")

    # 3. Summary must be shorter than original
    if summary_words > source_words * 0.95:
        issues.append(
            f"summary ({summary_words}w) is not shorter than original ({source_words}w)"
        )

    # 4. Suspiciously short
    targets = _word_targets(source_words)
    target = targets[mode]
    if summary_words < target * 0.20:
        issues.append(f"too short ({summary_words}w vs ~{target}w target)")

    # 5. Section coverage
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

        # 6. Tail coverage — last 30%
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
                    f"tail sections missing ({tail_found}/{len(tail_labels)}). "
                    f"Missing: {', '.join(tail_missing[:5])}"
                )

    return {"passed": len(issues) == 0, "issues": issues}


def _label_found_in(label: str, text_lower: str) -> bool:
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
        return True
    matches = sum(1 for w in key_words if w in text_lower)
    return matches >= max(1, len(key_words) * 0.5)


# ===================================================================
# REPAIR PASS
# ===================================================================

async def _repair_summary(
    text: str, outline: str, failed_summary: str,
    mode: str, issues: list[str]
) -> tuple[str, bool]:
    word_count = len(text.split())
    targets = _word_targets(word_count)
    target = targets[mode]
    issue_text = "\n".join(f"  - {i}" for i in issues)

    user_prompt = (
        "A summary FAILED validation:\n\n"
        f"PROBLEMS:\n{issue_text}\n\n"
        "STRUCTURAL OUTLINE (every item MUST be covered):\n"
        f"{outline}\n\n"
        f"ORIGINAL SOURCE TEXT:\n\"\"\"\n{text}\n\"\"\"\n\n"
        f"Produce a COMPLETE, CORRECTED {mode.upper()} summary:\n"
        f"- Cover EVERY outline item (~{target} words)\n"
        "- End with a proper sentence\n"
        "- Do NOT exceed original length\n"
        "- Do NOT add content not in the source\n"
        "- Follow source section order\n"
        "- Compress more aggressively if needed — NEVER skip items\n\n"
        f"CORRECTED {mode.upper()} SUMMARY:"
    )

    repair_system = (
        "You are a summary repair agent. Fix all listed issues. "
        "Cover every outline item. Do not add content not in the source."
    )

    models = GROQ_MODELS_SUMMARY.get(mode, GROQ_MODELS_SUMMARY["medium"])
    return await _call_groq(
        system=repair_system,
        user=user_prompt,
        models=models,
        temperature=0.10,
        max_tokens=_max_tokens(text, mode),
        timeout={"brief": 20, "medium": 35, "detailed": 50}.get(mode, 35),
        task_label=f"{mode} repair",
    )


# ===================================================================
# LOW-LEVEL GROQ CALL — returns (text, was_truncated)
# ===================================================================

async def _call_groq(
    system: str,
    user: str,
    models: list[str],
    temperature: float,
    max_tokens: int,
    timeout: float,
    task_label: str,
) -> tuple[str, bool]:
    """Call Groq API with model fallback. Returns (text, was_truncated).

    Checks `finish_reason`:
      - "stop"   → normal completion
      - "length" → output truncated by max_tokens
    """
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    errors = []
    async with httpx.AsyncClient() as client:
        for model in models:
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": temperature,
                "max_tokens": max_tokens,
            }

            try:
                print(f"    🔸 [{task_label}] Trying Groq {model}...")
                response = await client.post(
                    GROQ_URL, json=payload, headers=headers, timeout=timeout
                )

                if response.status_code == 200:
                    data = response.json()
                    try:
                        choice = data["choices"][0]
                        result = choice["message"]["content"].strip()
                        finish = choice.get("finish_reason", "stop")
                        was_truncated = finish == "length"
                        if was_truncated:
                            print(
                                f"    ⚠️  [{task_label}] {model} — "
                                f"finish_reason=length (truncated)"
                            )
                        else:
                            print(f"    ✅ [{task_label}] Success with Groq ({model})")
                        return result, was_truncated

                    except (KeyError, IndexError) as e:
                        errors.append(f"{model}: bad format – {e}")
                        continue

                if response.status_code == 429:
                    errors.append(f"{model}: rate limited (429)")
                    print(f"    ⚠️  {model} rate limited, trying next...")
                    continue

                errors.append(f"{model}: API error {response.status_code}")
                print(f"    ⚠️  {model} returned {response.status_code}")

            except httpx.TimeoutException:
                errors.append(f"{model}: timed out")
                print(f"    ⚠️  {model} timed out, trying next...")
            except Exception as e:
                errors.append(f"{model}: {e}")
                print(f"    ⚠️  {model} failed ({e}), trying next...")

    raise Exception(
        f"All Groq models failed for {task_label}: {'; '.join(errors)}"
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
    mins = {"brief": 20, "medium": 40, "detailed": 60}
    cap = int(word_count * 0.90)

    targets = {}
    for mode in ("brief", "medium", "detailed"):
        t = max(mins[mode], raw[mode])
        t = min(t, cap)
        targets[mode] = t

    if targets["medium"] <= targets["brief"]:
        targets["medium"] = targets["brief"] + max(10, word_count // 20)
    if targets["detailed"] <= targets["medium"]:
        targets["detailed"] = targets["medium"] + max(10, word_count // 20)

    for mode in targets:
        targets[mode] = min(targets[mode], word_count)

    return targets


def _max_tokens(text: str, mode: str) -> int:
    estimated_input_tokens = len(text) // 4
    ratios = {"brief": 0.50, "medium": 0.75, "detailed": 1.0}
    ratio = ratios.get(mode, 0.75)
    tokens = int(estimated_input_tokens * ratio)
    mins = {"brief": 4096, "medium": 8192, "detailed": 12288}
    token_min = mins.get(mode, 8192)
    # Groq caps at ~32K context
    return max(token_min, min(tokens, 20000))
