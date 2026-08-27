import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Shell } from './components/layout/Shell'
import { ToastProvider } from './components/common/Toast'
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
import { useState } from 'react'

function Protected({ children }: { children:React.ReactNode }){
  const token = typeof localStorage!=='undefined' ? localStorage.getItem('dt_token') : null
  if(!token) return <Login/>
  return <>{children}</>
}

export default function App(){
  const [search,setSearch]=useState('')
  // keep search state if needed
  void search
  return <ToastProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login/>}/>
        <Route path="/*" element={
          <Protected>
            <Shell caseContext="CASE-2026-001 • AUTH-2026-SYN-001" onSearch={setSearch}>
              <Routes>
                <Route path="/" element={<Dashboard/>}/>
                <Route path="/cases" element={<Cases/>}/>
                <Route path="/workspace" element={<Workspace/>}/>
                <Route path="/evidence" element={<Evidence/>}/>
                <Route path="/intelligence" element={<Intelligence/>}/>
                <Route path="/analysis" element={<Analysis/>}/>
                <Route path="/entities" element={<Entities/>}/>
                <Route path="/graph" element={<Graph/>}/>
                <Route path="/confidence" element={<Confidence/>}/>
                <Route path="/review" element={<Review/>}/>
                <Route path="/reports" element={<Reports/>}/>
                <Route path="/timeline" element={<Timeline/>}/>
                <Route path="*" element={<Navigate to="/" replace/>}/>
              </Routes>
            </Shell>
          </Protected>
        }/>
      </Routes>
    </BrowserRouter>
  </ToastProvider>
}
