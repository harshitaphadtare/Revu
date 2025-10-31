from pydantic import BaseModel, HttpUrl, Field
from typing import List, Optional
from datetime import date as Date

class ReviewRequest(BaseModel):
    url : HttpUrl = Field(...,description="Product URL to fetch reviews from")

class SingleReview(BaseModel):
    review_text: str = Field(...,description="Text content of the review")
    rating: Optional[float] = Field(None,ge=1,le=5,description="Product rating from 1-5")
    review_date: Optional[Date] = Field(None,description="Date when the review was posted")

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

class StartScrapeResponse(BaseModel):
    job_id: str = Field(..., description="Unique identifier for the scraping job")

class ScrapeStatusResponse(BaseModel):
    job_id: str = Field(..., description="Job identifier")
    state: str = Field(..., description="Current state of the job (PENDING, PROGRESS, SUCCESS, FAILURE, REVOKED)")
    progress: int = Field(..., description="Progress percentage (0-100)")
    result: Optional[List[SingleReview]] = Field(None, description="List of scraped reviews if completed")
    count: Optional[int] = Field(None, description="Number of reviews if completed")
    product: Optional[ProductMeta] = Field(None, description="Product metadata if completed")
    error: Optional[str] = Field(None, description="Error message if failed")

class CancelScrapeResponse(BaseModel):
    job_id: str = Field(..., description="Job identifier")
    cancel_requested: bool = Field(..., description="Whether cancellation was successfully requested")

class ScrapeLockStatusResponse(BaseModel):
    locked: bool = Field(..., description="Whether the scraping lock is currently held")
    owner_job_id: Optional[str] = Field(None, description="Job ID that currently holds the lock")
    ttl: Optional[int] = Field(None, description="Time to live for the lock in seconds")

class SentimentCounts(BaseModel):
    positive: int = Field(..., description="Number of positive reviews")
    negative: int = Field(..., description="Number of negative reviews")
    neutral: int = Field(..., description="Number of neutral reviews")

class TrendDataPoint(BaseModel):
    date: Date = Field(..., description="Date of the review")
    positive: int = Field(..., description="1 if positive, 0 otherwise")
    negative: int = Field(..., description="1 if negative, 0 otherwise")

class AnalyzeResponse(BaseModel):
    total_reviews: int = Field(..., description="Total number of reviews analyzed")
    sentiment_counts: SentimentCounts = Field(..., description="Count of reviews by sentiment")
    top_positive_themes: List[str] = Field(..., description="Top positive keywords/themes")
    top_negative_themes: List[str] = Field(..., description="Top negative keywords/themes")
    trend_data: List[TrendDataPoint] = Field(..., description="Sentiment trend data over time")
    reviews: List[dict] = Field(..., description="List of reviews with sentiment analysis")
    summary: str = Field(..., description="Descriptive summary of all reviews")
    summary_short: str = Field(..., description="Short summary of all reviews")