from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime, timezone
import uuid

from ..db.mongodb import get_db
from ..utils.security import hash_password, verify_password, create_access_token, decode_token
from ..schemas.user import UserCreate, UserLogin, UserPublic, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/signin")


def _doc_to_public(doc) -> UserPublic:
	return UserPublic(
		id=str(doc.get("_id")),
		email=doc["email"],
		name=doc.get("name"),
		is_active=bool(doc.get("is_active", True)),
		created_at=doc.get("created_at"),
		updated_at=doc.get("updated_at"),
	)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserPublic:
	try:
		payload = decode_token(token)
	except Exception:
		# Any decode error should be treated as unauthorized, not a 500
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

	user_id = payload.get("sub")
	if not user_id:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
	db = await get_db()
	user = await db.users.find_one({"_id": user_id})
	if not user:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
	return _doc_to_public(user)


@router.post("/signup", response_model=TokenResponse)
async def signup(body: UserCreate):
	try:
		db = await get_db()
		users = db.users
	except Exception:
		raise HTTPException(status_code=503, detail="Database unavailable. Please try again later.")
	# Enforce unique email
	try:
		existing = await users.find_one({"email": body.email})
	except Exception:
		raise HTTPException(status_code=503, detail="Database unavailable. Please try again later.")
	if existing:
		raise HTTPException(status_code=400, detail="Email already registered")

	now = datetime.now(timezone.utc)
	user_id = str(uuid.uuid4())
	doc = {
		"_id": user_id,
		"email": body.email,
		"name": body.name,
		"password_hash": hash_password(body.password),
		"is_active": True,
		"created_at": now,
		"updated_at": now,
	}
	try:
		await users.insert_one(doc)
	except Exception:
		raise HTTPException(status_code=503, detail="Database unavailable. Please try again later.")

	token = create_access_token(user_id, {"email": body.email})
	return TokenResponse(access_token=token, user=_doc_to_public(doc))


@router.post("/signin", response_model=TokenResponse)
async def signin(body: UserLogin):
	try:
		db = await get_db()
		user = await db.users.find_one({"email": body.email})
	except Exception:
		raise HTTPException(status_code=503, detail="Database unavailable. Please try again later.")
	if not user or not verify_password(body.password, user.get("password_hash", "")):
		raise HTTPException(status_code=400, detail="Invalid credentials")
	token = create_access_token(str(user["_id"]), {"email": user["email"]})
	return TokenResponse(access_token=token, user=_doc_to_public(user))


@router.get("/me", response_model=UserPublic)
async def me(current_user: UserPublic = Depends(get_current_user)):
	return current_user

