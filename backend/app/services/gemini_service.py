import os
import requests
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Gemini models to try in order (fallback chain within Gemini itself).
# If one model's quota is exhausted, we move to the next before giving up.
# Quotas reset DAILY (requests-per-day / tokens-per-minute), NOT lifetime.
# Best models first, lighter/smaller ones as fallback.
GEMINI_MODELS = [
    # --- Primary: best quality Gemini models ---
    "gemini-2.5-flash",            # strong, fast, 1M context
    "gemini-2.5-flash-lite",       # lighter variant
    "gemini-3-flash-preview",      # next-gen preview
    "gemini-flash-latest",         # alias, tracks latest flash release
    "gemini-flash-lite-latest",    # alias, tracks latest flash-lite
    "gemini-2.5-flash-lite-preview-09-2025",
    # --- Fallback: older/heavier models (often exhausted) ---
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.5-pro",
    "gemini-3-pro-preview",
    "gemini-2.0-flash-001",
    # --- Last resort: open Gemma models (smaller, lower quality) ---
    "gemma-3-27b-it",              # best open model, 131K context
    "gemma-3-4b-it",               # small but capable
]


def _gemini_url(model: str) -> str:
    return f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"


def summarize_gemini(text: str, mode: str) -> str:
    """Summarize text using Google Gemini API with automatic model fallback.

    Tries each model in GEMINI_MODELS sequentially. If a model returns a
    quota/rate-limit error (429) or a server error (5xx), the next model
    is attempted. Only raises after ALL models have been exhausted.

    Args:
        text: The extracted OCR text to summarize.
        mode: One of 'brief', 'medium', 'detailed'.

    Returns:
        Summarized text string.

    Raises:
        Exception when every Gemini model fails.
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

    errors = []
    for model in GEMINI_MODELS:
        url = _gemini_url(model)
        try:
            print(f"    🔹 Trying Gemini model: {model}...")
            response = requests.post(url, json=payload, timeout=120)

            if response.status_code == 200:
                data = response.json()
                try:
                    result = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    print(f"    ✅ Success with {model}")
                    return result
                except (KeyError, IndexError) as e:
                    errors.append(f"{model}: unexpected response format – {e}")
                    continue

            # Quota exhausted or rate-limited → try next model
            if response.status_code == 429:
                errors.append(f"{model}: quota exhausted (429)")
                print(f"    ⚠️  {model} quota exhausted, trying next...")
                continue

            # Server errors → try next model
            if response.status_code >= 500:
                errors.append(f"{model}: server error ({response.status_code})")
                print(f"    ⚠️  {model} server error, trying next...")
                continue

            # Other client errors (400, 403, etc.) → still try next model
            errors.append(f"{model}: API error {response.status_code}: {response.text[:200]}")
            print(f"    ⚠️  {model} returned {response.status_code}, trying next...")

        except requests.exceptions.Timeout:
            errors.append(f"{model}: request timed out")
            print(f"    ⚠️  {model} timed out, trying next...")
        except Exception as e:
            errors.append(f"{model}: {e}")
            print(f"    ⚠️  {model} failed ({e}), trying next...")

    # All models failed
    raise Exception(f"All Gemini models failed: {'; '.join(errors)}")


def _build_prompt(text: str, mode: str) -> str:
    prompts = {
        "brief": f"""You are an expert note summarizer. Summarize the following text into a BRIEF but COMPLETE version.

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

        "medium": f"""You are an expert note summarizer. Summarize the following text into a MEDIUM-length version.

RULES:
1. Aim for roughly 50-65% of the original length.
2. Use markdown headings (## and ###) to organize sections, and bullet points for details.
3. Every single topic, fact, definition, classification, numbered item, example, and data point MUST be included — do NOT skip anything.
4. For each item/requirement/concept, include its description, classification/category, AND the reasoning/explanation given in the original.
5. Paraphrase and tighten sentences for clarity, but do NOT cut content.
6. Do NOT add any information that isn't in the original text.
7. If there are formulas, equations, or specific numbers, preserve them exactly.
8. The difference from brief: use more descriptive sentences and organize with headings. The difference from detailed: don't include the full original wording — paraphrase more.

TEXT TO SUMMARIZE:
\"\"\"
{text}
\"\"\"

SUMMARY:""",

        "detailed": f"""You are an expert note summarizer. Create a DETAILED, comprehensive version of the following text.

RULES:
1. Aim for roughly 75-90% of the original length. This should be close to the original but better organized.
2. Use markdown headings (##, ###) and sub-headings to organize sections clearly.
3. EVERY piece of information must be preserved: all topics, definitions, classifications, examples, numbers, dates, names, reasoning, explanations — absolutely nothing should be left out.
4. For each item/requirement/concept, include its FULL description, classification/category, AND the complete reasoning/explanation as given in the original.
5. Use the original wording where possible. You may lightly restructure for clarity but do NOT compress or shorten the content.
6. Do NOT add any information that isn't in the original text.
7. If there are formulas, equations, or specific numbers, preserve them exactly.
8. The difference from medium: preserve full original explanations and wording instead of paraphrasing. Include every sub-detail and elaboration.

TEXT TO SUMMARIZE:
\"\"\"
{text}
\"\"\"

SUMMARY:"""
    }

    return prompts.get(mode, prompts["medium"])


def _max_tokens(mode: str) -> int:
    return {"brief": 4096, "medium": 4096, "detailed": 8192}.get(mode, 4096)
