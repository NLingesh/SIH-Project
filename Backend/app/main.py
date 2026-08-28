from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import logging
import uuid

from app.core.config import settings
from app.core.database import init_db, close_db
from app.core.logging import setup_logging
from app.adapters.neo4j_adapter import neo4j_adapter
from app.api.routes import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.validate_runtime()
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
    title="DARKTRACE AI — Dark-Web Deanonymization & Identity Attribution API",
    description="Backend API for authorized dark-web deanonymization, identity-linkage analysis, and analyst verification.",
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


@app.middleware("http")
async def request_id_middleware(request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    request_id = getattr(request.state, "request_id", "unknown")
    details = [{"location": list(error.get("loc", [])), "message": error.get("msg", "Invalid value")} for error in exc.errors()]
    return JSONResponse(
        status_code=422,
        headers={"X-Request-ID": request_id},
        content={"error": {"code": "VALIDATION_ERROR", "message": "Request validation failed", "request_id": request_id, "details": details}},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    request_id = getattr(request.state, "request_id", "unknown")
    logging.getLogger(__name__).error("Unhandled exception request_id=%s", request_id, exc_info=True)
    return JSONResponse(
        status_code=500,
        headers={"X-Request-ID": request_id},
        content={"error": {"code": "INTERNAL_ERROR", "message": "Internal server error", "request_id": request_id}},
    )


app.include_router(api_router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "darktrace-ai-backend"}


@app.get("/")
async def root():
    return {
        "name": "DARKTRACE AI",
        "description": "Authorized dark-web deanonymization and identity-attribution platform",
        "version": "1.0.0",
        "docs": "/docs",
    }