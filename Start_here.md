# Start Here - Complete Setup Guide

This guide gets the current full-stack version running locally.

## Prerequisites

- Python 3.12 recommended (PaddleOCR compatibility)
- Node.js 18+ and npm
- Git

## 1) Clone

```bash
git clone <repo-url>
cd Notes_Summarizer
```

## 2) Backend Setup

```bash
cd backend
python -m venv venv
```

Activate the environment:

- Windows (PowerShell):

```powershell
venv\Scripts\Activate.ps1
```

- macOS/Linux:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

Create `backend/.env`:

```env
AZURE_ENDPOINT=...
AZURE_KEY=...
GEMINI_API_KEY=...
GROQ_API_KEY=...
```

Notes:
- Missing Azure credentials -> OCR falls back to PaddleOCR.
- Missing Groq credentials -> summary falls to Gemini, then HuggingFace.
- Missing Gemini credentials -> summary uses Groq only, then HuggingFace.
- First PaddleOCR run can download models and take longer.

Run backend:

```bash
uvicorn app.main:app --reload --port 8000
```

Backend URL: `http://127.0.0.1:8000`

## 3) Frontend Setup

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: Vite dev server (typically `http://localhost:5173`)

## 4) Quick Verification

1. Open frontend URL.
2. Go to Workspace.
3. Upload a PDF/image.
4. Check Original Notes and Study Materials tabs.
5. Open Study Mode and test a mode -> feature flow.

## 5) Current API Endpoints

### Core

- GET `/`
- POST `/upload`

Upload form fields:
- `file` (required)
- `summarize_level` (optional): `concise`, `balanced`, `detailed`

### Study Material Features

- POST `/cheat-sheet`
- POST `/questions`
- POST `/quiz`
- POST `/youtube`
- POST `/diagram`

### Advanced Study Mode

- POST `/study-mode/generate`
- POST `/study-mode/ai-tutor`

## 6) Frontend Routes

- `/` home page
- `/workspace` upload and feature generation workspace
- `/study-mode` mode selection
- `/study-mode/:modeId` mode-specific feature listing
- `/study-mode/:modeId/:featureId` feature workspace

## 7) Common Problems

| Problem | Fix |
|---|---|
| `ModuleNotFoundError: paddleocr` | Use Python 3.10-3.12 (prefer 3.12). |
| Backend port in use | Change port or stop old process. |
| `File too large` | Keep file <= 450 MB. |
| `Too many pages` | Keep PDF <= 1950 pages. |
| Study mode says upload first | Upload document in Workspace first. |
| `npm run dev` fails | Run `npm install` in `frontend/` first. |

## 8) Useful Docs

- `README.md`
- `docs/OCR_PIPELINE.md`
- `docs/PROJECT_STRUCTURE_AND_FLOW.md`
- `docs/CHANGELOG.md`
