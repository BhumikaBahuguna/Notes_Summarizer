# Project Overview: Notes Summarizer

## 1. The Problem
Modern students and professionals face information overload. Study materials—such as handwritten notes, lengthy PDFs, and captured images—are inherently unstructured. Extracting key insights, generating study aids, and preparing for exams from these raw materials requires significant manual effort, time, and cognitive load. There is a critical need for an automated system that not only digitizes but structurally organizes and synthesizes this information into actionable study formats.

## 2. The Solution & Innovations
Notes Summarizer is a full-stack, AI-powered study assistant designed to ingest unstructured documents and intelligently transform them into customized study materials. 

**Key Innovations:**
- **Hybrid Intelligent Pipelines:** Instead of relying on a single point of failure (e.g., one OCR engine or one LLM), the system employs multi-tiered fallback pipelines for both extraction and summarization.
- **Parallel AI Racing:** For complex tasks, the system pits multiple LLMs against each other in a parallel race, accepting the fastest valid response to drastically reduce latency.
- **Contextual Study Modes:** The system dynamically re-contextualizes the exact same source material into three distinct cognitive workflows (Quick Revision, Deep Study, Exam Preparation) using prompt-engineered feature generation.

## 3. Core Features
- **Smart Extraction:** Ingests PDFs and images, handling both printed text and handwritten notes.
- **Automated Text Cleaning:** Uses AI to strip OCR artifacts (page numbers, headers, watermarks) without losing core educational content.
- **Adaptive Summarization:** Generates Brief, Balanced, or Detailed summaries based on user preference, utilizing outline caching to prevent redundant processing.
- **Dynamic Study Materials:** Generates Cheat Sheets, Concept Maps (Mermaid diagrams), YouTube Video Suggestions, and Flashcards.
- **Algorithmic Quiz Generation:** Creates multi-level MCQs and theoretical exam questions tailored to the document's difficulty.
- **AI Tutor:** A conversational interface grounded strictly in the uploaded document's context.

## 4. Technology Stack
### Frontend
- **Framework:** React.js powered by Vite for fast HMR and optimized builds.
- **Routing & State:** React Router for stage-based navigation; React hooks for centralized state flow.
- **Styling:** Tailwind CSS (via PostCSS) for responsive, utility-first design, ensuring a rich, modern aesthetic.
- **Visualization:** Mermaid.js for rendering dynamic concept trees and relationship graphs.

### Backend
- **Framework:** FastAPI (Python) for asynchronous, high-performance API endpoints.
- **Extraction (OCR):** Azure Document Intelligence (primary for high-accuracy handwriting) and PaddleOCR (local, robust fallback).
- **PDF Processing:** `pypdfium2` for fast, lightweight PDF-to-image conversion.
- **AI / LLM Providers:** 
  - **Gemini (Google):** Primary for text cleaning and structured feature generation.
  - **Groq (Llama-3 models):** Primary for ultra-fast brief summarization and fallback cleaning.
  - **HuggingFace:** Last-resort fallback.

## 5. Architectural Highlights
- **Stateless Microservice Design:** The backend is completely stateless. It processes uploads, generates JSON payloads, and returns them to the client. The frontend holds the application state.
- **Separation of Concerns:** Distinct routers manage file uploads (`upload.py`), standard features (`features.py`), and study modes (`study_mode.py`).
- **Resiliency through Fallbacks:** The architecture guarantees a response even if a primary third-party API goes down or rate-limits the application.

## 6. Hybrid Pipelines Summary
The true strength of Notes Summarizer lies in its pipelines:
1. **Extraction Pipeline:** Upload -> Validation -> Azure OCR (Prebuilt Read). If Azure fails, timeout, or errors -> PaddleOCR takes over.
2. **Cleaning Pipeline:** Raw Text -> Regex Pre-filter -> Gemini Flash (Instruction-tuned for artifact removal). If Gemini fails -> Groq (Llama-3 8B) takes over.
3. **Summarization Pipeline:** Cleaned Text -> Hash Check (Outline Caching) -> Parallel execution of Gemini and Groq. The first engine to return a valid JSON structure wins. HuggingFace acts as a tertiary fallback. 

This multi-engine, multi-tiered approach ensures maximum uptime, cost-efficiency, and user satisfaction, standing up to rigorous production standards.