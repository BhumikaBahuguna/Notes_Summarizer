from app.services.azure_ocr import extract_text_azure
from app.services.paddle_ocr import extract_text_paddle

def extract_text(file_path):
    try:
        text = extract_text_azure(file_path)

        if text and len(text) > 50:
            return {
                "text": text,
                "engine": "azure"
            }

    except Exception as e:
        print("Azure failed:", e)

    # fallback
    text = extract_text_paddle(file_path)

    return {
        "text": text,
        "engine": "paddle"
    }
