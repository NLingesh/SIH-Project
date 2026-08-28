import type {
  ArtifactItem,
  CaseItem,
  CollectionJob,
  ConfidenceBreakdown,
  EntityItem,
  EvidenceItem,
  GraphEdge,
  GraphNode,
  OSINTRecord,
  ReviewItem,
  SystemStatus,
  TimelineEvent,
} from '../types'

export const API_BASE = ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '')

export interface Investigator {
  id: string
  investigator_id: string
  full_name?: string | null
  email?: string | null
  clearance_level: number
  is_active: boolean
  created_at: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  investigator: Investigator
  clearance_level: number
}

export interface StoredSession {
  token: string
  investigator: Investigator
  clearance_level: number
}

export class ApiError extends Error {
  status: number
  code?: string
  requestId?: string

  constructor(message: string, status: number, code?: string, requestId?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.requestId = requestId
  }
}

const TOKEN_KEY = 'dt_token'
const SESSION_KEY = 'dt_session'

export function getStoredSession(): StoredSession | null {
  const token = localStorage.getItem(TOKEN_KEY)
  const raw = localStorage.getItem(SESSION_KEY)
  if (!token || !raw) return null
  try {
    const session = JSON.parse(raw) as StoredSession
    return session.token === token ? session : null
  } catch {
    return null
  }
}

export function storeSession(response: LoginResponse): StoredSession {
  const session: StoredSession = {
    token: response.access_token,
    investigator: response.investigator,
    clearance_level: response.clearance_level,
  }
  localStorage.setItem(TOKEN_KEY, session.token)
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  window.dispatchEvent(new Event('dt-session-changed'))
  return session
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(SESSION_KEY)
  window.dispatchEvent(new Event('dt-session-changed'))
}

async function readError(response: Response): Promise<{ message: string; code?: string; requestId?: string }> {
  const fallback = response.statusText || `Request failed (${response.status})`
  try {
    const body = await response.json() as {
      error?: { message?: string; code?: string; request_id?: string }
      detail?: { message?: string; code?: string; request_id?: string } | string
    }
    const error = body.error || (typeof body.detail === 'object' ? body.detail : undefined)
    return {
      message: error?.message || (typeof body.detail === 'string' ? body.detail : fallback),
      code: error?.code,
      requestId: error?.request_id,
    }
  } catch {
    return { message: fallback }
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY)
  const headers = new Headers(options.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  } catch {
    throw new ApiError('Unable to reach the backend API. Check that it is running and VITE_API_URL is correct.', 0, 'NETWORK_ERROR')
  }

  if (response.status === 401) clearSession()
  if (!response.ok) {
    const error = await readError(response)
    throw new ApiError(error.message, response.status, error.code, error.requestId)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function login(investigator_id: string, security_passphrase: string): Promise<StoredSession> {
  const response = await api<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ investigator_id, security_passphrase }),
  })
  return storeSession(response)
}

export interface ApiCase {
  id: string
  case_id: string
  title: string
  description?: string | null
  investigator_id: string
  authorization_ref?: string | null
  status: CaseItem['status']
  priority: CaseItem['priority']
  classification: CaseItem['classification']
  created_at: string
  updated_at: string
  closed_at?: string | null
}

export interface ApiEvidence {
  id: string
  evidence_id: string
  entity_id?: string | null
  artifact_id: string
  signal_type: EvidenceItem['signal_type']
  feature: string
  score: number
  explanation?: string | null
  confidence: number
  is_synthetic: boolean
  created_at: string
  analyst_notes?: string | null
}

export interface ApiArtifact {
  id: string
  artifact_id: string
  case_id: string
  source_type: ArtifactItem['source_type']
  source_ref?: string | null
  collected_at: string
  sha256: string
  raw_location?: string | null
  normalized_location?: string | null
  mime_type?: string | null
  file_size?: number | null
  metadata?: string | null
  created_at: string
}

export interface ApiEntity {
  id: string
  entity_id: string
  case_id: string
  type: EntityItem['type']
  canonical_label: string
  confidence: number
  is_synthetic: boolean
  created_at: string
  updated_at: string
  aliases: Array<{ alias_id: string; value: string; confidence: number; source?: string | null }>
}

export interface ApiGraph {
  nodes: Array<{ id: string; label: string; type: EntityItem['type']; properties: Record<string, unknown> }>
  edges: Array<{ id: string; source: string; target: string; relationship_type: string; confidence: number; evidence_ids: string[]; properties: Record<string, unknown> }>
}

export interface ApiConfidence {
  id: string
  score_id: string
  case_id: string
  overall_confidence: number
  stylometry_score?: number | null
  blockchain_score?: number | null
  osint_score?: number | null
  technical_fingerprint_score?: number | null
  temporal_score?: number | null
  evidence_count: number
  explanation?: string | null
  uncertainty_factors?: string | null
  model_version: string
  is_synthetic: boolean
  created_at: string
  updated_at: string
}

export interface ApiReview {
  id: string
  review_id: string
  case_id: string
  reviewer_id: string
  decision: ReviewItem['status'] | 'confirm_lead' | 'reject_lead' | 'mark_requires_review' | 'add_note'
  notes?: string | null
  related_evidence_ids?: string | null
  created_at: string
  entity_label?: string | null
  entity_type?: string | null
  lead_type?: string | null
  confidence?: number | null
  signals: string[]
  submitted_at?: string | null
}

export interface ApiReport {
  case_info: Record<string, unknown>
  investigation_scope: string
  artifact_summary: Record<string, unknown>
  evidence_summary: Record<string, unknown>
  entities: Array<Record<string, unknown>>
  relationships: ApiGraph['edges']
  signal_scores: Record<string, unknown>
  confidence_explanation: Record<string, unknown>
  timeline: Array<Record<string, unknown>>
  limitations: string[]
  review_status: Record<string, unknown>
  audit_information: Record<string, unknown>
  generated_at: string
}

export interface ApiTimeline {
  id: string
  event_id: string
  case_id: string
  entity_id?: string | null
  timestamp: string
  event_type: string
  title: string
  description?: string | null
  source?: string | null
  evidence_ids?: string | null
  entity_ids?: string | null
  is_synthetic: boolean
  created_at: string
}

export interface ApiAuditEvent {
  id: string
  event_id: string
  case_id?: string | null
  user_id?: string | null
  event_type: string
  description?: string | null
  metadata?: string | null
  ip_address?: string | null
  user_agent?: string | null
  created_at: string
}

export interface ApiIntelligenceJob {
  id: string
  job_id: string
  case_id: string
  source: string
  job_type: string
  status: CollectionJob['status']
  progress: number
  started_at?: string | null
  completed_at?: string | null
  results: number
  authorized_by?: string | null
  is_synthetic: boolean
  created_at: string
}

export async function listCases(params: { q?: string; status?: string; priority?: string; classification?: string; sort?: string; order?: string; page?: number; limit?: number } = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value && value !== 'all') query.set(key, String(value))
  })
  const suffix = query.toString() ? `?${query}` : ''
  return api<{ cases: ApiCase[]; total: number; page: number; limit: number }>(`/cases${suffix}`)
}

export const getCase = (caseId: string) => api<ApiCase>(`/cases/${encodeURIComponent(caseId)}`)
export const getEvidence = (caseId: string) => api<ApiEvidence[]>(`/cases/${encodeURIComponent(caseId)}/evidence?limit=100`)
export const getArtifacts = (caseId: string) => api<ApiArtifact[]>(`/cases/${encodeURIComponent(caseId)}/artifacts?limit=100`)
export const getEntities = (caseId: string) => api<ApiEntity[]>(`/cases/${encodeURIComponent(caseId)}/entities`)
export const createEntity = (caseId: string, payload: { type: string; canonical_label: string; confidence?: number }) => api<ApiEntity>(`/cases/${encodeURIComponent(caseId)}/entities`, { method: 'POST', body: JSON.stringify(payload) })
export const getGraph = (caseId: string) => api<ApiGraph>(`/cases/${encodeURIComponent(caseId)}/graph`)
export const getConfidence = (caseId: string) => api<ApiConfidence>(`/cases/${encodeURIComponent(caseId)}/confidence`)
export const getTimeline = (caseId: string) => api<ApiTimeline[]>(`/cases/${encodeURIComponent(caseId)}/timeline?limit=100`)
export const getReviews = (caseId: string) => api<ApiReview[]>(`/cases/${encodeURIComponent(caseId)}/reviews`)
export const getIntelligence = (caseId: string) => api<ApiIntelligenceJob[]>(`/cases/${encodeURIComponent(caseId)}/intelligence`)
export const getAudit = (caseId: string) => api<ApiAuditEvent[]>(`/cases/${encodeURIComponent(caseId)}/audit?limit=100`)
export const getReport = (caseId: string, format: 'json' | 'pdf' = 'json') => api<ApiReport>(`/cases/${encodeURIComponent(caseId)}/report?format=${format}`)
export async function downloadReportPdf(caseId: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseId)}/report?format=pdf`, { headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ''}` } })
  if (response.status === 401) clearSession()
  if (!response.ok) {
    const error = await readError(response)
    throw new ApiError(error.message, response.status, error.code, error.requestId)
  }
  return response.blob()
}
export const runAnalysis = (caseId: string) => api<Record<string, unknown>>(`/cases/${encodeURIComponent(caseId)}/analyze`, { method: 'POST' })
export const createReview = (caseId: string, payload: { decision: string; notes?: string; related_evidence_ids?: string[] }) => api<ApiReview>(`/cases/${encodeURIComponent(caseId)}/review`, { method: 'POST', body: JSON.stringify(payload) })
export async function uploadArtifact(caseId: string, file: File, sourceType = 'file'): Promise<ApiArtifact> {
  const form = new FormData()
  form.append('file', file)
  form.append('source_type', sourceType)
  form.append('source_ref', file.name)
  return api<ApiArtifact>(`/cases/${encodeURIComponent(caseId)}/artifacts`, { method: 'POST', body: form })
}
export async function getSystemStatus(): Promise<SystemStatus & { overall_status: string; version: string; timestamp: string }> {
  const raw = await api<{ api: string; postgresql: string; neo4j: string; analysis_engine: string; overall_status: string; version: string; timestamp: string }>('/system/status')
  return { ...raw, overall: raw.overall_status }
}
export const searchApi = (q: string) => api<{ results: Record<string, unknown[]>; total: number; query: string }>(`/search?q=${encodeURIComponent(q)}`)

export function normalizeCase(item: ApiCase): CaseItem {
  return {
    id: item.id,
    case_id: item.case_id,
    title: item.title,
    description: item.description || '',
    investigator: item.investigator_id,
    authorization_ref: item.authorization_ref || '—',
    status: item.status,
    priority: item.priority,
    classification: item.classification,
    created_at: item.created_at,
    updated_at: item.updated_at,
    evidence_count: 0,
    confidence: 0,
    entities: 0,
    artifacts: 0,
  }
}

export function normalizeEvidence(item: ApiEvidence, artifact?: ApiArtifact): EvidenceItem {
  return {
    evidence_id: item.evidence_id,
    artifact_id: item.artifact_id,
    artifact_name: artifact?.source_ref || artifact?.artifact_id || item.artifact_id,
    entity_id: item.entity_id || undefined,
    signal_type: item.signal_type,
    feature: item.feature,
    score: item.score,
    confidence: item.confidence,
    explanation: item.explanation || 'No explanation provided.',
    hash: artifact?.sha256 || '—',
    source: artifact?.source_type || 'unknown',
    type: artifact?.mime_type || 'unknown',
    collected_at: artifact?.collected_at || item.created_at,
    integrity: artifact ? 'verified' : 'pending',
    processing: 'processed',
    is_synthetic: item.is_synthetic,
  }
}

export function normalizeTimeline(item: ApiTimeline): TimelineEvent {
  return {
    event_id: item.event_id,
    timestamp: item.timestamp,
    type: item.event_type,
    title: item.title,
    description: item.description || '',
    entity_id: item.entity_id || undefined,
    evidence_ids: item.evidence_ids || undefined,
    source: item.source || 'backend',
  }
}

export function normalizeEntity(item: ApiEntity): EntityItem {
  return {
    entity_id: item.entity_id,
    case_id: item.case_id,
    type: item.type,
    label: item.canonical_label,
    confidence: item.confidence,
    aliases: item.aliases?.map(alias => alias.value) || [],
    is_synthetic: item.is_synthetic,
  }
}

export function normalizeGraph(graph: ApiGraph): { nodes: GraphNode[]; edges: GraphEdge[] } {
  return {
    nodes: graph.nodes.map(node => ({
      id: node.id,
      label: node.label,
      type: node.type,
      confidence: Number(node.properties.confidence ?? node.properties.risk_score ?? 0),
    })),
    edges: graph.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.relationship_type,
      confidence: edge.confidence,
      evidence_ids: edge.evidence_ids || [],
    })),
  }
}

export function normalizeConfidence(item: ApiConfidence): ConfidenceBreakdown {
  const scores = [
    ['stylometry', item.stylometry_score],
    ['blockchain', item.blockchain_score],
    ['osint', item.osint_score],
    ['technical', item.technical_fingerprint_score],
    ['temporal', item.temporal_score],
  ] as const
  const weights: Record<string, number> = { stylometry: .25, blockchain: .25, osint: .2, technical: .15, temporal: .15 }
  return {
    overall: item.overall_confidence,
    stylometry: item.stylometry_score || 0,
    blockchain: item.blockchain_score || 0,
    osint: item.osint_score || 0,
    technical: item.technical_fingerprint_score || 0,
    temporal: item.temporal_score || 0,
    evidence_count: item.evidence_count,
    contributions: scores.map(([signal, score]) => ({ signal, score: score || 0, weight: weights[signal], contribution: (score || 0) * weights[signal] })),
    explanation: item.explanation || 'No confidence explanation provided.',
    uncertainty: item.uncertainty_factors || 'No uncertainty factors provided.',
  }
}
