import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/common/Toast'

export function Login(){
  const [id,setId]=useState('INV-DEMO-001')
  const [pw,setPw]=useState('demo-passphrase-2026')
  const nav=useNavigate()
  const { push }=useToast()
  const submit=(e:React.FormEvent)=>{
    e.preventDefault()
    if(id && pw){
      localStorage.setItem('dt_token','demo-token')
      push(`Authenticated — clearance L3 — ${id}`,'success')
      nav('/')
    }
  }
  return <div style={{minHeight:'100vh', display:'grid', placeItems:'center', background:'radial-gradient(800px 600px at 50% 30%, rgba(34,211,238,0.08), transparent 60%), var(--bg-0)', padding:16}}>
    <form onSubmit={submit} className="panel" style={{width:'min(420px, 100%)', padding:24}}>
      <div style={{textAlign:'center', marginBottom:16}}>
        <div style={{width:48,height:48, borderRadius:12, background:'linear-gradient(135deg,#06b6d4,#3b82f6)', display:'grid', placeItems:'center', margin:'0 auto', fontWeight:800, color:'white'}}>AT</div>
        <div style={{fontWeight:800, fontSize:16, marginTop:8, letterSpacing:'0.08em'}}>DARKTRACE AI / ATLAS</div>
        <div style={{fontSize:11, letterSpacing:'0.12em', color:'var(--text-3)', fontWeight:700}}>INVESTIGATOR AUTHENTICATION</div>
      </div>
      <div style={{display:'grid', gap:10}}>
        <label style={{fontSize:11, fontWeight:700, letterSpacing:'0.06em', color:'var(--text-2)'}}>INVESTIGATOR ID
          <input className="input" value={id} onChange={e=>setId(e.target.value)} placeholder="INV-DEMO-001" style={{marginTop:6}}/>
        </label>
        <label style={{fontSize:11, fontWeight:700, letterSpacing:'0.06em', color:'var(--text-2)'}}>SECURITY PASSPHRASE
          <input className="input" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" style={{marginTop:6}}/>
        </label>
        <button className="btn btn-primary" type="submit" style={{marginTop:6}}>Authenticate →</button>
        <div className="mono" style={{fontSize:11, color:'var(--text-3)', textAlign:'center', background:'var(--bg-soft)', border:'1px solid var(--border)', padding:'8px 10px', borderRadius:8}}>
          Demo: INV-DEMO-001 / demo-passphrase-2026<br/>SYNTHETIC / DEMONSTRATION DATA
        </div>
      </div>
    </form>
  </div>
}
