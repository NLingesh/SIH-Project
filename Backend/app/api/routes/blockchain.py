from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any

from app.core.database import get_db
from app.core.logging import get_logger
from app.models import Case, Wallet, Transaction, AuditEvent, AuditEventType
from app.schemas import WalletResponse, TransactionResponse, ErrorResponse

router = APIRouter(tags=["blockchain"])
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


@router.get("/cases/{case_id}/wallets", response_model=List[WalletResponse], responses={404: {"model": ErrorResponse}})
async def list_wallets(
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
        select(Wallet)
        .where(Wallet.case_id == case.id)
        .order_by(desc(Wallet.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
    )
    wallets = result.scalars().all()
    
    return [WalletResponse.model_validate(w) for w in wallets]


@router.get("/wallets/{wallet_id}", response_model=WalletResponse, responses={404: {"model": ErrorResponse}})
async def get_wallet(request: Request, wallet_id: str, db: AsyncSession = Depends(get_db)):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    
    result = await db.execute(
        select(Wallet)
        .join(Case)
        .where(Wallet.wallet_id == wallet_id)
        .where(Case.investigator_id == current_user.id)
    )
    wallet = result.scalar_one_or_none()
    
    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "WALLET_NOT_FOUND", "message": "Wallet not found", "request_id": str(uuid.uuid4())},
        )
    
    return WalletResponse.model_validate(wallet)


@router.get("/wallets/{wallet_id}/transactions", response_model=List[TransactionResponse], responses={404: {"model": ErrorResponse}})
async def get_wallet_transactions(
    request: Request,
    wallet_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    
    result = await db.execute(
        select(Wallet)
        .join(Case)
        .where(Wallet.wallet_id == wallet_id)
        .where(Case.investigator_id == current_user.id)
    )
    wallet = result.scalar_one_or_none()
    
    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "WALLET_NOT_FOUND", "message": "Wallet not found", "request_id": str(uuid.uuid4())},
        )
    
    result = await db.execute(
        select(Transaction)
        .where(Transaction.wallet_id == wallet.id)
        .order_by(desc(Transaction.timestamp))
        .offset((page - 1) * limit)
        .limit(limit)
    )
    transactions = result.scalars().all()
    
    return [TransactionResponse.model_validate(t) for t in transactions]


@router.get("/wallets/{wallet_id}/cluster", response_model=Dict[str, Any], responses={404: {"model": ErrorResponse}})
async def get_wallet_cluster(request: Request, wallet_id: str, db: AsyncSession = Depends(get_db)):
    from app.core.deps import get_current_user
    current_user = await get_current_user(request, db)
    
    result = await db.execute(
        select(Wallet)
        .join(Case)
        .where(Wallet.wallet_id == wallet_id)
        .where(Case.investigator_id == current_user.id)
    )
    wallet = result.scalar_one_or_none()
    
    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "WALLET_NOT_FOUND", "message": "Wallet not found", "request_id": str(uuid.uuid4())},
        )
    
    if not wallet.cluster_id:
        return {"wallet_id": wallet_id, "cluster_id": None, "related_wallets": [], "message": "No cluster assigned"}
    
    result = await db.execute(
        select(Wallet).where(Wallet.cluster_id == wallet.cluster_id).where(Wallet.wallet_id != wallet_id)
    )
    cluster_wallets = result.scalars().all()
    
    return {
        "wallet_id": wallet_id,
        "cluster_id": wallet.cluster_id,
        "related_wallets": [WalletResponse.model_validate(w) for w in cluster_wallets],
        "total_in_cluster": len(cluster_wallets) + 1,
    }