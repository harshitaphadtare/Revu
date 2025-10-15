from fastapi import APIRouter,HTTPException
from app.models.schemas import ReviewRequest
from app.services.scraper import scrape_reviews

router = APIRouter(prefix="/fetch_reviews",tags=["Fetch Reviews"])

def clean_url(url: str) -> str:
    """
    Clean and validate the provided Amazon product URL.
    Args:
        url (str): The input URL.  
    Returns:
        str: Cleaned URL if valid, else raises ValueError.
    """
    if "amazon" in url:
        parts = url.split("/dp/")
        if len(parts) > 1:
            asin_part = parts[1].split("/")[0]
            return f"https://www.amazon.in/dp/{asin_part}"
    return url

@router.post("/")
def fetch_reviews(payload: ReviewRequest):
    url = clean_url(payload.url)
    try:
        reviews = scrape_reviews(url,max_pages=2)
        return {"reviews": [r.model_dump() for r in reviews]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching reviews: {e}")