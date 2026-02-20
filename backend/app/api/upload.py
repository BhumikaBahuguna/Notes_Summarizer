from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from typing import Optional
import os
import shutil
import pypdfium2 as pdfium
from app.services.ocr_pipeline import extract_text
from app.services.summarize_pipeline import summarize_text
from app.services.text_cleaner import clean_text

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE_MB = 450
MAX_PDF_PAGES = 1950


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    summarize: Optional[str] = Form(None),  # "brief", "medium", "detailed" or None
):
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

    # OCR extraction
    result = extract_text(file_path)
    raw_text = result["text"]

    # AI-powered text cleaning
    clean_result = clean_text(raw_text)
    cleaned = clean_result["cleaned_text"]

    response = {
        "filename": file.filename,
        "engine_used": result["engine"],
        "raw_text": raw_text,
        "extracted_text": cleaned,
        "cleaner": clean_result["cleaner"],
    }

    # Summarization (if requested)
    if summarize and summarize in ("brief", "medium", "detailed"):
        if cleaned and cleaned.strip():
            summary_result = summarize_text(cleaned, mode=summarize)
            response["summary"] = summary_result.get("summary")
            response["summarizer"] = summary_result.get("summarizer")
            response["summary_mode"] = summary_result.get("mode")
            if summary_result.get("error"):
                response["summary_error"] = summary_result["error"]
        else:
            response["summary_error"] = "No text extracted to summarize."

    return response
