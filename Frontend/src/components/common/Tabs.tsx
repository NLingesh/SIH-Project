import React from 'react'

export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string; count?: number }[]; active: string; onChange: (id: string) => void }) {
  return <div className="tab-strip" role="tablist" aria-label="Workspace sections">{tabs.map(tab => <button key={tab.id} type="button" role="tab" aria-selected={active === tab.id} className={`tab-button ${active === tab.id ? 'tab-button-active' : ''}`} onClick={() => onChange(tab.id)}>{tab.label}{tab.count !== undefined && <span className="tab-count">{tab.count}</span>}</button>)}</div>
}
