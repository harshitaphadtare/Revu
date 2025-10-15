from fastapi import APIRouter,HTTPException
from app.models.schemas import ReviewRequest
from app.services.scraper import scrape_reviews

router = APIRouter(prefix="/fetch_reviews",tags=["Fetch Reviews"])

@router.post("/")
def fetch_reviews(payload: ReviewRequest):
    url = payload.url
    try:
        reviews = scrape_reviews(url)
        return {"reviews": reviews}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching reviews: {e}")