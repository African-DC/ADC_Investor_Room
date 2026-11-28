import { createFileRoute,redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader,setResponseHeaders } from '@tanstack/react-start/server'
import { z } from 'zod'
import { getAuthBridge } from '../lib/auth-server'
import { authClient } from '../lib/auth-client'
import { safeAuthFailure } from '../lib/auth-token'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { adminCommand } from '../features/admin/contracts'
import {executeCommand} from '../features/admin/executeCommand'
import {LiveConvex,liveConvexEnabled} from '../lib/LiveConvex'
import {useConvex,useConvexAuth} from 'convex/react'
import type {ComponentProps} from 'react'
import { targetsFor,draftText } from '../features/technical/model'
import { getTechnicalSnapshot } from '../server/githubReporting'
import { AdminRoom } from '../features/admin/AdminRoom'
import { JourneyFrame } from '../features/onboarding/JourneyFrame'
import { useEffect,useState } from 'react'
import { MfaGate } from '../features/admin/MfaGate'
const headers=()=>({'Cache-Control':'private, no-store','Vary':'Cookie, Authorization','Referrer-Policy':'no-referrer'})
// Admin UI is allowed wherever the flag is on: every privileged Convex call enforces session-bound TOTP MFA.
// A missing capability for one panel must not break the whole back office.
const adminAllowed=()=>process.env.ADC_STAGING_ADMIN_UI==='true'
const search=z.object({roomId:z.string().max(128).optional()})
const load=createServerFn({method:'GET'}).validator(search).handler(async({data})=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge()
 if(!bridge||!adminAllowed())return null
 let stage='token'
 try{
  if(!await bridge.getToken())return {problem:'signin' as const}
  stage='bootstrap'
  const roomId=data.roomId as Id<'rooms'>|undefined
  let result=await bridge.fetchAuthQuery(api.adminPanels.bootstrap,{roomId})
  if(result.kind==='claim'){
   stage='invitation-claim';await bridge.fetchAuthMutation(api.team.claim,{})
   stage='bootstrap';result=await bridge.fetchAuthQuery(api.adminPanels.bootstrap,{roomId,skipClaim:true})
  }
  if(result.kind==='mfa')return {mfa:result.mfa} as const
  if(result.kind!=='ready')return {problem:'membership' as const}
  const {identity,dashboard,panels:{metrics,contacts,questions,analytics,access,team,emails,nda}}=result
  const technicalTargets=dashboard.capabilities.includes('technical:read')&&process.env.ADC_GITHUB_REPORTING_ENABLED==='true'?targetsFor(process.env.ADC_GITHUB_TARGETS,dashboard.room.id).map(t=>({key:t.key,label:t.label})):[]
  return {identity,dashboard:{...dashboard,metrics:metrics??[],contacts:contacts??[],questions:questions??[],analytics,access,team,emails,nda,technicalTargets,uploadEnabled:process.env.ADC_UPLOAD_ENABLED==='true',manualScan:process.env.ADC_MANUAL_SCAN_ALLOWED==='true'}}
 }catch(error){
  const failure=safeAuthFailure(error)
  console.warn('[adc:admin] load failed',{stage,...failure})
  if(failure.kind==='rate-limit')return {problem:'throttled' as const}
  if(failure.kind==='mfa-required'){
   try{const mfa=await bridge.fetchAuthQuery(api.mfa.status,{});if(mfa&&!mfa.verified)return {mfa} as const}catch{/* remain fail-closed */}
  }
  return {problem:'unavailable' as const}
 }
})
const command=createServerFn({method:'POST'}).validator(adminCommand).handler(async({data})=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge(),origin=process.env.ADC_APP_ORIGIN
 if(!bridge||!adminAllowed()||!origin||getRequestHeader('origin')!==origin)return {ok:false}
 return executeCommand(bridge,data)
})
const history=createServerFn({method:'GET'}).validator(z.object({roomId:z.string().max(128),profileId:z.string().max(128)})).handler(async({data})=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge()
 if(!bridge||!adminAllowed())return null
 try{return await bridge.fetchAuthQuery(api.crm.history,{roomId:data.roomId as Id<'rooms'>,profileId:data.profileId as Id<'investorProfiles'>})}catch{return null}
})
const questionRead=createServerFn({method:'GET'}).validator(z.object({roomId:z.string().max(128),questionId:z.string().max(128)})).handler(async({data})=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge()
 if(!bridge||!adminAllowed())return null
 try{return await bridge.fetchAuthQuery(api.qa.adminRead,{roomId:data.roomId as Id<'rooms'>,questionId:data.questionId as Id<'questions'>})}catch{return null}
})
const technical=createServerFn({method:'POST'}).validator(z.object({roomId:z.string().max(128),key:z.string().regex(/^[a-z0-9-]{1,40}$/),draft:z.boolean()})).handler(async({data})=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge(),origin=process.env.ADC_APP_ORIGIN
 if(!bridge||!origin||getRequestHeader('origin')!==origin||!adminAllowed()||process.env.ADC_GITHUB_REPORTING_ENABLED!=='true')return null
 const roomId=data.roomId as Id<'rooms'>
 try{
  const rights=await bridge.fetchAuthQuery(api.admin.technicalAccess,{roomId})
  if(data.draft&&!rights.canDraft)return null
  const target=targetsFor(process.env.ADC_GITHUB_TARGETS,roomId).find(t=>t.key===data.key)
  if(!target)return null
  const snapshot=await getTechnicalSnapshot(roomId,data.key)
  const current=await bridge.fetchAuthQuery(api.admin.technicalAccess,{roomId})
  if(data.draft){
   if(!current.canDraft)return null
   await bridge.fetchAuthMutation(api.admin.draft,{roomId,slug:'technical-'+target.key,category:'technology',order:target.order,...draftText(snapshot),source:'GitHub REST metadata · '+target.repo+' · '+snapshot.observedAt+' · latest release and up to 30 recently updated closed PRs'})
  }
  return {snapshot,drafted:data.draft}
 }catch{return null}
})
const mfaCode=z.object({code:z.string().trim().min(6).max(12)})
const sameOrigin=()=>{const origin=process.env.ADC_APP_ORIGIN;return !!origin&&getRequestHeader('origin')===origin}
const mfaBegin=createServerFn({method:'POST'}).handler(async()=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge();if(!bridge||!adminAllowed()||!sameOrigin())return null
 try{return await bridge.fetchAuthAction(api.mfa.beginEnroll,{})}catch{return null}
})
const mfaConfirm=createServerFn({method:'POST'}).validator(mfaCode).handler(async({data})=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge();if(!bridge||!adminAllowed()||!sameOrigin())return {ok:false}
 try{return await bridge.fetchAuthAction(api.mfa.confirmEnroll,{code:data.code})}catch{return {ok:false}}
})
const mfaVerify=createServerFn({method:'POST'}).validator(mfaCode).handler(async({data})=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge();if(!bridge||!adminAllowed()||!sameOrigin())return {ok:false}
 try{return await bridge.fetchAuthAction(api.mfa.verify,{code:data.code})}catch{return {ok:false}}
})
const linkInput=z.object({roomId:z.string().max(128),label:z.string().trim().min(1).max(120),targets:z.array(z.object({capability:z.enum(['room:read','section:read','document:read','document:download']),resourceId:z.string().max(128).optional()})).min(1).max(50),email:z.string().email().max(254).optional(),startsAt:z.number().finite(),expiresAt:z.number().finite(),grantUntil:z.number().finite().optional(),maxUses:z.number().int().min(1).max(500)})
const createLink=createServerFn({method:'POST'}).validator(linkInput).handler(async({data})=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge(),origin=process.env.ADC_APP_ORIGIN;if(!bridge||!adminAllowed()||!sameOrigin()||!origin)return null
 try{const r=await bridge.fetchAuthAction(api.access.createLink,{...data,roomId:data.roomId as Id<'rooms'>});return r?{url:origin+'/invite#'+r.token,link:{id:r.id,label:data.label.trim(),targets:data.targets,email:data.email?.toLowerCase()??null,startsAt:data.startsAt,expiresAt:data.expiresAt,grantUntil:data.grantUntil??null,maxUses:data.maxUses,uses:0,active:data.startsAt<=Date.now()&&data.expiresAt>Date.now(),revoked:false}}:null}catch(error){console.warn('[adc:admin] link creation failed',safeAuthFailure(error));return null}
})
const reviewUrl=createServerFn({method:'POST'}).validator(z.object({roomId:z.string().max(128),documentId:z.string().max(128)})).handler(async({data})=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge();if(!bridge||!adminAllowed()||!sameOrigin())return null
 try{return await bridge.fetchAuthQuery(api.documents.reviewUrl,{roomId:data.roomId as Id<'rooms'>,documentId:data.documentId as Id<'documents'>})}catch{return null}
})
const uploadImage=createServerFn({method:'POST'}).validator(z.object({roomId:z.string().max(128),dataUrl:z.string().max(900000),width:z.number().int().min(1).max(4000),height:z.number().int().min(1).max(4000)})).handler(async({data})=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge();if(!bridge||!adminAllowed()||!sameOrigin())return null
 try{return await bridge.fetchAuthMutation(api.media.upload,{...data,roomId:data.roomId as Id<'rooms'>})}catch{return null}
})
const verifySession=createServerFn({method:'GET'}).validator(z.object({roomId:z.string().max(128)})).handler(async({data})=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge()
 if(!bridge||!adminAllowed())return {kind:'denied' as const}
 try{
  if(!await bridge.getToken())return {kind:'denied' as const}
  const result=await bridge.fetchAuthQuery(api.admin.sessionCheck,{roomId:data.roomId as Id<'rooms'>})
  return {kind:'verified' as const,capabilities:result.capabilities}
 }catch(error){
  const failure=safeAuthFailure(error)
  if(failure.kind==='mfa-required'||failure.kind==='unauthenticated')return {kind:'denied' as const}
  console.warn('[adc:admin] heartbeat failed',failure)
  return {kind:'temporary' as const}
 }
})
const touch=createServerFn({method:'POST'}).handler(async()=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge();if(!bridge||!adminAllowed()||!sameOrigin())throw Error('Unavailable')
 return bridge.fetchAuthMutation(api.mfa.touch,{})
})
function AdminProblem({problem}:{problem:'signin'|'membership'|'unavailable'|'throttled'}){
 const [lang,setLang]=useState<'fr'|'en'>('fr'),fr=lang==='fr'
 const [remaining,setRemaining]=useState(problem==='throttled'?60:0),[switching,setSwitching]=useState(false),[switchError,setSwitchError]=useState(false)
 async function changeAccount(){setSwitching(true);setSwitchError(false);try{const r=await authClient.signOut();if(r.error)throw Error('sign out');location.replace('/connexion?next=%2Fadmin')}catch{setSwitchError(true);setSwitching(false)}}
 useEffect(()=>{if(problem!=='throttled')return;const until=Date.now()+60000;const timer=window.setInterval(()=>setRemaining(Math.max(0,Math.ceil((until-Date.now())/1000))),1000);return()=>window.clearInterval(timer)},[problem])
 const title=problem==='throttled'?(fr?'Vérification temporairement limitée.':'Verification temporarily limited.'):problem==='membership'?(fr?'Accès administrateur non attribué.':'Admin access not assigned.'):problem==='signin'?(fr?'Connexion requise.':'Sign-in required.'):(fr?'Connexion momentanément indisponible.':'Connection temporarily unavailable.')
 return <JourneyFrame space="admin" lang={lang} setLang={setLang} tone="alert"><h1>{title}</h1><p role="alert" className="frame-lead">{problem==='throttled'?(fr?'Le serveur limite temporairement les requêtes. Inutile de redemander un lien de connexion.':'The server is temporarily limiting requests. No need to request another sign-in link.'):problem==='membership'?(fr?'Vérifiez que votre invitation est active et correspond à votre adresse e-mail vérifiée. Contactez ADC si nécessaire.':'Check that your invitation is active and matches your verified email. Contact ADC if needed.'):problem==='signin'?(fr?'Connectez-vous par lien ou code e-mail, puis validez votre Authenticator.':'Sign in by email link or code, then verify your authenticator.'):(fr?'Impossible de vérifier votre accès pour le moment. Réessayez ; si le problème persiste, reconnectez-vous par e-mail.':'Your access could not be verified. Retry; if the problem persists, sign in by email again.')}</p><button className="primary journey-primary" disabled={remaining>0} onClick={()=>location.reload()}>{remaining>0?(fr?'Réessayer dans ':'Retry in ')+remaining+' s':fr?'Réessayer':'Retry'}</button>{problem==='signin'?<a className="secondary journey-link" href="/connexion?next=/admin">{fr?'Se connecter avec une adresse e-mail':'Sign in with an email address'}</a>:problem!=='throttled'&&<button className="secondary journey-link" disabled={switching} onClick={()=>void changeAccount()}>{fr?'Changer de compte':'Switch account'}</button>}{switchError&&<p role="alert">{fr?'Déconnexion impossible. Réessayez.':'Unable to sign out. Retry.'}</p>}</JourneyFrame>
}
export const Route=createFileRoute('/admin')({headers,validateSearch:search,beforeLoad:async({search})=>{
 const state=await load({data:search});if(!state)throw redirect({to:'/connexion',search:{next:'/admin'}});return {state}
},component:Page})
function Page(){const {state}=Route.useRouteContext();if(state.problem)return <AdminProblem problem={state.problem}/>;if(state.mfa)return <MfaGate status={state.mfa} begin={()=>mfaBegin()} confirm={code=>mfaConfirm({data:{code}})} verify={code=>mfaVerify({data:{code}})}/>;return <AdminTransport uploadImage={f=>uploadImage({data:{...f,roomId:state.dashboard.room.id}})} reviewUrl={documentId=>reviewUrl({data:{roomId:state.dashboard.room.id,documentId}})} createLink={d=>createLink({data:{...d,roomId:state.dashboard.room.id}})} key={state.dashboard.room.id} initial={state} verifySession={()=>verifySession({data:{roomId:state.dashboard.room.id}})} touch={()=>touch()} reload={async()=>{const next=await load({data:{roomId:state.dashboard.room.id}});if(next?.problem==='throttled')throw Error('rate-limit');if(next?.problem==='unavailable')throw Error('Temporary refresh failure');return next&&!next.mfa&&!next.problem?next:null}} command={data=>command({data})} history={profileId=>history({data:{roomId:state.dashboard.room.id,profileId}})} questionRead={questionId=>questionRead({data:{roomId:state.dashboard.room.id,questionId}})} technical={(key,draft)=>technical({data:{roomId:state.dashboard.room.id,key,draft}})}/>}
function AdminTransport(props:ComponentProps<typeof AdminRoom>){
 if(!liveConvexEnabled())return <AdminRoom {...props}/>
 return <LiveConvex><SocketAdmin {...props}/></LiveConvex>
}
function SocketAdmin(props:ComponentProps<typeof AdminRoom>){
 const client=useConvex(),auth=useConvexAuth(),roomId=props.initial.dashboard.room.id as Id<'rooms'>
 const ready=auth.isAuthenticated&&!auth.isLoading
 const verifySession:NonNullable<ComponentProps<typeof AdminRoom>['verifySession']>=async()=>{
  if(!ready)return {kind:'temporary'}
  try{const result=await client.query(api.admin.sessionCheck,{roomId,nonce:Date.now()});return {kind:'verified',capabilities:result.capabilities}}
  catch(error){const failure=safeAuthFailure(error);return {kind:failure.kind==='mfa-required'||failure.kind==='unauthenticated'?'denied':'temporary'}}
 }
 const subscribeSession:NonNullable<ComponentProps<typeof AdminRoom>['subscribeSession']>=onResult=>{
  if(!ready)return ()=>{}
  const watch=client.watchQuery(api.admin.sessionCheck,{roomId})
  const update=()=>{try{const value=watch.localQueryResult();if(value)onResult({kind:'verified',capabilities:value.capabilities})}catch(error){const failure=safeAuthFailure(error);onResult({kind:failure.kind==='mfa-required'||failure.kind==='unauthenticated'?'denied':'temporary'})}}
  const stop=watch.onUpdate(update);update();return stop
 }
 const reload:ComponentProps<typeof AdminRoom>['reload']=async()=>{
  if(!ready)throw Error('Connection unavailable')
  const result=await client.query(api.adminPanels.bootstrap,{roomId,skipClaim:true,nonce:Date.now()})
  if(result.kind!=='ready')return null
  const {identity,dashboard,panels}=result
  return {identity,dashboard:{...props.initial.dashboard,...dashboard,...panels,metrics:panels.metrics??[],contacts:panels.contacts??[],questions:panels.questions??[]}}
 }
 return <AdminRoom {...props} verifySession={verifySession} subscribeSession={subscribeSession} reload={reload}
   createLink={async input=>{if(!ready)return null;const parsed=linkInput.safeParse({...input,roomId});if(!parsed.success)return null;const data=parsed.data;try{const r=await client.action(api.access.createLink,{...data,roomId});return r?{url:location.origin+'/invite#'+r.token,link:{id:r.id,label:data.label,targets:data.targets,email:data.email?.toLowerCase()??null,startsAt:data.startsAt,expiresAt:data.expiresAt,grantUntil:data.grantUntil??null,maxUses:data.maxUses,uses:0,active:data.startsAt<=Date.now()&&data.expiresAt>Date.now(),revoked:false}}:null}catch{return null}}}
   
   touch={async()=>{if(!ready)throw Error('Connection unavailable');return client.mutation(api.mfa.touch,{})}}
   command={async data=>{if(!ready)return {ok:false,reason:'connection-pending'};return executeCommand({fetchAuthMutation:(m,args)=>client.mutation(m,args)},data)}}/>
}
