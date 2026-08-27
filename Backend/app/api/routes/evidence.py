from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import uuid
from datetime import datetime
from typing import List, Optional

from app.core.database import get_db
from app.core.logging import get_logger
from app.models import Evidence, Artifact, Entity, Case, AuditEvent, AuditEventType, SignalType
from app.schemas import EvidenceResponse, ErrorResponse

router = APIRouter(tags=["evidence"])
logger = get_logger(__name__)


async def _query_evidence(db: AsyncSession, current_user, case_id: Optional[str] = None, signal_type: Optional[SignalType] = None, entity_id: Optional[str] = None, page: int = 1, limit: int = 50):
    query = (
        select(Evidence)
        .join(Artifact)
        .join(Case)
        .where(Case.investigator_id == current_user.id)
    )
    if case_id:
        query = query.where(Case.case_id == case_id)
    if signal_type:
        query = query.where(Evidence.signal_type == signal_type)
    if entity_id:
        query = query.where(Evidence.entity_id == entity_id)
    result = await db.execute(
        query.order_by(desc(Evidence.created_at)).offset((page - 1) * limit).limit(limit)
    )
    return result.scalars().all()


@router.get("/evidence", response_model=List[EvidenceResponse])
async def list_evidence(
    request: Request,
    case_id: Optional[str] = Query(None),
    signal_type: Optional[SignalType] = Query(None),
    entity_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    evidence_list = await _query_evidence(db, current_user, case_id, signal_type, entity_id, page, limit)
    return [EvidenceResponse.model_validate(e) for e in evidence_list]


@router.get("/cases/{case_id}/evidence", response_model=List[EvidenceResponse], responses={404: {"model": ErrorResponse}})
async def list_case_evidence(
    request: Request,
    case_id: str,
    signal_type: Optional[SignalType] = Query(None),
    entity_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    # validate case ownership
    result = await db.execute(select(Case).where(Case.case_id == case_id).where(Case.investigator_id == current_user.id))
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"code": "CASE_NOT_FOUND", "message": "Case not found", "request_id": str(uuid.uuid4())})
    evidence_list = await _query_evidence(db, current_user, case_id, signal_type, entity_id, page, limit)
    return [EvidenceResponse.model_validate(e) for e in evidence_list]


@router.get("/evidence/{evidence_id}", response_model=EvidenceResponse, responses={404: {"model": ErrorResponse}})
async def get_evidence(request: Request, evidence_id: str, db: AsyncSession = Depends(get_db)):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    
    result = await db.execute(
        select(Evidence)
        .join(Artifact)
        .join(Case)
        .where(Evidence.evidence_id == evidence_id)
        .where(Case.investigator_id == current_user.id)
    )
    evidence = result.scalar_one_or_none()
    
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "EVIDENCE_NOT_FOUND", "message": "Evidence not found", "request_id": str(uuid.uuid4())},
        )
    
    return EvidenceResponse.model_validate(evidence)


@router.patch("/evidence/{evidence_id}/notes", response_model=EvidenceResponse, responses={404: {"model": ErrorResponse}})
async def update_evidence_notes(request: Request, evidence_id: str, notes: str, db: AsyncSession = Depends(get_db)):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    
    result = await db.execute(
        select(Evidence)
        .join(Artifact)
        .join(Case)
        .where(Evidence.evidence_id == evidence_id)
        .where(Case.investigator_id == current_user.id)
    )
    evidence = result.scalar_one_or_none()
    
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "EVIDENCE_NOT_FOUND", "message": "Evidence not found", "request_id": str(uuid.uuid4())},
        )
    
    evidence.analyst_notes = notes
    
    audit = AuditEvent(
        event_id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
        case_id=evidence.artifact.case_id,
        user_id=current_user.id,
        event_type=AuditEventType.EVIDENCE_VIEWED,
        description=f"Evidence notes updated: {evidence.evidence_id}",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(audit)
    await db.commit()
    await db.refresh(evidence)
    
    return EvidenceResponse.model_validate(evidence)