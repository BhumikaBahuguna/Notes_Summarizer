# Notes Summarizer

Notes Summarizer is a full-stack, AI-powered study assistant designed to ingest unstructured documents and intelligently transform them into customized study materials.

## Core Capabilities

- **Hybrid OCR Extraction:** Primary extraction via Azure Document Intelligence, with a robust local fallback to PaddleOCR to ensure maximum uptime.
- **AI Text Cleaning:** Uses instruction-tuned LLMs (Gemini primary, Groq fallback) to strip OCR artifacts (page numbers, headers, signatures) while preserving educational content.
- **Adaptive Summarization:** 
  - **Brief:** Single-pass ultra-fast processing.
  - **Medium/Detailed:** Parallel racing architecture (Groq vs. Gemini) to minimize latency.
- **Contextual Study Modes:** Dynamically generates study materials across three cognitive workflows:
  - **Quick Revision:** Ultra-summaries, mini-quizzes, concept trees.
  - **Deep Study:** Detailed summaries, flashcards, concept maps, AI Tutor.
  - **Exam Preparation:** Expected questions, 3-tier difficulty quizzes, high-probability topics.
- **Stateless Architecture:** No user accounts, no databases, guaranteeing maximum privacy and simplified deployment.

## Tech Stack

- **Frontend:** React, Vite, React Router, Tailwind CSS, Mermaid.js
- **Backend:** FastAPI, Uvicorn, Pydantic, asyncio
- **Extraction:** Azure Document Intelligence, PaddleOCR, pypdfium2
- **AI Providers:** Gemini, Groq, HuggingFace

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

Frontend runs on `http://localhost:5173`. Backend runs on `http://127.0.0.1:8000`.

## Environment Variables

Create `backend/.env` with the following:

```env
AZURE_ENDPOINT=...
AZURE_KEY=...
GEMINI_API_KEY=...
GROQ_API_KEY=...
```

*Note: The app is designed with multi-tiered fallbacks and can still operate locally with partial credentials.*

## API Overview

### System
- `GET /` - Health check
- `POST /upload` - Validates, OCRs, cleans, and optionally summarizes files.

### Standard Feature Endpoints
- `POST /cheat-sheet`
- `POST /questions`
- `POST /quiz`
- `POST /youtube`
- `POST /diagram`

### Advanced Study Mode Endpoints
- `POST /study-mode/generate` - Dispatches generation based on mode and feature ID.
- `POST /study-mode/ai-tutor` - Conversational context-aware endpoint.

## Documentation Map

- `PROJECT_OVERVIEW.md` - High-level overview, architecture, and tech stack.
- `DEEP_PROJECT_EXPLANATION.md` - Exhaustive reverse-engineering guide, internal pipeline logic, and Viva defense prep.
- `docs/OCR_PIPELINE.md` - Detailed OCR and cleaning fallback logic.
- `docs/PROJECT_STRUCTURE_AND_FLOW.md` - File-level architecture and request mapping.
