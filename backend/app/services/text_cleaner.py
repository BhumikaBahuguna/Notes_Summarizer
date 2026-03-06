import os
import re
import httpx
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Lighter model list for cleaning (simpler task than summarization).
# Cleaning just removes OCR artifacts — even small models handle it well.
GEMINI_MODELS = [
    "gemini-2.0-flash-lite",   # lightest, fastest — perfect for cleaning
    "gemini-2.5-flash-lite",   # light variant
    "gemini-2.0-flash",        # stable fallback
    "gemma-3-4b-it",           # small open model, last resort
]

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

CLEAN_PROMPT = """You are a text cleaner for OCR-extracted notes. Your ONLY job is to clean the raw OCR output — NOT summarize, NOT rewrite, NOT rephrase.

REMOVE these OCR artifacts:
- Page numbers (e.g., "Page 1", "- 2 -", "1/5", "Page No.")
- Dates that are headers/footers (e.g., "20/02/2026", "Date: ___", "Date.____")
- Teacher/student signature lines (e.g., "Teacher's Signature", "Sign: ___", "Checked by:")
- Short institutional abbreviations that appear at page edges (e.g., "PPU", "VTU", "GTU", "SPPU") — these are page-printed university logos/names, NOT content
- Watermarks or repeated header/footer text
- Random symbols or garbage characters from OCR errors (e.g., "|||", "***", "~~~", "□□□")
- Repeated blank lines or excessive whitespace
- "Page break" indicators
- University/college headers if repeated on every page

DO NOT REMOVE:
- Any actual content, definitions, explanations, examples, or formulas
- Dates that are PART of the content (e.g., historical dates, event dates mentioned in notes)
- Names that are part of the content (authors, scientists, historical figures)
- Numbering that is part of lists or points (1., 2., 3., a., b., etc.)
- Mathematical symbols, equations, or formulas
- ANY piece of information that contributes to learning

RULES:
1. Output ONLY the cleaned text — no explanations, no comments, no "Here is the cleaned text:"
2. Preserve the original structure, order, and flow
3. Keep all headings, subheadings, and topic markers
4. Fix obvious OCR typos ONLY if you are 100% certain (e.g., "teh" → "the")
5. Do NOT add anything that wasn't in the original
6. If in doubt whether something is artifact or content, KEEP IT

RAW OCR TEXT:
\"\"\"
{text}
\"\"\"

CLEANED TEXT:"""


async def clean_text(raw_text: str) -> dict:
    """Clean OCR-extracted text using AI. Falls back through Gemini → Groq.

    Fully async — does not block FastAPI's event loop.

    Returns:
        dict with keys: cleaned_text, cleaner
    """
    if not raw_text or not raw_text.strip():
        return {"cleaned_text": raw_text, "cleaner": None}

    # Pre-filter: strip common notebook page artifacts with regex
    raw_text = _strip_page_artifacts(raw_text)

    prompt = CLEAN_PROMPT.replace("{text}", raw_text)

    # 1. Try Gemini
    try:
        print("🧹 Cleaning text with Gemini...")
        cleaned = await _clean_with_gemini(prompt)
        if cleaned:
            return {"cleaned_text": cleaned, "cleaner": "gemini"}
    except Exception as e:
        print(f"❌ Gemini cleaning failed: {e}")

    # 2. Try Groq
    try:
        print("🧹 Falling back to Groq for cleaning...")
        cleaned = await _clean_with_groq(prompt)
        if cleaned:
            return {"cleaned_text": cleaned, "cleaner": "groq"}
    except Exception as e:
        print(f"❌ Groq cleaning failed: {e}")

    # 3. All failed — return original
    print("⚠️ AI cleaning failed, using raw text")
    return {"cleaned_text": raw_text, "cleaner": None}


async def _clean_with_gemini(prompt: str) -> str:
    """Try multiple Gemini models for cleaning, same fallback logic as summarization."""
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 8192,
        },
    }

    errors = []
    async with httpx.AsyncClient() as client:
        for model in GEMINI_MODELS:
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{model}:generateContent?key={GEMINI_API_KEY}"
            )
            try:
                print(f"    🔹 Cleaning with Gemini model: {model}...")
                response = await client.post(url, json=payload, timeout=30)

                if response.status_code == 200:
                    data = response.json()
                    try:
                        result = (
                            data["candidates"][0]["content"]["parts"][0]["text"].strip()
                        )
                        print(f"    ✅ Cleaning success with {model}")
                        return result
                    except (KeyError, IndexError) as e:
                        errors.append(f"{model}: unexpected response format – {e}")
                        continue

                if response.status_code == 429:
                    errors.append(f"{model}: quota exhausted (429)")
                    print(f"    ⚠️  {model} quota exhausted, trying next...")
                    continue

                if response.status_code >= 500:
                    errors.append(f"{model}: server error ({response.status_code})")
                    continue

                errors.append(f"{model}: API error {response.status_code}")
                continue

            except httpx.TimeoutException:
                errors.append(f"{model}: timed out")
                continue
            except Exception as e:
                errors.append(f"{model}: {e}")
                continue

    raise Exception(f"All Gemini models failed for cleaning: {'; '.join(errors)}")


async def _clean_with_groq(prompt: str) -> str:
    """Clean text using Groq. Uses fast 8b model since cleaning is a simple task."""
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "llama-3.1-8b-instant",  # fast model — cleaning is simple
        "messages": [
            {
                "role": "system",
                "content": "You are an OCR text cleaner. Output only the cleaned text, nothing else.",
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.1,
        "max_tokens": 8192,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            GROQ_URL, json=payload, headers=headers, timeout=20
        )

    if response.status_code != 200:
        raise Exception(
            f"Groq API error {response.status_code}: {response.text[:200]}"
        )

    data = response.json()
    return data["choices"][0]["message"]["content"].strip()


# ===================================================================
# REGEX PRE-FILTER — strips common notebook / exam-page artifacts
# before sending to AI, so the AI doesn't treat them as content.
# ===================================================================

_PAGE_ARTIFACT_PATTERNS = [
    # "Teacher's Signature", "Teacher Signature", "Sign:", "Checked by:"
    r"(?i)\bteacher'?s?\s*signature\b[:\s]*",
    r"(?i)\b(?:sign|signature|checked\s*by)\s*[:_\-\.]*\s*$",
    # "Page No.", "Page No___", "Page 1", "- 2 -"
    r"(?i)\bpage\s*(?:no\.?|number)?\s*[:\-_\.]*\s*\d*\s*",
    r"^\s*-\s*\d+\s*-\s*$",
    # "Date___", "Date.____", standalone date headers
    r"(?i)^\s*date\s*[:\.\-_]+\s*$",
    # Short university abbreviations alone on a line (PPU, VTU, GTU, etc.)
    r"(?im)^\s*[A-Z]{2,5}\s*$",
    # Blank-line runs (3+ → 1)
    r"\n{3,}",
]


def _strip_page_artifacts(text: str) -> str:
    """Remove common notebook page-edge artifacts via regex."""
    for pattern in _PAGE_ARTIFACT_PATTERNS:
        if pattern == r"\n{3,}":
            text = re.sub(pattern, "\n\n", text)
        else:
            text = re.sub(pattern, "", text)
    # Clean up any leftover multiple blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
