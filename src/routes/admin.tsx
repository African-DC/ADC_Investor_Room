import { createFileRoute,redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader,setResponseHeaders } from '@tanstack/react-start/server'
import { z } from 'zod'
import { getAuthBridge } from '../lib/auth-server'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { adminCommand } from '../features/admin/contracts'
import { AdminRoom } from '../features/admin/AdminRoom'
const headers=()=>({'Cache-Control':'private, no-store','Vary':'Cookie, Authorization','Referrer-Policy':'no-referrer'})
const search=z.object({roomId:z.string().max(128).optional()})
const load=createServerFn({method:'GET'}).validator(search).handler(async({data})=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge()
 if(!bridge||(process.env.ADC_STAGING_ADMIN_UI!=='true'||process.env.VERCEL_ENV==='production'))return null
 try{
  const identity=await bridge.fetchAuthQuery(api.admin.rooms,{})
  if(!identity)return null
  const room=data.roomId?identity.rooms.find(r=>r.id===data.roomId):identity.rooms[0]
  if(!room)return null
  const dashboard=await bridge.fetchAuthQuery(api.admin.dashboard,{roomId:room.id})
  const metrics=await bridge.fetchAuthQuery(api.finance.adminList,{roomId:room.id});const contacts=await bridge.fetchAuthQuery(api.crm.list,{roomId:room.id});const questions=await bridge.fetchAuthQuery(api.qa.adminList,{roomId:room.id});return {identity,dashboard:{...dashboard,metrics,contacts,questions,uploadEnabled:process.env.ADC_UPLOAD_ENABLED==='true'}}
 }catch{return null}
})
const command=createServerFn({method:'POST'}).validator(adminCommand).handler(async({data})=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge(),origin=process.env.ADC_APP_ORIGIN
 if(!bridge||(process.env.ADC_STAGING_ADMIN_UI!=='true'||process.env.VERCEL_ENV==='production')||!origin||getRequestHeader('origin')!==origin)return {ok:false}
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
   case 'archive':await bridge.fetchAuthMutation(api.admin.archive,{roomId,sectionId:data.sectionId as Id<'sections'>});break
  }
  return {ok:true}
 }catch{return {ok:false}}
})
const history=createServerFn({method:'GET'}).validator(z.object({roomId:z.string().max(128),profileId:z.string().max(128)})).handler(async({data})=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge()
 if(!bridge||process.env.ADC_STAGING_ADMIN_UI!=='true'||process.env.VERCEL_ENV==='production')return null
 try{return await bridge.fetchAuthQuery(api.crm.history,{roomId:data.roomId as Id<'rooms'>,profileId:data.profileId as Id<'investorProfiles'>})}catch{return null}
})
const questionRead=createServerFn({method:'GET'}).validator(z.object({roomId:z.string().max(128),questionId:z.string().max(128)})).handler(async({data})=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge()
 if(!bridge||process.env.ADC_STAGING_ADMIN_UI!=='true'||process.env.VERCEL_ENV==='production')return null
 try{return await bridge.fetchAuthQuery(api.qa.adminRead,{roomId:data.roomId as Id<'rooms'>,questionId:data.questionId as Id<'questions'>})}catch{return null}
})
export const Route=createFileRoute('/admin')({headers,validateSearch:search,beforeLoad:async({search})=>{
 const state=await load({data:search});if(!state)throw redirect({to:'/'});return {state}
},component:Page})
function Page(){const {state}=Route.useRouteContext();return <AdminRoom key={state.dashboard.room.id} initial={state} reload={()=>load({data:{roomId:state.dashboard.room.id}})} command={data=>command({data})} history={profileId=>history({data:{roomId:state.dashboard.room.id,profileId}})} questionRead={questionId=>questionRead({data:{roomId:state.dashboard.room.id,questionId}})}/>}
