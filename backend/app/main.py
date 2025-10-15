from fastapi import FastAPI
from app.routes import fetch_reviews,analyze

app = FastAPI(
    title="Revu API",
    description="Backend for product review analysis — scraping, sentiment, topics",
    version="1.0.0")

app.include_router(fetch_reviews.router)
app.include_router(analyze.router)

@app.get("/")
def home():
    return {"message": "Revu API is running smoothly."}