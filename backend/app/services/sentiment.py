"""Sentiment analysis service (lightweight heuristic only).

Contract:
- Input: list[dict] where each item has at least a 'clean_text' key, optionally 'rating'.
- Output: same list length, each dict augmented with:
  - 'sentiment': one of 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  - 'score': float in [0, 1]
Behavior:
- No ML dependencies; uses simple rating mapping and tiny lexicon heuristic.
"""

from typing import List, Dict, Optional


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
    """Adds sentiment + confidence to each review using a lightweight heuristic."""
    if not reviews:
        return []

    results: List[Dict] = []
    for r in reviews:
        label, score = _fallback_score_for_text(r.get("clean_text", ""), r.get("rating"))
        results.append({**r, "sentiment": label, "score": round(score, 3)})
    return results
