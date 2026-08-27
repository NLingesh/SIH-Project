export const fmtDate = (iso:string) => {
  try{ return new Date(iso).toLocaleString('en-GB', { dateStyle:'medium', timeStyle:'short'})} catch{ return iso}
}
export const truncateHash = (h:string) => h.length>16 ? h.slice(0,8)+'…'+h.slice(-6) : h
export const pctColor = (v:number) => v>=80 ? 'var(--success)' : v>=60 ? 'var(--warn)' : 'var(--danger)'
export const statusBadge = (s:string) => {
  const map:Record<string,{bg:string,fg:string,border:string}> = {
    active:{bg:'rgba(16,185,129,0.12)',fg:'#10b981',border:'rgba(16,185,129,0.25)'},
    open:{bg:'rgba(59,130,246,0.12)',fg:'#60a5fa',border:'rgba(59,130,246,0.25)'},
    closed:{bg:'rgba(100,116,139,0.12)',fg:'#94a3b8',border:'rgba(100,116,139,0.25)'},
    archived:{bg:'rgba(71,85,105,0.12)',fg:'#64748b',border:'rgba(71,85,105,0.25)'},
    critical:{bg:'rgba(239,68,68,0.15)',fg:'#f87171',border:'rgba(239,68,68,0.3)'},
    high:{bg:'rgba(245,158,11,0.15)',fg:'#fbbf24',border:'rgba(245,158,11,0.3)'},
    medium:{bg:'rgba(59,130,246,0.15)',fg:'#93c5fd',border:'rgba(59,130,246,0.3)'},
    low:{bg:'rgba(148,163,184,0.15)',fg:'#cbd5e1',border:'rgba(148,163,184,0.25)'},
  }
  return map[s] || map.open
}
