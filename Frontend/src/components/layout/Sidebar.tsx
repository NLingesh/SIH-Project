import React from 'react'
import { NavLink } from 'react-router-dom'

const Section = ({ title, children }: { title:string; children:React.ReactNode }) => (
  <div style={{marginBottom:18}}>
    <div style={{fontSize:10, letterSpacing:'0.1em', fontWeight:700, color:'var(--text-3)', padding:'0 16px 8px', textTransform:'uppercase'}}>{title}</div>
    <div style={{display:'flex', flexDirection:'column', gap:2}}>{children}</div>
  </div>
)

const Item = ({ to, icon, label, badge, end }: { to:string; icon:string; label:string; badge?:number|string; end?:boolean }) => (
  <NavLink to={to} end={end} style={({isActive})=> ({
    display:'flex', alignItems:'center', gap:10, padding:'8px 12px', margin:'0 8px', borderRadius:8,
    fontSize:12, fontWeight:isActive?700:500, letterSpacing:'0.02em',
    background: isActive ? 'rgba(34,211,238,0.10)' : 'transparent',
    border: isActive ? '1px solid rgba(34,211,238,0.2)' : '1px solid transparent',
    color: isActive ? 'var(--text-1)' : 'var(--text-2)',
  })}>
    <span style={{width:18, textAlign:'center', fontSize:13}}>{icon}</span>
    <span style={{flex:1}}>{label}</span>
    {badge!==undefined && <span style={{fontSize:10, fontWeight:700, background:'var(--bg-elevated)', border:'1px solid var(--border)', padding:'2px 6px', borderRadius:99, color:'var(--text-2)'}}>{badge}</span>}
  </NavLink>
)

export function Sidebar({ collapsed, onToggle }: { collapsed:boolean; onToggle:()=>void }){
  if(collapsed) return null
  return <aside style={{
    width:260, minWidth:260, background:'linear-gradient(180deg, #0a0f1e 0%, #0d1528 100%)',
    borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', height:'100vh', position:'sticky', top:0, overflow:'hidden'
  }}>
    <div style={{padding:'18px 16px 14px', borderBottom:'1px solid var(--border)', background:'rgba(255,255,255,0.02)'}}>
      <div style={{display:'flex', alignItems:'center', gap:10}}>
        <div style={{width:34, height:34, borderRadius:8, background:'linear-gradient(135deg,#06b6d4,#3b82f6)', display:'grid', placeItems:'center', fontWeight:800, fontSize:12, color:'white', letterSpacing:'0.06em'}}>AT</div>
        <div>
          <div style={{fontWeight:800, fontSize:13, letterSpacing:'0.08em', lineHeight:1}}>DARKTRACE <span style={{color:'var(--accent)'}}>AI</span></div>
          <div style={{fontSize:10, letterSpacing:'0.14em', color:'var(--text-3)', fontWeight:700}}>ATLAS • INVESTIGATOR WORKSTATION</div>
        </div>
      </div>
      <div style={{marginTop:12, display:'flex', gap:6}}>
        <span style={{fontSize:10, fontWeight:700, letterSpacing:'0.06em', background:'var(--accent-dim)', border:'1px solid var(--accent-border)', color:'var(--accent)', padding:'3px 8px', borderRadius:99}}>CLEARANCE L3</span>
        <span style={{fontSize:10, fontWeight:700, letterSpacing:'0.06em', background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)', color:'#10b981', padding:'3px 8px', borderRadius:99, display:'inline-flex', gap:4, alignItems:'center'}}><span style={{width:6,height:6,borderRadius:'50%',background:'#10b981'}}/>SYSTEM OPERATIONAL</span>
      </div>
    </div>

    <div style={{flex:1, overflowY:'auto', padding:'14px 0'}} className="no-scrollbar">
      <Section title="Investigation">
        <Item to="/" icon="◈" label="Investigator Console" end />
        <Item to="/cases" icon="▭" label="Active Cases" badge={8} />
        <Item to="/workspace" icon="◎" label="Workspace" />
        <Item to="/evidence" icon="⬢" label="Evidence Explorer" />
        <Item to="/intelligence" icon="⬣" label="Intelligence Collection" />
      </Section>
      <Section title="Analysis">
        <Item to="/analysis" icon="⬔" label="Signal Analysis" />
        <Item to="/entities" icon="⬙" label="Entity Resolution" badge={10} />
        <Item to="/graph" icon="⬡" label="Relationship Graph" />
        <Item to="/confidence" icon="◐" label="Confidence Breakdown" />
      </Section>
      <Section title="Operations">
        <Item to="/review" icon="⧉" label="Review Queue" badge={4} />
        <Item to="/reports" icon="▤" label="Reports" />
        <Item to="/timeline" icon="◷" label="Timeline & Audit" />
      </Section>
    </div>

    <div style={{padding:12, borderTop:'1px solid var(--border)', background:'rgba(255,255,255,0.02)'}}>
      <div style={{display:'flex', gap:10, alignItems:'center', background:'var(--bg-soft)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px'}}>
        <div style={{width:32,height:32, borderRadius:999, background:'#1e293b', display:'grid', placeItems:'center', fontWeight:700, color:'var(--accent)', border:'1px solid var(--border)'}}>AS</div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontWeight:700, fontSize:12, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>A. Sharma</div>
          <div style={{fontSize:11, color:'var(--text-3)', fontFamily:'var(--mono)'}}>INV-DEMO-001</div>
        </div>
        <span style={{fontSize:10, background:'var(--bg-elevated)', border:'1px solid var(--border)', padding:'2px 6px', borderRadius:99, color:'var(--text-3)'}}>○</span>
      </div>
      <div style={{marginTop:8, fontSize:10, color:'var(--text-3)', textAlign:'center', letterSpacing:'0.04em'}}>SYNTHETIC / DEMONSTRATION DATA</div>
    </div>
  </aside>
}
