import os
import json
from typing import List, Any
from datetime import date, datetime
from celery import Celery, states
from celery.utils.log import get_task_logger
from app.services.scraper import scrape_reviews
# SerpApi integration removed; no external SerpApi-specific exceptions
import redis

# Broker/Backend URLs (can be overridden by env vars)
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
            # Respect environment variable SCRAPER_MAX_REVIEWS when provided (default 4000)
            max_reviews_env = os.getenv("SCRAPER_MAX_REVIEWS")
            try:
                max_reviews = int(max_reviews_env) if max_reviews_env else 4000
            except Exception:
                max_reviews = 4000

            # Limit pages via env to avoid multi-hour runs; default to 50
            try:
                max_pages = int(os.getenv("SCRAPER_MAX_PAGES", "50"))
            except Exception:
                max_pages = 50

            product_meta, reviews = scrape_reviews(
                url,
                max_pages=max_pages,
                max_reviews=max_reviews,
                progress_cb=_update,
                cancel_cb=_cancel_check,
            )
            serialized = _serialize_reviews(reviews)
            result_payload = {"count": len(serialized), "reviews": serialized, "product": product_meta, "error": None}
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
