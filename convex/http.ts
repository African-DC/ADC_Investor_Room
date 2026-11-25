import { httpRouter } from 'convex/server'
import { authComponent,createAuth } from './auth'
import { httpAction } from './_generated/server'
import { internal } from './_generated/api'
const http=httpRouter()
authComponent.registerRoutes(http,createAuth)
http.route({path:'/adc/storage/read',method:'POST',handler:httpAction(async(ctx,request)=>{
 const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}
 const denied=()=>new Response(null,{status:404,headers})
 const secret=process.env.ADC_DOCUMENT_DELIVERY_SECRET,ticket=request.headers.get('x-adc-ticket')
 if(!secret||secret.length<32||request.headers.get('authorization')!=='Bearer '+secret||!ticket||!/^[a-f0-9]{64}$/.test(ticket))return denied()
 try{
  const result=await ctx.runMutation(internal.documents.consumeDelivery,{ticket})
  if(!result)return denied()
  const blob=await ctx.storage.get(result.storageId)
  if(!blob||blob.size!==result.sizeBytes)return denied()
  return new Response(blob,{headers:{...headers,'Content-Type':'application/pdf','Content-Length':String(blob.size)}})
 }catch{return denied()}
})})
export default http
