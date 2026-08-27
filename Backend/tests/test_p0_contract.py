import pytest
import os

# Ensure sqlite DB is used
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./darktrace.db"

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_token():
    resp = client.post("/api/v1/auth/login", json={"investigator_id": "INV-DEMO-001", "security_passphrase": "demo-passphrase-2026"})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]

TOKEN = None
CASE_ID = "CASE-2026-001"

@pytest.fixture(autouse=True, scope="module")
def auth_token():
    global TOKEN
    resp = client.post("/api/v1/auth/login", json={"investigator_id": "INV-DEMO-001", "security_passphrase": "demo-passphrase-2026"})
    assert resp.status_code == 200
    TOKEN = resp.json()["access_token"]
    yield

def auth_headers():
    return {"Authorization": f"Bearer {TOKEN}"}

def test_cases_q_filter():
    resp = client.get("/api/v1/cases?q=Shadow", headers=auth_headers())
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["total"] >= 1
    assert any("Shadow" in c["title"] for c in data["cases"])

def test_cases_priority_filter():
    resp = client.get("/api/v1/cases?priority=high", headers=auth_headers())
    assert resp.status_code == 200
    assert all(c["priority"] == "high" for c in resp.json()["cases"])

def test_cases_classification_filter():
    resp = client.get("/api/v1/cases?classification=confidential", headers=auth_headers())
    assert resp.status_code == 200
    assert all(c["classification"] == "confidential" for c in resp.json()["cases"])

def test_cases_sort_confidence():
    resp = client.get("/api/v1/cases?sort=confidence&order=desc", headers=auth_headers())
    assert resp.status_code == 200
    assert resp.json()["total"] >= 2

def test_cases_sort_evidence():
    resp = client.get("/api/v1/cases?sort=evidence&order=asc", headers=auth_headers())
    assert resp.status_code == 200
    assert resp.json()["total"] >= 2

def test_cases_include_stats_compat():
    resp = client.get("/api/v1/cases?include_stats=true", headers=auth_headers())
    assert resp.status_code == 200
    # existing response shape preserved
    assert "cases" in resp.json() and "total" in resp.json()

def test_cases_sort_created():
    resp = client.get("/api/v1/cases?sort=created&order=asc", headers=auth_headers())
    assert resp.status_code == 200

def test_evidence_per_case():
    resp = client.get(f"/api/v1/cases/{CASE_ID}/evidence", headers=auth_headers())
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 8
    # signal filter
    resp2 = client.get(f"/api/v1/cases/{CASE_ID}/evidence?signal_type=stylometry", headers=auth_headers())
    assert resp2.status_code == 200
    assert all(e["signal_type"] == "stylometry" for e in resp2.json())

def test_evidence_legacy_still_works():
    resp = client.get(f"/api/v1/evidence?case_id={CASE_ID}", headers=auth_headers())
    assert resp.status_code == 200
    assert len(resp.json()) == 8
    # get single evidence
    eid = resp.json()[0]["evidence_id"]
    resp2 = client.get(f"/api/v1/evidence/{eid}", headers=auth_headers())
    assert resp2.status_code == 200

def test_evidence_invalid_case_404():
    resp = client.get("/api/v1/cases/INVALID/evidence", headers=auth_headers())
    assert resp.status_code == 404

def test_temporal_endpoint():
    # need an entity id from case
    resp = client.get(f"/api/v1/cases/{CASE_ID}/entities", headers=auth_headers())
    assert resp.status_code == 200
    entities = resp.json()
    assert len(entities) > 0
    eid = entities[0]["entity_id"]
    # with entity + case
    resp2 = client.post("/api/v1/analysis/temporal", headers=auth_headers(), json={"entity_ids": [eid], "case_id": CASE_ID})
    assert resp2.status_code == 200, resp2.text
    j = resp2.json()
    assert "temporal_score" in j and "matching_events" in j and "explanation" in j
    assert 0 <= j["temporal_score"] <= 100
    # case only
    resp3 = client.post("/api/v1/analysis/temporal", headers=auth_headers(), json={"entity_ids": [], "case_id": CASE_ID})
    assert resp3.status_code == 200

def test_graph_comma_separated_and_fallback():
    resp = client.get(f"/api/v1/cases/{CASE_ID}/graph", headers=auth_headers())
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "nodes" in data and "edges" in data
    assert len(data["nodes"]) >= 10
    assert len(data["edges"]) >= 1, "fallback edges materialization missing"
    # comma separated filter
    resp2 = client.get(f"/api/v1/cases/{CASE_ID}/graph?relationship_types=STYLOMETRY_LINK,OSINT_LINK", headers=auth_headers())
    assert resp2.status_code == 200
    edges = resp2.json()["edges"]
    # all edges should be of requested types
    assert all(e["relationship_type"] in ["STYLOMETRY_LINK", "OSINT_LINK"] for e in edges)
    # single type
    resp3 = client.get(f"/api/v1/cases/{CASE_ID}/graph?relationship_types=STYLOMETRY_LINK", headers=auth_headers())
    assert resp3.status_code == 200
    assert all(e["relationship_type"] == "STYLOMETRY_LINK" for e in resp3.json()["edges"])

def test_graph_wallet_cluster_edges():
    resp = client.get(f"/api/v1/cases/{CASE_ID}/graph", headers=auth_headers())
    edges = resp.json()["edges"]
    # should contain at least one wallet transaction edge from cluster
    assert any(e["relationship_type"] == "WALLET_TRANSACTION" for e in edges)

def test_confidence_preserved():
    resp = client.get(f"/api/v1/cases/{CASE_ID}/confidence", headers=auth_headers())
    assert resp.status_code == 200
    j = resp.json()
    # existing fields preserved
    assert "overall_confidence" in j and "stylometry_score" in j
    # weights still sum 1.0 checked in test_core
