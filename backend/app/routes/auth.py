import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from ..db.mongodb import get_db
from ..utils.security import (
	create_access_token,
	decode_token,
	hash_password,
	verify_password,
)
from ..schemas.user import (
	PasswordChangeRequest,
	TokenResponse,
	UserCreate,
	UserLogin,
	UserPublic,
	UserUpdate,
)

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/signin")
account_router = APIRouter(prefix="/api", tags=["account"])


def _doc_to_public(doc) -> UserPublic:
	return UserPublic(
		id=str(doc.get("_id")),
		email=doc["email"],
		name=doc.get("name"),
		is_active=bool(doc.get("is_active", True)),
		email_verified=doc.get("email_verified", True),
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


@account_router.patch("/me", response_model=UserPublic)
async def update_me(
	body: UserUpdate,
	current_user: UserPublic = Depends(get_current_user),
):
	db = await get_db()
	users = db.users
	user_doc = await users.find_one({"_id": current_user.id})
	if not user_doc:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

	updates: dict[str, Any] = {}
	now = datetime.now(timezone.utc)

	if body.name is not None and body.name != user_doc.get("name"):
		updates["name"] = body.name

	if body.email is not None and body.email != user_doc.get("email"):
		existing = await users.find_one({"email": body.email, "_id": {"$ne": current_user.id}})
		if existing:
			raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
		updates["email"] = body.email
		updates["email_verified"] = False

	if not updates:
		return _doc_to_public(user_doc)

	updates["updated_at"] = now
	await users.update_one({"_id": current_user.id}, {"$set": updates})
	updated_doc = await users.find_one({"_id": current_user.id})
	return _doc_to_public(updated_doc)


@account_router.post("/auth/change-password")
async def change_password(
	body: PasswordChangeRequest,
	current_user: UserPublic = Depends(get_current_user),
):
	db = await get_db()
	users = db.users
	user_doc = await users.find_one({"_id": current_user.id})
	if not user_doc:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

	if not verify_password(body.current_password, user_doc.get("password_hash", "")):
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
	if verify_password(body.new_password, user_doc.get("password_hash", "")):
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be different from current password")

	hashed = hash_password(body.new_password)
	now = datetime.now(timezone.utc)
	await users.update_one(
		{"_id": current_user.id},
		{"$set": {"password_hash": hashed, "updated_at": now}},
	)
	return {"detail": "Password updated successfully"}

