from dotenv import load_dotenv
import os

load_dotenv()

class Settings:
    app_name = os.getenv("APP_NAME")
    debug = os.getenv("DEBUG")
    upload_dir = os.getenv("UPLOAD_DIR")
    output_dir = os.getenv("OUTPUT_DIR")

settings = Settings()
