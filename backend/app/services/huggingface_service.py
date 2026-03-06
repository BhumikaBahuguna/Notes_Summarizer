import asyncio
import httpx

# Using a free, no-key-required HuggingFace Inference API model
# facebook/bart-large-cnn is one of the best summarization models available
HF_MODEL = "facebook/bart-large-cnn"
HF_URL = f"https://api-inference.huggingface.co/models/{HF_MODEL}"


async def summarize_huggingface(text: str, mode: str) -> str:
    """Summarize text using HuggingFace Inference API (free, no key needed). Async.

    Note: BART-large-CNN has a 1024 token input limit (~3000 chars).
    For longer texts, we chunk and summarize each chunk.

    Args:
        text: The extracted OCR text to summarize.
        mode: One of 'brief', 'medium', 'detailed'.

    Returns:
        Summarized text string.

    Raises:
        Exception on API failure.
    """
    min_len, max_len = _length_params(mode)

    # BART has ~1024 token limit, so chunk at ~2500 chars to be safe
    chunks = _chunk_text(text, max_chars=2500)
    summaries = []

    async with httpx.AsyncClient() as client:
        for i, chunk in enumerate(chunks):
            payload = {
                "inputs": chunk,
                "parameters": {
                    "min_length": min_len,
                    "max_length": max_len,
                    "do_sample": False,
                },
            }

            response = await client.post(HF_URL, json=payload, timeout=45)

            if response.status_code == 503:
                # Model is loading, retry once after wait
                wait_time = response.json().get("estimated_time", 20)
                print(
                    f"  ⏳ HuggingFace model loading, waiting "
                    f"{min(wait_time, 30):.0f}s..."
                )
                await asyncio.sleep(min(wait_time, 30))
                response = await client.post(HF_URL, json=payload, timeout=45)

            if response.status_code != 200:
                raise Exception(
                    f"HuggingFace API error {response.status_code}: "
                    f"{response.text[:300]}"
                )

            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                summaries.append(data[0].get("summary_text", ""))
            else:
                raise Exception(
                    f"Unexpected HuggingFace response: {str(data)[:200]}"
                )

    return "\n\n".join(summaries).strip()


def _chunk_text(text: str, max_chars: int = 2500) -> list:
    """Split text into chunks, trying to break at paragraph or sentence boundaries."""
    if len(text) <= max_chars:
        return [text]

    chunks = []
    while text:
        if len(text) <= max_chars:
            chunks.append(text)
            break

        # Try to break at paragraph
        cut = text.rfind("\n\n", 0, max_chars)
        if cut == -1:
            # Try sentence boundary
            cut = text.rfind(". ", 0, max_chars)
        if cut == -1:
            # Try any newline
            cut = text.rfind("\n", 0, max_chars)
        if cut == -1:
            # Hard cut at space
            cut = text.rfind(" ", 0, max_chars)
        if cut == -1:
            cut = max_chars

        chunks.append(text[: cut + 1].strip())
        text = text[cut + 1 :].strip()

    return chunks


def _length_params(mode: str) -> tuple:
    """Return (min_length, max_length) for BART summarization."""
    return {
        "brief": (30, 80),
        "medium": (80, 200),
        "detailed": (150, 400),
    }.get(mode, (80, 200))
