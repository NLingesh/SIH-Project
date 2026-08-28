import React, { createContext, useCallback, useContext, useState } from 'react'

type ToastTone = 'info' | 'success' | 'warn' | 'danger' | 'error'
type Toast = { id: number; msg: string; tone: ToastTone; createdAt: number }
type ToastContext = { push: (msg: string, tone?: ToastTone) => void; dismiss: (id: number) => void }
const Ctx = createContext<ToastContext | null>(null)
const toneLabel: Record<ToastTone, string> = { info: 'Info', success: 'Success', warn: 'Attention', danger: 'Error', error: 'Error' }

export function useToast() { const value = useContext(Ctx); if (!value) throw new Error('useToast must be used within ToastProvider'); return value }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const dismiss = useCallback((id: number) => setItems(current => current.filter(item => item.id !== id)), [])
  const push = useCallback((msg: string, tone: ToastTone = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setItems(current => [...current, { id, msg, tone, createdAt: Date.now() }].slice(-4))
    window.setTimeout(() => dismiss(id), tone === 'danger' || tone === 'error' ? 5000 : 3500)
  }, [dismiss])
  return <Ctx.Provider value={{ push, dismiss }}>{children}<div className="toast-stack" aria-live="polite" aria-atomic="false">{items.map(item => <div key={item.id} className="toast" role={item.tone === 'danger' || item.tone === 'error' ? 'alert' : 'status'} style={{ borderLeftColor: item.tone === 'success' ? 'var(--success)' : item.tone === 'warn' ? 'var(--warn)' : item.tone === 'danger' || item.tone === 'error' ? 'var(--danger)' : 'var(--accent)' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}><div><div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: item.tone === 'success' ? 'var(--success)' : item.tone === 'warn' ? 'var(--warn)' : item.tone === 'danger' || item.tone === 'error' ? 'var(--danger)' : 'var(--accent)' }}>{toneLabel[item.tone].toUpperCase()}</div><div style={{ fontWeight: 600, fontSize: 12, marginTop: 3 }}>{item.msg}</div></div><button className="btn btn-ghost btn-icon" aria-label="Dismiss notification" onClick={() => dismiss(item.id)} style={{ width: 24, height: 24, fontSize: 14 }}>×</button></div><div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 7 }}>DARKTRACE ATLAS • {new Date(item.createdAt).toLocaleTimeString()}</div></div>)}</div></Ctx.Provider>
}
