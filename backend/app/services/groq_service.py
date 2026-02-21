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
    prompts = {
        "brief": f"""Summarize the following text into a BRIEF but COMPLETE version.

IMPORTANT: Your summary MUST cover 100% of the content in the original. A brief summary means shorter sentences, NOT less content. Every single piece of information must be present.

RULES:
1. Aim for roughly 50-60% of the original length. This is the MINIMUM — do NOT go shorter.
2. Use a heading for the title/topic, then use bullet points for content.
3. CRITICAL: Every single topic, fact, definition, classification, numbered item, data point, and reasoning in the original MUST appear in your summary. Do NOT drop or skip ANY content.
4. Compress wordy sentences into tight bullet points, but the information must all be there.
5. Do NOT cut off mid-sentence. Every bullet point must be a complete thought.
6. Do NOT add any information that isn't in the original text.
7. If there are formulas, equations, or specific numbers, preserve them exactly.
8. The difference from medium: use flat bullet points instead of headings/sub-sections, and use fewer words per point. But NEVER remove content.
9. BEFORE finishing, verify: does your summary mention EVERY requirement, classification, reasoning, and data point from the original? If not, add the missing parts.

TEXT TO SUMMARIZE:
\"\"\"
{text}
\"\"\"

COMPLETE SUMMARY (covering ALL content):""",

        "medium": f"""Summarize the following text into a MEDIUM-length version.

RULES:
1. Aim for roughly 50-65% of the original length.
2. Use markdown headings (## and ###) to organize sections, and bullet points for details.
3. Every single topic, fact, definition, classification, numbered item, example, and data point MUST be included — do NOT skip anything.
4. For each item/requirement/concept, include its description, classification/category, AND the reasoning/explanation given in the original.
5. Paraphrase and tighten sentences for clarity, but do NOT cut content.
6. Do NOT add any information that isn't in the original text.
7. If there are formulas, equations, or specific numbers, preserve them exactly.

TEXT TO SUMMARIZE:
\"\"\"
{text}
\"\"\"

SUMMARY:""",

        "detailed": f"""Create a DETAILED, comprehensive version of the following text.

RULES:
1. Aim for roughly 75-90% of the original length. This should be close to the original but better organized.
2. Use markdown headings (##, ###) and sub-headings to organize sections clearly.
3. EVERY piece of information must be preserved: all topics, definitions, classifications, examples, numbers, dates, names, reasoning, explanations — absolutely nothing should be left out.
4. For each item/requirement/concept, include its FULL description, classification/category, AND the complete reasoning/explanation as given in the original.
5. Use the original wording where possible. You may lightly restructure for clarity but do NOT compress or shorten the content.
6. Do NOT add any information that isn't in the original text.
7. If there are formulas, equations, or specific numbers, preserve them exactly.

TEXT TO SUMMARIZE:
\"\"\"
{text}
\"\"\"

SUMMARY:"""
    }

    return prompts.get(mode, prompts["medium"])


def _max_tokens(mode: str) -> int:
    return {"brief": 4096, "medium": 4096, "detailed": 8192}.get(mode, 4096)
