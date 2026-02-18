# 📚 Real-Time Notes Summarizer

AI-powered system that extracts text from handwritten and printed notes using Azure OCR with PaddleOCR fallback, then generates structured summaries.

---

## 🚀 Features

- Hybrid OCR pipeline (Azure + PaddleOCR)
- Handles handwritten + printed notes
- PDF and image support
- Real-time API via FastAPI
- Scalable architecture
- Upload → Extract → Summarize workflow

---

## 🧠 Architecture

Upload → OCR Engine → Text Extraction → Processing → Summary

---

## 🛠 Tech Stack

- FastAPI
- Azure Computer Vision OCR
- PaddleOCR
- Python
- OpenCV
- Git
- REST APIs

---

## ⚙️ Setup
git clone repo
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

---

## 📡 API

Upload notes to extract text.

---

## 📌 Status

OCR pipeline locked and stable.

---

## 👩‍💻 Author

Bhumika Bahuguna

