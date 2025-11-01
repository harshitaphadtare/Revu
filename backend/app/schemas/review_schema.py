from __future__ import annotations
from pydantic import BaseModel, Field, HttpUrl
from pydantic import AliasChoices
from typing import List, Optional, Dict, Any
from datetime import date

# Reuse existing SingleReview model (with tolerant date parsing)
from app.models.schemas import SingleReview


class ReviewItem(SingleReview):
    """A review item enriched with analysis fields (optional)."""
    sentiment: Optional[str] = Field(None, description="Predicted sentiment label")
    score: Optional[float] = Field(None, ge=0, le=1, description="Confidence score 0..1")
    clean_text: Optional[str] = Field(None, description="Preprocessed review text")


class ProductInfo(BaseModel):
    asin: Optional[str] = None
    source: Optional[str] = None
    actor: Optional[str] = None
    name: Optional[str] = None  # Truncated name stored by worker
    countReviews: Optional[int] = None


class ReviewsSaveRequest(BaseModel):
    """Schema for persisting raw scraped reviews (without analysis)."""
    # Primary key (_id) stored in Mongo; accept either id or _id from callers
    id: str | None = Field(
        default=None,
        description="Primary key; serialized as _id for Mongo",
        serialization_alias="_id",
        validation_alias=AliasChoices("_id", "id"),
    )
    job_id: str = Field(..., description="Scrape job id")
    user_id: str | None = Field(None, description="Foreign key to users collection")
    # URL may be absent on server-side persistence; make optional
    url: Optional[HttpUrl] = Field(None, description="Original product URL")
    product: ProductInfo = Field(default_factory=ProductInfo)
    reviews: List[SingleReview] = Field(default_factory=list)
    count: int = Field(0, description="Number of reviews scraped")


class SentimentCounts(BaseModel):
    positive: int = 0
    negative: int = 0
    neutral: int = 0


class TrendPoint(BaseModel):
    date: Optional[date] = None
    positive: int = 0
    negative: int = 0


class AnalysisPayload(BaseModel):
    total_reviews: int = 0
    sentiment_counts: SentimentCounts = Field(default_factory=SentimentCounts)
    top_positive_themes: List[Any] = Field(default_factory=list)
    top_negative_themes: List[Any] = Field(default_factory=list)
    trend_data: List[TrendPoint] = Field(default_factory=list)
    reviews: List[ReviewItem] = Field(default_factory=list)
    summary: Optional[str] = None
    summary_short: Optional[str] = None


class AnalysisSaveRequest(BaseModel):
    """Schema for persisting analyzed reviews and aggregate analysis."""
    # Primary key (_id) stored in Mongo; accept either id or _id
    id: str | None = Field(
        default=None,
        description="Primary key; serialized as _id for Mongo",
        serialization_alias="_id",
        validation_alias=AliasChoices("_id", "id"),
    )
    job_id: str = Field(..., description="Scrape job id")
    user_id: str | None = Field(None, description="Foreign key to users collection")
    url: Optional[HttpUrl] = None
    product: ProductInfo = Field(default_factory=ProductInfo)
    reviews: List[ReviewItem] = Field(default_factory=list)
    analysis: AnalysisPayload = Field(default_factory=AnalysisPayload)
