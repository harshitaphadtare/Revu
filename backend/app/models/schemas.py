from pydantic import BaseModel, HttpUrl, Field
from pydantic import field_validator
from pydantic import AliasChoices
from typing import List, Optional
from datetime import date, datetime

class ReviewRequest(BaseModel):
    url : HttpUrl = Field(...,description="Product URL to fetch reviews from")

class SingleReview(BaseModel):
    review_text: str = Field(...,description="Text content of the review")
    rating: Optional[float] = Field(None,ge=1,le=5,description="Product rating from 1-5")
    review_date: Optional[date] = Field(None,description="Date when the review was posted")

    # Accept a wide range of incoming date formats (including raw strings like
    # "Reviewed in India on 29 October 2025") and coerce to date. If parsing
    # fails, we silently return None so the endpoint is forgiving.
    @field_validator("review_date", mode="before")
    @classmethod
    def _coerce_review_date(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, date) and not isinstance(v, datetime):
            return v
        if isinstance(v, datetime):
            return v.date()
        if isinstance(v, (int, float)):
            # Treat numeric timestamps as seconds since epoch
            try:
                return datetime.fromtimestamp(float(v)).date()
            except Exception:
                return None
        if isinstance(v, str):
            s = v.strip()
            if not s:
                return None
            try:
                from dateutil import parser  # python-dateutil
                dt = parser.parse(s, fuzzy=True, dayfirst=False)
                return dt.date()
            except Exception:
                # Best-effort fallback: try to extract a pattern like "29 October 2025"
                import re
                m = re.search(r"(\d{1,2}\s+[A-Za-z]+\s+\d{4})", s)
                if m:
                    try:
                        from dateutil import parser
                        dt = parser.parse(m.group(1), fuzzy=True)
                        return dt.date()
                    except Exception:
                        return None
                return None
        # Unknown type -> drop
        return None

class AnalyzeRequest(BaseModel):
    # Accept both {"reviews": [...]} and {"result": [...]} payloads from callers
    reviews: List[SingleReview] = Field(
        ..., description="List of reviews to be analyzed",
        validation_alias=AliasChoices("reviews", "result"),
    )

class ReviewResponse(BaseModel):
    sentiment: Optional[str] = Field(None,description="Sentiment of the review: positive, negative, neutral")
    score: Optional[float] = Field(None,ge=0,le=1,description="Confidence score of sentiment prediction")


class ProductMeta(BaseModel):
    name: Optional[str] = Field(None, description="Clean product name (brand + model)")
    price: Optional[str] = Field(None, description="Raw price string as shown on the page, including currency symbol")
    price_value: Optional[float] = Field(None, description="Numeric price value when parsable")
    currency: Optional[str] = Field(None, description="Currency symbol or code when detected")


class ScrapeResult(BaseModel):
    product: Optional[ProductMeta] = Field(None, description="Product metadata including name and price")
    reviews: List[SingleReview] = Field(default_factory=list, description="List of scraped reviews")
    count: int = Field(0, description="Number of reviews returned")