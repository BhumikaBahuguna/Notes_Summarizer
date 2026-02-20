# Notes Summarizer

AI-powered system that extracts text from handwritten and printed notes using Azure OCR with PaddleOCR fallback, cleans OCR artifacts using AI, and generates structured summaries.

---

## Features

- **Hybrid OCR pipeline**: Azure Form Recognizer (primary) → PaddleOCR (local fallback)
- **AI text cleaning**: Removes page numbers, signatures, garbage characters (Gemini → Groq)
- **Multi-engine summarization**: Gemini → Groq → HuggingFace fallback chain
- **Three summary modes**: Brief, Medium, Detailed
- Handles handwritten + printed notes
- PDF and image support (.png, .jpg, .jpeg, .pdf)
- Upload validation (450 MB max, 1950 pages max for PDFs)
- Real-time REST API via FastAPI

---

## Pipeline

```
Upload → Validate → OCR (Azure → PaddleOCR) → AI Clean (Gemini → Groq) → Summarize (Gemini → Groq → HuggingFace)
```

---

## Tech Stack

- **Backend**: FastAPI, Python 3.12
- **OCR**: Azure Document Intelligence, PaddleOCR, pypdfium2
- **AI/LLM**: Google Gemini 2.0 Flash, Groq (LLaMA 3.3 70B), HuggingFace (BART-large-CNN)
- **Image Processing**: OpenCV

---

## Quick Start

```bash
cd backend
~/.pyenv/versions/3.12.12/bin/python3.12 -m venv venv
source venv/bin/activate.fish   # or source venv/bin/activate for bash
pip install -r requirements.txt
# Create .env with API keys (see Start_here.md)
uvicorn app.main:app --reload --port 8000
```

> See [Start_here.md](Start_here.md) for full setup guide including pyenv installation.

---

## API

| Method | Endpoint  | Description |
|--------|-----------|-------------|
| GET    | `/`       | Health check |
| POST   | `/upload` | Upload file for OCR + clean + summarize |

### POST /upload

**Body**: `multipart/form-data` with `file` (required) and `summarize` (optional: `"brief"`, `"medium"`, `"detailed"`)

**Response fields**: `filename`, `engine_used`, `raw_text`, `extracted_text` (cleaned), `cleaner`, and optionally `summary`, `summarizer`, `summary_mode`

---

## Status

- OCR pipeline stable
- AI text cleaning integrated
- Summarization with 3-engine fallback working
- Test UI available (`test_ui.html`)

---

## Author

Bhumika Bahuguna

