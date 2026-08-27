import { Panel } from '../components/common/Panel'
import { Badge } from '../components/common/Badge'
import { reportTemplate } from '../data/reports'
import { confidence } from '../data/analysis'
import { useToast } from '../components/common/Toast'
import { useState } from 'react'

export function Reports(){
  const { push } = useToast()
  const [generating,setGenerating]=useState(false)
  const generate = ()=>{
    setGenerating(true)
    setTimeout(()=>{ setGenerating(false); push('Report generated — JSON & PDF queued','success') }, 900)
  }
  return <div style={{display:'flex', flexDirection:'column', gap:14}}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12}}>
      <div>
        <div style={{fontSize:20, fontWeight:800}}>Investigation Reports</div>
        <div className="mono" style={{fontSize:11, color:'var(--text-3)'}}>Case pack • evidence • entities • signals • confidence • timeline • limitations • review status</div>
      </div>
      <div style={{display:'flex', gap:8}}>
        <button className="btn" onClick={()=>push('Report preview opened in new view','info')}>View Report</button>
        <button className="btn btn-primary" onClick={generate} disabled={generating}>{generating? 'Generating…':'Generate Report'}</button>
        <button className="btn" onClick={()=>push('Report exported — JSON','success')}>Export JSON</button>
      </div>
    </div>

    <Panel title="Report Preview — CASE-2026-001" subtitle="SYNTHETIC DEMONSTRATION" actions={<Badge tone="violet">CONFIDENTIAL</Badge>}>
      <div style={{background:'white', color:'#0f172a', borderRadius:10, padding:24, fontSize:12, lineHeight:1.6}}>
        <div style={{borderBottom:'2px solid #0f172a', paddingBottom:12, marginBottom:12}}>
          <div style={{fontWeight:800, fontSize:16, letterSpacing:'-0.02em'}}>{reportTemplate.title}</div>
          <div style={{fontSize:11, letterSpacing:'0.08em', fontWeight:700, color:'#475569'}}>{reportTemplate.classification}</div>
          <div style={{fontSize:11, color:'#64748b'}} className="mono">{reportTemplate.case_id} • {reportTemplate.authorization} • {reportTemplate.investigator} • Generated {new Date(reportTemplate.generated_at).toLocaleString('en-GB')}</div>
        </div>

        <div style={{display:'grid', gap:14}}>
          <div>
            <div style={{fontWeight:800, fontSize:11, letterSpacing:'0.08em', borderLeft:'3px solid #0ea5e9', paddingLeft:8}}>INVESTIGATION SUMMARY</div>
            <div style={{marginTop:6, background:'#f8fafc', border:'1px solid #e2e8f0', padding:'10px 12px', borderRadius:8}}>{reportTemplate.summary}</div>
          </div>

          <div className="grid grid-3" style={{gap:10}}>
            {[
              {k:'Artifacts', v: reportTemplate.artifacts},
              {k:'Evidence', v: reportTemplate.evidence},
              {k:'Entities', v: reportTemplate.entities},
            ].map(s=>(
              <div key={s.k} style={{background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:12, textAlign:'center'}}>
                <div style={{fontSize:10, letterSpacing:'0.08em', fontWeight:700, color:'#64748b'}}>{s.k.toUpperCase()}</div>
                <div style={{fontSize:22, fontWeight:800}}>{s.v}</div>
              </div>
            ))}
          </div>

          <div>
            <div style={{fontWeight:800, fontSize:11, letterSpacing:'0.08em', borderLeft:'3px solid #10b981', paddingLeft:8}}>SIGNAL SCORES & CONFIDENCE</div>
            <div style={{marginTop:8, display:'grid', gap:6}}>
              {confidence.contributions.map(c=>(
                <div key={c.signal} style={{display:'flex', gap:8, alignItems:'center', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:6, padding:'6px 10px'}}>
                  <span style={{width:110, fontWeight:700, fontSize:11}}>{c.signal}</span>
                  <span style={{flex:1, height:6, background:'#e2e8f0', borderRadius:999, overflow:'hidden'}}><span style={{display:'block', width:`${c.score}%`, height:'100%', background:'#0ea5e9'}}/></span>
                  <span style={{fontWeight:700, fontSize:11}}>{c.score}</span>
                  <span style={{fontSize:11, color:'#64748b'}}>({c.weight*100}%)</span>
                </div>
              ))}
              <div style={{background:'#0f172a', color:'white', borderRadius:8, padding:'10px 12px', display:'flex', justifyContent:'space-between'}}>
                <span style={{fontWeight:700}}>OVERALL</span><span style={{fontWeight:800}}>{confidence.overall}% — INVESTIGATIVE LEAD</span>
              </div>
            </div>
          </div>

          <div>
            <div style={{fontWeight:800, fontSize:11, letterSpacing:'0.08em', borderLeft:'3px solid #f59e0b', paddingLeft:8}}>TIMELINE (5 EVENTS)</div>
            <div style={{marginTop:8, display:'grid', gap:6}}>
              {[
                '2026-01-10 — Domain registered: darkweb-market.xyz',
                '2026-01-12 — Document created: doc_shadow_001.txt',
                '2026-01-13 — Document created: doc_shadow_002.txt',
                '2026-01-15 02:30 — ETH transfer 2.5 ETH',
                '2026-01-15 08:00 — IP observed: 192.168.1.100',
              ].map(t=> <div key={t} style={{background:'#f8fafc', border:'1px solid #e2e8f0', padding:'6px 10px', borderRadius:6, fontSize:11}}>{t}</div>)}
            </div>
          </div>

          <div>
            <div style={{fontWeight:800, fontSize:11, letterSpacing:'0.08em', borderLeft:'3px solid #ef4444', paddingLeft:8}}>LIMITATIONS & UNCERTAINTY</div>
            <ul style={{margin:'6px 0 0 18px', fontSize:11, color:'#334155', lineHeight:1.6}}>
              {reportTemplate.limitations.map(l=> <li key={l}>{l}</li>)}
            </ul>
          </div>

          <div>
            <div style={{fontWeight:800, fontSize:11, letterSpacing:'0.08em', borderLeft:'3px solid #8b5cf6', paddingLeft:8}}>RECOMMENDATIONS & REVIEW STATUS</div>
            <ul style={{margin:'6px 0 0 18px', fontSize:11, lineHeight:1.6}}>
              {reportTemplate.recommendations.map(r=> <li key={r}>{r}</li>)}
            </ul>
            <div style={{marginTop:8, background:'#fef3c7', border:'1px solid #fde68a', padding:'8px 10px', borderRadius:6, fontSize:11}}>
              <strong>Review:</strong> 3 leads pending verification • 1 requires more evidence • All actions audited with reviewer ID and timestamp.
            </div>
          </div>
        </div>

        <div style={{marginTop:16, paddingTop:12, borderTop:'1px solid #e2e8f0', fontSize:10, color:'#64748b', textAlign:'center'}}>
          This report contains SYNTHETIC / DEMONSTRATION DATA. All findings are investigative leads requiring analyst verification. No definitive identity claim is made.
        </div>
      </div>
      <div style={{marginTop:12, display:'flex', gap:8, justifyContent:'flex-end'}}>
        <button className="btn btn-sm" onClick={()=>push('Print view opened','info')}>Print</button>
        <button className="btn btn-sm btn-primary" onClick={generate}>Export PDF</button>
      </div>
    </Panel>
  </div>
}
