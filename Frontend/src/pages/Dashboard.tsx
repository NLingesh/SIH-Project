import { Panel } from '../components/common/Panel'
import { Badge } from '../components/common/Badge'
import { cases, recentActivity } from '../data/cases'
import { confidence } from '../data/analysis'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/common/Toast'

export function Dashboard(){
  const nav=useNavigate()
  const { push } = useToast()
  const active = cases.filter(c=>c.status==='active').length
  const open = cases.filter(c=>c.status==='open').length
  return <div style={{display:'flex', flexDirection:'column', gap:14}}>
    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12}}>
      <div>
        <div style={{fontSize:22, fontWeight:800, letterSpacing:'-0.02em'}}>Investigator Console</div>
        <div style={{color:'var(--text-3)', fontSize:12}}>SYNTHETIC / DEMONSTRATION DATA — Professional investigation workstation • All findings are investigative leads</div>
      </div>
      <div style={{display:'flex', gap:8}}>
        <button className="btn" onClick={()=>push('Collection job queued — requires authorization','info')}>⊕ New Collection</button>
        <button className="btn btn-primary" onClick={()=> nav('/cases')}>Open Case Workspace →</button>
      </div>
    </div>

    <div className="grid grid-4">
      {[
        {label:'ACTIVE CASES', value:String(active), sub:`${open} open • ${cases.length} total`, icon:'◈', tone:'info'},
        {label:'EVIDENCE ITEMS', value:'42', sub:'8 in CASE-2026-001 • 3 pending review', icon:'⬢', tone:'violet'},
        {label:'ENTITIES RESOLVED', value:'24', sub:'10 in primary case • 14 cross-case', icon:'⬙', tone:'success'},
        {label:'AVG CONFIDENCE', value:`${confidence.overall}%`, sub:'Investigative lead — verification required', icon:'◐', tone:'warn'},
      ].map(c=>(
        <div key={c.label} className="panel" style={{padding:14}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
            <div>
              <div style={{fontSize:10, letterSpacing:'0.08em', fontWeight:700, color:'var(--text-3)'}}>{c.label}</div>
              <div style={{fontSize:26, fontWeight:800, marginTop:4, letterSpacing:'-0.02em'}}>{c.value}</div>
              <div style={{fontSize:11, color:'var(--text-3)', marginTop:2}}>{c.sub}</div>
            </div>
            <div style={{width:36,height:36, borderRadius:10, display:'grid', placeItems:'center', background:'var(--bg-elevated)', border:'1px solid var(--border)', color:'var(--accent)'}}>{c.icon}</div>
          </div>
          <div className="progress-track" style={{marginTop:10}}><div className="progress-fill" style={{width:c.label==='AVG CONFIDENCE'? `${confidence.overall}%` : '68%', background:'var(--accent)'}}/></div>
        </div>
      ))}
    </div>

    <div className="grid" style={{gridTemplateColumns:'1.6fr 1fr'}}>
      <Panel title="Active Cases" subtitle="— requires review priority" actions={<button className="btn btn-sm" onClick={()=>nav('/cases')}>View all →</button>}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>CASE ID</th><th>TITLE</th><th>PRIORITY</th><th>STATUS</th><th>CONFIDENCE</th><th>EVIDENCE</th></tr></thead>
            <tbody>
              {cases.slice(0,5).map(c=>(
                <tr key={c.case_id} onClick={()=>nav(`/workspace?case=${c.case_id}`)} style={{cursor:'pointer'}}>
                  <td className="mono" style={{fontWeight:700, color:'var(--accent)'}}>{c.case_id}</td>
                  <td style={{maxWidth:320}}>
                    <div style={{fontWeight:600, color:'var(--text-1)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{c.title}</div>
                    <div style={{fontSize:11, color:'var(--text-3)'}}>{c.investigator} • {c.authorization_ref}</div>
                  </td>
                  <td><Badge tone={c.priority==='critical'?'danger': c.priority==='high'?'warn': c.priority==='medium'?'info':'neutral'}>{c.priority.toUpperCase()}</Badge></td>
                  <td><Badge tone={c.status==='active'?'success': c.status==='open'?'info':'neutral'} dot={c.status==='active'?'#10b981':undefined}>{c.status}</Badge></td>
                  <td>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <div className="progress-track" style={{width:72}}><div className="progress-fill" style={{width:`${c.confidence}%`, background: c.confidence>=70?'var(--success)': c.confidence>=50?'var(--warn)':'var(--danger)'}}/></div>
                      <span className="mono" style={{fontWeight:700}}>{c.confidence}%</span>
                    </div>
                  </td>
                  <td className="mono">{c.evidence_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mono" style={{marginTop:8, fontSize:11, color:'var(--text-3)'}}>Click a row to open Investigation Workspace — CASE → EVIDENCE → ENTITIES → SIGNALS → CONFIDENCE → REVIEW</div>
      </Panel>

      <div style={{display:'flex', flexDirection:'column', gap:14}}>
        <Panel title="System Status" actions={<Badge tone="success" dot="#10b981">OPERATIONAL</Badge>}>
          <div style={{display:'grid', gap:10}}>
            {[
              {k:'API', v:'healthy', ok:true},
              {k:'PostgreSQL', v:'connected', ok:true},
              {k:'Neo4j', v:'degraded — fallback active', ok:false},
              {k:'Analysis Engine', v:'operational — baseline models', ok:true},
            ].map(r=>(
              <div key={r.k} style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--bg-soft)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 10px'}}>
                <span style={{fontSize:11, fontWeight:700, letterSpacing:'0.06em', color:'var(--text-2)'}}>{r.k}</span>
                <span style={{fontSize:11, fontWeight:700, color: r.ok?'#10b981':'#f59e0b'}}>{r.v.toUpperCase()}</span>
              </div>
            ))}
            <div style={{fontSize:11, color:'var(--text-3)'}}>Version 1.0.0 • Demo mode • Synthetic data only</div>
            <button className="btn btn-sm" onClick={()=>push('Health check complete — all core services responsive','success')}>Run diagnostics</button>
          </div>
        </Panel>

        <Panel title="Investigator Profile">
          <div style={{display:'flex', gap:12, alignItems:'center'}}>
            <div style={{width:44,height:44, borderRadius:999, background:'#152036', border:'1px solid var(--border)', display:'grid', placeItems:'center', fontWeight:800, color:'var(--accent)'}}>AS</div>
            <div>
              <div style={{fontWeight:700}}>A. Sharma — Demo Investigator</div>
              <div className="mono" style={{fontSize:11, color:'var(--text-3)'}}>INV-DEMO-001 • demo@darktrace.local</div>
              <div style={{marginTop:4, display:'flex', gap:6}}><Badge tone="info">CLEARANCE L3</Badge><Badge tone="success">ACTIVE</Badge></div>
            </div>
          </div>
          <div style={{marginTop:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
            <div style={{background:'var(--bg-soft)', border:'1px solid var(--border)', borderRadius:8, padding:10}}>
              <div style={{fontSize:10, letterSpacing:'0.08em', fontWeight:700, color:'var(--text-3)'}}>CASES ASSIGNED</div><div style={{fontWeight:800, fontSize:18}}>4</div>
            </div>
            <div style={{background:'var(--bg-soft)', border:'1px solid var(--border)', borderRadius:8, padding:10}}>
              <div style={{fontSize:10, letterSpacing:'0.08em', fontWeight:700, color:'var(--text-3)'}}>PENDING REVIEWS</div><div style={{fontWeight:800, fontSize:18}}>4</div>
            </div>
          </div>
        </Panel>
      </div>
    </div>

    <div className="grid" style={{gridTemplateColumns:'1.2fr 0.8fr'}}>
      <Panel title="Signal Overview" subtitle="— 5-signal weighted model">
        <div style={{display:'grid', gap:10}}>
          {[
            {k:'STYLOMETRY', v:84, w:'25%', c:'Vocabulary richness & punctuation'},
            {k:'BLOCKCHAIN', v:79, w:'25%', c:'Wallet cluster & transaction timing'},
            {k:'OSINT', v:91, w:'20%', c:'Alias reuse & domain correlation'},
            {k:'TECHNICAL', v:76, w:'15%', c:'Infrastructure fingerprint'},
            {k:'TEMPORAL', v:81, w:'15%', c:'48h window overlap'},
          ].map(s=>(
            <div key={s.k} style={{display:'flex', gap:12, alignItems:'center'}}>
              <span className="mono" style={{width:110, fontSize:11, fontWeight:700, letterSpacing:'0.06em', color:'var(--text-2)'}}>{s.k}</span>
              <span style={{fontSize:11, background:'var(--bg-elevated)', border:'1px solid var(--border)', padding:'2px 6px', borderRadius:99, color:'var(--text-3)'}}>{s.w}</span>
              <div className="progress-track" style={{flex:1}}><div className="progress-fill" style={{width:`${s.v}%`, background: s.v>=85?'var(--success)': s.v>=75?'var(--accent)':'var(--warn)'}}/></div>
              <span className="mono" style={{width:36, fontWeight:700, textAlign:'right'}}>{s.v}%</span>
              <span style={{width:200, fontSize:11, color:'var(--text-3)', display:'none'}} className="hide-mobile">{s.c}</span>
            </div>
          ))}
          <div style={{display:'flex', gap:8, marginTop:4}}>
            <Badge tone="info">OVERALL 78% — INVESTIGATIVE LEAD</Badge><span style={{fontSize:11, color:'var(--text-3)'}}>Weighted sum • Uncertainty: conflicting noise • Requires verification</span>
          </div>
        </div>
      </Panel>

      <Panel title="Recent Activity" actions={<Badge tone="neutral">AUDIT LOG</Badge>}>
        <div style={{display:'grid', gap:8}}>
          {recentActivity.map(a=>(
            <div key={a.id} style={{display:'flex', gap:10, padding:'10px 12px', background:'var(--bg-soft)', border:'1px solid var(--border)', borderRadius:8}}>
              <span style={{width:6, height:6, borderRadius:999, background:'var(--accent)', marginTop:6, flexShrink:0}}/>
              <div style={{minWidth:0, flex:1}}>
                <div style={{fontWeight:600, fontSize:12, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{a.action} — <span className="mono" style={{color:'var(--accent)'}}>{a.case_id}</span></div>
                <div style={{fontSize:11, color:'var(--text-3)'}}>{a.detail}</div>
                <div style={{fontSize:10, color:'var(--text-3)'}} className="mono">{a.time} • {a.actor}</div>
              </div>
            </div>
          ))}
          <button className="btn btn-sm btn-ghost" onClick={()=>nav('/timeline')}>View audit trail →</button>
        </div>
      </Panel>
    </div>

    <Panel title="Investigation Pipeline" subtitle="— EVIDENCE → SIGNAL → CONTRIBUTION → OVERALL CONFIDENCE">
      <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', fontSize:11, fontWeight:700, letterSpacing:'0.06em'}}>
        {['CASE','EVIDENCE','ENTITIES','SIGNALS','RELATIONSHIPS','CONFIDENCE','REVIEW'].map((s,i)=>(
          <span key={s} style={{display:'flex', alignItems:'center', gap:8}}>
            <span style={{background: i<6?'var(--accent-dim)':'var(--bg-elevated)', border:`1px solid ${i<6?'var(--accent-border)':'var(--border)'}`, padding:'6px 10px', borderRadius:99, color: i<6?'var(--accent)':'var(--text-3)'}}>{s}</span>
            {i<6 && <span style={{color:'var(--text-3)'}}>→</span>}
          </span>
        ))}
        <Badge tone="warn" style={{marginLeft:8}}>ANALYST VERIFICATION REQUIRED</Badge>
      </div>
      <div style={{marginTop:8, fontSize:11, color:'var(--text-3)'}}>The workstation enforces traceability: every confidence score links to supporting evidence and limitations. No definitive identity claim is made without human review.</div>
    </Panel>
  </div>
}
