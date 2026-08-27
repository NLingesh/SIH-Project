import os
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./darktrace.db"
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_token():
    r = client.post("/api/v1/auth/login", json={"investigator_id": "INV-DEMO-001", "security_passphrase": "demo-passphrase-2026"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]

TOKEN = get_token()
CASE_ID = "CASE-2026-001"
H = {"Authorization": f"Bearer {TOKEN}"}

def test_intelligence_endpoint():
    r = client.get(f"/api/v1/cases/{CASE_ID}/intelligence", headers=H)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 6, "expected 6 collection jobs"
    # required fields from Frontend Intelligence.tsx
    required = {"job_id", "source", "job_type", "status", "progress", "results", "authorized_by"}
    for job in data:
        for f in required:
            assert f in job, f"missing {f}"
        assert job["status"] in ["ready","running","completed","failed","requires_review"]
        assert 0 <= job["progress"] <= 100
    # check known job
    ids = [j["job_id"] for j in data]
    assert any("COL-001" in j for j in ids)
    # case isolation
    r2 = client.get(f"/api/v1/cases/CASE-2026-002/intelligence", headers=H)
    if r2.status_code == 200:
        assert len(r2.json()) >= 1

def test_intelligence_404():
    r = client.get("/api/v1/cases/INVALID/intelligence", headers=H)
    assert r.status_code == 404

def test_review_enriched():
    r = client.get(f"/api/v1/cases/{CASE_ID}/reviews", headers=H)
    assert r.status_code == 200, r.text
    data = r.json()
    # if empty, create one to test enrichment
    if len(data) == 0:
        # create review with evidence
        ev = client.get(f"/api/v1/cases/{CASE_ID}/evidence", headers=H).json()
        ev_id = ev[0]["evidence_id"] if ev else None
        cr = client.post(f"/api/v1/cases/{CASE_ID}/review", headers=H, json={"decision":"confirm_lead","notes":"p1 test","related_evidence_ids": [ev_id] if ev_id else []})
        assert cr.status_code == 201, cr.text
        r = client.get(f"/api/v1/cases/{CASE_ID}/reviews", headers=H)
        data = r.json()
    assert len(data) >= 1
    for rev in data:
        assert "review_id" in rev and "decision" in rev
        # enriched fields
        assert "entity_label" in rev, "missing entity_label enrichment"
        assert "lead_type" in rev
        assert "signals" in rev
        assert "confidence" in rev or rev.get("confidence") is None
        # at least one should have entity_label populated
    assert any(rev.get("entity_label") for rev in data), "no enriched entity_label found"
    # singular alias still works
    r2 = client.get(f"/api/v1/cases/{CASE_ID}/review", headers=H)
    assert r2.status_code == 200
    assert len(r2.json()) == len(data)

def test_report_relationships():
    r = client.post(f"/api/v1/cases/{CASE_ID}/report", headers=H, json={"format":"json"})
    assert r.status_code == 200, r.text
    j = r.json()
    assert "relationships" in j
    assert isinstance(j["relationships"], list)
    assert len(j["relationships"]) >= 1, "relationships should be populated from graph (evidence-derived)"
    # check shape
    for rel in j["relationships"][:2]:
        assert "source" in rel and "target" in rel and "relationship_type" in rel and "confidence" in rel
    # also GET json
    r2 = client.get(f"/api/v1/cases/{CASE_ID}/report?format=json", headers=H)
    assert r2.status_code == 200
    assert len(r2.json()["relationships"]) >= 1

def test_pdf_generation():
    r = client.get(f"/api/v1/cases/{CASE_ID}/report?format=pdf", headers=H)
    assert r.status_code == 200, r.text[:500]
    assert r.headers.get("content-type","").startswith("application/pdf")
    assert r.content[:4] == b"%PDF", "not a valid PDF header"
    assert len(r.content) > 2000, "pdf too small"
    # also via POST? ensure POST pdf not required but GET is

def test_neo4j_fallback():
    # neo4j is unavailable in test env, graph should still return fallback edges
    r = client.get(f"/api/v1/cases/{CASE_ID}/graph", headers=H)
    assert r.status_code == 200
    j = r.json()
    assert len(j["nodes"]) >= 10
    assert len(j["edges"]) >= 1
    # system status should show degraded not unhealthy
    r2 = client.get("/api/v1/system/status")
    assert r2.status_code == 200
    j2 = r2.json()
    assert j2["neo4j"] in ["unavailable","healthy"]
    assert j2["overall_status"] in ["healthy","degraded"]
