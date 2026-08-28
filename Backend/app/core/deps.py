import uuid

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.models import User


def unauthorized(code: str, message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"code": code, "message": message, "request_id": str(uuid.uuid4())},
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    authorization = request.headers.get("Authorization", "").strip()
    scheme, separator, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not separator or not token or " " in token:
        raise unauthorized("UNAUTHORIZED", "Missing or invalid authorization header")

    token_data = decode_token(token)
    if not token_data:
        raise unauthorized("INVALID_TOKEN", "Invalid or expired token")

    result = await db.execute(select(User).where(User.investigator_id == token_data.investigator_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise unauthorized("USER_NOT_FOUND", "User not found or inactive")
    return user
