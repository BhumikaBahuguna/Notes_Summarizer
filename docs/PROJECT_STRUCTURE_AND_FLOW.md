# Project Structure and End-to-End Flow

This is the canonical architecture document for Notes Summarizer.

## 1) System Overview

Notes Summarizer is a full-stack application with:

- React frontend for upload, study materials, and study mode navigation
- FastAPI backend for OCR, cleaning, summarization, and feature generation
- Multi-engine fallback strategy for reliability at each stage

## 2) Runtime Architecture

- Frontend runtime: `frontend/` (Vite + React)
- Backend runtime: `backend/app/` (FastAPI)
- Client-server interface: REST over HTTP
- Primary local URLs:
  - frontend: `http://localhost:5173` (default Vite)
  - backend: `http://127.0.0.1:8000`

## 3) Repository Layout

```text
Notes_Summarizer/
|-- backend/
|   |-- requirements.txt
|   `-- app/
|       |-- main.py
|       |-- api/
|       |   |-- upload.py
|       |   |-- features.py
|       |   `-- study_mode.py
|       |-- core/
|       |   `-- config.py
|       `-- services/
|           |-- ocr_pipeline.py
|           |-- azure_ocr_service.py
|           |-- paddle_ocr.py
|           |-- text_cleaner.py
|           |-- summarize_pipeline.py
|           |-- gemini_service.py
|           |-- groq_service.py
|           |-- huggingface_service.py
|           |-- cheat_sheet_service.py
|           |-- question_generator_service.py
|           |-- mcq_quiz_service.py
|           |-- youtube_suggestions_service.py
|           |-- diagram_generator_service.py
|           |-- study_mode_service.py
|           |-- preprocess.py
|           |-- azure_ocr.py          (legacy)
|           |-- hybrid_ocr.py         (legacy)
|           `-- ocr_service.py        (legacy)
|-- frontend/
|   |-- package.json
|   |-- vite.config.js
|   |-- index.html
|   `-- src/
|       |-- App.jsx
|       |-- main.jsx
|       |-- services/api.js
|       |-- components/
|       |   |-- FileUpload.jsx
|       |   |-- ResultsView.jsx
|       |   |-- FeatureCard.jsx
|       |   |-- MermaidDiagram.jsx
|       |   |-- LoadingState.jsx
|       |   |-- Toast.jsx
|       |   `-- Navbar.jsx
|       `-- pages/
|           |-- Home.jsx
|           |-- Workspace.jsx
|           |-- StudyMode.jsx
|           |-- ModeFeatures.jsx
|           `-- ModeFeature.jsx
|-- docs/
|   |-- CHANGELOG.md
|   |-- OCR_PIPELINE.md
|   `-- PROJECT_STRUCTURE_AND_FLOW.md
|-- README.md
|-- Start_here.md
|-- run.txt
`-- test_ui.html
```

## 4) Backend Routers and Responsibilities

File: `backend/app/main.py`

Mounted routers:
- `api/upload.py`
- `api/features.py`
- `api/study_mode.py`

Health route:
- GET `/`

### 4.1 Upload Router (`api/upload.py`)

Endpoint:
- POST `/upload`

Responsibilities:
1. Persist upload to disk (`uploads/`)
2. Validate file size/page count
3. Run OCR pipeline
4. Run AI text cleaning
5. Optionally run summarization
6. Return unified response

### 4.2 Standard Features Router (`api/features.py`)

Endpoints:
- POST `/cheat-sheet`
- POST `/questions`
- POST `/quiz`
- POST `/youtube`
- POST `/diagram`

Each endpoint accepts cleaned text and returns structured JSON.

### 4.3 Study Mode Router (`api/study_mode.py`)

Endpoints:
- POST `/study-mode/generate`
- POST `/study-mode/ai-tutor`

`/study-mode/generate` dispatches by feature id and mode.

## 5) Processing Stages

### Stage A - Validation

- max file size: 450 MB
- max PDF pages: 1950

### Stage B - OCR

Orchestrator: `services/ocr_pipeline.py`

Fallback:
1. Azure OCR (`azure_ocr_service.py`)
2. PaddleOCR (`paddle_ocr.py`)

### Stage C - Cleaning

Service: `services/text_cleaner.py`

Fallback:
1. Gemini
2. Groq

### Stage D - Optional Summary

Service: `services/summarize_pipeline.py`

Strategy (optimized for speed):
- Brief: single-pass Groq -> Gemini -> HuggingFace
- Medium/Detailed: parallel race Groq vs Gemini -> HuggingFace

Tiered retries: brief=0, medium=1, detailed=2.
Outline caching across summary levels per document.

### Stage E - Feature Generation

Standard features through `api/features.py` and dedicated services.

Advanced study features through `study_mode_service.py`.

## 6) Frontend Route and Screen Flow

Defined in `frontend/src/App.jsx`:

- `/` -> Home
- `/workspace` -> Upload + Original Notes + Study Materials
- `/study-mode` -> mode cards only
- `/study-mode/:modeId` -> mode-specific features list
- `/study-mode/:modeId/:featureId` -> single feature workspace

### 6.1 Workspace Flow

1. `FileUpload.jsx` uploads file using `uploadFile()`.
2. `Workspace.jsx` stores server payload in app state.
3. User can switch between:
   - Original Notes tab (`extracted_text`)
   - Study Materials tab (`ResultsView.jsx`)
4. `ResultsView.jsx` triggers feature calls and shows outputs via `FeatureCard.jsx`.

### 6.2 Study Mode Flow

1. `StudyMode.jsx`: choose one of 3 modes.
2. `ModeFeatures.jsx`: list features for selected mode.
3. `ModeFeature.jsx`: generate and interact with selected feature.

## 7) Study Modes and Feature IDs

Quick Revision:
- `ultra-summary`
- `cheat-sheet`
- `key-concepts`
- `concept-tree`
- `mini-quiz`
- `revision-time`
- `definitions`

Deep Study:
- `detailed-summary`
- `ai-tutor`
- `flashcards`
- `concept-map`
- `diagram`
- `youtube`
- `related-topics`
- `examples`

Exam Preparation:
- `expected-questions`
- `high-prob-questions`
- `three-level-quiz`
- `weak-topics`
- `last-minute`
- `formulas`

## 8) Frontend API Client Map

File: `frontend/src/services/api.js`

- `uploadFile(file, summarizeLevel)` -> `/upload`
- `generateCheatSheet(text)` -> `/cheat-sheet`
- `generateQuestions(text)` -> `/questions`
- `generateQuiz(text, difficulty)` -> `/quiz`
- `getYouTubeSuggestions(text)` -> `/youtube`
- `generateDiagram(text)` -> `/diagram`
- `generateStudyFeature(mode, feature, text)` -> `/study-mode/generate`
- `generateAiTutorResponse(text, question)` -> `/study-mode/ai-tutor`

## 9) Request/Response Contracts

### 9.1 Upload request

Multipart fields:
- `file`
- `summarize_level` (optional)

Upload response commonly includes:
- `filename`
- `engine_used`
- `raw_text`
- `extracted_text`
- `cleaner`
- optional summary fields

### 9.2 Feature request body

```json
{ "text": "..." }
```

Quiz request body:

```json
{ "text": "...", "difficulty": "beginner|intermediate|full_prepared" }
```

### 9.3 Study mode request body

```json
{ "mode": "deep-study", "feature": "flashcards", "text": "..." }
```

Tutor request body:

```json
{ "text": "...", "question": "Explain with an example" }
```

## 10) Reliability and Fallback Summary

| Stage | Primary | Fallback |
|---|---|---|
| OCR | Azure | PaddleOCR |
| Text cleaning | Gemini | Groq |
| Summary (brief) | Groq (single-pass) | Gemini, then HuggingFace |
| Summary (medium/detailed) | Groq vs Gemini (parallel race) | HuggingFace |
| Study mode generation | Gemini | Groq |

## 11) Operational Notes

- CORS is enabled for local development usage.
- Upload files are written to `uploads/` on backend side.
- `frontend/node_modules/` and `frontend/dist/` are ignored by git.

## 12) Legacy Files

Legacy OCR implementations still in repository:
- `backend/app/services/azure_ocr.py`
- `backend/app/services/hybrid_ocr.py`
- `backend/app/services/ocr_service.py`

Current OCR pipeline uses:
- `backend/app/services/ocr_pipeline.py`
- `backend/app/services/azure_ocr_service.py`
- `backend/app/services/paddle_ocr.py`
