from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

from app.core.database import get_db
from app.core.logging import get_logger
from app.models import Case, Artifact, ConfidenceScore, Evidence, AuditEvent, AuditEventType, SignalType
from app.schemas import ConfidenceScoreResponse, SignalBreakdown, ErrorResponse

router = APIRouter(tags=["confidence"])
logger = get_logger(__name__)


WEIGHTS = {
    SignalType.STYLOMETRY: 0.25,
    SignalType.BLOCKCHAIN: 0.25,
    SignalType.OSINT: 0.20,
    SignalType.TECHNICAL_FINGERPRINT: 0.15,
    SignalType.TEMPORAL: 0.15,
}

MIN_EVIDENCE_PER_SIGNAL = 1
MIN_INDEPENDENT_SIGNALS_FOR_HIGH_CONFIDENCE = 3


def calculate_signal_score(signal_type: SignalType, evidence_list: List[Evidence]) -> tuple[int, int, List[str]]:
    if not evidence_list:
        return 0, 0, ["No evidence available"]
    
    scores = [e.score for e in evidence_list if e.score is not None]
    confidences = [e.confidence for e in evidence_list if e.confidence is not None]
    
    avg_score = int(sum(scores) / len(scores)) if scores else 0
    avg_confidence = int(sum(confidences) / len(confidences)) if confidences else 0
    
    evidence_quality = min(avg_confidence, 100)
    evidence_count = len(evidence_list)
    
    quality_penalty = 0
    if evidence_count < MIN_EVIDENCE_PER_SIGNAL:
        quality_penalty = 30
    elif evidence_count < 3:
        quality_penalty = 15
    
    final_score = max(0, min(100, (avg_score + avg_confidence) // 2 - quality_penalty))
    
    uncertainty_factors = []
    if evidence_count == 0:
        uncertainty_factors.append("No evidence for this signal type")
    elif evidence_count < 3:
        uncertainty_factors.append(f"Limited evidence ({evidence_count} items)")
    
    return final_score, evidence_count, uncertainty_factors


def calculate_overall_confidence(signal_scores: Dict[str, int], signal_evidence_counts: Dict[str, int], uncertainty_factors: List[str]) -> tuple[int, List[str], List[str]]:
    active_signals = {k: v for k, v in signal_scores.items() if v > 0}
    evidence_counts = {k: signal_evidence_counts.get(k, 0) for k in active_signals}
    
    weighted_sum = 0
    total_weight = 0
    
    for signal_type, weight in WEIGHTS.items():
        signal_key = signal_type.value
        if signal_key in active_signals:
            weighted_sum += active_signals[signal_key] * weight
            total_weight += weight
    
    if total_weight == 0:
        return 0, ["No signals with evidence available"], ["Cannot compute confidence without evidence"]
    
    base_confidence = weighted_sum / total_weight
    
    missing_signals = set(WEIGHTS.keys()) - set(active_signals.keys())
    missing_penalty = len(missing_signals) * 5
    
    independent_count = len(active_signals)
    if independent_count < MIN_INDEPENDENT_SIGNALS_FOR_HIGH_CONFIDENCE:
        independent_penalty = (MIN_INDEPENDENT_SIGNALS_FOR_HIGH_CONFIDENCE - independent_count) * 10
    else:
        independent_penalty = 0
    
    conflict_penalty = 0
    signal_values = list(active_signals.values())
    if len(signal_values) > 1:
        max_val = max(signal_values)
        min_val = min(signal_values)
        if max_val - min_val > 40:
            conflict_penalty = 15
            uncertainty_factors.append(f"High signal variance: {max_val} vs {min_val}")
    
    final_confidence = max(0, min(100, int(base_confidence - missing_penalty - independent_penalty - conflict_penalty)))
    
    supporting = [f"{k}: {v}" for k, v in active_signals.items() if v >= 60]
    contradicting = [f"{k}: {v}" for k, v in active_signals.items() if v < 40]
    
    if missing_signals:
        uncertainty_factors.append(f"Missing signals: {', '.join(s.value for s in missing_signals)}")
    if independent_count < MIN_INDEPENDENT_SIGNALS_FOR_HIGH_CONFIDENCE:
        uncertainty_factors.append(f"Only {independent_count} independent signals (minimum {MIN_INDEPENDENT_SIGNALS_FOR_HIGH_CONFIDENCE} for high confidence)")
    
    return final_confidence, supporting, contradicting


@router.get("/cases/{case_id}/confidence", response_model=ConfidenceScoreResponse, responses={404: {"model": ErrorResponse}})
async def get_confidence_score(request: Request, case_id: str, db: AsyncSession = Depends(get_db)):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    
    result = await db.execute(select(Case).where(Case.case_id == case_id).where(Case.investigator_id == current_user.id))
    case = result.scalar_one_or_none()
    
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CASE_NOT_FOUND", "message": "Case not found", "request_id": str(uuid.uuid4())},
        )
    
    result = await db.execute(
        select(ConfidenceScore).where(ConfidenceScore.case_id == case.id).order_by(desc(ConfidenceScore.created_at)).limit(1)
    )
    latest_score = result.scalar_one_or_none()
    
    if latest_score:
        return ConfidenceScoreResponse.model_validate(latest_score)
    
    evidence_result = await db.execute(
        select(Evidence).join(Artifact).where(Artifact.case_id == case.id)
    )
    all_evidence = evidence_result.scalars().all()
    
    evidence_by_signal = {}
    for evidence in all_evidence:
        signal_key = evidence.signal_type.value
        if signal_key not in evidence_by_signal:
            evidence_by_signal[signal_key] = []
        evidence_by_signal[signal_key].append(evidence)
    
    signal_scores = {}
    signal_evidence_counts = {}
    all_uncertainty = []
    
    for signal_type in SignalType:
        signal_key = signal_type.value
        evidence_list = evidence_by_signal.get(signal_key, [])
        score, count, uncertainty = calculate_signal_score(signal_type, evidence_list)
        signal_scores[signal_key] = score
        signal_evidence_counts[signal_key] = count
        all_uncertainty.extend(uncertainty)
    
    overall, supporting, contradicting = calculate_overall_confidence(signal_scores, signal_evidence_counts, all_uncertainty)
    
    total_evidence = sum(signal_evidence_counts.values())
    
    explanation_lines = [
        f"Overall confidence: {overall}%",
        f"Based on {total_evidence} evidence items across {len([s for s in signal_scores.values() if s > 0])} signal types",
    ]
    if supporting:
        explanation_lines.append(f"Supporting signals: {', '.join(supporting)}")
    if contradicting:
        explanation_lines.append(f"Weak signals: {', '.join(contradicting)}")
    if all_uncertainty:
        explanation_lines.append(f"Uncertainty factors: {'; '.join(all_uncertainty)}")
    
    explanation = "\n".join(explanation_lines)
    
    confidence_record = ConfidenceScore(
        score_id=f"CONF-{uuid.uuid4().hex[:12].upper()}",
        case_id=case.id,
        overall_confidence=overall,
        stylometry_score=signal_scores.get("stylometry"),
        blockchain_score=signal_scores.get("blockchain"),
        osint_score=signal_scores.get("osint"),
        technical_fingerprint_score=signal_scores.get("technical_fingerprint"),
        temporal_score=signal_scores.get("temporal"),
        evidence_count=total_evidence,
        explanation=explanation,
        uncertainty_factors="; ".join(all_uncertainty) if all_uncertainty else None,
        model_version="1.0.0",
    )
    db.add(confidence_record)
    await db.commit()
    await db.refresh(confidence_record)
    
    return ConfidenceScoreResponse.model_validate(confidence_record)