import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Column, String, Integer, DateTime, Enum, Text, ForeignKey, Index, Boolean, BigInteger
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import uuid

from app.core.database import Base


class CaseStatus(str, enum.Enum):
    OPEN = "open"
    ACTIVE = "active"
    CLOSED = "closed"
    ARCHIVED = "archived"


class CasePriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class CaseClassification(str, enum.Enum):
    UNCLASSIFIED = "unclassified"
    CONFIDENTIAL = "confidential"
    SECRET = "secret"
    TOP_SECRET = "top_secret"


class ArtifactSourceType(str, enum.Enum):
    FILE = "file"
    URL = "url"
    DATABASE = "database"
    API = "api"
    MANUAL = "manual"


class EntityType(str, enum.Enum):
    ACTOR = "actor"
    ALIAS = "alias"
    ACCOUNT = "account"
    WALLET = "wallet"
    DOMAIN = "domain"
    IP = "ip"
    DOCUMENT = "document"
    INFRASTRUCTURE = "infrastructure"


class SignalType(str, enum.Enum):
    STYLOMETRY = "stylometry"
    BLOCKCHAIN = "blockchain"
    OSINT = "osint"
    TECHNICAL_FINGERPRINT = "technical_fingerprint"
    TEMPORAL = "temporal"


class ReviewDecision(str, enum.Enum):
    CONFIRM_LEAD = "confirm_lead"
    REJECT_LEAD = "reject_lead"
    MARK_REQUIRES_REVIEW = "mark_requires_review"
    ADD_NOTE = "add_note"


class AuditEventType(str, enum.Enum):
    LOGIN = "login"
    CASE_CREATED = "case_created"
    CASE_VIEWED = "case_viewed"
    ARTIFACT_ADDED = "artifact_added"
    EVIDENCE_VIEWED = "evidence_viewed"
    ANALYSIS_STARTED = "analysis_started"
    ANALYSIS_COMPLETED = "analysis_completed"
    ENTITY_RESOLVED = "entity_resolved"
    GRAPH_VIEWED = "graph_viewed"
    REVIEW_CREATED = "review_created"
    REPORT_GENERATED = "report_generated"
    CASE_UPDATED = "case_updated"
    ENTITY_CREATED = "entity_created"
    ENTITY_UPDATED = "entity_updated"


class CollectionStatus(str, enum.Enum):
    READY = "ready"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    REQUIRES_REVIEW = "requires_review"


class User(Base):
    __tablename__ = "users"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    investigator_id = Column(String(50), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    email = Column(String(100))
    clearance_level = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    cases = relationship("Case", back_populates="investigator")


class Case(Base):
    __tablename__ = "cases"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    investigator_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    authorization_ref = Column(String(100))
    status = Column(Enum(CaseStatus), default=CaseStatus.OPEN, nullable=False)
    priority = Column(Enum(CasePriority), default=CasePriority.MEDIUM)
    classification = Column(Enum(CaseClassification), default=CaseClassification.UNCLASSIFIED)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)
    
    investigator = relationship("User", back_populates="cases")
    artifacts = relationship("Artifact", back_populates="case", cascade="all, delete-orphan")
    entities = relationship("Entity", back_populates="case", cascade="all, delete-orphan")
    wallets = relationship("Wallet", back_populates="case", cascade="all, delete-orphan")
    timeline_events = relationship("TimelineEvent", back_populates="case", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="case", cascade="all, delete-orphan")
    intelligence_jobs = relationship("IntelligenceJob", back_populates="case", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="case", cascade="all, delete-orphan")
    confidence_scores = relationship("ConfidenceScore", back_populates="case", cascade="all, delete-orphan")
    osint_records = relationship("OSINTRecord", back_populates="case", cascade="all, delete-orphan")


class Artifact(Base):
    __tablename__ = "artifacts"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    artifact_id = Column(String(50), unique=True, nullable=False, index=True)
    case_id = Column(PG_UUID(as_uuid=True), ForeignKey("cases.id"), nullable=False, index=True)
    source_type = Column(Enum(ArtifactSourceType), nullable=False)
    source_ref = Column(String(500))
    collected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    sha256 = Column(String(64), nullable=False, index=True)
    raw_location = Column(String(500))
    normalized_location = Column(String(500))
    mime_type = Column(String(100))
    file_size = Column(BigInteger)
    artifact_metadata = Column("metadata", Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    case = relationship("Case", back_populates="artifacts")
    evidence = relationship("Evidence", back_populates="artifact", cascade="all, delete-orphan")


class Evidence(Base):
    __tablename__ = "evidence"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evidence_id = Column(String(50), unique=True, nullable=False, index=True)
    entity_id = Column(PG_UUID(as_uuid=True), ForeignKey("entities.id"), nullable=True, index=True)
    artifact_id = Column(PG_UUID(as_uuid=True), ForeignKey("artifacts.id"), nullable=False, index=True)
    signal_type = Column(Enum(SignalType), nullable=False)
    feature = Column(String(200), nullable=False)
    score = Column(Integer, default=0)
    explanation = Column(Text)
    confidence = Column(Integer, default=0)
    is_synthetic = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    analyst_notes = Column(Text)
    
    artifact = relationship("Artifact", back_populates="evidence")
    entity = relationship("Entity", back_populates="evidence")


class Entity(Base):
    __tablename__ = "entities"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_id = Column(String(50), unique=True, nullable=False, index=True)
    case_id = Column(PG_UUID(as_uuid=True), ForeignKey("cases.id"), nullable=False, index=True)
    type = Column(Enum(EntityType), nullable=False, index=True)
    canonical_label = Column(String(200), nullable=False)
    confidence = Column(Integer, default=0)
    is_synthetic = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    case = relationship("Case", back_populates="entities")
    aliases = relationship("Alias", back_populates="entity", cascade="all, delete-orphan")
    evidence = relationship("Evidence", back_populates="entity")
    timeline_events = relationship("TimelineEvent", back_populates="entity")


class Alias(Base):
    __tablename__ = "aliases"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alias_id = Column(String(50), unique=True, nullable=False, index=True)
    entity_id = Column(PG_UUID(as_uuid=True), ForeignKey("entities.id"), nullable=False, index=True)
    value = Column(String(200), nullable=False, index=True)
    source = Column(String(100))
    confidence = Column(Integer, default=0)
    is_synthetic = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    entity = relationship("Entity", back_populates="aliases")


class Wallet(Base):
    __tablename__ = "wallets"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wallet_id = Column(String(50), unique=True, nullable=False, index=True)
    case_id = Column(PG_UUID(as_uuid=True), ForeignKey("cases.id"), nullable=False, index=True)
    address = Column(String(100), nullable=False, index=True)
    blockchain = Column(String(50), default="ethereum")
    label = Column(String(100))
    cluster_id = Column(String(50), index=True)
    risk_score = Column(Integer, default=0)
    is_synthetic = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    case = relationship("Case", back_populates="wallets")
    transactions = relationship("Transaction", back_populates="wallet", cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id = Column(String(100), unique=True, nullable=False, index=True)
    wallet_id = Column(PG_UUID(as_uuid=True), ForeignKey("wallets.id"), nullable=False, index=True)
    tx_hash = Column(String(100), nullable=False, index=True)
    from_address = Column(String(100), index=True)
    to_address = Column(String(100), index=True)
    value = Column(String(50))
    token = Column(String(50))
    timestamp = Column(DateTime, nullable=False, index=True)
    block_number = Column(Integer)
    is_synthetic = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    wallet = relationship("Wallet", back_populates="transactions")


class TimelineEvent(Base):
    __tablename__ = "timeline_events"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(String(50), unique=True, nullable=False, index=True)
    case_id = Column(PG_UUID(as_uuid=True), ForeignKey("cases.id"), nullable=False, index=True)
    entity_id = Column(PG_UUID(as_uuid=True), ForeignKey("entities.id"), nullable=True, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    source = Column(String(100))
    evidence_ids = Column(Text)
    entity_ids = Column(Text)
    is_synthetic = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    case = relationship("Case", back_populates="timeline_events")
    entity = relationship("Entity", back_populates="timeline_events")


class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id = Column(String(50), unique=True, nullable=False, index=True)
    case_id = Column(PG_UUID(as_uuid=True), ForeignKey("cases.id"), nullable=False, index=True)
    reviewer_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    decision = Column(Enum(ReviewDecision), nullable=False)
    notes = Column(Text)
    related_evidence_ids = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    case = relationship("Case", back_populates="reviews")
    reviewer = relationship("User")


class ConfidenceScore(Base):
    __tablename__ = "confidence_scores"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    score_id = Column(String(50), unique=True, nullable=False, index=True)
    case_id = Column(PG_UUID(as_uuid=True), ForeignKey("cases.id"), nullable=False, index=True)
    overall_confidence = Column(Integer, default=0)
    stylometry_score = Column(Integer)
    blockchain_score = Column(Integer)
    osint_score = Column(Integer)
    technical_fingerprint_score = Column(Integer)
    temporal_score = Column(Integer)
    evidence_count = Column(Integer, default=0)
    explanation = Column(Text)
    uncertainty_factors = Column(Text)
    model_version = Column(String(50), default="1.0.0")
    is_synthetic = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    case = relationship("Case", back_populates="confidence_scores")


class OSINTRecord(Base):
    __tablename__ = "osint_records"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_id = Column(String(50), unique=True, nullable=False, index=True)
    case_id = Column(PG_UUID(as_uuid=True), ForeignKey("cases.id"), nullable=False, index=True)
    source = Column(String(100), nullable=False)
    identifier = Column(String(200), nullable=False, index=True)
    identifier_type = Column(String(50))
    match_type = Column(String(50))
    correlation_score = Column(Integer, default=0)
    confidence = Column(Integer, default=0)
    evidence_reference = Column(String(200))
    timestamp = Column(DateTime, nullable=False, index=True)
    is_synthetic = Column(Boolean, default=False)
    raw_data = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    case = relationship("Case", back_populates="osint_records")


class AuditEvent(Base):
    __tablename__ = "audit_events"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(String(50), unique=True, nullable=False, index=True)
    case_id = Column(PG_UUID(as_uuid=True), ForeignKey("cases.id"), nullable=True, index=True)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    event_type = Column(Enum(AuditEventType), nullable=False, index=True)
    description = Column(Text)
    event_metadata = Column("metadata", Text)
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    case = relationship("Case", back_populates="audit_events")
    user = relationship("User")


class IntelligenceJob(Base):
    __tablename__ = "intelligence_jobs"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(String(50), unique=True, nullable=False, index=True)
    case_id = Column(PG_UUID(as_uuid=True), ForeignKey("cases.id"), nullable=False, index=True)
    source = Column(String(300), nullable=False)
    job_type = Column(String(200), nullable=False)
    status = Column(Enum(CollectionStatus), nullable=False, default=CollectionStatus.READY)
    progress = Column(Integer, default=0)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    results = Column(Integer, default=0)
    authorized_by = Column(String(200))
    is_synthetic = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    result_id = Column(String(50), unique=True, nullable=False, index=True)
    case_id = Column(PG_UUID(as_uuid=True), ForeignKey("cases.id"), nullable=False, index=True)
    analysis_type = Column(String(50), nullable=False)
    input_data = Column(Text)
    output_data = Column(Text)
    status = Column(String(20), default="pending")
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text)
    is_synthetic = Column(Boolean, default=False)
    
    case = relationship("Case")