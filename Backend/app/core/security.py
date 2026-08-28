from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import uuid

from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from app.core.config import settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenData(BaseModel):
    investigator_id: str
    clearance_level: int
    exp: datetime


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except (ValueError, TypeError):
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.jwt_expire_minutes))
    to_encode = {**data, "exp": expire, "iat": datetime.now(timezone.utc), "jti": str(uuid.uuid4())}
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Optional[TokenData]:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        investigator_id = payload.get("sub")
        clearance_level = payload.get("clearance", 1)
        exp = payload.get("exp")
        if not investigator_id or exp is None:
            return None
        return TokenData(investigator_id=str(investigator_id), clearance_level=int(clearance_level), exp=datetime.fromtimestamp(float(exp), tz=timezone.utc))
    except (JWTError, TypeError, ValueError, OverflowError):
        return None
