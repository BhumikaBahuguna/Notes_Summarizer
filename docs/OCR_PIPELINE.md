# OCR Pipeline and Text Processing Flow

This document describes how uploaded notes are transformed into clean, usable study content.

## 1) Where the Pipeline Starts

Entry point: `POST /upload`

Implementation file: `backend/app/api/upload.py`

Input fields:
- `file` (required)
- `summarize_level` (optional): `concise`, `balanced`, `detailed`

Validation limits:
- max file size: 450 MB
- max PDF pages: 1950

## 2) Full Processing Sequence

```text
Upload file
-> Save to uploads/
-> Validate size and page count
-> OCR extraction (Azure first, Paddle fallback)
-> AI cleaning of OCR output (Gemini first, Groq fallback)
-> Optional summary generation:
     brief:           single-pass Groq (-> Gemini -> HuggingFace)
     medium/detailed:  parallel race Groq vs Gemini (-> HuggingFace)
-> Return JSON response to frontend
```

## 3) OCR Stage

### 3.1 Orchestrator

File: `backend/app/services/ocr_pipeline.py`

Behavior:
1. Try Azure OCR.
2. If Azure throws or returns no text, fallback to PaddleOCR.
3. Return `{ text, engine }`.

### 3.2 Azure OCR Service

File: `backend/app/services/azure_ocr_service.py`

- Uses Azure Document Intelligence `prebuilt-read` flow.
- Best quality for mixed handwritten/printed documents.
- Requires `AZURE_ENDPOINT` and `AZURE_KEY`.

### 3.3 PaddleOCR Fallback

File: `backend/app/services/paddle_ocr.py`

- Local fallback OCR.
- Handles image files directly.
- For PDFs, converts pages to images via `pypdfium2` before OCR.
- Used automatically if Azure is unavailable/fails.

## 4) Cleaning Stage

File: `backend/app/services/text_cleaner.py`

Purpose:
- Remove OCR artifacts and noise.
- Preserve actual content/meaning.

Fallback chain:
1. Gemini
2. Groq

Output:
- `cleaned_text`
- `cleaner` engine name

## 5) Optional Summarization Stage

File: `backend/app/services/summarize_pipeline.py`

Modes:
- concise -> brief
- balanced -> medium
- detailed -> detailed

Strategy (optimized for speed):
- **Brief mode**: Single-pass direct summarization (no outline extraction).
  Groq first -> Gemini -> HuggingFace.
- **Medium/Detailed mode**: Two-pass architecture (outline -> constrained summary).
  Groq and Gemini race in parallel — whichever responds first wins.
  HuggingFace is the last resort fallback.

Tiered validation retries:
- brief: 0 retries
- medium: 1 retry
- detailed: 2 retries

Outline caching: Outlines are cached in memory per document hash, so
switching between summary levels reuses the same outline.

Response fields when requested:
- `summary`
- `summarizer`
- `summary_mode`
- `summary_error` (if all engines fail)

## 6) Response Contract From /upload

Always returned:
- `filename`
- `engine_used`
- `raw_text`
- `extracted_text`
- `cleaner`

Conditionally returned:
- `summary`
- `summarizer`
- `summary_mode`
- `summary_error`

## 7) Why This Pipeline Is Reliable

| Failure Point | Protection |
|---|---|
| Azure OCR outage/error | PaddleOCR fallback |
| Gemini cleaning failure | Groq fallback |
| Groq summary failure | Parallel race with Gemini; HuggingFace last resort |
| Gemini summary failure | Parallel race with Groq; HuggingFace last resort |
| Large or invalid files | Explicit validation + HTTP errors |

## 8) Integration With Frontend

Frontend upload call: `frontend/src/services/api.js` -> `uploadFile()`

Used by: `frontend/src/components/FileUpload.jsx`

Frontend then uses:
- `extracted_text` for study feature generation
- `summary` for quick summary panel
- `engine_used` and `cleaner` for metadata

## 9) Environment Variables

Configured in `backend/.env`:

```env
AZURE_ENDPOINT=...
AZURE_KEY=...
GEMINI_API_KEY=...
GROQ_API_KEY=...
```

The pipeline supports partial credentials because of fallback behavior.

## 10) Related Docs

- `docs/PROJECT_STRUCTURE_AND_FLOW.md`
- `Start_here.md`
- `README.md`
