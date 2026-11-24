import { GetObjectCommand,S3Client } from '@aws-sdk/client-s3'
import { createHash } from 'node:crypto'
import { getAuthBridge } from '../lib/auth-server'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
const headers={'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Cross-Origin-Resource-Policy':'same-origin','X-Frame-Options':'SAMEORIGIN','Content-Security-Policy':"default-src 'none'; frame-ancestors 'self'; sandbox"}
const denied=()=>new Response('Document unavailable',{status:404,headers})
export async function deliverDocument(request:Request){
 const bridge=getAuthBridge(),secret=process.env.ADC_DOCUMENT_DELIVERY_SECRET
 if(!bridge||process.env.ADC_PORTAL_ENABLED!=='true'||process.env.ADC_DOCUMENTS_ENABLED!=='true'||!secret||secret.length<32)return denied()
 const url=new URL(request.url),roomId=url.searchParams.get('roomId'),documentId=url.searchParams.get('documentId'),download=url.searchParams.get('download')==='1'
 if(!roomId||!documentId||roomId.length>128||documentId.length>128)return denied()
 const endpoint=process.env.R2_ENDPOINT,bucket=process.env.R2_BUCKET,accessKeyId=process.env.R2_ACCESS_KEY_ID,secretAccessKey=process.env.R2_SECRET_ACCESS_KEY
 if(!endpoint||!bucket||!accessKeyId||!secretAccessKey)return denied()
 try{
  const target=new URL(endpoint)
  if(target.protocol!=='https:'||!target.hostname.endsWith('.r2.cloudflarestorage.com')||target.username||target.password||target.port||target.pathname!=='/'||target.search||target.hash)return denied()
  const file=await bridge.fetchAuthMutation(api.documents.authorizeDelivery,{roomId:roomId as Id<'rooms'>,documentId:documentId as Id<'documents'>,download,deliverySecret:secret})
  if(!file||file.sizeBytes<1||file.sizeBytes>20*1024*1024||file.objectKey!==`rooms/${roomId}/${file.sha256}.pdf`)return denied()
  const s3=new S3Client({region:'auto',endpoint,credentials:{accessKeyId,secretAccessKey},forcePathStyle:true})
  try{
   const result=await s3.send(new GetObjectCommand({Bucket:bucket,Key:file.objectKey}))
   if(!result.Body||result.ContentLength!==file.sizeBytes)return denied()
   const bytes=await result.Body.transformToByteArray()
   if(bytes.length!==file.sizeBytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256||new TextDecoder().decode(bytes.subarray(0,5))!=='%PDF-')return denied()
   // Verify entire object before exposing bytes. Ignore Range deliberately in this bounded first slice.
   return new Response(new Uint8Array(bytes),{status:200,headers:{...headers,'Content-Type':'application/pdf','Content-Length':String(bytes.length),'Content-Disposition':download?'attachment; filename="adc-document.pdf"':'inline; filename="adc-document.pdf"'}})
  }finally{s3.destroy()}
 }catch{return denied()}
}
