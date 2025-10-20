from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl
import os, json
import redis
from celery.result import AsyncResult

router = APIRouter(prefix="", tags=["Fetch Review Job"])

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
LOCK_KEY = "revu:scrape:lock"
LOCK_TTL = 60 * 60
TASK_META_KEY = "revu:task:{job_id}:meta"
TASK_RESULT_KEY = "revu:task:{job_id}:result"
TASK_CANCEL_KEY = "revu:task:{job_id}:cancel"

class StartScrapeRequest(BaseModel):
    url: HttpUrl

@router.post("/start-scrape")
def start_scrape(payload: StartScrapeRequest):
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
        return {"job_id": task.id}
    except Exception as exc:
        redis_client.delete(LOCK_KEY)
        redis_client.delete(f"{LOCK_KEY}:task")
        raise HTTPException(status_code=500, detail=f"Failed to enqueue task: {exc}")

@router.get("/scrape-status/{job_id}")
def scrape_status(job_id: str):
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
            try:
                redis_client.delete(LOCK_KEY)
                redis_client.delete(f"{LOCK_KEY}:task")
            except Exception:
                pass
            return {
                "job_id": job_id,
                "state": "SUCCESS",
                "progress": 100,
                "result": result.get("reviews") if result else None,
                "count": result.get("count") if result else None,
                "product": result.get("product") if result else None,
                "error": None,
            }
        if state == "PROGRESS":
            return {
                "job_id": job_id,
                "state": "PROGRESS",
                "progress": meta.get("progress", 0),
                "result": None,
                "count": None,
                "error": None,
            }
        if state == "FAILURE":
            try:
                redis_client.delete(LOCK_KEY)
                redis_client.delete(f"{LOCK_KEY}:task")
            except Exception:
                pass
            return {
                "job_id": job_id,
                "state": "FAILURE",
                "progress": meta.get("progress", 0),
                "result": None,
                "count": None,
                "error": meta.get("error"),
            }

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
    payload = {
        "job_id": job_id,
        "state": state,
        "progress": 0,
        "result": None,
        "count": None,
        "product": None,
        "error": None,
    }
    if state == "SUCCESS" and isinstance(info, dict):
        payload.update({
            "progress": 100,
            "result": info.get("reviews"),
            "count": info.get("count"),
            "product": info.get("product"),
        })
    elif state == "FAILURE":
        payload.update({
            "progress": info.get("progress", 0) if isinstance(info, dict) else 0,
            "error": info.get("exc") if isinstance(info, dict) else (str(info) if info else None),
        })
    else:
        payload.update({
            "progress": info.get("progress", 0) if isinstance(info, dict) else 0,
        })
    return payload


@router.post("/cancel-scrape/{job_id}")
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
        res.revoke(terminate=False)
    except Exception:
        pass

    return {"job_id": job_id, "cancel_requested": True}


@router.get("/scrape-lock-status")
def scrape_lock_status():
    """Return whether the single-job lock is held and by which task (if known)."""
    try:
        locked = bool(redis_client.exists(LOCK_KEY))
        owner = redis_client.get(f"{LOCK_KEY}:task") if locked else None
        ttl = redis_client.ttl(LOCK_KEY) if locked else None
        return {"locked": locked, "owner_job_id": owner, "ttl": ttl}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Error reading lock status: {exc}")