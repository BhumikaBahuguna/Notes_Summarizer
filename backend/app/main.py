from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.upload import router as upload_router
from app.api.features import router as features_router
from app.api.study_mode import router as study_mode_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router)
app.include_router(features_router)
app.include_router(study_mode_router)


@app.get("/")
def root():
    return {"message": "API running"}

