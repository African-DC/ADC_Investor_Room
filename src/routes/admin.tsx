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
import { targetsFor,draftText } from '../features/technical/model'
import { getTechnicalSnapshot } from '../server/githubReporting'
import { AdminRoom } from '../features/admin/AdminRoom'
import { JourneyFrame } from '../features/onboarding/JourneyFrame'
import { useEffect,useState } from 'react'
import { MfaGate } from '../features/admin/MfaGate'
const headers=()=>({'Cache-Control':'private, no-store','Vary':'Cookie, Authorization','Referrer-Policy':'no-referrer'})
// Admin UI is allowed wherever the flag is on: every privileged Convex call enforces session-bound TOTP MFA.
// A missing capability for one panel must not break the whole back office.
async function safe<T>(p:Promise<T>,panel='optional'):Promise<T|null>{try{return await p}catch(error){console.warn('[adc:panel] read failed',{panel,...safeAuthFailure(error)});return null}}
const adminAllowed=()=>process.env.ADC_STAGING_ADMIN_UI==='true'
const search=z.object({roomId:z.string().max(128).optional()})
const load=createServerFn({method:'GET'}).validator(search).handler(async({data})=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge()
 if(!bridge||!adminAllowed())return null
 let stage='token'
 try{
  if(!await bridge.getToken())return {problem:'signin' as const}
  stage='mfa-status'
  let mfa=await bridge.fetchAuthQuery(api.mfa.status,{})
  // Existing administrators should never be locked out by a failed invitation claim.
  // For new members, claiming is still mandatory and remains verified-email gated.
  if(!mfa||!data.roomId){
   stage='invitation-claim'
   try{await bridge.fetchAuthMutation(api.team.claim,{});if(!mfa){stage='mfa-status';mfa=await bridge.fetchAuthQuery(api.mfa.status,{})}}
   catch(error){if(!mfa)throw error;const failure=safeAuthFailure(error);console.warn('[adc:admin] invitation claim deferred',failure);if(failure.kind==='rate-limit')throw error}
  }
  if(!mfa)return {problem:'membership' as const}
  if(!mfa.verified)return {mfa} as const
  stage='room-membership'
  const identity=await bridge.fetchAuthQuery(api.admin.rooms,{})
  if(!identity)return {problem:'membership' as const}
  const room=data.roomId?identity.rooms.find(r=>r.id===data.roomId):identity.rooms[0]
  if(!room)return {problem:'membership' as const}
  stage='dashboard'
  const dashboard=await bridge.fetchAuthQuery(api.admin.dashboard,{roomId:room.id})
  const has=(...caps:string[])=>caps.some(c=>(dashboard.capabilities as readonly string[]).includes(c))
  const args={roomId:room.id}
  const metrics=has('finance:edit','finance:review')?await safe(bridge.fetchAuthQuery(api.finance.adminList,args),'finance'):null
  const contacts=has('crm:read','crm:edit')?await safe(bridge.fetchAuthQuery(api.crm.list,args),'crm'):null
  const questions=has('qa:read','qa:reply')?await safe(bridge.fetchAuthQuery(api.qa.adminList,args),'qa'):null
  const analytics=has('analytics:read')?await safe(bridge.fetchAuthQuery(api.analytics.dashboard,{...args,days:30}),'analytics'):null
  const access=has('access:manage')?await safe(bridge.fetchAuthQuery(api.access.overview,args),'access'):null
  const team=has('access:manage')?await safe(bridge.fetchAuthQuery(api.team.list,args),'team'):null
  const emails=has('access:manage')?await safe(bridge.fetchAuthQuery(api.outbox.list,args),'emails'):null
  const nda=has('access:manage')?await safe(bridge.fetchAuthQuery(api.nda.adminView,args),'nda'):null;const technicalTargets=dashboard.capabilities.includes('technical:read')&&process.env.ADC_GITHUB_REPORTING_ENABLED==='true'?targetsFor(process.env.ADC_GITHUB_TARGETS,room.id).map(t=>({key:t.key,label:t.label})):[];return {identity,dashboard:{...dashboard,metrics:metrics??[],contacts:contacts??[],questions:questions??[],analytics,access,team,emails,nda,technicalTargets,uploadEnabled:process.env.ADC_UPLOAD_ENABLED==='true',manualScan:process.env.ADC_MANUAL_SCAN_ALLOWED==='true'}}
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
 const roomId=data.roomId as Id<'rooms'>
 try{
  switch(data.kind){
   case 'financeDraft':await bridge.fetchAuthMutation(api.finance.draft,{roomId,sectionId:data.sectionId as Id<'sections'>,kind:data.metricKind,scope:data.scope,periodStart:data.periodStart,periodEnd:data.periodEnd,definitionFr:data.definitionFr,definitionEn:data.definitionEn,value:data.value,unit:data.unit,evidenceVersionIds:data.evidenceVersionIds as Id<'documentVersions'>[]});break
   case 'financeTransition':await bridge.fetchAuthMutation(api.finance.transition,{roomId,metricId:data.metricId as Id<'financialMetrics'>,action:data.action});break
   case 'documentTransition':if(data.action==='publish')await bridge.fetchAuthMutation(api.documents.adminPublish,{roomId,documentId:data.documentId as Id<'documents'>});else await bridge.fetchAuthMutation(api.documents.adminArchive,{roomId,documentId:data.documentId as Id<'documents'>});break
   case 'crmUpdate':await bridge.fetchAuthMutation(api.crm.update,{roomId,profileId:data.profileId as Id<'investorProfiles'>,stage:data.stage,nextAction:data.nextAction,dueDate:data.dueDate,assignToMe:data.assignToMe,expectedRevision:data.expectedRevision});break
   case 'crmNote':await bridge.fetchAuthMutation(api.crm.note,{roomId,profileId:data.profileId as Id<'investorProfiles'>,text:data.text});break
   case 'qaReply':await bridge.fetchAuthMutation(api.qa.adminReply,{roomId,questionId:data.questionId as Id<'questions'>,body:data.body});break
   case 'qaClose':await bridge.fetchAuthMutation(api.qa.close,{roomId,questionId:data.questionId as Id<'questions'>});break
   case 'grant':await bridge.fetchAuthMutation(api.admin.grant,{roomId,profileId:data.profileId as Id<'investorProfiles'>,capability:data.capability,sectionId:data.sectionId as Id<'sections'>|undefined,effect:data.effect,expiresAt:data.expiresAt});break
   case 'grantDocument':await bridge.fetchAuthMutation(api.admin.grantDocument,{roomId,profileId:data.profileId as Id<'investorProfiles'>,documentId:data.documentId as Id<'documents'>,capability:data.capability,effect:data.effect,expiresAt:data.expiresAt});break
   case 'revoke':await bridge.fetchAuthMutation(api.admin.revoke,{roomId,grantId:data.grantId as Id<'accessGrants'>});break
   case 'draft':{const {kind,roomId:_,...fields}=data;void kind;void _;await bridge.fetchAuthMutation(api.admin.draft,{...fields,roomId});break}
   case 'transition':await bridge.fetchAuthMutation(api.admin.transition,{roomId,versionId:data.versionId as Id<'sectionVersions'>,action:data.action});break
   case 'setAccess':await bridge.fetchAuthMutation(api.access.setAccess,{roomId,profileIds:data.profileIds as Id<'investorProfiles'>[],targets:data.targets,effect:data.effect,startsAt:data.startsAt,expiresAt:data.expiresAt,groupId:data.groupId as Id<'investorGroups'>|undefined});break
   case 'revokeMany':await bridge.fetchAuthMutation(api.access.revokeMany,{roomId,grantIds:data.grantIds as Id<'accessGrants'>[]});break
   case 'saveGroup':await bridge.fetchAuthMutation(api.access.saveGroup,{roomId,groupId:data.groupId as Id<'investorGroups'>|undefined,name:data.name,profileIds:data.profileIds as Id<'investorProfiles'>[]});break
   case 'deleteGroup':await bridge.fetchAuthMutation(api.access.deleteGroup,{roomId,groupId:data.groupId as Id<'investorGroups'>});break
   case 'roomStatus':await bridge.fetchAuthMutation(api.access.setRoomStatus,{roomId,status:data.status});break
   case 'manualReview':await bridge.fetchAuthMutation(api.documents.attestManualReview,{roomId,documentId:data.documentId as Id<'documents'>,sha256:data.sha256,verdict:data.verdict});break
   case 'teamInvite':return {ok:true,invite:await bridge.fetchAuthMutation(api.team.inviteWithReceipt,{roomId,email:data.email,capabilities:data.capabilities})}
   case 'teamSetCaps':await bridge.fetchAuthMutation(api.team.setCapabilities,{roomId,membershipId:data.membershipId as Id<'stagingAdminMemberships'>,capabilities:data.capabilities});break
   case 'teamRevoke':await bridge.fetchAuthMutation(api.team.revokeMember,{roomId,membershipId:data.membershipId as Id<'stagingAdminMemberships'>});break
   case 'teamRevokeInvite':await bridge.fetchAuthMutation(api.team.revokeInvite,{roomId,inviteId:data.inviteId as Id<'adminInvites'>});break
   case 'retryEmail':await bridge.fetchAuthMutation(api.outbox.retry,{roomId,id:data.emailId as Id<'emailOutbox'>});break
   case 'ndaPublish':await bridge.fetchAuthMutation(api.nda.publish,{roomId,textFr:data.textFr,textEn:data.textEn});break
   case 'ndaRemove':await bridge.fetchAuthMutation(api.nda.remove,{roomId});break
   case 'revokeLink':await bridge.fetchAuthMutation(api.access.revokeLink,{roomId,linkId:data.linkId as Id<'accessLinks'>});break
   case 'archive':await bridge.fetchAuthMutation(api.admin.archive,{roomId,sectionId:data.sectionId as Id<'sections'>});break
  }
  return {ok:true}
 }catch(error){console.warn('[adc:admin] command failed',{command:data.kind,...safeAuthFailure(error)});return {ok:false}}
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
function Page(){const {state}=Route.useRouteContext();if(state.problem)return <AdminProblem problem={state.problem}/>;if(state.mfa)return <MfaGate status={state.mfa} begin={()=>mfaBegin()} confirm={code=>mfaConfirm({data:{code}})} verify={code=>mfaVerify({data:{code}})}/>;return <AdminRoom uploadImage={f=>uploadImage({data:{...f,roomId:state.dashboard.room.id}})} reviewUrl={documentId=>reviewUrl({data:{roomId:state.dashboard.room.id,documentId}})} createLink={d=>createLink({data:{...d,roomId:state.dashboard.room.id}})} key={state.dashboard.room.id} initial={state} verifySession={()=>verifySession({data:{roomId:state.dashboard.room.id}})} touch={()=>touch()} reload={async()=>{const next=await load({data:{roomId:state.dashboard.room.id}});if(next?.problem==='throttled')throw Error('rate-limit');if(next?.problem==='unavailable')throw Error('Temporary refresh failure');return next&&!next.mfa&&!next.problem?next:null}} command={data=>command({data})} history={profileId=>history({data:{roomId:state.dashboard.room.id,profileId}})} questionRead={questionId=>questionRead({data:{roomId:state.dashboard.room.id,questionId}})} technical={(key,draft)=>technical({data:{roomId:state.dashboard.room.id,key,draft}})}/>}
