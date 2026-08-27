from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import uuid
from datetime import datetime
from typing import List, Optional

from app.core.database import get_db
from app.core.logging import get_logger
from app.models import Case, TimelineEvent, AuditEvent, AuditEventType, Entity
from app.schemas import TimelineEventResponse, ErrorResponse

router = APIRouter(tags=["timeline"])
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


@router.get("/cases/{case_id}/timeline", response_model=List[TimelineEventResponse], responses={404: {"model": ErrorResponse}})
async def get_timeline(
    request: Request,
    case_id: str,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    event_type: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    case = await get_case_or_404(case_id, current_user.id, db)
    
    query = select(TimelineEvent).where(TimelineEvent.case_id == case.id)
    
    if start_date:
        query = query.where(TimelineEvent.timestamp >= start_date)
    if end_date:
        query = query.where(TimelineEvent.timestamp <= end_date)
    if event_type:
        query = query.where(TimelineEvent.event_type == event_type)
    if entity_id:
        query = query.where(TimelineEvent.entity_id == entity_id)
    
    result = await db.execute(
        query.order_by(TimelineEvent.timestamp.asc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    events = result.scalars().all()
    
    return [TimelineEventResponse.model_validate(e) for e in events]


@router.post("/cases/{case_id}/timeline", response_model=TimelineEventResponse, status_code=status.HTTP_201_CREATED, responses={404: {"model": ErrorResponse}})
async def create_timeline_event(
    request: Request,
    case_id: str,
    timestamp: datetime,
    event_type: str,
    title: str,
    description: Optional[str] = None,
    source: Optional[str] = None,
    evidence_ids: Optional[List[str]] = None,
    entity_ids: Optional[List[str]] = None,
    db: AsyncSession = Depends(get_db),
):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    case = await get_case_or_404(case_id, current_user.id, db)
    
    entity_uuid = None
    if entity_ids:
        result = await db.execute(select(Entity).where(Entity.entity_id == entity_ids[0]).where(Entity.case_id == case.id))
        entity = result.scalar_one_or_none()
        if entity:
            entity_uuid = entity.id
    
    event = TimelineEvent(
        event_id=f"TL-{uuid.uuid4().hex[:12].upper()}",
        case_id=case.id,
        entity_id=entity_uuid,
        timestamp=timestamp,
        event_type=event_type,
        title=title,
        description=description,
        source=source,
        evidence_ids=",".join(evidence_ids) if evidence_ids else None,
        entity_ids=",".join(entity_ids) if entity_ids else None,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    
    return TimelineEventResponse.model_validate(event)