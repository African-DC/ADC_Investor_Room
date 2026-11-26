// Fine-grained, time-boxed access management (admin) and time-limited invitation links (investor redemption).
import { action,mutation,query,internalMutation } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { internal } from './_generated/api'
import { v } from 'convex/values'
import { admin } from './admin'
import { identity } from './portal'
import { sha256Hex } from './lib/totp'
import { enqueue } from './outbox'
const capability=v.union(v.literal('room:read'),v.literal('section:read'),v.literal('document:read'),v.literal('document:download'))
const target=v.object({capability,resourceId:v.optional(v.string())})
type Target={capability:'room:read'|'section:read'|'document:read'|'document:download';resourceId?:string}
const MAX_BATCH=500,MAX_LINK_USES=500,MAX_LINK_DAYS=365
function clean(s:string,max:number){const x=s.trim();if(!x||x.length>max)throw new Error('Invalid value');return x}
async function checkTargets(ctx:MutationCtx,roomId:Id<'rooms'>,targets:Target[]){
 if(!targets.length||targets.length>50)throw new Error('Invalid scope')
 for(const t of targets){
  if(t.capability==='room:read'){if(t.resourceId)throw new Error('Invalid scope');continue}
  if(!t.resourceId)throw new Error('Specific resource required')
  if(t.capability==='section:read'){const s=await ctx.db.get(t.resourceId as Id<'sections'>).catch(()=>null);if(!s||s.roomId!==roomId)throw new Error('Invalid scope')}
  else{const d=await ctx.db.get(t.resourceId as Id<'documents'>).catch(()=>null);if(!d||d.roomId!==roomId)throw new Error('Invalid scope')}
 }
}
function checkWindow(startsAt:number|undefined,expiresAt:number|undefined,now:number){
 if(startsAt!==undefined&&!Number.isFinite(startsAt))throw new Error('Invalid dates')
 if(expiresAt!==undefined&&(!Number.isFinite(expiresAt)||expiresAt<=now||(startsAt!==undefined&&expiresAt<=startsAt)))throw new Error('Invalid dates')
}
/** Grants the same targets to many investors at once (or to a saved group). */
export const setAccess=mutation({args:{roomId:v.id('rooms'),profileIds:v.array(v.id('investorProfiles')),targets:v.array(target),effect:v.union(v.literal('allow'),v.literal('deny')),startsAt:v.optional(v.number()),expiresAt:v.optional(v.number()),groupId:v.optional(v.id('investorGroups'))},handler:async(ctx,a)=>{
 const {user}=await admin(ctx,a.roomId,'access:manage'),now=Date.now()
 if(!a.profileIds.length||a.profileIds.length*a.targets.length>MAX_BATCH)throw new Error('Batch too large')
 checkWindow(a.startsAt,a.expiresAt,now);await checkTargets(ctx,a.roomId,a.targets)
 if(a.groupId){const g=await ctx.db.get(a.groupId);if(!g||g.roomId!==a.roomId)throw new Error('Invalid group')}
 let count=0
 const room=await ctx.db.get(a.roomId),fmtDay=(n:number)=>new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeZone:'UTC'}).format(n)
 for(const profileId of new Set(a.profileIds)){
  const link=await ctx.db.query('roomApplicants').withIndex('by_room_profile',q=>q.eq('roomId',a.roomId).eq('profileId',profileId)).unique()
  const profile=link?await ctx.db.get(profileId):null;if(!profile)throw new Error('Investor not in room')
  let first:string|null=null
  for(const t of a.targets){const gid=await ctx.db.insert('accessGrants',{authUserId:profile.authUserId,roomId:a.roomId,capability:t.capability,resourceId:t.resourceId,effect:a.effect,startsAt:a.startsAt,expiresAt:a.expiresAt,groupId:a.groupId});first??=gid;count++}
  if(a.effect==='allow'&&first&&a.targets.some(t=>t.capability==='room:read'||t.capability==='section:read'))await enqueue(ctx,{key:'access_granted:'+first,kind:'access_granted',to:profile.email,roomId:a.roomId,vars:{name:profile.name,room:room?.name??'Data Room ADC',until:a.expiresAt?fmtDay(a.expiresAt):''}})
 }
 await ctx.db.insert('auditLogs',{actorId:user._id,event:'access.batch_'+a.effect+':'+count,resourceId:a.roomId,at:now})
 return {count}
}})
export const revokeMany=mutation({args:{roomId:v.id('rooms'),grantIds:v.array(v.id('accessGrants'))},handler:async(ctx,a)=>{
 const {user}=await admin(ctx,a.roomId,'access:manage'),now=Date.now();if(a.grantIds.length>MAX_BATCH)throw new Error('Batch too large')
 for(const id of a.grantIds){const g=await ctx.db.get(id);if(!g||g.roomId!==a.roomId)throw new Error('Unavailable');if(g.revokedAt===undefined)await ctx.db.patch(id,{revokedAt:now})}
 await ctx.db.insert('auditLogs',{actorId:user._id,event:'access.revoked:'+a.grantIds.length,resourceId:a.roomId,at:now});return {ok:true}
}})
export const saveGroup=mutation({args:{roomId:v.id('rooms'),groupId:v.optional(v.id('investorGroups')),name:v.string(),profileIds:v.array(v.id('investorProfiles'))},handler:async(ctx,a)=>{
 const {user}=await admin(ctx,a.roomId,'access:manage');if(a.profileIds.length>200)throw new Error('Group too large')
 for(const p of a.profileIds){if(!await ctx.db.query('roomApplicants').withIndex('by_room_profile',q=>q.eq('roomId',a.roomId).eq('profileId',p)).unique())throw new Error('Investor not in room')}
 const data={roomId:a.roomId,name:clean(a.name,80),profileIds:[...new Set(a.profileIds)],createdBy:user._id,updatedAt:Date.now()}
 if(a.groupId){const g=await ctx.db.get(a.groupId);if(!g||g.roomId!==a.roomId)throw new Error('Invalid group');await ctx.db.patch(g._id,data);return g._id}
 return await ctx.db.insert('investorGroups',data)
}})
export const deleteGroup=mutation({args:{roomId:v.id('rooms'),groupId:v.id('investorGroups')},handler:async(ctx,a)=>{
 await admin(ctx,a.roomId,'access:manage');const g=await ctx.db.get(a.groupId);if(!g||g.roomId!==a.roomId)throw new Error('Invalid group');await ctx.db.delete(g._id);return {ok:true}
}})
export const setRoomStatus=mutation({args:{roomId:v.id('rooms'),status:v.union(v.literal('draft'),v.literal('published'))},handler:async(ctx,a)=>{
 const {user}=await admin(ctx,a.roomId,'content:review');const room=await ctx.db.get(a.roomId);if(!room)throw new Error('Unavailable')
 await ctx.db.patch(room._id,{status:a.status});await ctx.db.insert('auditLogs',{actorId:user._id,event:'room.'+a.status,resourceId:room._id,at:Date.now()});return {ok:true}
}})
export const overview=query({args:{roomId:v.id('rooms')},handler:async(ctx,a)=>{
 await admin(ctx,a.roomId,'access:manage');const now=Date.now()
 const groups=await ctx.db.query('investorGroups').withIndex('by_room',q=>q.eq('roomId',a.roomId)).take(200)
 const links=await ctx.db.query('accessLinks').withIndex('by_room',q=>q.eq('roomId',a.roomId)).order('desc').take(200)
 return {groups:groups.map(g=>({id:g._id,name:g.name,profileIds:g.profileIds})),links:links.map(l=>({id:l._id,label:l.label,targets:l.targets,email:l.email??null,startsAt:l.startsAt,expiresAt:l.expiresAt,grantUntil:l.grantUntil??null,maxUses:l.maxUses,uses:l.uses,active:!l.revokedAt&&l.startsAt<=now&&l.expiresAt>now&&l.uses<l.maxUses,revoked:!!l.revokedAt}))}
}})
// ---- Time-limited links ----
export const storeLink=internalMutation({args:{roomId:v.id('rooms'),tokenHash:v.string(),label:v.string(),targets:v.array(target),email:v.optional(v.string()),startsAt:v.number(),expiresAt:v.number(),grantUntil:v.optional(v.number()),maxUses:v.number()},handler:async(ctx,a)=>{
 const {user}=await admin(ctx,a.roomId,'access:manage'),now=Date.now()
 if(a.expiresAt<=now||a.expiresAt<=a.startsAt||a.expiresAt-a.startsAt>MAX_LINK_DAYS*86400000)throw new Error('Invalid dates')
 if(a.grantUntil!==undefined&&a.grantUntil<=a.startsAt)throw new Error('Invalid dates')
 if(!Number.isSafeInteger(a.maxUses)||a.maxUses<1||a.maxUses>MAX_LINK_USES)throw new Error('Invalid uses')
 if(a.email!==undefined&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email))throw new Error('Invalid email')
 await checkTargets(ctx,a.roomId,a.targets)
 const id=await ctx.db.insert('accessLinks',{...a,label:clean(a.label,120),email:a.email?.toLowerCase(),uses:0,createdBy:user._id,createdAt:now})
 await ctx.db.insert('auditLogs',{actorId:user._id,event:'access.link_created',resourceId:id,at:now});return id
}})
/** Token is generated with real randomness in an action, returned once, and only its SHA-256 is stored. */
export const createLink=action({args:{roomId:v.id('rooms'),label:v.string(),targets:v.array(target),email:v.optional(v.string()),startsAt:v.number(),expiresAt:v.number(),grantUntil:v.optional(v.number()),maxUses:v.number()},handler:async(ctx,a):Promise<{token:string}|null>=>{
 const bytes=crypto.getRandomValues(new Uint8Array(32)),token=btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
 await ctx.runMutation(internal.access.storeLink,{...a,tokenHash:await sha256Hex(token)});return {token}
}})
export const revokeLink=mutation({args:{roomId:v.id('rooms'),linkId:v.id('accessLinks')},handler:async(ctx,a)=>{
 const {user}=await admin(ctx,a.roomId,'access:manage');const l=await ctx.db.get(a.linkId);if(!l||l.roomId!==a.roomId)throw new Error('Unavailable')
 const now=Date.now();if(!l.revokedAt)await ctx.db.patch(l._id,{revokedAt:now})
 // Revoking a link also revokes the access it handed out.
 for(const use of await ctx.db.query('accessLinkUses').withIndex('by_link_user',q=>q.eq('linkId',l._id)).collect()){
  for(const g of await ctx.db.query('accessGrants').withIndex('by_user_room',q=>q.eq('authUserId',use.authUserId).eq('roomId',l.roomId)).collect())if(g.linkId===l._id&&g.revokedAt===undefined)await ctx.db.patch(g._id,{revokedAt:now})
 }
 await ctx.db.insert('auditLogs',{actorId:user._id,event:'access.link_revoked',resourceId:l._id,at:now});return {ok:true}
}})
/** Redeemed by a signed-in investor with a verified email. Never usable anonymously. */
export const redeem=mutation({args:{token:v.string()},handler:async(ctx,a):Promise<Redeem>=>{
 const user=await identity(ctx);if(!user)return {ok:false,reason:'signin'}
 return redeemCore(ctx,{_id:user._id,email:user.email,name:user.name},a.token)
}})
type Redeem={ok:true;roomId:Id<'rooms'>}|{ok:false;reason:string}
export async function redeemCore(ctx:MutationCtx,user:{_id:string;email:string;name:string},token:string):Promise<Redeem>{
 const a={token}
 if(!/^[A-Za-z0-9_-]{40,60}$/.test(a.token))return {ok:false,reason:'invalid'}
 const hash=await sha256Hex(a.token),now=Date.now()
 const link=await ctx.db.query('accessLinks').withIndex('by_token',q=>q.eq('tokenHash',hash)).unique()
 if(!link||link.revokedAt)return {ok:false,reason:'invalid'}
 if(now<link.startsAt)return {ok:false,reason:'notyet'}
 if(now>=link.expiresAt)return {ok:false,reason:'expired'}
 if(link.email&&link.email!==user.email.toLowerCase())return {ok:false,reason:'email'}
 const used=await ctx.db.query('accessLinkUses').withIndex('by_link_user',q=>q.eq('linkId',link._id).eq('authUserId',user._id)).first()
 if(used)return {ok:true,roomId:link.roomId}
 if(link.uses>=link.maxUses)return {ok:false,reason:'full'}
 let profile=await ctx.db.query('investorProfiles').withIndex('by_auth_user',q=>q.eq('authUserId',user._id)).unique()
 if(!profile){const id=await ctx.db.insert('investorProfiles',{authUserId:user._id,name:user.name,email:user.email,createdAt:now,updatedAt:now});profile=await ctx.db.get(id)}
 if(!profile)return {ok:false,reason:'invalid'}
 const pid=profile._id
 if(!await ctx.db.query('roomApplicants').withIndex('by_room_profile',q=>q.eq('roomId',link.roomId).eq('profileId',pid)).unique())await ctx.db.insert('roomApplicants',{roomId:link.roomId,profileId:pid})
 for(const t of link.targets)await ctx.db.insert('accessGrants',{authUserId:user._id,roomId:link.roomId,capability:t.capability,resourceId:t.resourceId,effect:'allow',startsAt:now,expiresAt:link.grantUntil,linkId:link._id})
 await ctx.db.patch(link._id,{uses:link.uses+1});await ctx.db.insert('accessLinkUses',{linkId:link._id,authUserId:user._id,at:now})
 await ctx.db.insert('auditLogs',{actorId:user._id,event:'access.link_redeemed',resourceId:link._id,at:now})
 return {ok:true,roomId:link.roomId}
}
