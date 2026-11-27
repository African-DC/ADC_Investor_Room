// ADC team management: explicit invitations (no self-enrolment), claimed only by the exact verified email, MFA still required afterwards.
import { mutation,query,internalMutation } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { v } from 'convex/values'
import { authComponent } from './auth'
import { admin } from './admin'
import { enqueue } from './outbox'
export const CAPS=['investors:read','access:manage','content:edit','content:review','finance:edit','finance:review','crm:read','crm:edit','qa:read','qa:reply','analytics:read','technical:read'] as const
type Cap=typeof CAPS[number]
const INVITE_TTL=14*86400_000
const norm=(e:string)=>e.trim().toLowerCase()
function caps(list:string[]):Cap[]{const out=[...new Set(list)].filter((c):c is Cap=>(CAPS as readonly string[]).includes(c));if(!out.length)throw new Error('Capabilities required');return out}
async function createInvite(ctx:MutationCtx,roomId:Id<'rooms'>,email:string,capabilities:string[],invitedBy:string){
 const e=norm(email);if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)||e.length>254)throw new Error('Invalid email')
 if(!await ctx.db.get(roomId))throw new Error('Unavailable')
 for(const prior of await ctx.db.query('adminInvites').withIndex('by_email',q=>q.eq('email',e)).collect())if(prior.roomId===roomId&&!prior.acceptedAt&&!prior.revokedAt)await ctx.db.patch(prior._id,{revokedAt:Date.now()})
 const id=await ctx.db.insert('adminInvites',{email:e,roomId,capabilities:caps(capabilities),invitedBy,createdAt:Date.now(),expiresAt:Date.now()+INVITE_TTL})
 await ctx.db.insert('auditLogs',{actorId:invitedBy,event:'team.invited',resourceId:id,at:Date.now()})
 await enqueue(ctx,{key:'admin_invite:'+id,kind:'admin_invite',to:e,roomId,vars:{email:e,expires:new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeZone:'UTC'}).format(Date.now()+INVITE_TTL)}})
 return id
}
/** Operator CLI bootstrap. */
export const inviteInternal=internalMutation({args:{roomId:v.id('rooms'),email:v.string(),capabilities:v.array(v.string()),operatorId:v.string()},handler:(ctx,a)=>createInvite(ctx,a.roomId,a.email,a.capabilities,a.operatorId)})
/** An admin may only delegate capabilities they hold themselves. */
export const invite=mutation({args:{roomId:v.id('rooms'),email:v.string(),capabilities:v.array(v.string())},handler:async(ctx,a)=>{
 const {user,membership}=await admin(ctx,a.roomId,'access:manage')
 if(a.capabilities.some(c=>!membership.capabilities.includes(c as Cap)))throw new Error('Cannot delegate capabilities you do not hold')
 return createInvite(ctx,a.roomId,a.email,a.capabilities,user._id)
}})
/** Called on admin sign-in: turns matching, unexpired invites into memberships for the verified email only. */
export const claim=mutation({args:{},handler:async ctx=>{
 const user=await authComponent.safeGetAuthUser(ctx);if(!user?.emailVerified)return {claimed:0}
 const now=Date.now();let claimed=0
 for(const inv of await ctx.db.query('adminInvites').withIndex('by_email',q=>q.eq('email',norm(user.email))).collect()){
  if(inv.acceptedAt||inv.revokedAt||inv.expiresAt<=now)continue
  const prior=await ctx.db.query('stagingAdminMemberships').withIndex('by_user_room',q=>q.eq('authUserId',user._id).eq('roomId',inv.roomId)).unique()
  const capabilities=caps(inv.capabilities)
  if(prior)await ctx.db.patch(prior._id,{capabilities:[...new Set([...(prior.revokedAt?[]:prior.capabilities),...capabilities])],revokedAt:undefined})
  else await ctx.db.insert('stagingAdminMemberships',{authUserId:user._id,roomId:inv.roomId,capabilities})
  await ctx.db.patch(inv._id,{acceptedAt:now,acceptedBy:user._id});await ctx.db.insert('auditLogs',{actorId:user._id,event:'team.invite_accepted',resourceId:inv._id,at:now});claimed++
 }
 return {claimed}
}})
export const list=query({args:{roomId:v.id('rooms')},handler:async(ctx,a)=>{
 const {user}=await admin(ctx,a.roomId,'access:manage')
 const members=[]
 const rows=await ctx.db.query('stagingAdminMemberships').withIndex('by_room',q=>q.eq('roomId',a.roomId)).take(101)
 if(rows.length>100)throw Error('Pagination required')
 for(const m of rows){const u=await authComponent.getAnyUserById(ctx,m.authUserId).catch(()=>null);members.push({id:m._id,name:u?.name??'—',email:u?.email??'—',capabilities:m.capabilities,revoked:!!m.revokedAt,self:m.authUserId===user._id})}
 const invites=(await ctx.db.query('adminInvites').withIndex('by_room',q=>q.eq('roomId',a.roomId)).order('desc').take(100)).map(i=>({id:i._id,email:i.email,capabilities:i.capabilities,createdAt:i.createdAt,expiresAt:i.expiresAt,status:i.revokedAt?'revoked':i.acceptedAt?'accepted':i.expiresAt<=Date.now()?'expired':'pending'}))
 return {members,invites}
}})
export const setCapabilities=mutation({args:{roomId:v.id('rooms'),membershipId:v.id('stagingAdminMemberships'),capabilities:v.array(v.string())},handler:async(ctx,a)=>{
 const {user,membership}=await admin(ctx,a.roomId,'access:manage');const m=await ctx.db.get(a.membershipId)
 if(!m||m.roomId!==a.roomId)throw new Error('Unavailable');if(m.authUserId===user._id)throw new Error('Cannot change your own rights')
 if(a.capabilities.some(c=>!membership.capabilities.includes(c as Cap)))throw new Error('Cannot delegate capabilities you do not hold')
 await ctx.db.patch(m._id,{capabilities:caps(a.capabilities)});await ctx.db.insert('auditLogs',{actorId:user._id,event:'team.capabilities_changed',resourceId:m._id,at:Date.now()});return {ok:true}
}})
export const revokeMember=mutation({args:{roomId:v.id('rooms'),membershipId:v.id('stagingAdminMemberships')},handler:async(ctx,a)=>{
 const {user}=await admin(ctx,a.roomId,'access:manage');const m=await ctx.db.get(a.membershipId)
 if(!m||m.roomId!==a.roomId)throw new Error('Unavailable');if(m.authUserId===user._id)throw new Error('Cannot revoke yourself')
 await ctx.db.patch(m._id,{revokedAt:Date.now()})
 for(const p of await ctx.db.query('adminMfaProofs').withIndex('by_user',q=>q.eq('authUserId',m.authUserId)).collect())await ctx.db.delete(p._id)
 await ctx.db.insert('auditLogs',{actorId:user._id,event:'team.revoked',resourceId:m._id,at:Date.now()});return {ok:true}
}})
export const revokeInvite=mutation({args:{roomId:v.id('rooms'),inviteId:v.id('adminInvites')},handler:async(ctx,a)=>{
 const {user}=await admin(ctx,a.roomId,'access:manage');const i=await ctx.db.get(a.inviteId);if(!i||i.roomId!==a.roomId)throw new Error('Unavailable')
 if(!i.revokedAt&&!i.acceptedAt)await ctx.db.patch(i._id,{revokedAt:Date.now()});await ctx.db.insert('auditLogs',{actorId:user._id,event:'team.invite_revoked',resourceId:i._id,at:Date.now()});return {ok:true}
}})
