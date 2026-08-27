from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
import re
import math
from collections import Counter
from datetime import datetime
from typing import List, Dict, Any

from app.core.database import get_db
from app.core.logging import get_logger
from app.models import Case, Artifact, Evidence, AuditEvent, AuditEventType, SignalType
from app.schemas import StylometryRequest, StylometryResponse, TemporalRequest, TemporalResponse, ErrorResponse

router = APIRouter(prefix="/analysis", tags=["analysis"])
logger = get_logger(__name__)


def extract_text_features(text: str) -> Dict[str, Any]:
    text = text.lower()
    
    words = re.findall(r'\b\w+\b', text)
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    
    chars = list(text.replace(' ', '').replace('\n', ''))
    
    function_words = {'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'a', 'an'}
    
    features = {}
    
    if words:
        features['vocabulary_richness'] = len(set(words)) / len(words)
        features['avg_word_length'] = sum(len(w) for w in words) / len(words)
        features['function_word_ratio'] = sum(1 for w in words if w in function_words) / len(words)
        features['word_count'] = len(words)
        
        word_freq = Counter(words)
        features['top_words'] = dict(word_freq.most_common(20))
    else:
        features['vocabulary_richness'] = 0
        features['avg_word_length'] = 0
        features['function_word_ratio'] = 0
        features['word_count'] = 0
        features['top_words'] = {}
    
    if sentences:
        features['avg_sentence_length'] = sum(len(s.split()) for s in sentences) / len(sentences)
        features['sentence_count'] = len(sentences)
    else:
        features['avg_sentence_length'] = 0
        features['sentence_count'] = 0
    
    punctuation = [c for c in text if c in '.,;:!?-—()[]{}']
    if punctuation:
        punct_counts = Counter(punctuation)
        total_punct = len(punctuation)
        features['punctuation_distribution'] = {k: v/total_punct for k, v in punct_counts.items()}
    else:
        features['punctuation_distribution'] = {}
    
    char_ngrams = Counter()
    for i in range(len(chars) - 2):
        char_ngrams[''.join(chars[i:i+3])] += 1
    if char_ngrams:
        total_ngrams = sum(char_ngrams.values())
        features['char_trigrams'] = dict(char_ngrams.most_common(30))
    else:
        features['char_trigrams'] = {}
    
    repeated_phrases = []
    for i in range(len(words) - 3):
        phrase = ' '.join(words[i:i+4])
        if phrase in text[text.find(phrase)+1:]:
            repeated_phrases.append(phrase)
    features['repeated_phrases'] = list(set(repeated_phrases))[:10]
    
    return features


def compare_features(features_a: Dict, features_b: Dict) -> tuple[float, List[Dict]]:
    scores = []
    contributions = []
    
    weights = {
        'vocabulary_richness': 0.15,
        'avg_word_length': 0.10,
        'function_word_ratio': 0.20,
        'avg_sentence_length': 0.15,
        'punctuation_distribution': 0.15,
        'char_trigrams': 0.15,
        'repeated_phrases': 0.10,
    }
    
    for key, weight in weights.items():
        val_a = features_a.get(key, 0)
        val_b = features_b.get(key, 0)
        
        if isinstance(val_a, dict) and isinstance(val_b, dict):
            all_keys = set(val_a.keys()) | set(val_b.keys())
            if all_keys:
                similarity = sum(min(val_a.get(k, 0), val_b.get(k, 0)) for k in all_keys) / sum(max(val_a.get(k, 0), val_b.get(k, 0)) for k in all_keys)
            else:
                similarity = 0
        elif isinstance(val_a, (int, float)) and isinstance(val_b, (int, float)):
            if val_a == 0 and val_b == 0:
                similarity = 1.0
            elif val_a == 0 or val_b == 0:
                similarity = 0.0
            else:
                similarity = min(val_a, val_b) / max(val_a, val_b)
        elif isinstance(val_a, list) and isinstance(val_b, list):
            set_a, set_b = set(val_a), set(val_b)
            similarity = len(set_a & set_b) / len(set_a | set_b) if (set_a | set_b) else 0
        else:
            similarity = 1.0 if val_a == val_b else 0.0
        
        contribution = similarity * weight * 100
        scores.append(contribution)
        contributions.append({
            "feature": key,
            "similarity": round(similarity * 100, 2),
            "weight": weight,
            "contribution": round(contribution, 2),
        })
    
    overall_score = sum(scores)
    contributions.sort(key=lambda x: x["contribution"], reverse=True)
    
    return min(overall_score, 100), contributions[:5]


async def get_artifact_text(artifact: Artifact) -> str:
    if artifact.normalized_location:
        try:
            import aiofiles
            async with aiofiles.open(artifact.normalized_location, 'r') as f:
                return await f.read()
        except:
            pass
    return artifact.artifact_metadata or ""


@router.post("/stylometry", response_model=StylometryResponse, responses={404: {"model": ErrorResponse}})
async def run_stylometry_analysis(request: Request, analysis_request: StylometryRequest, db: AsyncSession = Depends(get_db)):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    
    result_a = await db.execute(
        select(Artifact).join(Case).where(Artifact.artifact_id == analysis_request.document_a_id).where(Case.investigator_id == current_user.id)
    )
    artifact_a = result_a.scalar_one_or_none()
    
    result_b = await db.execute(
        select(Artifact).join(Case).where(Artifact.artifact_id == analysis_request.document_b_id).where(Case.investigator_id == current_user.id)
    )
    artifact_b = result_b.scalar_one_or_none()
    
    if not artifact_a or not artifact_b:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ARTIFACT_NOT_FOUND", "message": "One or both artifacts not found", "request_id": str(uuid.uuid4())},
        )
    
    text_a = await get_artifact_text(artifact_a)
    text_b = await get_artifact_text(artifact_b)
    
    if not text_a or not text_b:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INSUFFICIENT_TEXT", "message": "One or both artifacts have no text content", "request_id": str(uuid.uuid4())},
        )
    
    features_a = extract_text_features(text_a)
    features_b = extract_text_features(text_b)
    
    similarity_score, top_features = compare_features(features_a, features_b)
    
    evidence = Evidence(
        evidence_id=f"EVD-{uuid.uuid4().hex[:12].upper()}",
        artifact_id=artifact_a.id,
        signal_type=SignalType.STYLOMETRY,
        feature="writing_style_comparison",
        score=int(similarity_score),
        explanation=f"Stylometric comparison between {artifact_a.artifact_id} and {artifact_b.artifact_id}. Similarity score: {similarity_score:.1f}%",
        confidence=int(similarity_score * 0.7),
        is_synthetic=False,
    )
    db.add(evidence)
    
    audit = AuditEvent(
        event_id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
        case_id=artifact_a.case_id,
        user_id=current_user.id,
        event_type=AuditEventType.ANALYSIS_COMPLETED,
        description=f"Stylometry analysis completed: {artifact_a.artifact_id} vs {artifact_b.artifact_id}",
        event_metadata=f"score: {similarity_score:.1f}",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(audit)
    await db.commit()
    
    explanation = [
        f"Writing style similarity score: {similarity_score:.1f}%",
        f"Top contributing feature: {top_features[0]['feature'] if top_features else 'N/A'} ({top_features[0]['contribution']:.1f}%)" if top_features else "No significant features found",
        "This analysis compares linguistic patterns and does not prove common authorship.",
        "Results should be treated as investigative leads requiring analyst verification.",
    ]
    
    limitations = [
        "Stylometry cannot definitively prove common authorship",
        "Results can be affected by topic, genre, and deliberate obfuscation",
        "Short texts provide less reliable results",
        "Translation or editing can alter stylistic signatures",
        "This is a baseline implementation - production systems should use calibrated models",
    ]
    
    return StylometryResponse(
        similarity_score=round(similarity_score, 2),
        top_contributing_features=top_features,
        compared_documents=[artifact_a.artifact_id, artifact_b.artifact_id],
        explanation="; ".join(explanation),
        limitations=limitations,
        model_version="1.0.0-baseline",
    )


@router.post("/temporal", response_model=TemporalResponse, responses={400: {"model": ErrorResponse}, 404: {"model": ErrorResponse}})
async def run_temporal_analysis(request: Request, temporal_request: TemporalRequest, db: AsyncSession = Depends(get_db)):
    from app.core.deps import get_current_user
    from app.models import TimelineEvent, Entity
    current_user = await get_current_user(request, db)

    # Resolve case if provided
    case_uuid = None
    if temporal_request.case_id:
        result = await db.execute(select(Case).where(Case.case_id == str(temporal_request.case_id)).where(Case.investigator_id == current_user.id))
        case = result.scalar_one_or_none()
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"code": "CASE_NOT_FOUND", "message": "Case not found", "request_id": str(uuid.uuid4())})
        case_uuid = case.id

    # Validate entity_ids if provided, otherwise fallback to case timeline
    entity_ids = temporal_request.entity_ids or []
    events = []
    if entity_ids:
        # try entity_id string lookup (entity_id, not PK)
        for eid in entity_ids:
            res = await db.execute(select(Entity).where(Entity.entity_id == eid))
            ent = res.scalar_one_or_none()
            if ent:
                ev_res = await db.execute(select(TimelineEvent).where(TimelineEvent.entity_id == ent.id).order_by(TimelineEvent.timestamp.asc()))
                events.extend(ev_res.scalars().all())
        # fallback to case timeline if no entity events found
        if not events and case_uuid is not None:
            ev_res = await db.execute(select(TimelineEvent).where(TimelineEvent.case_id == case_uuid).order_by(TimelineEvent.timestamp.asc()))
            events = list(ev_res.scalars().all())
    elif case_uuid is not None:
        ev_res = await db.execute(select(TimelineEvent).where(TimelineEvent.case_id == case_uuid).order_by(TimelineEvent.timestamp.asc()))
        events = list(ev_res.scalars().all())

    if not events:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"code": "NO_EVENTS", "message": "No timeline events found for given entities/case", "request_id": str(uuid.uuid4())})

    # Compute temporal correlation: window clustering within 48h
    events_sorted = sorted(events, key=lambda x: x.timestamp)
    matching = []
    max_gap_hours = 48
    for i in range(len(events_sorted)):
        for j in range(i+1, len(events_sorted)):
            delta = (events_sorted[j].timestamp - events_sorted[i].timestamp).total_seconds() / 3600
            if delta <= max_gap_hours:
                matching.append({
                    "event_a": events_sorted[i].event_id,
                    "event_b": events_sorted[j].event_id,
                    "delta_hours": round(delta, 2),
                    "title_a": events_sorted[i].title,
                    "title_b": events_sorted[j].title,
                })
            else:
                break
    # Score heuristic: more matches within window = higher, normalized
    total_pairs = len(events_sorted) * (len(events_sorted)-1) / 2 if len(events_sorted) > 1 else 0
    match_ratio = len(matching) / total_pairs if total_pairs else 0
    temporal_score = int(min(95, 50 + match_ratio*50 + len(matching)*5))
    if len(events_sorted) < 3:
        temporal_score = max(0, temporal_score - 15)

    explanation = f"Found {len(matching)} event pairs within {max_gap_hours}h window out of {int(total_pairs)} total pairs. Temporal overlap suggests co-activity windows. Requires analyst verification; proximity != causation."

    # audit
    audit = AuditEvent(
        event_id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
        case_id=case_uuid if case_uuid else events_sorted[0].case_id,
        user_id=current_user.id,
        event_type=AuditEventType.ANALYSIS_COMPLETED,
        description=f"Temporal analysis completed: score {temporal_score}",
        event_metadata=f"events={len(events_sorted)}, matches={len(matching)}",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(audit)
    await db.commit()

    return TemporalResponse(
        temporal_score=temporal_score,
        matching_events=matching[:20],
        explanation=explanation,
    )