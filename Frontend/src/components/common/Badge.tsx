import React from 'react'

export function Badge({ children, tone='neutral', dot, style }: { children: React.ReactNode; tone?: 'neutral'|'success'|'warn'|'danger'|'info'|'violet'; dot?:string; style?:React.CSSProperties }){
  const map:any={
    neutral:{background:'rgba(148,163,184,0.1)', color:'#94a3b8', border:'1px solid rgba(148,163,184,0.2)'},
    success:{background:'rgba(16,185,129,0.12)', color:'#10b981', border:'1px solid rgba(16,185,129,0.25)'},
    warn:{background:'rgba(245,158,11,0.12)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.25)'},
    danger:{background:'rgba(239,68,68,0.12)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.25)'},
    info:{background:'rgba(59,130,246,0.12)', color:'#60a5fa', border:'1px solid rgba(59,130,246,0.25)'},
    violet:{background:'rgba(139,92,246,0.12)', color:'#8b5cf6', border:'1px solid rgba(139,92,246,0.25)'},
  }
  return <span className="badge" style={{...map[tone], ...style}}>{dot && <span className="badge-dot" style={{background:dot}}/>}{children}</span>
}
