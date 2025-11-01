from fastapi import APIRouter, HTTPException, Depends
from typing import Any
from datetime import datetime, timezone
from app.db.mongodb import get_db
from app.schemas.review_schema import AnalysisSaveRequest
from app.routes.auth import get_current_user
from app.schemas.user import UserPublic
import re


def _short_product_summary(title: str, max_words: int = 3) -> str:
    """Create a short product summary from a long title by extracting up to max_words meaningful tokens.

    Strategy:
    - strip bracketed parts and punctuation
    - extract alphanumeric tokens
    - filter out common stopwords and tiny tokens
    - return first up to max_words tokens joined by space; fallback to first words from title
    """
    if not title:
        return ""
    # Remove content inside parentheses/brackets which often contain SKU/ASIN info
    t = re.sub(r"\[[^\]]*\]|\([^\)]*\)", " ", title)
    # Extract tokens
    tokens = re.findall(r"[A-Za-z0-9]+", t)
    if not tokens:
        return title.strip()[:64]
    stop = set(
        "a an the and or but if while is are was were to of in for on with by as at from that this it be have has had not no do does did so such very can will would should could".split()
    )
    meaningful = [tok for tok in tokens if len(tok) > 1 and tok.lower() not in stop]
    chosen = meaningful[:max_words]
    if not chosen:
        # fallback to first tokens
        chosen = tokens[:max_words]
    # Capitalize appropriately
    return " ".join([w.capitalize() for w in chosen])

router = APIRouter(prefix="/analysis", tags=["Analysis Store"])


@router.post("/")
async def save_analysis(payload: AnalysisSaveRequest, current_user: UserPublic = Depends(get_current_user)):
    db = await get_db()
    now = datetime.now(timezone.utc).isoformat()
    doc = payload.model_dump()
    # Primary key: prefer provided id/_id else default to job_id
    pk = doc.get("_id") or payload.job_id
    doc["_id"] = pk
    # Foreign key: always stamp user id from token
    doc["user_id"] = str(current_user.id)
    doc["updatedAt"] = now
    # Auto-fill product.summary using a short 3-word heuristic when not provided
    try:
        prod = doc.get("product") or {}
        summary = (prod.get("summary") if isinstance(prod, dict) else None)
        if prod and (not summary or not str(summary).strip()):
            title = prod.get("name") or prod.get("title") or prod.get("productName") or doc.get("url")
            if isinstance(title, (list, dict)):
                title = str(title)
            prod_summary = _short_product_summary(str(title or ""), max_words=3)
            if isinstance(prod, dict):
                prod["summary"] = prod_summary
                doc["product"] = prod
    except Exception:
        # Don't fail saving just for summarization; log silently
        pass
    # Preserve createdAt when present
    await db["analyses"].update_one(
        {"_id": pk},
        {
            "$set": doc,
            "$setOnInsert": {"createdAt": now},
        },
        upsert=True,
    )
    return {"ok": True, "job_id": payload.job_id, "id": pk}


@router.get("/{job_id}")
async def get_analysis(job_id: str, current_user: UserPublic = Depends(get_current_user)):
    db = await get_db()
    # Require ownership; if you prefer cross-user access, drop user_id filter
    doc = await db["analyses"].find_one({"_id": job_id, "user_id": str(current_user.id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Analysis not found")
    # Map _id back to job_id for clients
    doc["job_id"] = doc.pop("_id", job_id)
    return doc


@router.get("/")
async def list_analyses(current_user: UserPublic = Depends(get_current_user)):
    db = await get_db()
    cursor = db["analyses"].find({"user_id": str(current_user.id)}).sort("updatedAt", -1)
    results = []
    async for doc in cursor:
        # map _id to job_id for clients
        job_id = doc.get("_id")
        doc["job_id"] = job_id
        results.append(doc)
    return results


@router.delete("/{job_id}")
async def delete_analysis(job_id: str, current_user: UserPublic = Depends(get_current_user)):
    db = await get_db()
    res = await db["analyses"].delete_one({"_id": job_id, "user_id": str(current_user.id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {"ok": True}
