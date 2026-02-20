import os
import requests
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"


def summarize_gemini(text: str, mode: str) -> str:
    """Summarize text using Google Gemini API.

    Args:
        text: The extracted OCR text to summarize.
        mode: One of 'brief', 'medium', 'detailed'.

    Returns:
        Summarized text string.

    Raises:
        Exception on API failure.
    """
    prompt = _build_prompt(text, mode)

    payload = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": _max_tokens(mode),
        }
    }

    response = requests.post(GEMINI_URL, json=payload, timeout=120)

    if response.status_code != 200:
        raise Exception(f"Gemini API error {response.status_code}: {response.text[:300]}")

    data = response.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError) as e:
        raise Exception(f"Unexpected Gemini response format: {e}")


def _build_prompt(text: str, mode: str) -> str:
    mode_instructions = {
        "brief": (
            "Create a SHORT, concise summary. Use bullet points. "
            "Cover every key topic and fact but use minimal words. "
            "No fluff, no repetition. Aim for roughly 15-20% of the original length."
        ),
        "medium": (
            "Create a MEDIUM-length summary. Use clear headings and bullet points. "
            "Cover all topics, key facts, definitions, and important details. "
            "Nothing should be missed. Aim for roughly 40-50% of the original length."
        ),
        "detailed": (
            "Create a DETAILED, comprehensive summary. Use headings, sub-points, and bullet points. "
            "Include ALL information: every topic, definition, example, formula, name, date, and detail. "
            "Nothing should be left out. Aim for roughly 70-80% of the original length."
        ),
    }

    instruction = mode_instructions.get(mode, mode_instructions["medium"])

    return f"""You are an expert note summarizer. Your job is to summarize the following text extracted from handwritten or printed notes.

RULES:
1. {instruction}
2. Do NOT add any information that isn't in the original text.
3. Do NOT skip any topic, fact, or piece of information — completeness is critical.
4. Maintain the original structure and logical flow of the content.
5. Use clean formatting with markdown headings and bullet points.
6. If there are formulas or equations, preserve them exactly.

TEXT TO SUMMARIZE:
\"\"\"
{text}
\"\"\"

SUMMARY:"""


def _max_tokens(mode: str) -> int:
    return {"brief": 1024, "medium": 4096, "detailed": 8192}.get(mode, 4096)
