"""Sentiment analysis service with lazy ML and safe fallbacks.

Contract:
- Input: list[dict] where each item has at least a 'clean_text' key, optionally 'rating'.
- Output: same list length, each dict augmented with:
  - 'sentiment': one of 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  - 'score': float in [0, 1]
Error handling:
- No heavy imports at module import time.
- If transformers/tensorflow are unavailable or model load fails, a lightweight
  rule-based fallback is used (rating- and lexicon-based).
"""

from typing import List, Dict, Optional

_pipe = None  # cached transformers pipeline
_pipe_backend = None  # 'tf' or 'pt'


def _get_transformers_pipeline():
    """Initialize and cache transformers pipeline lazily.

    We prefer TensorFlow backend to avoid torch dependency. If TF isn't
    available or load fails, return None to use fallback.
    """
    global _pipe, _pipe_backend
    if _pipe is not None:
        return _pipe

    try:
        # Import lazily to avoid import-time errors when not installed
        from transformers import pipeline  # type: ignore

        # Force TF backend when possible to avoid torch
        # The default model for sentiment-analysis supports TF.
        _pipe = pipeline(
            "sentiment-analysis",
            framework="tf",  # prefer TensorFlow
        )
        _pipe_backend = "tf"
        return _pipe
    except Exception:
        # Any issue (packages missing, model load, etc.) -> fallback
        _pipe = None
        _pipe_backend = None
        return None


def _fallback_score_for_text(text: str, rating: Optional[float] = None):
    """A tiny heuristic sentiment estimator.

    - If rating is provided (on 1-5 scale), map to sentiment.
    - Else use a small lexicon to score.
    Returns (label, score).
    """
    if rating is not None:
        try:
            r = float(rating)
            if r >= 3.75:
                return "POSITIVE", min(1.0, (r - 3.0) / 2.0)  # ~0.38..1.0
            if r <= 2.25:
                return "NEGATIVE", min(1.0, (3.0 - r) / 2.0)  # ~0.38..1.0
            return "NEUTRAL", 0.5
        except Exception:
            pass

    txt = (text or "").lower()
    if not txt.strip():
        return "NEUTRAL", 0.0

    pos_words = {
        "good", "great", "excellent", "amazing", "love", "loved", "like",
        "fantastic", "perfect", "happy", "satisfied", "recommend", "best",
        "awesome", "superb", "worth", "fast", "smooth",
    }
    neg_words = {
        "bad", "terrible", "awful", "hate", "hated", "dislike", "poor",
        "worst", "slow", "buggy", "broken", "issue", "issues", "problem",
        "problems", "lag", "laggy", "overheat", "heating", "expensive",
    }

    pos = sum(1 for w in pos_words if w in txt)
    neg = sum(1 for w in neg_words if w in txt)
    if pos == 0 and neg == 0:
        return "NEUTRAL", 0.5
    if pos >= neg:
        score = min(1.0, 0.5 + (pos - neg) * 0.1)
        return "POSITIVE", score
    else:
        score = min(1.0, 0.5 + (neg - pos) * 0.1)
        return "NEGATIVE", score


def analyze_sentiment(reviews: List[Dict]) -> List[Dict]:
    """Adds sentiment + confidence to each review.

    Uses transformers pipeline in batch when available; otherwise falls back to
    a light heuristic that never raises at runtime.
    """
    if not reviews:
        return []

    texts = [(r.get("clean_text") or "").strip() for r in reviews]

    # Try ML pipeline first
    pipe = _get_transformers_pipeline()
    outputs: Optional[List[Dict]] = None
    if pipe is not None:
        try:
            # Batch inference; pass truncation args to be safe for long reviews
            outputs = pipe(
                texts,
                truncation=True,
                max_length=256,
            )
            # Some pipelines return a single dict when input is a single string
            if isinstance(outputs, dict):  # type: ignore
                outputs = [outputs]  # type: ignore
        except Exception:
            outputs = None

    results: List[Dict] = []
    if outputs is not None and len(outputs) == len(texts):
        for r, out in zip(reviews, outputs):
            try:
                label = str(out.get("label", "NEUTRAL")).upper()
                score = float(out.get("score", 0.5))
                results.append({**r, "sentiment": label, "score": round(score, 3)})
            except Exception:
                label, score = _fallback_score_for_text(r.get("clean_text", ""), r.get("rating"))
                results.append({**r, "sentiment": label, "score": round(score, 3)})
        return results

    # Fallback path (no ML or ML failed)
    for r in reviews:
        label, score = _fallback_score_for_text(r.get("clean_text", ""), r.get("rating"))
        results.append({**r, "sentiment": label, "score": round(score, 3)})
    return results
