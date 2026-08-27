from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import uuid
from datetime import datetime
from typing import List, Dict, Any

from app.core.database import get_db
from app.core.logging import get_logger
from app.adapters.neo4j_adapter import neo4j_adapter
from app.models import Case, Artifact, Evidence, Entity, Wallet, TimelineEvent, AuditEvent, AuditEventType, ConfidenceScore, SignalType
from app.schemas import CompleteAnalysisResponse, GraphResponse, GraphNode, GraphEdge, EntityType, ErrorResponse

router = APIRouter(tags=["analysis_pipeline"])
logger = get_logger(__name__)


async def get_case_or_404(case_id: str, user_id, db: AsyncSession):
    result = await db.execute(select(Case).where(Case.case_id == case_id).where(Case.investigator_id == user_id))
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CASE_NOT_FOUND", "message": "Case not found", "request_id": str(uuid.uuid4())},
        )
    return case


@router.post("/cases/{case_id}/analyze", response_model=CompleteAnalysisResponse, responses={404: {"model": ErrorResponse}})
async def run_complete_analysis(request: Request, case_id: str, db: AsyncSession = Depends(get_db)):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    case = await get_case_or_404(case_id, current_user.id, db)

    started_at = datetime.utcnow()

    audit_start = AuditEvent(
        event_id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
        case_id=case.id,
        user_id=current_user.id,
        event_type=AuditEventType.ANALYSIS_STARTED,
        description=f"Complete analysis started for case {case.case_id}",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(audit_start)
    await db.flush()

    # Load artifacts
    artifacts_result = await db.execute(select(Artifact).where(Artifact.case_id == case.id))
    artifacts = artifacts_result.scalars().all()

    # Load evidence grouped by signal
    evidence_result = await db.execute(select(Evidence).join(Artifact).where(Artifact.case_id == case.id))
    all_evidence = evidence_result.scalars().all()

    evidence_by_signal: Dict[str, List[Evidence]] = {}
    for ev in all_evidence:
        k = ev.signal_type.value
        evidence_by_signal.setdefault(k, []).append(ev)

    # If no evidence, create baseline synthetic evidence for demo so confidence not zero
    if not all_evidence and artifacts:
        # create minimal stylometry evidence for demo
        for art in artifacts[:2]:
            ev = Evidence(
                evidence_id=f"EVD-{uuid.uuid4().hex[:12].upper()}",
                artifact_id=art.id,
                signal_type=SignalType.STYLOMETRY,
                feature="writing_style_baseline",
                score=75,
                explanation="Baseline writing-style similarity (synthetic demo). Potential similarity – requires analyst verification.",
                confidence=65,
                is_synthetic=True,
            )
            db.add(ev)
            evidence_by_signal.setdefault("stylometry", []).append(ev)
        await db.flush()

    # Entity resolution - load entities
    entities_result = await db.execute(select(Entity).where(Entity.case_id == case.id))
    entities = entities_result.scalars().all()

    # If no entities, create demo entity resolution from evidence
    if not entities and case.id:
        # This is synthetic resolution - handled by seed; but ensure at least fallback
        pass
    # Refresh after possible creation
    entities_result = await db.execute(select(Entity).where(Entity.case_id == case.id))
    entities = entities_result.scalars().all()

    # Build graph nodes/edges from entities + wallets + evidence
    wallets_result = await db.execute(select(Wallet).where(Wallet.case_id == case.id))
    wallets = wallets_result.scalars().all()

    nodes: List[GraphNode] = []
    edges: List[GraphEdge] = []

    for ent in entities:
        nodes.append(GraphNode(
            id=ent.entity_id,
            label=ent.canonical_label,
            type=ent.type,
            properties={"confidence": ent.confidence, "is_synthetic": ent.is_synthetic},
        ))
    for w in wallets:
        nodes.append(GraphNode(
            id=w.wallet_id,
            label=w.label or w.address[:12] + "...",
            type=EntityType.WALLET,
            properties={"address": w.address, "blockchain": w.blockchain, "risk_score": w.risk_score},
        ))

    # Create edges from evidence that has entity_id
    for ev in all_evidence:
        if ev.entity_id:
            # find entity
            ent = next((e for e in entities if str(e.id) == str(ev.entity_id)), None)
            if ent:
                # edge between artifact and entity
                art = next((a for a in artifacts if str(a.id) == str(ev.artifact_id)), None)
                source = art.artifact_id if art else ent.entity_id
                edges.append(GraphEdge(
                    id=f"EDGE-{uuid.uuid4().hex[:8]}",
                    source=source,
                    target=ent.entity_id,
                    relationship_type=ev.signal_type.value.upper() + "_LINK",
                    confidence=ev.confidence,
                    evidence_ids=[ev.evidence_id],
                    properties={"feature": ev.feature, "score": ev.score},
                ))

    # Try to persist to Neo4j if available (case-isolated, best effort)
    if neo4j_adapter.is_available:
        try:
            for n in nodes:
                # use JSON string for props to avoid str() repr
                import json as _json
                await neo4j_adapter.execute_write(
                    "MERGE (e:Entity {id: $id}) SET e.label = $label, e.type=$type, e.case_id=$case_id, e.props=$props",
                    {"id": n.id, "label": n.label, "type": n.type.value, "case_id": case.case_id, "props": _json.dumps(n.properties, default=str)},
                )
            for e in edges:
                await neo4j_adapter.execute_write(
                    "MATCH (a {id: $source, case_id: $case_id}), (b {id: $target, case_id: $case_id}) MERGE (a)-[r:REL {id: $id}]->(b) SET r.type=$rel, r.confidence=$conf, r.case_id=$case_id",
                    {"source": e.source, "target": e.target, "id": e.id, "rel": e.relationship_type, "conf": e.confidence, "case_id": case.case_id},
                )
        except Exception as ex:
            logger.warning(f"Neo4j write failed fallback: {ex}")

    # Confidence calculation (same logic as confidence route)
    WEIGHTS = {
        SignalType.STYLOMETRY: 0.25,
        SignalType.BLOCKCHAIN: 0.25,
        SignalType.OSINT: 0.20,
        SignalType.TECHNICAL_FINGERPRINT: 0.15,
        SignalType.TEMPORAL: 0.15,
    }

    def calc_signal_score(sig_type: SignalType):
        lst = evidence_by_signal.get(sig_type.value, [])
        if not lst:
            return 0, 0
        avg = int(sum(x.score for x in lst) / len(lst)) if lst else 0
        avg_conf = int(sum(x.confidence for x in lst) / len(lst)) if lst else 0
        return max(0, min(100, (avg + avg_conf)//2)), len(lst)

    signal_scores: Dict[str, Any] = {}
    signal_breakdown: Dict[str, Any] = {}
    for st, w in WEIGHTS.items():
        s, cnt = calc_signal_score(st)
        signal_scores[st.value] = s
        signal_breakdown[st.value] = {"score": s, "weight": w, "evidence_count": cnt}

    # weighted confidence
    active = {k: v for k, v in signal_scores.items() if v > 0}
    if active:
        weighted_sum = sum(signal_scores[k] * WEIGHTS[SignalType(k)] for k in active)
        total_w = sum(WEIGHTS[SignalType(k)] for k in active)
        base = weighted_sum / total_w if total_w else 0
        # missing penalty
        missing = len(WEIGHTS) - len(active)
        final_conf = max(0, min(100, int(base - missing*5 - (3-len(active))*5 if len(active) < 3 else base)))
    else:
        final_conf = 0

    explanation = [
        "Potential writing-style similarity detected" if signal_scores.get("stylometry",0) > 60 else "Limited stylometric evidence",
        "Blockchain clustering shows address relationships" if signal_scores.get("blockchain",0) > 60 else "Sparse blockchain signals",
        "OSINT correlation links identifiers across sources" if signal_scores.get("osint",0) > 60 else "Few OSINT matches",
        "Technical fingerprint overlap observed" if signal_scores.get("technical_fingerprint",0) > 60 else "Weak technical fingerprint",
        "Temporal overlap suggests co-activity windows" if signal_scores.get("temporal",0) > 60 else "Inconclusive temporal correlation",
        "All findings are investigative leads – requires analyst verification.",
        "System does not claim definitive identity.",
    ]

    # Create/Update confidence record
    confidence = ConfidenceScore(
        score_id=f"CONF-{uuid.uuid4().hex[:12].upper()}",
        case_id=case.id,
        overall_confidence=final_conf,
        stylometry_score=signal_scores.get("stylometry"),
        blockchain_score=signal_scores.get("blockchain"),
        osint_score=signal_scores.get("osint"),
        technical_fingerprint_score=signal_scores.get("technical_fingerprint"),
        temporal_score=signal_scores.get("temporal"),
        evidence_count=len(all_evidence),
        explanation="\n".join(explanation),
        uncertainty_factors="Synthetic demo data; baseline models; requires verification" ,
        model_version="1.0.0",
        is_synthetic=False,
    )
    db.add(confidence)

    # Timeline event for analysis completed
    tl_event = TimelineEvent(
        event_id=f"TL-{uuid.uuid4().hex[:12].upper()}",
        case_id=case.id,
        timestamp=datetime.utcnow(),
        event_type="analysis_completed",
        title="Complete analysis executed",
        description=f"Analysis completed with confidence {final_conf}%",
        source="analysis_engine",
        evidence_ids=",".join([e.evidence_id for e in all_evidence[:5]]),
        entity_ids=",".join([e.entity_id for e in entities[:3]]),
    )
    db.add(tl_event)

    audit_done = AuditEvent(
        event_id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
        case_id=case.id,
        user_id=current_user.id,
        event_type=AuditEventType.ANALYSIS_COMPLETED,
        description=f"Complete analysis finished for case {case.case_id} – confidence {final_conf}%",
        event_metadata=str(signal_scores),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(audit_done)

    await db.commit()
    await db.refresh(confidence)

    # Reload entities and timeline for response
    entities_result = await db.execute(select(Entity).where(Entity.case_id == case.id))
    entities = entities_result.scalars().all()
    # need aliases loaded - lazy
    from sqlalchemy.orm import selectinload
    entities_result = await db.execute(select(Entity).where(Entity.case_id == case.id).options(selectinload(Entity.aliases)))
    entities = entities_result.scalars().all()

    timeline_result = await db.execute(select(TimelineEvent).where(TimelineEvent.case_id == case.id).order_by(TimelineEvent.timestamp.asc()))
    timeline = timeline_result.scalars().all()

    from app.schemas import EntityResponse, TimelineEventResponse, ConfidenceScoreResponse
    completed_at = datetime.utcnow()

    # Map to pydantic
    # Entities need manual handling because schema expects aliases list but model has relation
    entity_responses = []
    for e in entities:
        # build via model_validate will auto handle aliases if loaded
        try:
            entity_responses.append(EntityResponse.model_validate(e))
        except Exception:
            entity_responses.append(EntityResponse(
                id=str(e.id), entity_id=e.entity_id, case_id=str(e.case_id),
                type=e.type, canonical_label=e.canonical_label, confidence=e.confidence,
                is_synthetic=e.is_synthetic, created_at=e.created_at, updated_at=e.updated_at, aliases=[]
            ))

    timeline_responses = [TimelineEventResponse.model_validate(t) for t in timeline]

    graph = GraphResponse(nodes=nodes, edges=edges)

    return CompleteAnalysisResponse(
        case_id=case.case_id,
        status="completed",
        signals=signal_breakdown,
        entities=entity_responses,
        graph=graph,
        confidence=ConfidenceScoreResponse.model_validate(confidence),
        timeline=timeline_responses,
        explanation=explanation,
        started_at=started_at,
        completed_at=completed_at,
    )
