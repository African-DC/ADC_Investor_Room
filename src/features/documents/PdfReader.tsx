import {useEffect,useRef,useState} from 'react'
import type {PDFDocumentProxy,RenderTask} from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import {ChevronLeft,ChevronRight,ZoomIn,ZoomOut,X} from 'lucide-react'
const LIMIT=20*1024*1024
export function PdfReader({roomId,documentId,title,viewer,lang,onClose}:{roomId:string;documentId:string;title:string;viewer:string;lang:'fr'|'en';onClose:()=>void}){
 const [doc,setDoc]=useState<PDFDocumentProxy|null>(null),[page,setPage]=useState(1),[zoom,setZoom]=useState(1),[error,setError]=useState(false),[rendering,setRendering]=useState(true)
 const canvas=useRef<HTMLCanvasElement>(null)
 const fr=lang==='fr'
 useEffect(()=>{
  const abort=new AbortController();let alive=true;let dispose:(()=>Promise<void>)|undefined
  async function load(){
   try{
    const url='/api/documents/file?roomId='+encodeURIComponent(roomId)+'&documentId='+encodeURIComponent(documentId)
    const response=await fetch(url,{credentials:'same-origin',cache:'no-store',signal:abort.signal})
    const size=Number(response.headers.get('content-length'))
    if(!response.ok||response.headers.get('content-type')!=='application/pdf'||!Number.isSafeInteger(size)||size<5||size>LIMIT)throw Error('Unavailable')
    const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length!==size||!alive)return
    const pdfjs=await import('pdfjs-dist');if(!alive)return
    pdfjs.GlobalWorkerOptions.workerSrc=workerUrl
    const task=pdfjs.getDocument({data:bytes,isEvalSupported:false,enableXfa:false,disableFontFace:true,useSystemFonts:true})
    dispose=()=>task.destroy()
    const pdf=await task.promise
    if(alive){if(pdf.numPages<1||pdf.numPages>1000)throw Error('Invalid page count');setDoc(pdf)}
   }catch{if(alive){setError(true);setRendering(false)}}
  }
  void load()
  return()=>{alive=false;abort.abort();if(dispose)void dispose().catch(()=>{})}
 },[roomId,documentId])
 useEffect(()=>{
  if(!doc||!canvas.current)return
  let alive=true,task:RenderTask|undefined
  const el=canvas.current
  setRendering(true);setError(false)
  async function render(){
   try{
    const p=await doc!.getPage(page);if(!alive)return
    const original=p.getViewport({scale:1})
    const scale=Math.min(zoom*1.4,2400/Math.max(original.width,original.height))
    if(!Number.isFinite(scale)||scale<=0)throw Error('Invalid page')
    const viewport=p.getViewport({scale});el.width=Math.max(1,Math.ceil(viewport.width));el.height=Math.max(1,Math.ceil(viewport.height))
    const ctx=el.getContext('2d');if(!ctx)throw Error('Canvas unavailable')
    task=p.render({canvas:el,canvasContext:ctx,viewport});await task.promise
    if(!alive)return
    // Draw the watermark into the displayed canvas; deterrent only, not DRM.
    ctx.save();ctx.globalAlpha=.19;ctx.fillStyle='#16354d';ctx.font='bold '+Math.max(12,Math.floor(el.width/36))+'px sans-serif';ctx.textAlign='center'
    ctx.translate(el.width/2,el.height/2);ctx.rotate(-Math.PI/6)
    for(const y of [-el.height*.25,0,el.height*.25])ctx.fillText(viewer.slice(0,100)+' · ADC · '+(fr?'CONFIDENTIEL':'CONFIDENTIAL'),0,y,el.width*.9)
    ctx.restore();setRendering(false)
   }catch{if(alive){setError(true);setRendering(false)}}
  }
  void render()
  return()=>{alive=false;task?.cancel();el.width=1;el.height=1}
 },[doc,page,zoom,viewer,fr])
 return <section className="room-card pdf-reader" aria-label={fr?'Lecteur de document':'Document reader'}><header><h2>{title}</h2><button type="button" className="secondary" onClick={onClose}><X size={18}/>{fr?'Fermer':'Close'}</button></header><div className="pdf-toolbar"><button className="secondary" disabled={!doc||page<=1||rendering} onClick={()=>setPage(p=>p-1)} aria-label={fr?'Page précédente':'Previous page'}><ChevronLeft/></button><span aria-live="polite">{page} / {doc?.numPages??'—'}</span><button className="secondary" disabled={!doc||page>=doc.numPages||rendering} onClick={()=>setPage(p=>p+1)} aria-label={fr?'Page suivante':'Next page'}><ChevronRight/></button><button className="secondary" disabled={!doc||zoom<=.75||rendering} onClick={()=>setZoom(z=>Math.max(.75,z-.25))} aria-label={fr?'Réduire le zoom':'Zoom out'}><ZoomOut/></button><span>{Math.round(zoom*100)} %</span><button className="secondary" disabled={!doc||zoom>=2||rendering} onClick={()=>setZoom(z=>Math.min(2,z+.25))} aria-label={fr?'Agrandir':'Zoom in'}><ZoomIn/></button></div>{rendering&&!error&&<p role="status">{fr?'Chargement du document…':'Loading document…'}</p>}{error&&<p role="alert">{fr?'Le document est indisponible ou ne peut pas être affiché.':'The document is unavailable or cannot be displayed.'}</p>}<div className="pdf-page" hidden={error||rendering}><canvas ref={canvas} role="img" aria-label={title+' — '+(fr?'page':'page')+' '+page}/></div><p className="room-date">{fr?'Document confidentiel. Le filigrane identifie la consultation, sans empêcher les captures ou la copie.':'Confidential document. The watermark identifies the viewing session, but cannot prevent copying or screenshots.'}</p></section>
}
