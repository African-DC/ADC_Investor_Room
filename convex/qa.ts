import {query,mutation,internalMutation} from './_generated/server'
import type {QueryCtx,MutationCtx} from './_generated/server'
import type {Id} from './_generated/dataModel'
import {v} from 'convex/values'
import { enqueue,emailOf } from './outbox'
import {admin} from './admin'
import {identity,grantsFor,acceptance} from './portal'
import {permits} from './lib/roomPolicy'
function enabled(){return process.env.ADC_CONVEX_PORTAL_ENABLED==='true'&&process.env.ADC_CONVEX_QA_ENABLED==='true'}
function clean(s:string,max:number){const text=s.trim();if(!text||text.length>max)throw Error('Invalid message');return text}
async function roomAccess(ctx:QueryCtx|MutationCtx,roomId:Id<'rooms'>,userId:string){
 const room=await ctx.db.get(roomId);if(!room)return false
 const grants=await grantsFor(ctx,userId,roomId),nda=await acceptance(ctx,userId,roomId,room.ndaVersion)
 return permits(userId,room,grants,Date.now(),'room:read',undefined,nda)
}
async function thread(ctx:QueryCtx|MutationCtx,roomId:Id<'rooms'>,questionId:Id<'questions'>,userId?:string){
 const q=await ctx.db.get(questionId)
 if(!q||q.roomId!==roomId||(userId!==undefined&&q.authUserId!==userId))throw Error('Unavailable')
 return q
}
async function create(ctx:MutationCtx,a:{roomId:Id<'rooms'>;subject:string;body:string},userId:string){
 if(!await roomAccess(ctx,a.roomId,userId))throw Error('Unavailable')
 const rows=await ctx.db.query('questions').withIndex('by_room_user',q=>q.eq('roomId',a.roomId).eq('authUserId',userId)).take(51)
 if(rows.length>=50)throw Error('Thread limit')
 const subject=clean(a.subject,180),body=clean(a.body,4000),now=Date.now()
 const id=await ctx.db.insert('questions',{roomId:a.roomId,authUserId:userId,subject,status:'open',createdAt:now,updatedAt:now})
 await ctx.db.insert('questionMessages',{roomId:a.roomId,questionId:id,sender:'investor',actorId:userId,body,at:now})
 await ctx.db.insert('auditLogs',{actorId:userId,event:'qa.created',resourceId:id,at:now});return {ok:true}
}
async function post(ctx:MutationCtx,a:{roomId:Id<'rooms'>;questionId:Id<'questions'>;body:string},actor:string,sender:'adc'|'investor'){
 const q=await thread(ctx,a.roomId,a.questionId,sender==='investor'?actor:undefined)
 if(q.status==='closed'||!await roomAccess(ctx,a.roomId,q.authUserId))throw Error('Unavailable')
 const rows=await ctx.db.query('questionMessages').withIndex('by_question',q=>q.eq('questionId',a.questionId)).take(101)
 if(rows.length>=100)throw Error('Thread limit')
 const now=Date.now(),body=clean(a.body,4000)
 await ctx.db.insert('questionMessages',{roomId:a.roomId,questionId:q._id,sender,actorId:actor,body,at:now})
 await ctx.db.patch(q._id,{status:sender==='adc'?'answered':'open',updatedAt:now})
 await ctx.db.insert('auditLogs',{actorId:actor,event:'qa.'+sender+'_reply',resourceId:q._id,at:now});return {ok:true}
}
async function project(ctx:QueryCtx,q:Awaited<ReturnType<typeof thread>>){
 const messages=await ctx.db.query('questionMessages').withIndex('by_question',x=>x.eq('questionId',q._id)).take(101)
 if(messages.length>100)throw Error('Thread limit')
 return {id:q._id,subject:q.subject,status:q.status,updatedAt:q.updatedAt,messages:messages.filter(m=>m.roomId===q.roomId).map(m=>({id:m._id,sender:m.sender,body:m.body,at:m.at}))}
}
export async function listForIdentity(ctx:QueryCtx,roomId:Id<'rooms'>,userId:string){
 if(!await roomAccess(ctx,roomId,userId))return []
 const rows=await ctx.db.query('questions').withIndex('by_room_user',q=>q.eq('roomId',roomId).eq('authUserId',userId)).take(51)
 if(rows.length>50)throw Error('Thread limit')
 return rows.sort((a,b)=>b.updatedAt-a.updatedAt).map(q=>({id:q._id,subject:q.subject,status:q.status,updatedAt:q.updatedAt}))
}
export const list=query({args:{roomId:v.id('rooms')},handler:async(ctx,a)=>{
 if(!enabled())return []
 const user=await identity(ctx);return user?listForIdentity(ctx,a.roomId,user._id):[]
}})
export const read=query({args:{roomId:v.id('rooms'),questionId:v.id('questions')},handler:async(ctx,a)=>{
 if(!enabled())return null
 const user=await identity(ctx);if(!user||!await roomAccess(ctx,a.roomId,user._id))return null
 try{return await project(ctx,await thread(ctx,a.roomId,a.questionId,user._id))}catch{return null}
}})
export const ask=mutation({args:{roomId:v.id('rooms'),subject:v.string(),body:v.string()},handler:async(ctx,a)=>{
 if(!enabled())throw Error('Unavailable')
 const user=await identity(ctx);if(!user)throw Error('Unavailable')
 return create(ctx,a,user._id)
}})
export const reply=mutation({args:{roomId:v.id('rooms'),questionId:v.id('questions'),body:v.string()},handler:async(ctx,a)=>{
 if(!enabled())throw Error('Unavailable')
 const user=await identity(ctx);if(!user)throw Error('Unavailable')
 return post(ctx,a,user._id,'investor')
}})
export const adminList=query({args:{roomId:v.id('rooms')},handler:async(ctx,a)=>{
 const {membership}=await admin(ctx,a.roomId)
 if(!enabled()||!membership.capabilities.some(c=>c==='qa:read'||c==='qa:reply'))return []
 const rows=await ctx.db.query('questions').withIndex('by_room',q=>q.eq('roomId',a.roomId)).take(101)
 if(rows.length>100)throw Error('Pagination required')
 const results=[]
 for(const q of rows){const profile=await ctx.db.query('investorProfiles').withIndex('by_auth_user',x=>x.eq('authUserId',q.authUserId)).unique();results.push({id:q._id,subject:q.subject,status:q.status,updatedAt:q.updatedAt,contact:profile?.name??'Investisseur vérifié',canReply:await roomAccess(ctx,a.roomId,q.authUserId)})}
 return results.sort((a,b)=>b.updatedAt-a.updatedAt)
}})
export const adminRead=query({args:{roomId:v.id('rooms'),questionId:v.id('questions')},handler:async(ctx,a)=>{
 const {membership}=await admin(ctx,a.roomId)
 if(!enabled()||!membership.capabilities.some(c=>c==='qa:read'||c==='qa:reply'))return null
 try{return await project(ctx,await thread(ctx,a.roomId,a.questionId))}catch{return null}
}})
export const adminReply=mutation({args:{roomId:v.id('rooms'),questionId:v.id('questions'),body:v.string()},handler:async(ctx,a)=>{
 const {user}=await admin(ctx,a.roomId,'qa:reply')
 if(!enabled())throw Error('Unavailable')
 const result=await post(ctx,a,user._id,'adc')
 const q=await ctx.db.get(a.questionId),u=q?await emailOf(ctx,q.authUserId):null
 if(q&&u)await enqueue(ctx,{key:'qa_answer:'+q._id+':'+(q.updatedAt??Date.now()),kind:'qa_answer',to:u.email,roomId:a.roomId,vars:{subject:q.subject}})
 return result
}})
export const close=mutation({args:{roomId:v.id('rooms'),questionId:v.id('questions')},handler:async(ctx,a)=>{
 const {user}=await admin(ctx,a.roomId,'qa:reply')
 if(!enabled())throw Error('Unavailable')
 const q=await thread(ctx,a.roomId,a.questionId)
 await ctx.db.patch(q._id,{status:'closed',updatedAt:Date.now()})
 await ctx.db.insert('auditLogs',{actorId:user._id,event:'qa.closed',resourceId:q._id,at:Date.now()});return {ok:true}
}})
export const fixtureAsk=internalMutation({args:{roomId:v.id('rooms'),subject:v.string(),body:v.string(),actor:v.string()},handler:async(ctx,{actor,...a})=>{if(process.env.ADC_STAGING_CMS!=='true')throw Error('Unavailable');return create(ctx,a,actor)}})
export const fixtureReply=internalMutation({args:{roomId:v.id('rooms'),questionId:v.id('questions'),body:v.string(),actor:v.string()},handler:async(ctx,{actor,...a})=>{if(process.env.ADC_STAGING_CMS!=='true')throw Error('Unavailable');return post(ctx,a,actor,'investor')}})
