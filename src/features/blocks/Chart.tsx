import { useId,useMemo,useState } from 'react'
import { Table2 } from 'lucide-react'
import type { Block } from './schema'
type ChartBlock=Extract<Block,{type:'chart'}>
// ADC categorical order (validated: lightness band, chroma, CVD adjacent ≥ 7 with secondary encoding, contrast ≥ 3:1).
export const SERIES=['#c2410c','#1d5fa8','#b7791f','#1a7f52','#7c3aed','#be185d']
const H={sm:220,md:300,lg:380},W=640,PAD={l:56,r:18,t:18,b:42}
function nice(max:number){if(max<=0)return 1;const p=Math.pow(10,Math.floor(Math.log10(max))),n=max/p;return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p}
export function fmt(n:number,lang:'fr'|'en',unit=''){const a=Math.abs(n);const s=a>=1e9?(n/1e9).toLocaleString(lang,{maximumFractionDigits:1})+(lang==='fr'?' Md':'B'):a>=1e6?(n/1e6).toLocaleString(lang,{maximumFractionDigits:1})+' M':a>=1e4?(n/1e3).toLocaleString(lang,{maximumFractionDigits:1})+(lang==='fr'?' k':'k'):n.toLocaleString(lang,{maximumFractionDigits:2});return unit?s+' '+unit:s}
function topRounded(x:number,y:number,w:number,h:number,r=4){if(h<=0)return '';const rr=Math.min(r,w/2,h);return `M${x},${y+h}V${y+rr}Q${x},${y} ${x+rr},${y}H${x+w-rr}Q${x+w},${y} ${x+w},${y+rr}V${y+h}Z`}
function rightRounded(x:number,y:number,w:number,h:number,r=4){if(w<=0)return '';const rr=Math.min(r,h/2,w);return `M${x},${y}H${x+w-rr}Q${x+w},${y} ${x+w},${y+rr}V${y+h-rr}Q${x+w},${y+h} ${x+w-rr},${y+h}H${x}Z`}
export function Chart({b,lang}:{b:ChartBlock;lang:'fr'|'en'}){
 const uid=useId().replace(/:/g,''),[hover,setHover]=useState<number|null>(null),[table,setTable]=useState(false)
 const series=b.series.map((s,i)=>({...s,color:SERIES[i%SERIES.length],values:b.labels.map((_,k)=>Number.isFinite(s.values[k])?s.values[k]:0)}))
 const h=H[b.height],innerW=W-PAD.l-PAD.r,innerH=h-PAD.t-PAD.b,n=b.labels.length
 const max=useMemo(()=>{if(b.kind==='stacked')return nice(Math.max(0,...b.labels.map((_,k)=>series.reduce((a,s)=>a+Math.max(0,s.values[k]),0))));return nice(Math.max(0,...series.flatMap(s=>s.values)))},[b,series])
 const ticks=[0,.25,.5,.75,1].map(f=>f*max),y=(v:number)=>PAD.t+innerH-(v/max)*innerH
 const legend=series.length>1||b.kind==='donut'
 const tip=hover!==null&&<div className="ch-tip" style={{left:`${b.kind==='hbar'?60:((PAD.l+(hover+.5)*innerW/n)/W)*100}%`,top:b.kind==='hbar'?`${((PAD.t+(hover+.5)*(innerH/n))/h)*100}%`:'8px'}} role="status"><strong>{b.labels[hover]}</strong>{(b.kind==='donut'?[series[0]]:series).map(s=>{const v=b.kind==='donut'?s.values[hover]:s.values[hover];return <span key={s.name}><i style={{background:b.kind==='donut'?SERIES[hover%SERIES.length]:s.color}}/>{b.kind!=='donut'&&series.length>1?s.name+' : ':''}<b>{fmt(v,lang,b.unit)}</b></span>})}</div>
 let plot:React.ReactNode=null
 if(b.kind==='bar'||b.kind==='stacked'){
  const band=innerW/n,groupW=band*.68,gap=2,barW=b.kind==='stacked'?groupW:(groupW-gap*(series.length-1))/series.length
  plot=<g>{b.labels.map((l,k)=>{let acc=0;return <g key={k} className={hover===null||hover===k?'':'ch-dim'}>{series.map((s,i)=>{const v=Math.max(0,s.values[k]);if(b.kind==='stacked'){const y0=y(acc),y1=y(acc+v);acc+=v;const last=i===series.length-1||series.slice(i+1).every(x=>x.values[k]<=0);return <path key={i} className="ch-bar" style={{animationDelay:k*40+'ms'}} d={last?topRounded(PAD.l+k*band+(band-groupW)/2,y1,groupW,Math.max(0,y0-y1-(i?gap:0))):`M${PAD.l+k*band+(band-groupW)/2},${y1}h${groupW}v${Math.max(0,y0-y1-(i?gap:0))}h${-groupW}Z`} fill={s.color}/>}
    const x=PAD.l+k*band+(band-groupW)/2+i*(barW+gap);return <path key={i} className="ch-bar" style={{animationDelay:k*40+i*20+'ms'}} d={topRounded(x,y(v),barW,innerH+PAD.t-y(v))} fill={s.color}/>})}
    {b.showValues&&b.kind==='bar'&&series.map((s,i)=>{const x=PAD.l+k*band+(band-groupW)/2+i*(barW+gap)+barW/2;return <text key={'v'+i} className="ch-val" x={x} y={y(Math.max(0,s.values[k]))-6} textAnchor="middle">{fmt(s.values[k],lang)}</text>})}
    {b.showValues&&b.kind==='stacked'&&<text className="ch-val" x={PAD.l+k*band+band/2} y={y(series.reduce((a,s)=>a+Math.max(0,s.values[k]),0))-6} textAnchor="middle">{fmt(series.reduce((a,s)=>a+s.values[k],0),lang)}</text>}
    <text className="ch-x" x={PAD.l+k*band+band/2} y={h-PAD.b+18} textAnchor="middle">{l}</text>
    <rect className="ch-hit" x={PAD.l+k*band} y={PAD.t} width={band} height={innerH} onMouseEnter={()=>setHover(k)} onMouseLeave={()=>setHover(null)} onFocus={()=>setHover(k)} onBlur={()=>setHover(null)} tabIndex={0} aria-label={l+' : '+series.map(s=>s.name+' '+fmt(s.values[k],lang,b.unit)).join(', ')}/></g>})}</g>
 }
 if(b.kind==='hbar'){
  const lw=120,band=innerH/n,groupH=band*.7,gap=2,barH=(groupH-gap*(series.length-1))/series.length,x=(v:number)=>PAD.l+lw-40+(v/max)*(innerW-lw+40-30)
  plot=<g>{b.labels.map((l,k)=><g key={k} className={hover===null||hover===k?'':'ch-dim'}><text className="ch-x" x={PAD.l+lw-48} y={PAD.t+k*band+band/2+4} textAnchor="end">{l.length>18?l.slice(0,17)+'…':l}</text>
   {series.map((s,i)=>{const yy=PAD.t+k*band+(band-groupH)/2+i*(barH+gap),v=Math.max(0,s.values[k]);return <g key={i}><path className="ch-bar h" style={{animationDelay:k*40+'ms'}} d={rightRounded(x(0),yy,x(v)-x(0),barH)} fill={s.color}/>{b.showValues&&<text className="ch-val" x={x(v)+6} y={yy+barH/2+4}>{fmt(s.values[k],lang)}</text>}</g>})}
   <rect className="ch-hit" x={PAD.l} y={PAD.t+k*band} width={innerW} height={band} onMouseEnter={()=>setHover(k)} onMouseLeave={()=>setHover(null)} onFocus={()=>setHover(k)} onBlur={()=>setHover(null)} tabIndex={0} aria-label={l}/></g>)}</g>
 }
 if(b.kind==='line'||b.kind==='area'){
  const step=n>1?innerW/(n-1):0,px=(k:number)=>PAD.l+(n>1?k*step:innerW/2)
  plot=<g>{series.map((s,i)=>{const pts=s.values.map((v,k)=>[px(k),y(Math.max(0,v))] as const);const d=pts.map((p,k)=>(k?'L':'M')+p[0]+','+p[1]).join('');return <g key={i}>
    {b.kind==='area'&&<path d={d+`L${pts[pts.length-1]![0]},${PAD.t+innerH}L${pts[0]![0]},${PAD.t+innerH}Z`} fill={`url(#g${uid}${i})`} className="ch-area"/>}
    <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="ch-line" pathLength={1}/>
    {pts.map((p,k)=><circle key={k} cx={p[0]} cy={p[1]} r={hover===k?5:3.5} fill={s.color} stroke="#fff" strokeWidth={2} className="ch-dot"/>)}
    {b.showValues&&pts.map((p,k)=><text key={'v'+k} className="ch-val" x={p[0]} y={p[1]-10} textAnchor="middle">{fmt(s.values[k],lang)}</text>)}
    {series.length>1&&series.length<=4&&!b.showValues&&<text className="ch-direct" x={pts[pts.length-1]![0]-4} y={pts[pts.length-1]![1]-10} textAnchor="end">{s.name}</text>}
   </g>})}
   {hover!==null&&<line x1={px(hover)} x2={px(hover)} y1={PAD.t} y2={PAD.t+innerH} className="ch-cross"/>}
   {b.labels.map((l,k)=><g key={k}><text className="ch-x" x={px(k)} y={h-PAD.b+18} textAnchor="middle">{l}</text><rect className="ch-hit" x={px(k)-(step||innerW)/2} y={PAD.t} width={step||innerW} height={innerH} onMouseEnter={()=>setHover(k)} onMouseLeave={()=>setHover(null)} onFocus={()=>setHover(k)} onBlur={()=>setHover(null)} tabIndex={0} aria-label={l+' : '+series.map(s=>s.name+' '+fmt(s.values[k],lang,b.unit)).join(', ')}/></g>)}</g>
 }
 const total=b.kind==='donut'?series[0].values.reduce((a,v)=>a+Math.max(0,v),0):0
 if(b.kind==='donut'){
  const cx=W/2,cy=h/2,R=Math.min(h/2-12,140),r=R*.62;let a0=-Math.PI/2
  plot=<g>{series[0].values.map((v,k)=>{const frac=total?Math.max(0,v)/total:0,a1=a0+frac*Math.PI*2,gap=frac>0&&frac<1?.012:0,s0=a0+gap,s1=a1-gap;const large=s1-s0>Math.PI?1:0;const P=(ang:number,rad:number)=>[cx+rad*Math.cos(ang),cy+rad*Math.sin(ang)];const [x0,y0]=P(s0,R),[x1,y1]=P(s1,R),[x2,y2]=P(s1,r),[x3,y3]=P(s0,r);a0=a1
   if(frac>=.999)return <g key={k}><circle cx={cx} cy={cy} r={(R+r)/2} fill="none" stroke={SERIES[k%SERIES.length]} strokeWidth={R-r}/></g>
   return <path key={k} className={'ch-slice'+(hover!==null&&hover!==k?' ch-dim':'')} d={`M${x0},${y0}A${R},${R} 0 ${large} 1 ${x1},${y1}L${x2},${y2}A${r},${r} 0 ${large} 0 ${x3},${y3}Z`} fill={SERIES[k%SERIES.length]} onMouseEnter={()=>setHover(k)} onMouseLeave={()=>setHover(null)} onFocus={()=>setHover(k)} onBlur={()=>setHover(null)} tabIndex={0} aria-label={b.labels[k]+' '+fmt(v,lang,b.unit)}/>})}
   <text x={cx} y={cy-2} textAnchor="middle" className="ch-donut-total">{fmt(hover!==null?series[0].values[hover]:total,lang,b.unit)}</text><text x={cx} y={cy+18} textAnchor="middle" className="ch-donut-label">{hover!==null?b.labels[hover]:'Total'}</text></g>
 }
 const axes=b.kind!=='donut'&&<g>{(b.kind==='hbar'?[]:ticks).map((t,i)=><g key={i}><line x1={PAD.l} x2={W-PAD.r} y1={y(t)} y2={y(t)} className={i?'ch-grid':'ch-base'}/><text x={PAD.l-8} y={y(t)+4} textAnchor="end" className="ch-y">{fmt(t,lang)}</text></g>)}</g>
 return <figure className="ch">
  {(b.title||b.subtitle)&&<figcaption><strong>{b.title}</strong>{b.subtitle&&<span>{b.subtitle}</span>}</figcaption>}
  {legend&&<ul className="ch-legend">{(b.kind==='donut'?b.labels.map((l,k)=>({name:l,color:SERIES[k%SERIES.length],extra:total?Math.round(Math.max(0,series[0].values[k])/total*100)+' %':''})):series.map(s=>({name:s.name,color:s.color,extra:''}))).map(x=><li key={x.name}><i style={{background:x.color}}/>{x.name}{x.extra&&<b>{x.extra}</b>}</li>)}</ul>}
  <div className="ch-plot"><svg viewBox={`0 0 ${W} ${h}`} role="img" aria-label={(b.title||'Graphique')+'. '+(lang==='fr'?'Détail disponible dans le tableau.':'Details in the table view.')}>
   <defs>{series.map((s,i)=><linearGradient key={i} id={`g${uid}${i}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={s.color} stopOpacity=".28"/><stop offset="1" stopColor={s.color} stopOpacity="0"/></linearGradient>)}</defs>
   {axes}{plot}</svg>{tip}</div>
  <div className="ch-foot">{b.note&&<span>{b.note}</span>}<button type="button" className="ch-tbtn" aria-expanded={table} onClick={()=>setTable(t=>!t)}><Table2 size={14}/>{table?(lang==='fr'?'Masquer les données':'Hide data'):(lang==='fr'?'Voir les données':'View data')}</button></div>
  {table&&<div className="bk-table-wrap"><table className="bk-table"><thead><tr><th scope="col">{lang==='fr'?'Libellé':'Label'}</th>{series.map(s=><th key={s.name} scope="col">{s.name}{b.unit?` (${b.unit})`:''}</th>)}</tr></thead><tbody>{b.labels.map((l,k)=><tr key={k}><th scope="row">{l}</th>{series.map(s=><td key={s.name}>{s.values[k].toLocaleString(lang)}</td>)}</tr>)}</tbody></table></div>}
 </figure>
}
