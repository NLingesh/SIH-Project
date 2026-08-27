export type CaseStatus = 'open' | 'active' | 'closed' | 'archived'
export type CasePriority = 'low' | 'medium' | 'high' | 'critical'
export type CaseClassification = 'unclassified' | 'confidential' | 'secret' | 'top_secret'
export type EntityType = 'actor' | 'alias' | 'account' | 'wallet' | 'domain' | 'ip' | 'document' | 'infrastructure'
export type SignalType = 'stylometry' | 'blockchain' | 'osint' | 'technical_fingerprint' | 'temporal'
export type ArtifactSource = 'file' | 'url' | 'database' | 'api' | 'manual'
export type ReviewDecision = 'confirm_lead' | 'reject_lead' | 'mark_requires_review' | 'add_note'
export type CollectionStatus = 'ready' | 'running' | 'completed' | 'failed' | 'requires_review'

export interface CaseItem{
  id:string
  case_id:string
  title:string
  description:string
  investigator:string
  authorization_ref:string
  status:CaseStatus
  priority:CasePriority
  classification:CaseClassification
  created_at:string
  updated_at:string
  evidence_count:number
  confidence:number
  entities:number
  artifacts:number
}

export interface EvidenceItem{
  evidence_id:string
  artifact_id:string
  artifact_name:string
  entity_id?:string
  signal_type:SignalType
  feature:string
  score:number
  confidence:number
  explanation:string
  hash:string
  source:string
  type:string
  collected_at:string
  integrity:'verified'|'pending'|'failed'
  processing:'processed'|'processing'|'queued'
  is_synthetic:boolean
}

export interface ArtifactItem{
  artifact_id:string
  case_id:string
  source_type:ArtifactSource
  source_ref:string
  sha256:string
  mime:string
  size:number
  collected_at:string
  provenance:string
}

export interface EntityItem{
  entity_id:string
  case_id:string
  type:EntityType
  label:string
  confidence:number
  aliases:string[]
  risk?:number
  is_synthetic:boolean
}

export interface WalletItem{
  wallet_id:string
  case_id:string
  address:string
  blockchain:string
  label:string
  cluster_id:string
  risk_score:number
  evidence_ids:string[]
}

export interface TimelineEvent{
  event_id:string
  timestamp:string
  type:string
  title:string
  description:string
  entity_id?:string
  evidence_ids?:string
  source:string
}

export interface OSINTRecord{
  record_id:string
  source:string
  identifier:string
  identifier_type:string
  match_type:string
  correlation_score:number
  confidence:number
  evidence_reference:string
  timestamp:string
  raw_data:string
}

export interface ConfidenceBreakdown{
  overall:number
  stylometry:number
  blockchain:number
  osint:number
  technical:number
  temporal:number
  evidence_count:number
  contributions: Array<{signal:string; score:number; weight:number; contribution:number}>
  explanation:string
  uncertainty:string
}

export interface GraphNode{
  id:string
  label:string
  type:EntityType
  confidence:number
  x?:number
  y?:number
}
export interface GraphEdge{
  id:string
  source:string
  target:string
  type:string
  confidence:number
  evidence_ids:string[]
}

export interface CollectionJob{
  id:string
  source:string
  type:string
  status:CollectionStatus
  progress:number
  started_at:string
  completed_at?:string
  results:number
  authorized_by:string
}

export interface ReviewItem{
  review_id:string
  case_id:string
  entity_label:string
  entity_type:EntityType
  lead_type:string
  confidence:number
  status:'pending'|'confirmed'|'rejected'|'requires_more'
  submitted_at:string
  signals:string[]
}

export interface SystemStatus{
  api:string
  postgresql:string
  neo4j:string
  analysis_engine:string
  overall:string
}
