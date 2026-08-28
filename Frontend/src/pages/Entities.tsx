import { useState } from 'react'
import { Panel } from '../components/common/Panel'
import { Badge } from '../components/common/Badge'
import { EmptyState, ErrorState, LoadingState } from '../components/common/AsyncState'
import { useToast } from '../components/common/Toast'
import { createEntity } from '../services/api'
import { toCaseViewModel, useCaseData } from '../hooks/useCaseData'
import { useSelectedCaseId } from '../hooks/useSelectedCaseId'

export function Entities() {
  const { caseId } = useSelectedCaseId()
  const state = useCaseData(caseId)
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [label, setLabel] = useState('')
  const [type, setType] = useState('actor')
  const [saving, setSaving] = useState(false)
  const { push } = useToast()

  if (!caseId) return <LoadingState label="Selecting a case from the backend…" />
  if (state.loading || !state.data) return state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : <LoadingState label="Loading entities from backend…" />
  const vm = toCaseViewModel(state.data)
  const filtered = vm.entities.filter(item => (typeFilter === 'all' || item.type === typeFilter) && `${item.entity_id} ${item.label} ${item.type} ${item.aliases.join(' ')}`.toLowerCase().includes(q.toLowerCase()))

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!label.trim()) return
    setSaving(true)
    try { await createEntity(caseId, { type, canonical_label: label.trim(), confidence: 0 }); push('Identity candidate added to the backend.', 'success'); setLabel(''); setShowCreate(false); state.reload() }
    catch (cause) { push(cause instanceof Error ? cause.message : 'Unable to create entity.', 'error') }
    finally { setSaving(false) }
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}><div><div style={{ fontSize: 20, fontWeight: 800 }}>Identity Candidates & Aliases</div><div style={{ fontSize: 11, color: 'var(--text-3)' }} className="mono">Identity candidates for {caseId} • Alias links require corroboration</div></div><button className="btn btn-primary" onClick={() => setShowCreate(value => !value)}>⊕ {showCreate ? 'Close' : 'Add identity candidate'}</button></div>
    {showCreate && <Panel title="Add identity candidate"><form onSubmit={save} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><input required className="input" placeholder="Candidate name or alias" value={label} onChange={event => setLabel(event.target.value)} /><select className="select" value={type} onChange={event => setType(event.target.value)}>{['actor', 'alias', 'account', 'wallet', 'domain', 'ip', 'document', 'infrastructure'].map(option => <option key={option} value={option}>{option}</option>)}</select><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create'}</button></form></Panel>}
    <Panel noPadding><div style={{ padding: 12, display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid var(--border)' }}><input className="input" placeholder="Filter entity ID, label, type…" value={q} onChange={event => setQ(event.target.value)} style={{ maxWidth: 460, flex: '1 1 260px' }} /><select className="select" value={typeFilter} onChange={event => setTypeFilter(event.target.value)}><option value="all">All types</option>{['actor', 'alias', 'account', 'wallet', 'domain', 'ip', 'document', 'infrastructure'].map(option => <option key={option} value={option}>{option}</option>)}</select><span className="kbd">{filtered.length} ENTITIES</span></div><div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}><table><thead><tr><th>ENTITY ID</th><th>LABEL</th><th>TYPE</th><th>CONFIDENCE</th><th>ALIASES</th><th>PROVENANCE</th></tr></thead><tbody>{filtered.map(item => <tr key={item.entity_id}><td className="mono">{item.entity_id}</td><td style={{ fontWeight: 700 }}>{item.label}</td><td><Badge tone="violet">{item.type}</Badge></td><td><div style={{ display: 'flex', gap: 7, alignItems: 'center' }}><div className="progress-track" style={{ width: 70 }}><div className="progress-fill" style={{ width: `${item.confidence}%`, background: item.confidence >= 70 ? '#10b981' : '#f59e0b' }} /></div><span className="mono">{item.confidence}%</span></div></td><td className="mono">{item.aliases.join(', ') || '—'}</td><td><Badge tone={item.is_synthetic ? 'warn' : 'success'}>{item.is_synthetic ? 'synthetic' : 'backend'}</Badge></td></tr>)}{!filtered.length && <tr><td colSpan={6}><EmptyState label="No entities match the current filter." /></td></tr>}</tbody></table></div></Panel><Panel title="Interpretation note"><div style={{ fontSize: 12, color: 'var(--text-2)' }}>Identity associations are investigative leads that help narrow an anonymous actor’s possible identity. Confirmations and conclusions must be supported by corroborating evidence and analyst review.</div></Panel></div>
}
