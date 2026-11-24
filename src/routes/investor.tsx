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
 try{const overview=await bridge.fetchAuthQuery(api.portal.overview,{roomId:data.roomId as Id<'rooms'>|undefined});if(!overview)return null;const documents=overview.room&&!overview.nda&&process.env.ADC_DOCUMENTS_ENABLED==='true'?await bridge.fetchAuthQuery(api.documents.list,{roomId:overview.room.id}):[];const metrics=overview.room&&!overview.nda&&process.env.ADC_FINANCE_ENABLED==='true'?await bridge.fetchAuthQuery(api.finance.published,{roomId:overview.room.id}):[];return {...overview,documents,metrics}}catch{return null}
})
const accept=createServerFn({method:'POST'}).validator(z.object({roomId:z.string().max(128),version:z.string().max(100),accepted:z.literal(true)})).handler(async({data})=>{
 setResponseHeaders(new Headers(headers()))
 const expected=process.env.ADC_APP_ORIGIN
 if(!expected||getRequestHeader('origin')!==expected||process.env.ADC_PORTAL_ENABLED!=='true')return {ok:false}
 const bridge=getAuthBridge();if(!bridge)return {ok:false}
 try{return await bridge.fetchAuthMutation(api.portal.acceptNda,{...data,roomId:data.roomId as Id<'rooms'>})}catch{return {ok:false}}
})
export const Route=createFileRoute('/investor')({headers,validateSearch:roomSearch,beforeLoad:async({search})=>{
 const data=await getOverview({data:search});if(!data)throw redirect({to:'/'});return {overview:data}
},component:Page})
function Page(){
 const {overview}=Route.useRouteContext()
 return <InvestorRoom key={overview.room?.id??'none'} initial={overview} refresh={roomId=>getOverview({data:{roomId}})} acceptNda={(roomId,version)=>accept({data:{roomId,version,accepted:true}})}/>
}
