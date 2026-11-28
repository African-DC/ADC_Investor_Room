// Admin TOTP MFA. Proof is bound to the Better Auth session id carried in the Convex JWT.
import { action,query,mutation,internalMutation,internalQuery } from './_generated/server'
import type { QueryCtx,MutationCtx } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'
import { authComponent } from './auth'
import { base32Encode,verifyTotp,seal,unseal,sha256Hex,normalizeRecovery } from './lib/totp'
const ABSOLUTE_TTL=24*3600_000,LOCK_AFTER=5,LOCK_MS=15*60_000,ISSUER='ADC Investor Room'
function idleMs(){const n=Number(process.env.ADC_ADMIN_IDLE_MINUTES);return Number.isFinite(n)&&n>=15&&n<=480?n*60000:120*60000}
function proofValid(proof:{authUserId:string;expiresAt:number;verifiedAt:number;lastActivityAt?:number}|null,userId:string,now:number){return !!proof&&proof.authUserId===userId&&proof.expiresAt>now&&proof.verifiedAt+ABSOLUTE_TTL>now&&(proof.lastActivityAt??proof.verifiedAt)+idleMs()>now}
async function actor(ctx:QueryCtx|MutationCtx){
 const user=await authComponent.safeGetAuthUser(ctx),id=await ctx.auth.getUserIdentity()
 const sessionId=typeof id?.sessionId==='string'?id.sessionId:null
 if(!user?.emailVerified||!sessionId)return null
 const memberships=await ctx.db.query('stagingAdminMemberships').withIndex('by_user_room',q=>q.eq('authUserId',user._id)).take(101)
 return memberships.length<=100&&memberships.some(m=>!m.revokedAt)?{user,sessionId}:null
}
/** Throws unless the current session carries a valid MFA proof. Used by every privileged admin function. */
export async function requireMfa(ctx:QueryCtx|MutationCtx,userId:string){
 const id=await ctx.auth.getUserIdentity(),sessionId=typeof id?.sessionId==='string'?id.sessionId:null
 if(!sessionId)throw new Error('MFA required')
 const proof=await ctx.db.query('adminMfaProofs').withIndex('by_session',q=>q.eq('sessionId',sessionId)).first()
 if(!proof||!proofValid(proof,userId,Date.now()))throw new Error('MFA required')
 const mfa=await ctx.db.query('adminMfa').withIndex('by_user',q=>q.eq('authUserId',userId)).unique()
 if(mfa?.status!=='active'||(mfa.activatedAt??0)>proof.verifiedAt)throw new Error('MFA required')
}
export async function readMfaStatus(ctx:QueryCtx){
 const a=await actor(ctx);if(!a)return null
 const mfa=await ctx.db.query('adminMfa').withIndex('by_user',q=>q.eq('authUserId',a.user._id)).unique()
 const proof=await ctx.db.query('adminMfaProofs').withIndex('by_session',q=>q.eq('sessionId',a.sessionId)).first()
 return {name:a.user.name,email:a.user.email,enrolled:mfa?.status==='active',verified:!!proof&&proofValid(proof,a.user._id,Date.now())&&mfa?.status==='active'&&(mfa.activatedAt??0)<=proof.verifiedAt,lockedUntil:mfa?.lockedUntil&&mfa.lockedUntil>Date.now()?mfa.lockedUntil:null,recoveryLeft:mfa?.recoveryHashes.length??0}
}
export const status=query({args:{},handler:readMfaStatus})
export const actorForAction=internalQuery({args:{},handler:async ctx=>{const a=await actor(ctx);if(!a)return null;const mfa=await ctx.db.query('adminMfa').withIndex('by_user',q=>q.eq('authUserId',a.user._id)).unique();return {userId:a.user._id,email:a.user.email,active:mfa?.status==='active'}}})
export const storePending=internalMutation({args:{userId:v.string(),secretSealed:v.string()},handler:async(ctx,a)=>{
 const prior=await ctx.db.query('adminMfa').withIndex('by_user',q=>q.eq('authUserId',a.userId)).unique()
 if(prior?.status==='active')throw new Error('Already enrolled')
 if(prior)await ctx.db.delete(prior._id)
 await ctx.db.insert('adminMfa',{authUserId:a.userId,secretSealed:a.secretSealed,status:'pending',lastStep:-1,recoveryHashes:[],failures:0,createdAt:Date.now()})
 await ctx.db.insert('auditLogs',{actorId:a.userId,event:'admin.mfa.enroll_started',resourceId:a.userId,at:Date.now()})
}})
/** Starts enrollment: real randomness lives in an action, never in a deterministic mutation. */
export const beginEnroll=action({args:{},handler:async(ctx):Promise<{uri:string;secret:string}|null>=>{
 const a=await ctx.runQuery(internal.mfa.actorForAction,{});if(!a||a.active)return null
 const secret=base32Encode(crypto.getRandomValues(new Uint8Array(20)))
 await ctx.runMutation(internal.mfa.storePending,{userId:a.userId,secretSealed:await seal(secret,crypto.getRandomValues(new Uint8Array(12)))})
 const label=encodeURIComponent(ISSUER+':'+a.email)
 return {uri:`otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=6&period=30`,secret}
}})
export const readSealed=internalQuery({args:{},handler:async ctx=>{const a=await actor(ctx);if(!a)return null;const mfa=await ctx.db.query('adminMfa').withIndex('by_user',q=>q.eq('authUserId',a.user._id)).unique();return mfa?{userId:a.user._id,sessionId:a.sessionId,status:mfa.status,secretSealed:mfa.secretSealed,lastStep:mfa.lastStep,lockedUntil:mfa.lockedUntil??0}:null}})
export const recordAttempt=internalMutation({args:{userId:v.string(),sessionId:v.string(),step:v.union(v.number(),v.null()),activate:v.optional(v.array(v.string())),recoveryHash:v.optional(v.string())},handler:async(ctx,a):Promise<boolean>=>{
 const mfa=await ctx.db.query('adminMfa').withIndex('by_user',q=>q.eq('authUserId',a.userId)).unique(),now=Date.now()
 if(!mfa||(mfa.lockedUntil??0)>now)return false
 let ok=false,method:'totp'|'recovery'='totp'
 if(a.recoveryHash&&mfa.status==='active'){const i=mfa.recoveryHashes.indexOf(a.recoveryHash);if(i>=0){ok=true;method='recovery';await ctx.db.patch(mfa._id,{recoveryHashes:mfa.recoveryHashes.filter((_,k)=>k!==i)})}}
 else if(a.step!==null&&a.step>mfa.lastStep){ok=true;await ctx.db.patch(mfa._id,{lastStep:a.step})}
 if(!ok){const failures=mfa.failures+1;await ctx.db.patch(mfa._id,{failures,lockedUntil:failures>=LOCK_AFTER?now+LOCK_MS:undefined});await ctx.db.insert('auditLogs',{actorId:a.userId,event:'admin.mfa.failed',resourceId:a.userId,at:now});return false}
 if(a.activate){if(mfa.status!=='pending')return false;await ctx.db.patch(mfa._id,{status:'active',activatedAt:now,recoveryHashes:a.activate})}
 await ctx.db.patch(mfa._id,{failures:0,lockedUntil:undefined})
 for(const p of await ctx.db.query('adminMfaProofs').withIndex('by_session',q=>q.eq('sessionId',a.sessionId)).collect())await ctx.db.delete(p._id)
 await ctx.db.insert('adminMfaProofs',{authUserId:a.userId,sessionId:a.sessionId,verifiedAt:now+(a.activate?1:0),expiresAt:now+idleMs(),lastActivityAt:now,method})
 await ctx.db.insert('auditLogs',{actorId:a.userId,event:a.activate?'admin.mfa.activated':'admin.mfa.verified_'+method,resourceId:a.sessionId,at:now})
 return true
}})
/** Confirms enrollment with a first code; returns one-time recovery codes (shown once, stored hashed). */
export const confirmEnroll=action({args:{code:v.string()},handler:async(ctx,a):Promise<{ok:boolean;recovery?:string[]}>=>{
 const r=await ctx.runQuery(internal.mfa.readSealed,{});if(!r||r.status!=='pending')return {ok:false}
 const step=await verifyTotp(await unseal(r.secretSealed),a.code.trim(),Date.now(),r.lastStep)
 const recovery=Array.from({length:10},()=>{const b=crypto.getRandomValues(new Uint8Array(5));const s=base32Encode(b).slice(0,8);return s.slice(0,4)+'-'+s.slice(4)})
 const hashes=await Promise.all(recovery.map(c=>sha256Hex(normalizeRecovery(c))))
 const ok=await ctx.runMutation(internal.mfa.recordAttempt,{userId:r.userId,sessionId:r.sessionId,step,activate:step===null?undefined:hashes})
 return ok?{ok:true,recovery}:{ok:false}
}})
export const verify=action({args:{code:v.string()},handler:async(ctx,a):Promise<{ok:boolean}>=>{
 const r=await ctx.runQuery(internal.mfa.readSealed,{});if(!r||r.status!=='active'||r.lockedUntil>Date.now())return {ok:false}
 const code=a.code.trim()
 if(/^\d{6}$/.test(code)){const step=await verifyTotp(await unseal(r.secretSealed),code,Date.now(),r.lastStep);return {ok:await ctx.runMutation(internal.mfa.recordAttempt,{userId:r.userId,sessionId:r.sessionId,step})}}
 const norm=normalizeRecovery(code);if(norm.length!==8)return {ok:await ctx.runMutation(internal.mfa.recordAttempt,{userId:r.userId,sessionId:r.sessionId,step:null})}
 return {ok:await ctx.runMutation(internal.mfa.recordAttempt,{userId:r.userId,sessionId:r.sessionId,step:null,recoveryHash:await sha256Hex(norm)})}
}})
export const endSession=mutation({args:{},handler:async ctx=>{const id=await ctx.auth.getUserIdentity();const sid=typeof id?.sessionId==='string'?id.sessionId:null;if(!sid)return;for(const p of await ctx.db.query('adminMfaProofs').withIndex('by_session',q=>q.eq('sessionId',sid)).collect())await ctx.db.delete(p._id)}})
/** Operator-only recovery (CLI): wipes MFA so the admin re-enrolls. Audited. */
export const resetForUser=internalMutation({args:{authUserId:v.string(),operatorId:v.string()},handler:async(ctx,a)=>{
 const mfa=await ctx.db.query('adminMfa').withIndex('by_user',q=>q.eq('authUserId',a.authUserId)).unique();if(mfa)await ctx.db.delete(mfa._id)
 for(const p of await ctx.db.query('adminMfaProofs').withIndex('by_user',q=>q.eq('authUserId',a.authUserId)).collect())await ctx.db.delete(p._id)
 await ctx.db.insert('auditLogs',{actorId:a.operatorId,event:'admin.mfa.reset',resourceId:a.authUserId,at:Date.now()})
}})

/** Renew only the current valid MFA proof after explicit user interaction, never on background reads. */
export const touch=mutation({args:{},returns:v.object({ok:v.boolean(),expiresAt:v.optional(v.number())}),handler:async ctx=>{
 const a=await actor(ctx);if(!a)return {ok:false}
 const proof=await ctx.db.query('adminMfaProofs').withIndex('by_session',q=>q.eq('sessionId',a.sessionId)).unique(),now=Date.now()
 if(!proof||!proofValid(proof,a.user._id,now))return {ok:false}
 const mfa=await ctx.db.query('adminMfa').withIndex('by_user',q=>q.eq('authUserId',a.user._id)).unique()
 if(mfa?.status!=='active'||(mfa.activatedAt??0)>proof.verifiedAt)return {ok:false}
 if(now-(proof.lastActivityAt??proof.verifiedAt)<60000)return {ok:true,expiresAt:proof.expiresAt}
 const expiresAt=Math.min(now+idleMs(),proof.verifiedAt+ABSOLUTE_TTL)
 await ctx.db.patch(proof._id,{lastActivityAt:now,expiresAt})
 return {ok:true,expiresAt}
}})
