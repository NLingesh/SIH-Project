from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime, timezone
from typing import Dict, Any

from app.core.database import get_db
from app.adapters.neo4j_adapter import neo4j_adapter
from app.core.logging import get_logger
from app.schemas import SystemStatusResponse

router = APIRouter(prefix="/system", tags=["system"])
logger = get_logger(__name__)


@router.get("/status", response_model=SystemStatusResponse)
async def system_status(request: Request, db: AsyncSession = Depends(get_db)):
    pg_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        logger.exception("PostgreSQL health check failed request_id=%s", getattr(request.state, "request_id", "unknown"))
        pg_status = "unhealthy"
    
    neo4j_status = "healthy" if neo4j_adapter.is_available else "unavailable"
    
    overall = "healthy"
    if pg_status != "healthy":
        overall = "degraded"
    if neo4j_status == "unavailable":
        overall = "degraded" if overall == "healthy" else "unhealthy"
    
    return SystemStatusResponse(
        api="healthy",
        postgresql=pg_status,
        neo4j=neo4j_status,
        analysis_engine="healthy",
        overall_status=overall,
        version="1.0.0",
        timestamp=datetime.now(timezone.utc),
    )