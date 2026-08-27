from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
import uuid
from datetime import datetime
from typing import List, Optional

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.logging import get_logger
from app.models import Case, User, AuditEvent, AuditEventType, CaseStatus, CasePriority, CaseClassification, Artifact, Entity, ConfidenceScore
from app.schemas import (
    CaseCreate, CaseUpdate, CaseResponse, CaseListResponse,
    ErrorResponse
)

router = APIRouter(prefix="/cases", tags=["cases"])
logger = get_logger(__name__)



@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED, responses={400: {"model": ErrorResponse}})
async def create_case(request: Request, case_data: CaseCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = Case(
        case_id=f"CASE-{uuid.uuid4().hex[:12].upper()}",
        title=case_data.title,
        description=case_data.description,
        investigator_id=current_user.id,
        authorization_ref=case_data.authorization_ref,
        priority=case_data.priority,
        classification=case_data.classification,
        status=CaseStatus.OPEN,
    )
    db.add(case)
    await db.flush()
    
    audit = AuditEvent(
        event_id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
        case_id=case.id,
        user_id=current_user.id,
        event_type=AuditEventType.CASE_CREATED,
        description=f"Case created: {case.case_id} - {case.title}",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(audit)
    await db.commit()
    await db.refresh(case)
    
    logger.info(f"Case created: {case.case_id} by {current_user.investigator_id}")
    return CaseResponse.model_validate(case)


@router.get("", response_model=CaseListResponse, responses={400: {"model": ErrorResponse}})
async def list_cases(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[CaseStatus] = Query(None, alias="status"),
    priority_filter: Optional[CasePriority] = Query(None, alias="priority"),
    classification_filter: Optional[CaseClassification] = Query(None, alias="classification"),
    q: Optional[str] = Query(None, description="Search case_id, title, description"),
    sort: str = Query("updated", description="Sort field: updated|created|confidence|evidence"),
    order: str = Query("desc", description="Sort order: asc|desc"),
    include_stats: bool = Query(False, description="Include aggregate stats (kept false by default for compat)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Base query scoped to current user
    query = select(Case).where(Case.investigator_id == current_user.id)

    if status_filter:
        query = query.where(Case.status == status_filter)
    if priority_filter:
        query = query.where(Case.priority == priority_filter)
    if classification_filter:
        query = query.where(Case.classification == classification_filter)
    if q:
        pattern = f"%{q}%"
        query = query.where(
            (Case.case_id.ilike(pattern)) |
            (Case.title.ilike(pattern)) |
            (Case.description.ilike(pattern)) |
            (Case.authorization_ref.ilike(pattern))
        )

    # total before pagination
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Sorting — for confidence/evidence we need post-fetch ordering
    needs_post_sort = sort in ("confidence", "evidence")
    if not needs_post_sort:
        if sort == "created":
            order_col = Case.created_at
        else:  # default updated
            order_col = Case.updated_at
        if order.lower() == "asc":
            query = query.order_by(order_col.asc())
        else:
            query = query.order_by(order_col.desc())
        query = query.offset((page - 1) * limit).limit(limit)
        result = await db.execute(query)
        cases = list(result.scalars().all())
    else:
        # fetch all matching then sort by computed aggregates (small case count, acceptable)
        result = await db.execute(query)
        cases_all = list(result.scalars().all())
        from app.models import Evidence
        scored = []
        for c in cases_all:
            e_res = await db.execute(select(func.count()).select_from(Evidence).join(Artifact, Evidence.artifact_id == Artifact.id).where(Artifact.case_id == c.id))
            e_cnt = e_res.scalar() or 0
            conf_res = await db.execute(select(ConfidenceScore).where(ConfidenceScore.case_id == c.id).order_by(desc(ConfidenceScore.created_at)).limit(1))
            conf_obj = conf_res.scalar_one_or_none()
            conf_val = conf_obj.overall_confidence if conf_obj else 0
            scored.append((c, conf_val, e_cnt))
        reverse = order.lower() != "asc"
        if sort == "confidence":
            scored.sort(key=lambda x: x[1], reverse=reverse)
        else:
            scored.sort(key=lambda x: x[2], reverse=reverse)
        start = (page - 1) * limit
        cases = [c for c, _, _ in scored[start:start+limit]]

    return CaseListResponse(
        cases=[CaseResponse.model_validate(c) for c in cases],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/{case_id}", response_model=CaseResponse, responses={404: {"model": ErrorResponse}})
async def get_case(request: Request, case_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Case).where(Case.case_id == case_id).where(Case.investigator_id == current_user.id)
    )
    case = result.scalar_one_or_none()
    
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CASE_NOT_FOUND", "message": "Case not found", "request_id": str(uuid.uuid4())},
        )
    
    audit = AuditEvent(
        event_id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
        case_id=case.id,
        user_id=current_user.id,
        event_type=AuditEventType.CASE_VIEWED,
        description=f"Case viewed: {case.case_id}",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(audit)
    await db.commit()
    
    return CaseResponse.model_validate(case)


@router.patch("/{case_id}", response_model=CaseResponse, responses={404: {"model": ErrorResponse}})
async def update_case(request: Request, case_id: str, case_data: CaseUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Case).where(Case.case_id == case_id).where(Case.investigator_id == current_user.id)
    )
    case = result.scalar_one_or_none()
    
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CASE_NOT_FOUND", "message": "Case not found", "request_id": str(uuid.uuid4())},
        )
    
    update_data = case_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(case, field, value)
    
    case.updated_at = datetime.utcnow()
    
    if case_data.status == CaseStatus.CLOSED and case.status != CaseStatus.CLOSED:
        case.closed_at = datetime.utcnow()
    
    audit = AuditEvent(
        event_id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
        case_id=case.id,
        user_id=current_user.id,
        event_type=AuditEventType.CASE_UPDATED,
        description=f"Case updated: {case.case_id}",
        event_metadata=str(update_data),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(audit)
    await db.commit()
    await db.refresh(case)
    
    logger.info(f"Case updated: {case.case_id} by {current_user.investigator_id}")
    return CaseResponse.model_validate(case)