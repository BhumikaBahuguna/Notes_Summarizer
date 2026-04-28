from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from typing import Optional
import asyncio
import glob
import os
import shutil
import uuid
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
    summarize_level: Optional[str] = Form(None),  # "concise", "balanced", "detailed" or None
):
    # Map frontend parameter names to internal summary modes
    summary_mode_map = {
        "concise": "brief",
        "balanced": "medium",
        "detailed": "detailed"
    }
    
    # UUID prefix prevents filename collisions on concurrent uploads
    safe_filename = f"{uuid.uuid4().hex[:8]}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

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

    # OCR extraction (sync — run in executor to avoid blocking the event loop)
    loop = asyncio.get_event_loop()
    try:
        result = await loop.run_in_executor(None, extract_text, file_path)
    finally:
        # Clean up uploaded file and any temp files created by OCR (e.g. _padded.jpg)
        for f in glob.glob(file_path + "*"):
            try:
                os.remove(f)
            except OSError:
                pass
    raw_text = result["text"]

    # AI-powered text cleaning (async)
    clean_result = await clean_text(raw_text)
    cleaned = clean_result["cleaned_text"]

    response = {
        "filename": file.filename,
        "engine_used": result["engine"],
        "raw_text": raw_text,
        "extracted_text": cleaned,
        "cleaner": clean_result["cleaner"],
    }

    # Summarization (if requested)
    if summarize_level and summarize_level in summary_mode_map:
        summary_mode = summary_mode_map[summarize_level]
        if cleaned and cleaned.strip():
            # Brief cooldown so the cleaning call's API quota window can tick
            # over — prevents back-to-back calls from tripping rate limits.
            await asyncio.sleep(4.0)
            summary_result = await summarize_text(cleaned, mode=summary_mode)
            response["summary"] = summary_result.get("summary")
            response["summarizer"] = summary_result.get("summarizer")
            response["summary_mode"] = summary_result.get("mode")
            if summary_result.get("error"):
                response["summary_error"] = summary_result["error"]
        else:
            response["summary_error"] = "No text extracted to summarize."

    return response
