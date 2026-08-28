import React, { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function Shell({ children, caseContext, onSearch }: { children: React.ReactNode; caseContext?: string; onSearch: (v: string) => void }) {
  const [collapsed, setCollapsed] = useState(false)
  const toggle = () => setCollapsed(value => !value)
  return <div className="app-shell"><Sidebar collapsed={collapsed} onToggle={toggle} />{!collapsed && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={toggle} /> }<div className="app-column"><Header onMenu={toggle} caseContext={caseContext} onSearch={onSearch} /><main className="app-main">{children}</main><footer className="app-footer"><span className="mono">ATLAS v1.0.0 • AUTHENTICATED WORKSTATION • Synthetic dataset</span><span>© 2026 DARKTRACE AI</span></footer></div></div>
}
