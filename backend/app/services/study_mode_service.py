"""
Study Mode Service
Handles all AI-powered features for Quick Revision, Deep Study, and Exam Preparation modes.
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
    """Extract JSON from text, handling markdown wrappers."""
    if not text:
        return None
    match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except Exception:
            pass
    try:
        return json.loads(text.strip())
    except Exception:
        pass
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass
    return None


# ──────────────────────────────────────────────
# Prompt builders per feature
# ──────────────────────────────────────────────

PROMPTS: dict[str, str] = {}

# ── Quick Revision ──

PROMPTS["ultra-summary"] = """You are a study assistant. Create an ultra-brief revision summary.

RULES:
1. Summarize the text in 5-7 bullet points — only the most important ideas.
2. Each bullet must be 1 sentence max.
3. Estimate how long it would take to revise this content.

Return ONLY JSON:
{{
  "summary": "A 2-3 sentence overview",
  "bullets": [
    {{ "section": "Key Ideas", "bullets": ["point 1", "point 2", ...] }}
  ],
  "estimated_time": "5 minutes"
}}

TEXT:
{text}"""

PROMPTS["key-concepts"] = """Extract the most important terms and keywords from the following text.

Return ONLY JSON:
{{
  "concepts": [
    {{ "term": "Term Name", "definition": "Brief 1-line definition" }},
    ...
  ]
}}

TEXT:
{text}"""

PROMPTS["concept-tree"] = """Create a hierarchical concept tree / topic map from the text below.
The diagram should be a Mermaid mindmap or graph TD showing topic hierarchy.

Return ONLY JSON:
{{
  "diagram_type": "mindmap",
  "code": "mindmap\\n  root((Main Topic))\\n    Branch1\\n      Sub1\\n    Branch2",
  "description": "Topic hierarchy of the content"
}}

TEXT:
{text}"""

PROMPTS["mini-quiz"] = """Generate exactly 3 quick MCQ questions from the text.

Return ONLY JSON:
{{
  "quiz": [
    {{
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_answer": "A",
      "explanation": "Brief reason",
      "topic": "Topic tested"
    }}
  ]
}}

TEXT:
{text}"""

PROMPTS["revision-time"] = """Estimate how long it would take a student to revise this content.
Break it down by activity.

Return ONLY JSON:
{{
  "estimated_time": "15 minutes",
  "breakdown": [
    {{ "activity": "Read through key concepts", "time": "5 min" }},
    {{ "activity": "Review definitions", "time": "3 min" }},
    {{ "activity": "Practice quiz", "time": "4 min" }},
    {{ "activity": "Final review", "time": "3 min" }}
  ],
  "tip": "Focus on highlighted definitions for maximum retention"
}}

TEXT:
{text}"""

PROMPTS["definitions"] = """Extract the most important definitions from the text.

Return ONLY JSON:
{{
  "definitions": [
    {{ "term": "Term", "definition": "Clear definition" }},
    ...
  ]
}}

TEXT:
{text}"""

# ── Deep Study ──

PROMPTS["detailed-summary"] = """Create a detailed, well-structured summary of the following text.
Include:
- Clear definitions of key terms
- Explanations of concepts
- Examples where helpful
- Applications of the topics

Return ONLY JSON:
{{
  "summary": "Full detailed summary text with paragraphs, definitions, explanations, and examples.",
  "bullets": [
    {{ "section": "Section Name", "bullets": ["detailed point 1", "detailed point 2", ...] }}
  ]
}}

TEXT:
{text}"""

PROMPTS["flashcards"] = """Create flashcards from the text for memorization.
Each flashcard has a question on the front and answer on the back.
Generate 8-12 flashcards covering the most important concepts.

Return ONLY JSON:
{{
  "flashcards": [
    {{ "front": "Question or concept", "back": "Answer or explanation" }},
    ...
  ]
}}

TEXT:
{text}"""

PROMPTS["concept-map"] = """Create a concept map showing relationships between key concepts in the text.
Use Mermaid graph TD (top-down) format to show connections.

Return ONLY JSON:
{{
  "diagram_type": "graph",
  "code": "graph TD\\n  A[Concept 1] --> B[Concept 2]\\n  A --> C[Concept 3]\\n  B --> D[Related Idea]",
  "description": "Concept relationship map"
}}

TEXT:
{text}"""

PROMPTS["related-topics"] = """Based on the following text, suggest 5-7 related topics the student should study next.
Explain why each topic is related.

Return ONLY JSON:
{{
  "topics": [
    {{ "title": "Topic Name", "description": "Brief description", "why": "Why it's related" }},
    ...
  ]
}}

TEXT:
{text}"""

PROMPTS["examples"] = """Generate practical, real-world examples for the difficult concepts in the text.

Return ONLY JSON:
{{
  "examples": [
    {{ "concept": "Concept Name", "example": "Detailed practical example" }},
    ...
  ]
}}

TEXT:
{text}"""

# ── Exam Preparation ──

PROMPTS["expected-questions"] = """Generate theoretical questions likely to appear in an exam based on this text.
Include a mix of short answer, explain, compare, and application questions.

Return ONLY JSON:
{{
  "questions": [
    {{ "question": "...", "answer": "Model answer", "type": "definition|explain|compare|application" }},
    ...
  ]
}}

TEXT:
{text}"""

PROMPTS["high-prob-questions"] = """Generate exam questions that have a HIGH probability of appearing in exams.
Mark each with importance level.

Return ONLY JSON:
{{
  "questions": [
    {{ "question": "...", "answer": "Model answer", "importance": "Very High|High|Medium" }},
    ...
  ]
}}

TEXT:
{text}"""

PROMPTS["three-level-quiz"] = """Generate a 3-level quiz system.
- Beginner: 5 easy MCQs based on brief understanding
- Intermediate: 5 medium MCQs requiring concept differentiation
- Advanced: 5 hard MCQs requiring deep analysis

Return ONLY JSON:
{{
  "levels": [
    {{
      "level": "beginner",
      "label": "Beginner",
      "questions": [
        {{
          "question": "...",
          "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
          "correct_answer": "A",
          "explanation": "...",
          "topic": "..."
        }}
      ]
    }},
    {{
      "level": "intermediate",
      "label": "Intermediate",
      "questions": [...]
    }},
    {{
      "level": "full_prepared",
      "label": "Advanced",
      "questions": [...]
    }}
  ]
}}

TEXT:
{text}"""

PROMPTS["weak-topics"] = """Generate 5 MCQ questions designed to test understanding across all topics in the text.
Tag each question with its topic so weak areas can be identified.

Return ONLY JSON:
{{
  "quiz": [
    {{
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_answer": "A",
      "explanation": "...",
      "topic": "Topic being tested"
    }}
  ]
}}

TEXT:
{text}"""

PROMPTS["last-minute"] = """Create a compressed last-minute revision sheet for exams.
Include only the most essential facts, formulas, definitions, and key points.
Keep it as concise as possible — this is for 5-minute pre-exam revision.

Return ONLY JSON:
{{
  "sheet": "Compressed summary text",
  "bullets": [
    {{ "section": "Section", "bullets": ["crucial point 1", "crucial point 2"] }}
  ]
}}

TEXT:
{text}"""

PROMPTS["formulas"] = """Extract all important formulas, equations, key definitions, and numerical facts from the text.
If there are no formulas, extract the most important factual statements and definitions instead.

Return ONLY JSON:
{{
  "formulas": [
    {{ "name": "Name or label", "formula": "The formula or key fact", "definition": "Brief explanation" }},
    ...
  ]
}}

TEXT:
{text}"""

AI_TUTOR_PROMPT = """You are a friendly AI Tutor. The student has uploaded notes on a topic.
Based on the notes below, answer the student's question clearly and helpfully.
If they ask to simplify, use simple language and analogies.
If they ask for examples, provide concrete practical examples.

STUDENT'S NOTES:
{text}

STUDENT'S QUESTION:
{question}

Provide a clear, helpful response. Do NOT return JSON — just plain text."""


# ──────────────────────────────────────────────
# Core API callers
# ──────────────────────────────────────────────

async def _call_gemini(prompt: str) -> str | None:
    if not GEMINI_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
                params={"key": GEMINI_API_KEY},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.3, "maxOutputTokens": 8192},
                },
            )
            response.raise_for_status()
            data = response.json()
            if not data.get("candidates"):
                return None
            return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        return None


async def _call_groq(prompt: str) -> str | None:
    if not GROQ_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 8192,
                },
            )
            response.raise_for_status()
            data = response.json()
            if not data.get("choices"):
                return None
            return data["choices"][0]["message"]["content"]
    except Exception:
        return None


# ──────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────

# Features that reuse existing services (cheat-sheet, diagram, youtube)
DELEGATE_FEATURES = {"cheat-sheet", "diagram", "youtube"}


async def generate_study_feature(mode: str, feature_id: str, text: str) -> dict:
    """Generate any study mode feature. Returns the parsed result dict."""

    # Delegate to existing services
    if feature_id == "cheat-sheet":
        from app.services.cheat_sheet_service import generate_cheat_sheet
        return await generate_cheat_sheet(text)

    if feature_id == "diagram":
        from app.services.diagram_generator_service import generate_diagram
        return await generate_diagram(text)

    if feature_id == "youtube":
        from app.services.youtube_suggestions_service import generate_youtube_suggestions
        return await generate_youtube_suggestions(text)

    # Build prompt
    prompt_template = PROMPTS.get(feature_id)
    if not prompt_template:
        return {"error": f"Unknown feature: {feature_id}", "engine": "failed"}

    prompt = prompt_template.format(text=text)

    # Try Gemini then Groq
    raw = await _call_gemini(prompt)
    engine = "gemini"
    if not raw:
        raw = await _call_groq(prompt)
        engine = "groq"
    if not raw:
        return {"error": "All AI engines failed to generate content.", "engine": "failed"}

    parsed = extract_json(raw)
    if not parsed:
        return {"error": "Failed to parse AI response.", "engine": "failed"}

    # For three-level-quiz, set first level as active
    if feature_id == "three-level-quiz" and "levels" in parsed:
        levels = parsed["levels"]
        if levels:
            parsed["quiz"] = levels[0].get("questions", [])
            parsed["_activeLevel"] = levels[0].get("level", "beginner")

    parsed["engine"] = engine
    return parsed


async def generate_ai_tutor_response(text: str, question: str) -> dict:
    """Handle AI Tutor conversation."""
    prompt = AI_TUTOR_PROMPT.format(text=text, question=question)

    raw = await _call_gemini(prompt)
    engine = "gemini"
    if not raw:
        raw = await _call_groq(prompt)
        engine = "groq"
    if not raw:
        return {"response": "Sorry, I wasn't able to generate a response. Please try again.", "engine": "failed"}

    return {"response": raw.strip(), "engine": engine}
