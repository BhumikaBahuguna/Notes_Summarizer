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

## Pipeline Flow

Upload File
↓
Preprocessing (optional cleanup)
↓
Azure OCR (primary)
↓
If Azure fails → PaddleOCR fallback
↓
Return extracted text
↓
Summarization pipeline

---

## Components

### Azure OCR
- Handles printed + handwritten text
- Best accuracy
- Cloud based
- Uses endpoint + API key

### PaddleOCR
- Local fallback
- Works offline
- Handles complex layouts

---

## Why Hybrid Approach

| Problem | Solution |
|--------|---------|
| Poor handwritten detection | Azure |
| Local fallback needed | Paddle |
| Reliability | Combined pipeline |

---

## Error Handling

- Azure timeout → fallback
- Unsupported file → return message
- Empty OCR → retry fallback

---

## Environment Variables
AZURE_ENDPOINT=your_endpoint
AZURE_KEY=your_key

---

## Status

✅ OCR pipeline stable  
✅ Tested with handwritten + printed  
✅ Ready for production  

---

## Next Steps

- Text cleaning
- AI summarization
- Quiz generation
- Knowledge extraction
