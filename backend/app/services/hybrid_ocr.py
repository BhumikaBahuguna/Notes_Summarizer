from .azure_ocr import extract_text_azure
from .paddle_ocr import extract_text_paddle


def text_quality_score(text):
    words = text.split()
    if len(words) == 0:
        return 0
    return len(words)


def extract_text(file_path):
    try:
        azure_text = extract_text_azure(file_path)
    except Exception:
        azure_text = ""

    score = text_quality_score(azure_text)

    if score > 20:
        return {
            "text": azure_text,
            "engine": "Azure OCR"
        }

    paddle_text = extract_text_paddle(file_path)

    return {
        "text": paddle_text,
        "engine": "PaddleOCR fallback"
    }
