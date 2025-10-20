from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import analyze, fetch_review_job

app = FastAPI(
    title="Revu API",
    description="Backend for product review analysis — scraping, sentiment, topics",
    version="1.0.0")

app.include_router(analyze.router)
app.include_router(fetch_review_job.router)

@app.get("/")
def home():
    return {"message": "Revu API is running smoothly."}


# CORS (adjust origins as needed for your frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

    