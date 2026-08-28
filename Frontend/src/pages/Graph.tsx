import { useState } from 'react'
import { Panel } from '../components/common/Panel'
import { Badge } from '../components/common/Badge'
import { EmptyState, ErrorState, LoadingState } from '../components/common/AsyncState'
import { toCaseViewModel, useCaseData } from '../hooks/useCaseData'
import { useSelectedCaseId } from '../hooks/useSelectedCaseId'

export function Graph() {
  const { caseId } = useSelectedCaseId()
  const state = useCaseData(caseId)
  const [q, setQ] = useState('')
  if (!caseId) return <LoadingState label="Selecting a case from the backend…" />
  if (state.loading || !state.data) return state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : <LoadingState label="Loading graph from backend…" />
  const graph = toCaseViewModel(state.data).graph
  const nodes = graph.nodes.filter(node => !q || `${node.id} ${node.label} ${node.type}`.toLowerCase().includes(q.toLowerCase()))
  const visibleIds = new Set(nodes.map(node => node.id))
  const edges = graph.edges.filter(edge => visibleIds.has(edge.source) || visibleIds.has(edge.target))
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}><div><div style={{ fontSize: 20, fontWeight: 800 }}>Identity Linkage Graph</div><div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>Live linkage projection for {caseId} • aliases, wallets, domains, infrastructure, and behavioral signals</div></div><button className="btn" onClick={() => state.reload()}>Refresh graph</button></div><Panel noPadding><div style={{ padding: 12, display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid var(--border)' }}><input className="input" placeholder="Filter node ID, label, type…" value={q} onChange={event => setQ(event.target.value)} style={{ flex: '1 1 280px', maxWidth: 520 }} /><span className="kbd">{nodes.length} NODES</span><span className="kbd">{edges.length} EDGES</span></div><div className="grid" style={{ gridTemplateColumns: '1fr 1.2fr', gap: 0 }}><div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}><table><thead><tr><th>NODE</th><th>TYPE</th><th>CONFIDENCE</th></tr></thead><tbody>{nodes.map(node => <tr key={node.id}><td><div className="mono" style={{ color: 'var(--accent)' }}>{node.id}</div><div style={{ fontWeight: 700 }}>{node.label}</div></td><td><Badge tone="violet">{node.type}</Badge></td><td className="mono">{node.confidence}%</td></tr>)}{!nodes.length && <tr><td colSpan={3}><EmptyState label="No graph nodes match the filter." /></td></tr>}</tbody></table></div><div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}><table><thead><tr><th>SOURCE</th><th>RELATIONSHIP</th><th>TARGET</th><th>CONF.</th></tr></thead><tbody>{edges.map(edge => <tr key={edge.id}><td className="mono">{edge.source}</td><td><Badge tone="info">{edge.type}</Badge></td><td className="mono">{edge.target}</td><td className="mono">{edge.confidence}%</td></tr>)}{!edges.length && <tr><td colSpan={4}><EmptyState label="No identity links returned for this actor." /></td></tr>}</tbody></table></div></div></Panel></div>
}
