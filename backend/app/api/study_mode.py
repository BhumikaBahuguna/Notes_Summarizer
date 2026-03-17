"""
Study Mode Router
Endpoints for study mode feature generation and AI tutor.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.study_mode_service import generate_study_feature, generate_ai_tutor_response

router = APIRouter(prefix="/study-mode")


class StudyFeatureInput(BaseModel):
    mode: str
    feature: str
    text: str


class AiTutorInput(BaseModel):
    text: str
    question: str


@router.post("/generate")
async def study_feature(data: StudyFeatureInput):
    if not data.text or len(data.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    result = await generate_study_feature(data.mode, data.feature, data.text)
    if result.get("engine") == "failed":
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to generate content"))

    return result


@router.post("/ai-tutor")
async def ai_tutor(data: AiTutorInput):
    if not data.text or len(data.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    if not data.question or len(data.question.strip()) == 0:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    result = await generate_ai_tutor_response(data.text, data.question)
    return result
