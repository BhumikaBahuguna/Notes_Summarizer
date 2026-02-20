# OCR Pipeline — Real-Time Notes Summarizer

## Overview

The system uses a hybrid OCR pipeline designed for high accuracy across:

- Printed documents
- Handwritten notes
- Scanned images
- Camera photos
- PDFs

Primary engine is Microsoft Azure Document Intelligence with PaddleOCR as fallback.

---

## Full Pipeline Flow

```
Upload File → Validate (size/pages)
  → OCR (Azure → PaddleOCR fallback)
  → AI Text Cleaning (Gemini → Groq)
  → Optionally Summarize (Gemini → Groq → HuggingFace)
  → Return response
```

---

## Components

### Azure OCR (`azure_ocr_service.py`)
- Handles printed + handwritten text
- Best accuracy
- Cloud based (requires API key)
- Uses `prebuilt-read` model
- Adds padding to images for better edge detection

### PaddleOCR (`paddle_ocr.py`)
- Local fallback (works offline)
- Handles complex layouts
- PDF support via pypdfium2 (converts pages to 300 DPI images)
- Free, no API key needed

### AI Text Cleaner (`text_cleaner.py`)
- Removes OCR artifacts: page numbers, headers/footers, signatures, garbage characters
- Preserves all actual content, formatting, math expressions
- Fallback: Gemini → Groq
- Runs automatically on all OCR output before summarization

### Summarization (`summarize_pipeline.py`)
- Three modes: brief, medium, detailed
- Fallback: Gemini → Groq → HuggingFace (BART-large-CNN)
- Optional — only runs when requested

---

## Why Hybrid Approach

| Problem | Solution |
|--------|---------|
| Poor handwritten detection | Azure |
| Local fallback needed | PaddleOCR |
| OCR noise/artifacts | AI text cleaning |
| Reliability | Combined pipeline with fallbacks at every stage |

---

## Error Handling

- Azure timeout/failure → falls back to PaddleOCR
- Gemini cleaning fails → falls back to Groq
- All summarizers fail → returns `summary_error` in response
- Unsupported file → returns error message
- File too large / too many pages → HTTP 413

---

## Environment Variables

```
AZURE_ENDPOINT=your_endpoint
AZURE_KEY=your_key
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
```

All optional — the system degrades gracefully with fallbacks.

---

## Status

✅ OCR pipeline stable  
✅ AI text cleaning integrated  
✅ Summarization with 3-engine fallback  
✅ Tested with handwritten + printed  
✅ PDF support (Azure native + PaddleOCR via pypdfium2)

---

## Next Steps

- Proper frontend connected to backend
- Database for extraction history
- Batch file processing
- Quiz generation
- Knowledge extraction
