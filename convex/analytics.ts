import {query,mutation,internalMutation} from './_generated/server'
import type {QueryCtx,MutationCtx} from './_generated/server'
import type {Id} from './_generated/dataModel'
import {v} from 'convex/values'
import {admin} from './admin'
import {identity,grantsFor,acceptance} from './portal'
import {permits,currentPublication} from './lib/roomPolicy'
import {retentionDays,utcDay,summarize} from '../src/features/analytics/model'
import type {EngagementKind} from '../src/features/analytics/model'
function enabled(){return process.env.ADC_CONVEX_ANALYTICS_ENABLED==='true'&&process.env.ADC_CONVEX_PORTAL_ENABLED==='true'}
async function scope(ctx:QueryCtx|MutationCtx,roomId:Id<'rooms'>,userId:string){
 const room=await ctx.db.get(roomId);if(!room)return null
 const grants=await grantsFor(ctx,userId,roomId),nda=await acceptance(ctx,userId,roomId,room.ndaVersion)
 return permits(userId,room,grants,Date.now(),'room:read',undefined,nda)?{room,grants,nda}:null
}
async function preference(ctx:QueryCtx|MutationCtx,roomId:Id<'rooms'>,authUserId:string){
 return ctx.db.query('analyticsPreferences').withIndex('by_room_user',q=>q.eq('roomId',roomId).eq('authUserId',authUserId)).unique()
}
async function setPreference(ctx:MutationCtx,roomId:Id<'rooms'>,userId:string,allowed:boolean){
 if(allowed&&!await scope(ctx,roomId,userId))throw Error('Unavailable')
 const prior=await preference(ctx,roomId,userId)
 if(prior)await ctx.db.patch(prior._id,{allowed,updatedAt:Date.now()});else await ctx.db.insert('analyticsPreferences',{roomId,authUserId:userId,allowed,updatedAt:Date.now()})
 return {ok:true}
}
// Called only after resource authorization; deduplicated by UTC day/user/resource/kind.
export async function recordAuthorized(ctx:MutationCtx,roomId:Id<'rooms'>,authUserId:string,kind:EngagementKind,resourceId:string){
 if(!enabled()||!(await preference(ctx,roomId,authUserId))?.allowed)return
 const at=Date.now(),day=utcDay(at)
 const prior=await ctx.db.query('engagement').withIndex('by_dedup',q=>q.eq('roomId',roomId).eq('authUserId',authUserId).eq('day',day).eq('kind',kind).eq('resourceId',resourceId)).unique()
 if(!prior)await ctx.db.insert('engagement',{roomId,authUserId,day,kind,resourceId,at})
}
async function openSection(ctx:MutationCtx,roomId:Id<'rooms'>,sectionId:Id<'sections'>,userId:string){
 const access=await scope(ctx,roomId,userId)
 const section=await ctx.db.get(sectionId)
 if(!access||!section||section.roomId!==roomId||!section.publishedVersionId||!permits(userId,access.room,access.grants,Date.now(),'section:read',sectionId,access.nda)||!currentPublication(section,await ctx.db.get(section.publishedVersionId)))return {ok:false}
 await recordAuthorized(ctx,roomId,userId,'section_open',sectionId);return {ok:true}
}
export const settings=query({args:{roomId:v.id('rooms')},handler:async(ctx,a)=>{
 const user=await identity(ctx);if(!enabled()||!user||!await scope(ctx,a.roomId,user._id))return null
 return {allowed:(await preference(ctx,a.roomId,user._id))?.allowed??false}
}})
export const consent=mutation({args:{roomId:v.id('rooms'),allowed:v.boolean()},handler:async(ctx,a)=>{
 const user=await identity(ctx);if(!user||(a.allowed&&!enabled()))throw Error('Unavailable')
 return setPreference(ctx,a.roomId,user._id,a.allowed)
}})
export const sectionOpen=mutation({args:{roomId:v.id('rooms'),sectionId:v.id('sections')},handler:async(ctx,a)=>{
 const user=await identity(ctx);if(!enabled()||!user)return {ok:false}
 return openSection(ctx,a.roomId,a.sectionId,user._id)
}})
export const dashboard=query({args:{roomId:v.id('rooms'),days:v.union(v.literal(7),v.literal(30),v.literal(90))},handler:async(ctx,a)=>{
 const {membership}=await admin(ctx,a.roomId)
 if(!enabled()||!membership.capabilities.includes('analytics:read'))return null
 const start=utcDay(Date.now()-(a.days-1)*86400000)
 const raw=await ctx.db.query('engagement').withIndex('by_room_day',q=>q.eq('roomId',a.roomId).gte('day',start)).take(5001)
 if(raw.length>5000)return {limited:true as const}
 const rows=raw.filter(r=>r.at>=Date.now()-retentionDays*86400000)
 const totals=summarize(rows),resources=[]
 for(const item of totals.resources.slice(0,30)){
  const sectionId=item.kind==='section_open'?ctx.db.normalizeId('sections',item.resourceId):null
  const documentId=item.kind!=='section_open'?ctx.db.normalizeId('documents',item.resourceId):null
  const s=sectionId?await ctx.db.get(sectionId):null,d=documentId?await ctx.db.get(documentId):null
  resources.push({kind:item.kind,count:item.count,label:s&&s.roomId===a.roomId?s.slug:d&&d.roomId===a.roomId?d.titleFr:'Ressource retirée'})
 }
 return {limited:false as const,participants:totals.participants,events:totals.events,sections:totals.sections,views:totals.views,downloads:totals.downloads,days:totals.days,resources}
}})
export const purge=internalMutation({args:{},handler:async ctx=>{
 const expired=await ctx.db.query('engagement').withIndex('by_at',q=>q.lt('at',Date.now()-retentionDays*86400000)).take(200)
 for(const row of expired)await ctx.db.delete(row._id)
 return {deleted:expired.length,more:expired.length===200}
}})
export const fixtureConsent=internalMutation({args:{roomId:v.id('rooms'),actor:v.string(),allowed:v.boolean()},handler:async(ctx,a)=>{if(process.env.ADC_STAGING_CMS!=='true')throw Error('Unavailable');return setPreference(ctx,a.roomId,a.actor,a.allowed)}})
export const fixtureSection=internalMutation({args:{roomId:v.id('rooms'),sectionId:v.id('sections'),actor:v.string()},handler:async(ctx,a)=>{if(process.env.ADC_STAGING_CMS!=='true')throw Error('Unavailable');return openSection(ctx,a.roomId,a.sectionId,a.actor)}})
