import os
import tempfile
import pypdfium2 as pdfium
from PIL import Image
from paddleocr import PaddleOCR

ocr = PaddleOCR(use_angle_cls=True, lang='en')


def _ocr_single_image(image_path):
    """Run PaddleOCR on a single image file and return extracted text."""
    result = ocr.ocr(image_path)
    text = ""
    if result:
        for line in result:
            if line:
                for word in line:
                    text += word[1][0] + " "
    return text.strip()


def _convert_pdf_to_images(pdf_path):
    """Convert each page of a PDF to a temporary PNG image using pypdfium2."""
    pdf = pdfium.PdfDocument(pdf_path)
    image_paths = []
    temp_dir = tempfile.mkdtemp(prefix="paddle_pdf_")

    for i in range(len(pdf)):
        page = pdf[i]
        # Render at 300 DPI for good OCR quality
        bitmap = page.render(scale=300 / 72)
        pil_image = bitmap.to_pil()
        img_path = os.path.join(temp_dir, f"page_{i + 1}.png")
        pil_image.save(img_path)
        image_paths.append(img_path)

    pdf.close()
    return image_paths


def extract_text_paddle(file_path):
    """Extract text using PaddleOCR. Handles both images and PDFs."""
    is_pdf = file_path.lower().endswith(".pdf")

    if is_pdf:
        print("📄 PaddleOCR: Converting PDF pages to images...")
        image_paths = _convert_pdf_to_images(file_path)
        all_text = []

        for i, img_path in enumerate(image_paths):
            print(f"  🔍 OCR on page {i + 1}/{len(image_paths)}...")
            page_text = _ocr_single_image(img_path)
            if page_text:
                all_text.append(f"--- Page {i + 1} ---\n{page_text}")
            # Clean up temp image
            os.remove(img_path)

        return "\n\n".join(all_text).strip()
    else:
        return _ocr_single_image(file_path)
