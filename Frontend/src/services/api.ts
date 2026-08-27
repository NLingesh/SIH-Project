// Service layer ready for REST API integration
// Replace mock imports with fetch calls to VITE_API_URL.
// All services return Promises matching backend schemas per docs/FRONTEND_BACKEND_MAPPING.md
const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api/v1'

async function api<T>(path:string, opts: RequestInit = {}): Promise<T>{
  const token = localStorage.getItem('dt_token')
  const headers: Record<string,string> = { 'Content-Type':'application/json', ...(opts.headers as any) }
  if(token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers })
  if(!res.ok) throw new Error((await res.json().catch(()=>({}))).error?.message || res.statusText)
  return res.json()
}

// mock fallback wrappers — for now they just return mock data
// when backend is available, uncomment api() calls
export { api, API_BASE }
