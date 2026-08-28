import { useEffect, useState } from 'react'
import { useCaseData, toCaseViewModel } from '../hooks/useCaseData'
import { useSelectedCaseId } from '../hooks/useSelectedCaseId'
import { Panel } from '../components/common/Panel'
import { Badge } from '../components/common/Badge'
import { EmptyState, ErrorState, LoadingState } from '../components/common/AsyncState'
import { startOnionCollection } from '../services/api'
import { useToast } from '../components/common/Toast'

export function Intelligence() {
  const { caseId } = useSelectedCaseId()
  const state = useCaseData(caseId)
  const { push } = useToast()
  const [seedUrl, setSeedUrl] = useState('')
  const [authorizationRef, setAuthorizationRef] = useState('')
  const [maxPages, setMaxPages] = useState(5)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    const currentAuthorization = state.data?.caseItem.authorization_ref
    if (currentAuthorization && currentAuthorization !== '—' && !authorizationRef) setAuthorizationRef(currentAuthorization)
  }, [authorizationRef, state.data?.caseItem.authorization_ref])

  const startCollection = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!caseId || !seedUrl.trim() || !authorizationRef.trim()) {
      push('An allowlisted .onion URL and matching authorization reference are required.', 'error')
      return
    }
    setStarting(true)
    try {
      await startOnionCollection(caseId, { seed_url: seedUrl.trim(), authorization_ref: authorizationRef.trim(), max_pages: maxPages })
      push('Authorized onion collection completed and provenance was recorded.', 'success')
      setSeedUrl('')
      state.reload()
    } catch (cause) {
      push(cause instanceof Error ? cause.message : 'Authorized collection failed.', 'error')
    } finally {
      setStarting(false)
    }
  }

  if (!caseId) return <LoadingState label="Selecting a case from the backend…" />
  if (state.loading || !state.data) return state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : <LoadingState label="Loading intelligence jobs…" />
  const view = toCaseViewModel(state.data)
  const jobs = view.intelligence
  const counts = ['ready', 'running', 'completed'].map(status => ({ status, count: jobs.filter(job => job.status === status).length }))
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}><div><div style={{ fontSize: 20, fontWeight: 800 }}>Authorized Dark-Web Collection</div><div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>Live collection jobs for {caseId} • Sources must be authorized before ingestion</div></div><button className="btn" onClick={() => state.reload()}>Refresh jobs</button></div>
    <Panel title="Start allowlisted onion collection"><form onSubmit={startCollection} style={{ display: 'grid', gap: 10 }}><div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5 }}>Passive HTML collection only. The server accepts an explicit allowlisted `.onion` host, follows same-host links within the page limit, stores hashes and provenance, and does not store page content.</div><div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr 120px', gap: 8 }}><input className="input" type="url" placeholder="http://approved-source.onion/start" value={seedUrl} onChange={event => setSeedUrl(event.target.value)} disabled={starting} /><input className="input" placeholder="Authorization reference" value={authorizationRef} onChange={event => setAuthorizationRef(event.target.value)} disabled={starting} /><input className="input" type="number" min={1} max={10} value={maxPages} onChange={event => setMaxPages(Math.min(10, Math.max(1, Number(event.target.value) || 1)))} disabled={starting} /></div><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><span style={{ fontSize: 10, color: 'var(--text-3)' }}>Tor proxy and allowlist are server-side configuration. No target discovery is performed.</span><button className="btn btn-primary" type="submit" disabled={starting}>{starting ? 'Collecting…' : 'Start authorized collection'}</button></div></form></Panel>
    <div className="grid grid-3">{counts.map(item => <div key={item.status} className="panel" style={{ padding: 14 }}><div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em' }}>{item.status.toUpperCase()}</div><div className="mono" style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{item.count}</div></div>)}</div>
    <Panel title="Authorized collection jobs"><div className="table-wrap"><table><thead><tr><th>JOB ID</th><th>SOURCE</th><th>TYPE</th><th>STATUS</th><th>PROGRESS</th><th>STARTED</th><th>RESULTS</th><th>AUTHORIZED BY</th></tr></thead><tbody>{jobs.map(job => <tr key={job.job_id}><td className="mono">{job.job_id}</td><td style={{ fontWeight: 700 }}>{job.source}</td><td className="mono">{job.job_type}</td><td><Badge tone={job.status === 'completed' ? 'success' : job.status === 'failed' ? 'danger' : job.status === 'requires_review' ? 'violet' : 'warn'}>{job.status.replace(/_/g, ' ').toUpperCase()}</Badge></td><td><div style={{ display: 'flex', gap: 7, alignItems: 'center' }}><div className="progress-track" style={{ width: 80 }}><div className="progress-fill" style={{ width: `${job.progress}%` }} /></div><span className="mono">{job.progress}%</span></div></td><td className="mono">{job.started_at ? new Date(job.started_at).toLocaleString() : '—'}</td><td className="mono">{job.results}</td><td className="mono">{job.authorized_by || '—'}</td></tr>)}{!jobs.length && <tr><td colSpan={8}><EmptyState label="No intelligence jobs returned for this case." /></td></tr>}</tbody></table></div><div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-3)' }}>Every collection requires a matching investigation authorization reference and is recorded in the audit trail. Collection results are evidence leads, not identity conclusions.</div></Panel>
  </div>
}
