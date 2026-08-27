from fastapi import APIRouter, Depends, HTTPException, status, Request, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
import uuid
import hashlib
import os
import aiofiles
from datetime import datetime
from typing import List, Optional

from app.core.database import get_db
from app.core.config import settings
from app.core.logging import get_logger
from app.models import Artifact, Case, Evidence, AuditEvent, AuditEventType
from app.schemas import ArtifactCreate, ArtifactResponse, EvidenceResponse, ErrorResponse

router = APIRouter(tags=["artifacts"])
logger = get_logger(__name__)


async def get_case_or_404(case_id: str, user_id, db: AsyncSession) -> Case:
    from app.models import Case
    result = await db.execute(select(Case).where(Case.case_id == case_id).where(Case.investigator_id == user_id))
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CASE_NOT_FOUND", "message": "Case not found", "request_id": str(uuid.uuid4())},
        )
    return case


@router.post("/cases/{case_id}/artifacts", response_model=ArtifactResponse, status_code=status.HTTP_201_CREATED, responses={404: {"model": ErrorResponse}})
async def upload_artifact(
    request: Request,
    case_id: str,
    file: UploadFile = File(...),
    source_type: str = Form(...),
    source_ref: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    case = await get_case_or_404(case_id, current_user.id, db)
    
    content = await file.read()
    sha256_hash = hashlib.sha256(content).hexdigest()
    
    existing = await db.execute(select(Artifact).where(Artifact.sha256 == sha256_hash).where(Artifact.case_id == case.id))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "DUPLICATE_ARTIFACT", "message": "Artifact with this hash already exists in this case", "request_id": str(uuid.uuid4())},
        )
    
    upload_dir = settings.upload_dir
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{sha256_hash}_{file.filename}")
    
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)
    
    artifact = Artifact(
        artifact_id=f"ART-{uuid.uuid4().hex[:12].upper()}",
        case_id=case.id,
        source_type=source_type,
        source_ref=source_ref,
        sha256=sha256_hash,
        raw_location=file_path,
        normalized_location=file_path,
        mime_type=file.content_type,
        file_size=len(content),
    )
    db.add(artifact)
    await db.flush()
    
    audit = AuditEvent(
        event_id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
        case_id=case.id,
        user_id=current_user.id,
        event_type=AuditEventType.ARTIFACT_ADDED,
        description=f"Artifact uploaded: {artifact.artifact_id} ({file.filename})",
        event_metadata=f"sha256: {sha256_hash}, size: {len(content)}",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(audit)
    await db.commit()
    await db.refresh(artifact)
    
    logger.info(f"Artifact uploaded: {artifact.artifact_id} for case {case.case_id}")
    return ArtifactResponse.model_validate(artifact)


@router.get("/cases/{case_id}/artifacts", response_model=List[ArtifactResponse], responses={404: {"model": ErrorResponse}})
async def list_artifacts(
    request: Request,
    case_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    case = await get_case_or_404(case_id, current_user.id, db)
    
    result = await db.execute(
        select(Artifact)
        .where(Artifact.case_id == case.id)
        .order_by(desc(Artifact.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
    )
    artifacts = result.scalars().all()
    
    return [ArtifactResponse.model_validate(a) for a in artifacts]


@router.get("/artifacts/{artifact_id}", response_model=ArtifactResponse, responses={404: {"model": ErrorResponse}})
async def get_artifact(request: Request, artifact_id: str, db: AsyncSession = Depends(get_db)):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    
    result = await db.execute(
        select(Artifact)
        .join(Case)
        .where(Artifact.artifact_id == artifact_id)
        .where(Case.investigator_id == current_user.id)
    )
    artifact = result.scalar_one_or_none()
    
    if not artifact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ARTIFACT_NOT_FOUND", "message": "Artifact not found", "request_id": str(uuid.uuid4())},
        )
    
    return ArtifactResponse.model_validate(artifact)


@router.get("/cases/{case_id}/artifacts/{artifact_id}/evidence", response_model=List[EvidenceResponse], responses={404: {"model": ErrorResponse}})
async def get_artifact_evidence(request: Request, case_id: str, artifact_id: str, db: AsyncSession = Depends(get_db)):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    case = await get_case_or_404(case_id, current_user.id, db)
    
    result = await db.execute(
        select(Evidence)
        .join(Artifact)
        .where(Artifact.artifact_id == artifact_id)
        .where(Artifact.case_id == case.id)
    )
    evidence_list = result.scalars().all()
    
    return [EvidenceResponse.model_validate(e) for e in evidence_list]