import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { clearSession, getStoredSession, login, type StoredSession } from './services/api'

interface AuthContextValue {
  session: StoredSession | null
  isAuthenticated: boolean
  signIn: (investigatorId: string, passphrase: string) => Promise<StoredSession>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(() => getStoredSession())

  useEffect(() => {
    const syncSession = () => setSession(getStoredSession())
    window.addEventListener('dt-session-changed', syncSession)
    return () => window.removeEventListener('dt-session-changed', syncSession)
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    isAuthenticated: Boolean(session?.token),
    signIn: async (investigatorId, passphrase) => {
      const next = await login(investigatorId, passphrase)
      setSession(next)
      return next
    },
    signOut: () => {
      clearSession()
      setSession(null)
    },
  }), [session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
