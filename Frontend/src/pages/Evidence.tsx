import { useRef, useState } from 'react'
import { Panel } from '../components/common/Panel'
import { Badge } from '../components/common/Badge'
import { EmptyState, ErrorState, LoadingState } from '../components/common/AsyncState'
import { useToast } from '../components/common/Toast'
import { evidenceService } from '../services/evidenceService'
import { uploadArtifact } from '../services/api'
import { toCaseViewModel, useCaseData } from '../hooks/useCaseData'
import { useSelectedCaseId } from '../hooks/useSelectedCaseId'

export function Evidence() {
  const { caseId } = useSelectedCaseId()
  const state = useCaseData(caseId)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const { push } = useToast()

  if (!caseId) return <LoadingState label="Selecting a case from the backend…" />
  if (state.loading || !state.data) return state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : <LoadingState label="Loading evidence from backend…" />
  const vm = toCaseViewModel(state.data)
  const rawEvidence = state.data.evidence
  const filtered = vm.evidence.filter(item => (filter === 'all' || item.signal_type === filter) && (!q || `${item.evidence_id} ${item.artifact_name} ${item.feature} ${item.explanation}`.toLowerCase().includes(q.toLowerCase())))
  const selectedItem = vm.evidence.find(item => item.evidence_id === selected)
  const selectedRaw = rawEvidence.find(item => item.evidence_id === selected)

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try { await uploadArtifact(caseId, file); push('Artifact uploaded and hashed by the backend.', 'success'); state.reload() }
    catch (cause) { push(cause instanceof Error ? cause.message : 'Artifact upload failed.', 'error') }
    finally { event.target.value = '' }
  }
  const saveNote = async () => {
    if (!selectedRaw) return
    setSavingNote(true)
    try { await evidenceService.updateNotes(selectedRaw.evidence_id, note); push('Analyst note saved to the backend.', 'success'); state.reload() }
    catch (cause) { push(cause instanceof Error ? cause.message : 'Unable to save analyst note.', 'error') }
    finally { setSavingNote(false) }
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}><div><div style={{ fontSize: 20, fontWeight: 800 }}>Evidence Explorer</div><div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>Live evidence and artifact data • {caseId}</div></div><div style={{ display: 'flex', gap: 8 }}><input ref={fileInput} type="file" hidden onChange={handleUpload} /><button className="btn" onClick={() => fileInput.current?.click()}>Upload Artifact</button><button className="btn btn-primary" onClick={() => state.reload()}>Refresh</button></div></div>
    <Panel noPadding><div style={{ padding: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid var(--border)' }}><input className="input" placeholder="Search evidence ID, artifact, feature…" value={q} onChange={event => setQ(event.target.value)} style={{ flex: '1 1 260px', maxWidth: 480 }} /><select className="select" style={{ width: 180 }} value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All signals</option><option value="stylometry">Stylometry</option><option value="blockchain">Blockchain</option><option value="osint">OSINT</option><option value="technical_fingerprint">Technical</option><option value="temporal">Temporal</option></select><span className="kbd">{filtered.length} EVIDENCE</span><span className="kbd">{vm.artifacts.length} ARTIFACTS</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: selectedItem ? '1fr 360px' : '1fr' }}><div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}><table><thead><tr><th>EVIDENCE ID</th><th>ARTIFACT</th><th>SIGNAL</th><th>SCORE</th><th>HASH</th><th>INTEGRITY</th></tr></thead><tbody>{filtered.map(item => <tr key={item.evidence_id} onClick={() => { setSelected(item.evidence_id); setNote(rawEvidence.find(raw => raw.evidence_id === item.evidence_id)?.analyst_notes || '') }} style={{ cursor: 'pointer', background: selected === item.evidence_id ? 'rgba(34,211,238,0.06)' : undefined }}><td className="mono" style={{ fontWeight: 700, color: selected === item.evidence_id ? 'var(--accent)' : undefined }}>{item.evidence_id}</td><td><div style={{ fontWeight: 600 }}>{item.artifact_name}</div><div className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>{new Date(item.collected_at).toLocaleString()} • {item.source}</div></td><td><Badge tone="info">{item.signal_type}</Badge></td><td style={{ fontWeight: 700 }}>{item.score}<span style={{ color: 'var(--text-3)', fontWeight: 400 }}> / {item.confidence}%</span></td><td className="mono" style={{ fontSize: 11 }}>{item.hash === '—' ? '—' : `${item.hash.slice(0, 14)}…`}</td><td><Badge tone={item.integrity === 'verified' ? 'success' : 'warn'}>{item.integrity}</Badge></td></tr>)}{!filtered.length && <tr><td colSpan={6}><EmptyState label="No evidence matches the current filters." /></td></tr>}</tbody></table></div>
        {selectedItem && <div style={{ borderLeft: '1px solid var(--border)', background: 'var(--bg-soft)', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><strong className="mono">{selectedItem.evidence_id}</strong><button className="btn btn-sm btn-ghost" onClick={() => setSelected(null)}>✕</button></div><div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}><div><strong>Feature:</strong> {selectedItem.feature}</div><div><strong>Source:</strong> {selectedItem.source}</div><div><strong>SHA256:</strong> {selectedItem.hash}</div><div><strong>Score:</strong> {selectedItem.score} • Confidence {selectedItem.confidence}%</div></div><div style={{ fontSize: 12, color: 'var(--text-2)' }}>{selectedItem.explanation}</div><textarea className="input" rows={4} placeholder="Analyst note" value={note} onChange={event => setNote(event.target.value)} /><button className="btn btn-primary" onClick={() => void saveNote()} disabled={savingNote}>{savingNote ? 'Saving…' : 'Save analyst note'}</button></div>}
      </div></Panel>
    <Panel title="Artifacts — provenance and storage"><div className="table-wrap"><table><thead><tr><th>ARTIFACT ID</th><th>SOURCE REF</th><th>TYPE</th><th>SHA256</th><th>MIME</th><th>SIZE</th><th>COLLECTED</th></tr></thead><tbody>{vm.artifacts.map(item => <tr key={item.artifact_id}><td className="mono">{item.artifact_id}</td><td className="mono">{item.source_ref}</td><td><Badge tone="neutral">{item.source_type}</Badge></td><td className="mono" style={{ color: 'var(--accent)' }}>{item.sha256.slice(0, 16)}…</td><td className="mono">{item.mime}</td><td className="mono">{item.size} B</td><td className="mono">{new Date(item.collected_at).toLocaleString()}</td></tr>)}{!vm.artifacts.length && <tr><td colSpan={7}><EmptyState label="No artifacts returned for this case." /></td></tr>}</tbody></table></div></Panel>
  </div>
}
