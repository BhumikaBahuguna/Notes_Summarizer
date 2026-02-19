from .azure_ocr import extract_text_azure
from .paddle_ocr import extract_text_paddle
from app.services.preprocess import preprocess_for_ocr

from backend.app.services import paddle_ocr

from backend.app.services import azure_ocr


def text_quality_score(text):
    words = text.split()
    if len(words) == 0:
        return 0
    return len(words)


def extract_text(file_path):
    processed_path = preprocess_for_ocr(file_path)

    try:
        text = azure_ocr(processed_path)
        engine = "azure"
    except Exception:
        text = paddle_ocr(processed_path)
        engine = "paddle"

    return {
        "text": text,
        "engine": engine
    }

