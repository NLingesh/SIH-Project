import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth'

export function Header({ onMenu, caseContext, onSearch }: { onMenu: () => void; caseContext?: string; onSearch: (v: string) => void }) {
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const loc = useLocation()
  const { session, signOut } = useAuth()
  const crumbs = loc.pathname.split('/').filter(Boolean)
  const investigator = session?.investigator
  const name = investigator?.full_name || investigator?.investigator_id || 'Investigator'
  const initials = name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()

  const logout = () => {
    signOut()
    nav('/login', { replace: true })
  }

  return <header style={{ height: 56, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', background: 'rgba(10,15,30,0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 20 }}>
    <button onClick={onMenu} className="btn btn-ghost btn-icon mobile-menu-button" aria-label="Open navigation">☰</button>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)' }} className="mono">
        <span style={{ color: 'var(--text-2)' }}>DARKTRACE</span> <span>/</span> <span style={{ color: 'var(--accent)' }}>{crumbs[0]?.toUpperCase() || 'CONSOLE'}</span>
        {caseContext && <span style={{ marginLeft: 8, background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>{caseContext}</span>}
      </div>
    </div>

    <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 'min(520px, 100%)' }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}>⌕</span>
        <input className="input" placeholder="Search cases, entities, artifacts, wallets…" value={q}
          onChange={event => setQ(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter' && q.trim()) { onSearch(q.trim()); nav(`/cases?search=${encodeURIComponent(q.trim())}`) } }}
          style={{ paddingLeft: 32, height: 34, background: 'var(--bg-soft)' }} />
        <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--text-3)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: 6 }}>↵</span>
      </div>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 999, padding: '6px 10px' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.6)' }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-2)' }}>SESSION: AUTHENTICATED</span>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
      <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button className="btn btn-ghost btn-sm header-cases-button" onClick={() => nav('/cases')}>Cases</button>
      <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
          <div style={{ fontWeight: 700, fontSize: 12 }}>{name}</div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em' }}>CLEARANCE L{session?.clearance_level ?? investigator?.clearance_level ?? '?'}</div>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: 999, background: 'linear-gradient(135deg,#0ea5e9,#22d3ee)', display: 'grid', placeItems: 'center', fontWeight: 800, color: 'white' }}>{initials}</div>
      </div>
    </div>
  </header>
}
