import os
import requests
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


def summarize_groq(text: str, mode: str) -> str:
    """Summarize text using Groq API (LLaMA 3 via Groq).

    Args:
        text: The extracted OCR text to summarize.
        mode: One of 'brief', 'medium', 'detailed'.

    Returns:
        Summarized text string.

    Raises:
        Exception on API failure.
    """
    prompt = _build_prompt(text, mode)

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {
                "role": "system",
                "content": "You are an expert note summarizer. Summarize accurately and completely. Use markdown formatting."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.3,
        "max_tokens": _max_tokens(mode),
    }

    response = requests.post(GROQ_URL, json=payload, headers=headers, timeout=120)

    if response.status_code != 200:
        raise Exception(f"Groq API error {response.status_code}: {response.text[:300]}")

    data = response.json()
    try:
        return data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError) as e:
        raise Exception(f"Unexpected Groq response format: {e}")


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

    return f"""{instruction}

RULES:
1. Do NOT add any information that isn't in the original text.
2. Do NOT skip any topic, fact, or piece of information — completeness is critical.
3. Maintain the original structure and logical flow.
4. Use clean formatting with markdown headings and bullet points.
5. If there are formulas or equations, preserve them exactly.

TEXT TO SUMMARIZE:
\"\"\"
{text}
\"\"\"

SUMMARY:"""


def _max_tokens(mode: str) -> int:
    return {"brief": 1024, "medium": 4096, "detailed": 8192}.get(mode, 4096)
