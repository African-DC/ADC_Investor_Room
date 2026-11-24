import { query,mutation,internalMutation } from './_generated/server'
import type { QueryCtx,MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { v } from 'convex/values'
import { identity,grantsFor,acceptance } from './portal'
import { permits } from './lib/roomPolicy'
const maxSize=20*1024*1024
function enabled(){return process.env.ADC_CONVEX_PORTAL_ENABLED==='true'&&process.env.ADC_CONVEX_DOCUMENTS_ENABLED==='true'}
function staging(){if(process.env.ADC_STAGING_CMS!=='true')throw Error('Staging disabled')}
function validateText(s:string,max:number){const x=s.trim();if(!x||x.length>max)throw Error('Invalid value');return x}
async function access(ctx:QueryCtx|MutationCtx,roomId:Id<'rooms'>){
 if(!enabled())return null
 const user=await identity(ctx),room=await ctx.db.get(roomId)
 if(!user||!room)return null
 const grants=await grantsFor(ctx,user._id,roomId),nda=await acceptance(ctx,user._id,roomId,room.ndaVersion),now=Date.now()
 if(!permits(user._id,room,grants,now,'room:read',undefined,nda))return null
 return {user,room,grants,nda,now}
}
async function versionFor(ctx:QueryCtx|MutationCtx,documentId:Id<'documents'>,roomId:Id<'rooms'>){
 const document=await ctx.db.get(documentId)
 if(!document||document.roomId!==roomId||document.status!=='published'||!document.currentVersionId)return null
 const version=await ctx.db.get(document.currentVersionId)
 if(!version||version.roomId!==roomId||version.documentId!==documentId||version.state!=='published'||version.scanStatus!=='clean'||version.mime!=='application/pdf'||!Number.isSafeInteger(version.sizeBytes)||version.sizeBytes<=0||version.sizeBytes>maxSize)return null
 return {document,version}
}
export const list=query({args:{roomId:v.id('rooms')},handler:async(ctx,a)=>{
 const scope=await access(ctx,a.roomId)
 if(!scope)return []
 const rows=await ctx.db.query('documents').withIndex('by_room',q=>q.eq('roomId',a.roomId)).take(101)
 if(rows.length>100)throw Error('Pagination required')
 const items=[]
 for(const d of rows){
  if(!permits(scope.user._id,scope.room,scope.grants,scope.now,'document:read',d._id,scope.nda))continue
  const result=await versionFor(ctx,d._id,a.roomId);if(!result)continue
  items.push({id:d._id,titleFr:d.titleFr,titleEn:d.titleEn,category:d.category,version:result.version.version,sizeBytes:result.version.sizeBytes,download:permits(scope.user._id,scope.room,scope.grants,scope.now,'document:download',d._id,scope.nda)})
 }
 return items
}})
// The R2 object key is never returned by a public Convex function. The app action exchanges a server-only secret.
// Require identity AND explicit document grants; no client-supplied object key.
export const authorizeDelivery=mutation({args:{roomId:v.id('rooms'),documentId:v.id('documents'),download:v.boolean(),deliverySecret:v.string()},handler:async(ctx,a)=>{
 const secret=process.env.ADC_DOCUMENT_DELIVERY_SECRET
 if(!secret||secret.length<32||a.deliverySecret!==secret)return null
 const scope=await access(ctx,a.roomId)
 if(!scope||!permits(scope.user._id,scope.room,scope.grants,scope.now,'document:read',a.documentId,scope.nda))return null
 if(a.download&&!permits(scope.user._id,scope.room,scope.grants,scope.now,'document:download',a.documentId,scope.nda))return null
 const result=await versionFor(ctx,a.documentId,a.roomId)
 if(!result)return null
 await ctx.db.insert('auditLogs',{actorId:scope.user._id,event:a.download?'document.download_authorized':'document.view_authorized',resourceId:result.version._id,at:scope.now})
 return {objectKey:result.version.objectKey,sha256:result.version.sha256,sizeBytes:result.version.sizeBytes,mime:result.version.mime}
}})
export const registerDraft=internalMutation({args:{roomId:v.id('rooms'),titleFr:v.string(),titleEn:v.string(),category:v.string(),objectKey:v.string(),sha256:v.string(),sizeBytes:v.number(),operatorId:v.string()},handler:async(ctx,a)=>{
 staging();if(!await ctx.db.get(a.roomId)||!Number.isSafeInteger(a.sizeBytes)||a.sizeBytes<1||a.sizeBytes>maxSize||!/^([a-f0-9]{64})$/.test(a.sha256)||a.objectKey!==`rooms/${a.roomId}/${a.sha256}.pdf`)throw Error('Invalid document')
 const actor=validateText(a.operatorId,200)
 const id=await ctx.db.insert('documents',{roomId:a.roomId,titleFr:validateText(a.titleFr,180),titleEn:validateText(a.titleEn,180),category:validateText(a.category,80),status:'draft'})
 const versionId=await ctx.db.insert('documentVersions',{roomId:a.roomId,documentId:id,version:1,objectKey:a.objectKey,sha256:a.sha256,sizeBytes:a.sizeBytes,mime:'application/pdf',scanStatus:'pending',state:'draft',createdAt:Date.now(),authorId:actor})
 await ctx.db.patch(id,{currentVersionId:versionId});await ctx.db.insert('auditLogs',{actorId:actor,event:'staging.document.registered',resourceId:id,at:Date.now()});return id
}})
// Trusted staging operator records scan verdict from external scanner. No scan is performed here.
export const recordScan=internalMutation({args:{versionId:v.id('documentVersions'),status:v.union(v.literal('clean'),v.literal('rejected')),operatorId:v.string()},handler:async(ctx,a)=>{
 staging();const actor=validateText(a.operatorId,200),version=await ctx.db.get(a.versionId)
 if(!version||version.state!=='draft'||version.scanStatus!=='pending')throw Error('Invalid scan transition')
 await ctx.db.patch(version._id,{scanStatus:a.status});await ctx.db.insert('auditLogs',{actorId:actor,event:'staging.document.scan_'+a.status,resourceId:version._id,at:Date.now()})
}})
export const publish=internalMutation({args:{documentId:v.id('documents'),operatorId:v.string()},handler:async(ctx,a)=>{
 staging();const actor=validateText(a.operatorId,200),d=await ctx.db.get(a.documentId),version=d?.currentVersionId?await ctx.db.get(d.currentVersionId):null
 if(!d||d.status!=='draft'||!version||version.documentId!==d._id||version.roomId!==d.roomId||version.state!=='draft'||version.scanStatus!=='clean'||version.authorId===actor)throw Error('Publication denied')
 await ctx.db.patch(version._id,{state:'published',reviewerId:actor});await ctx.db.patch(d._id,{status:'published'});await ctx.db.insert('auditLogs',{actorId:actor,event:'staging.document.published',resourceId:d._id,at:Date.now()})
}})
export const grant=internalMutation({args:{roomId:v.id('rooms'),documentId:v.id('documents'),authUserId:v.string(),capability:v.union(v.literal('document:read'),v.literal('document:download')),effect:v.union(v.literal('allow'),v.literal('deny')),expiresAt:v.optional(v.number()),operatorId:v.string()},handler:async(ctx,a)=>{
 staging();const actor=validateText(a.operatorId,200),d=await ctx.db.get(a.documentId)
 if(!d||d.roomId!==a.roomId||a.expiresAt!==undefined&&(!Number.isFinite(a.expiresAt)||a.expiresAt<=Date.now()))throw Error('Invalid scope')
 const id=await ctx.db.insert('accessGrants',{roomId:a.roomId,authUserId:validateText(a.authUserId,200),capability:a.capability,resourceId:d._id,effect:a.effect,expiresAt:a.expiresAt})
 await ctx.db.insert('auditLogs',{actorId:actor,event:'staging.document.grant',resourceId:id,at:Date.now()});return id
}})
