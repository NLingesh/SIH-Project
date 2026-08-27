from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
import re
from datetime import datetime
from typing import List, Dict, Any

from app.core.database import get_db
from app.core.logging import get_logger
from app.models import Case, Artifact, Evidence, AuditEvent, AuditEventType, SignalType
from app.schemas import FingerprintRequest, FingerprintResponse, ErrorResponse

router = APIRouter(prefix="/analysis", tags=["analysis"])
logger = get_logger(__name__)


SYNTHETIC_FINGERPRINTS = {
    "usernames": {
        "shadowbroker": ["shadow_broker", "shadowbroker_", "sb_operator"],
        "cryptoking": ["crypto_king", "ck_trader", "btc_master"],
        "netrunner": ["net_runner", "nr_hacker", "cyber_nomad"],
    },
    "domains": {
        "darkweb-market.xyz": ["shadow-market.biz", "dw-market.xyz"],
        "crypto-exchange.io": ["btc-exchange.net", "coin-swap.org"],
    },
    "infrastructure": {
        "192.168.1.100": ["10.0.0.50", "172.16.0.25"],
        "vpn-provider-x.com": ["vpn-service-y.net", "proxy-zone.io"],
    },
    "timing_patterns": {
        "utc_night": ["00:00-06:00 UTC", "22:00-04:00 UTC"],
        "business_hours": ["09:00-17:00 EST", "08:00-16:00 PST"],
    },
}


def extract_fingerprints(text: str) -> Dict[str, List[str]]:
    fingerprints = {}
    
    usernames = re.findall(r'@(\w+)', text)
    if usernames:
        fingerprints["usernames"] = list(set(usernames))
    
    domains = re.findall(r'[\w-]+\.(?:com|net|org|io|xyz|onion|biz)', text)
    if domains:
        fingerprints["domains"] = list(set(domains))
    
    ips = re.findall(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', text)
    if ips:
        fingerprints["ips"] = list(set(ips))
    
    crypto_addresses = re.findall(r'(?:0x[a-fA-F0-9]{40}|bc1[a-zA-Z0-9]{39,}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})', text)
    if crypto_addresses:
        fingerprints["crypto_addresses"] = list(set(crypto_addresses))
    
    emails = re.findall(r'[\w.-]+@[\w.-]+\.\w+', text)
    if emails:
        fingerprints["emails"] = list(set(emails))
    
    return fingerprints


def match_fingerprints(artifact_fps: Dict[str, List[str]], case_fps: Dict[str, List[str]]) -> List[Dict[str, Any]]:
    matches = []
    
    for fp_type, values in artifact_fps.items():
        if fp_type not in case_fps:
            continue
        
        for value in values:
            norm_value = value.lower()
            
            for case_value in case_fps[fp_type]:
                if norm_value == case_value.lower():
                    matches.append({
                        "type": fp_type,
                        "value": value,
                        "matched_value": case_value,
                        "match_type": "exact",
                        "confidence": 90,
                    })
                elif norm_value in case_value.lower() or case_value.lower() in norm_value:
                    matches.append({
                        "type": fp_type,
                        "value": value,
                        "matched_value": case_value,
                        "match_type": "partial",
                        "confidence": 70,
                    })
    
    return matches


def calculate_confidence(matches: List[Dict[str, Any]]) -> int:
    if not matches:
        return 0
    
    weights = {"exact": 1.0, "partial": 0.5}
    total = sum(weights.get(m["match_type"], 0.3) * m["confidence"] for m in matches)
    return min(int(total / len(matches)), 95)


@router.post("/fingerprint", response_model=FingerprintResponse, responses={400: {"model": ErrorResponse}})
async def run_fingerprint_analysis(request: Request, fp_request: FingerprintRequest, db: AsyncSession = Depends(get_db)):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    
    if not fp_request.artifact_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "NO_ARTIFACTS", "message": "No artifact IDs provided", "request_id": str(uuid.uuid4())},
        )
    
    case_id = None
    artifacts = []
    
    for artifact_id in fp_request.artifact_ids:
        result = await db.execute(
            select(Artifact).join(Case).where(Artifact.artifact_id == artifact_id).where(Case.investigator_id == current_user.id)
        )
        artifact = result.scalar_one_or_none()
        if artifact:
            artifacts.append(artifact)
            if not case_id:
                case_id = artifact.case_id
    
    if not artifacts:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ARTIFACTS_NOT_FOUND", "message": "No valid artifacts found", "request_id": str(uuid.uuid4())},
        )
    
    case_fps = {}
    for category, mapping in SYNTHETIC_FINGERPRINTS.items():
        for canonical, variants in mapping.items():
            if category not in case_fps:
                case_fps[category] = []
            case_fps[category].extend([canonical] + variants)
    
    all_signals = []
    all_matches = []
    all_evidence_ids = []
    
    for artifact in artifacts:
        text = artifact.artifact_metadata or ""
        if artifact.normalized_location:
            try:
                import aiofiles
                async with aiofiles.open(artifact.normalized_location, 'r') as f:
                    text += "\n" + await f.read()
            except:
                pass
        
        artifact_fps = extract_fingerprints(text)
        matches = match_fingerprints(artifact_fps, case_fps)
        
        for match in matches:
            all_matches.append({
                "artifact_id": artifact.artifact_id,
                **match,
            })
        
        for fp_type, values in artifact_fps.items():
            all_signals.append({
                "artifact_id": artifact.artifact_id,
                "signal_type": fp_type,
                "values": values,
            })
    
    confidence = calculate_confidence(all_matches)
    
    for match in all_matches:
        for artifact in artifacts:
            if artifact.artifact_id == match["artifact_id"]:
                evidence = Evidence(
                    evidence_id=f"EVD-{uuid.uuid4().hex[:12].upper()}",
                    artifact_id=artifact.id,
                    signal_type=SignalType.TECHNICAL_FINGERPRINT,
                    feature=f"{match['type']}_reuse",
                    score=match["confidence"],
                    explanation=f"Technical fingerprint match: {match['type']} '{match['value']}' matches '{match['matched_value']}' ({match['match_type']})",
                    confidence=match["confidence"],
                    is_synthetic=True,
                )
                db.add(evidence)
                await db.flush()
                all_evidence_ids.append(evidence.evidence_id)
    
    audit = AuditEvent(
        event_id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
        case_id=case_id,
        user_id=current_user.id,
        event_type=AuditEventType.ANALYSIS_COMPLETED,
        description=f"Technical fingerprint analysis completed for {len(artifacts)} artifacts",
        event_metadata=f"found {len(all_matches)} matches, confidence: {confidence}",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(audit)
    await db.commit()
    
    limitations = [
        "Technical fingerprints can be spoofed or shared",
        "Infrastructure reuse does not prove common operator",
        "VPN/proxy usage can create false infrastructure overlaps",
        "Usernames can be chosen independently by different actors",
        "This analysis uses synthetic reference data for demonstration",
    ]
    
    return FingerprintResponse(
        signals=all_signals,
        matches=all_matches,
        confidence=confidence,
        supporting_evidence=all_evidence_ids,
        limitations=limitations,
    )