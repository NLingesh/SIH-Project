import hashlib
import pytest
from datetime import datetime

from app.core.security import hash_password, verify_password, create_access_token, decode_token
from app.api.routes.analysis import extract_text_features, compare_features
from app.api.routes.osint import find_correlations, exact_match, fuzzy_match


def test_password_hashing():
    pwd = "demo-passphrase-2026"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("wrong", hashed) is False


def test_jwt_flow():
    token = create_access_token({"sub": "INV-DEMO-001", "clearance": 3})
    data = decode_token(token)
    assert data is not None
    assert data.investigator_id == "INV-DEMO-001"
    assert data.clearance_level == 3
    assert decode_token("invalid") is None


def test_sha256_real():
    content = b"hello world"
    expected = hashlib.sha256(content).hexdigest()
    assert expected == "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
    # Verify artifact hashing would use real hash
    assert len(expected) == 64


def test_stylometry_features():
    text = "The operational security depends on compartmentalization. Each node must operate independently!"
    feats = extract_text_features(text)
    assert "vocabulary_richness" in feats
    assert "avg_sentence_length" in feats
    assert "punctuation_distribution" in feats
    assert feats["word_count"] > 0
    assert feats["sentence_count"] >= 1


def test_stylometry_similarity():
    a = "The operational security of this network depends on compartmentalization. Each node must operate independently."
    b = "Operational security depends on compartmentalization of this network. Every node must function independently."
    fa = extract_text_features(a)
    fb = extract_text_features(b)
    score, top = compare_features(fa, fb)
    assert 0 <= score <= 100
    assert score > 60  # similar texts should have high score
    assert len(top) > 0

    c = "Yo check out this crypto trading bot! 100x returns guaranteed!!!"
    fc = extract_text_features(c)
    score2, _ = compare_features(fa, fc)
    assert score2 < score  # dissimilar should be lower


def test_osint_exact():
    assert exact_match("shadowbroker", "ShadowBroker") is True
    assert exact_match("shadowbroker", "other") is False


def test_osint_fuzzy():
    assert fuzzy_match("shadowbroker", "shadow_broker") > 0.7
    assert fuzzy_match("unrelated", "shadowbroker") == 0.0


def test_osint_correlations():
    ids = ["shadowbroker", "darkweb-market.xyz", "0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4"]
    corrs = find_correlations(ids, "CASE-2026-001")
    assert len(corrs) > 0
    assert any(c["identifier"] == "shadowbroker" for c in corrs)
    # fuzzy variant
    corrs2 = find_correlations(["shadow_broker"], "CASE-2026-001")
    assert len(corrs2) > 0


def test_confidence_weights():
    from app.api.routes.confidence import WEIGHTS, SignalType
    # weights should sum to 1.0
    total = sum(WEIGHTS.values())
    assert abs(total - 1.0) < 0.001
    assert WEIGHTS[SignalType.STYLOMETRY] == 0.25
    assert WEIGHTS[SignalType.OSINT] == 0.20


def test_case_status_enums():
    from app.models import CaseStatus, CasePriority
    assert CaseStatus.OPEN.value == "open"
    assert CasePriority.HIGH.value == "high"


def test_artifact_metadata_column():
    from app.models import Artifact
    # Ensure renamed column maps to "metadata" in DB
    col = Artifact.__table__.c["metadata"]
    assert col.key == "metadata"
    assert col.name == "metadata"


def test_audit_metadata_column():
    from app.models import AuditEvent
    col = AuditEvent.__table__.c["metadata"]
    assert col.key == "metadata"


def test_malformed_password_hash_is_rejected_safely():
    assert verify_password("anything", "not-a-bcrypt-hash") is False


def test_runtime_config_rejects_insecure_production_secret():
    from app.core.config import DEFAULT_JWT_SECRET, Settings

    production = Settings(APP_ENV="production", JWT_SECRET=DEFAULT_JWT_SECRET)
    with pytest.raises(ValueError, match="JWT_SECRET"):
        production.validate_runtime()


def test_runtime_config_accepts_valid_development_defaults():
    from app.core.config import Settings

    development = Settings(APP_ENV="development", JWT_SECRET="short-development-secret")
    development.validate_runtime()


def test_unauthorized_errors_advertise_bearer_authentication():
    from app.core.deps import unauthorized

    error = unauthorized("INVALID_TOKEN", "Invalid or expired token")
    assert error.status_code == 401
    assert error.headers == {"WWW-Authenticate": "Bearer"}
    assert error.detail["code"] == "INVALID_TOKEN"
