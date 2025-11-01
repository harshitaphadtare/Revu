import os
import json
import re
import threading
import time
from typing import List, Any, Union
from datetime import date, datetime
from celery import Celery, states
from celery.utils.log import get_task_logger
from app.services.scraper import fetch_amazon_reviews
from app.services import preprocessing, sentiment, topic_extractor, summarizer
import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
RESULT_URL = os.getenv("RESULT_URL", REDIS_URL)

celery_app = Celery(
    "revu_worker",
    broker=REDIS_URL,
    backend=RESULT_URL,
)

logger = get_task_logger(__name__)
redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)

# Distributed lock (must match API router)
LOCK_KEY = "revu:scrape:lock"
LOCK_TASK_KEY = f"{LOCK_KEY}:task"
LOCK_TTL = int(os.getenv("SCRAPE_LOCK_TTL", "3600"))  # 1 hour default

# Redis keys per task
def _meta_key(task_id: str) -> str:
    return f"revu:task:{task_id}:meta"

def _result_key(task_id: str) -> str:
    return f"revu:task:{task_id}:result"

def _cancel_key(task_id: str) -> str:
    return f"revu:task:{task_id}:cancel"


def _serialize_reviews(reviews) -> List[dict]:
    """Convert Pydantic models (SingleReview) to plain dicts for Celery results."""
    out: List[dict] = []
    for r in reviews:
        try:
            # Support Pydantic v2 .model_dump(); fallback to __dict__
            if hasattr(r, "model_dump"):
                entry = r.model_dump()
            elif hasattr(r, "dict"):
                entry = r.dict()
            else:
                entry = dict(r)
            # Ensure any date/datetime objects are converted to ISO strings
            def _make_serializable(obj: Any) -> Any:
                if isinstance(obj, (date, datetime)):
                    return obj.isoformat()
                if isinstance(obj, dict):
                    return {k: _make_serializable(v) for k, v in obj.items()}
                if isinstance(obj, list):
                    return [_make_serializable(i) for i in obj]
                return obj
            entry = _make_serializable(entry)
            out.append(entry)
        except Exception:
            out.append({
                "review_text": getattr(r, "review_text", None),
                "rating": getattr(r, "rating", None),
                "review_date": getattr(r, "review_date", None),
            })
    return out


@celery_app.task(bind=True, name="run_scraper_task")
def run_scraper_task(self, url: str) -> dict:
    """
    Celery task to scrape product reviews from Amazon and report progress.
    Returns a dict with {"count": int, "reviews": [...]} on success.
    """
    try:
        task_id = self.request.id

        # Ensure the single-job lock is present and associated with this task.
        # The API already sets this, but we reinforce it here and make sure TTL
        # is refreshed during long runs.
        try:
            # If a lock already exists, keep it; otherwise set it now
            if not redis_client.exists(LOCK_KEY):
                redis_client.set(LOCK_KEY, "1", ex=LOCK_TTL)
            # Record the task id owning the lock (refresh TTL as well)
            redis_client.set(LOCK_TASK_KEY, task_id, ex=LOCK_TTL)
        except Exception:
            pass

        last_pct = 0

        def _do_cancel(pct: int):
            # Mark as cancelled (use REVOKED state for clarity)
            try:
                redis_client.set(
                    _meta_key(task_id),
                    json.dumps({"state": "REVOKED", "progress": pct, "error": "cancelled by user"}),
                    ex=60 * 60 * 24,
                )
            except Exception:
                pass
            # Release lock if owned by this task
            try:
                owner = redis_client.get(LOCK_TASK_KEY)
                if owner == task_id:
                    redis_client.delete(LOCK_KEY)
                    redis_client.delete(LOCK_TASK_KEY)
            except Exception:
                pass
            # Update Celery task state and abort
            try:
                self.update_state(state=states.REVOKED, meta={"exc": "cancelled by user"})
            except Exception:
                pass
            raise Exception("cancelled by user")

        def _cancel_check():
            try:
                if redis_client.get(_cancel_key(task_id)):
                    _do_cancel(last_pct)
            except Exception:
                pass

        def _update(pct: int):
            # Cooperative cancellation: check cancel flag
            try:
                if redis_client.get(_cancel_key(task_id)):
                    _do_cancel(pct)
            except Exception:
                # If any error occurs during cancel check, proceed with normal update
                pass

            # Update Celery state (optional) and persist progress in Redis as JSON
            try:
                self.update_state(state="PROGRESS", meta={"progress": pct})
            except Exception:
                pass
            try:
                # store last observed pct
                try:
                    nonlocal last_pct
                except Exception:
                    pass
                last_pct = pct
                redis_client.set(_meta_key(task_id), json.dumps({"state": "PROGRESS", "progress": pct}), ex=60 * 60 * 24)
                # Refresh the lock TTL so a long scrape doesn't lose the lock
                try:
                    redis_client.expire(LOCK_KEY, LOCK_TTL)
                    redis_client.expire(LOCK_TASK_KEY, LOCK_TTL)
                except Exception:
                    pass
            except Exception:
                pass

        try:
            # Respect environment variable SCRAPER_MAX_REVIEWS when provided (default 300)
            # Note: The scraper itself hard-caps to 300, so this keeps behavior consistent.
            max_reviews_env = os.getenv("SCRAPER_MAX_REVIEWS")
            try:
                max_reviews = int(max_reviews_env) if max_reviews_env else 300
            except Exception:
                max_reviews = 300

            # Limit pages via env to avoid multi-hour runs; default to 50
            try:
                max_pages = int(os.getenv("SCRAPER_MAX_PAGES", "50"))
            except Exception:
                max_pages = 50

            # Extract ASIN from the provided URL (supports dp, gp/product, and product-reviews patterns)
            m = re.search(r"/(?:dp|gp/product|product-reviews)/([A-Za-z0-9]{10})", url)
            if not m:
                raise ValueError("Invalid Amazon URL: ASIN not found")
            asin = m.group(1)

            # Extract domain code from URL (e.g., amazon.in -> "in", amazon.com -> "com")
            domain_code = "com"  # default
            domain_match = re.search(r"amazon\.([a-z\.]+)", url.lower())
            if domain_match:
                domain_code = domain_match.group(1)
                # Handle domains like co.uk, com.br, etc.
                if "." in domain_code:
                    domain_code = domain_code  # keep as is (e.g., "co.uk")
                logger.info("Extracted domain code: %s from URL: %s", domain_code, url)

            # Report initial progress
            _update(10)

            # Fetch reviews via Apify (also returns product info)
            # Start a background spinner that slowly advances progress while the blocking
            # Apify actor.call is executing. This makes the UI feel responsive even when
            # the actor run takes many seconds.
            stop_spinner = threading.Event()

            def _spinner_thread():
                # Start from just above the initial 10% and move toward 35.
                cur = 12
                while not stop_spinner.is_set() and cur < 36:
                    try:
                        _update(cur)
                    except Exception:
                        pass
                    # Increment slowly; avoid tight loop.
                    time.sleep(3)
                    cur += 3

            th = threading.Thread(target=_spinner_thread, daemon=True)
            th.start()
            try:
                items, product_info = fetch_amazon_reviews(asin=asin, max_reviews=max_reviews, domain_code=domain_code)
            finally:
                # Stop spinner and ensure we set a meaningful post-fetch progress value
                try:
                    stop_spinner.set()
                except Exception:
                    pass
                try:
                    th.join(timeout=1)
                except Exception:
                    pass
            # Update progress after fetch completes
            _update(40)

            # Log product info extracted from reviews
            logger.info("Product info from reviews: %s", product_info)

            # Single-actor mode: rely solely on reviews actor for product info
            if not product_info.get("productName") or not product_info.get("price"):
                logger.info("Product info missing or incomplete from reviews actor; proceeding without separate fetch.")

            # Convert Apify items to a normalized schema compatible with the rest of the app
            def _first_str(*vals) -> str:
                for v in vals:
                    if isinstance(v, str) and v.strip():
                        return v.strip()
                return ""

            def _extract_text(it: dict) -> str:
                # Direct candidates
                txt = _first_str(
                    it.get("text"), it.get("body"), it.get("reviewText"), it.get("reviewDescription"),
                    it.get("description"), it.get("content"), it.get("review"), it.get("comment"),
                    it.get("comments"), it.get("reviewContent"), it.get("message"),
                )
                if txt:
                    return txt
                # Nested under known containers
                nested = it.get("review") or it.get("details") or it.get("data")
                if isinstance(nested, dict):
                    txt = _first_str(
                        nested.get("text"), nested.get("body"), nested.get("content"), nested.get("reviewText"),
                        nested.get("description"), nested.get("message"),
                    )
                    if txt:
                        return txt
                # Fallback to title if nothing else
                return _first_str(it.get("title"))

            def _extract_rating(it: dict) -> Union[float, None]:
                cand = (
                    it.get("stars") or it.get("rating") or it.get("score") or it.get("reviewScore") or
                    it.get("reviewRating") or it.get("star")
                )
                if isinstance(cand, (int, float)):
                    return float(cand)
                if isinstance(cand, str) and cand.strip():
                    # Handle patterns like "4.0 out of 5 stars" or "4/5"
                    m = re.search(r"(\d+(?:[\.,]\d+)?)", cand)
                    if m:
                        try:
                            return float(m.group(1).replace(",", "."))
                        except Exception:
                            return None
                # Check nested
                nested = it.get("review") or it.get("details") or it.get("data")
                if isinstance(nested, dict):
                    return _extract_rating(nested)
                return None

            def _extract_date(it: dict):
                cand = (
                    it.get("date") or it.get("reviewDate") or it.get("timestamp") or it.get("dateString") or
                    it.get("reviewedDate") or it.get("review_date")
                )
                if cand:
                    return cand
                nested = it.get("review") or it.get("details") or it.get("data")
                if isinstance(nested, dict):
                    return nested.get("date") or nested.get("reviewDate") or nested.get("timestamp") or nested.get("dateString") or nested.get("reviewedDate") or nested.get("review_date")
                return None

            # Some actors (including axesso variants) return items where each item has a 'reviews' array.
            # Flatten such structures so downstream normalization sees individual reviews.
            flat_items = []
            for it in items:
                try:
                    if isinstance(it, dict) and isinstance(it.get("reviews"), list):
                        for rv in it.get("reviews", []) or []:
                            flat_items.append(rv)
                    else:
                        flat_items.append(it)
                except Exception:
                    flat_items.append(it)

            normalized = []
            total = len(flat_items) if isinstance(flat_items, list) else 0
            for idx, it in enumerate(flat_items):
                try:
                    text = _extract_text(it)
                    rating = _extract_rating(it)
                    date_val = _extract_date(it)
                    normalized.append({
                        "review_text": text,
                        "rating": rating,
                        "review_date": date_val,
                    })
                except Exception as e:
                    logger.warning("Failed to parse review item: %s", str(e))
                    normalized.append({
                        "review_text": "",
                        "rating": None,
                        "review_date": None,
                    })
                # Periodic progress updates between 40 and 85
                try:
                    if total:
                        pct = 40 + int(45 * (idx + 1) / total)
                        if (idx + 1) % max(1, total // 10) == 0:
                            _update(pct)
                except Exception:
                    pass

            # Finalize normalization
            _update(55)
            serialized = _serialize_reviews(normalized)
            # Treat zero reviews as a failure to surface issues (blocked, wrong URL, etc.)
            if len(serialized) == 0:
                raise ValueError("No reviews scraped for the provided URL.")
            def _truncate_name(name: str, max_words: int = 5) -> str:
                try:
                    if not name:
                        return name
                    parts = str(name).split()
                    if len(parts) <= max_words:
                        return str(name)
                    return " ".join(parts[:max_words])
                except Exception:
                    return name

            product_meta = {
                "asin": asin,
                "source": "apify",
                # Reflect actual actor used if configured; fallback to epctex label
                "actor": os.getenv("APIFY_REVIEWS_ACTOR", "epctex/amazon-reviews-scraper"),
                "name": _truncate_name(product_info.get("productName")),
                # Price fields intentionally omitted (manual scraping disabled)
                "countReviews": product_info.get("countReviews"),
            }
            # Analysis phase with progress
            analysis_payload = None
            try:
                _update(60)
                # 1) Clean text
                reviews_for_analysis = []
                for r in serialized:
                    rt = dict(r)
                    try:
                        rt["clean_text"] = preprocessing.clean_text(rt.get("review_text") or "")
                    except Exception:
                        rt["clean_text"] = rt.get("review_text") or ""
                    reviews_for_analysis.append(rt)

                _update(70)
                # 2) Sentiment
                sentiments = sentiment.analyze_sentiment(reviews_for_analysis)

                positive_texts = [r.get("clean_text", "") for r in sentiments if str(r.get("sentiment", "")).lower() == "positive"]
                negative_texts = [r.get("clean_text", "") for r in sentiments if str(r.get("sentiment", "")).lower() == "negative"]

                _update(80)
                # 3) Themes
                positive_themes = topic_extractor.extract_keywords(positive_texts)
                negative_themes = topic_extractor.extract_keywords(negative_texts)

                # De-duplicate terms across positive/negative themes by keeping
                # the side where the term is more characteristic (occurs more).
                def _count_tokens(texts: List[str], vocab: set[str]) -> dict[str, int]:
                    counts: dict[str, int] = {}
                    token_re = re.compile(r"[A-Za-z][A-Za-z0-9_\-]{2,}")
                    for t in texts:
                        for tok in token_re.findall((t or "").lower()):
                            if tok in vocab:
                                counts[tok] = counts.get(tok, 0) + 1
                    return counts

                pos_set = set([str(w).lower() for w in positive_themes])
                neg_set = set([str(w).lower() for w in negative_themes])
                overlap = pos_set & neg_set
                if overlap:
                    pos_counts = _count_tokens(positive_texts, overlap)
                    neg_counts = _count_tokens(negative_texts, overlap)
                    # Drop the term from the side with lower count; tie -> drop from negative
                    def _filter_list(lst: List[str], drop: set[str]) -> List[str]:
                        out = []
                        seen = set()
                        for w in lst:
                            lw = str(w).lower()
                            if lw in drop:
                                continue
                            if lw in seen:
                                continue
                            seen.add(lw)
                            out.append(w)
                        return out

                    drop_from_pos: set[str] = set()
                    drop_from_neg: set[str] = set()
                    for term in overlap:
                        p = pos_counts.get(term, 0)
                        n = neg_counts.get(term, 0)
                        if p > n:
                            drop_from_neg.add(term)
                        elif n > p:
                            drop_from_pos.add(term)
                        else:
                            # tie-breaker: keep in positive, drop from negative
                            drop_from_neg.add(term)

                    positive_themes = _filter_list(positive_themes, drop_from_pos)
                    negative_themes = _filter_list(negative_themes, drop_from_neg)

                _update(90)
                # 4) Summaries
                all_clean_texts = [r.get("clean_text", "") for r in sentiments]
                summary_short = summarizer.generate_summary(all_clean_texts, mode="short")
                summary = summarizer.generate_summary(all_clean_texts, mode="descriptive")

                # 5) Trend data
                trend_data = []
                for r in sentiments:
                    rd = r.get("review_date")
                    if rd:
                        trend_data.append({
                            "date": rd,
                            "positive": 1 if str(r.get("sentiment", "")).lower() == "positive" else 0,
                            "negative": 1 if str(r.get("sentiment", "")).lower() == "negative" else 0,
                        })

                analysis_payload = {
                    "total_reviews": len(serialized),
                    "sentiment_counts": {
                        "positive": len(positive_texts),
                        "negative": len(negative_texts),
                        "neutral": len(serialized) - len(positive_texts) - len(negative_texts),
                    },
                    "top_positive_themes": positive_themes,
                    "top_negative_themes": negative_themes,
                    "trend_data": trend_data,
                    "reviews": sentiments,
                    "summary": summary,
                    "summary_short": summary_short,
                }
            except Exception as an_err:
                logger.exception("Analysis phase failed: %s", an_err)
                analysis_payload = None

            _update(98)
            result_payload = {"count": len(serialized), "reviews": serialized, "product": product_meta, "analysis": analysis_payload, "error": None}
            # Persist final result and meta (log before/after for debugging)
            try:
                logger.info("Writing final result to Redis for task %s (count=%d)", task_id, len(serialized))
                redis_client.set(_result_key(task_id), json.dumps(result_payload), ex=60 * 60 * 24)
                logger.info("Result written, now writing SUCCESS meta for task %s", task_id)
                redis_client.set(_meta_key(task_id), json.dumps({"state": "SUCCESS", "progress": 100}), ex=60 * 60 * 24)
                logger.info("SUCCESS meta written for task %s", task_id)
            except Exception as ex_write:
                logger.exception("Failed to write final result/meta for task %s: %s", task_id, ex_write)
            # Release the lock only if it still belongs to this task
            try:
                owner = redis_client.get(LOCK_TASK_KEY)
                if owner == task_id:
                    redis_client.delete(LOCK_KEY)
                    redis_client.delete(LOCK_TASK_KEY)
            except Exception:
                pass
            return result_payload
        except ValueError as e:
            # Handle validation errors (e.g., no reviews found)
            error_msg = str(e)
            logger.error("Scraper task failed with %s: %s", type(e).__name__, error_msg)
            # Persist failure info in Redis so status endpoint can read simple text
            try:
                redis_client.set(_meta_key(self.request.id), json.dumps({"state": "FAILURE", "error": error_msg}), ex=60 * 60 * 24)
            except Exception:
                pass
            # Also persist a result payload with error for clients that expect it in result key
            try:
                redis_client.set(_result_key(task_id), json.dumps({"count": 0, "reviews": [], "product": None, "error": error_msg}), ex=60 * 60 * 24)
            except Exception:
                pass
            # Release the lock only if it still belongs to this task
            try:
                owner = redis_client.get(LOCK_TASK_KEY)
                if owner == task_id:
                    redis_client.delete(LOCK_KEY)
                    redis_client.delete(LOCK_TASK_KEY)
            except Exception:
                pass
            raise
        except Exception as e:
            # Persist failure info in Redis so status endpoint can read simple text
            try:
                redis_client.set(_meta_key(self.request.id), json.dumps({"state": "FAILURE", "error": str(e)}), ex=60 * 60 * 24)
            except Exception:
                pass
            # Also persist a result payload with error for clients that expect it in result key
            try:
                redis_client.set(_result_key(task_id), json.dumps({"count": 0, "reviews": [], "product": None, "error": str(e)}), ex=60 * 60 * 24)
            except Exception:
                pass
            logger.exception("Scraper task failed: %s", e)
            # Release the lock only if it still belongs to this task
            try:
                owner = redis_client.get(LOCK_TASK_KEY)
                if owner == task_id:
                    redis_client.delete(LOCK_KEY)
                    redis_client.delete(LOCK_TASK_KEY)
            except Exception:
                pass
            raise
    except Exception as e:
        logger.exception("Scraper task failed: %s", e)
        raise
