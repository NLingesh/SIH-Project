import { useState } from 'react'
import { Panel } from '../components/common/Panel'
import { Badge } from '../components/common/Badge'
import { EmptyState, ErrorState, LoadingState } from '../components/common/AsyncState'
import { useToast } from '../components/common/Toast'
import { createReview } from '../services/api'
import { toCaseViewModel, useCaseData } from '../hooks/useCaseData'
import { useSelectedCaseId } from '../hooks/useSelectedCaseId'

export function Review() {
  const { caseId } = useSelectedCaseId()
  const state = useCaseData(caseId)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const { push } = useToast()
  if (!caseId) return <LoadingState label="Selecting a case from the backend…" />
  if (state.loading || !state.data) return state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : <LoadingState label="Loading review queue…" />
  const vm = toCaseViewModel(state.data)
  const act = async (reviewId: string, decision: string) => {
    setSaving(reviewId)
    try { await createReview(caseId, { decision, notes: notes[reviewId] || undefined, related_evidence_ids: state.data?.evidence.slice(0, 1).map(item => item.evidence_id) }); push(`${reviewId} — ${decision.replace(/_/g, ' ')} — audit logged`, decision === 'confirm_lead' ? 'success' : decision === 'reject_lead' ? 'info' : 'warn'); state.reload() }
    catch (cause) { push(cause instanceof Error ? cause.message : 'Unable to save review.', 'error') }
    finally { setSaving(null) }
  }
  const pending = vm.reviews.filter(item => item.decision === 'mark_requires_review').length
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}><div><div style={{ fontSize: 20, fontWeight: 800 }}>Review Queue — Investigator Verification</div><div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>Live review records for {caseId} • Actions are persisted and audited</div></div><Badge tone="warn">{pending} REQUIRES REVIEW</Badge></div><div style={{ display: 'grid', gap: 12 }}>{vm.reviews.map(item => <div key={item.review_id} className="panel" style={{ padding: 14, borderLeft: '3px solid var(--accent)' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div style={{ flex: 1, minWidth: 260 }}><div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><span className="mono" style={{ fontWeight: 800, color: 'var(--accent)' }}>{item.review_id}</span><Badge tone="violet">{(item.entity_type || 'lead').toUpperCase()}</Badge><Badge tone="info">{item.lead_type || 'INVESTIGATIVE_LEAD'}</Badge><Badge tone="neutral">{item.decision.replace(/_/g, ' ').toUpperCase()}</Badge>{item.confidence != null && <span className="mono">{item.confidence}%</span>}</div><div style={{ fontWeight: 700, marginTop: 6 }}>{item.entity_label || 'Unresolved lead'} <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>• {item.case_id}</span></div><div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>{item.signals.map(signal => <Badge key={signal} tone="neutral">{signal}</Badge>)}<span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{item.submitted_at || item.created_at}</span></div><textarea className="textarea" placeholder="Add analyst note…" value={notes[item.review_id] || item.notes || ''} onChange={event => setNotes({ ...notes, [item.review_id]: event.target.value })} style={{ marginTop: 10, minHeight: 56 }} /></div><div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 210 }}><button className="btn" disabled={saving === item.review_id} style={{ background: '#10b981', color: 'white' }} onClick={() => void act(item.review_id, 'confirm_lead')}>✓ Confirm Lead</button><button className="btn" disabled={saving === item.review_id} style={{ background: '#ef4444', color: 'white' }} onClick={() => void act(item.review_id, 'reject_lead')}>✕ Reject Lead</button><button className="btn" disabled={saving === item.review_id} onClick={() => void act(item.review_id, 'mark_requires_review')}>◷ Requires More Evidence</button><div style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'center' }}>Every action is audited with reviewer ID</div></div></div></div>)}{!vm.reviews.length && <Panel><EmptyState label="No review records returned for this case." /></Panel>}</div><Panel title="Review guidance"><div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>Confirming a lead records an investigative review decision; it does not prove identity or replace corroboration and legal process.</div></Panel></div>
}
