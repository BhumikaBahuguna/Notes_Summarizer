"""
YouTube Learning Suggestions Service
Recommends relevant educational videos for deeper learning.
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


async def generate_youtube_suggestions(text: str) -> dict:
    """
    Generate recommended YouTube videos for learning more about the topic.
    Returns: { videos: [...], engine: "gemini" | "groq" }
    """
    prompt = _build_youtube_prompt(text)
    
    # Try Gemini first
    result = await _call_gemini(prompt)
    if result:
        return {"videos": result, "engine": "gemini"}
    
    # Fallback to Groq
    result = await _call_groq(prompt)
    if result:
        return {"videos": result, "engine": "groq"}
    
    return {"videos": [], "engine": "failed", "error": "All engines failed"}


def _build_youtube_prompt(text: str) -> str:
    """Build the prompt for YouTube suggestions."""
    return f"""You are a learning advisor. Recommend 3-4 educational YouTube videos that would help students learn more about the topics in this text.

RULES:
1. Recommend 3-4 videos (not more).
2. Each video should be from a well-known educational channel (e.g., Khan Academy, Coursera, YouTube EDU, professor channels).
3. Include a clear title that matches what students would search for.
4. Include a brief description of what the video covers.
5. Provide the exact YouTube search URL they should use to find the video.
6. Prioritize videos that cover the main topics and key concepts in the text.
7. Include videos at different depths if possible (introductory, conceptual, advanced).

Return ONLY a JSON object with this structure:
{{
  "videos": [
    {{
      "title": "Video Title",
      "description": "Brief description of what the video covers",
      "search_query": "Exact search query",
      "youtube_url": "https://www.youtube.com/results?search_query=exact+search+query"
    }},
    ...
  ]
}}

TEXT:
{text}

RECOMMENDATIONS (JSON only):"""


async def _call_gemini(prompt: str) -> list | None:
    """Call Gemini API. Returns list of video recommendation objects or None on failure."""
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
                        "maxOutputTokens": 4096,
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
            if result and "videos" in result:
                return result.get("videos", [])
            return None
    except Exception:
        return None


async def _call_groq(prompt: str) -> list | None:
    """Call Groq API as fallback. Returns list of video recommendation objects or None on failure."""
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
                    "max_tokens": 1024,
                },
            )
            response.raise_for_status()
            data = response.json()
            
            if not data.get("choices"):
                return None
            
            text = data["choices"][0]["message"]["content"]
            # Parse JSON from response
            result = extract_json(text)
            if result and "videos" in result:
                return result.get("videos", [])
            return None
    except Exception:
        return None
