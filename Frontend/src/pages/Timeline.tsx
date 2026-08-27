import { Panel } from '../components/common/Panel'
import { Badge } from '../components/common/Badge'
import { timeline } from '../data/entities'
import { auditEvents } from '../data/reports'

export function Timeline(){
  return <div style={{display:'flex', flexDirection:'column', gap:14}}>
    <div style={{fontSize:20, fontWeight:800}}>Timeline & Audit</div>
    <div className="grid" style={{gridTemplateColumns:'1.2fr 0.8fr'}}>
      <Panel title="Investigation Timeline" subtitle="— temporal correlation & event sequence">
        <div style={{position:'relative', paddingLeft:18}}>
          <div style={{position:'absolute', left:5, top:0, bottom:0, width:2, background:'var(--border)'}}/>
          <div style={{display:'grid', gap:12}}>
            {timeline.map(ev=>(
              <div key={ev.event_id} style={{display:'flex', gap:10, position:'relative'}}>
                <span style={{position:'absolute', left:-15, top:12, width:10, height:10, borderRadius:999, background:'var(--accent)', border:'2px solid var(--bg-panel)', boxShadow:'0 0 0 2px var(--accent-border)'}}/>
                <div style={{flex:1, background:'var(--bg-soft)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px'}}>
                  <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
                    <span className="mono" style={{fontWeight:700, fontSize:11, color:'var(--accent)'}}>{ev.timestamp}</span>
                    <Badge tone="info">{ev.type}</Badge>
                    <Badge tone="neutral">{ev.source}</Badge>
                  </div>
                  <div style={{fontWeight:700, marginTop:4}}>{ev.title}</div>
                  <div style={{fontSize:11, color:'var(--text-3)'}}>{ev.description} {ev.evidence_ids && <span className="mono" style={{color:'var(--accent)'}}>• {ev.evidence_ids}</span>}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{marginTop:12, background:'var(--accent-dim)', border:'1px solid var(--accent-border)', padding:'8px 10px', borderRadius:8, fontSize:11, color:'var(--text-2)'}}>
          Temporal score 81 — 48h window overlap between document creation and wallet transaction. Proximity ≠ causation; time zones normalized to UTC.
        </div>
      </Panel>

      <Panel title="Audit Log" actions={<Badge tone="neutral">AUDITED</Badge>}>
        <div style={{display:'grid', gap:8}}>
          {auditEvents.map(a=>(
            <div key={a.event_id} style={{background:'var(--bg-soft)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px'}}>
              <div style={{display:'flex', gap:8, alignItems:'center'}}>
                <span className="mono" style={{fontSize:11, fontWeight:700, color:'var(--text-2)'}}>{a.timestamp}</span>
                <Badge tone="violet">{a.type}</Badge>
              </div>
              <div style={{fontWeight:600, marginTop:4}}>{a.title}</div>
              <div style={{fontSize:11, color:'var(--text-3)'}}>{a.description} • {a.source}</div>
            </div>
          ))}
          <div style={{fontSize:11, color:'var(--text-3)'}}>All case views, analyses, reviews and exports are audit-logged with user ID, IP and timestamp per AUTH references.</div>
        </div>
      </Panel>
    </div>
  </div>
}
