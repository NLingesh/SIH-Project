import { useMemo, useState } from 'react'
import { Panel } from '../components/common/Panel'
import { Badge } from '../components/common/Badge'
import { evidence, artifacts } from '../data/evidence'
import { useToast } from '../components/common/Toast'

export function Evidence(){
  const [q,setQ]=useState('')
  const [filter,setFilter]=useState<string>('all')
  const [selected,setSelected]=useState<string | null>(null)
  const { push } = useToast()
  const filtered = useMemo(()=> evidence.filter(e=>{
    if(filter!=='all' && e.signal_type!==filter) return false
    if(q && !(e.evidence_id+e.artifact_name+e.feature+e.explanation).toLowerCase().includes(q.toLowerCase())) return false
    return true
  }),[q,filter])
  const sel = evidence.find(e=>e.evidence_id===selected)

  return <div style={{display:'flex', flexDirection:'column', gap:14}}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12}}>
      <div>
        <div style={{fontSize:20, fontWeight:800}}>Evidence Explorer</div>
        <div className="mono" style={{fontSize:11, color:'var(--text-3)'}}>Artifact list • hash • integrity • provenance • Click row for detail</div>
      </div>
      <div style={{display:'flex', gap:8}}>
        <button className="btn" onClick={()=>push('Artifact upload requires file + source_type + authorization','info')}>Upload Artifact</button>
        <button className="btn btn-primary" onClick={()=>push('Evidence integrity re-validated — all SHA256 verified','success')}>Verify Integrity</button>
      </div>
    </div>

    <Panel noPadding>
      <div style={{padding:12, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', borderBottom:'1px solid var(--border)', background:'rgba(255,255,255,0.02)'}}>
        <div style={{position:'relative', flex:'1 1 260px', maxWidth:480}}>
          <span style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)'}}>⌕</span>
          <input className="input" placeholder="Search evidence ID, artifact, feature, explanation…" value={q} onChange={e=>setQ(e.target.value)} style={{paddingLeft:30}}/>
        </div>
        <select className="select" style={{width:180}} value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="all">All signals</option><option value="stylometry">Stylometry</option><option value="blockchain">Blockchain</option><option value="osint">OSINT</option><option value="technical_fingerprint">Technical</option><option value="temporal">Temporal</option>
        </select>
        <span className="kbd">{filtered.length} EVIDENCE</span>
        <span className="kbd">{artifacts.length} ARTIFACTS</span>
      </div>

      <div style={{display:'grid', gridTemplateColumns: sel ? '1fr 380px' : '1fr'}}>
        <div className="table-wrap" style={{border:'none', borderRadius:0}}>
          <table>
            <thead><tr><th>EVIDENCE ID</th><th>ARTIFACT</th><th>SIGNAL</th><th>SCORE</th><th>HASH</th><th>INTEGRITY</th><th>PROCESSING</th></tr></thead>
            <tbody>
              {filtered.map(e=>(
                <tr key={e.evidence_id} onClick={()=>setSelected(e.evidence_id)} style={{cursor:'pointer', background: selected===e.evidence_id?'rgba(34,211,238,0.06)':undefined}}>
                  <td className="mono" style={{fontWeight:700, color: selected===e.evidence_id?'var(--accent)':'var(--text-1)'}}>{e.evidence_id}</td>
                  <td>
                    <div style={{fontWeight:600}}>{e.artifact_name}</div>
                    <div className="mono" style={{fontSize:10, color:'var(--text-3)'}}>{e.collected_at} • {e.source}</div>
                  </td>
                  <td><Badge tone="info">{e.signal_type}</Badge></td>
                  <td style={{fontWeight:700}}>{e.score}<span style={{color:'var(--text-3)', fontWeight:400}}> / {e.confidence}%</span></td>
                  <td className="mono" style={{fontSize:11}}>{e.hash}</td>
                  <td><Badge tone={e.integrity==='verified'?'success':e.integrity==='pending'?'warn':'danger'}>{e.integrity}</Badge></td>
                  <td><Badge tone={e.processing==='processed'?'success':e.processing==='processing'?'warn':'neutral'}>{e.processing}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length===0 && <div style={{padding:24, textAlign:'center', color:'var(--text-3)'}}>No evidence matches filters.</div>}
        </div>

        {sel && <div style={{borderLeft:'1px solid var(--border)', background:'var(--bg-soft)', padding:14, display:'flex', flexDirection:'column', gap:12}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{fontWeight:800}} className="mono">{sel.evidence_id}</div>
            <button className="btn btn-sm btn-ghost" onClick={()=>setSelected(null)}>✕</button>
          </div>
          <div style={{background:'var(--bg-panel)', border:'1px solid var(--border)', borderRadius:10, padding:12}}>
            <div style={{fontSize:11, letterSpacing:'0.08em', fontWeight:700, color:'var(--text-3)'}}>PROVENANCE</div>
            <div className="mono" style={{fontSize:11, marginTop:6, lineHeight:1.6}}>
              <div><strong>Source:</strong> {sel.source}</div>
              <div><strong>Type:</strong> {sel.type}</div>
              <div><strong>Collected:</strong> {sel.collected_at}</div>
              <div><strong>SHA256:</strong> <span style={{color:'var(--accent)'}}>{sel.hash}</span></div>
              <div><strong>Feature:</strong> {sel.feature}</div>
              <div><strong>Score:</strong> {sel.score} • Confidence {sel.confidence}%</div>
            </div>
          </div>
          <div style={{background:'var(--bg-panel)', border:'1px solid var(--border)', borderRadius:10, padding:12}}>
            <div style={{fontSize:11, fontWeight:700, letterSpacing:'0.06em', color:'var(--text-3)'}}>EXPLANATION</div>
            <div style={{fontSize:12, color:'var(--text-2)', marginTop:6}}>{sel.explanation}</div>
            <div style={{marginTop:8, fontSize:11, color:'var(--warn)', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', padding:'6px 8px', borderRadius:6}}>Requires analyst verification • Not definitive</div>
          </div>
          <div style={{display:'flex', gap:6}}>
            <button className="btn btn-sm btn-primary" style={{flex:1}} onClick={()=>push(`Evidence ${sel.evidence_id} referenced in report draft`,'success')}>Reference in Report</button>
            <button className="btn btn-sm" onClick={()=>push('Analyst note added','info')}>Add Note</button>
          </div>
        </div>}
      </div>
    </Panel>

    <Panel title="Artifacts — Provenance & Storage">
      <div className="table-wrap"><table>
        <thead><tr><th>ARTIFACT ID</th><th>SOURCE REF</th><th>TYPE</th><th>SHA256</th><th>MIME</th><th>SIZE</th><th>COLLECTED</th></tr></thead>
        <tbody>
          {artifacts.map(a=>(
            <tr key={a.artifact_id}>
              <td className="mono" style={{fontWeight:700}}>{a.artifact_id}</td>
              <td className="mono" style={{fontSize:11}}>{a.source_ref}</td>
              <td><Badge tone="neutral">{a.source_type}</Badge></td>
              <td className="mono" style={{fontSize:11, color:'var(--accent)'}}>{a.sha256.slice(0,16)}…{a.sha256.slice(-8)}</td>
              <td className="mono" style={{fontSize:11}}>{a.mime}</td>
              <td className="mono">{a.size} B</td>
              <td className="mono" style={{fontSize:11, color:'var(--text-3)'}}>{new Date(a.collected_at).toLocaleString('en-GB')}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </Panel>
  </div>
}
