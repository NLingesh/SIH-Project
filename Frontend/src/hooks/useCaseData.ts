import { useCallback, useEffect, useState } from 'react'
import {
  getArtifacts,
  getAudit,
  getCase,
  getConfidence,
  getEntities,
  getEvidence,
  getGraph,
  getIntelligence,
  getReviews,
  getTimeline,
  normalizeConfidence,
  normalizeEntity,
  normalizeEvidence,
  normalizeGraph,
  normalizeTimeline,
  type ApiArtifact,
  type ApiCase,
  type ApiConfidence,
  type ApiEntity,
  type ApiEvidence,
  type ApiGraph,
  type ApiIntelligenceJob,
  type ApiReview,
  type ApiAuditEvent,
  type ApiTimeline,
} from '../services/api'
import type { ArtifactItem, ConfidenceBreakdown, EntityItem, EvidenceItem, GraphEdge, GraphNode, TimelineEvent } from '../types'

export interface CaseData {
  caseItem: ApiCase
  artifacts: ApiArtifact[]
  evidence: ApiEvidence[]
  entities: ApiEntity[]
  graph: ApiGraph
  confidence: ApiConfidence
  timeline: ApiTimeline[]
  reviews: ApiReview[]
  intelligence: ApiIntelligenceJob[]
  audit: ApiAuditEvent[]
}

export interface NormalizedCaseData {
  caseItem: ApiCase
  artifacts: ApiArtifact[]
  evidence: ApiEvidence[]
  entities: ApiEntity[]
  graph: ApiGraph
  confidence: ApiConfidence
  timeline: ApiTimeline[]
  reviews: ApiReview[]
  intelligence: ApiIntelligenceJob[]
  audit: ApiAuditEvent[]
}

export function useCaseData(caseId: string) {
  const [data, setData] = useState<CaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => setReloadKey(value => value + 1), [])

  useEffect(() => {
    let active = true
    if (!caseId) {
      setLoading(false)
      setData(null)
      return () => { active = false }
    }
    setLoading(true)
    setError('')
    Promise.all([
      getCase(caseId),
      getArtifacts(caseId),
      getEvidence(caseId),
      getEntities(caseId),
      getGraph(caseId),
      getConfidence(caseId),
      getTimeline(caseId),
      getReviews(caseId),
      getIntelligence(caseId),
      getAudit(caseId),
    ]).then(([caseItem, artifacts, evidence, entities, graph, confidence, timeline, reviews, intelligence, audit]) => {
      if (!active) return
      setData({ caseItem, artifacts, evidence, entities, graph, confidence, timeline, reviews, intelligence, audit })
    }).catch(cause => {
      if (!active) return
      setData(null)
      setError(cause instanceof Error ? cause.message : 'Unable to load case data.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [caseId, reloadKey])

  return { data, loading, error, reload }
}

export interface CaseViewModel {
  caseItem: ApiCase
  artifacts: ArtifactItem[]
  evidence: EvidenceItem[]
  entities: EntityItem[]
  graph: { nodes: GraphNode[]; edges: GraphEdge[] }
  confidence: ConfidenceBreakdown
  timeline: TimelineEvent[]
  reviews: ApiReview[]
  intelligence: ApiIntelligenceJob[]
  audit: ApiAuditEvent[]
}

export function toCaseViewModel(data: CaseData): CaseViewModel {
  const artifacts = data.artifacts.map(item => ({
    artifact_id: item.artifact_id,
    case_id: item.case_id,
    source_type: item.source_type,
    source_ref: item.source_ref || item.artifact_id,
    sha256: item.sha256,
    mime: item.mime_type || 'unknown',
    size: item.file_size || 0,
    collected_at: item.collected_at,
    provenance: item.metadata || item.raw_location || 'Backend artifact store',
  }))
  const artifactById = new Map(data.artifacts.map(item => [item.id, item]))
  data.artifacts.forEach(item => artifactById.set(item.artifact_id, item))
  return {
    caseItem: data.caseItem,
    artifacts,
    evidence: data.evidence.map(item => normalizeEvidence(item, artifactById.get(item.artifact_id))),
    entities: data.entities.map(normalizeEntity),
    graph: normalizeGraph(data.graph),
    confidence: normalizeConfidence(data.confidence),
    timeline: data.timeline.map(normalizeTimeline),
    reviews: data.reviews,
    intelligence: data.intelligence,
    audit: data.audit,
  }
}
