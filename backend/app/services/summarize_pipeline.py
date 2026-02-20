from app.services.gemini_service import summarize_gemini
from app.services.groq_service import summarize_groq
from app.services.huggingface_service import summarize_huggingface


def summarize_text(text: str, mode: str = "medium") -> dict:
    """Summarize text using a fallback chain: Gemini → Groq → HuggingFace.

    Args:
        text: The extracted OCR text to summarize.
        mode: One of 'brief', 'medium', 'detailed'.

    Returns:
        dict with keys: summary, summarizer, mode
    """
    if mode not in ("brief", "medium", "detailed"):
        mode = "medium"

    # 1. Try Gemini
    try:
        print("🔷 Attempting summarization with Gemini...")
        summary = summarize_gemini(text, mode)
        if summary:
            return {"summary": summary, "summarizer": "gemini", "mode": mode}
    except Exception as e:
        print(f"❌ Gemini failed: {e}")

    # 2. Try Groq
    try:
        print("🟠 Falling back to Groq...")
        summary = summarize_groq(text, mode)
        if summary:
            return {"summary": summary, "summarizer": "groq", "mode": mode}
    except Exception as e:
        print(f"❌ Groq failed: {e}")

    # 3. Try HuggingFace (free, no key needed)
    try:
        print("🟢 Falling back to HuggingFace...")
        summary = summarize_huggingface(text, mode)
        if summary:
            return {"summary": summary, "summarizer": "huggingface", "mode": mode}
    except Exception as e:
        print(f"❌ HuggingFace failed: {e}")

    # All failed
    return {
        "summary": None,
        "summarizer": None,
        "mode": mode,
        "error": "All summarization engines failed."
    }
