from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, HttpUrl
import os, json
from datetime import datetime, timedelta, timezone
import redis
from celery.result import AsyncResult
from .auth import get_current_user
from ..db.mongodb import get_db
from ..schemas.user import UserPublic
from ..models.schemas import (
    ReviewRequest, 
    ScrapeResult, 
    SingleReview, 
    ProductMeta,
    StartScrapeResponse,
    ScrapeStatusResponse,
    CancelScrapeResponse,
    ScrapeLockStatusResponse
)

router = APIRouter(prefix="", tags=["Fetch Review Job"])

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
LOCK_KEY = "revu:scrape:lock"
LOCK_TTL = 60 * 60
TASK_META_KEY = "revu:task:{job_id}:meta"
TASK_RESULT_KEY = "revu:task:{job_id}:result"
TASK_CANCEL_KEY = "revu:task:{job_id}:cancel"
# Configurable per-user daily limit (default 3)
DAILY_SCRAPE_LIMIT = 3
try:
    DAILY_SCRAPE_LIMIT = int(os.getenv("DAILY_SCRAPE_LIMIT", "3"))
except Exception:
    DAILY_SCRAPE_LIMIT = 3

class StartScrapeRequest(BaseModel):
    url: HttpUrl

@router.post("/start-scrape", response_model=StartScrapeResponse)
async def start_scrape(payload: StartScrapeRequest, current_user: UserPublic = Depends(get_current_user)):
    # Per-user daily rate limiting (default configurable via DAILY_SCRAPE_LIMIT).
    # If DAILY_SCRAPE_LIMIT <= 0, rate limiting is disabled for testing.
    if DAILY_SCRAPE_LIMIT and int(DAILY_SCRAPE_LIMIT) > 0:
        try:
            user_id = current_user.id
            now = datetime.now(timezone.utc)
            day_key = now.strftime("%Y%m%d")
            rate_key = f"revu:rate:{user_id}:{day_key}"
            # Increment atomically and set TTL to end-of-day on first use
            new_count = redis_client.incr(rate_key)
            # Ensure TTL is set even if the key existed previously without expiry
            ttl_remaining = None
            try:
                ttl_remaining = redis_client.ttl(rate_key)
            except Exception:
                ttl_remaining = None
            if new_count == 1 or (ttl_remaining is not None and ttl_remaining < 0):
                # seconds until midnight UTC
                tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
                ttl = int((tomorrow - now).total_seconds())
                try:
                    redis_client.expire(rate_key, ttl)
                except Exception:
                    pass
            if new_count > DAILY_SCRAPE_LIMIT:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Daily limit reached ({DAILY_SCRAPE_LIMIT} scrapes). Try again tomorrow.",
                )
        except HTTPException:
            raise
        except Exception:
            # If Redis is unavailable, do not block; proceed without rate limiting
            pass
    else:
        # Rate limiting disabled (DAILY_SCRAPE_LIMIT <= 0)
        pass

    locked = redis_client.set(LOCK_KEY, "1", nx=True, ex=LOCK_TTL)
    if not locked:
        raise HTTPException(status_code=409, detail="A scraping job is already in progress. Please wait until it finishes.")
    try:
        from app.worker import celery_app
    except Exception as e:
        redis_client.delete(LOCK_KEY)
        redis_client.delete(f"{LOCK_KEY}:task")
        raise HTTPException(status_code=500, detail=f"Failed to import worker: {e}")
    try:
        task = celery_app.send_task("run_scraper_task", args=[str(payload.url)])
        redis_client.set(f"{LOCK_KEY}:task", task.id, ex=LOCK_TTL)
        return StartScrapeResponse(job_id=task.id)
    except Exception as exc:
        redis_client.delete(LOCK_KEY)
        redis_client.delete(f"{LOCK_KEY}:task")
        raise HTTPException(status_code=500, detail=f"Failed to enqueue task: {exc}")

@router.get("/scrape-status/{job_id}", response_model=ScrapeStatusResponse)
async def scrape_status(job_id: str):
    try:
        meta_raw = redis_client.get(TASK_META_KEY.format(job_id=job_id))
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Error reading status from Redis: {exc}")

    if meta_raw:
        try:
            meta = json.loads(meta_raw)
        except Exception:
            meta = {"error": meta_raw}
        state = meta.get("state")
        if state == "SUCCESS":
            try:
                result_raw = redis_client.get(TASK_RESULT_KEY.format(job_id=job_id))
            except Exception:
                result_raw = None
            try:
                result = json.loads(result_raw) if result_raw else None
            except Exception:
                result = None
            # Best-effort persistence of raw scraped reviews and analysis into MongoDB
            try:
                if result:
                    db = await get_db()
                    now = datetime.now(timezone.utc).isoformat()
                    owner = redis_client.get(f"revu:task:{job_id}:owner")
                    src_url = redis_client.get(f"revu:task:{job_id}:url")
                    # Save raw reviews
                    doc = {
                        "_id": job_id,
                        "job_id": job_id,
                        "url": src_url,
                        "user_id": owner,
                        "product": result.get("product"),
                        "reviews": result.get("reviews"),
                        "count": result.get("count"),
                        "updatedAt": now,
                    }
                    await db["reviews"].update_one(
                        {"_id": job_id},
                        {"$set": doc, "$setOnInsert": {"createdAt": now}},
                        upsert=True,
                    )
                    # Save analysis if present
                    analysis = result.get("analysis")
                    if analysis:
                        doc_a = {
                            "_id": job_id,
                            "job_id": job_id,
                            "url": src_url,
                            "user_id": owner,
                            "product": result.get("product"),
                            "reviews": analysis.get("reviews") or [],
                            "analysis": analysis,
                            "updatedAt": now,
                        }
                        await db["analyses"].update_one(
                            {"_id": job_id},
                            {"$set": doc_a, "$setOnInsert": {"createdAt": now}},
                            upsert=True,
                        )
            except Exception:
                # Non-fatal: if DB is unavailable, continue serving the response
                pass
            try:
                redis_client.delete(LOCK_KEY)
                redis_client.delete(f"{LOCK_KEY}:task")
            except Exception:
                pass
            return ScrapeStatusResponse(
                job_id=job_id,
                state="SUCCESS",
                progress=100,
                result=result.get("reviews") if result else None,
                count=result.get("count") if result else None,
                product=result.get("product") if result else None,
                error=None,
            )
        if state == "PROGRESS":
            return ScrapeStatusResponse(
                job_id=job_id,
                state="PROGRESS",
                progress=meta.get("progress", 0),
                result=None,
                count=None,
                product=None,
                error=None,
            )
        if state == "REVOKED":
            try:
                redis_client.delete(LOCK_KEY)
                redis_client.delete(f"{LOCK_KEY}:task")
            except Exception:
                pass
            return ScrapeStatusResponse(
                job_id=job_id,
                state="REVOKED",
                progress=meta.get("progress", 0),
                result=None,
                count=None,
                product=None,
                error=meta.get("error"),
            )
        if state == "FAILURE":
            try:
                redis_client.delete(LOCK_KEY)
                redis_client.delete(f"{LOCK_KEY}:task")
            except Exception:
                pass
            return ScrapeStatusResponse(
                job_id=job_id,
                state="FAILURE",
                progress=meta.get("progress", 0),
                result=None,
                count=None,
                product=None,
                error=meta.get("error"),
            )

    # Fallback to celery
    try:
        from app.worker import celery_app
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to import worker: {e}")
    try:
        result = AsyncResult(job_id, app=celery_app)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Error communicating with Celery/Redis: {exc}")
    try:
        state = result.state
    except Exception:
        state = "UNKNOWN"
    info = None
    try:
        info = result.info
    except Exception:
        info = None
    if state in ("SUCCESS", "FAILURE", "REVOKED"):
        try:
            redis_client.delete(LOCK_KEY)
            redis_client.delete(f"{LOCK_KEY}:task")
        except Exception:
            pass
    # Normalize output; do not put the whole info dict into error when SUCCESS
    if state == "SUCCESS" and isinstance(info, dict):
        return ScrapeStatusResponse(
            job_id=job_id,
            state=state,
            progress=100,
            result=info.get("reviews"),
            count=info.get("count"),
            product=info.get("product"),
            error=None,
        )
    elif state == "FAILURE":
        return ScrapeStatusResponse(
            job_id=job_id,
            state=state,
            progress=info.get("progress", 0) if isinstance(info, dict) else 0,
            result=None,
            count=None,
            product=None,
            error=info.get("exc") if isinstance(info, dict) else (str(info) if info else None),
        )
    else:
        return ScrapeStatusResponse(
            job_id=job_id,
            state=state,
            progress=info.get("progress", 0) if isinstance(info, dict) else 0,
            result=None,
            count=None,
            product=None,
            error=None,
        )


@router.post("/cancel-scrape/{job_id}", response_model=CancelScrapeResponse)
def cancel_scrape(job_id: str):
    """Cooperative cancellation: set a cancel flag and try to revoke the Celery task."""
    # Set cancel flag in Redis so worker sees it on next progress update
    try:
        redis_client.set(TASK_CANCEL_KEY.format(job_id=job_id), "1", ex=60 * 60)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Error writing cancel flag to Redis: {exc}")

    # Best-effort revoke; worker checks cancel flag cooperatively
    try:
        from app.worker import celery_app
        res = AsyncResult(job_id, app=celery_app)
        # With Celery solo pool, terminate has no effect; keep cooperative approach
        res.revoke(terminate=False)
    except Exception:
        pass

    # Optimistically mark task as REVOKED in meta so the UI reflects cancellation immediately
    try:
        meta_key = TASK_META_KEY.format(job_id=job_id)
        # Preserve existing progress if available
        prev_raw = redis_client.get(meta_key)
        prog = 0
        if prev_raw:
            try:
                prev = json.loads(prev_raw)
                prog = int(prev.get("progress", 0))
            except Exception:
                prog = 0
        redis_client.set(meta_key, json.dumps({"state": "REVOKED", "progress": prog, "error": "cancelled by user"}), ex=60 * 60 * 24)
    except Exception:
        pass

    # Proactively release the single-job lock to allow a new job to start promptly
    try:
        redis_client.delete(LOCK_KEY)
        redis_client.delete(f"{LOCK_KEY}:task")
    except Exception:
        pass

    return CancelScrapeResponse(job_id=job_id, cancel_requested=True)


@router.get("/scrape-lock-status", response_model=ScrapeLockStatusResponse)
def scrape_lock_status():
    """Return whether the single-job lock is held and by which task (if known)."""
    try:
        locked = bool(redis_client.exists(LOCK_KEY))
        owner = redis_client.get(f"{LOCK_KEY}:task") if locked else None
        ttl = redis_client.ttl(LOCK_KEY) if locked else None
        return ScrapeLockStatusResponse(locked=locked, owner_job_id=owner, ttl=ttl)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Error reading lock status: {exc}")