from fastapi import APIRouter, UploadFile, File
import os
import shutil
from app.services.ocr_pipeline import extract_text

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    result = extract_text(file_path)

    return {
        "filename": file.filename,
        "engine_used": result["engine"],
        "text_preview": result["text"]
    }
