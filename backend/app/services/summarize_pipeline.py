from app.services.gemini_service import summarize_gemini
from app.services.groq_service import summarize_groq
from app.services.huggingface_service import summarize_huggingface


async def summarize_text(text: str, mode: str = "medium") -> dict:
    """Summarize text using a fallback chain: Gemini → Groq → HuggingFace.

    Each engine now uses a two-pass architecture:
      Pass 1 — Extract structural outline of the document.
      Pass 2 — Generate summary constrained to the outline.
      Validation — Check completeness, retry if needed.

    Fully async — does not block FastAPI's event loop.

    Args:
        text: The extracted OCR text to summarize.
        mode: One of 'brief', 'medium', 'detailed'.

    Returns:
        dict with keys: summary, summarizer, mode, word_count
    """
    if mode not in ("brief", "medium", "detailed"):
        mode = "medium"

    source_word_count = len(text.split())

    # 1. Try Gemini (two-pass with validation)
    try:
        print("🔷 Attempting summarization with Gemini (two-pass)...")
        summary = await summarize_gemini(text, mode)
        if summary:
            return {
                "summary": summary,
                "summarizer": "gemini",
                "mode": mode,
                "source_words": source_word_count,
                "summary_words": len(summary.split()),
            }
    except Exception as e:
        print(f"❌ Gemini failed: {e}")

    # 2. Try Groq (two-pass with validation)
    try:
        print("🟠 Falling back to Groq (two-pass)...")
        summary = await summarize_groq(text, mode)
        if summary:
            return {
                "summary": summary,
                "summarizer": "groq",
                "mode": mode,
                "source_words": source_word_count,
                "summary_words": len(summary.split()),
            }
    except Exception as e:
        print(f"❌ Groq failed: {e}")

    # 3. Try HuggingFace (simple model, no two-pass — it's a last resort)
    try:
        print("🟢 Falling back to HuggingFace...")
        summary = await summarize_huggingface(text, mode)
        if summary:
            return {
                "summary": summary,
                "summarizer": "huggingface",
                "mode": mode,
                "source_words": source_word_count,
                "summary_words": len(summary.split()),
            }
    except Exception as e:
        print(f"❌ HuggingFace failed: {e}")

    # All failed
    return {
        "summary": None,
        "summarizer": None,
        "mode": mode,
        "source_words": source_word_count,
        "summary_words": 0,
        "error": "All summarization engines failed.",
    }
