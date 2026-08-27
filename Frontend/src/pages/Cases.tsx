import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Panel } from '../components/common/Panel'
import { Badge } from '../components/common/Badge'
import { cases } from '../data/cases'
import { useToast } from '../components/common/Toast'

export function Cases(){
  const nav = useNavigate()
  const [params] = useSearchParams()
  const initialSearch = params.get('search') || ''
  const [q,setQ]=useState(initialSearch)
  const [status,setStatus]=useState<string>('all')
  const [priority,setPriority]=useState<string>('all')
  const [sort,setSort]=useState<'updated'|'confidence'|'evidence'>('updated')
  const { push } = useToast()

  const filtered = useMemo(()=>{
    let a = [...cases]
    if(q) a = a.filter(c=> (c.case_id+c.title+c.investigator+c.description).toLowerCase().includes(q.toLowerCase()))
    if(status!=='all') a=a.filter(c=>c.status===status)
    if(priority!=='all') a=a.filter(c=>c.priority===priority)
    if(sort==='confidence') a.sort((x,y)=> y.confidence - x.confidence)
    else if(sort==='evidence') a.sort((x,y)=> y.evidence_count - x.evidence_count)
    else a.sort((x,y)=> new Date(y.updated_at).getTime() - new Date(x.updated_at).getTime())
    return a
  },[q,status,priority,sort])

  return <div style={{display:'flex', flexDirection:'column', gap:14}}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12}}>
      <div>
        <div style={{fontSize:20, fontWeight:800}}>Active Cases</div>
        <div style={{fontSize:11, color:'var(--text-3)'}} className="mono">{filtered.length} cases • Synthetic data • Click row to open workspace</div>
      </div>
      <button className="btn btn-primary" onClick={()=>push('Case creation requires authorization reference — demo mode','info')}>⊕ Create Case</button>
    </div>

    <Panel noPadding>
      <div style={{padding:12, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', borderBottom:'1px solid var(--border)', background:'rgba(255,255,255,0.02)'}}>
        <div style={{position:'relative', flex:'1 1 260px', maxWidth:420}}>
          <span style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)'}}>⌕</span>
          <input className="input" placeholder="Search case ID, title, investigator, description…" value={q} onChange={e=>setQ(e.target.value)} style={{paddingLeft:30}}/>
        </div>
        <select className="select" style={{width:140}} value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="all">All status</option><option value="active">Active</option><option value="open">Open</option><option value="closed">Closed</option>
        </select>
        <select className="select" style={{width:140}} value={priority} onChange={e=>setPriority(e.target.value)}>
          <option value="all">All priority</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <select className="select" style={{width:160}} value={sort} onChange={e=>setSort(e.target.value as any)}>
          <option value="updated">Sort: Updated</option><option value="confidence">Sort: Confidence</option><option value="evidence">Sort: Evidence</option>
        </select>
        <span className="kbd">{filtered.length} RESULTS</span>
      </div>

      <div className="table-wrap" style={{border:'none', borderRadius:0}}>
        <table>
          <thead><tr><th>CASE ID</th><th>CASE TITLE</th><th>INVESTIGATOR</th><th>STATUS</th><th>PRIORITY</th><th>CLASSIFICATION</th><th>EVIDENCE</th><th>CONFIDENCE</th><th>UPDATED</th></tr></thead>
          <tbody>
            {filtered.map(c=>(
              <tr key={c.case_id} style={{cursor:'pointer'}} onClick={()=>nav(`/workspace?case=${c.case_id}`)}>
                <td className="mono" style={{fontWeight:800, color:'var(--accent)'}}>{c.case_id}</td>
                <td style={{minWidth:280}}>
                  <div style={{fontWeight:700, color:'var(--text-1)'}}>{c.title}</div>
                  <div style={{fontSize:11, color:'var(--text-3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:380}}>{c.description}</div>
                  <div className="mono" style={{fontSize:10, color:'var(--text-3)'}}>{c.authorization_ref} • {c.artifacts} artifacts • {c.entities} entities</div>
                </td>
                <td className="mono" style={{fontSize:11}}>{c.investigator}</td>
                <td><Badge tone={c.status==='active'?'success':c.status==='open'?'info':'neutral'}>{c.status}</Badge></td>
                <td><Badge tone={c.priority==='critical'?'danger':c.priority==='high'?'warn':c.priority==='medium'?'info':'neutral'}>{c.priority}</Badge></td>
                <td><Badge tone="violet">{c.classification}</Badge></td>
                <td className="mono" style={{textAlign:'center', fontWeight:700}}>{c.evidence_count}</td>
                <td>
                  <div style={{display:'flex', gap:6, alignItems:'center'}}><div className="progress-track" style={{width:64}}><div className="progress-fill" style={{width:`${c.confidence}%`, background: c.confidence>=70?'#10b981': c.confidence>=50?'#f59e0b':'#ef4444'}}/></div><span className="mono" style={{fontWeight:700}}>{c.confidence}%</span></div>
                </td>
                <td className="mono" style={{fontSize:11, color:'var(--text-3)', whiteSpace:'nowrap'}}>{new Date(c.updated_at).toLocaleDateString('en-GB')}</td>
              </tr>
            ))}
            {filtered.length===0 && <tr><td colSpan={9} style={{textAlign:'center', padding:24, color:'var(--text-3)'}}>No cases match your filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <div style={{padding:10, display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid var(--border)', background:'rgba(255,255,255,0.02)'}}>
        <span style={{fontSize:11, color:'var(--text-3)'}}>Showing {filtered.length} of {cases.length} • Use workspace to drill into evidence → entities → signals</span>
        <div style={{display:'flex', gap:6}}><button className="btn btn-sm btn-ghost">‹ Prev</button><button className="btn btn-sm btn-ghost">Next ›</button></div>
      </div>
    </Panel>

    <Panel title="Case Management Tips">
      <div style={{fontSize:12, color:'var(--text-2)', lineHeight:1.6}}>
        Search supports case ID, title, investigator, and description. Filters combine with search. Sorting by confidence surfaces leads needing triage. Clicking a row opens the <strong>Investigation Workspace</strong> with tabs for artifacts, entities, graph, timeline, confidence and review.
      </div>
    </Panel>
  </div>
}
