import {query,mutation,internalMutation} from './_generated/server'
import type {MutationCtx,QueryCtx} from './_generated/server'
import type {Id} from './_generated/dataModel'
import {v} from 'convex/values'
import {admin} from './admin'
import {validFollowup} from '../src/features/crm/model'
const stage=v.union(v.literal('new'),v.literal('contacted'),v.literal('qualified'),v.literal('due_diligence'),v.literal('negotiation'),v.literal('committed'),v.literal('closed'),v.literal('declined'))
const fields={roomId:v.id('rooms'),profileId:v.id('investorProfiles'),stage,nextAction:v.string(),dueDate:v.optional(v.string()),assignToMe:v.boolean(),expectedRevision:v.number()}
async function applicant(ctx:QueryCtx|MutationCtx,roomId:Id<'rooms'>,profileId:Id<'investorProfiles'>){
 const link=await ctx.db.query('roomApplicants').withIndex('by_room_profile',q=>q.eq('roomId',roomId).eq('profileId',profileId)).unique()
 const p=link?await ctx.db.get(profileId):null
 if(!p)throw Error('Unavailable')
 return p
}
type Update={roomId:Id<'rooms'>;profileId:Id<'investorProfiles'>;stage:import('../src/features/crm/model').Stage;nextAction:string;dueDate?:string;assignToMe:boolean;expectedRevision:number}
async function change(ctx:MutationCtx,a:Update,actor:string){
 await applicant(ctx,a.roomId,a.profileId)
 if(!validFollowup(a.nextAction,a.dueDate)||!Number.isSafeInteger(a.expectedRevision)||a.expectedRevision<0)throw Error('Invalid follow-up')
 const prev=await ctx.db.query('crmContacts').withIndex('by_room_profile',q=>q.eq('roomId',a.roomId).eq('profileId',a.profileId)).unique()
 if((prev?.revision??0)!==a.expectedRevision)throw Error('Refresh required')
 const now=Date.now(),ownerId=a.assignToMe?actor:prev?.ownerId
 const data={stage:a.stage,nextAction:a.nextAction.trim(),dueDate:a.dueDate,ownerId,updatedAt:now,revision:a.expectedRevision+1}
 if(prev)await ctx.db.patch(prev._id,data);else await ctx.db.insert('crmContacts',{roomId:a.roomId,profileId:a.profileId,...data})
 await ctx.db.insert('crmEvents',{roomId:a.roomId,profileId:a.profileId,kind:'updated',actorId:actor,text:'stage:'+(prev?.stage??'new')+' → '+a.stage,at:now})
 await ctx.db.insert('auditLogs',{actorId:actor,event:'crm.updated',resourceId:a.profileId,at:now})
 return {ok:true}
}
async function add(ctx:MutationCtx,a:{roomId:Id<'rooms'>;profileId:Id<'investorProfiles'>;text:string},actor:string){
 await applicant(ctx,a.roomId,a.profileId)
 const text=a.text.trim();if(!text||text.length>4000)throw Error('Invalid note')
 await ctx.db.insert('crmEvents',{roomId:a.roomId,profileId:a.profileId,kind:'note',actorId:actor,text,at:Date.now()})
 await ctx.db.insert('auditLogs',{actorId:actor,event:'crm.note_added',resourceId:a.profileId,at:Date.now()})
 return {ok:true}
}
export const update=mutation({args:fields,handler:async(ctx,a)=>{const {user}=await admin(ctx,a.roomId,'crm:edit');return change(ctx,a,user._id)}})
export const note=mutation({args:{roomId:v.id('rooms'),profileId:v.id('investorProfiles'),text:v.string()},handler:async(ctx,a)=>{const {user}=await admin(ctx,a.roomId,'crm:edit');return add(ctx,a,user._id)}})
export async function readContacts(ctx:QueryCtx,a:{roomId:Id<'rooms'>},actor:Awaited<ReturnType<typeof admin>>){
 const {user,membership}=actor
 if(!membership.capabilities.some(c=>c==='crm:read'||c==='crm:edit'))return []
 const links=await ctx.db.query('roomApplicants').withIndex('by_room',q=>q.eq('roomId',a.roomId)).take(101)
 if(links.length>100)throw Error('Pagination required')
 const result=[]
 for(const link of links){
  const p=await ctx.db.get(link.profileId);if(!p)continue
  const c=await ctx.db.query('crmContacts').withIndex('by_room_profile',q=>q.eq('roomId',a.roomId).eq('profileId',p._id)).unique()
  result.push({id:p._id,name:p.name,email:p.email,organization:p.organization??'',stage:c?.stage??'new' as const,nextAction:c?.nextAction??'',dueDate:c?.dueDate??null,owner:c?.ownerId?(c.ownerId===user._id?'self':'other'):'none',revision:c?.revision??0})
 }
 return result
}
export const list=query({args:{roomId:v.id('rooms')},handler:async(ctx,a)=>{const actor=await admin(ctx,a.roomId);return readContacts(ctx,a,actor)}})
export const history=query({args:{roomId:v.id('rooms'),profileId:v.id('investorProfiles')},handler:async(ctx,a)=>{
 const {user,membership}=await admin(ctx,a.roomId)
 if(!membership.capabilities.some(c=>c==='crm:read'||c==='crm:edit'))throw Error('Unavailable')
 await applicant(ctx,a.roomId,a.profileId)
 const events=await ctx.db.query('crmEvents').withIndex('by_room_profile',q=>q.eq('roomId',a.roomId).eq('profileId',a.profileId)).order('desc').take(50)
 return events.map(e=>({id:e._id,kind:e.kind,text:e.text,at:e.at,own:e.actorId===user._id}))
}})
// Synthetic staging test adapter; no browser access or production use.
export const fixtureUpdate=internalMutation({args:{...fields,actor:v.string()},handler:async(ctx,{actor,...a})=>{if(process.env.ADC_STAGING_CMS!=='true')throw Error('Unavailable');return change(ctx,a,actor)}})
export const fixtureNote=internalMutation({args:{roomId:v.id('rooms'),profileId:v.id('investorProfiles'),text:v.string(),actor:v.string()},handler:async(ctx,{actor,...a})=>{if(process.env.ADC_STAGING_CMS!=='true')throw Error('Unavailable');return add(ctx,a,actor)}})
