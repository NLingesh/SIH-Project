import React from 'react'

interface State { hasError: boolean; message: string }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false, message: '' }
  static getDerivedStateFromError(error: unknown): State { return { hasError: true, message: error instanceof Error ? error.message : 'Unexpected application error.' } }
  render() {
    if (!this.state.hasError) return this.props.children
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, background: 'var(--bg-0)', color: 'var(--text-1)' }}><div className="panel" style={{ width: 'min(560px, 100%)', padding: 24 }} role="alert"><div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--danger)' }}>ATLAS RECOVERY MODE</div><h1 style={{ fontSize: 22, margin: '8px 0' }}>The workstation hit an unexpected error.</h1><p style={{ color: 'var(--text-2)', fontSize: 13 }}>Your backend data is safe. Restart the view and retry the last action.</p><pre style={{ whiteSpace: 'pre-wrap', color: 'var(--text-3)', fontSize: 11, background: 'var(--bg-soft)', padding: 10, borderRadius: 8 }}>{this.state.message}</pre><div style={{ display: 'flex', gap: 8 }}><button className="btn btn-primary" onClick={() => window.location.reload()}>Reload workstation</button><button className="btn" onClick={() => this.setState({ hasError: false, message: '' })}>Try again</button></div></div></div>
  }
}
