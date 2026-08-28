import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Panel } from '../components/common/Panel'
import { prettyLabel } from '../utils/format'
import { Badge } from '../components/common/Badge'
import { Tabs } from '../components/common/Tabs'
import { EmptyState, ErrorState, LoadingState } from '../components/common/AsyncState'
import { useToast } from '../components/common/Toast'
import { getReport, listCases, runAnalysis } from '../services/api'
import { toCaseViewModel, useCaseData } from '../hooks/useCaseData'

export function Workspace() {
  const [params, setParams] = useSearchParams()
  const [caseId, setCaseId] = useState(params.get('case') || '')
  const [tab, setTab] = useState('overview')
  const [working, setWorking] = useState(false)
  const { push } = useToast()

  useEffect(() => {
    if (caseId) return
    listCases({ limit: 1 }).then(response => {
      const first = response.cases[0]?.case_id
      if (first) { setCaseId(first); setParams({ case: first }) }
    }).catch(() => undefined)
  }, [caseId, setParams])

  const state = useCaseData(caseId)
  if (!caseId) return <LoadingState label="Selecting a case from the backend…" />
  if (state.loading || !state.data) return state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : <LoadingState label="Loading deanonymization workspace…" />
  const vm = toCaseViewModel(state.data)
  const { caseItem: c } = vm

  const analyze = async () => {
    setWorking(true)
    try { await runAnalysis(c.case_id); push('Deanonymization analysis completed and persisted by the backend.', 'success'); state.reload() }
    catch (cause) { push(cause instanceof Error ? cause.message : 'Analysis failed.', 'error') }
    finally { setWorking(false) }
  }
  const report = async () => {
    setWorking(true)
    try { await getReport(c.case_id); push('Attribution report generated from live case data.', 'success') }
    catch (cause) { push(cause instanceof Error ? cause.message : 'Report generation failed.', 'error') }
    finally { setWorking(false) }
  }
  const signalRows = vm.confidence.contributions

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
      <div><div style={{ fontSize: 10, letterSpacing: '0.1em', fontWeight: 700, color: 'var(--text-3)' }}>DEANONYMIZATION WORKSPACE • LIVE BACKEND DATA</div><div style={{ fontSize: 20, fontWeight: 800 }}><span className="mono" style={{ color: 'var(--accent)' }}>{c.case_id}</span> — {c.title}</div><div style={{ fontSize: 12, color: 'var(--text-3)', maxWidth: 900 }}>{c.description || 'No attribution objective provided.'}</div><div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}><Badge tone={c.status === 'active' ? 'success' : 'info'}>{c.status.toUpperCase()}</Badge><Badge tone={c.priority === 'critical' ? 'danger' : 'warn'}>{c.priority.toUpperCase()}</Badge><Badge tone="violet">{c.classification.toUpperCase()}</Badge><span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.authorization_ref || 'No authorization reference'}</span></div></div>
      <div style={{ display: 'flex', gap: 8 }}><button className="btn" onClick={() => void analyze()} disabled={working}>{working ? 'Working…' : '▶ Run Full Analysis'}</button><button className="btn btn-primary" onClick={() => void report()} disabled={working}>Generate Report</button></div>
    </div>

    <Tabs tabs={[{ id: 'overview', label: 'Overview' }, { id: 'evidence', label: 'Evidence', count: vm.evidence.length }, { id: 'entities', label: 'Entities', count: vm.entities.length }, { id: 'signals', label: 'Signals', count: signalRows.length }, { id: 'graph', label: 'Graph', count: vm.graph.nodes.length }, { id: 'confidence', label: 'Confidence' }, { id: 'timeline', label: 'Timeline', count: vm.timeline.length }, { id: 'review', label: 'Review', count: vm.reviews.length }]} active={tab} onChange={setTab} />

    {tab === 'overview' && <div className="grid" style={{ gridTemplateColumns: '1.2fr 1fr' }}><Panel title="Anonymous-actor profile"><div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}><Metric label="Evidence" value={vm.evidence.length} /><Metric label="Artifacts" value={vm.artifacts.length} /><Metric label="Entities" value={vm.entities.length} /><Metric label="Confidence" value={`${vm.confidence.overall}%`} /></div><p style={{ color: 'var(--text-2)', fontSize: 12, lineHeight: 1.6 }}>{vm.confidence.explanation}</p></Panel><Panel title="Attribution audit trail"><AuditList events={vm.audit.slice(0, 6)} /></Panel></div>}
    {tab === 'evidence' && <Panel title="Evidence"><DataTable headers={['ID', 'SIGNAL', 'FEATURE', 'SCORE', 'CONFIDENCE', 'PROVENANCE']} rows={vm.evidence.map(item => [item.evidence_id, prettyLabel(item.signal_type), item.feature, `${item.score}`, `${item.confidence}%`, item.is_synthetic ? 'Synthetic' : item.artifact_name])} empty="No evidence returned for this case." /></Panel>}
    {tab === 'entities' && <Panel title="Identity candidates & aliases"><DataTable headers={['ENTITY', 'TYPE', 'CONFIDENCE', 'ALIASES', 'SOURCE']} rows={vm.entities.map(item => [item.label, prettyLabel(item.type), `${item.confidence}%`, item.aliases.join(', ') || '—', item.is_synthetic ? 'Synthetic' : 'Backend'])} empty="No entities returned for this case." /></Panel>}
    {tab === 'signals' && <Panel title="Attribution signal breakdown"><DataTable headers={['SIGNAL', 'SCORE', 'WEIGHT', 'CONTRIBUTION', 'EVIDENCE']} rows={signalRows.map(item => [prettyLabel(item.signal), `${item.score}`, `${Math.round(item.weight * 100)}%`, item.contribution.toFixed(1), vm.evidence.filter(e => e.signal_type === item.signal || (item.signal === 'technical' && e.signal_type === 'technical_fingerprint')).length])} empty="No signal results returned." /></Panel>}
    {tab === 'graph' && <Panel title="Identity linkage graph"><DataTable headers={['SOURCE', 'RELATIONSHIP', 'TARGET', 'CONFIDENCE', 'EVIDENCE']} rows={vm.graph.edges.map(edge => [edge.source, prettyLabel(edge.type), edge.target, `${edge.confidence}%`, edge.evidence_ids.join(', ') || '—'])} empty="No graph relationships returned." /></Panel>}
    {tab === 'confidence' && <Panel title={`Overall confidence: ${vm.confidence.overall}%`}><p style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'pre-line' }}>{vm.confidence.explanation}</p><p style={{ fontSize: 12, color: 'var(--text-3)' }}>{vm.confidence.uncertainty}</p><DataTable headers={['SIGNAL', 'SCORE', 'WEIGHT', 'CONTRIBUTION']} rows={signalRows.map(item => [item.signal, item.score, `${Math.round(item.weight * 100)}%`, item.contribution.toFixed(1)])} /></Panel>}
    {tab === 'timeline' && <Panel title="Timeline"><AuditList events={vm.timeline.map(event => ({ event_id: event.event_id, event_type: event.type, description: event.description, created_at: event.timestamp }))} empty="No timeline events returned." /></Panel>}
    {tab === 'review' && <Panel title="Review queue"><DataTable headers={['REVIEW', 'LEAD', 'DECISION', 'CONFIDENCE', 'SUBMITTED']} rows={vm.reviews.map(item => [item.review_id, item.entity_label || 'Unresolved lead', item.decision, item.confidence == null ? '—' : `${item.confidence}%`, item.submitted_at || item.created_at])} empty="No reviews returned for this case." /></Panel>}
  </div>
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}><div style={{ fontSize: 11, color: 'var(--text-3)' }}>{label}</div><div className="mono" style={{ fontSize: 22, fontWeight: 800, marginTop: 5 }}>{value}</div></div> }
function DataTable({ headers, rows, empty = 'No records returned.' }: { headers: string[]; rows: Array<Array<string | number>>; empty?: string }) { return <div className="table-wrap"><table><thead><tr>{headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className={cellIndex === 0 ? 'mono' : undefined}>{cell}</td>)}</tr>)}{!rows.length && <tr><td colSpan={headers.length}><EmptyState label={empty} /></td></tr>}</tbody></table></div> }
function AuditList({ events, empty = 'No events returned.' }: { events: Array<{ event_id: string; event_type?: string; type?: string; description?: string | null; created_at?: string }>; empty?: string }) { if (!events.length) return <EmptyState label={empty} />; return <div style={{ display: 'grid', gap: 8 }}>{events.map(event => <div key={event.event_id} style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}><div className="mono" style={{ fontSize: 11, color: 'var(--accent)' }}>{event.created_at ? new Date(event.created_at).toLocaleString() : '—'} • {event.event_type || event.type}</div><div style={{ fontSize: 12, marginTop: 4 }}>{event.description || 'No description.'}</div></div>)}</div> }
