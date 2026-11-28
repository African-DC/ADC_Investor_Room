import type {QueryCtx} from './_generated/server'
// Idempotent e-mail outbox: one row per logical notification (unique key), delivered by a worker with retries.
// Status is "sent" only after Resend accepted the message; failures keep their reason.
import { internalAction,internalMutation,internalQuery,mutation,query } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { internal } from './_generated/api'
import { v } from 'convex/values'
import { authComponent,createAuth } from './auth'
import { admin } from './admin'
import { transactionalEmail,adminInvitationEmail } from './lib/emailTemplate'
const BACKOFF=[60_000,300_000,1_800_000,7_200_000,21_600_000],MAX_ATTEMPTS=BACKOFF.length+1
type Kind='request_received'|'new_request'|'access_granted'|'document_published'|'qa_answer'|'admin_invite'
const site=()=>process.env.SITE_URL??'https://dataroom.africandigitconsulting.com'
function render(kind:Kind,vars:Record<string,string>){
 switch(kind){
  case 'request_received':return {subject:'ADC Investor Room — Demande d’accès reçue',...transactionalEmail(site(),{kicker:'ESPACE PRIVÉ · INVESTISSEURS',title:'Votre demande est entre de bonnes mains.',lead:`Merci ${vars.name}. L’équipe d’African Digit Consulting examine votre demande d’accès. Vous recevrez un e-mail dès qu’elle sera validée.`,en:'Thank you. ADC is reviewing your access request; you will be notified once it is approved.'})}
  case 'new_request':return {subject:'Nouvelle demande d’accès — '+vars.name,...transactionalEmail(site(),{kicker:'ADMINISTRATION ADC',title:'Nouvelle demande d’accès.',lead:`${vars.name} (${vars.email}${vars.organization?' · '+vars.organization:''}) demande l’accès à la salle « ${vars.room} ».`,cta:{label:'Examiner la demande',path:'/admin#access'},note:'Notification interne ADC.'})}
  case 'access_granted':return {subject:'ADC Investor Room — Votre accès est ouvert',...transactionalEmail(site(),{kicker:'ESPACE PRIVÉ · INVESTISSEURS',title:'Votre accès est ouvert.',lead:`Bonjour ${vars.name}, African Digit Consulting vous a ouvert l’accès à « ${vars.room} »${vars.until?' jusqu’au '+vars.until:''}.`,cta:{label:'Entrer dans la Data Room',path:'/connexion?next=%2Finvestor'},en:'Your access to the ADC data room is now open.'})}
  case 'document_published':return {subject:'Nouveau document disponible — '+vars.title,...transactionalEmail(site(),{kicker:'ESPACE PRIVÉ · INVESTISSEURS',title:'Un nouveau document vous attend.',lead:`« ${vars.title} » a été ajouté à « ${vars.room} » et vous est accessible.`,cta:{label:'Consulter le document',path:'/connexion?next=%2Finvestor'},en:'A new document is available to you in the ADC data room.'})}
  case 'qa_answer':return {subject:'ADC a répondu à votre question',...transactionalEmail(site(),{kicker:'QUESTIONS & RÉPONSES',title:'Vous avez une réponse.',lead:`L’équipe ADC a répondu à votre question « ${vars.subject} ». Pour des raisons de confidentialité, la réponse est consultable uniquement dans la Data Room.`,cta:{label:'Lire la réponse',path:'/connexion?next=%2Finvestor'},en:'ADC answered your question. Read it securely in the data room.'})}
  case 'admin_invite':return {subject:'Invitation — Administration de la Data Room ADC',...transactionalEmail(site(),{kicker:'ADMINISTRATION ADC',title:'Vous êtes invité à administrer la Data Room.',lead:`Connectez-vous avec cette adresse (${vars.email}) avant le ${vars.expires}. Une double authentification vous sera demandée à la première connexion.`,cta:{label:'Accepter l’invitation',path:'/connexion?next=%2Fadmin'},note:'Si vous n’attendiez pas cette invitation, ignorez cet e-mail.'})}
 }
}
/** Enqueue once per key. Safe to call from any mutation. */
export async function enqueue(ctx:MutationCtx,o:{key:string;kind:Kind;to:string;roomId?:Id<'rooms'>;vars:Record<string,string>}){
 const to=o.to.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to))return null
 if(await ctx.db.query('emailOutbox').withIndex('by_key',q=>q.eq('key',o.key)).first())return null
 const r=render(o.kind,o.vars),now=Date.now()
 const id=await ctx.db.insert('emailOutbox',{key:o.key,roomId:o.roomId,kind:o.kind,to,subject:r.subject,html:r.html,text:r.text,status:'pending',attempts:0,nextAttemptAt:now,createdAt:now})
 await ctx.scheduler.runAfter(0,internal.outbox.deliver,{id});return id
}
export async function emailOf(ctx:MutationCtx,authUserId:string){const u=await authComponent.getAnyUserById(ctx,authUserId).catch(()=>null);return u?{email:u.email,name:u.name}:null}
export async function adminRecipients(ctx:MutationCtx,roomId:Id<'rooms'>){
 const out:{email:string;name:string}[]=[]
 for(const m of await ctx.db.query('stagingAdminMemberships').collect()){if(m.roomId!==roomId||m.revokedAt||!m.capabilities.some(c=>c==='access:manage'||c==='investors:read'))continue;const u=await emailOf(ctx,m.authUserId);if(u)out.push(u)}
 return out
}
export const claim=internalMutation({args:{id:v.id('emailOutbox')},handler:async(ctx,a)=>{
 const row=await ctx.db.get(a.id);if(!row||row.status!=='pending'||row.nextAttemptAt>Date.now()+1000)return null
 await ctx.db.patch(row._id,{status:'sending',attempts:row.attempts+1});return {key:row.key,to:row.to,kind:row.kind,subject:row.subject,html:row.html,text:row.text,attempts:row.attempts+1}
}})
export const settle=internalMutation({args:{id:v.id('emailOutbox'),ok:v.boolean(),providerId:v.optional(v.string()),error:v.optional(v.string()),retryable:v.boolean()},handler:async(ctx,a)=>{
 const row=await ctx.db.get(a.id);if(!row)return
 if(a.ok){await ctx.db.patch(row._id,{status:'sent',sentAt:Date.now(),providerId:a.providerId,lastError:undefined});return}
 const again=a.retryable&&row.attempts<MAX_ATTEMPTS,delay=BACKOFF[Math.min(row.attempts-1,BACKOFF.length-1)]!
 await ctx.db.patch(row._id,{status:again?'pending':'failed',lastError:(a.error??'Erreur inconnue').slice(0,300),nextAttemptAt:Date.now()+delay})
 if(again)await ctx.scheduler.runAfter(delay,internal.outbox.deliver,{id:row._id})
}})
export const invitationForDelivery=internalQuery({args:{key:v.string(),to:v.string()},handler:async(ctx,a)=>{
 if(!a.key.startsWith('admin_invite:'))return null
 const id=ctx.db.normalizeId('adminInvites',a.key.slice('admin_invite:'.length))
 const invite=id?await ctx.db.get(id):null
 if(!invite||invite.email!==a.to||invite.revokedAt!==undefined||invite.acceptedAt!==undefined||invite.expiresAt<=Date.now())return null
 return {expires:new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeZone:'UTC'}).format(invite.expiresAt)}
}})
export const deliver=internalAction({args:{id:v.id('emailOutbox')},handler:async(ctx,a)=>{
 const job=await ctx.runMutation(internal.outbox.claim,{id:a.id});if(!job)return
 const key=process.env.RESEND_API_KEY,from=process.env.MAIL_FROM
 if(!key||!from){await ctx.runMutation(internal.outbox.settle,{id:a.id,ok:false,error:'Service e-mail non configuré',retryable:true});return}
 try{
  let content={subject:job.subject,html:job.html,text:job.text},deliveryKey=job.key
  if(job.kind==='admin_invite'&&job.key.startsWith('admin_invite:')){
   const invite=await ctx.runQuery(internal.outbox.invitationForDelivery,{key:job.key,to:job.to})
   if(!invite){await ctx.runMutation(internal.outbox.settle,{id:a.id,ok:false,error:'Invitation inactive',retryable:false});return}
   let captured=''
   const auth=createAuth(ctx,async(email,link)=>{if(email!==job.to)throw Error('Unexpected recipient');captured=link})
   await auth.api.signInMagicLink({body:{email:job.to,callbackURL:'/admin',newUserCallbackURL:'/admin',errorCallbackURL:'/connexion?next=%2Fadmin'},headers:new Headers({origin:site()})})
   if(!captured)throw Error('Missing verification link')
   content=adminInvitationEmail(site(),captured,invite.expires)
   // Fresh token per attempt: provider idempotency is per attempt, no token persisted in outbox.
   deliveryKey=job.key+':'+job.attempts
  }
  const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':deliveryKey.slice(0,256)},body:JSON.stringify({from,to:[job.to],...content}),signal:AbortSignal.timeout(10000)})
  if(res.ok){const body=await res.json().catch(()=>({}))as {id?:string};await ctx.runMutation(internal.outbox.settle,{id:a.id,ok:true,providerId:body.id,retryable:false});return}
  const detail=(await res.text().catch(()=>'')).slice(0,200)
  await ctx.runMutation(internal.outbox.settle,{id:a.id,ok:false,error:'Resend '+res.status+(detail?' — '+detail:''),retryable:res.status===429||res.status>=500})
 }catch(e){await ctx.runMutation(internal.outbox.settle,{id:a.id,ok:false,error:job.kind==='admin_invite'?'Service de connexion ou d’envoi indisponible':'Réseau : '+String((e as Error).message??e).slice(0,150),retryable:true})}
}})
/** Safety net: re-schedules due pending rows and recovers rows stuck in "sending" (worker crash). */
export const sweep=internalMutation({args:{},handler:async ctx=>{
 const now=Date.now();let n=0
 for(const r of await ctx.db.query('emailOutbox').withIndex('by_status_next',q=>q.eq('status','pending').lte('nextAttemptAt',now)).take(50)){await ctx.scheduler.runAfter(0,internal.outbox.deliver,{id:r._id});n++}
 for(const r of await ctx.db.query('emailOutbox').withIndex('by_status_next',q=>q.eq('status','sending')).take(50))if(now-r.nextAttemptAt>15*60_000){await ctx.db.patch(r._id,{status:'pending',nextAttemptAt:now});n++}
 return n
}})
export const forRoom=internalQuery({args:{roomId:v.id('rooms')},handler:async(ctx,a)=>ctx.db.query('emailOutbox').withIndex('by_room',q=>q.eq('roomId',a.roomId)).order('desc').take(100)})
export async function readEmails(ctx:QueryCtx,a:{roomId:Id<'rooms'>}){

 return (await ctx.db.query('emailOutbox').withIndex('by_room',q=>q.eq('roomId',a.roomId)).order('desc').take(100)).map(r=>({id:r._id,kind:r.kind,to:r.to,subject:r.subject,status:r.status,attempts:r.attempts,lastError:r.lastError??null,createdAt:r.createdAt,sentAt:r.sentAt??null}))
}
export const list=query({args:{roomId:v.id('rooms')},handler:async(ctx,a)=>{await admin(ctx,a.roomId,'access:manage');return readEmails(ctx,a)}})
export const retry=mutation({args:{roomId:v.id('rooms'),id:v.id('emailOutbox')},handler:async(ctx,a)=>{
 const {user}=await admin(ctx,a.roomId,'access:manage');const r=await ctx.db.get(a.id);if(!r||r.roomId!==a.roomId||r.status!=='failed')throw new Error('Unavailable')
 await ctx.db.patch(r._id,{status:'pending',attempts:0,nextAttemptAt:Date.now(),lastError:undefined});await ctx.scheduler.runAfter(0,internal.outbox.deliver,{id:r._id})
 await ctx.db.insert('auditLogs',{actorId:user._id,event:'email.retry',resourceId:r._id,at:Date.now()});return {ok:true}
}})
/** Operator smoke test (CLI only): queues one real notification through the normal pipeline. */
export const smokeTest=internalMutation({args:{to:v.string(),roomId:v.id('rooms')},handler:async(ctx,a)=>enqueue(ctx,{key:'smoke:'+Date.now(),kind:'access_granted',to:a.to,roomId:a.roomId,vars:{name:'Recette',room:'Salle de recette ADC',until:''}})})
