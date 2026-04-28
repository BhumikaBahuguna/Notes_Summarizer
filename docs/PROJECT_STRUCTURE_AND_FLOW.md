# Project Structure and End-to-End Flow

This document maps the architectural layout and data flow of the Notes Summarizer.

## 1. System Architecture

The application uses a **Stateless Microservice Design**:
- **Frontend (Client):** Vite + React application responsible for routing, state management, and UI rendering. No persistence is managed here beyond the current session lifecycle.
- **Backend (Server):** FastAPI application acting as a stateless API gateway. It receives files, orchestrates external AI/OCR APIs, and returns structured JSON.

## 2. Directory Layout

```text
Notes_Summarizer/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI application entry point
│   │   ├── api/
│   │   │   ├── upload.py           # Handles file ingestion and pipeline triggers
│   │   │   ├── features.py         # Standard feature endpoints (Quiz, Diagram, etc.)
│   │   │   └── study_mode.py       # Contextual Study Mode generation
│   │   ├── core/
│   │   │   └── config.py           # Environment and settings management
│   │   └── services/
│   │       ├── ocr_pipeline.py     # Hybrid OCR orchestrator
│   │       ├── text_cleaner.py     # Regex and AI artifact cleaning
│   │       ├── summarize_pipeline.py # Parallel AI summarization
│   │       └── study_mode_service.py # Prompt-driven feature generation
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Main React router and layout
│   │   ├── services/
│   │   │   └── api.js              # Axios HTTP client connecting to FastAPI
│   │   ├── components/             # Reusable UI elements (Navbar, Modals, Diagrams)
│   │   └── pages/                  # Route-level components (Workspace, StudyMode)
└── docs/                           # Architectural and Viva defense documentation
```

## 3. Request Lifecycle (Data Flow)

### Scenario A: File Upload & Initial Processing
1. User uploads a file via `FileUpload.jsx`.
2. `api.js` issues a `multipart/form-data` POST to `/upload`.
3. `upload.py` validates file size and page limits.
4. File is routed through `ocr_pipeline.py` (Azure -> Paddle).
5. Extracted text is cleaned via `text_cleaner.py`.
6. (Optional) Text is summarized via `summarize_pipeline.py`.
7. A single JSON payload containing the text and metadata is returned and saved in `App.jsx` state.

### Scenario B: Study Mode Feature Generation
1. User navigates to `/study-mode/deep-study/flashcards`.
2. The frontend sends the previously extracted text and the requested feature ID (`flashcards`) to `/study-mode/generate`.
3. `study_mode_service.py` selects the strict prompt template for flashcards.
4. The backend queries Gemini (with Groq as a fallback) to generate a structured JSON response.
5. The backend parses the LLM output using `extract_json()`, validates the schema, and returns it to the client.
6. The frontend renders the flashcards UI.

## 4. API Router Contracts

- **`/upload`:** Accepts multipart files. Returns `extracted_text`, `summary`, and engine metadata.
- **`/features`:** Accepts JSON `{ "text": "..." }`. Returns highly structured JSON specific to the feature (e.g., Mermaid code, multiple-choice options).
- **`/study-mode`:** Accepts JSON `{ "mode": "...", "feature": "...", "text": "..." }`. Routes to contextual prompts designed for cognitive retention.
