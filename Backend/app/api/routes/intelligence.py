from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.logging import get_logger
from app.models import Case, IntelligenceJob, CollectionStatus
from app.schemas import IntelligenceJobResponse, ErrorResponse

router = APIRouter(tags=["intelligence"])
logger = get_logger(__name__)

# Synthetic demo jobs matching Frontend src/data/evidence.ts collectionJobs
SYNTHETIC_JOBS = [
    {"job_id": "COL-001", "source": "alias_database — authorized", "job_type": "OSINT alias sync", "status": CollectionStatus.COMPLETED, "progress": 100, "started_at": "2026-01-10T07:50:00", "completed_at": "2026-01-10T08:12:00", "results": 142, "authorized_by": "AUTH-2026-SYN-001"},
    {"job_id": "COL-002", "source": "domain_registry — authorized", "job_type": "Domain WHOIS harvest", "status": CollectionStatus.COMPLETED, "progress": 100, "started_at": "2026-01-10T08:20:00", "completed_at": "2026-01-10T08:45:00", "results": 87, "authorized_by": "AUTH-2026-SYN-001"},
    {"job_id": "COL-003", "source": "ethereum_node — authorized", "job_type": "Wallet cluster expansion", "status": CollectionStatus.RUNNING, "progress": 68, "started_at": "2026-01-15T02:20:00", "completed_at": None, "results": 14, "authorized_by": "AUTH-2026-SYN-001"},
    {"job_id": "COL-004", "source": "forum_scrape — authorized", "job_type": "Writing sample ingestion", "status": CollectionStatus.REQUIRES_REVIEW, "progress": 100, "started_at": "2026-01-12T09:00:00", "completed_at": "2026-01-12T09:40:00", "results": 6, "authorized_by": "AUTH-2026-SYN-001"},
    {"job_id": "COL-005", "source": "threat_intel_feed", "job_type": "Infrastructure fingerprint", "status": CollectionStatus.READY, "progress": 0, "started_at": None, "completed_at": None, "results": 0, "authorized_by": "Pending authorization"},
    {"job_id": "COL-006", "source": "phishing_kit_feed — authorized", "job_type": "Phishing kit pulls (KIT-2026-014)", "status": CollectionStatus.FAILED, "progress": 42, "started_at": "2026-01-27T18:30:00", "completed_at": "2026-01-27T18:33:00", "results": 3, "authorized_by": "AUTH-2026-MH-014"},
]

def _parse_dt(s):
    if s is None:
        return None
    try:
        return datetime.fromisoformat(s)
    except:
        return None

@router.get("/cases/{case_id}/intelligence", response_model=list[IntelligenceJobResponse], responses={404: {"model": ErrorResponse}})
async def list_intelligence_jobs(request: Request, case_id: str, db: AsyncSession = Depends(get_db)):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    result = await db.execute(select(Case).where(Case.case_id == case_id).where(Case.investigator_id == current_user.id))
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"code": "CASE_NOT_FOUND", "message": "Case not found", "request_id": str(uuid.uuid4())})

    result = await db.execute(select(IntelligenceJob).where(IntelligenceJob.case_id == case.id).order_by(IntelligenceJob.created_at.asc()))
    jobs = list(result.scalars().all())

    # Lazily seed synthetic jobs if none exist (production-quality fallback, idempotent per case)
    if not jobs:
        for j in SYNTHETIC_JOBS:
            # per-case unique job_id to avoid UQ collision across cases
            jid = j["job_id"] if case.case_id == "CASE-2026-001" else f"{j['job_id']}-{case.case_id[-3:]}"
            # check existing
            exists = await db.execute(select(IntelligenceJob).where(IntelligenceJob.job_id == jid))
            if exists.scalar_one_or_none():
                continue
            job = IntelligenceJob(
                job_id=jid,
                case_id=case.id,
                source=j["source"],
                job_type=j["job_type"],
                status=j["status"],
                progress=j["progress"],
                started_at=_parse_dt(j["started_at"]),
                completed_at=_parse_dt(j["completed_at"]),
                results=j["results"],
                authorized_by=j["authorized_by"],
                is_synthetic=True,
            )
            db.add(job)
        await db.commit()
        result = await db.execute(select(IntelligenceJob).where(IntelligenceJob.case_id == case.id).order_by(IntelligenceJob.created_at.asc()))
        jobs = list(result.scalars().all())

    return [IntelligenceJobResponse.model_validate(j) for j in jobs]
