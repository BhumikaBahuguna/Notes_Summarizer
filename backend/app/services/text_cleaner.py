import os
import requests
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Same fallback chain as gemini_service.py — try multiple models when quota is exhausted
GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3-flash-preview",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-2.5-flash-lite-preview-09-2025",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.5-pro",
    "gemini-3-pro-preview",
    "gemini-2.0-flash-001",
    "gemma-3-27b-it",
    "gemma-3-4b-it",
]

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

CLEAN_PROMPT = """You are a text cleaner for OCR-extracted notes. Your ONLY job is to clean the raw OCR output — NOT summarize, NOT rewrite, NOT rephrase.

REMOVE these OCR artifacts:
- Page numbers (e.g., "Page 1", "- 2 -", "1/5")
- Dates that are headers/footers (e.g., "20/02/2026", "Date: ___")
- Teacher/student signature lines (e.g., "Teacher's Signature", "Sign: ___", "Checked by:")
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


def clean_text(raw_text: str) -> dict:
    """Clean OCR-extracted text using AI. Falls back through Gemini → Groq.

    Returns:
        dict with keys: cleaned_text, cleaner
    """
    if not raw_text or not raw_text.strip():
        return {"cleaned_text": raw_text, "cleaner": None}

    prompt = CLEAN_PROMPT.replace("{text}", raw_text)

    # 1. Try Gemini
    try:
        print("🧹 Cleaning text with Gemini...")
        cleaned = _clean_with_gemini(prompt)
        if cleaned:
            return {"cleaned_text": cleaned, "cleaner": "gemini"}
    except Exception as e:
        print(f"❌ Gemini cleaning failed: {e}")

    # 2. Try Groq
    try:
        print("🧹 Falling back to Groq for cleaning...")
        cleaned = _clean_with_groq(prompt)
        if cleaned:
            return {"cleaned_text": cleaned, "cleaner": "groq"}
    except Exception as e:
        print(f"❌ Groq cleaning failed: {e}")

    # 3. All failed — return original
    print("⚠️ AI cleaning failed, using raw text")
    return {"cleaned_text": raw_text, "cleaner": None}


def _clean_with_gemini(prompt: str) -> str:
    """Try multiple Gemini models for cleaning, same fallback logic as summarization."""
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 8192,
        }
    }
    errors = []
    for model in GEMINI_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
        try:
            print(f"    🔹 Cleaning with Gemini model: {model}...")
            response = requests.post(url, json=payload, timeout=90)
            if response.status_code == 200:
                data = response.json()
                try:
                    result = data["candidates"][0]["content"]["parts"][0]["text"].strip()
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
        except requests.exceptions.Timeout:
            errors.append(f"{model}: timed out")
            continue
        except Exception as e:
            errors.append(f"{model}: {e}")
            continue
    raise Exception(f"All Gemini models failed for cleaning: {'; '.join(errors)}")


def _clean_with_groq(prompt: str) -> str:
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": "You are an OCR text cleaner. Output only the cleaned text, nothing else."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 8192,
    }
    response = requests.post(GROQ_URL, json=payload, headers=headers, timeout=90)
    if response.status_code != 200:
        raise Exception(f"Groq API error {response.status_code}: {response.text[:200]}")
    data = response.json()
    return data["choices"][0]["message"]["content"].strip()
