from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from datetime import datetime
from typing import List, Optional

from app.core.database import get_db
from app.core.logging import get_logger
from app.models import Case, Review, Evidence, Artifact, AuditEvent, AuditEventType, ReviewDecision
from app.schemas import ReviewCreate, ReviewResponse, ReviewEnrichedResponse, ErrorResponse

router = APIRouter(tags=["review"])
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


@router.post("/cases/{case_id}/review", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED, responses={404: {"model": ErrorResponse}})
async def create_review(request: Request, case_id: str, review_data: ReviewCreate, db: AsyncSession = Depends(get_db)):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    case = await get_case_or_404(case_id, current_user.id, db)
    
    if review_data.related_evidence_ids:
        for ev_id in review_data.related_evidence_ids:
            result = await db.execute(
                select(Evidence).join(Artifact).where(Evidence.evidence_id == ev_id).where(Artifact.case_id == case.id)
            )
            if not result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"code": "INVALID_EVIDENCE", "message": f"Evidence {ev_id} not found in this case", "request_id": str(uuid.uuid4())},
                )
    
    review = Review(
        review_id=f"REV-{uuid.uuid4().hex[:12].upper()}",
        case_id=case.id,
        reviewer_id=current_user.id,
        decision=review_data.decision,
        notes=review_data.notes,
        related_evidence_ids=",".join(review_data.related_evidence_ids) if review_data.related_evidence_ids else None,
    )
    db.add(review)
    await db.flush()
    
    audit = AuditEvent(
        event_id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
        case_id=case.id,
        user_id=current_user.id,
        event_type=AuditEventType.REVIEW_CREATED,
        description=f"Review created: {review.decision.value} for case {case.case_id}",
        event_metadata=f"notes: {review_data.notes[:100] if review_data.notes else 'none'}, evidence: {review_data.related_evidence_ids}",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(audit)
    await db.commit()
    await db.refresh(review)
    
    logger.info(f"Review created: {review.review_id} by {current_user.investigator_id} for case {case.case_id}")
    return ReviewResponse.model_validate(review)


@router.get("/cases/{case_id}/reviews", response_model=List[ReviewEnrichedResponse], responses={404: {"model": ErrorResponse}})
async def list_reviews(request: Request, case_id: str, db: AsyncSession = Depends(get_db)):
    from app.core.deps import get_current_user
    from app.models import Entity
    current_user = await get_current_user(request, db)
    case = await get_case_or_404(case_id, current_user.id, db)

    result = await db.execute(select(Review).where(Review.case_id == case.id).order_by(Review.created_at.desc()))
    reviews = result.scalars().all()

    enriched = []
    for r in reviews:
        base = ReviewResponse.model_validate(r).model_dump()
        entity_label = None
        entity_type = None
        lead_type = r.decision.value  # fallback
        confidence = None
        signals: list[str] = []
        # derive from related evidence
        if r.related_evidence_ids:
            ev_ids = [s.strip() for s in r.related_evidence_ids.split(",") if s.strip()]
            for ev_id in ev_ids:
                ev_res = await db.execute(select(Evidence).where(Evidence.evidence_id == ev_id))
                ev = ev_res.scalar_one_or_none()
                if ev:
                    signals.append(ev.signal_type.value)
                    if not entity_label and ev.entity_id:
                        ent_res = await db.execute(select(Entity).where(Entity.id == ev.entity_id))
                        ent = ent_res.scalar_one_or_none()
                        if ent:
                            entity_label = ent.canonical_label
                            entity_type = ent.type.value
                            confidence = ent.confidence
                            lead_type = ev.feature or ev.signal_type.value
                    elif not entity_label:
                        lead_type = ev.feature or ev.signal_type.value
                        confidence = ev.confidence
        # fallback to first entity in case if no evidence
        if not entity_label:
            ent_res = await db.execute(select(Entity).where(Entity.case_id == case.id).limit(1))
            ent = ent_res.scalar_one_or_none()
            if ent:
                entity_label = ent.canonical_label
                entity_type = ent.type.value
                confidence = ent.confidence
                if not signals:
                    ev_res = await db.execute(select(Evidence).join(Artifact, Evidence.artifact_id == Artifact.id).where(Artifact.case_id == case.id).limit(1))
                    ev = ev_res.scalar_one_or_none()
                    if ev:
                        lead_type = ev.feature
                        signals = [ev.signal_type.value]
        enriched.append(ReviewEnrichedResponse(
            **base,
            entity_label=entity_label,
            entity_type=entity_type,
            lead_type=lead_type,
            confidence=confidence,
            signals=list(dict.fromkeys(signals)),
            submitted_at=r.created_at,
        ))
    return enriched


# Backward compatibility: singular path also routes to same handler
@router.get("/cases/{case_id}/review", response_model=List[ReviewEnrichedResponse], responses={404: {"model": ErrorResponse}}, include_in_schema=False)
async def list_reviews_singular(request: Request, case_id: str, db: AsyncSession = Depends(get_db)):
    return await list_reviews(request, case_id, db)