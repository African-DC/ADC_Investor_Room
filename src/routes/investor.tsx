import { createFileRoute,redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader,setResponseHeaders } from '@tanstack/react-start/server'
import { z } from 'zod'
import { getAuthBridge } from '../lib/auth-server'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { selectPassages } from '../server/intelligence'
import { unchanged } from '../features/intelligence/retrieval'
import type { Answer } from '../features/intelligence/retrieval'
import { InvestorRoom } from '../features/portal/InvestorRoom'
import {LiveConvex,liveConvexEnabled} from '../lib/LiveConvex'
import {useConvex,useConvexAuth} from 'convex/react'
import type {ComponentProps} from 'react'
const headers=()=>({'Cache-Control':'private, no-store','Vary':'Cookie, Authorization','Referrer-Policy':'no-referrer'})
const roomSearch=z.object({roomId:z.string().max(128).optional()})
const getOverview=createServerFn({method:'GET'}).validator(roomSearch).handler(async({data})=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge()
 if(!bridge||process.env.ADC_PORTAL_ENABLED!=='true')return null
 try{if(!await bridge.getToken())return null;const overview=await bridge.fetchAuthQuery(api.portal.overview,{roomId:data.roomId as Id<'rooms'>|undefined});if(!overview)return null;const documents=overview.room&&!overview.nda&&process.env.ADC_DOCUMENTS_ENABLED==='true'?await bridge.fetchAuthQuery(api.documents.list,{roomId:overview.room.id}):[];const metrics=overview.room&&!overview.nda&&process.env.ADC_FINANCE_ENABLED==='true'?await bridge.fetchAuthQuery(api.finance.published,{roomId:overview.room.id}):[];const qaEnabled=!!overview.room&&!overview.nda&&process.env.ADC_QA_ENABLED==='true';const questions=qaEnabled&&overview.room?await bridge.fetchAuthQuery(api.qa.list,{roomId:overview.room.id}):[];const analytics=overview.room&&!overview.nda&&process.env.ADC_ANALYTICS_ENABLED==='true'?await bridge.fetchAuthQuery(api.analytics.settings,{roomId:overview.room.id}):null;return {...overview,documents,metrics,qaEnabled,questions,analytics,transportFlags:{documents:process.env.ADC_DOCUMENTS_ENABLED==='true',finance:process.env.ADC_FINANCE_ENABLED==='true',qa:process.env.ADC_QA_ENABLED==='true',analytics:process.env.ADC_ANALYTICS_ENABLED==='true',ai:process.env.ADC_AI_ENABLED==='true'},aiEnabled:!!overview.room&&!overview.nda&&process.env.ADC_AI_ENABLED==='true',aiExternal:process.env.ADC_AI_GATEWAY_APPROVED==='true'&&process.env.VERCEL_ENV!=='production'}}catch{throw Error('Temporary portal refresh failure')}
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
const askIntelligence=createServerFn({method:'POST'}).validator(z.object({roomId:z.string().max(128),question:z.string().trim().min(3).max(600),lang:z.enum(['fr','en']),externalConsent:z.boolean()})).handler(async({data}):Promise<Answer>=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge(),origin=process.env.ADC_APP_ORIGIN
 const unavailable:Answer={status:'unavailable',sources:[]},empty:Answer={status:'no_evidence',sources:[]}
 if(!bridge||!origin||getRequestHeader('origin')!==origin||process.env.ADC_PORTAL_ENABLED!=='true'||process.env.ADC_AI_ENABLED!=='true')return unavailable
 const roomId=data.roomId as Id<'rooms'>,args={roomId,question:data.question,lang:data.lang,includeFinance:process.env.ADC_FINANCE_ENABLED==='true'}
 try{
  const quota=await bridge.fetchAuthMutation(api.intelligence.quota,{roomId})
  if(!quota.ok)return quota.limit?{status:'limit',sources:[]}:unavailable
  const candidates=await bridge.fetchAuthQuery(api.intelligence.sources,args)
  if(!candidates)return unavailable
  if(!candidates.length)return empty
  const selected=await selectPassages(data.question,candidates,data.externalConsent)
  if(!selected.length)return empty
  const current=await bridge.fetchAuthQuery(api.intelligence.sources,args)
  if(!current||!unchanged(selected,current))return unavailable
  return {status:'ok',sources:selected.map(({sectionId,title,text,kind})=>({sectionId,title,text,kind}))}
 }catch{return unavailable}
})
export const Route=createFileRoute('/investor')({headers,validateSearch:roomSearch,beforeLoad:async({search})=>{
 const data=await getOverview({data:search});if(!data)throw redirect({to:'/connexion',search:{next:'/investor'}});return {overview:data}
},component:Page})
function Page(){
 const {overview}=Route.useRouteContext()
 return <InvestorTransport flags={overview.transportFlags} key={overview.room?.id??'none'} initial={overview} refresh={roomId=>getOverview({data:{roomId}})} acceptNda={(roomId,version)=>accept({data:{roomId,version,accepted:true}})} questionRead={(roomId,questionId)=>questionRead({data:{roomId,questionId}})} engagement={(data)=>engagement({data})} intelligence={data=>askIntelligence({data})} questionSend={(roomId,a)=>a.kind==='close'?Promise.resolve({ok:false}):questionSend({data:{...a,roomId}})}/>
}

type InvestorFlags={documents:boolean;finance:boolean;qa:boolean;analytics:boolean;ai:boolean}
type InvestorProps=ComponentProps<typeof InvestorRoom>&{flags:InvestorFlags}
function InvestorTransport(props:InvestorProps){
 if(!liveConvexEnabled())return <InvestorRoom {...props}/>
 return <LiveConvex><SocketInvestor {...props}/></LiveConvex>
}
function SocketInvestor({flags,...props}:InvestorProps){
 const client=useConvex(),auth=useConvexAuth(),ready=auth.isAuthenticated&&!auth.isLoading
 const refresh:InvestorProps['refresh']=async id=>{
  if(!ready)throw Error('Connection unavailable')
  const overview=await client.query(api.portal.overview,{roomId:id as Id<'rooms'>|undefined,nonce:Date.now()})
  if(!overview)return null
  const roomId=overview.room?.id,allowed=!!roomId&&!overview.nda
  const [documents,metrics,questions,analytics]=await Promise.all([
   roomId&&allowed&&flags.documents?client.query(api.documents.list,{roomId}):[],
   roomId&&allowed&&flags.finance?client.query(api.finance.published,{roomId}):[],
   roomId&&allowed&&flags.qa?client.query(api.qa.list,{roomId}):[],
   roomId&&allowed&&flags.analytics?client.query(api.analytics.settings,{roomId}):null
  ])
  return {...overview,documents,metrics,questions,analytics,qaEnabled:allowed&&flags.qa,aiEnabled:allowed&&flags.ai,aiExternal:props.initial.aiExternal}
 }
 return <InvestorRoom {...props} refresh={refresh}/>
}
