import {useConvexAuth,usePaginatedQuery,useQuery} from 'convex/react'
import {api} from '../../../convex/_generated/api'
import type {Id} from '../../../convex/_generated/dataModel'
import {EmailLog} from './EmailLog'
import {CrmBoard} from '../crm/CrmBoard'
import {AnalyticsPanel} from '../analytics/AnalyticsPanel'
import type {ComponentProps} from 'react'
export function LiveEmailLog(props:Omit<ComponentProps<typeof EmailLog>,'rows'|'pagination'>){
 const {isAuthenticated,isLoading}=useConvexAuth()
 const result=usePaginatedQuery(api.outbox.page,isAuthenticated&&!isLoading?{roomId:props.roomId as Id<'rooms'>}:'skip',{initialNumItems:25})
 if(!isAuthenticated||isLoading)return <p role="status">Vérification de la connexion…</p>
 return <EmailLog {...props} rows={result.results} pagination={{status:result.status,loadMore:()=>result.loadMore(25)}}/>
}
export function LiveCrm(props:Omit<ComponentProps<typeof CrmBoard>,'contacts'>){
 const {isAuthenticated,isLoading}=useConvexAuth()
 const contacts=useQuery(api.crm.list,isAuthenticated&&!isLoading?{roomId:props.roomId as Id<'rooms'>}:'skip')
 if(!isAuthenticated||isLoading||contacts===undefined)return <p role="status">Chargement des contacts…</p>
 return <CrmBoard {...props} contacts={contacts}/>
}
export function LiveAnalytics({roomId}:{roomId:string}){
 const {isAuthenticated,isLoading}=useConvexAuth()
 const data=useQuery(api.analytics.dashboard,isAuthenticated&&!isLoading?{roomId:roomId as Id<'rooms'>,days:30}:'skip')
 if(!isAuthenticated||isLoading||data===undefined)return <p role="status">Chargement des statistiques…</p>
 return <AnalyticsPanel data={data}/>
}
