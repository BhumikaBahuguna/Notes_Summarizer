# Start Here — Notes Summarizer Setup Guide

This guide covers everything needed to clone this repo and get the backend running on a new machine.

---

## Prerequisites

- **OS**: Linux (tested on Arch Linux)
- **Python 3.12** is required — PaddlePaddle/PaddleOCR do NOT support Python 3.13+
- **git** installed

---

## Step 1: Install Python 3.12 (via pyenv — no system changes)

If your system Python is 3.13 or 3.14, use pyenv to install 3.12 locally:

```bash
# Install pyenv
curl https://pyenv.run | bash

# Add to your shell (for fish shell):
set -x PYENV_ROOT "$HOME/.pyenv"
set -x PATH "$PYENV_ROOT/bin" $PATH

# For bash/zsh, add to ~/.bashrc or ~/.zshrc:
# export PYENV_ROOT="$HOME/.pyenv"
# export PATH="$PYENV_ROOT/bin:$PATH"
# eval "$(pyenv init -)"

# Install Python 3.12
pyenv install 3.12.12
```

If your system already has Python 3.10–3.12, you can skip pyenv and use it directly.

---

## Step 2: Clone and Set Up the Backend

```bash
git clone <repo-url>
cd Notes_Summarizer/backend
```

### Create virtual environment with Python 3.12

```bash
# If using pyenv:
~/.pyenv/versions/3.12.12/bin/python3.12 -m venv venv

# If system Python is 3.12:
python3.12 -m venv venv
```

### Activate the venv

```bash
# Fish shell:
source venv/bin/activate.fish

# Bash/Zsh:
source venv/bin/activate
```

### Verify Python version

```bash
python --version
# Should show: Python 3.12.x
```

### Install dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

> **Note**: This installs PaddlePaddle, PaddleOCR, PyTorch, and other heavy packages. First run may take several minutes. PaddleOCR will also download model files (~50MB) on first server start.

---

## Step 3: Set Up Environment Variables

Create a `.env` file inside `/backend/`:

```bash
cp .env.example .env   # if .env.example exists
# OR create manually:
```

Required variables in `backend/.env`:

```
AZURE_ENDPOINT=https://your-azure-endpoint.cognitiveservices.azure.com/
AZURE_KEY=your-azure-key-here
GEMINI_API_KEY=your-gemini-api-key
GROQ_API_KEY=your-groq-api-key
```

> - If you don't have Azure credentials, OCR falls back to PaddleOCR.
> - If you don't have Gemini/Groq keys, summarization falls back to HuggingFace (free, no key needed).
> - The system is designed to work with partial credentials.

---

## Step 4: Run the Backend

```bash
cd backend
source venv/bin/activate.fish   # or activate for bash
uvicorn app.main:app --reload --port 8000
```

Server runs at: **http://127.0.0.1:8000**

### Verify it's running

```bash
curl http://127.0.0.1:8000/
# Response: {"message":"API running"}
```

---

## Step 5: Test with the UI (optional)

Open `test_ui.html` (in the project root) in a browser:

```bash
xdg-open test_ui.html          # Linux
open test_ui.html               # macOS
start test_ui.html              # Windows
```

This is a temporary test UI — upload files, extract text, and optionally summarize with Brief/Medium/Detailed modes.

---

## API Endpoints

| Method | Endpoint  | Description                                    |
|--------|-----------|------------------------------------------------|
| GET    | `/`       | Health check                                   |
| POST   | `/upload` | Upload file for OCR extraction + summarization |

### POST /upload

- **Body**: `multipart/form-data`
  - `file` (required): The file to process
  - `summarize` (optional): `"brief"`, `"medium"`, or `"detailed"`
- **Accepted formats**: `.png`, `.jpg`, `.jpeg`, `.pdf`
- **Max file size**: 450 MB
- **Max PDF pages**: 1,950

**Response (extract only)**:
```json
{
  "filename": "notes.pdf",
  "engine_used": "azure",
  "raw_text": "raw OCR output before cleaning...",
  "extracted_text": "AI-cleaned text...",
  "cleaner": "gemini"
}
```

**Response (with summarization)**:
```json
{
  "filename": "notes.pdf",
  "engine_used": "azure",
  "raw_text": "raw OCR output before cleaning...",
  "extracted_text": "AI-cleaned text...",
  "cleaner": "gemini",
  "summary": "summarized text...",
  "summarizer": "gemini",
  "summary_mode": "medium"
}
```

---

## Project Structure

```
Notes_Summarizer/
├── backend/
│   ├── .env                      # API credentials (not in git)
│   ├── requirements.txt          # Python dependencies (pinned)
│   ├── venv/                     # Python 3.12 virtual environment (not in git)
│   └── app/
│       ├── main.py               # FastAPI app entry point
│       ├── api/
│       │   └── upload.py         # /upload endpoint with validation + summarization
│       ├── core/
│       │   └── config.py         # Environment config loader
│       └── services/
│           ├── ocr_pipeline.py       # Azure → PaddleOCR fallback logic
│           ├── azure_ocr_service.py  # Azure Form Recognizer OCR
│           ├── paddle_ocr.py         # PaddleOCR (images + PDF support)
│           ├── text_cleaner.py       # AI text cleaning (Gemini → Groq)
│           ├── summarize_pipeline.py # Gemini → Groq → HuggingFace fallback
│           ├── gemini_service.py     # Google Gemini summarization
│           ├── groq_service.py       # Groq (LLaMA 3.3) summarization
│           ├── huggingface_service.py# HuggingFace BART summarization (free)
│           ├── preprocess.py         # Image preprocessing (unused currently)
│           ├── azure_ocr.py          # Legacy (unused)
│           ├── hybrid_ocr.py         # Legacy (unused)
│           └── ocr_service.py        # Legacy Tesseract-based (unused)
├── frontend/                     # Original frontend (HTML/CSS/JS)
├── docs/                         # Documentation
│   └── CHANGELOG.md              # Detailed record of what was built
├── test_ui.html                  # Temporary test UI (not part of project)
├── Start_here.md                 # This file
├── requirements.txt              # Root-level requirements (same as backend)
└── README.md
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ModuleNotFoundError: paddleocr` | You're using Python 3.13+. Must use Python 3.10–3.12. |
| `Address already in use` (port 8000) | Run `kill $(lsof -t -i:8000)` or `kill (lsof -t -i:8000)` in fish |
| Azure OCR fails silently | Check `.env` has valid `AZURE_ENDPOINT` and `AZURE_KEY`. Server falls back to PaddleOCR. |
| PaddleOCR model download hangs | First run downloads ~50MB of models. Needs internet. |
| `File too large` error | File exceeds 450 MB limit. |
| `Too many pages` error | PDF exceeds 1,950 page limit. |
| Summarization returns `summary_error` | All 3 engines failed. Check API keys in `.env` and internet connection. |
| Gemini/Groq fails but summary works | Fallback chain worked — check which `summarizer` was used in the response. |

---

## For LLMs / Future Developers

- **Python version**: 3.12.x is mandatory (PaddlePaddle constraint)
- **OCR flow**: Upload → Azure OCR (primary) → PaddleOCR (fallback) → AI Clean (Gemini → Groq) → Return text
- **Summarization flow**: Gemini (primary) → Groq (fallback) → HuggingFace (free fallback)
- **Text cleaning**: Removes page numbers, signatures, OCR garbage while preserving all content. Uses Gemini → Groq fallback.
- **Summary modes**: `brief` (~15-20% length), `medium` (~40-50%), `detailed` (~70-80%). All modes preserve complete information.
- **API response**: `raw_text` = direct OCR output, `extracted_text` = AI-cleaned text, `cleaner` = which AI cleaned it
- **PDF handling**: Azure handles PDFs natively. PaddleOCR converts PDF pages to 300 DPI images via `pypdfium2` then OCRs each page.
- **Unused files**: `ocr_service.py`, `hybrid_ocr.py`, `azure_ocr.py` are legacy — not imported anywhere in the active pipeline.
- **CORS** is enabled (allow all origins) for local dev/testing.
- **No database** — files are saved to `uploads/` directory, text is returned directly in the API response.
- **Env vars**: `AZURE_ENDPOINT`, `AZURE_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY` — all optional with fallbacks.
