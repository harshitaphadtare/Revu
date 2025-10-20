"""Topic extraction with optional KeyBERT and safe fallback.

Contract:
- Input: list[str] texts
- Output: list[str] of representative keywords/themes (deduplicated)
Behavior:
- Try KeyBERT (if installed). If unavailable or it fails, use a simple
  frequency-based keyword extractor with stopwords and basic tokenization.
"""

from typing import List
import re

_kw_model = None  # cached KeyBERT instance


def _get_keybert():
    global _kw_model
    if _kw_model is not None:
        return _kw_model
    try:
        from keybert import KeyBERT  # type: ignore
        _kw_model = KeyBERT()
        return _kw_model
    except Exception:
        _kw_model = None
        return None


_STOPWORDS = {
    "the", "is", "are", "a", "an", "and", "or", "to", "of", "in", "on",
    "for", "it", "this", "that", "with", "as", "at", "by", "be", "from",
    "i", "you", "we", "they", "he", "she", "was", "were", "have", "has",
    "had", "but", "not", "so", "if", "then", "too", "very", "just", "my",
    "your", "their", "our", "can", "could", "would", "should", "will",
}


def _fallback_keywords(texts: List[str], top_n: int = 10) -> List[str]:
    freq = {}
    token_re = re.compile(r"[A-Za-z][A-Za-z0-9_\-]{2,}")  # words length >=3
    for t in texts:
        for tok in token_re.findall((t or "").lower()):
            if tok in _STOPWORDS:
                continue
            freq[tok] = freq.get(tok, 0) + 1
    # Sort by frequency desc, then alphabetically for determinism
    return [w for w, _ in sorted(freq.items(), key=lambda kv: (-kv[1], kv[0]))[:top_n]]


def extract_keywords(texts: List[str]) -> List[str]:
    """Extract key themes from a list of texts."""
    if not texts:
        return []

    model = _get_keybert()
    if model is not None:
        try:
            keywords = []
            for text in texts:
                kws = model.extract_keywords(text or "", top_n=3)
                keywords.extend([kw for kw, _ in kws])
            # de-duplicate while keeping common terms first
            # We'll rank by occurrence across texts
            counts = {}
            for kw in keywords:
                k = kw.lower()
                counts[k] = counts.get(k, 0) + 1
            return [w for w, _ in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))][:10]
        except Exception:
            # Fall through to fallback
            pass

    return _fallback_keywords(texts)
