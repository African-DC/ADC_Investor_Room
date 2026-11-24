import { query,mutation,internalMutation } from './_generated/server'
import type { QueryCtx,MutationCtx } from './_generated/server'
import type { Doc,Id } from './_generated/dataModel'
import { v } from 'convex/values'
import { admin } from './admin'
import { identity,grantsFor,acceptance } from './portal'
import { permits,currentPublication } from './lib/roomPolicy'
import { validMetric } from '../src/features/finance/registry'
const kind=v.union(v.literal('invoiced'),v.literal('collected'),v.literal('recognized_revenue'),v.literal('arr'),v.literal('forecast'),v.literal('paying_accounts'),v.literal('paying_sites'),v.literal('pilot_sites'),v.literal('active_users'),v.literal('fundraise_target'),v.literal('fund_use'))
const fields={roomId:v.id('rooms'),sectionId:v.id('sections'),kind,scope:v.string(),periodStart:v.string(),periodEnd:v.string(),definitionFr:v.string(),definitionEn:v.string(),value:v.number(),unit:v.union(v.literal('XOF'),v.literal('count')),evidenceVersionIds:v.array(v.id('documentVersions'))}
type Fields=Omit<Doc<'financialMetrics'>,'_id'|'_creationTime'|'status'|'authorId'|'reviewerId'|'createdAt'|'publishedAt'>
async function evidenceValid(ctx:QueryCtx|MutationCtx,m:Fields){
 if(!validMetric(m))return false
 for(const id of m.evidenceVersionIds){
  const version=await ctx.db.get(id)
  if(!version||version.roomId!==m.roomId||version.scanStatus!=='clean'||version.state!=='published')return false
  const doc=await ctx.db.get(version.documentId)
  if(!doc||doc.roomId!==m.roomId||doc.status!=='published'||doc.currentVersionId!==id)return false
 }
 return true
}
async function sectionValid(ctx:QueryCtx|MutationCtx,m:Fields){
 const section=await ctx.db.get(m.sectionId)
 return section&&section.roomId===m.roomId&&['finance','traction','investment'].includes(section.category)?section:null
}
function enabled(){return process.env.ADC_STAGING_CMS==='true'}
async function create(ctx:MutationCtx,a:Fields,actor:string){
 if(!enabled()||!await sectionValid(ctx,a)||!await evidenceValid(ctx,a))throw Error('Invalid metric or evidence')
 const normalized={...a,scope:a.scope.trim().toLowerCase(),definitionFr:a.definitionFr.trim(),definitionEn:a.definitionEn.trim()}
 const id=await ctx.db.insert('financialMetrics',{...normalized,status:'draft',authorId:actor,createdAt:Date.now()})
 await ctx.db.insert('auditLogs',{actorId:actor,event:'finance.draft',resourceId:id,at:Date.now()});return id
}
async function transitionMetric(ctx:MutationCtx,roomId:Id<'rooms'>,id:Id<'financialMetrics'>,action:'submit'|'publish'|'archive',actor:string){
 if(!enabled())throw Error('Unavailable')
 const m=await ctx.db.get(id)
 if(!m||m.roomId!==roomId)throw Error('Unavailable')
 if(action==='archive'){if(m.status!=='published')throw Error('Invalid transition');await ctx.db.patch(id,{status:'archived'})}
 else {
  if(!await sectionValid(ctx,m)||!await evidenceValid(ctx,m))throw Error('Evidence invalid')
  if(action==='submit'){if(m.status!=='draft'||m.authorId!==actor)throw Error('Invalid transition');await ctx.db.patch(id,{status:'review'})}
  else {
   if(m.status!=='review'||m.authorId===actor)throw Error('Separate reviewer required')
   const matching=await ctx.db.query('financialMetrics').withIndex('by_room_key',q=>q.eq('roomId',roomId).eq('kind',m.kind).eq('scope',m.scope).eq('periodStart',m.periodStart).eq('periodEnd',m.periodEnd)).take(101)
   if(matching.length>100)throw Error('Review history required')
   for(const previous of matching){if(previous.status==='published')await ctx.db.patch(previous._id,{status:'archived'})}
   await ctx.db.patch(id,{status:'published',reviewerId:actor,publishedAt:Date.now()})
  }
 }
 await ctx.db.insert('auditLogs',{actorId:actor,event:'finance.'+action,resourceId:id,at:Date.now()})
 return {ok:true}
}
export const draft=mutation({args:fields,handler:async(ctx,a)=>{
 const {user}=await admin(ctx,a.roomId,'finance:edit')
 return await create(ctx,a,user._id)
}})
export const transition=mutation({args:{roomId:v.id('rooms'),metricId:v.id('financialMetrics'),action:v.union(v.literal('submit'),v.literal('publish'),v.literal('archive'))},handler:async(ctx,a)=>{
 const {user}=await admin(ctx,a.roomId,a.action==='submit'?'finance:edit':'finance:review')
 return await transitionMetric(ctx,a.roomId,a.metricId,a.action,user._id)
}})
// Trusted synthetic staging tests/operator workflow, never expose to browser.
export const stagingDraft=internalMutation({args:{...fields,operatorId:v.string()},handler:async(ctx,{operatorId,...a})=>{
 if(!operatorId.trim())throw Error('Invalid operator')
 return await create(ctx,a,operatorId)
}})
export const stagingTransition=internalMutation({args:{roomId:v.id('rooms'),metricId:v.id('financialMetrics'),action:v.union(v.literal('submit'),v.literal('publish'),v.literal('archive')),operatorId:v.string()},handler:async(ctx,a)=>{
 if(!a.operatorId.trim())throw Error('Invalid operator')
 return await transitionMetric(ctx,a.roomId,a.metricId,a.action,a.operatorId)
}})
export const adminList=query({args:{roomId:v.id('rooms')},handler:async(ctx,a)=>{
 const {user,membership}=await admin(ctx,a.roomId)
 if(!membership.capabilities.some(c=>c==='finance:edit'||c==='finance:review'))return []
 const rows=await ctx.db.query('financialMetrics').withIndex('by_room',q=>q.eq('roomId',a.roomId)).take(101)
 if(rows.length>100)throw Error('Pagination required')
 return rows.map(m=>({id:m._id,sectionId:m.sectionId,kind:m.kind,scope:m.scope,periodStart:m.periodStart,periodEnd:m.periodEnd,definitionFr:m.definitionFr,definitionEn:m.definitionEn,value:m.value,unit:m.unit,evidenceVersionIds:m.evidenceVersionIds,status:m.status,own:m.authorId===user._id}))
}})
export async function publishedForIdentity(ctx:QueryCtx,userId:string,roomId:Id<'rooms'>){
 const room=await ctx.db.get(roomId);if(!room)return []
 const grants=await grantsFor(ctx,userId,roomId),nda=await acceptance(ctx,userId,roomId,room.ndaVersion),now=Date.now()
 if(!permits(userId,room,grants,now,'room:read',undefined,nda))return []
 const rows=await ctx.db.query('financialMetrics').withIndex('by_room',q=>q.eq('roomId',roomId)).take(101)
 if(rows.length>100)throw Error('Pagination required')
 const results=[]
 for(const m of rows){
  if(m.status!=='published'||!permits(userId,room,grants,now,'section:read',m.sectionId,nda)||!await evidenceValid(ctx,m))continue
  const section=await sectionValid(ctx,m)
  if(!section?.publishedVersionId||!currentPublication(section,await ctx.db.get(section.publishedVersionId)))continue
  results.push({id:m._id,sectionId:m.sectionId,kind:m.kind,scope:m.scope,periodStart:m.periodStart,periodEnd:m.periodEnd,definitionFr:m.definitionFr,definitionEn:m.definitionEn,value:m.value,unit:m.unit})
 }
 return results
}
export const published=query({args:{roomId:v.id('rooms')},handler:async(ctx,a)=>{
 if(process.env.ADC_CONVEX_PORTAL_ENABLED!=='true'||process.env.ADC_CONVEX_FINANCE_ENABLED!=='true')return []
 const user=await identity(ctx);return user?await publishedForIdentity(ctx,user._id,a.roomId):[]
}})
