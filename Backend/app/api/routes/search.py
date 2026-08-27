from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
import uuid
from typing import List, Dict, Any, Optional

from app.core.database import get_db
from app.core.logging import get_logger
from app.models import Case, Entity, Artifact, Wallet, Evidence, OSINTRecord
from app.schemas import SearchResponse, SearchResult, ErrorResponse

router = APIRouter(prefix="/search", tags=["search"])
logger = get_logger(__name__)


@router.get("", response_model=SearchResponse, responses={400: {"model": ErrorResponse}})
async def global_search(
    request: Request,
    q: str = Query(..., min_length=1, max_length=200),
    type_filter: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    
    query_lower = f"%{q.lower()}%"
    results = {}
    total = 0
    
    if not type_filter or type_filter == "cases":
        case_query = select(Case).where(
            Case.investigator_id == current_user.id
        ).where(
            or_(
                Case.case_id.ilike(query_lower),
                Case.title.ilike(query_lower),
                Case.description.ilike(query_lower),
            )
        )
        case_result = await db.execute(case_query.limit(limit))
        cases = case_result.scalars().all()
        results["cases"] = [
            SearchResult(
                type="case",
                id=c.case_id,
                label=c.title,
                snippet=c.description[:100] if c.description else None,
                metadata={"status": c.status.value, "priority": c.priority.value}
            ) for c in cases
        ]
        total += len(results["cases"])
    
    if not type_filter or type_filter == "entities":
        entity_query = select(Entity).join(Case).where(
            Case.investigator_id == current_user.id
        ).where(
            or_(
                Entity.entity_id.ilike(query_lower),
                Entity.canonical_label.ilike(query_lower),
            )
        )
        entity_result = await db.execute(entity_query.limit(limit))
        entities = entity_result.scalars().all()
        results["entities"] = [
            SearchResult(
                type="entity",
                id=e.entity_id,
                label=e.canonical_label,
                snippet=f"Type: {e.type.value}, Confidence: {e.confidence}",
                metadata={"type": e.type.value, "confidence": e.confidence}
            ) for e in entities
        ]
        total += len(results["entities"])
    
    if not type_filter or type_filter == "artifacts":
        artifact_query = select(Artifact).join(Case).where(
            Case.investigator_id == current_user.id
        ).where(
            or_(
                Artifact.artifact_id.ilike(query_lower),
                Artifact.sha256.ilike(query_lower),
                Artifact.source_ref.ilike(query_lower),
            )
        )
        artifact_result = await db.execute(artifact_query.limit(limit))
        artifacts = artifact_result.scalars().all()
        results["artifacts"] = [
            SearchResult(
                type="artifact",
                id=a.artifact_id,
                label=f"{a.source_type.value}: {a.source_ref or 'N/A'}",
                snippet=f"SHA256: {a.sha256[:16]}...",
                metadata={"source_type": a.source_type.value, "sha256": a.sha256}
            ) for a in artifacts
        ]
        total += len(results["artifacts"])
    
    if not type_filter or type_filter == "wallets":
        wallet_query = select(Wallet).join(Case).where(
            Case.investigator_id == current_user.id
        ).where(
            or_(
                Wallet.wallet_id.ilike(query_lower),
                Wallet.address.ilike(query_lower),
                Wallet.label.ilike(query_lower),
            )
        )
        wallet_result = await db.execute(wallet_query.limit(limit))
        wallets = wallet_result.scalars().all()
        results["wallets"] = [
            SearchResult(
                type="wallet",
                id=w.wallet_id,
                label=w.label or w.address[:16] + "...",
                snippet=f"Address: {w.address}, Blockchain: {w.blockchain}",
                metadata={"address": w.address, "blockchain": w.blockchain, "cluster_id": w.cluster_id}
            ) for w in wallets
        ]
        total += len(results["wallets"])
    
    if not type_filter or type_filter == "evidence":
        evidence_query = select(Evidence).join(Artifact).join(Case).where(
            Case.investigator_id == current_user.id
        ).where(
            or_(
                Evidence.evidence_id.ilike(query_lower),
                Evidence.feature.ilike(query_lower),
                Evidence.explanation.ilike(query_lower),
            )
        )
        evidence_result = await db.execute(evidence_query.limit(limit))
        evidence = evidence_result.scalars().all()
        results["evidence"] = [
            SearchResult(
                type="evidence",
                id=e.evidence_id,
                label=e.feature,
                snippet=e.explanation[:100] if e.explanation else None,
                metadata={"signal_type": e.signal_type.value, "score": e.score, "confidence": e.confidence}
            ) for e in evidence
        ]
        total += len(results["evidence"])
    
    if not type_filter or type_filter == "osint":
        osint_query = select(OSINTRecord).join(Case).where(
            Case.investigator_id == current_user.id
        ).where(
            or_(
                OSINTRecord.record_id.ilike(query_lower),
                OSINTRecord.identifier.ilike(query_lower),
                OSINTRecord.source.ilike(query_lower),
            )
        )
        osint_result = await db.execute(osint_query.limit(limit))
        osint = osint_result.scalars().all()
        results["osint"] = [
            SearchResult(
                type="osint",
                id=o.record_id,
                label=o.identifier,
                snippet=f"Source: {o.source}, Score: {o.correlation_score}",
                metadata={"source": o.source, "match_type": o.match_type, "correlation_score": o.correlation_score}
            ) for o in osint
        ]
        total += len(results["osint"])
    
    return SearchResponse(
        results=results,
        total=total,
        query=q,
    )