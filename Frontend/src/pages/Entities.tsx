import { useMemo, useState } from 'react'
import { Panel } from '../components/common/Panel'
import { Badge } from '../components/common/Badge'
import { entities } from '../data/entities'
import { useToast } from '../components/common/Toast'

export function Entities(){
  const [q,setQ]=useState('')
  const [type,setType]=useState('all')
  const { push } = useToast()
  const filtered = useMemo(()=> entities.filter(e=>{
    if(type!=='all' && e.type!==type) return false
    if(q && !(e.label+e.entity_id+e.aliases.join(' ')).toLowerCase().includes(q.toLowerCase())) return false
    return true
  }),[q,type])

  return <div style={{display:'flex', flexDirection:'column', gap:14}}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12}}>
      <div>
        <div style={{fontSize:20, fontWeight:800}}>Entity Resolution</div>
        <div style={{fontSize:11, color:'var(--text-3)'}} className="mono">actor • alias • account • wallet • domain • IP • document • infrastructure • All associations are investigative leads</div>
      </div>
      <button className="btn btn-primary" onClick={()=>push('Entity creation requires authorization — demo mode','info')}>⊕ Resolve Entity</button>
    </div>

    <Panel noPadding>
      <div style={{padding:12, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', borderBottom:'1px solid var(--border)', background:'rgba(255,255,255,0.02)'}}>
        <div style={{position:'relative', flex:'1 1 260px', maxWidth:420}}>
          <span style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)'}}>⌕</span>
          <input className="input" placeholder="Search entity, alias, ID…" value={q} onChange={e=>setQ(e.target.value)} style={{paddingLeft:30}}/>
        </div>
        <select className="select" style={{width:180}} value={type} onChange={e=>setType(e.target.value)}>
          <option value="all">All types</option><option value="actor">Actor</option><option value="alias">Alias</option><option value="document">Document</option><option value="wallet">Wallet</option><option value="domain">Domain</option><option value="ip">IP</option><option value="infrastructure">Infrastructure</option>
        </select>
        <span className="kbd">{filtered.length} ENTITIES</span>
      </div>
      <div className="table-wrap" style={{border:'none', borderRadius:0}}>
        <table>
          <thead><tr><th>ENTITY ID</th><th>CANONICAL LABEL</th><th>TYPE</th><th>CONFIDENCE</th><th>ALIASES / ATTRIBUTES</th><th>STATUS</th></tr></thead>
          <tbody>
            {filtered.map(e=>(
              <tr key={e.entity_id}>
                <td className="mono" style={{fontSize:11, fontWeight:700, color:'var(--accent)'}}>{e.entity_id}</td>
                <td>
                  <div style={{fontWeight:700, display:'flex', gap:6, alignItems:'center'}}>{e.label} {e.is_synthetic && <Badge tone="neutral">SYNTHETIC</Badge>}</div>
                  <div className="mono" style={{fontSize:10, color:'var(--text-3)'}}>{e.case_id}</div>
                </td>
                <td><Badge tone="violet">{e.type}</Badge></td>
                <td><div style={{display:'flex', gap:6, alignItems:'center'}}><div className="progress-track" style={{width:72}}><div className="progress-fill" style={{width:`${e.confidence}%`, background: e.confidence>=70?'#10b981':'#f59e0b'}}/></div><span className="mono" style={{fontWeight:700}}>{e.confidence}%</span></div></td>
                <td className="mono" style={{fontSize:11}}>{e.aliases.join(', ') || (e.risk? `risk ${e.risk}`:'—')}</td>
                <td><Badge tone={e.confidence>=75?'success': e.confidence>=50?'warn':'danger'}>{e.confidence>=75?'INVESTIGATIVE LEAD': e.confidence>=50?'POTENTIAL ASSOCIATION':'REQUIRES REVIEW'}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{padding:10, fontSize:11, color:'var(--text-3)', borderTop:'1px solid var(--border)', background:'rgba(255,255,255,0.02)'}}>
        Do NOT display definitive criminal identity claims. All associations require corroboration and analyst verification.
      </div>
    </Panel>

    <div className="grid grid-2">
      <Panel title="Relationships — Sample">
        <div style={{display:'grid', gap:8}}>
          {[
            {a:'shadowbroker', rel:'ALIAS_REUSE', b:'shadow_broker', c:85},
            {a:'doc_shadow_001', rel:'WRITING_SIMILARITY', b:'doc_shadow_002', c:84},
            {a:'0x742d…b8D4', rel:'WALLET_TRANSACTION', b:'0x1234…7890', c:88},
            {a:'shadowbroker', rel:'DOMAIN_ASSOCIATION', b:'darkweb-market.xyz', c:90},
          ].map(r=>(
            <div key={r.a+r.b} style={{display:'flex', gap:8, alignItems:'center', background:'var(--bg-soft)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 10px', fontSize:11}}>
              <span className="mono" style={{fontWeight:700}}>{r.a}</span>
              <span style={{background:'var(--accent-dim)', border:'1px solid var(--accent-border)', padding:'2px 6px', borderRadius:99, color:'var(--accent)', fontWeight:700, fontSize:10}}>{r.rel}</span>
              <span className="mono" style={{fontWeight:700}}>{r.b}</span>
              <span style={{marginLeft:'auto', fontWeight:700, color:'var(--accent)'}}>{r.c}%</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Actions">
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <button className="btn btn-sm btn-primary" onClick={()=>push('Investigative lead confirmed — audit logged','success')}>Confirm Lead</button>
          <button className="btn btn-sm" onClick={()=>push('Marked requires more evidence','warn')}>Requires More Evidence</button>
          <button className="btn btn-sm btn-ghost" onClick={()=>push('Note added to entity','info')}>Add Note</button>
        </div>
        <div style={{marginTop:10, fontSize:11, color:'var(--text-3)'}}>“Confirm” means confirming an investigative lead, NOT legally proving identity. Every action is audited.</div>
      </Panel>
    </div>
  </div>
}
