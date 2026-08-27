from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
import uuid
from datetime import datetime
from typing import List, Optional

from app.core.database import get_db
from app.core.logging import get_logger
from app.models import Entity, Alias, Case, AuditEvent, AuditEventType, EntityType
from app.schemas import EntityCreate, EntityUpdate, EntityResponse, AliasResponse, ErrorResponse

router = APIRouter(tags=["entities"])
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


@router.post("/cases/{case_id}/entities", response_model=EntityResponse, status_code=status.HTTP_201_CREATED, responses={404: {"model": ErrorResponse}})
async def create_entity(request: Request, case_id: str, entity_data: EntityCreate, db: AsyncSession = Depends(get_db)):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    case = await get_case_or_404(case_id, current_user.id, db)
    
    entity = Entity(
        entity_id=f"ENT-{uuid.uuid4().hex[:12].upper()}",
        case_id=case.id,
        type=entity_data.type,
        canonical_label=entity_data.canonical_label,
        confidence=entity_data.confidence,
    )
    db.add(entity)
    await db.flush()
    
    audit = AuditEvent(
        event_id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
        case_id=case.id,
        user_id=current_user.id,
        event_type=AuditEventType.ENTITY_CREATED,
        description=f"Entity created: {entity.entity_id} ({entity.type.value}) - {entity.canonical_label}",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(audit)
    await db.commit()
    await db.refresh(entity)
    
    logger.info(f"Entity created: {entity.entity_id} for case {case.case_id}")
    return EntityResponse.model_validate(entity)


@router.get("/cases/{case_id}/entities", response_model=List[EntityResponse], responses={404: {"model": ErrorResponse}})
async def list_entities(
    request: Request,
    case_id: str,
    type_filter: Optional[EntityType] = Query(None, alias="type"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    case = await get_case_or_404(case_id, current_user.id, db)
    
    query = select(Entity).where(Entity.case_id == case.id)
    if type_filter:
        query = query.where(Entity.type == type_filter)
    
    result = await db.execute(
        query.options(selectinload(Entity.aliases))
        .order_by(desc(Entity.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
    )
    entities = result.scalars().all()
    
    return [EntityResponse.model_validate(e) for e in entities]


@router.get("/entities/{entity_id}", response_model=EntityResponse, responses={404: {"model": ErrorResponse}})
async def get_entity(request: Request, entity_id: str, db: AsyncSession = Depends(get_db)):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    
    result = await db.execute(
        select(Entity)
        .join(Case)
        .where(Entity.entity_id == entity_id)
        .where(Case.investigator_id == current_user.id)
        .options(selectinload(Entity.aliases))
    )
    entity = result.scalar_one_or_none()
    
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ENTITY_NOT_FOUND", "message": "Entity not found", "request_id": str(uuid.uuid4())},
        )
    
    return EntityResponse.model_validate(entity)


@router.patch("/entities/{entity_id}", response_model=EntityResponse, responses={404: {"model": ErrorResponse}})
async def update_entity(request: Request, entity_id: str, entity_data: EntityUpdate, db: AsyncSession = Depends(get_db)):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    
    result = await db.execute(
        select(Entity)
        .join(Case)
        .where(Entity.entity_id == entity_id)
        .where(Case.investigator_id == current_user.id)
    )
    entity = result.scalar_one_or_none()
    
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ENTITY_NOT_FOUND", "message": "Entity not found", "request_id": str(uuid.uuid4())},
        )
    
    update_data = entity_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(entity, field, value)
    
    entity.updated_at = datetime.utcnow()
    
    audit = AuditEvent(
        event_id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
        case_id=entity.case_id,
        user_id=current_user.id,
        event_type=AuditEventType.ENTITY_UPDATED,
        description=f"Entity updated: {entity.entity_id}",
        event_metadata=str(update_data),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(audit)
    await db.commit()
    await db.refresh(entity)
    
    logger.info(f"Entity updated: {entity.entity_id} by {current_user.investigator_id}")
    return EntityResponse.model_validate(entity)


@router.post("/entities/{entity_id}/aliases", response_model=AliasResponse, status_code=status.HTTP_201_CREATED, responses={404: {"model": ErrorResponse}})
async def add_alias(request: Request, entity_id: str, alias_value: str, source: Optional[str] = None, confidence: int = 0, db: AsyncSession = Depends(get_db)):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    
    result = await db.execute(
        select(Entity)
        .join(Case)
        .where(Entity.entity_id == entity_id)
        .where(Case.investigator_id == current_user.id)
    )
    entity = result.scalar_one_or_none()
    
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ENTITY_NOT_FOUND", "message": "Entity not found", "request_id": str(uuid.uuid4())},
        )
    
    alias = Alias(
        alias_id=f"ALS-{uuid.uuid4().hex[:12].upper()}",
        entity_id=entity.id,
        value=alias_value,
        source=source,
        confidence=confidence,
    )
    db.add(alias)
    await db.commit()
    await db.refresh(alias)
    
    return AliasResponse.model_validate(alias)