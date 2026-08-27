import React, { createContext, useCallback, useContext, useState } from 'react'

type Toast={id:number; msg:string; tone?:string}
const Ctx = createContext<{push:(msg:string, tone?:string)=>void} | null>(null)
export function useToast(){ return useContext(Ctx)! }

export function ToastProvider({ children }: { children:React.ReactNode}){
  const [items,setItems]=useState<Toast[]>([])
  const push=useCallback((msg:string, tone='info')=>{
    const id=Date.now()+Math.random()
    setItems(s=>[...s,{id,msg,tone}])
    setTimeout(()=> setItems(s=>s.filter(x=>x.id!==id)), 3000)
  },[])
  return <Ctx.Provider value={{push}}>
    {children}
    <div className="toast-stack">
      {items.map(t=> <div key={t.id} className="toast" style={{borderLeftColor: t.tone==='success'?'var(--success)': t.tone==='warn'?'var(--warn)': t.tone==='danger'?'var(--danger)':'var(--accent)'}}>
        <div style={{fontWeight:600, fontSize:12}}>{t.msg}</div>
        <div style={{fontSize:11, color:'var(--text-3)'}}>DARKTRACE ATLAS • {new Date().toLocaleTimeString()}</div>
      </div>)}
    </div>
  </Ctx.Provider>
}
