from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
import re
from datetime import datetime
from typing import List, Optional, Dict, Any

from app.core.database import get_db
from app.core.logging import get_logger
from app.models import Case, OSINTRecord, AuditEvent, AuditEventType, Entity, Alias, Wallet
from app.schemas import OSINTRequest, OSINTCorrelationResponse, OSINTRecordResponse, ErrorResponse

router = APIRouter(prefix="/analysis", tags=["analysis"])
logger = get_logger(__name__)


SYNTHETIC_OSINT_DB = {
    "aliases": {
        "shadowbroker": ["shadow_broker", "shadowbroker_", "sb_operator", "dark_shadow"],
        "cryptoking": ["crypto_king", "ck_trader", "bitcoin_master", "btc_king"],
        "netrunner": ["net_runner", "nr_hacker", "cyber_nomad", "digital_ghost"],
    },
    "domains": {
        "darkweb-market.xyz": ["darkweb-market.onion", "dw-market.xyz", "shadow-market.biz"],
        "crypto-exchange.io": ["crypto-trade.io", "btc-exchange.net", "coin-swap.org"],
    },
    "emails": {
        "shadow@protonmail.com": ["shadow.broker@tutanota.com", "sb_operator@pm.me"],
        "king@crypto.io": ["crypto.king@mailfence.com", "btc_master@proton.me"],
    },
    "wallets": {
        "0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4": ["0x742d35Cc6634C0532925a3b8D4C0532925a3b8D5", "0x1234567890123456789012345678901234567890"],
        "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh": ["bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh2", "bc1qz9sxzxzxzxzxzxzxzxzxzxzxzxzxzxzxzxzx"],
    },
}


def normalize_identifier(identifier: str) -> str:
    return identifier.lower().strip()


def exact_match(query: str, target: str) -> bool:
    return normalize_identifier(query) == normalize_identifier(target)


def fuzzy_match(query: str, target: str, threshold: float = 0.8) -> float:
    q = normalize_identifier(query)
    t = normalize_identifier(target)
    
    if q == t:
        return 1.0
    
    if q in t or t in q:
        return 0.9

    # handle snake_case / hyphen normalization
    q_norm = re.sub(r'[_\-\s]+', '', q)
    t_norm = re.sub(r'[_\-\s]+', '', t)
    if q_norm == t_norm:
        return 0.85
    if q_norm in t_norm or t_norm in q_norm:
        return 0.8
    
    q_words = set(re.findall(r'\w+', q))
    t_words = set(re.findall(r'\w+', t))
    if q_words and t_words:
        jaccard = len(q_words & t_words) / len(q_words | t_words)
        if jaccard >= threshold:
            return jaccard
    
    return 0.0


def find_correlations(identifiers: List[str], case_id: str) -> List[Dict[str, Any]]:
    correlations = []
    
    for identifier in identifiers:
        norm_id = normalize_identifier(identifier)
        
        for category, mapping in SYNTHETIC_OSINT_DB.items():
            for canonical, variants in mapping.items():
                match_type = None
                correlation_score = 0
                
                if exact_match(identifier, canonical):
                    match_type = "exact"
                    correlation_score = 100
                else:
                    for variant in variants:
                        if exact_match(identifier, variant):
                            match_type = "exact_variant"
                            correlation_score = 95
                            break
                    
                    if not match_type:
                        score = fuzzy_match(identifier, canonical)
                        if score > 0.7:
                            match_type = "fuzzy"
                            correlation_score = int(score * 100)
                        else:
                            for variant in variants:
                                score = fuzzy_match(identifier, variant)
                                if score > 0.7:
                                    match_type = "fuzzy_variant"
                                    correlation_score = int(score * 100)
                                    break
                
                if match_type:
                    confidence = min(correlation_score + 10, 95)
                    
                    correlations.append({
                        "source": f"synthetic_{category}_database",
                        "identifier": identifier,
                        "match_type": match_type,
                        "correlation_score": correlation_score,
                        "confidence": confidence,
                        "evidence_reference": f"SYNTHETIC:{category}:{canonical}",
                        "timestamp": datetime.utcnow(),
                    })
    
    return correlations


@router.post("/osint", response_model=List[OSINTCorrelationResponse], responses={400: {"model": ErrorResponse}})
async def run_osint_correlation(request: Request, osint_request: OSINTRequest, db: AsyncSession = Depends(get_db)):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    
    if not osint_request.identifiers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "NO_IDENTIFIERS", "message": "No identifiers provided", "request_id": str(uuid.uuid4())},
        )
    
    case_id = None
    if osint_request.case_id:
        result = await db.execute(select(Case).where(Case.case_id == osint_request.case_id).where(Case.investigator_id == current_user.id))
        case = result.scalar_one_or_none()
        if not case:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "CASE_NOT_FOUND", "message": "Case not found", "request_id": str(uuid.uuid4())},
            )
        case_id = case.id
    
    correlations = find_correlations(osint_request.identifiers, osint_request.case_id)
    
    for corr in correlations:
        record = OSINTRecord(
            record_id=f"OSINT-{uuid.uuid4().hex[:12].upper()}",
            case_id=case_id,
            source=corr["source"],
            identifier=corr["identifier"],
            identifier_type=corr["source"].split("_")[1] if "_" in corr["source"] else "unknown",
            match_type=corr["match_type"],
            correlation_score=corr["correlation_score"],
            confidence=corr["confidence"],
            evidence_reference=corr["evidence_reference"],
            timestamp=corr["timestamp"],
            is_synthetic=True,
        )
        db.add(record)
    
    audit = AuditEvent(
        event_id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
        case_id=case_id,
        user_id=current_user.id,
        event_type=AuditEventType.ANALYSIS_COMPLETED,
        description=f"OSINT correlation completed for {len(osint_request.identifiers)} identifiers",
        event_metadata=f"found {len(correlations)} correlations",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(audit)
    await db.commit()
    
    return [OSINTCorrelationResponse(**c) for c in correlations]


@router.get("/cases/{case_id}/osint", response_model=List[OSINTRecordResponse], responses={404: {"model": ErrorResponse}})
async def get_case_osint(request: Request, case_id: str, db: AsyncSession = Depends(get_db)):
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
        select(OSINTRecord).where(OSINTRecord.case_id == case.id).order_by(OSINTRecord.timestamp.desc())
    )
    records = result.scalars().all()
    
    return [OSINTRecordResponse.model_validate(r) for r in records]