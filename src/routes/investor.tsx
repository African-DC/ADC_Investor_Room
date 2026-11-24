import { createFileRoute,redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader,setResponseHeaders } from '@tanstack/react-start/server'
import { z } from 'zod'
import { getAuthBridge } from '../lib/auth-server'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { InvestorRoom } from '../features/portal/InvestorRoom'
const headers=()=>({'Cache-Control':'private, no-store','Vary':'Cookie, Authorization','Referrer-Policy':'no-referrer'})
const roomSearch=z.object({roomId:z.string().max(128).optional()})
const getOverview=createServerFn({method:'GET'}).validator(roomSearch).handler(async({data})=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge()
 if(!bridge||process.env.ADC_PORTAL_ENABLED!=='true')return null
 try{const overview=await bridge.fetchAuthQuery(api.portal.overview,{roomId:data.roomId as Id<'rooms'>|undefined});if(!overview)return null;const documents=overview.room&&!overview.nda&&process.env.ADC_DOCUMENTS_ENABLED==='true'?await bridge.fetchAuthQuery(api.documents.list,{roomId:overview.room.id}):[];const metrics=overview.room&&!overview.nda&&process.env.ADC_FINANCE_ENABLED==='true'?await bridge.fetchAuthQuery(api.finance.published,{roomId:overview.room.id}):[];const qaEnabled=!!overview.room&&!overview.nda&&process.env.ADC_QA_ENABLED==='true';const questions=qaEnabled&&overview.room?await bridge.fetchAuthQuery(api.qa.list,{roomId:overview.room.id}):[];const analytics=overview.room&&!overview.nda&&process.env.ADC_ANALYTICS_ENABLED==='true'?await bridge.fetchAuthQuery(api.analytics.settings,{roomId:overview.room.id}):null;return {...overview,documents,metrics,qaEnabled,questions,analytics}}catch{return null}
})
const accept=createServerFn({method:'POST'}).validator(z.object({roomId:z.string().max(128),version:z.string().max(100),accepted:z.literal(true)})).handler(async({data})=>{
 setResponseHeaders(new Headers(headers()))
 const expected=process.env.ADC_APP_ORIGIN
 if(!expected||getRequestHeader('origin')!==expected||process.env.ADC_PORTAL_ENABLED!=='true')return {ok:false}
 const bridge=getAuthBridge();if(!bridge)return {ok:false}
 try{return await bridge.fetchAuthMutation(api.portal.acceptNda,{...data,roomId:data.roomId as Id<'rooms'>})}catch{return {ok:false}}
})
const questionRead=createServerFn({method:'GET'}).validator(z.object({roomId:z.string().max(128),questionId:z.string().max(128)})).handler(async({data})=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge()
 if(!bridge||process.env.ADC_PORTAL_ENABLED!=='true'||process.env.ADC_QA_ENABLED!=='true')return null
 try{return await bridge.fetchAuthQuery(api.qa.read,{roomId:data.roomId as Id<'rooms'>,questionId:data.questionId as Id<'questions'>})}catch{return null}
})
const questionSend=createServerFn({method:'POST'}).validator(z.discriminatedUnion('kind',[z.object({kind:z.literal('ask'),roomId:z.string().max(128),subject:z.string().trim().min(1).max(180),body:z.string().trim().min(1).max(4000)}),z.object({kind:z.literal('reply'),roomId:z.string().max(128),questionId:z.string().max(128),body:z.string().trim().min(1).max(4000)})])).handler(async({data})=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge(),origin=process.env.ADC_APP_ORIGIN
 if(!bridge||!origin||getRequestHeader('origin')!==origin||process.env.ADC_PORTAL_ENABLED!=='true'||process.env.ADC_QA_ENABLED!=='true')return {ok:false}
 const roomId=data.roomId as Id<'rooms'>
 try{return data.kind==='ask'?await bridge.fetchAuthMutation(api.qa.ask,{roomId,subject:data.subject,body:data.body}):await bridge.fetchAuthMutation(api.qa.reply,{roomId,questionId:data.questionId as Id<'questions'>,body:data.body})}catch{return {ok:false}}
})
const engagement=createServerFn({method:'POST'}).validator(z.discriminatedUnion('kind',[z.object({kind:z.literal('consent'),roomId:z.string().max(128),allowed:z.boolean()}),z.object({kind:z.literal('section'),roomId:z.string().max(128),sectionId:z.string().max(128)})])).handler(async({data})=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge(),origin=process.env.ADC_APP_ORIGIN
 if(!bridge||!origin||getRequestHeader('origin')!==origin||process.env.ADC_PORTAL_ENABLED!=='true'||process.env.ADC_ANALYTICS_ENABLED!=='true')return {ok:false}
 const roomId=data.roomId as Id<'rooms'>
 try{return data.kind==='consent'?await bridge.fetchAuthMutation(api.analytics.consent,{roomId,allowed:data.allowed}):await bridge.fetchAuthMutation(api.analytics.sectionOpen,{roomId,sectionId:data.sectionId as Id<'sections'>})}catch{return {ok:false}}
})
export const Route=createFileRoute('/investor')({headers,validateSearch:roomSearch,beforeLoad:async({search})=>{
 const data=await getOverview({data:search});if(!data)throw redirect({to:'/'});return {overview:data}
},component:Page})
function Page(){
 const {overview}=Route.useRouteContext()
 return <InvestorRoom key={overview.room?.id??'none'} initial={overview} refresh={roomId=>getOverview({data:{roomId}})} acceptNda={(roomId,version)=>accept({data:{roomId,version,accepted:true}})} questionRead={(roomId,questionId)=>questionRead({data:{roomId,questionId}})} engagement={(data)=>engagement({data})} questionSend={(roomId,a)=>a.kind==='close'?Promise.resolve({ok:false}):questionSend({data:{...a,roomId}})}/>
}
