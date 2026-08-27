# Frontend-Backend Mapping Document

## Project: DARKTRACE AI — Cyber Crime Investigation & Intelligence Platform

This document maps the expected frontend screens/actions to backend endpoints, requests, responses, and database/services.

---

## 1. Investigator Login

| Frontend Screen | Frontend Action | Backend Endpoint | Request | Response | Database/Service |
|---|---|---|---|---|---|
| Login Page | Submit credentials | `POST /api/v1/auth/login` | `{ investigator_id, security_passphrase }` | `{ access_token, token_type, investigator, clearance_level }` | PostgreSQL: users table, JWT service |

---

## 2. Case Management

| Frontend Screen | Frontend Action | Backend Endpoint | Request | Response | Database/Service |
|---|---|---|---|---|---|
| Case List | Load cases | `GET /api/v1/cases` | Query params: page, limit, status | `{ cases: [], total, page, limit }` | PostgreSQL: cases table |
| Case List | Create case | `POST /api/v1/cases` | `{ title, investigator, authorization_ref, priority, classification, description }` | `{ case_id, title, investigator, authorization_ref, created_at, status, priority, classification, description, updated_at }` | PostgreSQL: cases table |
| Case Detail | View case | `GET /api/v1/cases/{case_id}` | Path: case_id | Full case object | PostgreSQL: cases table |
| Case Detail | Update case | `PATCH /api/v1/cases/{case_id}` | Partial case fields | Updated case object | PostgreSQL: cases table |

---

## 3. Artifact / Evidence Ingestion

| Frontend Screen | Frontend Action | Backend Endpoint | Request | Response | Database/Service |
|---|---|---|---|---|---|
| Case Detail → Artifacts Tab | List artifacts | `GET /api/v1/cases/{case_id}/artifacts` | Path: case_id, Query: page, limit | `{ artifacts: [], total }` | PostgreSQL: artifacts table |
| Case Detail → Artifacts Tab | Upload artifact | `POST /api/v1/cases/{case_id}/artifacts` | Multipart: file, source_type, source_ref | `{ artifact_id, case_id, source_type, source_ref, collected_at, sha256, raw_location, normalized_location }` | PostgreSQL: artifacts table, File storage, SHA-256 service |
| Artifact Detail | View artifact | `GET /api/v1/artifacts/{artifact_id}` | Path: artifact_id | Full artifact with evidence | PostgreSQL: artifacts, evidence tables |
| Evidence Tab | View evidence | `GET /api/v1/artifacts/{artifact_id}/evidence` | Path: artifact_id | `{ evidence: [] }` | PostgreSQL: evidence table |

---

## 4. Stylometry Analysis

| Frontend Screen | Frontend Action | Backend Endpoint | Request | Response | Database/Service |
|---|---|---|---|---|---|
| Analysis → Stylometry | Run comparison | `POST /api/v1/analysis/stylometry` | `{ document_a_id, document_b_id }` | `{ similarity_score, top_contributing_features, compared_documents, explanation, limitations, model_version }` | PostgreSQL: analysis_results, Stylometry service |

---

## 5. OSINT Correlation

| Frontend Screen | Frontend Action | Backend Endpoint | Request | Response | Database/Service |
|---|---|---|---|---|---|
| Analysis → OSINT | Run correlation | `POST /api/v1/analysis/osint` | `{ identifiers: [], case_id }` | `{ correlations: [] }` | PostgreSQL: osint_records, analysis_results, OSINT service |
| Case Detail → OSINT Tab | View OSINT results | `GET /api/v1/cases/{case_id}/osint` | Path: case_id | `{ correlations: [] }` | PostgreSQL: osint_records |

---

## 6. Blockchain Analytics

| Frontend Screen | Frontend Action | Backend Endpoint | Request | Response | Database/Service |
|---|---|---|---|---|---|
| Case Detail → Wallets Tab | List wallets | `GET /api/v1/cases/{case_id}/wallets` | Path: case_id | `{ wallets: [] }` | PostgreSQL: wallets, Neo4j: wallet nodes |
| Wallet Detail | View wallet | `GET /api/v1/wallets/{wallet_id}` | Path: wallet_id | Wallet with transactions, cluster, relationships | PostgreSQL: wallets, transactions, Neo4j |
| Wallet Detail | View transactions | `GET /api/v1/wallets/{wallet_id}/transactions` | Path: wallet_id, Query: page, limit | `{ transactions: [], total }` | PostgreSQL: transactions, Neo4j |

---

## 7. Technical Fingerprint

| Frontend Screen | Frontend Action | Backend Endpoint | Request | Response | Database/Service |
|---|---|---|---|---|---|
| Analysis → Fingerprint | Run analysis | `POST /api/v1/analysis/fingerprint` | `{ artifact_ids: [], case_id }` | `{ signals, matches, confidence, supporting_evidence, limitations }` | PostgreSQL: analysis_results, Fingerprint service |

---

## 8. Entity Resolution

| Frontend Screen | Frontend Action | Backend Endpoint | Request | Response | Database/Service |
|---|---|---|---|---|---|
| Case Detail → Entities Tab | List entities | `GET /api/v1/cases/{case_id}/entities` | Path: case_id | `{ entities: [] }` | PostgreSQL: entities, Neo4j: entity nodes |
| Entity Detail | View entity | `GET /api/v1/entities/{entity_id}` | Path: entity_id | Full entity with aliases, relationships | PostgreSQL: entities, aliases, Neo4j |

---

## 9. Investigation Graph (Neo4j)

| Frontend Screen | Frontend Action | Backend Endpoint | Request | Response | Database/Service |
|---|---|---|---|---|---|
| Case Detail → Graph Tab | Load graph | `GET /api/v1/cases/{case_id}/graph` | Path: case_id, Query: depth, limit | `{ nodes: [], edges: [] }` | Neo4j: investigation graph, Graph service |
| Graph | Filter by relationship type | `GET /api/v1/cases/{case_id}/graph` | Query: relationship_types | Filtered graph | Neo4j |

---

## 10. Temporal Correlation

| Frontend Screen | Frontend Action | Backend Endpoint | Request | Response | Database/Service |
|---|---|---|---|---|---|
| Analysis → Temporal | Run analysis | `POST /api/v1/analysis/temporal` | `{ entity_ids: [], case_id }` | `{ temporal_score, matching_events, explanation }` | PostgreSQL: timeline_events, Temporal service |

---

## 11. Confidence Engine

| Frontend Screen | Frontend Action | Backend Endpoint | Request | Response | Database/Service |
|---|---|---|---|---|---|
| Case Detail → Confidence Tab | View confidence | `GET /api/v1/cases/{case_id}/confidence` | Path: case_id | `{ overall_confidence, signals, explanation, evidence_count }` | PostgreSQL: confidence_scores, Confidence service |

---

## 12. Complete Analysis Pipeline

| Frontend Screen | Frontend Action | Backend Endpoint | Request | Response | Database/Service |
|---|---|---|---|---|---|
| Case Detail → Run Analysis | Trigger full analysis | `POST /api/v1/cases/{case_id}/analyze` | Path: case_id | Complete analysis result with all signals, entities, graph, confidence, timeline | All services, PostgreSQL, Neo4j |

---

## 13. Investigation Timeline

| Frontend Screen | Frontend Action | Backend Endpoint | Request | Response | Database/Service |
|---|---|---|---|---|---|
| Case Detail → Timeline Tab | Load timeline | `GET /api/v1/cases/{case_id}/timeline` | Path: case_id, Query: start_date, end_date | `{ events: [] }` | PostgreSQL: timeline_events |

---

## 14. Investigator Review

| Frontend Screen | Frontend Action | Backend Endpoint | Request | Response | Database/Service |
|---|---|---|---|---|---|
| Case Detail → Review | Submit review | `POST /api/v1/cases/{case_id}/review` | `{ decision, notes, related_evidence }` | `{ review_id, reviewer, timestamp, decision, notes }` | PostgreSQL: reviews, Audit service |

---

## 15. Report Generation

| Frontend Screen | Frontend Action | Backend Endpoint | Request | Response | Database/Service |
|---|---|---|---|---|---|
| Case Detail → Reports | Generate report | `POST /api/v1/cases/{case_id}/report` | `{ format: "json" \| "pdf" }` | Full investigation report (JSON or PDF) | PostgreSQL: all tables, Report service |

---

## 16. Audit Log

| Frontend Screen | Frontend Action | Backend Endpoint | Request | Response | Database/Service |
|---|---|---|---|---|---|
| Case Detail → Audit Tab | View audit log | `GET /api/v1/cases/{case_id}/audit` | Path: case_id, Query: page, limit | `{ events: [], total }` | PostgreSQL: audit_events |

---

## 17. Global Search

| Frontend Screen | Frontend Action | Backend Endpoint | Request | Response | Database/Service |
|---|---|---|---|---|---|
| Header/Search Bar | Search | `GET /api/v1/search` | Query: q, type, page, limit | `{ results: { cases, entities, artifacts, wallets, domains, evidence } }` | PostgreSQL: full-text search, Search service |

---

## 18. System Status

| Frontend Screen | Frontend Action | Backend Endpoint | Request | Response | Database/Service |
|---|---|---|---|---|---|
| Settings/System | Check status | `GET /api/v1/system/status` | None | `{ api, postgresql, neo4j, analysis_engine, overall_status, version, timestamp }` | Health check services |

---

## Error Response Format (All Endpoints)

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "request_id": "uuid"
  }
}
```

---

## Authentication

- All endpoints (except `/auth/login` and `/system/status`) require `Authorization: Bearer <token>`
- Token expires per `JWT_EXPIRE_MINUTES` config
- Clearance level determines access to cases

---

## Data Labels

All synthetic/demo data must be clearly labeled: **SYNTHETIC / DEMONSTRATION DATA**

---

## Demo Credentials (Development Only)

```
investigator_id: INV-DEMO-001
security_passphrase: demo-passphrase-2026
```

---