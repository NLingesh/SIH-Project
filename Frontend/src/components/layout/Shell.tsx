import React, { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function Shell({ children, caseContext, onSearch }: { children:React.ReactNode; caseContext?:string; onSearch:(v:string)=>void }){
  const [collapsed,setCollapsed]=useState(false)
  return <div style={{display:'flex', minHeight:'100vh', background:'var(--bg-0)'}}>
    <Sidebar collapsed={collapsed} onToggle={()=>setCollapsed(!collapsed)} />
    <div style={{flex:1, minWidth:0, display:'flex', flexDirection:'column'}}>
      <Header onMenu={()=>setCollapsed(!collapsed)} caseContext={caseContext} onSearch={onSearch} />
      <main style={{padding:16, maxWidth:1600, width:'100%', margin:'0 auto'}}>{children}</main>
      <footer style={{padding:'14px 16px', borderTop:'1px solid var(--border)', color:'var(--text-3)', fontSize:11, display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8}}>
        <span className="mono">ATLAS v1.0.0 • SYNTHETIC / DEMONSTRATION DATA • All probabilistic findings require analyst verification</span>
        <span>© 2026 DARKTRACE AI — Investigator Workstation</span>
      </footer>
    </div>
  </div>
}
