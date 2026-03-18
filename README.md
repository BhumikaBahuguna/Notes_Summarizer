# Notes Summarizer

Notes Summarizer is a full-stack AI study assistant.

It takes uploaded notes (PDF/images), runs OCR with fallback, cleans noisy OCR text, generates summaries, and creates interactive study materials including cheat sheets, expected questions, quizzes, diagrams, videos, and an Advanced Study Mode workflow.

## Core Capabilities

- OCR extraction with fallback: Azure OCR -> PaddleOCR
- AI text cleaning with fallback: Gemini -> Groq
- Summary generation: Groq primary (parallel race with Gemini for medium/detailed), HuggingFace last resort
- Single-pass brief summaries, two-pass with validation for medium/detailed
- Multiple study outputs: summary, cheat sheet, questions, quiz, videos, and Mermaid diagrams
- Advanced Study Mode with mode-specific feature sets and an AI tutor
- React frontend with stage-based navigation and progress feedback
- FastAPI backend with dedicated routers for upload, features, and study mode

## End-to-End Pipeline

```text
Upload file
-> Validate size/pages
-> OCR (Azure -> Paddle fallback)
-> Text cleaning (Gemini -> Groq fallback)
-> Optional summary:
     brief:           single-pass Groq (-> Gemini -> HuggingFace)
     medium/detailed:  parallel race Groq vs Gemini (-> HuggingFace)
-> Generate study features on demand
```

## Tech Stack

- Frontend: React, Vite, React Router, Axios, Mermaid
- Backend: FastAPI, Uvicorn, Pydantic
- OCR: Azure Document Intelligence, PaddleOCR, pypdfium2
- AI providers: Gemini, Groq, HuggingFace

## Quick Start

### 1) Backend

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
# source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2) Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on the Vite dev URL (typically `http://localhost:5173`).
Backend runs on `http://127.0.0.1:8000`.

## Environment Variables

Create `backend/.env` with values as available:

```env
AZURE_ENDPOINT=...
AZURE_KEY=...
GEMINI_API_KEY=...
GROQ_API_KEY=...
```

The app is designed with fallbacks and can still operate with partial credentials.

## API Overview

### System

- GET `/` - health check
- POST `/upload` - OCR, cleaning, optional summary

### Standard Feature Endpoints

- POST `/cheat-sheet`
- POST `/questions`
- POST `/quiz`
- POST `/youtube`
- POST `/diagram`

### Advanced Study Mode Endpoints

- POST `/study-mode/generate`
- POST `/study-mode/ai-tutor`

## Frontend Routes

- `/` - Home
- `/workspace` - upload + main study materials
- `/study-mode` - select one of 3 study modes
- `/study-mode/:modeId` - mode-specific feature list
- `/study-mode/:modeId/:featureId` - selected feature workspace

## Documentation Map

- `Start_here.md` - complete setup guide (backend + frontend)
- `docs/OCR_PIPELINE.md` - detailed OCR/cleaning/summarization flow
- `docs/PROJECT_STRUCTURE_AND_FLOW.md` - architecture, stages, and file-level mapping
- `docs/CHANGELOG.md` - implementation history and release notes

## Project Status

The project is active and includes:

- production-like frontend flow
- integrated backend feature APIs
- advanced mode-based study experience
- updated docs aligned with current implementation

