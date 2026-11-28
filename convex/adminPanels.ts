// One authenticated optional-panel read replaces eight HTTP calls.
import {query} from './_generated/server'
import {v} from 'convex/values'
import {admin,readRooms,readDashboard} from './admin'
import {readMfaStatus} from './mfa'
import {authComponent} from './auth'
import type {QueryCtx} from './_generated/server'
import type {Id} from './_generated/dataModel'
import {readFinance} from './finance'
import {readContacts} from './crm'
import {readQuestions} from './qa'
import {readAnalytics} from './analytics'
import {readAccess} from './access'
import {readTeam} from './team'
import {readEmails} from './outbox'
import {readNda} from './nda'
async function safe<T>(panel:string,read:()=>Promise<T>):Promise<T|null>{try{return await read()}catch{console.warn('[adc:panel] read failed',{panel});return null}}
async function readPanels(ctx:QueryCtx,a:{roomId:Id<'rooms'>},actor:Awaited<ReturnType<typeof admin>>){
 const has=(...caps:string[])=>caps.some(c=>(actor.membership.capabilities as readonly string[]).includes(c))
 return {
 metrics:has('finance:edit','finance:review')?await safe('finance',()=>readFinance(ctx,a,actor)):null,
 contacts:has('crm:read','crm:edit')?await safe('crm',()=>readContacts(ctx,a,actor)):null,
 questions:has('qa:read','qa:reply')?await safe('qa',()=>readQuestions(ctx,a,actor)):null,
 analytics:has('analytics:read')?await safe('analytics',()=>readAnalytics(ctx,{...a,days:30},actor)):null,
 access:has('access:manage')?await safe('access',()=>readAccess(ctx,a)):null,
 team:has('access:manage')?await safe('team',()=>readTeam(ctx,a,actor)):null,
 emails:has('access:manage')?await safe('emails',()=>readEmails(ctx,a)):null,
 nda:has('access:manage')?await safe('nda',()=>readNda(ctx,a)):null
 }
}
export const overview=query({args:{roomId:v.id('rooms')},handler:async(ctx,a)=>readPanels(ctx,a,await admin(ctx,a.roomId))})
/** One authenticated RPC for the initial view, with a separate claim only for a matching live invitation. */
export const bootstrap=query({args:{roomId:v.optional(v.id('rooms')),skipClaim:v.optional(v.boolean()),nonce:v.optional(v.number())},handler:async(ctx,a)=>{
 const mfa=await readMfaStatus(ctx)
 if(!a.skipClaim&&(!mfa||!a.roomId)){
  const user=await authComponent.safeGetAuthUser(ctx)
  if(user?.emailVerified){
   const invites=await ctx.db.query('adminInvites').withIndex('by_email',q=>q.eq('email',user.email.trim().toLowerCase())).take(101)
   if(invites.some(i=>!i.acceptedAt&&!i.revokedAt&&i.expiresAt>Date.now()))return {kind:'claim' as const}
  }
 }
 if(!mfa)return {kind:'membership' as const}
 if(!mfa.verified)return {kind:'mfa' as const,mfa}
 const identity=await readRooms(ctx)
 const room=a.roomId?identity?.rooms.find(r=>r.id===a.roomId):identity?.rooms[0]
 if(!identity||!room)return {kind:'membership' as const}
 const actor=await admin(ctx,room.id)
 const dashboard=await readDashboard(ctx,{roomId:room.id},actor)
 const panels=await readPanels(ctx,{roomId:room.id},actor)
 return {kind:'ready' as const,identity,dashboard,panels}
}})
