"""
MCQ Quiz Generator Service
Generates multiple-choice quizzes at 3 difficulty levels.
"""

import os
import json
import re
import httpx
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")


def extract_json(text: str) -> dict | None:
    """Extract JSON from text, handling markdown wrappers and extra formatting."""
    if not text:
        return None
    
    # Try to find JSON wrapped in markdown code blocks
    match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
    if match:
        json_str = match.group(1).strip()
        try:
            return json.loads(json_str)
        except:
            pass
    
    # Try to parse the entire text as JSON
    try:
        return json.loads(text.strip())
    except:
        pass
    
    # Try to find JSON object in the text
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        try:
            return json.loads(match.group(0))
        except:
            pass
    
    return None


async def generate_quiz(text: str, level: str) -> dict:
    """
    Generate a 5-question MCQ quiz at specified difficulty level.
    
    Args:
        text: Extracted text content
        level: "beginner", "intermediate", or "full_prepared"
    
    Returns:
        {
            "quiz": [
                {
                    "question": "...",
                    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
                    "correct_answer": "B",
                    "explanation": "..."
                },
                ...
            ],
            "level": level,
            "engine": "gemini" | "groq"
        }
    """
    prompt = _build_quiz_prompt(text, level)
    
    # Try Gemini first
    result = await _call_gemini(prompt)
    if result:
        return {"quiz": result, "level": level, "engine": "gemini"}
    
    # Fallback to Groq
    result = await _call_groq(prompt)
    if result:
        return {"quiz": result, "level": level, "engine": "groq"}
    
    return {"quiz": [], "level": level, "engine": "failed", "error": "All engines failed"}


def _build_quiz_prompt(text: str, level: str) -> str:
    """Build the prompt for MCQ quiz generation."""
    
    level_descriptions = {
        "beginner": "For students who just read the brief summary. Questions should be straightforward and test basic understanding of key concepts.",
        "intermediate": "For students who read the medium summary. Questions should test concept understanding and ability to differentiate between related ideas.",
        "full_prepared": "For students who studied the detailed version. Questions should test comprehensive understanding, analysis, and application of concepts.",
    }
    
    description = level_descriptions.get(level, level_descriptions["intermediate"])
    
    return f"""You are an expert exam question writer. Generate exactly 5 multiple-choice questions from the following text.

DIFFICULTY LEVEL: {level.upper()}
LEVEL DESCRIPTION: {description}

RULES:
1. Generate exactly 5 questions.
2. Each question has 4 options (A, B, C, D).
3. Only ONE correct answer per question.
4. All options should be plausible but only one is correct.
5. Include clear explanations for why the correct answer is right.
6. Test understanding, not just memorization (except for definitions at beginner level).
7. Use technical terms from the original text.
8. Each distracter (wrong answer) should test a common misconception.

Return ONLY a JSON object with this structure:
{{
  "quiz": [
    {{
      "question": "Question text?",
      "options": [
        "A) Option 1",
        "B) Option 2",
        "C) Option 3",
        "D) Option 4"
      ],
      "correct_answer": "B",
      "explanation": "Why B is correct and why others are wrong."
    }},
    ...
  ]
}}

TEXT:
{text}

QUIZ (JSON only):"""


async def _call_gemini(prompt: str) -> list | None:
    """Call Gemini API. Returns list of quiz question objects or None on failure."""
    if not GEMINI_API_KEY:
        return None
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
                params={"key": GEMINI_API_KEY},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.5,
                        "maxOutputTokens": 8192,
                    },
                },
            )
            response.raise_for_status()
            data = response.json()
            
            if not data.get("candidates"):
                return None
            
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            # Parse JSON from response
            result = extract_json(text)
            if result and "quiz" in result:
                return result.get("quiz", [])
            return None
    except Exception:
        return None


async def _call_groq(prompt: str) -> list | None:
    """Call Groq API as fallback. Returns list of quiz question objects or None on failure."""
    if not GROQ_API_KEY:
        return None
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.5,
                    "max_tokens": 8192,
                },
            )
            response.raise_for_status()
            data = response.json()
            
            if not data.get("choices"):
                return None
            
            text = data["choices"][0]["message"]["content"]
            # Parse JSON from response
            result = extract_json(text)
            if result and "quiz" in result:
                return result.get("quiz", [])
            return None
    except Exception:
        return None
