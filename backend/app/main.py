from fastapi import FastAPI
from app.routes import fetch_reviews,analyze

app = FastAPI(title="Revu API")

app.include_router(fetch_reviews.router)
app.include_router(analyze.router)