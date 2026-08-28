import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth'
import { Shell } from './components/layout/Shell'
import { ToastProvider } from './components/common/Toast'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { Dashboard } from './pages/Dashboard'
import { Cases } from './pages/Cases'
import { Workspace } from './pages/Workspace'
import { Evidence } from './pages/Evidence'
import { Intelligence } from './pages/Intelligence'
import { Analysis } from './pages/Analysis'
import { Entities } from './pages/Entities'
import { Graph } from './pages/Graph'
import { Confidence } from './pages/Confidence'
import { Review } from './pages/Review'
import { Reports } from './pages/Reports'
import { Timeline } from './pages/Timeline'
import { Login } from './pages/Login'

function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RoutedApp() {
  const location = useLocation()
  const caseContext = new URLSearchParams(location.search).get('case') || undefined
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={
        <Protected>
          <Shell caseContext={caseContext} onSearch={() => undefined}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/cases" element={<Cases />} />
              <Route path="/workspace" element={<Workspace />} />
              <Route path="/evidence" element={<Evidence />} />
              <Route path="/intelligence" element={<Intelligence />} />
              <Route path="/analysis" element={<Analysis />} />
              <Route path="/entities" element={<Entities />} />
              <Route path="/graph" element={<Graph />} />
              <Route path="/confidence" element={<Confidence />} />
              <Route path="/review" element={<Review />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/timeline" element={<Timeline />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Shell>
        </Protected>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ErrorBoundary>
            <RoutedApp />
          </ErrorBoundary>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
