from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from uuid import UUID
from pydantic import BaseModel, Field, EmailStr
from enum import Enum


class CaseStatus(str, Enum):
    OPEN = "open"
    ACTIVE = "active"
    CLOSED = "closed"
    ARCHIVED = "archived"


class CasePriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class CaseClassification(str, Enum):
    UNCLASSIFIED = "unclassified"
    CONFIDENTIAL = "confidential"
    SECRET = "secret"
    TOP_SECRET = "top_secret"


class ArtifactSourceType(str, Enum):
    FILE = "file"
    URL = "url"
    DATABASE = "database"
    API = "api"
    MANUAL = "manual"


class EntityType(str, Enum):
    ACTOR = "actor"
    ALIAS = "alias"
    ACCOUNT = "account"
    WALLET = "wallet"
    DOMAIN = "domain"
    IP = "ip"
    DOCUMENT = "document"
    INFRASTRUCTURE = "infrastructure"


class SignalType(str, Enum):
    STYLOMETRY = "stylometry"
    BLOCKCHAIN = "blockchain"
    OSINT = "osint"
    TECHNICAL_FINGERPRINT = "technical_fingerprint"
    TEMPORAL = "temporal"


class ReviewDecision(str, Enum):
    CONFIRM_LEAD = "confirm_lead"
    REJECT_LEAD = "reject_lead"
    MARK_REQUIRES_REVIEW = "mark_requires_review"
    ADD_NOTE = "add_note"


class AuditEventType(str, Enum):
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


class CollectionStatus(str, Enum):
    READY = "ready"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    REQUIRES_REVIEW = "requires_review"


# Auth
class LoginRequest(BaseModel):
    investigator_id: Union[str, UUID]
    security_passphrase: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    investigator: "InvestigatorResponse"
    clearance_level: int


class InvestigatorResponse(BaseModel):
    id: Union[str, UUID]
    investigator_id: Union[str, UUID]
    full_name: Optional[str] = None
    email: Optional[str] = None
    clearance_level: int
    is_active: bool
    created_at: datetime


# Cases
class CaseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    investigator_id: Union[str, UUID]
    authorization_ref: Optional[str] = None
    priority: CasePriority = CasePriority.MEDIUM
    classification: CaseClassification = CaseClassification.UNCLASSIFIED


class CaseUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[CaseStatus] = None
    priority: Optional[CasePriority] = None
    classification: Optional[CaseClassification] = None
    authorization_ref: Optional[str] = None


class CaseResponse(BaseModel):
    id: Union[str, UUID]
    case_id: Union[str, UUID]
    title: str
    description: Optional[str]
    investigator_id: Union[str, UUID]
    authorization_ref: Optional[str]
    status: CaseStatus
    priority: CasePriority
    classification: CaseClassification
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime]

    class Config:
        from_attributes = True


class CaseListResponse(BaseModel):
    cases: List[CaseResponse]
    total: int
    page: int
    limit: int


# Artifacts
class ArtifactCreate(BaseModel):
    source_type: ArtifactSourceType
    source_ref: Optional[str] = None


class ArtifactResponse(BaseModel):
    model_config = {"from_attributes": True, "populate_by_name": True}
    id: Union[str, UUID]
    artifact_id: Union[str, UUID]
    case_id: Union[str, UUID]
    source_type: ArtifactSourceType
    source_ref: Optional[str]
    collected_at: datetime
    sha256: str
    raw_location: Optional[str]
    normalized_location: Optional[str]
    mime_type: Optional[str]
    file_size: Optional[int]
    metadata: Optional[str] = Field(default=None, validation_alias="artifact_metadata")
    created_at: datetime


# Evidence
class EvidenceResponse(BaseModel):
    id: Union[str, UUID]
    evidence_id: str
    entity_id: Optional[Union[str, UUID]]
    artifact_id: Union[str, UUID]
    signal_type: SignalType
    feature: str
    score: int
    explanation: Optional[str]
    confidence: int
    is_synthetic: bool
    created_at: datetime
    analyst_notes: Optional[str]

    class Config:
        from_attributes = True


# Entities
class AliasResponse(BaseModel):
    id: Union[str, UUID]
    alias_id: str
    entity_id: Union[str, UUID]
    value: str
    source: Optional[str]
    confidence: int
    is_synthetic: bool
    created_at: datetime

    class Config:
        from_attributes = True


class EntityCreate(BaseModel):
    type: EntityType
    canonical_label: str
    confidence: int = 0


class EntityUpdate(BaseModel):
    canonical_label: Optional[str] = None
    confidence: Optional[int] = None


class EntityResponse(BaseModel):
    id: Union[str, UUID]
    entity_id: Union[str, UUID]
    case_id: Union[str, UUID]
    type: EntityType
    canonical_label: str
    confidence: int
    is_synthetic: bool
    created_at: datetime
    updated_at: datetime
    aliases: List[AliasResponse] = []

    class Config:
        from_attributes = True


# Wallets
class WalletResponse(BaseModel):
    id: Union[str, UUID]
    wallet_id: Union[str, UUID]
    case_id: Union[str, UUID]
    address: str
    blockchain: str
    label: Optional[str]
    cluster_id: Optional[Union[str, UUID]]
    risk_score: int
    is_synthetic: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TransactionResponse(BaseModel):
    id: Union[str, UUID]
    transaction_id: str
    wallet_id: Union[str, UUID]
    tx_hash: str
    from_address: str
    to_address: str
    value: str
    token: Optional[str]
    timestamp: datetime
    block_number: Optional[int]
    is_synthetic: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Timeline
class TimelineEventResponse(BaseModel):
    id: Union[str, UUID]
    event_id: str
    case_id: Union[str, UUID]
    entity_id: Optional[Union[str, UUID]]
    timestamp: datetime
    event_type: str
    title: str
    description: Optional[str]
    source: Optional[str]
    evidence_ids: Optional[str]
    entity_ids: Optional[str]
    is_synthetic: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Review
class ReviewCreate(BaseModel):
    decision: ReviewDecision
    notes: Optional[str] = None
    related_evidence_ids: Optional[List[str]] = None


class ReviewResponse(BaseModel):
    id: Union[str, UUID]
    review_id: str
    case_id: Union[str, UUID]
    reviewer_id: Union[str, UUID]
    decision: ReviewDecision
    notes: Optional[str]
    related_evidence_ids: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewEnrichedResponse(ReviewResponse):
    entity_label: Optional[str] = None
    entity_type: Optional[str] = None
    lead_type: Optional[str] = None
    confidence: Optional[int] = None
    signals: List[str] = []
    submitted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Confidence
class ConfidenceScoreResponse(BaseModel):
    model_config = {"protected_namespaces": (), "from_attributes": True}
    id: Union[str, UUID]
    score_id: str
    case_id: Union[str, UUID]
    overall_confidence: int
    stylometry_score: Optional[int]
    blockchain_score: Optional[int]
    osint_score: Optional[int]
    technical_fingerprint_score: Optional[int]
    temporal_score: Optional[int]
    evidence_count: int
    explanation: Optional[str]
    uncertainty_factors: Optional[str]
    model_version: str
    is_synthetic: bool
    created_at: datetime
    updated_at: datetime



class SignalBreakdown(BaseModel):
    signal: str
    score: int
    weight: float
    contribution: float
    evidence_count: int
    details: Optional[Dict[str, Any]] = None


# OSINT
class OSINTRecordResponse(BaseModel):
    id: Union[str, UUID]
    record_id: str
    case_id: Union[str, UUID]
    source: str
    identifier: str
    identifier_type: Optional[str]
    match_type: Optional[str]
    correlation_score: int
    confidence: int
    evidence_reference: Optional[str]
    timestamp: datetime
    is_synthetic: bool
    raw_data: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Graph
class GraphNode(BaseModel):
    id: Union[str, UUID]
    label: str
    type: EntityType
    properties: Dict[str, Any] = {}


class GraphEdge(BaseModel):
    id: Union[str, UUID]
    source: str
    target: str
    relationship_type: str
    confidence: int
    evidence_ids: List[str] = []
    properties: Dict[str, Any] = {}


class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]


# Analysis
class StylometryRequest(BaseModel):
    document_a_id: str
    document_b_id: str


class StylometryResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    similarity_score: float
    top_contributing_features: List[Dict[str, Any]]
    compared_documents: List[str]
    explanation: str
    limitations: List[str]
    model_version: str


class OSINTRequest(BaseModel):
    identifiers: List[str]
    case_id: Optional[Union[str, UUID]] = None


class OSINTCorrelationResponse(BaseModel):
    source: str
    identifier: str
    match_type: str
    correlation_score: int
    confidence: int
    evidence_reference: str
    timestamp: datetime


class FingerprintRequest(BaseModel):
    artifact_ids: List[str]
    case_id: Optional[Union[str, UUID]] = None


class FingerprintResponse(BaseModel):
    signals: List[Dict[str, Any]]
    matches: List[Dict[str, Any]]
    confidence: int
    supporting_evidence: List[str]
    limitations: List[str]


class TemporalRequest(BaseModel):
    entity_ids: List[str]
    case_id: Optional[Union[str, UUID]] = None


class TemporalResponse(BaseModel):
    temporal_score: int
    matching_events: List[Dict[str, Any]]
    explanation: str


class CompleteAnalysisResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    case_id: Union[str, UUID]
    status: str
    signals: Dict[str, Any]
    entities: List[EntityResponse]
    graph: GraphResponse
    confidence: ConfidenceScoreResponse
    timeline: List[TimelineEventResponse]
    explanation: List[str]
    started_at: datetime
    completed_at: datetime


# Report
class ReportRequest(BaseModel):
    format: str = "json"


class ReportResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    case_info: Dict[str, Any]
    investigation_scope: str
    artifact_summary: Dict[str, Any]
    evidence_summary: Dict[str, Any]
    entities: List[Dict[str, Any]]
    relationships: List[GraphEdge]
    signal_scores: Dict[str, Any]
    confidence_explanation: Dict[str, Any]
    timeline: List[Dict[str, Any]]
    limitations: List[str]
    review_status: Dict[str, Any]
    audit_information: Dict[str, Any]
    generated_at: datetime


# Audit
class AuditEventResponse(BaseModel):
    model_config = {"from_attributes": True, "populate_by_name": True}
    id: Union[str, UUID]
    event_id: str
    case_id: Optional[Union[str, UUID]]
    user_id: Optional[Union[str, UUID]]
    event_type: AuditEventType
    description: Optional[str]
    metadata: Optional[str] = Field(default=None, validation_alias="event_metadata")
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime


# Intelligence
class IntelligenceJobResponse(BaseModel):
    id: Union[str, UUID]
    job_id: str
    case_id: Union[str, UUID]
    source: str
    job_type: str = Field(validation_alias="job_type")
    status: CollectionStatus
    progress: int
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    results: int
    authorized_by: Optional[str]
    is_synthetic: bool
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


# Search
class SearchResult(BaseModel):
    type: str
    id: Union[str, UUID]
    label: str
    snippet: Optional[str] = None
    metadata: Dict[str, Any] = {}


class SearchResponse(BaseModel):
    results: Dict[str, List[SearchResult]]
    total: int
    query: str


# System
class SystemStatusResponse(BaseModel):
    api: str
    postgresql: str
    neo4j: str
    analysis_engine: str
    overall_status: str
    version: str
    timestamp: datetime


# Error
class ErrorResponse(BaseModel):
    error: Dict[str, Any]