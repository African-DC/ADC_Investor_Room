import { query,mutation } from './_generated/server'
import type { QueryCtx,MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { v } from 'convex/values'
import { authComponent } from './auth'
import { permits,currentPublication } from './lib/roomPolicy'
const MAX_GRANTS=200,MAX_SECTIONS=100,MAX_ACCEPTANCES=100
export async function identity(ctx:QueryCtx|MutationCtx){
 const user=await authComponent.safeGetAuthUser(ctx)
 return user?.emailVerified?user:null
}
export async function grantsFor(ctx:QueryCtx|MutationCtx,userId:string,roomId?:Id<'rooms'>){
 const result=await (roomId?ctx.db.query('accessGrants').withIndex('by_user_room',q=>q.eq('authUserId',userId).eq('roomId',roomId)):ctx.db.query('accessGrants').withIndex('by_user_room',q=>q.eq('authUserId',userId))).take(MAX_GRANTS+1)
 if(result.length>MAX_GRANTS)throw new Error('Access review required')
 return result
}
export async function acceptance(ctx:QueryCtx|MutationCtx,userId:string,roomId:Id<'rooms'>,version?:string){
 if(!version)return undefined
 const rows=await ctx.db.query('ndaAcceptances').withIndex('by_user_room',q=>q.eq('authUserId',userId).eq('roomId',roomId)).take(MAX_ACCEPTANCES+1)
 if(rows.length>MAX_ACCEPTANCES)throw new Error('Access review required')
 return rows.find(r=>r.version===version)?.version
}
// Server-only helper; user identity is obtained from Better Auth by the public wrapper.
export async function overviewForIdentity(ctx:QueryCtx,user:{_id:string;name:string},roomId?:Id<'rooms'>){
 const now=Date.now(),grants=await grantsFor(ctx,user._id)
 const roomIds=[...new Set(grants.filter(g=>g.capability==='room:read'&&g.effect==='allow').map(g=>g.roomId))]
 const rooms=[]
 for(const id of roomIds){
  const room=await ctx.db.get(id)
  if(room&&permits(user._id,room,grants,now,'room:read',undefined,undefined,true))rooms.push({id:room._id,name:room.name})
 }
 const selected=roomId?rooms.find(r=>r.id===roomId):rooms[0]
 const basic={name:user.name,rooms}
 if(!selected)return {...basic,room:null,nda:null,sections:[]}
 const room=await ctx.db.get(selected.id)
 if(!room)return {...basic,room:null,nda:null,sections:[]}
 const accepted=await acceptance(ctx,user._id,room._id,room.ndaVersion)
 if(!permits(user._id,room,grants,now,'room:read',undefined,accepted)){
  const nda=room.ndaVersion&&room.ndaTextFr&&room.ndaTextEn?{version:room.ndaVersion,textFr:room.ndaTextFr,textEn:room.ndaTextEn}:null
  return {...basic,room:selected,nda,sections:[]}
 }
 const sections=await ctx.db.query('sections').withIndex('by_room',q=>q.eq('roomId',room._id)).take(MAX_SECTIONS+1)
 if(sections.length>MAX_SECTIONS)throw new Error('Content review required')
 const allowed=[]
 for(const section of sections){
  if(!section.publishedVersionId||!permits(user._id,room,grants,now,'section:read',section._id,accepted))continue
  const version=await ctx.db.get(section.publishedVersionId)
  const projection=currentPublication(section,version)
  if(projection)allowed.push({...projection,versionId:version!._id,slug:section.slug,category:section.category,order:section.order})
 }
 return {...basic,room:selected,nda:null,sections:allowed.sort((a,b)=>a.order-b.order)}
}
export const overview=query({args:{roomId:v.optional(v.id('rooms'))},handler:async(ctx,args)=>{
 if(process.env.ADC_CONVEX_PORTAL_ENABLED!=='true')return null
 const user=await identity(ctx)
 return user?await overviewForIdentity(ctx,user,args.roomId):null
}})
export const acceptNda=mutation({args:{roomId:v.id('rooms'),version:v.string(),accepted:v.literal(true)},handler:async(ctx,args)=>{
 if(process.env.ADC_CONVEX_PORTAL_ENABLED!=='true')throw new Error('Unavailable')
 const user=await identity(ctx)
 if(!user)throw new Error('Unauthorized')
 const room=await ctx.db.get(args.roomId)
 const grants=await grantsFor(ctx,user._id,args.roomId)
 if(!room||!permits(user._id,room,grants,Date.now(),'room:read',undefined,undefined,true)||room.ndaVersion!==args.version||!room.ndaTextFr||!room.ndaTextEn)throw new Error('Unavailable')
 if(await acceptance(ctx,user._id,room._id,room.ndaVersion))return {ok:true}
 const now=Date.now()
 await ctx.db.insert('ndaAcceptances',{authUserId:user._id,roomId:room._id,version:args.version,acceptedAt:now})
 await ctx.db.insert('auditLogs',{actorId:user._id,event:'nda.accepted',resourceId:room._id,at:now})
 return {ok:true}
}})
