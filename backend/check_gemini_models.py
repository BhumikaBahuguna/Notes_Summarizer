"""
Script to check all available Gemini AI models and their rate limits / quota info.
Reads GEMINI_API_KEY from the .env file in this directory.
"""

import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load API key from .env
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("ERROR: GEMINI_API_KEY not found in .env")
    exit(1)

genai.configure(api_key=api_key)

print("=" * 80)
print("GEMINI MODELS AVAILABLE FOR YOUR API KEY")
print("=" * 80)

models = list(genai.list_models())

if not models:
    print("\nNo models found. Your API key may be invalid or exhausted.")
else:
    for i, model in enumerate(models, 1):
        print(f"\n{'─' * 80}")
        print(f"  [{i}] {model.name}")
        print(f"      Display Name   : {model.display_name}")
        print(f"      Description    : {model.description[:120]}..." if len(model.description) > 120 else f"      Description    : {model.description}")
        print(f"      Supported Methods: {', '.join(model.supported_generation_methods)}")
        print(f"      Input Token Limit : {getattr(model, 'input_token_limit', 'N/A')}")
        print(f"      Output Token Limit: {getattr(model, 'output_token_limit', 'N/A')}")

    print(f"\n{'─' * 80}")
    print(f"\nTotal models available: {len(models)}")

# --- Test actual generation to check if credits/quota are exhausted ---
print("\n" + "=" * 80)
print("TESTING QUOTA / CREDITS (attempting a tiny generation with gemini-2.0-flash)")
print("=" * 80)

try:
    test_model = genai.GenerativeModel("gemini-2.0-flash")
    response = test_model.generate_content("Say hi in one word.")
    print(f"\n  Status : OK - Model responded successfully!")
    print(f"  Response: {response.text.strip()}")
    print(f"\n  Your API key is ACTIVE and has available quota.")
except Exception as e:
    error_msg = str(e)
    print(f"\n  Status : FAILED")
    print(f"  Error  : {error_msg}")
    if "429" in error_msg or "quota" in error_msg.lower() or "exhausted" in error_msg.lower():
        print(f"\n  >>> Your Gemini API quota/credits appear to be EXHAUSTED. <<<")
    elif "403" in error_msg or "permission" in error_msg.lower():
        print(f"\n  >>> Your API key may be INVALID or DISABLED. <<<")
    else:
        print(f"\n  >>> Unexpected error. Check the message above. <<<")

print()
