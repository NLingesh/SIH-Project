import { useEffect, useRef, useState } from 'react'
import { Panel } from '../components/common/Panel'
import { Badge } from '../components/common/Badge'
import { graphNodes, graphEdges } from '../data/graph'
import { useToast } from '../components/common/Toast'

type Node = typeof graphNodes[number] & {x:number; y:number}

const typeColor:Record<string,string>={
  actor:'#22d3ee', alias:'#38bdf8', document:'#a78bfa', wallet:'#f59e0b', domain:'#10b981', ip:'#ef4444', infrastructure:'#8b5cf6'
}

export function Graph(){
  const svgRef = useRef<SVGSVGElement|null>(null)
  const [selected,setSelected]=useState<string | null>(null)
  const [filter,setFilter]=useState<string>('all')
  const [zoom,setZoom]=useState(1)
  const [pan,setPan]=useState({x:0,y:0})
  const [drag,setDrag]=useState<{id:string|null, offset:{x:number,y:number}}|null>(null)
  const { push } = useToast()

  // initial layout — circular + random
  const [nodes,setNodes]=useState<Node[]>(()=> graphNodes.map((n,i)=>{
    const angle = (i/graphNodes.length)*Math.PI*2
    const r = 180
    return {...n, x: 350 + Math.cos(angle)*r, y: 250 + Math.sin(angle)*r}
  }))

  const edges = graphEdges.filter(e=> filter==='all' || e.type===filter)

  const onWheel = (e:React.WheelEvent)=> {
    e.preventDefault()
    const delta = e.deltaY>0? 0.9 : 1.1
    setZoom(z=> Math.min(2.5, Math.max(0.4, z*delta)))
  }
  const onMouseDown = (e:React.MouseEvent, id:string)=>{
    const n = nodes.find(x=>x.id===id)!
    const rect = (e.currentTarget as any).getBoundingClientRect()
    const scale = zoom
    setDrag({id, offset:{x: e.clientX - (n.x*scale + pan.x), y: e.clientY - (n.y*scale + pan.y)}})
  }
  useEffect(()=>{
    const move=(e:MouseEvent)=>{
      if(!drag?.id) return
      setNodes(ns=> ns.map(n=> n.id===drag.id ? {...n, x: (e.clientX - drag.offset.x - pan.x)/zoom, y: (e.clientY - drag.offset.y - pan.y)/zoom } : n))
    }
    const up=()=> setDrag(null)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return ()=>{ window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up)}
  },[drag, pan, zoom])

  // panning svg background drag
  const [isPanning,setIsPanning]=useState(false)
  const [panStart,setPanStart]=useState({x:0,y:0})

  return <div style={{display:'flex', flexDirection:'column', gap:14}}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12}}>
      <div>
        <div style={{fontSize:20, fontWeight:800}}>Relationship Graph — Interactive</div>
        <div className="mono" style={{fontSize:11, color:'var(--text-3)'}}>Pan • Zoom • Node selection • Edge hover • Filtering — Synthetic demonstration</div>
      </div>
      <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
        <select className="select" style={{width:200}} value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="all">All relationships</option>
          <option value="ALIAS_REUSE">Alias reuse</option>
          <option value="WRITING_SIMILARITY">Writing similarity</option>
          <option value="WALLET_TRANSACTION">Wallet transaction</option>
          <option value="DOMAIN_ASSOCIATION">Domain association</option>
          <option value="INFRASTRUCTURE_OVERLAP">Infrastructure overlap</option>
          <option value="TEMPORAL_CORRELATION">Temporal correlation</option>
        </select>
        <button className="btn btn-sm" onClick={()=>{setZoom(1); setPan({x:0,y:0})}}>Reset view</button>
        <button className="btn btn-sm btn-ghost" onClick={()=>push('Graph exported as JSON — synthetic data','success')}>Export</button>
      </div>
    </div>

    <div className="grid" style={{gridTemplateColumns:'1fr 320px'}}>
      <Panel noPadding>
        <div style={{position:'relative', height:560, overflow:'hidden', background:'radial-gradient(800px 400px at 40% 30%, rgba(34,211,238,0.08), transparent 60%), var(--bg-soft)'}} onWheel={onWheel}
          onMouseDown={e=>{
            if((e.target as HTMLElement).tagName==='svg'){
              setIsPanning(true); setPanStart({x:e.clientX - pan.x, y:e.clientY - pan.y})
            }
          }}
          onMouseMove={e=>{
            if(isPanning){ setPan({x:e.clientX - panStart.x, y:e.clientY - panStart.y}) }
          }}
          onMouseUp={()=>setIsPanning(false)}
          onMouseLeave={()=>setIsPanning(false)}
        >
          <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 700 500" style={{cursor: isPanning?'grabbing':'grab'}}>
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {/* edges */}
              {edges.map(ed=>{
                const s = nodes.find(n=>n.id===ed.source)!
                const t = nodes.find(n=>n.id===ed.target)!
                if(!s||!t) return null
                const selectedEdge = selected===ed.id
                return <g key={ed.id} onClick={()=>{setSelected(ed.id); push(`Edge ${ed.type} — confidence ${ed.confidence}%`,'info')}} style={{cursor:'pointer'}}>
                  <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke={selectedEdge?'var(--accent)': 'rgba(148,163,184,0.35)'} strokeWidth={selectedEdge?2.5:1.4} strokeDasharray={ed.type==='NO_LINK'?'6 6':undefined}/>
                  {/* label */}
                  <text x={(s.x+t.x)/2} y={(s.y+t.y)/2 - 6} textAnchor="middle" fontSize="7" fontWeight="700" fill={selectedEdge?'var(--accent)':'var(--text-3)'} style={{paintOrder:'stroke', stroke:'var(--bg-soft)', strokeWidth:3}}>{ed.type}</text>
                  <text x={(s.x+t.x)/2} y={(s.y+t.y)/2 + 6} textAnchor="middle" fontSize="7" fill="var(--text-3)">{ed.confidence}%</text>
                </g>
              })}
              {/* nodes */}
              {nodes.map(n=>{
                const isSel = selected===n.id
                const col = typeColor[n.type] || '#94a3b8'
                return <g key={n.id} transform={`translate(${n.x},${n.y})`} onMouseDown={e=>onMouseDown(e,n.id)} onClick={()=>setSelected(n.id)} style={{cursor:'pointer'}}>
                  <circle r={isSel?26:22} fill={isSel? 'rgba(34,211,238,0.15)':'var(--bg-panel)'} stroke={isSel? 'var(--accent)': col} strokeWidth={isSel?2:1.6}/>
                  <circle r={18} fill={col} opacity={0.9}/>
                  <text textAnchor="middle" dy={4} fontSize="10" fontWeight="800" fill="white">{n.type==='wallet'?'₿': n.type==='domain'?'◈': n.type==='ip'?'⬢': n.type==='actor'?'◎': n.type==='alias'?'⬣':'▭'}</text>
                  <text y={34} textAnchor="middle" fontSize="8" fontWeight="700" fill={isSel?'var(--accent)':'var(--text-2)'} style={{paintOrder:'stroke', stroke:'var(--bg-soft)', strokeWidth:3}}>{n.label.length>18? n.label.slice(0,18)+'…':n.label}</text>
                  <text y={44} textAnchor="middle" fontSize="7" fill="var(--text-3)" className="mono">{n.type} • {n.confidence}%</text>
                </g>
              })}
            </g>
          </svg>
          <div style={{position:'absolute', left:12, bottom:12, display:'flex', gap:6, alignItems:'center', background:'var(--bg-panel)', border:'1px solid var(--border)', borderRadius:999, padding:'6px 10px'}}>
            <button className="btn btn-sm btn-ghost" style={{padding:'4px 8px'}} onClick={()=>setZoom(z=>Math.min(2.5,z*1.15))}>＋</button>
            <span className="mono" style={{fontSize:11, fontWeight:700}}>{Math.round(zoom*100)}%</span>
            <button className="btn btn-sm btn-ghost" style={{padding:'4px 8px'}} onClick={()=>setZoom(z=>Math.max(0.4,z*0.9))}>－</button>
            <span style={{width:1,height:16, background:'var(--border)'}}/>
            <span style={{fontSize:11, color:'var(--text-3)'}}>Drag node to reposition • Drag background to pan • Scroll to zoom</span>
          </div>
          <div style={{position:'absolute', right:12, top:12, background:'var(--bg-panel)', border:'1px solid var(--border)', borderRadius:10, padding:'8px 10px'}}>
            <div style={{fontSize:10, fontWeight:700, letterSpacing:'0.08em', color:'var(--text-3)'}}>LEGEND</div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:6}}>
              {Object.entries(typeColor).slice(0,6).map(([k,c])=>(
                <span key={k} style={{display:'flex', gap:6, alignItems:'center', fontSize:11}}><span style={{width:10,height:10, borderRadius:999, background:c}}/> {k}</span>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <div style={{display:'flex', flexDirection:'column', gap:14}}>
        <Panel title="Selection" actions={selected? <Badge tone="info">{selected}</Badge>:undefined}>
          {!selected ? <div style={{color:'var(--text-3)', fontSize:12}}>Select a node or edge to inspect evidence linkage.</div> :
            (()=> {
              const n = nodes.find(x=>x.id===selected)
              if(n) return <div style={{display:'grid', gap:8}}>
                <div style={{fontWeight:800}}>{n.label}</div>
                <div style={{display:'flex', gap:6}}><Badge tone="violet">{n.type}</Badge><Badge tone={n.confidence>=75?'success':'warn'}>{n.confidence}%</Badge></div>
                <div className="mono" style={{fontSize:11, color:'var(--text-3)'}}>ID {n.id}</div>
                <div style={{fontSize:11, color:'var(--text-2)'}}>Investigative lead — requires corroboration. Confidence reflects multi-signal support, not definitive identity.</div>
                <button className="btn btn-sm" onClick={()=>push(`Entity ${n.label} flagged for review`,'info')}>Flag for Review</button>
              </div>
              const e = graphEdges.find(x=>x.id===selected)
              if(e) return <div style={{display:'grid', gap:8}}>
                <div style={{fontWeight:800}}>{e.type}</div>
                <div className="mono" style={{fontSize:11}}>{e.source} → {e.target}</div>
                <Badge tone="info">{e.confidence}% confidence</Badge>
                <div style={{fontSize:11, color:'var(--text-2)'}}>Evidence: {e.evidence_ids.join(', ')}</div>
                <div style={{fontSize:11, color:'var(--text-3)'}}>Edge represents {e.type.toLowerCase().replace('_',' ')} — analyst must verify provenance.</div>
              </div>
              return <div>Unknown selection</div>
            })()
          }
        </Panel>

        <Panel title="Graph Filters">
          <div style={{display:'grid', gap:8}}>
            {[
              {k:'ALIAS_REUSE', v:85},
              {k:'WRITING_SIMILARITY', v:84},
              {k:'WALLET_TRANSACTION', v:88},
              {k:'DOMAIN_ASSOCIATION', v:90},
              {k:'INFRASTRUCTURE_OVERLAP', v:76},
              {k:'TEMPORAL_CORRELATION', v:81},
            ].map(f=>(
              <label key={f.k} style={{display:'flex', gap:8, alignItems:'center', background:'var(--bg-soft)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 10px', cursor:'pointer'}}>
                <input type="checkbox" checked={filter==='all' || filter===f.k} onChange={()=> setFilter(filter===f.k?'all':f.k)} />
                <span style={{flex:1, fontSize:11, fontWeight:700}}>{f.k}</span>
                <span className="mono" style={{fontSize:11, color:'var(--text-3)'}}>{f.v}%</span>
              </label>
            ))}
          </div>
        </Panel>

        <Panel title="Evidence Linkage">
          <div style={{fontSize:11, color:'var(--text-3)'}}>Every edge maps to evidence IDs. Click an edge to view supporting evidence and limitations.</div>
          <div style={{marginTop:8, display:'flex', gap:6, flexWrap:'wrap'}}>
            {graphEdges.slice(0,3).map(e=> <Badge key={e.id} tone="neutral">{e.evidence_ids[0]}</Badge>)}
          </div>
        </Panel>
      </div>
    </div>
  </div>
}
