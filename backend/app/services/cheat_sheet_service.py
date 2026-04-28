"""
Cheat Sheet Generator Service
Converts extracted text into concise bullet-point revision material.
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


async def generate_cheat_sheet(text: str) -> dict:
    """
    Generate a cheat sheet with bullet points from extracted text.
    Returns: { bullets: [...], engine: "gemini" | "groq" }
    """
    prompt = _build_cheat_sheet_prompt(text)
    
    # Try Gemini first
    result = await _call_gemini(prompt)
    if result:
        return {"bullets": result, "engine": "gemini"}
    
    # Fallback to Groq
    result = await _call_groq(prompt)
    if result:
        return {"bullets": result, "engine": "groq"}
    
    return {"bullets": [], "engine": "failed", "error": "All engines failed"}


def _build_cheat_sheet_prompt(text: str) -> str:
    """Build the prompt for cheat sheet generation."""
    return f"""You are a study materials expert. Convert the following text into a concise cheat sheet.

RULES:
1. Extract the most important concepts, definitions, and facts.
2. Format as bullet points - one idea per bullet.
3. Keep each bullet to 1-2 lines maximum.
4. Include key data: numbers, dates, classifications, formulas.
5. Group related bullets under section headings.
6. Prioritize what students need to memorize for exams.
7. Use technical terms from the original text.

Return ONLY a JSON object with this structure:
{{
  "sections": [
    {{
      "section": "Section Name",
      "bullets": ["bullet 1", "bullet 2", ...]
    }},
    ...
  ]
}}

TEXT:
{text}

CHEAT SHEET (JSON only):"""


async def _call_gemini(prompt: str) -> list | None:
    """Call Gemini API. Returns list of bullet point sections or None on failure."""
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
                        "temperature": 0.3,
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
            if result and "sections" in result:
                return result.get("sections", [])
            return None
    except Exception as e:
        print(f"    ⚠️  Gemini cheat-sheet failed: {e}")
        return None


async def _call_groq(prompt: str) -> list | None:
    """Call Groq API as fallback. Returns list of bullet point sections or None on failure."""
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
                    "temperature": 0.3,
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
            if result and "sections" in result:
                return result.get("sections", [])
            return None
    except Exception as e:
        print(f"    ⚠️  Groq cheat-sheet failed: {e}")
        return None
