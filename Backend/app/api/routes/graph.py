from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any

from app.core.database import get_db
from app.adapters.neo4j_adapter import neo4j_adapter
from app.core.logging import get_logger
from app.models import Case, Entity, Wallet, AuditEvent, AuditEventType
from app.schemas import GraphResponse, GraphNode, GraphEdge, EntityType, ErrorResponse

router = APIRouter(tags=["graph"])
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


@router.get("/cases/{case_id}/graph", response_model=GraphResponse, responses={404: {"model": ErrorResponse}})
async def get_investigation_graph(
    request: Request,
    case_id: str,
    depth: int = Query(2, ge=1, le=5),
    limit: int = Query(500, ge=10, le=2000),
    relationship_types: Optional[str] = Query(None, description="Comma-separated relationship types e.g. ALIAS_REUSE,WRITING_SIMILARITY"),
    db: AsyncSession = Depends(get_db),
):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    case = await get_case_or_404(case_id, current_user.id, db)
    
    nodes = []
    edges = []
    
    # parse comma-separated relationship_types (preserve List support via comma split)
    rel_list: Optional[List[str]] = None
    if relationship_types:
        # support both comma string and repeated param edge case
        if isinstance(relationship_types, str):
            rel_list = [s.strip().upper() for s in relationship_types.split(",") if s.strip()]
        else:
            # fallback for legacy List[str]
            rel_list = [str(x).strip().upper() for x in relationship_types]  # type: ignore
        # normalize empty
        if rel_list and len(rel_list) == 1 and rel_list[0] == "":
            rel_list = None

    if neo4j_adapter.is_available:
        try:
            rel_filter = ""
            if rel_list:
                rel_types = "|".join(rel_list)
                rel_filter = f":{rel_types}"
            
            query = f"""
            MATCH (n)-[r{rel_filter}]-(m)
            WHERE n.case_id = $case_id AND m.case_id = $case_id
            RETURN n, r, m
            LIMIT $limit
            """
            
            results = await neo4j_adapter.execute_query(query, {"case_id": case_id, "limit": limit})
            
            node_map = {}
            for record in results:
                n = record.get("n", {})
                m = record.get("m", {})
                r = record.get("r", {})
                
                for node_data in [n, m]:
                    node_id = node_data.get("id") or node_data.get("entity_id") or node_data.get("wallet_id")
                    if node_id and node_id not in node_map:
                        node_map[node_id] = GraphNode(
                            id=node_id,
                            label=node_data.get("label") or node_data.get("canonical_label") or node_data.get("address") or node_id,
                            type=EntityType(node_data.get("type", "actor")),
                            properties={k: v for k, v in node_data.items() if k not in ["id", "label", "canonical_label", "address", "type"]},
                        )
                
                if r:
                    edges.append(GraphEdge(
                        id=r.get("id") or f"edge-{uuid.uuid4().hex[:8]}",
                        source=r.get("source") or n.get("id") or n.get("entity_id"),
                        target=r.get("target") or m.get("id") or m.get("entity_id"),
                        relationship_type=r.get("type") or r.get("relationship_type", "UNKNOWN"),
                        confidence=r.get("confidence", 50),
                        evidence_ids=r.get("evidence_ids", []),
                        properties={k: v for k, v in r.items() if k not in ["id", "source", "target", "type", "relationship_type", "confidence", "evidence_ids"]},
                    ))
            
            nodes = list(node_map.values())
            
        except Exception as e:
            logger.warning(f"Neo4j query failed, falling back to PostgreSQL: {e}")
    
    # Fallback PostgreSQL path + edge materialization from Evidence
    # Always ensure nodes are populated from PG, and edges materialized even if Neo4j returned nodes but no edges
    if not nodes:
        entities_result = await db.execute(select(Entity).where(Entity.case_id == case.id).limit(limit))
        entities = entities_result.scalars().all()
        for entity in entities:
            nodes.append(GraphNode(
                id=entity.entity_id,
                label=entity.canonical_label,
                type=entity.type,
                properties={"confidence": entity.confidence, "is_synthetic": entity.is_synthetic},
            ))
        wallets_result = await db.execute(select(Wallet).where(Wallet.case_id == case.id).limit(limit))
        wallets = wallets_result.scalars().all()
        for wallet in wallets:
            nodes.append(GraphNode(
                id=wallet.wallet_id,
                label=wallet.label or wallet.address[:12] + "...",
                type=EntityType.WALLET,
                properties={"address": wallet.address, "blockchain": wallet.blockchain, "risk_score": wallet.risk_score, "cluster_id": wallet.cluster_id},
            ))
    else:
        # nodes from Neo4j exist but we still need entity/wallet lookup for edge fallback if edges empty
        entities_result = await db.execute(select(Entity).where(Entity.case_id == case.id).limit(limit))
        entities = entities_result.scalars().all()
        wallets_result = await db.execute(select(Wallet).where(Wallet.case_id == case.id).limit(limit))
        wallets = wallets_result.scalars().all()

    # Materialize edges from Evidence if Neo4j gave none (or partial)
    if not edges:
        from app.models import Evidence, Artifact
        # evidence-derived edges: artifact -> entity
        ev_result = await db.execute(
            select(Evidence).join(Artifact, Evidence.artifact_id == Artifact.id).where(Artifact.case_id == case.id)
        )
        all_evidence = ev_result.scalars().all()
        # map id->artifact/entity for label resolution
        artifact_map = {}
        art_res = await db.execute(select(Artifact).where(Artifact.case_id == case.id))
        for a in art_res.scalars().all():
            artifact_map[str(a.id)] = a
        entity_map = {str(e.id): e for e in entities}
        for ev in all_evidence:
            if rel_list and ev.signal_type.value.upper() + "_LINK" not in rel_list and ev.signal_type.value.upper() not in rel_list:
                # allow filtering by raw signal upper or LINK variant
                # also check contains
                matched = False
                for rt in rel_list or []:
                    if rt in ev.signal_type.value.upper() or rt.replace("_LINK","") == ev.signal_type.value.upper():
                        matched = True
                        break
                    if rt == ev.signal_type.value.upper() + "_LINK":
                        matched = True
                        break
                if not matched and rel_list:
                    continue
            ent = entity_map.get(str(ev.entity_id)) if ev.entity_id else None
            art = artifact_map.get(str(ev.artifact_id))
            if art and ent:
                edges.append(GraphEdge(
                    id=f"EDGE-{ev.evidence_id}",
                    source=art.artifact_id,
                    target=ent.entity_id,
                    relationship_type=ev.signal_type.value.upper() + "_LINK",
                    confidence=ev.confidence or ev.score or 50,
                    evidence_ids=[ev.evidence_id],
                    properties={"feature": ev.feature, "score": ev.score},
                ))
            elif ent and not art:
                # fallback entity self-loop not needed
                pass
        # wallet cluster edges
        cluster_map: dict = {}
        for w in wallets:
            if w.cluster_id:
                cluster_map.setdefault(w.cluster_id, []).append(w)
        for cluster_id, ws in cluster_map.items():
            if len(ws) > 1:
                if rel_list and "WALLET_TRANSACTION" not in rel_list and "WALLET_LINK" not in rel_list:
                    continue
                for i in range(len(ws)-1):
                    edges.append(GraphEdge(
                        id=f"EDGE-CLUSTER-{cluster_id}-{i}",
                        source=ws[i].wallet_id,
                        target=ws[i+1].wallet_id,
                        relationship_type="WALLET_TRANSACTION",
                        confidence=70,
                        evidence_ids=[],
                        properties={"cluster_id": cluster_id},
                    ))
        # alias reuse synthetic edge if aliases exist
        # already covered via evidence; keep minimal for demo
    
    audit = AuditEvent(
        event_id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
        case_id=case.id,
        user_id=current_user.id,
        event_type=AuditEventType.GRAPH_VIEWED,
        description=f"Investigation graph viewed for case: {case.case_id}",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(audit)
    await db.commit()
    
    return GraphResponse(nodes=nodes, edges=edges)