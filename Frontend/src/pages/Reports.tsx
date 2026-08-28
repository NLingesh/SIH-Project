import { useEffect, useState } from 'react'
import { Panel } from '../components/common/Panel'
import { Badge } from '../components/common/Badge'
import { EmptyState, ErrorState, LoadingState } from '../components/common/AsyncState'
import { useToast } from '../components/common/Toast'
import { downloadReportPdf, getReport, type ApiReport } from '../services/api'
import { useSelectedCaseId } from '../hooks/useSelectedCaseId'

export function Reports() {
  const { caseId } = useSelectedCaseId()
  const [report, setReport] = useState<ApiReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)
  const { push } = useToast()
  const load = async () => { if (!caseId) return; setLoading(true); setError(''); try { setReport(await getReport(caseId)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to generate report.') } finally { setLoading(false) } }
  useEffect(() => { void load() }, [caseId])
  if (!caseId) return <LoadingState label="Selecting a case from the backend…" />
  if (loading) return <LoadingState label="Generating report from backend data…" />
  if (error || !report) return <ErrorState message={error || 'No report returned.'} onRetry={() => void load()} />
  const download = async () => { setWorking(true); try { const blob = await downloadReportPdf(caseId); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${caseId}-report.pdf`; anchor.click(); URL.revokeObjectURL(url); push('PDF report downloaded from the backend.', 'success') } catch (cause) { push(cause instanceof Error ? cause.message : 'PDF download failed.', 'error') } finally { setWorking(false) } }
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}><div><div style={{ fontSize: 20, fontWeight: 800 }}>Dark-Web Deanonymization Report</div><div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>Generated from live backend data • identity-attribution investigation {caseId}</div></div><div style={{ display: 'flex', gap: 8 }}><button className="btn" onClick={() => void load()}>Regenerate JSON</button><button className="btn btn-primary" disabled={working} onClick={() => void download()}>{working ? 'Preparing…' : 'Download PDF'}</button></div></div><div className="grid" style={{ gridTemplateColumns: '1.1fr 0.9fr' }}><Panel title="Case information"><div style={{ display: 'grid', gap: 8, fontSize: 12 }}>{Object.entries(report.case_info).map(([key, value]) => <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 7 }}><span style={{ color: 'var(--text-3)' }}>{key.replace(/_/g, ' ')}</span><strong>{String(value ?? '—')}</strong></div>)}<div style={{ color: 'var(--text-2)', marginTop: 4 }}>{report.investigation_scope}</div></div></Panel><Panel title="Attribution confidence and limitations"><pre style={{ whiteSpace: 'pre-wrap', font: 'inherit', fontSize: 12, color: 'var(--text-2)' }}>{JSON.stringify(report.confidence_explanation, null, 2)}</pre><Badge tone="warn">IDENTITY LEAD • VERIFY BEFORE ACTION</Badge><div style={{ marginTop: 10, display: 'grid', gap: 5 }}>{report.limitations.map((item, index) => <div key={index} style={{ fontSize: 11, color: 'var(--text-3)' }}>• {item}</div>)}</div></Panel></div><Panel title="Identity links"><div className="table-wrap"><table><thead><tr><th>SOURCE</th><th>RELATIONSHIP</th><th>TARGET</th><th>CONFIDENCE</th><th>EVIDENCE</th></tr></thead><tbody>{report.relationships.map(edge => <tr key={edge.id}><td className="mono">{edge.source}</td><td><Badge tone="info">{edge.relationship_type}</Badge></td><td className="mono">{edge.target}</td><td className="mono">{edge.confidence}%</td><td className="mono">{edge.evidence_ids.join(', ') || '—'}</td></tr>)}{!report.relationships.length && <tr><td colSpan={5}><EmptyState label="No relationships returned." /></td></tr>}</tbody></table></div></Panel><Panel title="Raw report payload"><pre style={{ margin: 0, overflow: 'auto', maxHeight: 420, fontSize: 11, color: 'var(--text-2)' }}>{JSON.stringify(report, null, 2)}</pre></Panel></div>
}
