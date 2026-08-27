import { useSearchParams } from 'react-router-dom'
import { Panel } from '../components/common/Panel'
import { Badge } from '../components/common/Badge'
import { Tabs } from '../components/common/Tabs'
import { cases } from '../data/cases'
import { evidence } from '../data/evidence'
import { entities } from '../data/entities'
import { confidence } from '../data/analysis'
import { graphNodes, graphEdges } from '../data/graph'
import { useState } from 'react'
import { useToast } from '../components/common/Toast'

export function Workspace(){
  const [params]=useSearchParams()
  const caseId = params.get('case') || 'CASE-2026-001'
  const c = cases.find(x=>x.case_id===caseId) || cases[0]
  const [tab,setTab]=useState('overview')
  const { push } = useToast()

  return <div style={{display:'flex', flexDirection:'column', gap:14}}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap'}}>
      <div>
        <div style={{fontSize:10, letterSpacing:'0.1em', fontWeight:700, color:'var(--text-3)'}}>INVESTIGATION WORKSPACE • WORKSTATION MODE</div>
        <div style={{fontSize:20, fontWeight:800, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap'}}><span className="mono" style={{color:'var(--accent)'}}>{c.case_id}</span> — {c.title}</div>
        <div style={{fontSize:12, color:'var(--text-3)', maxWidth:900}}>{c.description}</div>
        <div style={{marginTop:8, display:'flex', gap:6, flexWrap:'wrap'}}>
          <Badge tone={c.status==='active'?'success':'info'}>{c.status.toUpperCase()}</Badge>
          <Badge tone={c.priority==='critical'?'danger':'warn'}>{c.priority.toUpperCase()}</Badge>
          <Badge tone="violet">{c.classification.toUpperCase()}</Badge>
          <span className="mono" style={{fontSize:11, color:'var(--text-3)', background:'var(--bg-soft)', border:'1px solid var(--border)', padding:'3px 8px', borderRadius:99}}>{c.authorization_ref} • {c.investigator}</span>
          <Badge tone="info">EVIDENCE {c.evidence_count} • ENTITIES {c.entities} • CONFIDENCE {c.confidence}%</Badge>
        </div>
      </div>
      <div style={{display:'flex', gap:8}}>
        <button className="btn" onClick={()=>push('Full 5-signal analysis started — baseline models','info')}>▶ Run Full Analysis</button>
        <button className="btn btn-primary" onClick={()=>push('Report generation queued — will include all signals & limitations','success')}>Generate Report</button>
      </div>
    </div>

    <Tabs tabs={[
      {id:'overview', label:'Overview'},
      {id:'evidence', label:'Evidence', count:8},
      {id:'entities', label:'Entities', count:10},
      {id:'signals', label:'Signals', count:5},
      {id:'graph', label:'Graph', count:graphNodes.length},
      {id:'confidence', label:'Confidence'},
      {id:'timeline', label:'Timeline', count:5},
      {id:'review', label:'Review', count:3},
    ]} active={tab} onChange={setTab} />

    {tab==='overview' && <div className="grid" style={{gridTemplateColumns:'1.5fr 1fr'}}>
      <div style={{display:'flex', flexDirection:'column', gap:14}}>
        <Panel title="Case → Evidence → Signals → Confidence">
          <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', fontSize:11, fontWeight:700}}>
            {['EVIDENCE','ENTITIES','SIGNALS','RELATIONSHIPS','CONFIDENCE','REVIEW'].map((s,i)=>(
              <span key={s} style={{display:'flex', alignItems:'center', gap:8}}>
                <span style={{padding:'6px 10px', borderRadius:99, border:'1px solid var(--border)', background: i<5?'var(--accent-dim)':'var(--bg-elevated)', color: i<5?'var(--accent)':'var(--text-3)'}}>{s}</span>
                {i<5 && <span style={{color:'var(--text-3)'}}>→</span>}
              </span>
            ))}
          </div>
          <div style={{marginTop:12, display:'grid', gap:8}}>
            <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
              <Badge tone="success">OVERALL {confidence.overall}% — INVESTIGATIVE LEAD</Badge>
              <span style={{fontSize:11, color:'var(--text-3)'}}>Weighted 5-signal model • Requires human verification</span>
            </div>
            <div style={{fontSize:12, color:'var(--text-2)'}}>{confidence.explanation}</div>
            <div style={{fontSize:11, color:'var(--warn)', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', padding:'8px 10px', borderRadius:8}}><strong>LIMITATIONS:</strong> {confidence.uncertainty}</div>
          </div>
        </Panel>

        <Panel title="Evidence Preview" actions={<button className="btn btn-sm" onClick={()=>setTab('evidence')}>Open evidence →</button>}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>EVIDENCE</th><th>SIGNAL</th><th>SCORE</th><th>CONF</th><th>HASH</th></tr></thead>
              <tbody>
                {evidence.slice(0,4).map(e=>(
                  <tr key={e.evidence_id}><td className="mono" style={{fontWeight:700}}>{e.evidence_id}</td><td><Badge tone="info">{e.signal_type}</Badge></td><td>{e.score}</td><td>{e.confidence}%</td><td className="mono" style={{fontSize:11}}>{e.hash}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div style={{display:'flex', flexDirection:'column', gap:14}}>
        <Panel title="Confidence Contributions">
          <div style={{display:'grid', gap:8}}>
            {confidence.contributions.map(c=>(
              <div key={c.signal} style={{display:'flex', gap:10, alignItems:'center'}}>
                <span className="mono" style={{width:90, fontSize:11, fontWeight:700, color:'var(--text-2)'}}>{c.signal}</span>
                <div className="progress-track" style={{flex:1}}><div className="progress-fill" style={{width:`${c.score}%`, background:'var(--accent)'}}/></div>
                <span className="mono" style={{width:64, textAlign:'right', fontSize:11}}>{c.contribution.toFixed(2)} pts</span>
              </div>
            ))}
            <div style={{height:1, background:'var(--border)'}}/>
            <div style={{display:'flex', justifyContent:'space-between'}}><span style={{fontWeight:700}}>OVERALL</span><span className="mono" style={{fontWeight:800, color:'var(--accent)'}}>{confidence.overall}%</span></div>
          </div>
        </Panel>
        <Panel title="Graph Snapshot" actions={<button className="btn btn-sm" onClick={()=>setTab('graph')}>Open graph →</button>}>
          <div style={{height:180, background:'var(--bg-soft)', border:'1px solid var(--border)', borderRadius:8, display:'grid', placeItems:'center', color:'var(--text-3)', fontSize:11}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:22}}>⬡</div>
              <div>{graphNodes.length} nodes • {graphEdges.length} edges</div>
              <div className="mono">Pan • Zoom • Select</div>
            </div>
          </div>
        </Panel>
      </div>
    </div>}

    {tab==='evidence' && <Panel title="Evidence — All Signals" subtitle={`for ${c.case_id}`}>
      <div className="table-wrap"><table>
        <thead><tr><th>EVIDENCE ID</th><th>ARTIFACT</th><th>SIGNAL</th><th>FEATURE</th><th>SCORE</th><th>CONF</th><th>INTEGRITY</th><th>EXPLANATION</th></tr></thead>
        <tbody>
          {evidence.map(e=>(
            <tr key={e.evidence_id}>
              <td className="mono" style={{fontWeight:700}}>{e.evidence_id}</td>
              <td className="mono" style={{fontSize:11}}>{e.artifact_name}</td>
              <td><Badge tone="info">{e.signal_type}</Badge></td>
              <td className="mono" style={{fontSize:11}}>{e.feature}</td>
              <td style={{fontWeight:700}}>{e.score}</td>
              <td>{e.confidence}%</td>
              <td><Badge tone={e.integrity==='verified'?'success':'warn'}>{e.integrity}</Badge></td>
              <td style={{maxWidth:320, fontSize:11, color:'var(--text-2)'}}>{e.explanation}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </Panel>}

    {tab==='entities' && <Panel title="Entity Resolution" subtitle="— actor, alias, wallet, domain, IP, document">
      <div className="table-wrap"><table>
        <thead><tr><th>ENTITY ID</th><th>LABEL</th><th>TYPE</th><th>CONFIDENCE</th><th>ALIASES / RISK</th><th>LEAD STATUS</th></tr></thead>
        <tbody>
          {entities.map(e=>(
            <tr key={e.entity_id}>
              <td className="mono" style={{fontSize:11}}>{e.entity_id}</td>
              <td style={{fontWeight:600}}>{e.label}</td>
              <td><Badge tone="violet">{e.type}</Badge></td>
              <td><div style={{display:'flex', gap:6, alignItems:'center'}}><div className="progress-track" style={{width:70}}><div className="progress-fill" style={{width:`${e.confidence}%`, background: e.confidence>=70?'#10b981':'#f59e0b'}}/></div>{e.confidence}%</div></td>
              <td className="mono" style={{fontSize:11}}>{e.aliases.join(', ') || (e.risk? `risk ${e.risk}`:'—')}</td>
              <td><Badge tone={e.confidence>=75?'success': e.confidence>=50?'warn':'danger'}>{e.confidence>=75?'INVESTIGATIVE LEAD': e.confidence>=50?'POTENTIAL ASSOCIATION':'REQUIRES REVIEW'}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <div style={{marginTop:8, fontSize:11, color:'var(--text-3)'}}>“Confirm” means confirming an investigative lead, NOT legally proving identity. All associations require corroboration.</div>
    </Panel>}

    {tab==='signals' && <Panel title="Signal Analysis — 5 Independent Signals">
      <div className="grid grid-2">
        {[
          {k:'STYLOMETRY', v:84, d:'Writing similarity between doc_shadow_001 and doc_shadow_002. Vocabulary richness overlap 0.84.'},
          {k:'BLOCKCHAIN', v:79, d:'Wallet co-occurrence and cluster linkage. Wallet 0x742d… linked to domain temporally.'},
          {k:'OSINT', v:91, d:'Exact alias reuse across 2 authorized sources. Domain → alias linkage.'},
          {k:'TECHNICAL', v:76, d:'IP 192.168.1.100 reused across artifacts. May be VPN.'},
          {k:'TEMPORAL', v:81, d:'Artifacts cluster within 48h window (Jan 13–15).'},
        ].map(s=>(
          <div key={s.k} style={{background:'var(--bg-soft)', border:'1px solid var(--border)', borderRadius:10, padding:14}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <span style={{fontWeight:800, letterSpacing:'0.06em', fontSize:11}}>{s.k}</span>
              <span className="mono" style={{fontWeight:800, background:'var(--accent-dim)', border:'1px solid var(--accent-border)', padding:'3px 8px', borderRadius:99, color:'var(--accent)'}}>{s.v}</span>
            </div>
            <div style={{fontSize:12, color:'var(--text-2)', marginTop:6}}>{s.d}</div>
            <div className="progress-track" style={{marginTop:10}}><div className="progress-fill" style={{width:`${s.v}%`, background: s.v>=85?'#10b981': s.v>=75?'#22d3ee':'#f59e0b'}}/></div>
          </div>
        ))}
      </div>
    </Panel>}

    {tab==='graph' && <Panel title="Relationship Graph — Interactive">
      <div style={{height:360, background:'var(--bg-soft)', border:'1px solid var(--border)', borderRadius:10, display:'grid', placeItems:'center', color:'var(--text-3)'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:18, fontWeight:700, color:'var(--text-2)'}}>Graph view available in dedicated tab</div>
          <div>Use the Graph navigation item for full pan/zoom/filter interaction</div>
        </div>
      </div>
    </Panel>}

    {tab==='confidence' && <Panel title="Confidence Breakdown — Weighted 5-Signal Model">
      <div style={{display:'grid', gap:10}}>
        {confidence.contributions.map(c=>(
          <div key={c.signal} style={{display:'flex', gap:10, alignItems:'center', background:'var(--bg-soft)', border:'1px solid var(--border)', borderRadius:8, padding:10}}>
            <span className="mono" style={{width:110, fontWeight:700, fontSize:11}}>{c.signal}</span>
            <span style={{fontSize:11, background:'var(--bg-elevated)', border:'1px solid var(--border)', padding:'2px 6px', borderRadius:99}}>{c.weight*100}% weight</span>
            <div className="progress-track" style={{flex:1}}><div className="progress-fill" style={{width:`${c.score}%`, background:'var(--accent)'}}/></div>
            <span className="mono" style={{fontWeight:700}}>{c.score}</span>
            <span style={{fontSize:11, color:'var(--text-3)'}}>→ {c.contribution.toFixed(2)}</span>
          </div>
        ))}
        <div style={{background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:10, padding:14}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><span style={{fontWeight:800}}>OVERALL CONFIDENCE</span><span className="mono" style={{fontSize:20, fontWeight:800, color:'var(--accent)'}}>{confidence.overall}%</span></div>
          <div style={{fontSize:12, color:'var(--text-2)', marginTop:6}}>{confidence.explanation}</div>
          <div style={{marginTop:8, fontSize:11, color:'var(--warn)', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', padding:'8px 10px', borderRadius:8}}>{confidence.uncertainty}</div>
        </div>
      </div>
    </Panel>}

    {tab==='timeline' && <Panel title="Timeline & Audit">
      <div style={{display:'grid', gap:8}}>
        {[
          {t:'2026-01-10 08:00', title:'Domain registered: darkweb-market.xyz', src:'synthetic_osint'},
          {t:'2026-01-12 10:00', title:'Document created: doc_shadow_001.txt', src:'artifact_ingestion'},
          {t:'2026-01-13 14:30', title:'Document created: doc_shadow_002.txt', src:'artifact_ingestion'},
          {t:'2026-01-15 02:30', title:'ETH transfer 2.5 ETH', src:'synthetic_blockchain'},
          {t:'2026-01-15 08:00', title:'IP observed: 192.168.1.100', src:'technical_fingerprint'},
        ].map(e=>(
          <div key={e.title} style={{display:'flex', gap:10, padding:'10px 12px', background:'var(--bg-soft)', border:'1px solid var(--border)', borderRadius:8}}>
            <span className="mono" style={{fontSize:11, color:'var(--accent)', fontWeight:700, whiteSpace:'nowrap'}}>{e.t}</span>
            <span style={{fontWeight:600}}>{e.title}</span>
            <Badge tone="neutral">{e.src}</Badge>
          </div>
        ))}
      </div>
    </Panel>}

    {tab==='review' && <Panel title="Review Queue — Investigator Verification">
      <div style={{display:'grid', gap:8}}>
        {[
          {id:'REV-001', label:'ShadowBroker ↔ darkweb-market.xyz', conf:80, type:'DOMAIN_ASSOCIATION'},
          {id:'REV-002', label:'doc_shadow_001 ↔ doc_shadow_002', conf:84, type:'WRITING_SIMILARITY'},
          {id:'REV-003', label:'0x742d…b8D4 cluster', conf:75, type:'WALLET_TRANSACTION'},
        ].map(r=>(
          <div key={r.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--bg-soft)', border:'1px solid var(--border)', borderRadius:8, padding:'12px 14px'}}>
            <div><div style={{fontWeight:700}}>{r.label} <Badge tone="info">{r.type}</Badge></div><div className="mono" style={{fontSize:11, color:'var(--text-3)'}}>{r.id} • Confidence {r.conf}%</div></div>
            <div style={{display:'flex', gap:6}}>
              <button className="btn btn-sm" style={{background:'#10b981', color:'white', borderColor:'rgba(16,185,129,0.4)'}} onClick={()=>push('Lead confirmed — audit logged','success')}>Confirm Lead</button>
              <button className="btn btn-sm" style={{background:'#ef4444', color:'white'}} onClick={()=>push('Lead rejected — marked for exclusion','info')}>Reject Lead</button>
              <button className="btn btn-sm" onClick={()=>push('Marked requires more evidence','warn')}>Requires More Evidence</button>
            </div>
          </div>
        ))}
      </div>
    </Panel>}
  </div>
}
