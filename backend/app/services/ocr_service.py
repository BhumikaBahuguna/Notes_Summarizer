import pytesseract
from PIL import Image
import pdfplumber

def extract_text(file_path):
    if file_path.lower().endswith((".png", ".jpg", ".jpeg")):
        image = Image.open(file_path)
        return pytesseract.image_to_string(image)

    elif file_path.lower().endswith(".pdf"):
        text = ""
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
        return text

    else:
        return "Unsupported file type"
