# OCR Pipeline and Text Processing Flow

This document outlines the extraction and transformation stages of the Notes Summarizer, focusing on the hybrid fallback architecture designed for high availability and accuracy.

## 1. The Entry Point

- **Endpoint:** `POST /upload`
- **Controller:** `backend/app/api/upload.py`
- **Validation Constraints:**
  - Maximum file size: 450 MB
  - Maximum PDF pages: 1950

## 2. The Processing Sequence

```text
Upload File
  ├── Save to local temporary storage
  ├── Validate size and page count constraints
  ├── Stage 1: OCR Extraction (Azure -> Paddle)
  ├── Stage 2: AI Text Cleaning (Regex -> Gemini -> Groq)
  └── Stage 3: Optional Summarization
       ├── Brief: Groq -> Gemini -> HuggingFace
       └── Medium/Detailed: Parallel Race (Groq vs. Gemini) -> HuggingFace
```

## 3. Stage 1: OCR Extraction

**Orchestrator:** `backend/app/services/ocr_pipeline.py`

1. **Azure OCR (Primary):** Utilizes Azure Document Intelligence (`prebuilt-read`). Ideal for complex layouts and handwritten notes.
2. **PaddleOCR (Fallback):** If Azure fails, times out, or encounters credential issues, the pipeline seamlessly routes the file to local PaddleOCR. For PDFs, `pypdfium2` is used to convert pages to images prior to extraction.

## 4. Stage 2: AI Text Cleaning

**Service:** `backend/app/services/text_cleaner.py`

Raw OCR output often contains artifacts (e.g., "Page 1", watermarks, signature lines).
1. **Regex Pre-filter:** Strips obvious artifacts predictably.
2. **Gemini (Primary):** An instruction-tuned prompt directs the LLM to remove artifacts *without* summarizing or altering educational content.
3. **Groq (Fallback):** Handles cleaning if Gemini hits rate limits.

## 5. Stage 3: Summarization Pipeline

**Service:** `backend/app/services/summarize_pipeline.py`

This stage is optimized for minimal user latency.
- **Outline Caching:** To prevent redundant processing, the structural outline is hashed and cached. Switching between summary levels reuses this cache.
- **Brief Summaries:** Sent synchronously to Groq due to its massive token generation speed.
- **Medium/Detailed Summaries:** Triggers a **Parallel Race** between Gemini and Groq. Both APIs process the request simultaneously; the fastest valid response is returned to the client, and the slower process is discarded. HuggingFace serves as a tertiary fallback.

## 6. Frontend Integration

The unified response from `/upload` includes:
- `raw_text`
- `extracted_text` (cleaned)
- `engine_used`
- `cleaner`
- `summary` (conditional)

The frontend stores this payload in React state (`Workspace.jsx`), preventing the need for a backend database and maintaining user privacy.
