import React from 'react'
export function Panel({ title, subtitle, actions, children, noPadding, style }: { title?:string; subtitle?:string; actions?:React.ReactNode; children:React.ReactNode; noPadding?:boolean; style?:React.CSSProperties }){
  return <div className="panel" style={style}>
    {title && <div className="panel-header">
      <div>
        <div className="panel-title"><span className="dot"/>{title} {subtitle && <span style={{fontWeight:400, color:'var(--text-3)', textTransform:'none', letterSpacing:0}}>{subtitle}</span>}</div>
      </div>
      <div style={{display:'flex', gap:8, alignItems:'center'}}>{actions}</div>
    </div>}
    <div style={{padding: noPadding ? 0 : '14px'}}>{children}</div>
  </div>
}
