<div align="center">

# 📝 **Notes Summarizer**

🚀 An intelligent tool that extracts and summarizes notes from **PDFs, Images, and Text files** using **OCR, NLP, and LLMs**.  
Built with **FastAPI (Backend)** and **Streamlit (Frontend)** for a smooth and interactive experience.  

---

### *"Turn long notes into crisp summaries in seconds!"*

![Python](https://img.shields.io/badge/Python-3.9%2B-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi)
![Streamlit](https://img.shields.io/badge/Streamlit-Frontend-FF4B4B?logo=streamlit)
![OpenAI](https://img.shields.io/badge/OpenAI-LLM-412991?logo=openai)
![HuggingFace](https://img.shields.io/badge/HuggingFace-Models-FFCC00?logo=huggingface)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![Status](https://img.shields.io/badge/Status-Active-success)

</div>

---


## 📸 Screenshots

### 🔹 Upload Page
![Upload Page](assets/upload.png)

### 🔹 Summary Output
![Summary Output](assets/summary.png)

## ✨ Features

- 📂 **Multi-format support** → Upload **PDF, PNG, JPG, JPEG, TXT** files  
- 🔍 **OCR & Text Extraction** → Azure OCR, PyMuPDF, and Tesseract OCR  
- 🤖 **AI-Powered Summarization** → OpenAI GPT models & HuggingFace (fallback)  
- 🧹 **Text Cleaning** → Removes OCR noise, duplicates, and broken words  
- 🎛️ **Summary Length Options** → Choose **Brief, Medium, or Detailed** summary  
- 💾 **Download Summary** → Save results as `.txt` file  
- 🌐 **Full-stack app** → FastAPI backend + Streamlit frontend  

---

## 🛠️ Tech Stack

- **Language**: Python 3.9  
- **Backend**: FastAPI  
- **Frontend**: Streamlit  
- **Libraries**: PyMuPDF, Tesseract, Azure OCR, OpenAI, HuggingFace, spaCy  
- **ML/NLP**: Scikit-learn, spaCy, Transformers  

---


---

## ⚙️ Installation & Setup

1. **Clone the repository**  
   ```bash
   git clone https://github.com/BhumikaBahuguna/Notes_Summarizer.git
   cd Notes_Summarizer
Create virtual environment

bash
Copy code
python -m venv venv
source venv/Scripts/activate   # On Windows
source venv/bin/activate       # On Linux/Mac
Install dependencies

bash
Copy code
pip install -r requirements.txt
Set up environment variables
Create a .env file with your keys (⚠️ never commit these to GitHub)

env
Copy code
OPENAI_API_KEY=your_openai_key
HF_TOKEN=your_huggingface_token
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=your_azure_endpoint
AZURE_DOCUMENT_INTELLIGENCE_KEY=your_azure_key
▶️ Run the Project
Backend (FastAPI)
bash
Copy code
uvicorn app:app --reload
Frontend (Streamlit)
bash
Copy code
streamlit run notes-summary.py
## 📂 Project Structure

Notes-Summarizer/
│── backend/
│ ├── app.py # FastAPI backend
│ ├── main.py # Core OCR + summarization
│ ├── summarizer.py # Helper functions
│ └── tests/ # Unit tests
│
│── notes-summary.py # Streamlit frontend
│── requirements.txt # Dependencies
│── README.md # Documentation
│── assets/ # Screenshots & visuals
🚧 Future Improvements
🌍 Deploy on HuggingFace Spaces / Streamlit Cloud

📱 Build a mobile-friendly interface

🗂️ Add multi-language support for OCR and summarization

🔒 Secure authentication for private documents

👩‍💻 Author
Developed with ❤️ by Bhumika Bahuguna
