from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import analyze, fetch_review_job, auth
from .db.mongodb import init_db
import logging

app = FastAPI(
    title="Revu API",
    description="Backend for product review analysis — scraping, sentiment, topics",
    version="1.0.0")

app.include_router(analyze.router)
app.include_router(fetch_review_job.router)
app.include_router(auth.router)

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

@app.on_event("startup")
async def on_startup():
    # Ensure DB indexes are created, but don't block API if DB is unreachable.
    try:
        await init_db()
    except Exception as exc:
        # Log and continue so scraping endpoints (Redis/Celery) still work.
        logging.getLogger("uvicorn.error").warning(
            "MongoDB init failed on startup: %s. Continuing without DB indexes.", exc
        )

    