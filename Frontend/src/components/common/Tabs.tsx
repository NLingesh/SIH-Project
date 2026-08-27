import React from 'react'
export function Tabs({ tabs, active, onChange }: { tabs:{id:string; label:string; count?:number}[]; active:string; onChange:(id:string)=>void }){
  return <div style={{display:'flex', gap:6, borderBottom:'1px solid var(--border)', paddingBottom:0, overflowX:'auto'}} className="no-scrollbar">
    {tabs.map(t=>(
      <button key={t.id} onClick={()=>onChange(t.id)}
        style={{
          padding:'10px 14px', border:'none', background:'transparent', cursor:'pointer',
          borderBottom: active===t.id ? '2px solid var(--accent)' : '2px solid transparent',
          color: active===t.id ? 'var(--text-1)' : 'var(--text-3)', fontWeight: active===t.id?700:500,
          fontSize:12, letterSpacing:'0.04em', textTransform:'uppercase', whiteSpace:'nowrap', marginBottom:-1
        }}>
        {t.label} {t.count!==undefined && <span style={{marginLeft:6, background:active===t.id?'var(--accent-dim)':'var(--bg-elevated)', border:'1px solid var(--border)', padding:'1px 6px', borderRadius:99, fontSize:10}}>{t.count}</span>}
      </button>
    ))}
  </div>
}
