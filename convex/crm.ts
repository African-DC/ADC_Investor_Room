import {query,mutation,internalMutation} from './_generated/server'
import type {MutationCtx,QueryCtx} from './_generated/server'
import type {Id} from './_generated/dataModel'
import {v} from 'convex/values'
import {admin} from './admin'
import {authComponent} from './auth'
import {validAmount,validFollowup} from '../src/features/crm/model'
const interaction=v.union(v.literal('note'),v.literal('call'),v.literal('email'),v.literal('meeting'),v.literal('followup'))
const stage=v.union(v.literal('new'),v.literal('contacted'),v.literal('qualified'),v.literal('due_diligence'),v.literal('negotiation'),v.literal('committed'),v.literal('closed'),v.literal('declined'))
const fields={roomId:v.id('rooms'),profileId:v.id('investorProfiles'),stage,nextAction:v.string(),dueDate:v.optional(v.string()),assignToMe:v.boolean(),ownerMembershipId:v.optional(v.union(v.id('stagingAdminMemberships'),v.null())),expectedXof:v.optional(v.union(v.number(),v.null())),committedXof:v.optional(v.union(v.number(),v.null())),expectedRevision:v.number()}
async function applicant(ctx:QueryCtx|MutationCtx,roomId:Id<'rooms'>,profileId:Id<'investorProfiles'>){
 const link=await ctx.db.query('roomApplicants').withIndex('by_room_profile',q=>q.eq('roomId',roomId).eq('profileId',profileId)).unique()
 const p=link?await ctx.db.get(profileId):null
 if(!p)throw Error('Unavailable')
 return p
}
type Update={roomId:Id<'rooms'>;profileId:Id<'investorProfiles'>;stage:import('../src/features/crm/model').Stage;nextAction:string;dueDate?:string;assignToMe:boolean;ownerMembershipId?:Id<'stagingAdminMemberships'>|null;expectedXof?:number|null;committedXof?:number|null;expectedRevision:number}
async function change(ctx:MutationCtx,a:Update,actor:string){
 await applicant(ctx,a.roomId,a.profileId)
 if(!validFollowup(a.nextAction,a.dueDate)||!Number.isSafeInteger(a.expectedRevision)||a.expectedRevision<0)throw Error('Invalid follow-up')
 const prev=await ctx.db.query('crmContacts').withIndex('by_room_profile',q=>q.eq('roomId',a.roomId).eq('profileId',a.profileId)).unique()
 if((prev?.revision??0)!==a.expectedRevision)throw Error('Refresh required')
 let ownerId=a.assignToMe?actor:prev?.ownerId
 if(a.ownerMembershipId!==undefined){
  if(a.ownerMembershipId===null)ownerId=undefined
  else{const m=await ctx.db.get(a.ownerMembershipId);if(!m||m.roomId!==a.roomId||m.revokedAt||!m.capabilities.includes('crm:edit'))throw Error('Invalid assignee');ownerId=m.authUserId}
 }
 const expectedXof=a.expectedXof===undefined?prev?.expectedXof:a.expectedXof??undefined
 const committedXof=a.committedXof===undefined?prev?.committedXof:a.committedXof??undefined
 if(!validAmount(expectedXof??null)||!validAmount(committedXof??null)||committedXof!==undefined&&!['committed','closed'].includes(a.stage))throw Error('Invalid funding amounts')
 const now=Date.now()
 const data={stage:a.stage,nextAction:a.nextAction.trim(),dueDate:a.dueDate,ownerId,expectedXof,committedXof,updatedAt:now,revision:a.expectedRevision+1}
 if(prev)await ctx.db.patch(prev._id,data);else await ctx.db.insert('crmContacts',{roomId:a.roomId,profileId:a.profileId,...data})
 await ctx.db.insert('crmEvents',{roomId:a.roomId,profileId:a.profileId,kind:'updated',actorId:actor,text:'Étape : '+(prev?.stage??'new')+' → '+a.stage+(prev?.expectedXof!==expectedXof?' · Montant envisagé : '+(expectedXof??'non renseigné')+' XOF':'')+(prev?.committedXof!==committedXof?' · Engagement déclaré : '+(committedXof??'non renseigné')+' XOF':'')+(prev?.ownerId!==ownerId?' · Responsable modifié':'')+(prev?.dueDate!==a.dueDate?' · Échéance : '+(a.dueDate??'aucune'):''),at:now})
 await ctx.db.insert('auditLogs',{actorId:actor,event:'crm.updated',resourceId:a.profileId,at:now})
 return {ok:true}
}
async function add(ctx:MutationCtx,a:{roomId:Id<'rooms'>;profileId:Id<'investorProfiles'>;text:string;interaction?:import('../src/features/crm/model').InteractionType},actor:string){
 await applicant(ctx,a.roomId,a.profileId)
 const text=a.text.trim();if(!text||text.length>4000)throw Error('Invalid note')
 await ctx.db.insert('crmEvents',{roomId:a.roomId,profileId:a.profileId,kind:'note',interaction:a.interaction??'note',actorId:actor,text,at:Date.now()})
 await ctx.db.insert('auditLogs',{actorId:actor,event:'crm.note_added',resourceId:a.profileId,at:Date.now()})
 return {ok:true}
}
export const update=mutation({args:fields,handler:async(ctx,a)=>{const {user}=await admin(ctx,a.roomId,'crm:edit');return change(ctx,a,user._id)}})
export const note=mutation({args:{roomId:v.id('rooms'),profileId:v.id('investorProfiles'),text:v.string(),interaction:v.optional(interaction)},handler:async(ctx,a)=>{const {user}=await admin(ctx,a.roomId,'crm:edit');return add(ctx,a,user._id)}})
export const list=query({args:{roomId:v.id('rooms')},handler:async(ctx,a)=>{
 const {user,membership}=await admin(ctx,a.roomId)
 if(!membership.capabilities.some(c=>c==='crm:read'||c==='crm:edit'))return []
 const links=await ctx.db.query('roomApplicants').withIndex('by_room',q=>q.eq('roomId',a.roomId)).take(101)
 if(links.length>100)throw Error('Pagination required')
 const result=[]
 for(const link of links){
  const p=await ctx.db.get(link.profileId);if(!p)continue
  const c=await ctx.db.query('crmContacts').withIndex('by_room_profile',q=>q.eq('roomId',a.roomId).eq('profileId',p._id)).unique()
  const assigned=c?.ownerId?await ctx.db.query('stagingAdminMemberships').withIndex('by_user_room',q=>q.eq('authUserId',c.ownerId!).eq('roomId',a.roomId)).unique():null
  const active=assigned&&!assigned.revokedAt&&assigned.capabilities.includes('crm:edit')?assigned:null
  result.push({id:p._id,name:p.name,email:p.email,organization:p.organization??'',stage:c?.stage??'new' as const,nextAction:c?.nextAction??'',dueDate:c?.dueDate??null,owner:c?.ownerId?(active?(c.ownerId===user._id?'self':'other'):'unavailable'):'none',ownerMembershipId:active?active._id:null,expectedXof:c?.expectedXof??null,committedXof:c?.committedXof??null,revision:c?.revision??0})
 }
 return result
}})
export const history=query({args:{roomId:v.id('rooms'),profileId:v.id('investorProfiles')},handler:async(ctx,a)=>{
 const {user,membership}=await admin(ctx,a.roomId)
 if(!membership.capabilities.some(c=>c==='crm:read'||c==='crm:edit'))throw Error('Unavailable')
 await applicant(ctx,a.roomId,a.profileId)
 const events=await ctx.db.query('crmEvents').withIndex('by_room_profile',q=>q.eq('roomId',a.roomId).eq('profileId',a.profileId)).order('desc').take(50)
 return events.map(e=>({id:e._id,kind:e.kind,interaction:e.interaction??null,text:e.text,at:e.at,own:e.actorId===user._id}))
}})
// Synthetic staging test adapter; no browser access or production use.
export const fixtureUpdate=internalMutation({args:{...fields,actor:v.string()},handler:async(ctx,{actor,...a})=>{if(process.env.ADC_STAGING_CMS!=='true')throw Error('Unavailable');return change(ctx,a,actor)}})
export const fixtureNote=internalMutation({args:{roomId:v.id('rooms'),profileId:v.id('investorProfiles'),text:v.string(),interaction:v.optional(interaction),actor:v.string()},handler:async(ctx,{actor,...a})=>{if(process.env.ADC_STAGING_CMS!=='true')throw Error('Unavailable');return add(ctx,a,actor)}})

// CRM settings are room-scoped; only names and membership IDs of eligible assignees are exposed.
export const settings=query({args:{roomId:v.id('rooms')},returns:v.object({targetXof:v.union(v.null(),v.number()),owners:v.array(v.object({id:v.id('stagingAdminMemberships'),name:v.string(),self:v.boolean()}))}),handler:async(ctx,a)=>{
 const {user,membership}=await admin(ctx,a.roomId)
 if(!membership.capabilities.some(c=>c==='crm:read'||c==='crm:edit'))throw Error('Unavailable')
 const room=await ctx.db.get(a.roomId);if(!room)throw Error('Unavailable')
 const rows=await ctx.db.query('stagingAdminMemberships').withIndex('by_room',q=>q.eq('roomId',a.roomId)).take(101)
 if(rows.length>100)throw Error('Pagination required')
 const owners=[]
 for(const m of rows){if(m.revokedAt||!m.capabilities.includes('crm:edit'))continue;const u=await authComponent.getAnyUserById(ctx,m.authUserId).catch(()=>null);if(u?.emailVerified)owners.push({id:m._id,name:u.name||'Membre ADC',self:m.authUserId===user._id})}
 return {targetXof:room.crmTargetXof??null,owners}
}})
export async function changeTarget(ctx:MutationCtx,roomId:Id<'rooms'>,targetXof:number|null,expectedTarget:number|null,actor:string){
 if(!validAmount(targetXof)||targetXof===0)throw Error('Invalid target')
 const room=await ctx.db.get(roomId);if(!room||(room.crmTargetXof??null)!==expectedTarget)throw Error('Refresh required')
 await ctx.db.patch(roomId,{crmTargetXof:targetXof??undefined})
 await ctx.db.insert('auditLogs',{actorId:actor,event:'crm.target_changed',resourceId:roomId,at:Date.now()})
 return {ok:true}
}
export const setTarget=mutation({args:{roomId:v.id('rooms'),targetXof:v.union(v.number(),v.null()),expectedTarget:v.union(v.number(),v.null())},returns:v.object({ok:v.boolean()}),handler:async(ctx,a)=>{const {user}=await admin(ctx,a.roomId,'crm:edit');return changeTarget(ctx,a.roomId,a.targetXof,a.expectedTarget,user._id)}})
