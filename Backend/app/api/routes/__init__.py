from fastapi import APIRouter

from app.api.routes import (
    auth, cases, artifacts, evidence, entities,
    graph, analysis, osint, blockchain, fingerprint,
    timeline, confidence, reports, review, audit,
    search, system, pipeline
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(cases.router)
api_router.include_router(artifacts.router)
api_router.include_router(evidence.router)
api_router.include_router(entities.router)
api_router.include_router(graph.router)
api_router.include_router(analysis.router)
api_router.include_router(osint.router)
api_router.include_router(blockchain.router)
api_router.include_router(fingerprint.router)
api_router.include_router(timeline.router)
api_router.include_router(confidence.router)
api_router.include_router(reports.router)
api_router.include_router(review.router)
api_router.include_router(audit.router)
api_router.include_router(search.router)
api_router.include_router(system.router)
api_router.include_router(pipeline.router)