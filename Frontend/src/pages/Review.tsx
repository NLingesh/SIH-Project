import { useState } from 'react'
import { Panel } from '../components/common/Panel'
import { Badge } from '../components/common/Badge'
import { reviewItems } from '../data/graph'
import { useToast } from '../components/common/Toast'

export function Review(){
  const [items,setItems]=useState(reviewItems)
  const [notes,setNotes]=useState<Record<string,string>>({})
  const { push } = useToast()

  const act = (id:string, decision:string)=>{
    setItems(s=> s.map(x=> x.review_id===id ? {...x, status: decision==='confirm_lead'?'confirmed': decision==='reject_lead'?'rejected':'requires_more'} as any : x))
    push(`${id} — ${decision.replace('_',' ')} — audit logged`, decision==='confirm_lead'?'success': decision==='reject_lead'?'info':'warn')
  }

  return <div style={{display:'flex', flexDirection:'column', gap:14}}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12}}>
      <div>
        <div style={{fontSize:20, fontWeight:800}}>Review Queue — Investigator Verification</div>
        <div style={{fontSize:11, color:'var(--text-3)'}} className="mono">Leads require human verification • Confirm = investigative lead confirmation, NOT legal proof</div>
      </div>
      <div style={{display:'flex', gap:6}}>
        <Badge tone="warn">{items.filter(i=>i.status==='pending').length} PENDING</Badge>
        <Badge tone="success">{items.filter(i=>i.status==='confirmed').length} CONFIRMED</Badge>
        <Badge tone="violet">{items.filter(i=>i.status==='requires_more').length} MORE EVIDENCE</Badge>
      </div>
    </div>

    <div style={{display:'grid', gap:12}}>
      {items.map(r=>(
        <div key={r.review_id} className="panel" style={{padding:14, borderLeft: `3px solid ${r.status==='pending'?'#f59e0b': r.status==='confirmed'?'#10b981': r.status==='rejected'?'#64748b':'#8b5cf6'}`}}>
          <div style={{display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap'}}>
            <div style={{flex:1, minWidth:260}}>
              <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
                <span className="mono" style={{fontWeight:800, color:'var(--accent)'}}>{r.review_id}</span>
                <Badge tone="violet">{r.entity_type.toUpperCase()}</Badge>
                <Badge tone="info">{r.lead_type}</Badge>
                <Badge tone={r.status==='pending'?'warn': r.status==='confirmed'?'success': r.status==='rejected'?'neutral':'violet'}>{r.status.toUpperCase().replace('_',' ')}</Badge>
                <span className="mono" style={{fontSize:11, fontWeight:700, background:'var(--bg-soft)', border:'1px solid var(--border)', padding:'2px 8px', borderRadius:99}}>{r.confidence}%</span>
              </div>
              <div style={{fontWeight:700, marginTop:6}}>{r.entity_label} <span style={{fontWeight:400, color:'var(--text-3)'}}>• {r.case_id}</span></div>
              <div style={{display:'flex', gap:6, marginTop:6}}>
                {r.signals.map(s=> <Badge key={s} tone="neutral">{s}</Badge>)}
                <span className="mono" style={{fontSize:11, color:'var(--text-3)'}}>{r.submitted_at}</span>
              </div>
              <textarea className="textarea" placeholder="Add analyst note…" value={notes[r.review_id]||''} onChange={e=> setNotes({...notes, [r.review_id]: e.target.value})} style={{marginTop:10, minHeight:56}}/>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:6, minWidth:200}}>
              <button className="btn" style={{background:'#10b981', color:'white', borderColor:'rgba(16,185,129,0.4)'}} onClick={()=>act(r.review_id,'confirm_lead')}>✓ Confirm Lead</button>
              <button className="btn" style={{background:'#ef4444', color:'white', borderColor:'rgba(239,68,68,0.4)'}} onClick={()=>act(r.review_id,'reject_lead')}>✕ Reject Lead</button>
              <button className="btn" onClick={()=>act(r.review_id,'mark_requires_review')}>◷ Requires More Evidence</button>
              <button className="btn btn-ghost" onClick={()=>push('Note saved — will be included in report','success')}>Add Note Only</button>
              <div style={{fontSize:10, color:'var(--text-3)', textAlign:'center'}}>Every action is audited with timestamp & reviewer ID</div>
            </div>
          </div>
        </div>
      ))}
    </div>

    <Panel title="Review Guidance">
      <div style={{fontSize:12, color:'var(--text-2)', lineHeight:1.7}}>
        <strong>Confirm Lead</strong> = analyst agrees investigative lead is supported; still requires corroboration and legal process before action. <strong>Reject</strong> = lead not supported by current evidence. <strong>Requires More Evidence</strong> = signal plausible but insufficient. All probabilistic findings include uncertainty and limitations.
      </div>
    </Panel>
  </div>
}
