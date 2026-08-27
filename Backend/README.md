# DARKTRACE AI — Backend

Cyber Crime Investigation & Intelligence Platform (SIH 2026 prototype)

## Stack
- Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.x (async), Alembic
- PostgreSQL 16, Neo4j 5.19
- JWT (python-jose), bcrypt (passlib)
- pytest, httpx, aiosqlite (for test/sqlite fallback)

## Quick Start (Docker - Recommended)

```bash
cd Backend
docker compose up -d postgres neo4j
# wait for healthy
alembic upgrade head
python scripts/seed_demo.py
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# docs at http://localhost:8000/docs
```

Default demo credentials (synthetic):
- `investigator_id: INV-DEMO-001`
- `security_passphrase: demo-passphrase-2026`

## Local Dev without Docker (SQLite fallback)

For local dev / CI without Postgres, the backend supports SQLite:

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# run with sqlite
DATABASE_URL="sqlite+aiosqlite:///./darktrace.db" uvicorn app.main:app --reload

# seed with sqlite
DATABASE_URL="sqlite+aiosqlite:///./darktrace.db" python scripts/seed_demo.py
```

Neo4j is optional: if `NEO4J_URI` unavailable, the app runs with a PostgreSQL-only fallback. Graph endpoints return entities/wallets from Postgres when Neo4j is unavailable, and the `system/status` will show `neo4j: unavailable` but overall `degraded` (still functional).

## Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
# edit JWT_SECRET, DB urls, etc
```

Required vars:
- `DATABASE_URL` (async) e.g. `postgresql+asyncpg://darktrace:darktrace@localhost:5432/darktrace`
- `DATABASE_URL_SYNC` (sync for Alembic)
- `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`
- `JWT_SECRET` (min 32 chars)
- `CORS_ORIGINS`

## API

Base: `http://localhost:8000/api/v1`

- `POST /api/v1/auth/login` -> JWT
- `POST /api/v1/cases` / `GET /api/v1/cases` / `GET /api/v1/cases/{case_id}` / `PATCH /api/v1/cases/{case_id}`
- `POST /api/v1/cases/{case_id}/artifacts` (multipart file, SHA256) / `GET /api/v1/cases/{case_id}/artifacts` / `GET /api/v1/artifacts/{artifact_id}`
- `POST /api/v1/analysis/stylometry`
- `POST /api/v1/analysis/osint` / `GET /api/v1/cases/{case_id}/osint`
- `GET /api/v1/cases/{case_id}/wallets` / `GET /api/v1/wallets/{wallet_id}` / `GET /api/v1/wallets/{wallet_id}/transactions`
- `POST /api/v1/analysis/fingerprint`
- `GET /api/v1/cases/{case_id}/entities` / `GET /api/v1/entities/{entity_id}`
- `GET /api/v1/cases/{case_id}/graph` (nodes/edges with evidence_ids)
- `GET /api/v1/cases/{case_id}/confidence`
- `POST /api/v1/cases/{case_id}/analyze` (full pipeline)
- `GET /api/v1/cases/{case_id}/timeline`
- `POST /api/v1/cases/{case_id}/review`
- `POST /api/v1/cases/{case_id}/report`
- `GET /api/v1/cases/{case_id}/audit`
- `GET /api/v1/search?q=`
- `GET /api/v1/system/status`
- `GET /health` / `GET /` / `GET /docs`

All responses use consistent error format:
```json
{"error": {"code": "CASE_NOT_FOUND", "message": "Case not found", "request_id": "..."}}
```

## Synthetic Demo Data

`scripts/seed_demo.py` creates:

- User `INV-DEMO-001`
- Case `CASE-2026-001` (Shadow Broker) + `CASE-2026-002`
- 5 artifacts (2 similar docs for stylometry, 1 noisy, 2 infra/wallet)
- 10 entities (actor, aliases, docs, wallet, domain, IP, noisy actor)
- 3 wallets + 4 transactions (cluster A + B)
- 8 evidence records (stylometry 84/79, blockchain 88, OSINT 91, fingerprint 76, temporal 81, plus noisy 22/30)
- 3 OSINT records, 5 timeline events, confidence 78, audit events
- Neo4j graph (if available): nodes + ALIAS_REUSE, WRITING_SIMILARITY, WALLET_TRANSACTION edges

All seed data is labeled `SYNTHETIC / DEMONSTRATION DATA`. Confidence shows uncertainty due to conflicting noisy evidence.

## Security Language

Every probabilistic result includes `confidence`, `supporting evidence`, `limitations`, and `analyst verification required`. The system never claims definitive identity.

Weights: Stylometry 25%, Blockchain 25%, OSINT 20%, Technical Fingerprint 15%, Temporal 15%.

## Tests

```bash
PYTHONPATH=. pytest tests/test_core.py -v
# or with sqlite verification
python scripts/verify_backend.py
```

## Project Structure

```
Backend/
  app/
    core/{config,database,security,deps,logging}
    models/ (SQLAlchemy)
    schemas/ (Pydantic)
    api/routes/{auth,cases,artifacts,entities,evidence,graph,analysis,osint,blockchain,fingerprint,timeline,confidence,pipeline,reports,review,audit,search,system}
    adapters/neo4j_adapter.py
    main.py
  alembic/
  scripts/{seed_demo.py,verify_backend.py}
  tests/
  docker-compose.yml
  Dockerfile
  requirements.txt
  .env.example
```

## Demo Flow

LOGIN -> CASE LIST -> OPEN CASE -> VIEW EVIDENCE -> ENTITIES -> GRAPH -> TIMELINE -> RUN ANALYSIS -> SIGNAL BREAKDOWN -> CONFIDENCE -> EVIDENCE EXPLANATION -> REVIEW LEAD -> GENERATE REPORT

## Remaining Notes

- PDF generation for reports is JSON-first; `reportlab` is available for simple PDF if needed but not styled for deadline.
- Frontend integration: set `VITE_API_URL=http://localhost:8000/api/v1` (or `REACT_APP_API_URL`) and replace mock data with API calls per `docs/FRONTEND_BACKEND_MAPPING.md`.
