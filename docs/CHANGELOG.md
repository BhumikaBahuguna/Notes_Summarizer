# Changelog — What Has Been Built So Far

This file documents all changes made to the project, what exists, and what each piece does.

---

## Current State (as of Feb 20, 2026)

The backend OCR pipeline is **fully functional**. It accepts image and PDF uploads, extracts text using Azure OCR (primary) with PaddleOCR as a local fallback, and returns the extracted text via a REST API.

---

## What Was Built / Modified

### 1. Backend Server (`backend/app/main.py`)
- FastAPI app with CORS middleware (allows all origins for dev/testing)
- Includes the upload router
- Health check at `GET /`

### 2. Upload Endpoint (`backend/app/api/upload.py`)
- `POST /upload` — accepts file uploads via multipart form
- **Validation added**:
  - Rejects files larger than **450 MB**
  - Rejects PDFs with more than **1,950 pages**
  - Returns proper HTTP 413 errors with descriptive messages
  - Cleans up rejected files from disk

### 3. OCR Pipeline (`backend/app/services/ocr_pipeline.py`)
- Tries Azure OCR first
- **Error handling added**: Azure call is wrapped in `try/except` — any failure (network, auth, timeout) gracefully falls back to PaddleOCR instead of crashing
- Returns `{ text, engine }` indicating which engine was used

### 4. PaddleOCR Service (`backend/app/services/paddle_ocr.py`)
- **PDF support added**: Detects if input is a PDF, converts each page to a 300 DPI PNG using `pypdfium2`, then runs OCR on each page image
- Returns combined text with `--- Page N ---` separators for multi-page PDFs
- Cleans up temporary image files after processing
- For images: runs OCR directly (no conversion needed)

### 5. Azure OCR Service (`backend/app/services/azure_ocr_service.py`)
- Uses Azure Form Recognizer (`prebuilt-read` model)
- Adds white padding around images before OCR (improves edge text detection)
- Handles both images and PDFs natively (Azure processes PDFs server-side)
- Credentials loaded from `backend/.env`

### 6. Image Preprocessing (`backend/app/services/preprocess.py`)
- Grayscale conversion, contrast normalization, denoising, adaptive thresholding
- Adds padding to prevent edge clipping
- Currently **not used** in the active pipeline (available for future use)

### 7. Test UI (`test_ui.html`)
- Temporary single-file HTML/CSS/JS test interface (NOT part of the main project)
- Drag & drop or click to upload files
- Accepts only `.png`, `.jpg`, `.jpeg`, `.pdf`
- Displays extracted text, filename, and which OCR engine was used
- Shows descriptive error messages from the backend (file too large, too many pages, etc.)

---

## Legacy / Unused Files

These files exist but are **not imported** by the active pipeline:

| File | What it is |
|------|-----------|
| `backend/app/services/ocr_service.py` | Tesseract + pdfplumber based OCR (old approach) |
| `backend/app/services/hybrid_ocr.py` | Combined Azure + PaddleOCR with quality scoring (old approach) |
| `backend/app/services/azure_ocr.py` | Earlier Azure OCR implementation (replaced by `azure_ocr_service.py`) |
| `frontend/` | Original frontend (HTML/CSS/JS) — exists but not connected to current backend |

---

## Upload Limits

| Constraint | Value |
|-----------|-------|
| Max file size | 450 MB |
| Max PDF pages | 1,950 |
| Accepted formats | `.png`, `.jpg`, `.jpeg`, `.pdf` |

---

## OCR Engine Comparison

| Feature | Azure OCR | PaddleOCR (fallback) |
|---------|-----------|---------------------|
| Handwritten text | Excellent | Good |
| Printed text | Excellent | Excellent |
| PDF support | Native | Via page-to-image conversion |
| Needs internet | Yes (Azure API) | No (runs locally) |
| Speed | Fast (cloud) | Slower (local CPU) |
| Cost | Pay-per-use | Free |

---

## What's Next (not yet implemented)

- Text summarization (using OpenAI/Gemini/Groq — API keys exist in `.env`)
- Proper frontend connected to the backend
- Database for storing extraction history
- Batch file processing
- User authentication
