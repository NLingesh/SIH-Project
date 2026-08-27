from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional

from app.core.database import get_db
from app.core.logging import get_logger
from app.models import Case, AuditEvent, AuditEventType
from app.schemas import AuditEventResponse, ErrorResponse

router = APIRouter(tags=["audit"])
logger = get_logger(__name__)


async def get_case_or_404(case_id: str, user_id, db: AsyncSession):
    from app.models import Case
    result = await db.execute(select(Case).where(Case.case_id == case_id).where(Case.investigator_id == user_id))
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CASE_NOT_FOUND", "message": "Case not found", "request_id": str(uuid.uuid4())},
        )
    return case


@router.get("/cases/{case_id}/audit", response_model=List[AuditEventResponse], responses={404: {"model": ErrorResponse}})
async def get_audit_log(
    request: Request,
    case_id: str,
    event_type: Optional[AuditEventType] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    from app.core.deps import get_current_user
    import uuid
    current_user = await get_current_user(request, db)
    case = await get_case_or_404(case_id, current_user.id, db)
    
    query = select(AuditEvent).where(AuditEvent.case_id == case.id)
    
    if event_type:
        query = query.where(AuditEvent.event_type == event_type)
    
    result = await db.execute(
        query.order_by(desc(AuditEvent.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
    )
    events = result.scalars().all()
    
    return [AuditEventResponse.model_validate(e) for e in events]