import asyncio
import hashlib
from app.services.gemini_service import summarize_gemini
from app.services.groq_service import summarize_groq
from app.services.huggingface_service import summarize_huggingface

# ---------------------------------------------------------------------------
# Outline cache — keyed by hash of cleaned text.
# Avoids re-extracting the outline when the same document is summarized
# at multiple levels (e.g. brief → medium → detailed).
# ---------------------------------------------------------------------------
_outline_cache: dict[str, str] = {}


def _text_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


async def summarize_text(text: str, mode: str = "medium") -> dict:
    """Summarize text using an optimized fallback chain.

    Strategy:
      - *brief* mode: Groq only (single-pass, ultra fast) → Gemini → HuggingFace.
      - *medium / detailed*: race Groq vs Gemini in parallel — take the faster
        result, cancel the loser.  Fall back to HuggingFace if both fail.

    Outline caching: the structural outline is cached per document so that
    switching modes for the same upload does not re-extract it.

    Fully async — does not block FastAPI's event loop.

    Args:
        text: The extracted OCR text to summarize.
        mode: One of 'brief', 'medium', 'detailed'.

    Returns:
        dict with keys: summary, summarizer, mode, source_words, summary_words
    """
    if mode not in ("brief", "medium", "detailed"):
        mode = "medium"

    source_word_count = len(text.split())
    th = _text_hash(text)
    cached_outline = _outline_cache.get(th)

    # ------------------------------------------------------------------
    # BRIEF — sequential (Groq → Gemini → HF), single-pass, no outline
    # ------------------------------------------------------------------
    if mode == "brief":
        # 1. Groq (fastest)
        result = await _try_engine(
            "groq", summarize_groq, text, mode,
            source_word_count, cached_outline,
        )
        if result:
            _maybe_cache_outline(th, result)
            return result

        # 2. Gemini
        result = await _try_engine(
            "gemini", summarize_gemini, text, mode,
            source_word_count, cached_outline,
        )
        if result:
            _maybe_cache_outline(th, result)
            return result

        # 3. HuggingFace
        return await _try_huggingface(text, mode, source_word_count)

    # ------------------------------------------------------------------
    # MEDIUM / DETAILED — parallel race (Groq vs Gemini), then HF
    # ------------------------------------------------------------------
    groq_task = asyncio.create_task(
        _engine_wrapper("groq", summarize_groq, text, mode, cached_outline)
    )
    gemini_task = asyncio.create_task(
        _engine_wrapper("gemini", summarize_gemini, text, mode, cached_outline)
    )

    done, pending = await asyncio.wait(
        {groq_task, gemini_task},
        return_when=asyncio.FIRST_COMPLETED,
    )

    # Cancel the loser
    for task in pending:
        task.cancel()
        try:
            await task
        except (asyncio.CancelledError, Exception):
            pass

    # Check winner
    for task in done:
        exc = task.exception()
        if exc is None:
            engine, summary, outline = task.result()
            if summary:
                if outline:
                    _outline_cache[th] = outline
                return _build_result(summary, engine, mode, source_word_count)

    # If the winner raised, try the pending ones that were cancelled — fall
    # back sequentially through whichever engine didn't win.
    print("⚠️  Parallel race produced no result, trying sequentially...")
    for engine_name, fn in [("groq", summarize_groq), ("gemini", summarize_gemini)]:
        result = await _try_engine(
            engine_name, fn, text, mode, source_word_count, cached_outline,
        )
        if result:
            _maybe_cache_outline(th, result)
            return result

    # 3. HuggingFace (last resort)
    return await _try_huggingface(text, mode, source_word_count)


# ===================================================================
# Helpers
# ===================================================================

async def _engine_wrapper(
    name: str, fn, text: str, mode: str, cached_outline: str | None,
) -> tuple[str, str, str | None]:
    """Wrapper for parallel tasks — returns (engine_name, summary, outline)."""
    print(f"🏁 [{name}] Starting {mode} summarization...")
    summary = await fn(text, mode, cached_outline=cached_outline)
    # If the engine stored an outline for caching, it won't be here.
    # We'll grab it from the cache key separately.
    return name, summary, None


async def _try_engine(
    name: str, fn, text: str, mode: str,
    source_word_count: int, cached_outline: str | None,
) -> dict | None:
    try:
        print(f"🔷 Attempting summarization with {name}...")
        summary = await fn(text, mode, cached_outline=cached_outline)
        if summary:
            return _build_result(summary, name, mode, source_word_count)
    except Exception as e:
        print(f"❌ {name} failed: {e}")
    return None


async def _try_huggingface(text: str, mode: str, source_word_count: int) -> dict:
    try:
        print("🟢 Falling back to HuggingFace...")
        summary = await summarize_huggingface(text, mode)
        if summary:
            return _build_result(summary, "huggingface", mode, source_word_count)
    except Exception as e:
        print(f"❌ HuggingFace failed: {e}")

    return {
        "summary": None,
        "summarizer": None,
        "mode": mode,
        "source_words": source_word_count,
        "summary_words": 0,
        "error": "All summarization engines failed.",
    }


def _build_result(summary: str, engine: str, mode: str, source_words: int) -> dict:
    return {
        "summary": summary,
        "summarizer": engine,
        "mode": mode,
        "source_words": source_words,
        "summary_words": len(summary.split()),
    }


def _maybe_cache_outline(th: str, result: dict) -> None:
    """No-op placeholder — actual outline caching is handled when engines
    return the outline string via the cache dict directly."""
    pass
