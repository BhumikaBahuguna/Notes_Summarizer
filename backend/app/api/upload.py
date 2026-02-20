from fastapi import APIRouter, UploadFile, File, HTTPException
import os
import shutil
import pypdfium2 as pdfium
from app.services.ocr_pipeline import extract_text

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE_MB = 450
MAX_PDF_PAGES = 1950


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Check file size
    file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
    if file_size_mb > MAX_FILE_SIZE_MB:
        os.remove(file_path)
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({file_size_mb:.1f} MB). Maximum allowed size is {MAX_FILE_SIZE_MB} MB."
        )

    # Check PDF page count
    if file.filename.lower().endswith(".pdf"):
        try:
            pdf = pdfium.PdfDocument(file_path)
            page_count = len(pdf)
            pdf.close()
            if page_count > MAX_PDF_PAGES:
                os.remove(file_path)
                raise HTTPException(
                    status_code=413,
                    detail=f"Too many pages ({page_count}). Maximum allowed is {MAX_PDF_PAGES} pages."
                )
        except HTTPException:
            raise
        except Exception as e:
            os.remove(file_path)
            raise HTTPException(status_code=400, detail=f"Could not read PDF: {e}")

    result = extract_text(file_path)

    return {
        "filename": file.filename,
        "engine_used": result["engine"],
        "text_preview": result["text"]
    }
