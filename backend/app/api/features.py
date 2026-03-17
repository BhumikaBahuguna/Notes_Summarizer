"""
Features Router
Endpoints for cheat sheet, questions, quiz, youtube suggestions, and diagrams.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.cheat_sheet_service import generate_cheat_sheet
from app.services.question_generator_service import generate_questions
from app.services.mcq_quiz_service import generate_quiz
from app.services.youtube_suggestions_service import generate_youtube_suggestions
from app.services.diagram_generator_service import generate_diagram

router = APIRouter()


class TextInput(BaseModel):
    """Input for features that take extracted text."""
    text: str


class QuizInput(BaseModel):
    """Input for quiz generation with difficulty level."""
    text: str
    difficulty: str = "beginner"  # "beginner", "intermediate", or "full_prepared"


@router.post("/cheat-sheet")
async def cheat_sheet(data: TextInput):
    """
    Generate a cheat sheet with bullet points from extracted text.
    
    Response:
    {
        "bullets": [
            {
                "section": "Section Name",
                "bullets": ["bullet 1", "bullet 2", ...]
            }
        ],
        "engine": "gemini" | "groq"
    }
    """
    if not data.text or len(data.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    result = await generate_cheat_sheet(data.text)
    if result.get("engine") == "failed":
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to generate cheat sheet"))
    
    return result


@router.post("/questions")
async def questions(data: TextInput):
    """
    Generate important exam-style questions from extracted text.
    
    Response:
    {
        "questions": [
            {
                "question": "...",
                "answer": "...",
                "type": "definition|differentiation|why|importance|example"
            }
        ],
        "engine": "gemini" | "groq"
    }
    """
    if not data.text or len(data.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    result = await generate_questions(data.text)
    if result.get("engine") == "failed":
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to generate questions"))
    
    return result


@router.post("/quiz")
async def mcq_quiz(data: QuizInput):
    """
    Generate MCQ quiz at specified difficulty level.
    
    Difficulty levels:
    - "beginner": For brief summary readers (straightforward questions)
    - "intermediate": For medium summary readers (concept differentiation)
    - "full_prepared": For detailed learners (analysis & application)
    
    Response:
    {
        "quiz": [
            {
                "question": "...",
                "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
                "correct_answer": "B",
                "explanation": "..."
            }
        ],
        "level": "beginner|intermediate|full_prepared",
        "engine": "gemini" | "groq"
    }
    """
    if not data.text or len(data.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    valid_levels = ["beginner", "intermediate", "full_prepared"]
    if data.difficulty not in valid_levels:
        raise HTTPException(status_code=400, detail=f"Difficulty must be one of: {', '.join(valid_levels)}")
    
    result = await generate_quiz(data.text, data.difficulty)
    if result.get("engine") == "failed":
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to generate quiz"))
    
    return result


@router.post("/youtube")
async def youtube_suggestions(data: TextInput):
    """
    Generate YouTube video suggestions for deeper learning.
    
    Response:
    {
        "videos": [
            {
                "title": "Video Title",
                "description": "Video description",
                "search_query": "Search query",
                "youtube_url": "https://www.youtube.com/results?search_query=..."
            }
        ],
        "engine": "gemini" | "groq"
    }
    """
    if not data.text or len(data.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    result = await generate_youtube_suggestions(data.text)
    if result.get("engine") == "failed":
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to generate suggestions"))
    
    return result


@router.post("/diagram")
async def diagram(data: TextInput):
    """
    Generate a Mermaid diagram representation of the content.
    
    Response:
    {
        "diagram_type": "graph|mindmap|classDiagram|sequenceDiagram",
        "code": "Valid Mermaid diagram code",
        "description": "What the diagram represents",
        "engine": "gemini" | "groq"
    }
    """
    if not data.text or len(data.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    result = await generate_diagram(data.text)
    if result.get("engine") == "failed":
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to generate diagram"))
    
    return result
