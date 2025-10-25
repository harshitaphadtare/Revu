import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

import logging
import hashlib

from jose import jwt
from jose.exceptions import ExpiredSignatureError, JWTClaimsError, JWTError
from passlib.context import CryptContext

logger = logging.getLogger(__name__)

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRES_MIN = int(os.getenv("JWT_EXPIRES_MIN", "60"))
JWT_AUD = os.getenv("JWT_AUD", None)
JWT_ISS = os.getenv("JWT_ISS", None)

# Warn if using insecure defaults
if secrets.compare_digest(JWT_SECRET, "dev-secret-change-me"):
    logger.warning("Using default JWT_SECRET; replace with a strong secret in production")

# Prefer Argon2 for new hashes; keep bcrypt for backward compatibility
pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")


def _normalize_for_bcrypt(password: str) -> str:
    """Ensure input length fits bcrypt's 72-byte limit.

    If the UTF-8 encoding of the password exceeds 72 bytes we deterministically
    pre-hash it with SHA-256 and prefix with 'sha256$' so verification uses the
    same canonical form. This prevents silent truncation and resulting security
    issues when using bcrypt for legacy hashes.

    Returns a string input suitable for passing to bcrypt/argon2.
    """
    if password is None:
        return ""
    try:
        b = password.encode("utf-8")
    except Exception:
        b = str(password).encode("utf-8", errors="ignore")
    if len(b) > 72:
        digest = hashlib.sha256(b).hexdigest()
        logger.warning("Password length >72 bytes: pre-hashing before bcrypt to avoid truncation.")
        return "sha256$" + digest
    return password


def hash_password(password: str) -> str:
    """Hash a password for storage.

    Uses the CryptContext preferred scheme (Argon2 by default). Long inputs are
    normalized to avoid bcrypt truncation problems.

    Returns the encoded hash string.
    """
    norm = _normalize_for_bcrypt(password)
    hashed = pwd_context.hash(norm)
    logger.debug("Password hashed using scheme=%s", pwd_context.default_scheme())
    return hashed


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a stored hash.

    Returns True if the password matches, False otherwise. Any internal
    verification errors are caught and logged; False is returned to avoid
    propagating unexpected exceptions into request handlers.
    """
    norm = _normalize_for_bcrypt(plain_password)
    try:
        return pwd_context.verify(norm, hashed_password)
    except Exception as e:
        logger.exception("Password verification failed: %s", str(e))
        return False

def create_access_token(subject: str, extra_claims: Optional[Dict[str, Any]] = None, expires_min: Optional[int] = None) -> str:
    """Create a signed JWT access token.

    subject: user identifier (sub claim)
    extra_claims: additional claims to include
    expires_min: optional override for token lifetime in minutes

    Returns the encoded JWT string.
    """
    ttl = expires_min if (expires_min is not None) else JWT_EXPIRES_MIN
    expire = datetime.now(timezone.utc) + timedelta(minutes=ttl)
    to_encode: Dict[str, Any] = {"sub": subject, "exp": expire}
    if JWT_AUD:
        to_encode["aud"] = JWT_AUD
    if JWT_ISS:
        to_encode["iss"] = JWT_ISS
    if extra_claims:
        to_encode.update(extra_claims)
    token = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    logger.info("Created access token for sub=%s, expires_in=%smin", subject, ttl)
    return token

def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT token.

    Raises ValueError with a clear message on failure. Logs specific errors for
    expired tokens and invalid claims to aid debugging.
    """
    try:
        options = {"verify_aud": bool(JWT_AUD)}
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM], options=options)
        return payload
    except ExpiredSignatureError as e:
        logger.warning("Token expired: %s", str(e))
        raise ValueError("Token expired") from e
    except JWTClaimsError as e:
        logger.warning("Invalid token claims: %s", str(e))
        raise ValueError("Invalid token claims") from e
    except JWTError as e:
        logger.warning("Invalid token: %s", str(e))
        raise ValueError("Invalid token") from e


def is_token_expired(token: str) -> bool:
    """Return True if token is expired, False otherwise.

    This helper performs a decode and specifically checks for expiry without
    raising. It returns False for other decode errors.
    """
    try:
        jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return False
    except ExpiredSignatureError:
        return True
    except Exception:
        return False
