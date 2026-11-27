import {createHash,randomBytes} from 'node:crypto'
import {getAuthBridge} from '../lib/auth-server'
import {api} from '../../convex/_generated/api'
import type {Id} from '../../convex/_generated/dataModel'
import {MAX_UPLOAD,isPdf} from '../features/documents/uploadRules'
const headers={'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Cross-Origin-Resource-Policy':'same-origin','X-Frame-Options':'SAMEORIGIN','Content-Security-Policy':"default-src 'none'; frame-ancestors 'self'; sandbox"}
const denied=()=>new Response('Document unavailable',{status:404,headers})
export async function deliverDocument(request:Request){
 const bridge=getAuthBridge(),secret=process.env.ADC_DOCUMENT_DELIVERY_SECRET,site=process.env.VITE_CONVEX_SITE_URL
 if(!bridge||!secret||secret.length<32)return denied()
 const url=new URL(request.url),roomId=url.searchParams.get('roomId'),documentId=url.searchParams.get('documentId'),download=url.searchParams.get('download')==='1'
 if(!roomId||!documentId||roomId.length>128||documentId.length>128)return denied()
 const review=url.searchParams.get('review')==='1'
 try{
  if(review){
   if(download||process.env.ADC_STAGING_ADMIN_UI!=='true')return denied()
   const file=await bridge.fetchAuthAction(api.documents.reviewFile,{roomId:roomId as Id<'rooms'>,documentId:documentId as Id<'documents'>,deliverySecret:secret})
   if(!file||file.sizeBytes<5||file.sizeBytes>MAX_UPLOAD)return denied()
   const bytes=new Uint8Array(file.bytes)
   if(bytes.length!==file.sizeBytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256||!isPdf(bytes))return denied()
   return new Response(bytes,{headers:{...headers,'Content-Type':'application/pdf','Content-Length':String(bytes.length),'Content-Disposition':'inline; filename="adc-review.pdf"'}})
  }
  if(process.env.ADC_PORTAL_ENABLED!=='true'||process.env.ADC_DOCUMENTS_ENABLED!=='true'||!site)return denied()
  const ticket=randomBytes(32).toString('hex')
  const file=await bridge.fetchAuthMutation(api.documents.authorizeDelivery,{roomId:roomId as Id<'rooms'>,documentId:documentId as Id<'documents'>,download,deliverySecret:secret,ticket})
  if(!file||file.sizeBytes<5||file.sizeBytes>MAX_UPLOAD)return denied()
  const target=new URL('/adc/storage/read',site)
  if(target.protocol!=='https:'&&!(target.protocol==='http:'&&['localhost','127.0.0.1'].includes(target.hostname)))return denied()
  const result=await fetch(target,{method:'POST',headers:{Authorization:'Bearer '+secret,'x-adc-ticket':ticket},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)})
  if(!result.ok||Number(result.headers.get('content-length'))!==file.sizeBytes||result.headers.get('content-type')!=='application/pdf')return denied()
  const bytes=new Uint8Array(await result.arrayBuffer())
  if(bytes.length!==file.sizeBytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256||!isPdf(bytes))return denied()
  return new Response(bytes,{status:200,headers:{...headers,'Content-Type':'application/pdf','Content-Length':String(bytes.length),'Content-Disposition':download?'attachment; filename="adc-document.pdf"':'inline; filename="adc-document.pdf"'}})
 }catch{return denied()}
}
