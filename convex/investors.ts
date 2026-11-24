import { query,mutation } from './_generated/server'
import { authComponent } from './auth'
import { v } from 'convex/values'
export const me=query({args:{},handler:async ctx=>{
 const user=await authComponent.safeGetAuthUser(ctx)
 if(!user||!user.emailVerified)return null
 return {name:user.name,email:user.email}
}})
export const registerVerified=mutation({args:{organization:v.optional(v.string()),investorType:v.optional(v.string()),position:v.optional(v.string()),phone:v.optional(v.string()),linkedin:v.optional(v.string())},handler:async(ctx,args)=>{
 const user=await authComponent.safeGetAuthUser(ctx)
 if(!user||!user.emailVerified)throw new Error('Unauthorized')
 const normalized=Object.fromEntries(Object.entries(args).map(([key,value])=>[key,value?.trim()])) as typeof args
 for(const value of Object.values(normalized))if(value&&value.length>300)throw new Error('Invalid profile')
 if(normalized.phone&&normalized.phone.length>40)throw new Error('Invalid profile')
 if(normalized.investorType&&!['angel','vc','institution','partner','other'].includes(normalized.investorType))throw new Error('Invalid profile')
 if(normalized.linkedin&&!/^https:\/\/(www\.)?linkedin\.com\//i.test(normalized.linkedin))throw new Error('Invalid profile')
 const existing=await ctx.db.query('investorProfiles').withIndex('by_auth_user',q=>q.eq('authUserId',user._id)).unique()
 const now=Date.now()
 const data={...normalized,name:user.name,email:user.email,updatedAt:now}
 if(existing){await ctx.db.patch(existing._id,data);return existing._id}
 const id=await ctx.db.insert('investorProfiles',{...data,authUserId:user._id,createdAt:now})
 await ctx.db.insert('auditLogs',{actorId:user._id,event:'investor.verified_profile_created',resourceId:id,at:now})
 return id
}})
