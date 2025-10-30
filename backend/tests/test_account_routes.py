import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.main import app
from backend.app.db.mongodb import get_db
from backend.app.utils.security import create_access_token, hash_password, verify_password


class FakeUsersCollection:
	def __init__(self):
		self.docs: dict[str, dict] = {}

	@staticmethod
	def _matches(doc: dict, query: dict) -> bool:
		for key, value in query.items():
			if isinstance(value, dict) and "$ne" in value:
				if doc.get(key) == value["$ne"]:
					return False
			elif doc.get(key) != value:
				return False
		return True

	async def find_one(self, query: dict):
		for candidate in self.docs.values():
			if self._matches(candidate, query):
				return candidate
		return None

	async def insert_one(self, doc: dict):
		self.docs[str(doc["_id"])] = doc

	async def update_one(self, query: dict, update: dict):
		target = await self.find_one(query)
		if not target:
			return
		target.update(update.get("$set", {}))

	async def create_index(self, *_args, **_kwargs):
		return "email_index"


class FakeDatabase:
	def __init__(self):
		self.users = FakeUsersCollection()


@pytest.fixture(name="fake_db")
def fake_db_fixture():
	db = FakeDatabase()
	now = "2024-10-28T00:00:00Z"
	user_id = "user-1"
	db.users.docs[user_id] = {
		"_id": user_id,
		"email": "current@example.com",
		"name": "Current Name",
		"password_hash": hash_password("current-password"),
		"is_active": True,
		"email_verified": True,
		"created_at": now,
		"updated_at": now,
	}
	other_id = "user-2"
	db.users.docs[other_id] = {
		"_id": other_id,
		"email": "taken@example.com",
		"name": "Taken",
		"password_hash": hash_password("password-2"),
		"is_active": True,
		"email_verified": True,
		"created_at": now,
		"updated_at": now,
	}
	return db


@pytest.fixture(autouse=True)
def override_dependencies(fake_db, monkeypatch):
	async def _get_db():
		return fake_db

	async def _init_db():
		return None

	app.dependency_overrides[get_db] = _get_db
	monkeypatch.setattr("backend.app.routes.auth.get_db", _get_db)
	monkeypatch.setattr("backend.app.main.init_db", _init_db)
	yield
	app.dependency_overrides.clear()


def _auth_headers(user_id: str, email: str):
	token = create_access_token(user_id, {"email": email})
	return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_update_profile_changes_email_and_name(fake_db):
	headers = _auth_headers("user-1", "current@example.com")
	transport = ASGITransport(app=app)
	async with AsyncClient(transport=transport, base_url="http://test") as client:
		res = await client.patch(
			"/api/me",
			json={"name": "New Name", "email": "fresh@example.com"},
			headers=headers,
		)
	assert res.status_code == 200
	body = res.json()
	assert body["name"] == "New Name"
	assert body["email"] == "fresh@example.com"
	assert body["email_verified"] is False
	stored = fake_db.users.docs["user-1"]
	assert stored["name"] == "New Name"
	assert stored["email"] == "fresh@example.com"
	assert stored["email_verified"] is False


@pytest.mark.asyncio
async def test_update_profile_rejects_duplicate_email():
	headers = _auth_headers("user-1", "current@example.com")
	transport = ASGITransport(app=app)
	async with AsyncClient(transport=transport, base_url="http://test") as client:
		res = await client.patch(
			"/api/me",
			json={"email": "taken@example.com"},
			headers=headers,
		)
	assert res.status_code == 400
	assert res.json()["detail"] == "Email already registered"


@pytest.mark.asyncio
async def test_change_password_updates_hash(fake_db):
	headers = _auth_headers("user-1", "current@example.com")
	transport = ASGITransport(app=app)
	async with AsyncClient(transport=transport, base_url="http://test") as client:
		res = await client.post(
			"/api/auth/change-password",
			json={"current_password": "current-password", "new_password": "new-secure-password"},
			headers=headers,
		)
	assert res.status_code == 200
	assert res.json()["detail"] == "Password updated successfully"
	stored = fake_db.users.docs["user-1"]
	assert verify_password("new-secure-password", stored["password_hash"])
	assert not verify_password("current-password", stored["password_hash"])


@pytest.mark.asyncio
async def test_change_password_requires_current_password():
	headers = _auth_headers("user-1", "current@example.com")
	transport = ASGITransport(app=app)
	async with AsyncClient(transport=transport, base_url="http://test") as client:
		res = await client.post(
			"/api/auth/change-password",
			json={"current_password": "wrong-password", "new_password": "new-secure-password"},
			headers=headers,
		)
	assert res.status_code == 400
	assert res.json()["detail"] == "Current password is incorrect"
