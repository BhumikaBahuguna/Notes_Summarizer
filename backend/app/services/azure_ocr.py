import os
from dotenv import load_dotenv
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential

load_dotenv()

endpoint = os.getenv("AZURE_ENDPOINT")
key = os.getenv("AZURE_KEY")

client = DocumentAnalysisClient(endpoint, AzureKeyCredential(key))

def extract_text_azure(file_path):
    with open(file_path, "rb") as f:
        poller = client.begin_analyze_document(
            "prebuilt-read",
            document=f
        )
        result = poller.result()

    text = ""
    for page in result.pages:
        for line in page.lines:
            text += line.content + "\n"

    return text.strip()
