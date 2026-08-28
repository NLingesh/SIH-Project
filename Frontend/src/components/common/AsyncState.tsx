export function LoadingState({ label = 'Loading live data…' }: { label?: string }) {
  return <div className="panel" style={{ padding: 24, color: 'var(--text-2)' }} role="status"><span className="mono">{label}</span></div>
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="panel" style={{ padding: 18, borderColor: 'rgba(239,68,68,0.4)' }} role="alert">
    <div style={{ fontWeight: 800, color: '#fca5a5' }}>Unable to load live data</div>
    <div style={{ color: 'var(--text-2)', fontSize: 12, marginTop: 6 }}>{message}</div>
    {onRetry && <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={onRetry}>Retry</button>}
  </div>
}

export function EmptyState({ label = 'No records found.' }: { label?: string }) {
  return <div style={{ padding: 24, color: 'var(--text-3)', textAlign: 'center' }}>{label}</div>
}
