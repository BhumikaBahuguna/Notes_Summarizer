import asyncio
from app.services.summarize_pipeline import summarize_text

async def main():
    text = "Functional requirements describe what the system does. Non-functional requirements describe constraints."
    res = await summarize_text(text, "brief")
    print("RESULT:", res)

if __name__ == "__main__":
    asyncio.run(main())
