import os
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import certifi

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "revu")

_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None

def _needs_tls_ca(uri: str) -> bool:
    u = (uri or "").lower()
    return (
        u.startswith("mongodb+srv://")
        or "mongodb.net" in u
        or "tls=true" in u
        or "ssl=true" in u
    )


async def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        # For Atlas/SSL URIs, provide a CA bundle so TLS handshake succeeds in containers
        if _needs_tls_ca(MONGO_URI):
            _client = AsyncIOMotorClient(MONGO_URI, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=30000)
        else:
            _client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=30000)
    return _client

async def get_db() -> AsyncIOMotorDatabase:
    global _db
    if _db is None:
        client = await get_client()
        _db = client[MONGO_DB]
    return _db

async def init_db() -> None:
    """Create necessary indexes (unique constraints) on collections."""
    db = await get_db()
    # users collection indexes
    await db.users.create_index("email", unique=True)
