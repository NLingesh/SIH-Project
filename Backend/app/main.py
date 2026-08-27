from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.core.config import settings
from app.core.database import init_db, close_db
from app.core.logging import setup_logging
from app.adapters.neo4j_adapter import neo4j_adapter
from app.api.routes import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger = logging.getLogger(__name__)
    
    logger.info("Starting DARKTRACE AI Backend...")
    
    await init_db()
    logger.info("PostgreSQL connected")
    
    await neo4j_adapter.connect()
    if neo4j_adapter.is_available:
        logger.info("Neo4j connected")
    else:
        logger.warning("Neo4j not available - running with PostgreSQL only")
    
    yield
    
    logger.info("Shutting down...")
    await neo4j_adapter.close()
    await close_db()
    logger.info("Shutdown complete")


app = FastAPI(
    title="DARKTRACE AI — Cyber Crime Investigation & Intelligence Platform",
    description="Backend API for cyber-crime investigation platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logging.getLogger(__name__).error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_ERROR", "message": "Internal server error", "request_id": "unknown"}},
    )


app.include_router(api_router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "darktrace-ai-backend"}


@app.get("/")
async def root():
    return {
        "name": "DARKTRACE AI",
        "description": "Cyber Crime Investigation & Intelligence Platform",
        "version": "1.0.0",
        "docs": "/docs",
    }