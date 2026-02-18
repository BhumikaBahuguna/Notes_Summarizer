import os
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv
load_dotenv()
AZURE_ENDPOINT = os.getenv("AZURE_ENDPOINT")
AZURE_KEY = os.getenv("AZURE_KEY")
print("Azure endpoint loaded:", AZURE_ENDPOINT)
client = DocumentAnalysisClient(
    endpoint=AZURE_ENDPOINT,
    credential=AzureKeyCredential(AZURE_KEY)
)

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

    return text
