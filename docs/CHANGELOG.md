# Changelog — What Has Been Built So Far

This file documents all changes made to the project, what exists, and what each piece does.

---

## Current State (as of Feb 20, 2026)

The backend pipeline is **fully functional**: Upload → OCR → AI Clean → Summarize.

It accepts image and PDF uploads, extracts text using Azure OCR (primary) with PaddleOCR as a local fallback, cleans OCR artifacts using Gemini → Groq AI cleaning, optionally summarizes using Gemini → Groq → HuggingFace fallback chain, and returns everything via a REST API.

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
- **Pipeline**: Save file → Validate → OCR extract → AI clean → Optionally summarize
- Returns `raw_text` (direct OCR output), `extracted_text` (AI-cleaned), `cleaner` (which AI cleaned it)

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
- Two action buttons: "Extract Only" and "Extract + Summarize"
- Summary mode selector: Brief / Medium / Detailed
- **Three toggle views**: Summary ↔ Cleaned Text ↔ Raw OCR Output
- Shows cleaner badge (which AI engine cleaned the text)
- Displays OCR engine used and summarizer engine used
- Shows descriptive error messages from the backend

### 8. Summarization Pipeline (`backend/app/services/summarize_pipeline.py`)
- Fallback chain: **Gemini → Groq → HuggingFace**
- Accepts a `mode` parameter: `brief`, `medium`, `detailed`
- Returns which summarizer was used along with the summary

### 9. Gemini Service (`backend/app/services/gemini_service.py`)
- Uses Google Gemini 2.0 Flash API (`generativelanguage.googleapis.com`)
- Custom prompts per mode ensuring no information is lost
- API key from `GEMINI_API_KEY` in `.env`

### 10. Groq Service (`backend/app/services/groq_service.py`)
- Uses Groq API with LLaMA 3.3 70B model
- OpenAI-compatible chat completions format
- API key from `GROQ_API_KEY` in `.env`

### 11. HuggingFace Service (`backend/app/services/huggingface_service.py`)
- Uses free HuggingFace Inference API (no API key needed)
- Model: `facebook/bart-large-cnn` (state-of-the-art summarization)
- Handles long texts by chunking (~2500 chars per chunk)
- Auto-retries if model is cold-loading (503 response)

### 12. Text Cleaner (`backend/app/services/text_cleaner.py`)
- AI-powered cleaning of raw OCR output before summarization
- Removes: page numbers, headers/footers, teacher signatures, OCR garbage characters, unnecessary symbols
- Preserves: all actual content, formatting, mathematical expressions, bullet points
- Fallback chain: **Gemini → Groq** (uses same APIs as summarization)
- Temperature 0.1 for deterministic, reliable cleaning
- Returns `{ cleaned_text, cleaner }` indicating which AI engine was used

---

## Full Pipeline Flow

```
Upload File → Validate (size/pages) → OCR (Azure → PaddleOCR)
    → AI Clean (Gemini → Groq) → Optionally Summarize (Gemini → Groq → HuggingFace)
    → Return response
```

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

## Summarization Engine Comparison

| Feature | Gemini (primary) | Groq (fallback 1) | HuggingFace (fallback 2) |
|---------|------------------|-------------------|--------------------------|
| Model | Gemini 2.0 Flash | LLaMA 3.3 70B | BART-large-CNN |
| Quality | Excellent | Excellent | Good (extractive) |
| Long text | Up to ~1M tokens | Up to 128K tokens | ~1024 tokens (chunked) |
| Speed | Fast | Very fast | Moderate |
| Cost | Free tier available | Free tier available | Free (no key needed) |
| API key needed | Yes (`GEMINI_API_KEY`) | Yes (`GROQ_API_KEY`) | No |

---

## What's Next (not yet implemented)

- Proper frontend connected to the backend
- Database for storing extraction history
- Batch file processing
- User authentication
