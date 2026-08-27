import { Panel } from '../components/common/Panel'
import { Badge } from '../components/common/Badge'
import { confidence } from '../data/analysis'
import { useToast } from '../components/common/Toast'

export function Confidence(){
  const { push }=useToast()
  return <div style={{display:'flex', flexDirection:'column', gap:14}}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12}}>
      <div>
        <div style={{fontSize:20, fontWeight:800}}>Confidence Breakdown — Traceable Scoring</div>
        <div style={{fontSize:11, color:'var(--text-3)'}}>EVIDENCE → SIGNAL → CONTRIBUTION → OVERALL CONFIDENCE • Weighted 5-signal model • Not AI magic</div>
      </div>
      <Badge tone="warn">ANALYST VERIFICATION REQUIRED</Badge>
    </div>

    <div className="grid" style={{gridTemplateColumns:'1.2fr 0.8fr'}}>
      <Panel title="Weighted Contribution — Overall 78%">
        <div style={{display:'grid', gap:10}}>
          {confidence.contributions.map(c=>(
            <div key={c.signal} style={{background:'var(--bg-soft)', border:'1px solid var(--border)', borderRadius:10, padding:12}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span style={{fontWeight:800, letterSpacing:'0.06em', fontSize:11}}>{c.signal}</span>
                <span style={{fontSize:11, background:'var(--bg-elevated)', border:'1px solid var(--border)', padding:'2px 8px', borderRadius:99}}>{c.weight*100}% weight</span>
              </div>
              <div style={{display:'flex', gap:10, alignItems:'center', marginTop:8}}>
                <div className="progress-track" style={{flex:1, height:10}}><div className="progress-fill" style={{width:`${c.score}%`, background: c.score>=85?'#10b981': c.score>=75?'#22d3ee':'#f59e0b'}}/></div>
                <span className="mono" style={{fontWeight:800, minWidth:44, textAlign:'right'}}>{c.score}</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', marginTop:6, fontSize:11, color:'var(--text-3)'}}>
                <span>Contribution</span><span className="mono" style={{fontWeight:700, color:'var(--accent)'}}>{c.contribution.toFixed(2)} pts</span>
              </div>
            </div>
          ))}
          <div style={{background:'linear-gradient(135deg, rgba(34,211,238,0.12), rgba(59,130,246,0.12))', border:'1px solid var(--accent-border)', borderRadius:12, padding:16, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div>
              <div style={{fontSize:11, letterSpacing:'0.08em', fontWeight:700, color:'var(--text-2)'}}>OVERALL CONFIDENCE</div>
              <div style={{fontSize:28, fontWeight:800, color:'var(--accent)'}}>{confidence.overall}%</div>
              <div style={{fontSize:11, color:'var(--text-3)'}}>Investigative lead • 8 evidence items • Conflicting noise lowers by ~7 pts</div>
            </div>
            <div style={{textAlign:'right'}}>
              <Badge tone="info">SYNTHETIC</Badge>
              <div className="mono" style={{fontSize:11, color:'var(--text-3)', marginTop:6}}>Model v1.0.0</div>
            </div>
          </div>
        </div>
      </Panel>

      <div style={{display:'flex', flexDirection:'column', gap:14}}>
        <Panel title="Explanation">
          <div style={{fontSize:13, color:'var(--text-1)', lineHeight:1.6}}>{confidence.explanation}</div>
          <div style={{marginTop:10, fontSize:11, color:'var(--text-3)', background:'var(--bg-soft)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px'}}>
            <strong>HOW IT WORKS:</strong> Each signal scores its evidence (0–100), weighted by reliability (stylometry & blockchain 25% each, OSINT 20%, technical & temporal 15% each). Contributions summed → overall. Uncertainty from conflicting signals and model limitations explicitly shown.
          </div>
          <button className="btn btn-sm" style={{marginTop:10}} onClick={()=>push('Confidence explanation copied to report draft','success')}>Copy to Report</button>
        </Panel>

        <Panel title="Uncertainty & Limitations">
          <div style={{background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.22)', borderRadius:8, padding:'12px 14px', fontSize:12, color:'var(--text-2)', lineHeight:1.6}}>
            {confidence.uncertainty}
          </div>
          <ul style={{fontSize:11, color:'var(--text-3)', marginTop:8, lineHeight:1.6}}>
            <li>All data is SYNTHETIC / DEMONSTRATION DATA</li>
            <li>Noisy CryptoKing evidence (22,30) demonstrates conflicting signals</li>
            <li>IP reuse may be VPN — not definitive attribution</li>
            <li>Blockchain clustering is heuristic</li>
            <li>Small sample — requires additional collection</li>
          </ul>
        </Panel>

        <Panel title="Supporting Evidence">
          <div style={{display:'grid', gap:6}}>
            {[
              {id:'EVD-004', s:'OSINT alias_reuse', v:91},
              {id:'EVD-001', s:'Stylometry vocab', v:84},
              {id:'EVD-006', s:'Temporal overlap', v:81},
              {id:'EVD-003', s:'Blockchain cluster', v:88},
            ].map(e=>(
              <div key={e.id} style={{display:'flex', gap:8, alignItems:'center', background:'var(--bg-soft)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 10px'}}>
                <span className="mono" style={{fontWeight:700, fontSize:11}}>{e.id}</span>
                <span style={{flex:1, fontSize:11}}>{e.s}</span>
                <span className="mono" style={{fontWeight:700}}>{e.v}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  </div>
}
