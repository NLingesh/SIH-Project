import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/common/Toast'
import { useAuth } from '../auth'
import { ApiError } from '../services/api'

export function Login() {
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const nav = useNavigate()
  const { push } = useToast()
  const { signIn } = useAuth()

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (!id.trim() || !pw) {
      setError('Investigator ID and security passphrase are required.')
      return
    }

    setBusy(true)
    try {
      const session = await signIn(id.trim(), pw)
      const displayName = session.investigator.full_name || session.investigator.investigator_id
      push(`Authenticated as ${displayName} — clearance L${session.clearance_level}`, 'success')
      nav('/', { replace: true })
    } catch (cause) {
      const message = cause instanceof ApiError ? cause.message : 'Authentication failed. Please try again.'
      setError(message)
      push(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'radial-gradient(800px 600px at 50% 30%, rgba(34,211,238,0.08), transparent 60%), var(--bg-0)', padding: 16 }}>
    <form onSubmit={submit} className="panel" style={{ width: 'min(420px, 100%)', padding: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', display: 'grid', placeItems: 'center', margin: '0 auto', fontWeight: 800, color: 'white' }}>AT</div>
        <div style={{ fontWeight: 800, fontSize: 16, marginTop: 8, letterSpacing: '0.08em' }}>DARKTRACE AI / ATLAS</div>
        <div style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--text-3)', fontWeight: 700 }}>AUTHORIZED DEANONYMIZATION ACCESS</div>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-2)' }}>INVESTIGATOR ID
          <input className="input" value={id} onChange={event => setId(event.target.value)} autoComplete="username" placeholder="INV-DEMO-001" style={{ marginTop: 6 }} disabled={busy} />
        </label>
        <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-2)' }}>SECURITY PASSPHRASE
          <input className="input" type="password" value={pw} onChange={event => setPw(event.target.value)} autoComplete="current-password" placeholder="Enter your passphrase" style={{ marginTop: 6 }} disabled={busy} />
        </label>
        {error && <div role="alert" style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 8, padding: '9px 10px', fontSize: 11 }}>{error}</div>}
        <button className="btn btn-primary" type="submit" style={{ marginTop: 6 }} disabled={busy}>{busy ? 'Authenticating…' : 'Authenticate →'}</button>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', background: 'var(--bg-soft)', border: '1px solid var(--border)', padding: '8px 10px', borderRadius: 8 }}>
          Development account: INV-DEMO-001 / demo-passphrase-2026<br />Backend-authenticated synthetic dark-web attribution dataset
        </div>
      </div>
    </form>
  </div>
}
