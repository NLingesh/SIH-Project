import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Panel } from '../components/common/Panel'
import { Badge } from '../components/common/Badge'
import { EmptyState, ErrorState, LoadingState } from '../components/common/AsyncState'
import { useAuth } from '../auth'
import { getConfidence, getEntities, getEvidence, getSystemStatus, listCases, normalizeCase } from '../services/api'
import type { CaseItem, SystemStatus } from '../types'

export function Dashboard() {
  const nav = useNavigate()
  const { session } = useAuth()
  const [cases, setCases] = useState<CaseItem[]>([])
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const response = await listCases({ limit: 100 })
      const enriched = await Promise.all(response.cases.map(async item => {
        const [evidence, entities, confidence] = await Promise.all([getEvidence(item.case_id).catch(() => []), getEntities(item.case_id).catch(() => []), getConfidence(item.case_id).catch(() => null)])
        return { ...normalizeCase(item), evidence_count: evidence.length, entities: entities.length, confidence: confidence?.overall_confidence || 0 }
      }))
      setCases(enriched)
      setStatus(await getSystemStatus())
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load dashboard.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  if (loading) return <LoadingState label="Loading dashboard from backend…" />
  if (error) return <ErrorState message={error} onRetry={() => void load()} />
  const active = cases.filter(item => item.status === 'active' || item.status === 'open').length
  const avgConfidence = cases.length ? Math.round(cases.reduce((sum, item) => sum + item.confidence, 0) / cases.length) : 0
  const user = session?.investigator

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}><div><div style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-3)', fontWeight: 700 }}>DARK-WEB DEANONYMIZATION • LIVE SESSION</div><div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>Trace an anonymous actor, {user?.full_name || user?.investigator_id || 'Investigator'}</div><div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Authorized identity-attribution workspace for connecting aliases, wallets, domains, infrastructure, and behavioral signals.</div></div><button className="btn btn-primary" onClick={() => nav('/cases')}>Open case register →</button></div>
    <div className="grid grid-4"><Stat label="Attribution investigations" value={cases.length} /><Stat label="Active leads" value={active} /><Stat label="Average confidence" value={`${avgConfidence}%`} /><Stat label="API status" value={status?.overall || 'unknown'} /></div>
    <Panel title="How Atlas narrows an anonymous actor"><div className="pipeline-strip">{[['01', 'Collect', 'Authorized dark-web sources'], ['02', 'Correlate', 'Aliases, writing, wallets, domains'], ['03', 'Resolve', 'Infrastructure and identity candidates'], ['04', 'Verify', 'Confidence, uncertainty, analyst review']].map((step, index) => <div className="pipeline-step" key={step[0]}><span className="pipeline-index">{step[0]}</span><div><strong>{step[1]}</strong><span>{step[2]}</span></div>{index < 3 && <span className="pipeline-arrow">→</span>}</div>)}</div></Panel>
    <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr' }}><Panel title="Recent attribution investigations"><div className="table-wrap"><table><thead><tr><th>CASE</th><th>STATUS</th><th>EVIDENCE</th><th>CONFIDENCE</th></tr></thead><tbody>{cases.slice(0, 8).map(item => <tr key={item.case_id} style={{ cursor: 'pointer' }} onClick={() => nav(`/workspace?case=${encodeURIComponent(item.case_id)}`)}><td><div className="mono" style={{ color: 'var(--accent)', fontWeight: 800 }}>{item.case_id}</div><div style={{ fontWeight: 700 }}>{item.title}</div></td><td><Badge tone={item.status === 'active' ? 'success' : 'info'}>{item.status}</Badge></td><td className="mono">{item.evidence_count}</td><td className="mono">{item.confidence}%</td></tr>)}{!cases.length && <tr><td colSpan={4}><EmptyState label="No attribution investigations are assigned to this investigator." /></td></tr>}</tbody></table></div></Panel><Panel title="Attribution pipeline status"><div style={{ display: 'grid', gap: 9 }}>{[['API', status?.api], ['PostgreSQL', status?.postgresql], ['Neo4j', status?.neo4j], ['Analysis engine', status?.analysis_engine]].map(([label, value]) => <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}><span style={{ color: 'var(--text-2)' }}>{label}</span><Badge tone={value === 'healthy' || value === 'connected' ? 'success' : 'warn'}>{String(value || 'unknown')}</Badge></div>)}</div><div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-3)' }}>Status is fetched from <span className="mono">/api/v1/system/status</span>. Graph storage may be degraded while the PostgreSQL fallback remains active.</div></Panel></div>
  </div>
}
function Stat({ label, value }: { label: string; value: string | number }) { return <div className="panel" style={{ padding: 14 }}><div style={{ fontSize: 11, color: 'var(--text-3)' }}>{label}</div><div className="mono" style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{value}</div></div> }
