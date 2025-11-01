from fastapi import APIRouter
from app.models.schemas import (
    AnalyzeRequest, 
    SingleReview, 
    ReviewResponse, 
    AnalyzeResponse,
    SentimentCounts,
    TrendDataPoint
)
from app.services import sentiment,topic_extractor,preprocessing,summarizer

router = APIRouter(prefix="/analyze",tags=["Analysis"])

@router.post("/", response_model=AnalyzeResponse)
def analyze_reviews(payload: AnalyzeRequest):
    # 1. Clean text
    reviews = [r.model_dump() for r in payload.reviews]
    for r in reviews:
        r["clean_text"] = preprocessing.clean_text(r["review_text"])

    # 2. Sentiment Analysis
    sentiments = sentiment.analyze_sentiment(reviews)
    #seperating positive and negative reviews
    positive_texts = [r['clean_text'] for r in sentiments if 'positive' in r['sentiment'].lower()]
    negative_texts = [r['clean_text'] for r in sentiments if 'negative' in r['sentiment'].lower()]

    # 3. Topic Extraction
    positive_themes = topic_extractor.extract_keywords(positive_texts)
    negative_themes = topic_extractor.extract_keywords(negative_texts)

    # 4.Summary (both short and descriptive)
    all_clean_texts = [r['clean_text'] for r in sentiments]
    summary_short = summarizer.generate_summary(all_clean_texts, mode="short")
    summary = summarizer.generate_summary(all_clean_texts, mode="descriptive")

    # 5. Trend data 
    trend_data = []
    for r in sentiments:
        if r.get("review_date"):
            trend_data.append(TrendDataPoint(
                date=r['review_date'],
                positive=1 if r['sentiment'].lower() == 'positive' else 0,
                negative=1 if r['sentiment'].lower() == 'negative' else 0
            ))

    return AnalyzeResponse(
        total_reviews=len(reviews),
        sentiment_counts=SentimentCounts(
            positive=len(positive_texts),
            negative=len(negative_texts),
            neutral=len(reviews) - len(positive_texts) - len(negative_texts)
        ),
        top_positive_themes=positive_themes,
        top_negative_themes=negative_themes,
        trend_data=trend_data,
        reviews=sentiments,
        summary=summary,
        summary_short=summary_short
    )
