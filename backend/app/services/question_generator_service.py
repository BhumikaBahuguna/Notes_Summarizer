"""
Important Question Generator Service
Predicts exam-style questions from extracted text.
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
        except (json.JSONDecodeError, ValueError):
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
        except (json.JSONDecodeError, ValueError):
            pass
    
    return None


async def generate_questions(text: str) -> dict:
    """
    Generate important exam-style questions from extracted text.
    Returns: { questions: [...], engine: "gemini" | "groq" }
    """
    prompt = _build_questions_prompt(text)
    
    # Try Gemini first
    result = await _call_gemini(prompt)
    if result:
        return {"questions": result, "engine": "gemini"}
    
    # Fallback to Groq
    result = await _call_groq(prompt)
    if result:
        return {"questions": result, "engine": "groq"}
    
    return {"questions": [], "engine": "failed", "error": "All engines failed"}


def _build_questions_prompt(text: str) -> str:
    """Build the prompt for important question generation."""
    return f"""You are an exam preparation expert. Generate 6-8 important exam-style questions from the following text.

RULES:
1. Questions should test understanding, not just memorization.
2. Include definition questions, differentiation questions, why/how questions, application questions.
3. Questions should cover the most important topics and concepts.
4. Each question should be clear and standalone.
5. Include the answer/explanation for each question.
6. Use technical terms from the text.
7. Focus on concepts students are likely to be tested on.

Examples of good question types:
- "Define [concept] with examples."
- "Differentiate between [concept A] and [concept B]."
- "Why is [concept] important in [context]?"
- "What is the impact of [concept] on [system/process]?"

Return ONLY a JSON object with this structure:
{{
  "questions": [
    {{
      "question": "Question text?",
      "answer": "Answer/explanation",
      "type": "definition|differentiation|why|importance|example"
    }},
    ...
  ]
}}

TEXT:
{text}

QUESTIONS (JSON only):"""


async def _call_gemini(prompt: str) -> list | None:
    """Call Gemini API. Returns list of question objects or None on failure."""
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
                        "temperature": 0.4,
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
            if result and "questions" in result:
                return result.get("questions", [])
            return None
    except Exception as e:
        print(f"    ⚠️  Gemini questions failed: {e}")
        return None


async def _call_groq(prompt: str) -> list | None:
    """Call Groq API as fallback. Returns list of question objects or None on failure."""
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
                    "temperature": 0.4,
                    "max_tokens": 2048,
                },
            )
            response.raise_for_status()
            data = response.json()
            
            if not data.get("choices"):
                return None
            
            text = data["choices"][0]["message"]["content"]
            # Parse JSON from response
            result = extract_json(text)
            if result and "questions" in result:
                return result.get("questions", [])
            return None
    except Exception as e:
        print(f"    ⚠️  Groq questions failed: {e}")
        return None
