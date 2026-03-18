# Changelog

This changelog tracks the major implemented milestones for Notes Summarizer.

## 2026-03-18 - Summarization Pipeline Speed Optimization

- Reordered summarization fallback: Groq first (fastest), Gemini second, HuggingFace last resort.
- Added parallel race for medium/detailed modes: Groq and Gemini run simultaneously, fastest response wins.
- Added single-pass direct summarization for brief mode (skips outline extraction entirely).
- Introduced tiered validation retries: brief=0, medium=1, detailed=2.
- Lowered API timeouts aggressively: Groq 20-50s, Gemini 30-60s (previously 60-150s).
- Trimmed Gemini model list from 5 to 3 (removed slower 2.5 models).
- Added outline caching: same document at different summary levels reuses the structural outline.
- Forced outline extraction to use lightest Gemini model (`gemini-2.0-flash-lite`).
- Files changed:
  - `backend/app/services/summarize_pipeline.py` (rewritten)
  - `backend/app/services/gemini_service.py` (modified)
  - `backend/app/services/groq_service.py` (modified)

## 2026-03-18 - Documentation and Structure Sync

- Updated all markdown documentation to match current code state.
- Added and aligned architecture references across:
  - `README.md`
  - `Start_here.md`
  - `docs/OCR_PIPELINE.md`
  - `docs/PROJECT_STRUCTURE_AND_FLOW.md`
  - `docs/CHANGELOG.md`
- Removed stale notes claiming frontend was not connected.
- Refreshed setup steps for current backend + React frontend flow.

## 2026-03 - Advanced Study Mode Release

### Frontend

- Added Study Mode route flow:
  - `/study-mode`
  - `/study-mode/:modeId`
  - `/study-mode/:modeId/:featureId`
- Implemented three-mode UX:
  - Quick Revision
  - Deep Study
  - Exam Preparation
- Added mode-specific feature listing page (`ModeFeatures.jsx`) so features are shown only after selecting a mode.
- Added full feature workspace (`ModeFeature.jsx`) with:
  - generation and regeneration
  - copy/download actions
  - quiz interactions with score and weak-topic detection
  - AI tutor conversation view
  - flashcards, diagram, examples, formulas, videos, related topics

### Backend

- Added `backend/app/api/study_mode.py`.
- Added `backend/app/services/study_mode_service.py` with:
  - prompt-based generation for all study-mode features
  - JSON extraction/parsing
  - Gemini primary + Groq fallback chain
  - delegation to existing services for cheat sheet, diagram, and videos
- Registered study-mode router in `backend/app/main.py`.

## 2026-03 - Workspace and Feature UX Upgrade

- Upgraded workspace and results UI to structured React components.
- Renamed extracted text view to Original Notes.
- Added direct "View Original Notes" action from study materials area.
- Improved quiz behavior:
  - no answer reveal before selection
  - post-selection correctness and explanation
  - score card with motivation tiers
- Added "Highly Expected Questions" heading in question output.
- Improved video cards with richer visual presentation.
- Added summary copy/download actions.

## 2026-02 - Core Pipeline Stabilization

- Implemented robust upload pipeline in `backend/app/api/upload.py`.
- Added validation limits:
  - max file size: 450 MB
  - max PDF pages: 1950
- Finalized OCR fallback orchestration in `ocr_pipeline.py`:
  - Azure OCR primary
  - PaddleOCR fallback
- Integrated AI OCR text cleaning in `text_cleaner.py`:
  - Gemini primary
  - Groq fallback
- Integrated summary pipeline in `summarize_pipeline.py`:
  - Originally: Gemini -> Groq -> HuggingFace
  - Now superseded by speed-optimized pipeline (see 2026-03-18 entry)

## Ongoing

- Legacy OCR files remain in repository for reference:
  - `backend/app/services/azure_ocr.py`
  - `backend/app/services/hybrid_ocr.py`
  - `backend/app/services/ocr_service.py`
- Primary live OCR flow uses:
  - `backend/app/services/ocr_pipeline.py`
  - `backend/app/services/azure_ocr_service.py`
  - `backend/app/services/paddle_ocr.py`
