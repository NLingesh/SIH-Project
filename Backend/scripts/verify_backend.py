"""Verify backend with SQLite (no external DB needed)"""
import os
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_verify.db"
os.environ["DATABASE_URL_SYNC"] = "sqlite:///./test_verify.db"
os.environ["JWT_SECRET"] = "test-secret-key-min-32-chars-long-enough-here"
os.environ["NEO4J_URI"] = "bolt://localhost:7687"

# Must set before imports
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import Base, engine, AsyncSessionLocal
from app.core.security import hash_password
from app.models import User

async def setup():
    # Remove old db
    if os.path.exists("./test_verify.db"):
        os.remove("./test_verify.db")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Create demo user
    async with AsyncSessionLocal() as db:
        user = User(investigator_id="INV-DEMO-001", hashed_password=hash_password("demo-passphrase-2026"), full_name="Demo", clearance_level=3, is_active=True)
        db.add(user)
        await db.commit()
    print("Setup complete - DB created with demo user")

async def test_flow():
    await setup()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # health
        r = await client.get("/health")
        print(f"GET /health -> {r.status_code} {r.json()}")

        # system status
        r = await client.get("/api/v1/system/status")
        print(f"GET /api/v1/system/status -> {r.status_code} {r.json()['overall_status']}")

        # login
        r = await client.post("/api/v1/auth/login", json={"investigator_id": "INV-DEMO-001", "security_passphrase": "demo-passphrase-2026"})
        print(f"POST /api/v1/auth/login -> {r.status_code}")
        if r.status_code != 200:
            print(r.text)
            return
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # create case
        r = await client.post("/api/v1/cases", json={"title": "Test Case Alpha", "investigator_id": "INV-DEMO-001", "authorization_ref": "AUTH-001"}, headers=headers)
        print(f"POST /api/v1/cases -> {r.status_code} {r.json().get('case_id')}")
        case_id = r.json()["case_id"]

        # list cases
        r = await client.get("/api/v1/cases", headers=headers)
        print(f"GET /api/v1/cases -> {r.status_code} total={r.json()['total']}")

        # get case
        r = await client.get(f"/api/v1/cases/{case_id}", headers=headers)
        print(f"GET /api/v1/cases/{{id}} -> {r.status_code} title={r.json()['title']}")

        # create artifact (via file upload)
        content = b"Hello this is a test document for stylometry analysis. It has multiple sentences. Each sentence contributes to style."
        import io
        r = await client.post(f"/api/v1/cases/{case_id}/artifacts", headers=headers, files={"file": ("test.txt", io.BytesIO(content), "text/plain")}, data={"source_type": "file", "source_ref": "test.txt"})
        print(f"POST /api/v1/cases/{{id}}/artifacts -> {r.status_code} sha256={r.json().get('sha256')[:16] if r.status_code==201 else r.text}")
        art_id = r.json()["artifact_id"] if r.status_code == 201 else None

        # create second artifact for stylometry comparison
        content2 = b"Hello this is a second test document for stylometry. It has multiple sentences. Each sentence contributes to style as well."
        r2 = await client.post(f"/api/v1/cases/{case_id}/artifacts", headers=headers, files={"file": ("test2.txt", io.BytesIO(content2), "text/plain")}, data={"source_type": "file", "source_ref": "test2.txt"})
        print(f"POST second artifact -> {r2.status_code}")
        art2_id = r2.json()["artifact_id"] if r2.status_code == 201 else None

        # stylometry
        if art_id and art2_id:
            r = await client.post("/api/v1/analysis/stylometry", headers=headers, json={"document_a_id": art_id, "document_b_id": art2_id})
            print(f"POST /api/v1/analysis/stylometry -> {r.status_code} score={r.json().get('similarity_score') if r.status_code==200 else r.text[:200]}")

        # osint
        r = await client.post("/api/v1/analysis/osint", headers=headers, json={"identifiers": ["shadowbroker", "darkweb-market.xyz"], "case_id": case_id})
        print(f"POST /api/v1/analysis/osint -> {r.status_code} found={len(r.json()) if r.status_code==200 else r.text[:100]}")

        # fingerprint
        if art_id:
            r = await client.post("/api/v1/analysis/fingerprint", headers=headers, json={"artifact_ids": [art_id], "case_id": case_id})
            print(f"POST /api/v1/analysis/fingerprint -> {r.status_code}")

        # confidence
        r = await client.get(f"/api/v1/cases/{case_id}/confidence", headers=headers)
        print(f"GET /api/v1/cases/{{id}}/confidence -> {r.status_code} overall={r.json().get('overall_confidence') if r.status_code==200 else r.text[:200]}")

        # graph
        r = await client.get(f"/api/v1/cases/{case_id}/graph", headers=headers)
        print(f"GET /api/v1/cases/{{id}}/graph -> {r.status_code} nodes={len(r.json().get('nodes',[])) if r.status_code==200 else 0}")

        # timeline
        r = await client.get(f"/api/v1/cases/{case_id}/timeline", headers=headers)
        print(f"GET /api/v1/cases/{{id}}/timeline -> {r.status_code} events={len(r.json()) if r.status_code==200 else 0}")

        # analyze pipeline
        r = await client.post(f"/api/v1/cases/{case_id}/analyze", headers=headers)
        print(f"POST /api/v1/cases/{{id}}/analyze -> {r.status_code} confidence={r.json().get('confidence',{}).get('overall_confidence') if r.status_code==200 else r.text[:300]}")

        # review
        r = await client.post(f"/api/v1/cases/{case_id}/review", headers=headers, json={"decision": "mark_requires_review", "notes": "Needs further verification"})
        print(f"POST /api/v1/cases/{{id}}/review -> {r.status_code}")

        # report
        r = await client.post(f"/api/v1/cases/{case_id}/report", headers=headers, json={"format": "json"})
        print(f"POST /api/v1/cases/{{id}}/report -> {r.status_code}")

        # audit
        r = await client.get(f"/api/v1/cases/{case_id}/audit", headers=headers)
        print(f"GET /api/v1/cases/{{id}}/audit -> {r.status_code} events={len(r.json()) if r.status_code==200 else 0}")

        # search
        r = await client.get("/api/v1/search?q=Test", headers=headers)
        print(f"GET /api/v1/search?q=Test -> {r.status_code} total={r.json().get('total') if r.status_code==200 else 0}")

        print("\nAll verifications completed!")

if __name__ == "__main__":
    asyncio.run(test_flow())
