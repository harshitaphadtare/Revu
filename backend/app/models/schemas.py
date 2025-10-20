from pydantic import BaseModel, HttpUrl, Field
from typing import List, Optional
from datetime import date

class ReviewRequest(BaseModel):
    url : HttpUrl = Field(...,description="Product URL to fetch reviews from")

class SingleReview(BaseModel):
    review_text: str = Field(...,description="Text content of the review")
    rating: Optional[float] = Field(None,ge=1,le=5,description="Product rating from 1-5")
    review_date: Optional[date] = Field(None,description="Date when the review was posted")

class AnalyzeRequest(BaseModel):
    reviews: List[SingleReview] = Field(...,description="List of reviews to be analyzed")

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