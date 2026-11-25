import { useRef,useState } from 'react'
import { ImagePlus,Loader2,RefreshCw } from 'lucide-react'
import type { ImageMap } from './BlockView'
export type Uploader=(file:{dataUrl:string;width:number;height:number})=>Promise<string|null>
/** Resizes to ≤1800px and encodes WebP under ~850 KB in the browser before upload. */
export async function compress(file:File):Promise<{dataUrl:string;width:number;height:number}>{
 if(!/^image\/(png|jpeg|webp|gif)$/.test(file.type))throw new Error('type')
 const bmp=await createImageBitmap(file),scale=Math.min(1,1800/Math.max(bmp.width,bmp.height))
 const w=Math.round(bmp.width*scale),h=Math.round(bmp.height*scale),c=document.createElement('canvas');c.width=w;c.height=h
 c.getContext('2d')!.drawImage(bmp,0,0,w,h)
 for(const q of [.86,.78,.68,.58,.48]){const d=c.toDataURL('image/webp',q);if(d.length<850_000)return {dataUrl:d.startsWith('data:image/webp')?d:c.toDataURL('image/jpeg',q),width:w,height:h}}
 throw new Error('size')
}
export function ImagePicker({value,onChange,images,upload,label='Choisir une image'}:{value:string;onChange:(id:string)=>void;images:ImageMap;upload:Uploader;label?:string}){
 const input=useRef<HTMLInputElement>(null),[busy,setBusy]=useState(false),[err,setErr]=useState('')
 const img=value?images[value]:null
 return <div className="ip">
  {img?<img src={img.src} alt="" className="ip-thumb"/>:<div className="ip-empty"><ImagePlus size={22}/></div>}
  <div className="ip-side"><button type="button" className="be-add" disabled={busy} onClick={()=>input.current?.click()}>{busy?<Loader2 size={14} className="spin"/>:value?<RefreshCw size={14}/>:<ImagePlus size={14}/>}{busy?'Envoi…':value?'Remplacer':label}</button><small>JPG, PNG ou WebP · optimisée automatiquement</small>{err&&<small className="ip-err">{err}</small>}</div>
  <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;setBusy(true);setErr('');try{const c=await compress(f);const id=await upload(c);if(!id)throw new Error('upload');onChange(id)}catch(x){setErr((x as Error).message==='type'?'Format non pris en charge.':(x as Error).message==='size'?'Image trop lourde, même après compression.':'Envoi impossible. Réessayez.')}finally{setBusy(false)}}}/>
 </div>
}
