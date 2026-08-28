from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
import uuid

from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.core.logging import get_logger
from app.models import User, AuditEvent, AuditEventType
from app.schemas import LoginRequest, LoginResponse, InvestigatorResponse, ErrorResponse

router = APIRouter(prefix="/auth", tags=["authentication"])
logger = get_logger(__name__)


@router.post("/login", response_model=LoginResponse, responses={401: {"model": ErrorResponse}})
async def login(request: Request, credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.investigator_id == credentials.investigator_id))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(credentials.security_passphrase, user.hashed_password):
        audit = AuditEvent(
            event_id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
            user_id=user.id if user else None,
            event_type=AuditEventType.LOGIN,
            description=f"Failed login attempt for investigator_id: {credentials.investigator_id}",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        db.add(audit)
        await db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Invalid investigator ID or passphrase", "request_id": getattr(request.state, "request_id", str(uuid.uuid4()))},
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "ACCOUNT_DISABLED", "message": "Account is disabled", "request_id": getattr(request.state, "request_id", str(uuid.uuid4()))},
        )
    
    user.last_login = datetime.now(timezone.utc)
    
    access_token = create_access_token(
        data={"sub": user.investigator_id, "clearance": user.clearance_level},
        expires_delta=timedelta(minutes=settings.jwt_expire_minutes),
    )
    
    audit = AuditEvent(
        event_id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
        case_id=None,
        user_id=user.id,
        event_type=AuditEventType.LOGIN,
        description=f"Successful login for investigator: {user.investigator_id}",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(audit)
    await db.commit()
    
    logger.info(f"Investigator {user.investigator_id} logged in successfully")
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        investigator=InvestigatorResponse(
            id=str(user.id),
            investigator_id=user.investigator_id,
            full_name=user.full_name,
            email=user.email,
            clearance_level=user.clearance_level,
            is_active=user.is_active,
            created_at=user.created_at,
        ),
        clearance_level=user.clearance_level,
    )
