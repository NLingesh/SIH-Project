from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

from fastapi.responses import Response
from app.core.database import get_db
from app.core.logging import get_logger
from app.adapters.neo4j_adapter import neo4j_adapter
from app.models import (
    Case, Artifact, Evidence, Entity, Wallet, Transaction,
    TimelineEvent, Review, ConfidenceScore, OSINTRecord, AuditEvent
)
from app.schemas import ReportRequest, ReportResponse, GraphEdge, ErrorResponse

router = APIRouter(tags=["reports"])
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


async def _build_relationships(case, db: AsyncSession) -> list[GraphEdge]:
    """Reuse graph fallback logic: evidence-derived + wallet cluster edges, with Neo4j if available."""
    from sqlalchemy import select as _select
    edges: list[GraphEdge] = []
    # Try Neo4j first
    if neo4j_adapter.is_available:
        try:
            query = "MATCH (n)-[r]-(m) WHERE n.case_id = $case_id AND m.case_id = $case_id RETURN n,r,m LIMIT 200"
            results = await neo4j_adapter.execute_query(query, {"case_id": case.case_id})
            for record in results:
                r = record.get("r", {})
                n = record.get("n", {})
                m = record.get("m", {})
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
            if edges:
                return edges
        except Exception as e:
            logger.warning(f"Neo4j report relationships fallback: {e}")

    # PG fallback: evidence -> entity edges
    ev_res = await db.execute(select(Evidence).join(Artifact, Evidence.artifact_id == Artifact.id).where(Artifact.case_id == case.id))
    all_evidence = ev_res.scalars().all()
    art_res = await db.execute(select(Artifact).where(Artifact.case_id == case.id))
    artifact_map = {str(a.id): a for a in art_res.scalars().all()}
    ent_res = await db.execute(select(Entity).where(Entity.case_id == case.id))
    entity_map = {str(e.id): e for e in ent_res.scalars().all()}
    wallet_res = await db.execute(select(Wallet).where(Wallet.case_id == case.id))
    wallets = list(wallet_res.scalars().all())

    for ev in all_evidence:
        art = artifact_map.get(str(ev.artifact_id))
        ent = entity_map.get(str(ev.entity_id)) if ev.entity_id else None
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
    # wallet cluster
    cluster_map: dict = {}
    for w in wallets:
        if w.cluster_id:
            cluster_map.setdefault(w.cluster_id, []).append(w)
    for cluster_id, ws in cluster_map.items():
        if len(ws) > 1:
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
    return edges


@router.post("/cases/{case_id}/report", response_model=ReportResponse, responses={404: {"model": ErrorResponse}})
async def generate_report(request: Request, case_id: str, report_request: ReportRequest, db: AsyncSession = Depends(get_db)):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    case = await get_case_or_404(case_id, current_user.id, db)
    
    artifacts_result = await db.execute(select(Artifact).where(Artifact.case_id == case.id))
    artifacts = artifacts_result.scalars().all()
    
    evidence_result = await db.execute(
        select(Evidence).join(Artifact).where(Artifact.case_id == case.id)
    )
    evidence = evidence_result.scalars().all()
    
    entities_result = await db.execute(select(Entity).where(Entity.case_id == case.id))
    entities = entities_result.scalars().all()
    
    wallets_result = await db.execute(select(Wallet).where(Wallet.case_id == case.id))
    wallets = wallets_result.scalars().all()
    
    timeline_result = await db.execute(
        select(TimelineEvent).where(TimelineEvent.case_id == case.id).order_by(TimelineEvent.timestamp.asc())
    )
    timeline = timeline_result.scalars().all()
    
    reviews_result = await db.execute(select(Review).where(Review.case_id == case.id))
    reviews = reviews_result.scalars().all()
    
    confidence_result = await db.execute(
        select(ConfidenceScore).where(ConfidenceScore.case_id == case.id).order_by(desc(ConfidenceScore.created_at)).limit(1)
    )
    confidence = confidence_result.scalar_one_or_none()
    
    osint_result = await db.execute(select(OSINTRecord).where(OSINTRecord.case_id == case.id))
    osint_records = osint_result.scalars().all()
    
    audit_result = await db.execute(select(AuditEvent).where(AuditEvent.case_id == case.id).order_by(AuditEvent.created_at.desc()).limit(50))
    audit_events = audit_result.scalars().all()
    
    evidence_by_signal = {}
    for e in evidence:
        signal = e.signal_type.value
        if signal not in evidence_by_signal:
            evidence_by_signal[signal] = []
        evidence_by_signal[signal].append(e)
    
    signal_scores = {}
    for signal, ev_list in evidence_by_signal.items():
        if ev_list:
            signal_scores[signal] = int(sum(e.score for e in ev_list if e.score) / len([e for e in ev_list if e.score]))
        else:
            signal_scores[signal] = 0
    
    report = ReportResponse(
        case_info={
            "case_id": case.case_id,
            "title": case.title,
            "description": case.description,
            "status": case.status.value,
            "priority": case.priority.value,
            "classification": case.classification.value,
            "investigator": current_user.investigator_id,
            "authorization_ref": case.authorization_ref,
            "created_at": case.created_at.isoformat(),
            "updated_at": case.updated_at.isoformat(),
        },
        investigation_scope=f"Investigation of {case.title} (Case ID: {case.case_id})",
        artifact_summary={
            "total_artifacts": len(artifacts),
            "by_source_type": {},
            "total_size_bytes": sum(a.file_size or 0 for a in artifacts),
        },
        evidence_summary={
            "total_evidence": len(evidence),
            "by_signal_type": {k: len(v) for k, v in evidence_by_signal.items()},
            "avg_confidence": int(sum(e.confidence for e in evidence) / len(evidence)) if evidence else 0,
        },
        entities=[{
            "entity_id": e.entity_id,
            "type": e.type.value,
            "canonical_label": e.canonical_label,
            "confidence": e.confidence,
        } for e in entities],
        relationships=await _build_relationships(case, db),
        signal_scores=signal_scores,
        confidence_explanation={
            "overall_confidence": confidence.overall_confidence if confidence else 0,
            "signal_breakdown": {
                "stylometry": confidence.stylometry_score if confidence else None,
                "blockchain": confidence.blockchain_score if confidence else None,
                "osint": confidence.osint_score if confidence else None,
                "technical_fingerprint": confidence.technical_fingerprint_score if confidence else None,
                "temporal": confidence.temporal_score if confidence else None,
            },
            "explanation": confidence.explanation if confidence else "No confidence analysis available",
            "uncertainty_factors": confidence.uncertainty_factors if confidence else None,
            "evidence_count": confidence.evidence_count if confidence else len(evidence),
            "model_version": confidence.model_version if confidence else "1.0.0",
        },
        timeline=[{
            "event_id": t.event_id,
            "timestamp": t.timestamp.isoformat(),
            "event_type": t.event_type,
            "title": t.title,
            "description": t.description,
            "source": t.source,
        } for t in timeline],
        limitations=[
            "All analysis based on synthetic/demonstration data",
            "Stylometry analysis uses baseline implementation - not calibrated for production",
            "OSINT correlations use local synthetic database only",
            "Blockchain analytics use synthetic transaction data",
            "Technical fingerprints can be spoofed - not definitive identification",
            "Confidence scoring uses heuristic weights - requires analyst validation",
            "Entity resolution is probabilistic - not definitive attribution",
        ],
        review_status={
            "total_reviews": len(reviews),
            "decisions": {r.decision.value: len([rv for rv in reviews if rv.decision == r.decision]) for r in reviews},
            "last_review": reviews[-1].created_at.isoformat() if reviews else None,
        },
        audit_information={
            "total_audit_events": len(audit_events),
            "recent_events": [{
                "event_id": a.event_id,
                "event_type": a.event_type.value,
                "description": a.description,
                "timestamp": a.created_at.isoformat(),
            } for a in audit_events[:10]],
        },
        generated_at=datetime.utcnow(),
    )
    
    for artifact in artifacts:
        report.artifact_summary["by_source_type"][artifact.source_type.value] = \
            report.artifact_summary["by_source_type"].get(artifact.source_type.value, 0) + 1

    return report


def _build_pdf_bytes(case, report: ReportResponse) -> bytes:
    import io
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.lib.enums import TA_LEFT, TA_CENTER

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=14*mm, bottomMargin=14*mm, title=f"Report {case.case_id}")
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title2', parent=styles['Heading1'], fontSize=16, leading=18, textColor=colors.HexColor("#0f172a"), spaceAfter=2*mm)
    h1 = ParagraphStyle('H1', parent=styles['Heading2'], fontSize=10, leading=12, textColor=colors.white, backColor=colors.HexColor("#0f172a"), borderPadding=(4,6,4), spaceAfter=3*mm, spaceBefore=4*mm)
    h2 = ParagraphStyle('H2', parent=styles['Heading3'], fontSize=9, leading=11, textColor=colors.HexColor("#0f172a"), spaceAfter=2*mm)
    normal = ParagraphStyle('Normal2', parent=styles['Normal'], fontSize=8, leading=11, textColor=colors.HexColor("#334155"))
    mono = ParagraphStyle('Mono', parent=normal, fontName='Courier', fontSize=7, leading=9)
    small = ParagraphStyle('Small', parent=normal, fontSize=7, leading=9, textColor=colors.HexColor("#64748b"))

    story = []
    # Header
    story.append(Paragraph(f"DARKTRACE AI — ATLAS", ParagraphStyle('Brand', parent=normal, fontSize=7, textColor=colors.HexColor("#0ea5e9"), leading=9)))
    story.append(Paragraph(f"{report.case_info['title']}", title_style))
    story.append(Paragraph(f"{case.case_id} • {report.case_info['authorization_ref'] or ''} • {report.case_info['classification'].upper()} • SYNTHETIC / DEMONSTRATION DATA", small))
    story.append(HRFlowable(width="100%", thickness=0.7, color=colors.HexColor("#0f172a"), spaceBefore=2*mm, spaceAfter=3*mm))
    story.append(Paragraph("INVESTIGATION SUMMARY", h1))
    story.append(Paragraph(report.case_info.get('description') or report.investigation_scope, normal))
    story.append(Spacer(1, 3*mm))

    # Case info table
    info_data = [
        [Paragraph("<b>Case ID</b>", normal), Paragraph(report.case_info['case_id'], mono)],
        [Paragraph("<b>Status / Priority</b>", normal), Paragraph(f"{report.case_info['status']} / {report.case_info['priority']}", normal)],
        [Paragraph("<b>Investigator</b>", normal), Paragraph(report.case_info['investigator'], mono)],
        [Paragraph("<b>Generated</b>", normal), Paragraph(report.generated_at.isoformat(), mono)],
        [Paragraph("<b>Classification</b>", normal), Paragraph(report.case_info['classification'], normal)],
    ]
    t = Table(info_data, colWidths=[38*mm, 120*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor("#e2e8f0")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t)
    story.append(Spacer(1, 4*mm))

    # Stats
    story.append(Paragraph("ARTIFACT & EVIDENCE SUMMARY", h1))
    stats = [
        [Paragraph("<b>Artifacts</b>", normal), Paragraph(str(report.artifact_summary['total_artifacts']), normal), Paragraph(str(report.artifact_summary.get('total_size_bytes',0))+" bytes", small)],
        [Paragraph("<b>Evidence</b>", normal), Paragraph(str(report.evidence_summary['total_evidence']), normal), Paragraph(f"avg conf {report.evidence_summary['avg_confidence']}%", small)],
        [Paragraph("<b>Entities</b>", normal), Paragraph(str(len(report.entities)), normal), Paragraph(", ".join([e['type'] for e in report.entities[:3]]), small)],
        [Paragraph("<b>Relationships</b>", normal), Paragraph(str(len(report.relationships)), normal), Paragraph("evidence-derived + wallet clusters", small)],
    ]
    t2 = Table(stats, colWidths=[32*mm, 18*mm, 108*mm])
    t2.setStyle(TableStyle([('GRID', (0,0), (-1,-1), 0.4, colors.HexColor("#e2e8f0")), ('BACKGROUND', (0,0), (0,-1), colors.HexColor("#f8fafc"))]))
    story.append(t2)
    story.append(Spacer(1, 4*mm))

    # Signal scores
    story.append(Paragraph("SIGNAL ANALYSIS & CONFIDENCE", h1))
    sig_rows = [[Paragraph("<b>Signal</b>", small), Paragraph("<b>Score</b>", small), Paragraph("<b>Weight</b>", small)]]
    sig_map = {"stylometry": "25%", "blockchain": "25%", "osint": "20%", "technical_fingerprint": "15%", "temporal": "15%"}
    for k, v in report.signal_scores.items():
        sig_rows.append([Paragraph(k, normal), Paragraph(str(v), mono), Paragraph(sig_map.get(k,""), small)])
    t3 = Table(sig_rows, colWidths=[50*mm, 20*mm, 20*mm])
    t3.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")), ('TEXTCOLOR', (0,0), (-1,0), colors.white), ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor("#e2e8f0"))]))
    story.append(t3)
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(f"<b>Overall:</b> {report.confidence_explanation['overall_confidence']}% — Investigative lead", normal))
    story.append(Paragraph(report.confidence_explanation.get('explanation') or "", small))
    if report.confidence_explanation.get('uncertainty_factors'):
        story.append(Paragraph(f"<b>Uncertainty:</b> {report.confidence_explanation['uncertainty_factors']}", small))
    story.append(Spacer(1, 4*mm))

    # Entities
    story.append(Paragraph("ENTITIES", h1))
    ent_rows = [[Paragraph("<b>ID</b>", small), Paragraph("<b>Label</b>", small), Paragraph("<b>Type</b>", small), Paragraph("<b>Conf</b>", small)]]
    for e in report.entities[:15]:
        ent_rows.append([Paragraph(e['entity_id'][:14], mono), Paragraph(e['canonical_label'][:28], normal), Paragraph(e['type'], small), Paragraph(str(e['confidence'])+"%", mono)])
    if ent_rows:
        t4 = Table(ent_rows, colWidths=[32*mm, 68*mm, 28*mm, 16*mm])
        t4.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")), ('TEXTCOLOR', (0,0), (-1,0), colors.white), ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor("#e2e8f0")), ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")])]))
        story.append(t4)
    story.append(Spacer(1, 4*mm))

    # Timeline
    story.append(Paragraph("TIMELINE", h1))
    for ev in report.timeline[:12]:
        story.append(Paragraph(f"<b>{ev['timestamp'][:16]}</b> — {ev['title']} <font color='#64748b'>({ev['event_type']})</font>", normal))
        if ev.get('description'):
            story.append(Paragraph(ev['description'], small))
    story.append(Spacer(1, 4*mm))

    # Relationships
    story.append(Paragraph("RELATIONSHIPS (EVIDENCE-DERIVED)", h1))
    if report.relationships:
        rel_rows = [[Paragraph("<b>Source → Target</b>", small), Paragraph("<b>Type</b>", small), Paragraph("<b>Conf</b>", small)]]
        for rel in report.relationships[:15]:
            rel_rows.append([Paragraph(f"{rel.source[:12]} → {rel.target[:12]}", mono), Paragraph(rel.relationship_type, small), Paragraph(str(rel.confidence)+"%", mono)])
        t5 = Table(rel_rows, colWidths=[78*mm, 46*mm, 16*mm])
        t5.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")), ('TEXTCOLOR', (0,0), (-1,0), colors.white), ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor("#e2e8f0"))]))
        story.append(t5)
    else:
        story.append(Paragraph("No relationships materialized.", small))
    story.append(Spacer(1, 4*mm))

    # Limitations
    story.append(Paragraph("LIMITATIONS & RECOMMENDATIONS", h1))
    for lim in report.limitations[:8]:
        story.append(Paragraph(f"• {lim}", small))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("All findings are investigative leads requiring analyst verification. No definitive identity claim is made. SYNTHETIC / DEMONSTRATION DATA.", ParagraphStyle('Footer', parent=small, textColor=colors.HexColor("#b45309"), backColor=colors.HexColor("#fef3c7"), borderPadding=(4,6,4))))

    doc.build(story)
    return buf.getvalue()


@router.get("/cases/{case_id}/report", responses={404: {"model": ErrorResponse}})
async def get_report(request: Request, case_id: str, format: str = "json", db: AsyncSession = Depends(get_db)):
    from app.core.deps import get_current_user
    from fastapi import Query as _Q
    # allow ?format=pdf via query param (case-insensitive)
    fmt = (format or "json").lower()
    # also check raw query param if called as ?format=pdf
    qp_fmt = request.query_params.get("format")
    if qp_fmt:
        fmt = qp_fmt.lower()
    current_user = await get_current_user(request, db)
    case = await get_case_or_404(case_id, current_user.id, db)

    # reuse POST logic by constructing report_request
    report_request = ReportRequest(format=fmt)
    # Build report via internal call - duplicate minimal logic via POST handler helper
    # Instead of calling generate_report (which expects POST body), rebuild here to allow GET pdf
    # We call shared builder: create ReportResponse then optionally render PDF
    # For DRY, call generate_report's logic inline via helper
    # To avoid duplication, directly call the POST handler's building but we need to avoid recursion
    # So build report via helper function _build_report_data
    report = await _build_report_response(case, current_user, db)

    if fmt == "pdf":
        pdf_bytes = _build_pdf_bytes(case, report)
        # audit
        from app.models import AuditEvent, AuditEventType
        audit = AuditEvent(
            event_id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
            case_id=case.id,
            user_id=current_user.id,
            event_type=AuditEventType.REPORT_GENERATED,
            description=f"Report PDF generated for case {case.case_id}",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        db.add(audit)
        await db.commit()
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="report-{case.case_id}.pdf"'})

    # json branch - already audited in POST but not here; add audit for GET json as well
    from app.models import AuditEvent, AuditEventType
    # no extra audit for json GET to avoid noise, but ensure compat
    return report


async def _build_report_response(case, current_user, db: AsyncSession) -> ReportResponse:
    # Extracted from POST handler to share with GET
    artifacts_result = await db.execute(select(Artifact).where(Artifact.case_id == case.id))
    artifacts = artifacts_result.scalars().all()
    evidence_result = await db.execute(select(Evidence).join(Artifact).where(Artifact.case_id == case.id))
    evidence = evidence_result.scalars().all()
    entities_result = await db.execute(select(Entity).where(Entity.case_id == case.id))
    entities = entities_result.scalars().all()
    wallets_result = await db.execute(select(Wallet).where(Wallet.case_id == case.id))
    wallets = wallets_result.scalars().all()
    timeline_result = await db.execute(select(TimelineEvent).where(TimelineEvent.case_id == case.id).order_by(TimelineEvent.timestamp.asc()))
    timeline = timeline_result.scalars().all()
    reviews_result = await db.execute(select(Review).where(Review.case_id == case.id))
    reviews = reviews_result.scalars().all()
    confidence_result = await db.execute(select(ConfidenceScore).where(ConfidenceScore.case_id == case.id).order_by(desc(ConfidenceScore.created_at)).limit(1))
    confidence = confidence_result.scalar_one_or_none()
    audit_result = await db.execute(select(AuditEvent).where(AuditEvent.case_id == case.id).order_by(AuditEvent.created_at.desc()).limit(50))
    audit_events = audit_result.scalars().all()

    evidence_by_signal = {}
    for e in evidence:
        evidence_by_signal.setdefault(e.signal_type.value, []).append(e)
    signal_scores = {k: int(sum(x.score for x in v if x.score)/len([x for x in v if x.score])) if v else 0 for k,v in evidence_by_signal.items()}

    report = ReportResponse(
        case_info={"case_id": case.case_id, "title": case.title, "description": case.description, "status": case.status.value, "priority": case.priority.value, "classification": case.classification.value, "investigator": current_user.investigator_id, "authorization_ref": case.authorization_ref, "created_at": case.created_at.isoformat(), "updated_at": case.updated_at.isoformat()},
        investigation_scope=f"Investigation of {case.title} (Case ID: {case.case_id})",
        artifact_summary={"total_artifacts": len(artifacts), "by_source_type": {}, "total_size_bytes": sum(a.file_size or 0 for a in artifacts)},
        evidence_summary={"total_evidence": len(evidence), "by_signal_type": {k: len(v) for k,v in evidence_by_signal.items()}, "avg_confidence": int(sum(e.confidence for e in evidence)/len(evidence)) if evidence else 0},
        entities=[{"entity_id": e.entity_id, "type": e.type.value, "canonical_label": e.canonical_label, "confidence": e.confidence} for e in entities],
        relationships=await _build_relationships(case, db),
        signal_scores=signal_scores,
        confidence_explanation={"overall_confidence": confidence.overall_confidence if confidence else 0, "signal_breakdown": {"stylometry": confidence.stylometry_score if confidence else None, "blockchain": confidence.blockchain_score if confidence else None, "osint": confidence.osint_score if confidence else None, "technical_fingerprint": confidence.technical_fingerprint_score if confidence else None, "temporal": confidence.temporal_score if confidence else None}, "explanation": confidence.explanation if confidence else "No confidence analysis available", "uncertainty_factors": confidence.uncertainty_factors if confidence else None, "evidence_count": confidence.evidence_count if confidence else len(evidence), "model_version": confidence.model_version if confidence else "1.0.0"},
        timeline=[{"event_id": t.event_id, "timestamp": t.timestamp.isoformat(), "event_type": t.event_type, "title": t.title, "description": t.description, "source": t.source} for t in timeline],
        limitations=["All analysis based on synthetic/demonstration data","Stylometry analysis uses baseline implementation - not calibrated for production","OSINT correlations use local synthetic database only","Blockchain analytics use synthetic transaction data","Technical fingerprints can be spoofed - not definitive identification","Confidence scoring uses heuristic weights - requires analyst validation","Entity resolution is probabilistic - not definitive attribution"],
        review_status={"total_reviews": len(reviews), "decisions": {r.decision.value: len([rv for rv in reviews if rv.decision == r.decision]) for r in reviews}, "last_review": reviews[-1].created_at.isoformat() if reviews else None},
        audit_information={"total_audit_events": len(audit_events), "recent_events": [{"event_id": a.event_id, "event_type": a.event_type.value, "description": a.description, "timestamp": a.created_at.isoformat()} for a in audit_events[:10]]},
        generated_at=datetime.utcnow(),
    )
    for artifact in artifacts:
        report.artifact_summary["by_source_type"][artifact.source_type.value] = report.artifact_summary["by_source_type"].get(artifact.source_type.value, 0) + 1
    return report