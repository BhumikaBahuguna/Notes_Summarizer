# Project Work Carried Out

## 3.1 Architectural Design
The system follows a decoupled, asynchronous micro-architecture designed for resilience and low latency.
- **Client-Server Decoupling:** The frontend (React) maintains the application state and UI logic, while the backend (FastAPI) serves as a stateless processing engine for document transformation.
- **Multi-Tiered Fallback Pipeline:** Critical services like OCR and LLM-based processing are structured with primary and secondary providers to ensure high availability.
- **Asynchronous Processing Flow:** Utilizes Python's `asyncio` to handle concurrent I/O-bound tasks, such as simultaneous API calls to different AI providers.
- **Centralized Service Layer:** Business logic is encapsulated in dedicated service modules (e.g., `gemini_service.py`, `ocr_pipeline.py`) to maintain a clean separation of concerns.
- **Parallel AI Racing Architecture:** A "racing" mechanism is implemented for feature generation, where multiple models (Gemini, Groq) are queried in parallel, and the fastest valid response is returned to the user.
- **Stateless Request Lifecycle:** To ensure data privacy and scalability, the system does not persist user files; all processing occurs in-memory or within temporary request contexts.

## 3.2 Implementation Details

### 3.2.1 Hybrid OCR and Text Extraction
The extraction layer is built to handle diverse document formats and qualities.
- **Primary Extraction:** Integrated Azure AI Document Intelligence for high-fidelity extraction of both printed and complex handwritten notes.
- **Local Fallback:** Implemented PaddleOCR as a local engine to ensure the system remains functional during network outages or Azure API rate-limiting.
- **PDF-to-Image Pipeline:** Utilized `pypdfium2` for rapid conversion of large PDF documents into optimized image buffers for OCR processing.
- **Validation Logic:** Developed a validation layer to check file integrity, size limits (up to 450MB), and page counts before initiating the extraction.

### 3.2.2 AI-Powered Sanitization and Cleaning
Raw OCR text often contains "noise" that can degrade summarization quality.
- **Regex Pre-filtering:** Applied custom regular expression patterns to strip common non-educational artifacts like page numbers and timestamps.
- **Instruction-Tuned Sanitization:** Leveraged Gemini Flash to identify and remove institutional headers, watermarks, and administrative text while preserving core academic content.
- **Structural Preservation:** The cleaning logic ensures that the hierarchical structure of the notes (headings, sub-headings) is maintained for downstream processing.
- **Denoising Fallbacks:** Configured Groq (Llama-3) as a secondary cleaning engine to ensure text sanitization is never a bottleneck.

### 3.2.3 Multi-Level Summarization and Feature Generation
The system transforms cleaned text into structured educational aids.
- **Adaptive Depth Control:** Implemented logic to generate summaries at three distinct granularities (Concise, Balanced, Detailed) based on user-defined prompts.
- **Structured JSON Formatting:** All LLM outputs are strictly enforced as JSON structures to ensure seamless integration with the frontend UI components.
- **Algorithmic MCQ Generation:** Developed a specialized service that maps cleaned text to diverse question types across three difficulty levels (Beginner to Advanced).
- **Mermaid.js Integration:** Created a logic layer to generate syntactically correct Mermaid.js code for rendering interactive mind maps and concept graphs.

### 3.2.4 Contextual Study Modes and Resource Mapping
The implementation includes high-level cognitive workflows tailored to student needs.
- **Prompt Engineering for Modes:** Designed unique system prompts for "Quick Revision," "Deep Study," and "Exam Prep" to prioritize different information subsets.
- **Cheat Sheet Extraction:** Built a factual extraction service that identifies formulas, definitions, and key dates for last-minute revision.
- **YouTube API Integration:** Developed a keyword extraction algorithm to generate optimized search queries for recommending relevant external video content.
- **Grounding the AI Tutor:** Implemented a context-window management system that restricts the AI Tutor's knowledge base strictly to the uploaded document's content.

## 3.3 Performance and Reliability Optimization
Efficiency is maintained through several architectural and implementation-level optimizations.
- **Outline Caching:** Implemented a hashing mechanism for document content to prevent redundant processing when switching between different study modes.
- **Latency Reduction:** The parallel execution of Groq (Llama-3 70B) and Gemini Pro significantly reduces wait times for complex feature generation.
- **Dynamic Response Validation:** Built-in JSON schema validation ensures that only structurally sound AI responses are sent to the frontend.
- **Visual Feedback Loop:** Integrated real-time progress toasts and stage-based navigation in the React frontend to manage user expectations during long-running tasks.
- **Stateless Memory Management:** Automated cleanup of local temporary files ensures the system remains lightweight and secure under high concurrent load.
