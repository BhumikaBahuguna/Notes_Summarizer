import os
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential
import cv2
import numpy as np
from dotenv import load_dotenv
load_dotenv()
def add_padding(image_path):
    img = cv2.imread(image_path)

    if img is None:
        return image_path  # fallback safety

    h, w = img.shape[:2]

    padding = int(h * 0.15)

    padded = cv2.copyMakeBorder(
        img,
        padding,
        padding,
        padding,
        padding,
        cv2.BORDER_CONSTANT,
        value=[255, 255, 255]
    )

    padded_path = image_path + "_padded.jpg"
    cv2.imwrite(padded_path, padded)

    return padded_path

AZURE_ENDPOINT = os.getenv("AZURE_ENDPOINT")
AZURE_KEY = os.getenv("AZURE_KEY")
print("Azure endpoint loaded:", AZURE_ENDPOINT)
client = DocumentAnalysisClient(
    endpoint=AZURE_ENDPOINT,
    credential=AzureKeyCredential(AZURE_KEY)
)

def extract_text_azure(file_path):
    file_path = add_padding(file_path)
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
