import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

import config

PBKDF2_ITERATIONS = 600_000

bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password):
    """Return 'pbkdf2_sha256$iterations$salt$hash' using a random salt."""
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${digest.hex()}"


def verify_password(password, stored):
    try:
        algorithm, iterations, salt, expected = stored.split("$")
        iterations = int(iterations)
    except (ValueError, AttributeError):
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), iterations)
    return hmac.compare_digest(digest.hex(), expected)


def create_access_token(username):
    expires = datetime.now(timezone.utc) + timedelta(minutes=config.JWT_EXPIRE_MINUTES)
    return jwt.encode({"sub": username, "exp": expires}, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    """FastAPI dependency: return the username from a valid Bearer token, else 401."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated. Please log in.")
    try:
        payload = jwt.decode(credentials.credentials, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token. Please log in again.")

    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token. Please log in again.")
    return username
