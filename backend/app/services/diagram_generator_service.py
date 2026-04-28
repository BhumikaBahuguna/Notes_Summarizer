"""
Diagrammatic Representation Service
Converts text content into Mermaid diagram code for visualization.
"""

import os
import json
import re
import httpx
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")


SUPPORTED_PREFIXES = (
    "graph",
    "flowchart",
    "mindmap",
    "classDiagram",
    "sequenceDiagram",
)


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
    except (json.JSONDecodeError, ValueError):
        pass
    
    # Try to find JSON object in the text
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        try:
            return json.loads(match.group(0))
        except (json.JSONDecodeError, ValueError):
            pass
    
    return None


async def generate_diagram(text: str) -> dict:
    """
    Generate a Mermaid diagram representation of the text content.
    Returns: { diagram_type: str, code: str, engine: "gemini" | "groq" }
    """
    prompt = _build_diagram_prompt(text)
    
    # Try Gemini first
    result = await _call_gemini(prompt)
    if result:
        normalized = _coerce_diagram_payload(result, text)
        return {
            "diagram_type": normalized.get("type", "graph"),
            "code": normalized.get("code", ""),
            "description": normalized.get("description", ""),
            "engine": "gemini"
        }
    
    # Fallback to Groq
    result = await _call_groq(prompt)
    if result:
        normalized = _coerce_diagram_payload(result, text)
        return {
            "diagram_type": normalized.get("type", "graph"),
            "code": normalized.get("code", ""),
            "description": normalized.get("description", ""),
            "engine": "groq"
        }
    
    return {
        "diagram_type": "error",
        "code": _build_fallback_mermaid(text),
        "description": "Fallback diagram generated because model output was unavailable.",
        "engine": "failed",
        "error": "All engines failed"
    }


def _coerce_diagram_payload(result: dict, source_text: str) -> dict:
    """Normalize model output into consistently valid Mermaid payload."""
    raw_type = str(result.get("type", "graph")).strip()
    diagram_type = "mindmap" if raw_type.lower() in {"mind map", "mindmap"} else raw_type

    code = _normalize_mermaid_code(str(result.get("code", "")))
    if not code:
        code = _build_fallback_mermaid(source_text)

    description = str(result.get("description", "")).strip() or "Concept map generated from extracted notes."

    return {
        "type": diagram_type,
        "code": code,
        "description": description,
    }


def _normalize_mermaid_code(code: str) -> str:
    """Clean common LLM formatting issues and enforce a valid Mermaid start."""
    if not code:
        return ""

    cleaned = code.strip()

    # Remove markdown fences if present
    cleaned = re.sub(r"^```(?:mermaid)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    # Convert escaped newlines emitted by some models
    cleaned = cleaned.replace("\\r\\n", "\n").replace("\\n", "\n")

    # Remove accidental leading keyword line
    cleaned = re.sub(r"^mermaid\s*\n", "", cleaned, flags=re.IGNORECASE)

    # Mermaid expects mindmap, not mind map
    cleaned = re.sub(r"^mind\s+map", "mindmap", cleaned, flags=re.IGNORECASE)

    # Fix invalid Mermaid arrow syntax: |> should be just |
    cleaned = re.sub(r"\|\s*>", "|", cleaned)
    
    # Remove semicolons if lines are separated by semicolons (convert to newlines)
    if ";" in cleaned and "\n" not in cleaned:
        cleaned = cleaned.replace(";", "\n")

    # Normalize smart quotes that can break labels
    cleaned = cleaned.replace("\u201c", '"').replace("\u201d", '"').replace("\u2018", "'").replace("\u2019", "'")

    first_line = cleaned.splitlines()[0].strip() if cleaned.splitlines() else ""
    SUPPORTED_PREFIXES = (
        "graph", "flowchart", "sequenceDiagram", "classDiagram",
        "stateDiagram", "erDiagram", "gantt", "pie", "journey", "mindmap", "timeline"
    )
    if not first_line.startswith(SUPPORTED_PREFIXES):
        return ""

    return cleaned.strip()


def _build_fallback_mermaid(text: str) -> str:
    """Build a simple, always-valid fallback flowchart from source text."""
    tokens = re.findall(r"[A-Za-z][A-Za-z0-9\-]{2,}", text)
    unique = []
    for token in tokens:
        lower = token.lower()
        if lower not in {t.lower() for t in unique}:
            unique.append(token)
        if len(unique) == 4:
            break

    labels = unique if unique else ["Topic", "Concept", "Details", "Examples"]
    while len(labels) < 4:
        labels.append(f"Point {len(labels) + 1}")

    return (
        "graph TD\n"
        f"  A[{labels[0]}] --> B[{labels[1]}]\n"
        f"  A --> C[{labels[2]}]\n"
        f"  C --> D[{labels[3]}]"
    )


def _build_diagram_prompt(text: str) -> str:
    """Build the prompt for diagram generation."""
    return f"""You are a visual learning expert. Create a Mermaid diagram that represents the main concepts and relationships in the following text.

MERMAID DIAGRAM GUIDELINES:
1. Choose the best diagram type based on content:
   - graph TD (top-down flowchart): For processes, hierarchies, decision trees
    - mindmap: For concept maps with main idea and branches
   - classDiagram: For systems with components and relationships
   - sequenceDiagram: For processes with steps
   
2. Include the main concepts and their relationships.
3. Use clear, concise labels.
4. Use arrows to show relationships/flow.
5. Group related concepts.
6. Keep it readable and not too cluttered.

RULES:
- Mermaid syntax must be valid and properly formatted.
- Start with diagram declaration (e.g., "graph TD" or "mindmap")
- Use proper Mermaid syntax for connections and formatting.
- Keep text labels short but descriptive.
- For graph TD: use --> or ---|label|--> for connections
- For mind map: use proper indentation
- Include all main topics and key relationships from the text.

Return ONLY a JSON object with this structure:
{{
    "type": "graph|mindmap|classDiagram|sequenceDiagram",
  "code": "Full valid Mermaid diagram code starting with diagram type declaration",
  "description": "What this diagram represents"
}}

Important:
- The "code" field should contain COMPLETE, VALID Mermaid syntax
- Do NOT use markdown code blocks - just the raw Mermaid code
- Do NOT include ```mermaid or ``` anywhere
- Start directly with the diagram declaration like "graph TD" or "mindmap"

TEXT:
{text}

DIAGRAM (JSON only):"""


async def _call_gemini(prompt: str) -> dict | None:
    """Call Gemini API. Returns diagram object or None on failure."""
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
            if result:
                return result
            return None
    except Exception as e:
        print(f"    ⚠️  Gemini API call failed: {e}")
        return None


async def _call_groq(prompt: str) -> dict | None:
    """Call Groq API as fallback. Returns diagram object or None on failure."""
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
            if result:
                return result
            return None
    except Exception as e:
        print(f"    ⚠️  Groq API call failed: {e}")
        return None
