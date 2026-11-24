import {PutObjectCommand,S3Client} from '@aws-sdk/client-s3'
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
 if(!bridge||(process.env.ADC_STAGING_ADMIN_UI!=='true'||process.env.VERCEL_ENV==='production')||process.env.ADC_UPLOAD_ENABLED!=='true'||!secret||secret.length<32||!origin||request.headers.get('origin')!==origin)return response(404)
 const roomId=new URL(request.url).searchParams.get('roomId')
 const contentType=request.headers.get('content-type')??'',length=Number(request.headers.get('content-length'))
 if(!roomId||roomId.length>128||!contentType.startsWith('multipart/form-data;')||!Number.isSafeInteger(length)||length<1||length>MAX_REQUEST)return response(400)
 const endpoint=process.env.R2_ENDPOINT,bucket=process.env.R2_BUCKET,accessKeyId=process.env.R2_UPLOAD_ACCESS_KEY_ID,secretAccessKey=process.env.R2_UPLOAD_SECRET_ACCESS_KEY
 if(!endpoint||!bucket||!accessKeyId||!secretAccessKey)return response(503)
 try{
  if(!await bridge.fetchAuthQuery(api.documents.authorizeUpload,{roomId:roomId as Id<'rooms'>,secret}))return response(404)
  const target=new URL(endpoint);if(target.protocol!=='https:'||!target.hostname.endsWith('.r2.cloudflarestorage.com')||target.username||target.password||target.port||target.pathname!=='/'||target.search||target.hash)return response(503)
  const form=await new Response(await boundedBody(request),{headers:{'Content-Type':contentType}}).formData()
  if(form.getAll('file').length!==1)return response(400)
  const file=form.get('file'),titleFr=form.get('titleFr'),titleEn=form.get('titleEn'),category=form.get('category')
  if(!(file instanceof File)||typeof titleFr!=='string'||typeof titleEn!=='string'||typeof category!=='string'||file.type!=='application/pdf'||!validUpload({titleFr,titleEn,category,sizeBytes:file.size}))return response(400)
  const bytes=new Uint8Array(await file.arrayBuffer());if(!isPdf(bytes))return response(400)
  const sha256=createHash('sha256').update(bytes).digest('hex'),objectKey=`rooms/${roomId}/${sha256}.pdf`
  const s3=new S3Client({region:'auto',endpoint,credentials:{accessKeyId,secretAccessKey},forcePathStyle:true})
  try{await s3.send(new PutObjectCommand({Bucket:bucket,Key:objectKey,Body:bytes,ContentType:'application/pdf',Metadata:{sha256}}))}finally{s3.destroy()}
  // Recheck membership after upload. On failure, the object remains private and unreferenced; never delete a shared hash automatically.
  await bridge.fetchAuthMutation(api.documents.completeUpload,{roomId:roomId as Id<'rooms'>,titleFr,titleEn,category,objectKey,sha256,sizeBytes:bytes.length,secret})
  return response(201,true)
 }catch{return response(400)}
}
