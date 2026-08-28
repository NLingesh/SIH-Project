import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Panel } from '../components/common/Panel'
import { Badge } from '../components/common/Badge'
import { EmptyState, ErrorState, LoadingState } from '../components/common/AsyncState'
import { useToast } from '../components/common/Toast'
import { useAuth } from '../auth'
import { createCase, listCases } from '../services/caseService'
import { getArtifacts, getConfidence, getEntities, getEvidence, normalizeCase, type ApiCase } from '../services/api'
import type { CaseItem } from '../types'

export function Cases() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('search') || '')
  const [status, setStatus] = useState('all')
  const [priority, setPriority] = useState('all')
  const [sort, setSort] = useState('updated')
  const [rows, setRows] = useState<CaseItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newCase, setNewCase] = useState({ title: '', description: '', authorization_ref: '', priority: 'medium', classification: 'unclassified' })
  const { push } = useToast()
  const { session } = useAuth()

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await listCases({ q: q || undefined, status, priority, sort, order: 'desc', page: 1, limit: 100 })
      const enriched = await Promise.all(response.cases.map(async item => {
        const [evidence, artifacts, entities, confidence] = await Promise.all([
          getEvidence(item.case_id).catch(() => []),
          getArtifacts(item.case_id).catch(() => []),
          getEntities(item.case_id).catch(() => []),
          getConfidence(item.case_id).catch(() => null),
        ])
        return { ...normalizeCase(item), evidence_count: evidence.length, artifacts: artifacts.length, entities: entities.length, confidence: confidence?.overall_confidence || 0 }
      }))
      setRows(enriched)
      setTotal(response.total)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load cases.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { setQ(params.get('search') || '') }, [params])
  useEffect(() => { void load() }, [q, status, priority, sort])

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!newCase.title.trim() || !session?.investigator.investigator_id) return
    setCreating(true)
    try {
      await createCase({ ...newCase, title: newCase.title.trim(), investigator_id: session.investigator.investigator_id })
      push('Case created in the backend.', 'success')
      setShowCreate(false)
      setNewCase({ title: '', description: '', authorization_ref: '', priority: 'medium', classification: 'unclassified' })
      await load()
    } catch (cause) {
      push(cause instanceof Error ? cause.message : 'Unable to create case.', 'error')
    } finally {
      setCreating(false)
    }
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
      <div><div style={{ fontSize: 20, fontWeight: 800 }}>Attribution Investigations</div><div style={{ fontSize: 11, color: 'var(--text-3)' }} className="mono">{total} cases • Live backend data • Trace an anonymous actor by opening an investigation</div></div>
      <button className="btn btn-primary" onClick={() => setShowCreate(value => !value)}>⊕ {showCreate ? 'Close' : 'Start Investigation'}</button>
    </div>

    {showCreate && <Panel title="Start attribution investigation">
      <form onSubmit={submitCreate} style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        <input className="input" required placeholder="Investigation title" value={newCase.title} onChange={event => setNewCase({ ...newCase, title: event.target.value })} />
        <input className="input" placeholder="Authorization / warrant reference" value={newCase.authorization_ref} onChange={event => setNewCase({ ...newCase, authorization_ref: event.target.value })} />
        <input className="input" placeholder="Attribution objective" value={newCase.description} onChange={event => setNewCase({ ...newCase, description: event.target.value })} />
        <select className="select" value={newCase.priority} onChange={event => setNewCase({ ...newCase, priority: event.target.value })}><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option><option value="critical">Critical priority</option></select>
        <select className="select" value={newCase.classification} onChange={event => setNewCase({ ...newCase, classification: event.target.value })}><option value="unclassified">Unclassified</option><option value="confidential">Confidential</option><option value="secret">Secret</option><option value="top_secret">Top secret</option></select>
        <button className="btn btn-primary" disabled={creating}>{creating ? 'Creating…' : 'Create case'}</button>
      </form>
    </Panel>}

    <Panel noPadding>
      <div style={{ padding: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
        <input className="input" placeholder="Search case ID, title, description…" value={q} onChange={event => setQ(event.target.value)} style={{ flex: '1 1 260px', maxWidth: 420 }} />
        <select className="select" style={{ width: 140 }} value={status} onChange={event => setStatus(event.target.value)}><option value="all">All status</option><option value="active">Active</option><option value="open">Open</option><option value="closed">Closed</option><option value="archived">Archived</option></select>
        <select className="select" style={{ width: 140 }} value={priority} onChange={event => setPriority(event.target.value)}><option value="all">All priority</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
        <select className="select" style={{ width: 160 }} value={sort} onChange={event => setSort(event.target.value)}><option value="updated">Sort: Updated</option><option value="confidence">Sort: Confidence</option><option value="evidence">Sort: Evidence</option><option value="created">Sort: Created</option></select>
        <span className="kbd">{rows.length} RESULTS</span>
      </div>
      {loading ? <LoadingState label="Loading cases from backend…" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
        <table><thead><tr><th>CASE ID</th><th>CASE TITLE</th><th>OWNER</th><th>STATUS</th><th>PRIORITY</th><th>CLASSIFICATION</th><th>EVIDENCE</th><th>CONFIDENCE</th><th>UPDATED</th></tr></thead><tbody>
          {rows.map(item => <tr key={item.case_id} style={{ cursor: 'pointer' }} onClick={() => nav(`/workspace?case=${encodeURIComponent(item.case_id)}`)}>
            <td className="mono" style={{ fontWeight: 800, color: 'var(--accent)' }}>{item.case_id}</td>
            <td style={{ minWidth: 280 }}><div style={{ fontWeight: 700 }}>{item.title}</div><div style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 380 }}>{item.description}</div><div className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>{item.authorization_ref} • {item.artifacts} artifacts • {item.entities} entities</div></td>
            <td className="mono" style={{ fontSize: 11 }}>{item.investigator}</td>
            <td><Badge tone={item.status === 'active' ? 'success' : item.status === 'open' ? 'info' : 'neutral'}>{item.status}</Badge></td>
            <td><Badge tone={item.priority === 'critical' ? 'danger' : item.priority === 'high' ? 'warn' : item.priority === 'medium' ? 'info' : 'neutral'}>{item.priority}</Badge></td>
            <td><Badge tone="violet">{item.classification}</Badge></td>
            <td className="mono" style={{ textAlign: 'center', fontWeight: 700 }}>{item.evidence_count}</td>
            <td><div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><div className="progress-track" style={{ width: 64 }}><div className="progress-fill" style={{ width: `${item.confidence}%`, background: item.confidence >= 70 ? '#10b981' : item.confidence >= 50 ? '#f59e0b' : '#ef4444' }} /></div><span className="mono" style={{ fontWeight: 700 }}>{item.confidence}%</span></div></td>
            <td className="mono" style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{new Date(item.updated_at).toLocaleDateString('en-GB')}</td>
          </tr>)}
          {!rows.length && <tr><td colSpan={9}><EmptyState label="No attribution investigations match your filters." /></td></tr>}
        </tbody></table>
      </div>}
      <div style={{ padding: 10, borderTop: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 11 }}>Showing {rows.length} of {total} backend cases • Use the workspace to trace aliases → behavioral signals → infrastructure → identity leads</div>
    </Panel>
  </div>
}
