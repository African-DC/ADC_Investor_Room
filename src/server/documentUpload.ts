import {createHash} from 'node:crypto'
import {getAuthBridge} from '../lib/auth-server'
import {api} from '../../convex/_generated/api'
import type {Id} from '../../convex/_generated/dataModel'
import {MAX_REQUEST,isPdf,validUpload} from '../features/documents/uploadRules'
const response=(status:number,ok=false)=>Response.json({ok},{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}})
async function boundedBody(request:Request){
 const reader=request.body?.getReader();if(!reader)throw Error('Invalid body')
 const parts:Uint8Array[]=[];let size=0
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>MAX_REQUEST){await reader.cancel();throw Error('Too large')}parts.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length}return bytes
}
export async function uploadDocument(request:Request){
 const bridge=getAuthBridge(),secret=process.env.ADC_DOCUMENT_UPLOAD_SECRET,origin=process.env.ADC_APP_ORIGIN
 if(!bridge||process.env.ADC_STAGING_ADMIN_UI!=='true'||process.env.ADC_UPLOAD_ENABLED!=='true'||!secret||secret.length<32||!origin||request.headers.get('origin')!==origin)return response(404)
 const roomId=new URL(request.url).searchParams.get('roomId')
 const contentType=request.headers.get('content-type')??'',length=Number(request.headers.get('content-length'))
 if(!roomId||roomId.length>128||!contentType.startsWith('multipart/form-data;')||!Number.isSafeInteger(length)||length<1||length>MAX_REQUEST)return response(400)
 const convexUrl=process.env.VITE_CONVEX_URL,siteUrl=process.env.VITE_CONVEX_SITE_URL
 if(!convexUrl||!siteUrl)return response(503)
 try{
  const uploadUrl=await bridge.fetchAuthMutation(api.documents.authorizeUpload,{roomId:roomId as Id<'rooms'>,secret})
  if(!uploadUrl)return response(404)
  const target=new URL(uploadUrl);if(![new URL(convexUrl).origin,new URL(siteUrl).origin].includes(target.origin)||target.username||target.password||target.hash)return response(503)
  const form=await new Response(await boundedBody(request),{headers:{'Content-Type':contentType}}).formData()
  if(form.getAll('file').length!==1)return response(400)
  const file=form.get('file'),titleFr=form.get('titleFr'),titleEn=form.get('titleEn'),category=form.get('category')
  if(!(file instanceof File)||typeof titleFr!=='string'||typeof titleEn!=='string'||typeof category!=='string'||file.type!=='application/pdf'||!validUpload({titleFr,titleEn,category,sizeBytes:file.size}))return response(400)
  const bytes=new Uint8Array(await file.arrayBuffer());if(!isPdf(bytes))return response(400)
  const sha256=createHash('sha256').update(bytes).digest('hex')
  const uploaded=await fetch(target,{method:'POST',headers:{'Content-Type':'application/pdf'},body:bytes,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)})
  if(!uploaded.ok)return response(502)
  const result=await uploaded.json() as {storageId?:unknown}
  if(typeof result.storageId!=='string'||result.storageId.length>128)return response(502)
  // Server-only upload URL and storage ID. Failed registration leaves a private orphan for reconciliation.
  await bridge.fetchAuthMutation(api.documents.completeUpload,{roomId:roomId as Id<'rooms'>,titleFr,titleEn,category,storageId:result.storageId as Id<'_storage'>,sha256,sizeBytes:bytes.length,secret})
  return response(201,true)
 }catch{return response(400)}
}
