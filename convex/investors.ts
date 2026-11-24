import { query,mutation,internalMutation } from './_generated/server'
import type {QueryCtx,MutationCtx} from './_generated/server'
import type {Id} from './_generated/dataModel'
import { authComponent } from './auth'
import { v } from 'convex/values'
async function intakeRoom(ctx:QueryCtx|MutationCtx){
 if(process.env.ADC_CONVEX_INTAKE_ENABLED!=='true'||!process.env.ADC_INTAKE_ROOM_ID)return null
 const id=ctx.db.normalizeId('rooms',process.env.ADC_INTAKE_ROOM_ID)
 const room=id?await ctx.db.get(id):null
 return room?.status==='published'?room._id:null
}
async function linkApplicant(ctx:MutationCtx,roomId:Id<'rooms'>,profileId:Id<'investorProfiles'>,userId:string){
 const room=await ctx.db.get(roomId),profile=await ctx.db.get(profileId)
 if(room?.status!=='published'||!profile||profile.authUserId!==userId)throw Error('Unavailable')
 const existing=await ctx.db.query('roomApplicants').withIndex('by_room_profile',q=>q.eq('roomId',roomId).eq('profileId',profileId)).unique()
 if(existing)return
 await ctx.db.insert('roomApplicants',{roomId,profileId})
 await ctx.db.insert('auditLogs',{actorId:userId,event:'investor.access_requested',resourceId:profileId,at:Date.now()})
}
export const me=query({args:{},handler:async ctx=>{
 const user=await authComponent.safeGetAuthUser(ctx)
 if(!user||!user.emailVerified)return null
 const profile=await ctx.db.query('investorProfiles').withIndex('by_auth_user',q=>q.eq('authUserId',user._id)).unique()
 const roomId=await intakeRoom(ctx)
 const requested=roomId&&profile?!!await ctx.db.query('roomApplicants').withIndex('by_room_profile',q=>q.eq('roomId',roomId).eq('profileId',profile._id)).unique():false
 return {name:user.name,email:user.email,details:{organization:profile?.organization??'',investorType:profile?.investorType??'',position:profile?.position??'',phone:profile?.phone??'',linkedin:profile?.linkedin??''},intakeAvailable:!!roomId,intakeRequested:requested}
}})
export const registerVerified=mutation({args:{organization:v.optional(v.string()),investorType:v.optional(v.string()),position:v.optional(v.string()),phone:v.optional(v.string()),linkedin:v.optional(v.string()),requestAccess:v.optional(v.boolean())},handler:async(ctx,{requestAccess,...args})=>{
 const user=await authComponent.safeGetAuthUser(ctx)
 if(!user||!user.emailVerified)throw new Error('Unauthorized')
 const normalized=Object.fromEntries(Object.entries(args).map(([key,value])=>[key,value?.trim()])) as typeof args
 for(const value of Object.values(normalized))if(value&&value.length>300)throw new Error('Invalid profile')
 if(normalized.organization&&normalized.organization.length>160||normalized.position&&normalized.position.length>160||normalized.phone&&normalized.phone.length>40)throw new Error('Invalid profile')
 if(normalized.investorType&&!['angel','vc','institution','partner','other'].includes(normalized.investorType))throw new Error('Invalid profile')
 if(normalized.linkedin&&!/^https:\/\/(www\.)?linkedin\.com\//i.test(normalized.linkedin))throw new Error('Invalid profile')
 const roomId=requestAccess?await intakeRoom(ctx):null
 if(requestAccess&&!roomId)throw Error('Unavailable')
 const existing=await ctx.db.query('investorProfiles').withIndex('by_auth_user',q=>q.eq('authUserId',user._id)).unique()
 const now=Date.now(),data={...normalized,name:user.name,email:user.email,updatedAt:now}
 const id=existing?existing._id:await ctx.db.insert('investorProfiles',{...data,authUserId:user._id,createdAt:now})
 if(existing)await ctx.db.patch(id,data)
 else await ctx.db.insert('auditLogs',{actorId:user._id,event:'investor.verified_profile_created',resourceId:id,at:now})
 if(roomId)await linkApplicant(ctx,roomId,id,user._id)
 return id
}})
export const fixtureRequest=internalMutation({args:{roomId:v.id('rooms'),profileId:v.id('investorProfiles'),actor:v.string()},handler:async(ctx,a)=>{
 if(process.env.ADC_STAGING_CMS!=='true')throw Error('Unavailable')
 return linkApplicant(ctx,a.roomId,a.profileId,a.actor)
}})
