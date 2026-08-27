import { Panel } from '../components/common/Panel'
import { Badge } from '../components/common/Badge'
import { signals, stylometryComparison } from '../data/analysis'
import { useToast } from '../components/common/Toast'
import { useState } from 'react'

export function Analysis(){
  const { push } = useToast()
  const [active,setActive]=useState<string>('stylometry')
  const s = signals.find(x=>x.key===active)!

  return <div style={{display:'flex', flexDirection:'column', gap:14}}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12}}>
      <div>
        <div style={{fontSize:20, fontWeight:800}}>Signal Analysis — 5 Independent Signals</div>
        <div style={{fontSize:11, color:'var(--text-3)'}}>Each signal has score, status, explanation, evidence reference, and limitations. Do not display score as unexplained AI magic.</div>
      </div>
      <button className="btn btn-primary" onClick={()=>push('Full pipeline re-run queued — estimated 14s','info')}>▶ Re-run All Signals</button>
    </div>

    <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
      {signals.map(sig=>(
        <button key={sig.key} onClick={()=>setActive(sig.key)}
          style={{
            padding:'10px 14px', borderRadius:10, border: active===sig.key?'1px solid var(--accent-border)':'1px solid var(--border)',
            background: active===sig.key?'var(--accent-dim)':'var(--bg-panel)', color: active===sig.key?'var(--text-1)':'var(--text-2)',
            fontWeight:700, fontSize:11, letterSpacing:'0.06em', cursor:'pointer', display:'flex', gap:8, alignItems:'center'
          }}>
          {sig.label} <span style={{background: sig.score>=85?'rgba(16,185,129,0.2)': sig.score>=75?'rgba(34,211,238,0.2)':'rgba(245,158,11,0.2)', padding:'2px 6px', borderRadius:99, fontSize:11}}>{sig.score}</span>
        </button>
      ))}
    </div>

    <div className="grid" style={{gridTemplateColumns:'1.4fr 0.8fr'}}>
      <Panel title={`${s.label} — Detailed`} actions={<Badge tone={s.score>=85?'success': s.score>=75?'info':'warn'}>{s.status.toUpperCase()}</Badge>}>
        <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:10}}>
          <span className="mono" style={{fontSize:28, fontWeight:800, color:'var(--accent)'}}>{s.score}</span>
          <div className="progress-track" style={{flex:1}}><div className="progress-fill" style={{width:`${s.score}%`, background: s.score>=85?'#10b981': s.score>=75?'#22d3ee':'#f59e0b'}}/></div>
          <span style={{fontSize:11, color:'var(--text-3)'}}>Baseline model • Not definitive</span>
        </div>
        <div style={{fontSize:13, color:'var(--text-1)', fontWeight:600}}>{s.explanation}</div>
        <div className="mono" style={{fontSize:11, color:'var(--text-3)', marginTop:6}}>Evidence: {s.evidence}</div>

        <div style={{marginTop:14}}>
          <div style={{fontSize:11, letterSpacing:'0.08em', fontWeight:700, color:'var(--text-3)'}}>CONTRIBUTING FEATURES</div>
          <div style={{display:'grid', gap:8, marginTop:8}}>
            {s.features.map(f=>(
              <div key={f.name} style={{display:'flex', gap:10, alignItems:'center', background:'var(--bg-soft)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 10px'}}>
                <span style={{flex:1, fontSize:12, fontWeight:600}}>{f.name}</span>
                <div className="progress-track" style={{width:120}}><div className="progress-fill" style={{width:`${f.value*100}%`, background:'var(--accent)'}}/></div>
                <span className="mono" style={{width:44, textAlign:'right', fontWeight:700, fontSize:11}}>{Math.round(f.value*100)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{marginTop:14, background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, padding:'10px 12px'}}>
          <div style={{fontSize:11, fontWeight:700, letterSpacing:'0.06em', color:'#f87171'}}>LIMITATIONS</div>
          <ul style={{margin:'6px 0 0 16px', fontSize:11, color:'var(--text-2)', lineHeight:1.6}}>
            {s.limitations.map(l=> <li key={l}>{l}</li>)}
          </ul>
        </div>

        <div style={{marginTop:12, display:'flex', gap:8}}>
          <button className="btn btn-sm" onClick={()=>push(`${s.label} evidence opened`,'info')}>View Supporting Evidence</button>
          <button className="btn btn-sm btn-ghost" onClick={()=>push('Analyst note added to signal','success')}>Add Analyst Note</button>
        </div>
      </Panel>

      <div style={{display:'flex', flexDirection:'column', gap:14}}>
        <Panel title="Stylometry Comparison" subtitle="— document pair">
          <div style={{fontSize:12, color:'var(--text-2)'}}>
            <div className="mono" style={{fontSize:11}}><strong>{stylometryComparison.docA}</strong> ↔ <strong>{stylometryComparison.docB}</strong></div>
            <div style={{display:'flex', gap:8, alignItems:'center', marginTop:8}}>
              <span style={{fontSize:22, fontWeight:800, color:'var(--accent)'}}>{stylometryComparison.similarity}%</span>
              <span style={{fontSize:11, color:'var(--text-3)'}}>Similarity • {stylometryComparison.model_version}</span>
            </div>
            <div style={{marginTop:10, display:'grid', gap:6}}>
              {stylometryComparison.top_features.map(f=>(
                <div key={f.feature} style={{display:'flex', justifyContent:'space-between', background:'var(--bg-soft)', border:'1px solid var(--border)', borderRadius:6, padding:'6px 8px', fontSize:11}}>
                  <span className="mono" style={{fontWeight:600}}>{f.feature}</span>
                  <span style={{color:'var(--text-3)'}}>{f.explanation} • {(f.contribution*100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
            <div style={{marginTop:8, fontSize:11, color:'var(--warn)'}}>Noise doc (22) correctly identified as divergent — demonstrates uncertainty handling.</div>
          </div>
        </Panel>

        <Panel title="All Signals — Summary">
          <div style={{display:'grid', gap:8}}>
            {signals.map(sig=>(
              <div key={sig.key} style={{display:'flex', gap:8, alignItems:'center', padding:'8px 10px', background: sig.key===active?'var(--accent-dim)':'var(--bg-soft)', border:`1px solid ${sig.key===active?'var(--accent-border)':'var(--border)'}`, borderRadius:8, cursor:'pointer'}} onClick={()=>setActive(sig.key)}>
                <span style={{fontSize:11, fontWeight:700, width:110}}>{sig.label}</span>
                <div className="progress-track" style={{flex:1}}><div className="progress-fill" style={{width:`${sig.score}%`, background: sig.score>=85?'#10b981':'#22d3ee'}}/></div>
                <span className="mono" style={{fontWeight:700}}>{sig.score}</span>
              </div>
            ))}
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8}}>
              <span style={{fontWeight:800, fontSize:11}}>OVERALL</span><span style={{fontWeight:800, color:'var(--accent)'}}>78% — INVESTIGATIVE LEAD</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  </div>
}
