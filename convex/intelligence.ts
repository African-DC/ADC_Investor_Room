import {query,mutation,internalMutation} from './_generated/server'
import type {QueryCtx,MutationCtx} from './_generated/server'
import type {Id} from './_generated/dataModel'
import {v} from 'convex/values'
import {identity,grantsFor,acceptance} from './portal'
import {permits,currentPublication} from './lib/roomPolicy'
import {publishedForIdentity} from './finance'
import {chunks,rank} from '../src/features/intelligence/retrieval'
import type {Passage} from '../src/features/intelligence/retrieval'
import {labels,formatMetric} from '../src/features/finance/registry'
function enabled(){return process.env.ADC_CONVEX_PORTAL_ENABLED==='true'&&process.env.ADC_CONVEX_AI_ENABLED==='true'}
async function access(ctx:QueryCtx|MutationCtx,roomId:Id<'rooms'>,userId:string){
 const room=await ctx.db.get(roomId);if(!room)return null
 const grants=await grantsFor(ctx,userId,roomId),nda=await acceptance(ctx,userId,roomId,room.ndaVersion)
 return permits(userId,room,grants,Date.now(),'room:read',undefined,nda)?{room,grants,nda}:null
}
export async function retrieveForIdentity(ctx:QueryCtx,roomId:Id<'rooms'>,userId:string,question:string,lang:'fr'|'en',includeFinance:boolean){
 const scope=await access(ctx,roomId,userId);if(!scope)return null
 const approved=new Set((process.env.ADC_AI_APPROVED_VERSIONS??'').split(',').map(s=>s.trim()).filter(Boolean))
 const rows=await ctx.db.query('sections').withIndex('by_room',q=>q.eq('roomId',roomId)).take(101)
 if(rows.length>100)throw Error('Content review required')
 const candidates:Passage[]=[]
 for(const section of rows){
  if(!section.publishedVersionId||!permits(userId,scope.room,scope.grants,Date.now(),'section:read',section._id,scope.nda))continue
  // Financial/traction/investment free text excluded; use the evidence-backed registry instead.
  if(['finance','traction','investment'].includes(section.category))continue
  const version=await ctx.db.get(section.publishedVersionId),p=currentPublication(section,version)
  if(!p||!version)continue
  for(const [i,text] of chunks(lang==='fr'?p.bodyFr:p.bodyEn).entries())candidates.push({key:version._id+':'+i,sectionId:section._id,version:version._id,title:lang==='fr'?p.titleFr:p.titleEn,text,kind:'section',externalApproved:approved.has(version._id)})
 }
 if(includeFinance&&process.env.ADC_CONVEX_FINANCE_ENABLED==='true'){
  for(const m of await publishedForIdentity(ctx,userId,roomId)){
   const title=labels[m.kind][lang==='fr'?0:1]
   candidates.push({key:m.id,sectionId:m.sectionId,version:m.id,title,text:title+' · '+m.scope+' · '+m.periodStart+' — '+m.periodEnd+' : '+formatMetric(m.value,m.unit,lang)+' · '+(lang==='fr'?m.definitionFr:m.definitionEn),kind:'metric',externalApproved:false})
  }
 }
 return rank(question,candidates)
}
export const sources=query({args:{roomId:v.id('rooms'),question:v.string(),lang:v.union(v.literal('fr'),v.literal('en')),includeFinance:v.boolean()},handler:async(ctx,a)=>{
 if(!enabled()||a.question.length>600||!a.question.trim())return null
 const user=await identity(ctx);return user?retrieveForIdentity(ctx,a.roomId,user._id,a.question,a.lang,a.includeFinance):null
}})
async function consume(ctx:MutationCtx,roomId:Id<'rooms'>,userId:string){
 if(!await access(ctx,roomId,userId))return {ok:false,limit:false}
 const hour=Math.floor(Date.now()/3600000),prior=await ctx.db.query('aiQuotas').withIndex('by_room_user_hour',q=>q.eq('roomId',roomId).eq('authUserId',userId).eq('hour',hour)).unique()
 if((prior?.count??0)>=10)return {ok:false,limit:true}
 if(prior)await ctx.db.patch(prior._id,{count:prior.count+1});else await ctx.db.insert('aiQuotas',{roomId,authUserId:userId,hour,count:1})
 return {ok:true,limit:false}
}
export const quota=mutation({args:{roomId:v.id('rooms')},handler:async(ctx,a)=>{
 if(!enabled())return {ok:false,limit:false}
 const user=await identity(ctx);return user?consume(ctx,a.roomId,user._id):{ok:false,limit:false}
}})
export const fixtureQuota=internalMutation({args:{roomId:v.id('rooms'),actor:v.string()},handler:async(ctx,a)=>{if(process.env.ADC_STAGING_CMS!=='true')throw Error('Unavailable');return consume(ctx,a.roomId,a.actor)}})
export const purge=internalMutation({args:{},handler:async ctx=>{
 const cutoff=Math.floor(Date.now()/3600000)-24
 const rows=await ctx.db.query('aiQuotas').withIndex('by_hour',q=>q.lt('hour',cutoff)).take(200)
 for(const r of rows)await ctx.db.delete(r._id)
 return rows.length
}})
