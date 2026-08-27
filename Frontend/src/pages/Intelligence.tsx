import { Panel } from '../components/common/Panel'
import { Badge } from '../components/common/Badge'
import { collectionJobs } from '../data/evidence'
import { useToast } from '../components/common/Toast'

export function Intelligence(){
  const { push } = useToast()
  return <div style={{display:'flex', flexDirection:'column', gap:14}}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12}}>
      <div>
        <div style={{fontSize:20, fontWeight:800}}>Intelligence Collection</div>
        <div className="mono" style={{fontSize:11, color:'var(--text-3)'}}>Authorized sources • collection jobs • ingestion state • All actions logged & authorized</div>
      </div>
      <button className="btn btn-primary" onClick={()=>push('New collection job requires AUTH reference — request sent','info')}>⊕ Authorize New Source</button>
    </div>

    <div className="grid grid-3">
      {[
        {k:'READY', v: collectionJobs.filter(j=>j.status==='ready').length, c:'#60a5fa'},
        {k:'RUNNING', v: collectionJobs.filter(j=>j.status==='running').length, c:'#f59e0b'},
        {k:'COMPLETED', v: collectionJobs.filter(j=>j.status==='completed').length, c:'#10b981'},
      ].map(s=>(
        <div key={s.k} className="panel" style={{padding:14, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div><div style={{fontSize:10, letterSpacing:'0.08em', fontWeight:700, color:'var(--text-3)'}}>{s.k}</div><div style={{fontSize:22, fontWeight:800}}>{s.v}</div></div>
          <div style={{width:12,height:12, borderRadius:999, background:s.c, boxShadow:`0 0 10px ${s.c}`}}/>
        </div>
      ))}
    </div>

    <Panel title="Collection Jobs — Authorized Sources" actions={<Badge tone="info">6 SOURCES</Badge>}>
      <div className="table-wrap"><table>
        <thead><tr><th>JOB ID</th><th>SOURCE</th><th>TYPE</th><th>STATUS</th><th>PROGRESS</th><th>STARTED → COMPLETED</th><th>RESULTS</th><th>AUTHORIZED BY</th></tr></thead>
        <tbody>
          {collectionJobs.map(j=>(
            <tr key={j.id}>
              <td className="mono" style={{fontWeight:700}}>{j.id}</td>
              <td style={{fontWeight:600}}>{j.source}</td>
              <td className="mono" style={{fontSize:11}}>{j.type}</td>
              <td><Badge tone={j.status==='completed'?'success': j.status==='running'?'warn': j.status==='failed'?'danger': j.status==='requires_review'?'violet':'neutral'}>{j.status.toUpperCase().replace('_',' ')}</Badge></td>
              <td style={{minWidth:120}}><div style={{display:'flex', gap:8, alignItems:'center'}}><div className="progress-track" style={{width:80}}><div className="progress-fill" style={{width:`${j.progress}%`, background: j.status==='failed'?'var(--danger)': j.status==='completed'?'var(--success)':'var(--accent)'}}/></div><span className="mono" style={{fontSize:11, fontWeight:700}}>{j.progress}%</span></div></td>
              <td className="mono" style={{fontSize:11, color:'var(--text-3)'}}>{j.started_at} → {j.completed_at || '—'}</td>
              <td className="mono" style={{fontWeight:700, textAlign:'center'}}>{j.results}</td>
              <td className="mono" style={{fontSize:11}}>{j.authorized_by}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <div style={{marginTop:10, display:'flex', gap:8, flexWrap:'wrap'}}>
        <button className="btn btn-sm" onClick={()=>push('Retry queued for failed job COL-006','warn')}>Retry Failed</button>
        <button className="btn btn-sm" onClick={()=>push('Review submitted for COL-004','success')}>Review Requires-Review</button>
        <button className="btn btn-sm btn-ghost" onClick={()=>push('Collection logs exported','info')}>Export Logs</button>
      </div>
    </Panel>

    <Panel title="Ingestion Details — State & Limitations">
      <div style={{fontSize:12, color:'var(--text-2)', lineHeight:1.7}}>
        All collection is <strong>authorized</strong> and logged. Progress reflects ingestion + normalization + hashing. <Badge tone="warn">REQUIRES REVIEW</Badge> indicates analyst must validate source provenance before use in confidence scoring. Failed jobs (e.g., phishing kit feed) require authorization re-check and network diagnostics.
      </div>
    </Panel>
  </div>
}
