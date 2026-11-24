import { query,mutation,internalMutation } from './_generated/server'
import type { QueryCtx,MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { v } from 'convex/values'
import { identity,grantsFor,acceptance } from './portal'
import { internal } from './_generated/api'
import { admin } from './admin'
import { MAX_UPLOAD,validUpload } from '../src/features/documents/uploadRules'
import { recordAuthorized } from './analytics'
import { permits } from './lib/roomPolicy'
import { storageShaMatches } from './lib/hash'
const maxSize=MAX_UPLOAD
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
  const result=await versionFor(ctx,d._id,a.roomId);if(!result?.version.storageId)continue
  items.push({id:d._id,titleFr:d.titleFr,titleEn:d.titleEn,category:d.category,version:result.version.version,sizeBytes:result.version.sizeBytes,download:permits(scope.user._id,scope.room,scope.grants,scope.now,'document:download',d._id,scope.nda)})
 }
 return items
}})
// The app server obtains a single-use delivery ticket, not a storage URL.
export const authorizeDelivery=mutation({args:{roomId:v.id('rooms'),documentId:v.id('documents'),download:v.boolean(),deliverySecret:v.string(),ticket:v.optional(v.string())},handler:async(ctx,a)=>{
 const secret=process.env.ADC_DOCUMENT_DELIVERY_SECRET
 if(!secret||secret.length<32||a.deliverySecret!==secret||!a.ticket||!/^([a-f0-9]{64})$/.test(a.ticket))return null
 const scope=await access(ctx,a.roomId)
 if(!scope||!permits(scope.user._id,scope.room,scope.grants,scope.now,'document:read',a.documentId,scope.nda))return null
 if(a.download&&!permits(scope.user._id,scope.room,scope.grants,scope.now,'document:download',a.documentId,scope.nda))return null
 const result=await versionFor(ctx,a.documentId,a.roomId)
 if(!result?.version.storageId)return null
 if(await ctx.db.query('documentDeliveryTickets').withIndex('by_ticket',q=>q.eq('ticket',a.ticket!)).unique())return null
 await ctx.db.insert('documentDeliveryTickets',{ticket:a.ticket,roomId:a.roomId,documentId:a.documentId,versionId:result.version._id,authUserId:scope.user._id,download:a.download,expiresAt:scope.now+60000})
 await ctx.db.insert('auditLogs',{actorId:scope.user._id,event:a.download?'document.download_authorized':'document.view_authorized',resourceId:result.version._id,at:scope.now})
 await recordAuthorized(ctx,a.roomId,scope.user._id,a.download?'document_download_authorized':'document_view_authorized',a.documentId)
 return {sha256:result.version.sha256,sizeBytes:result.version.sizeBytes,mime:result.version.mime}
}})
// Staging/test-only registration of an object already in Convex File Storage. Integrity is checked against storage metadata.
export const registerDraft=internalMutation({args:{roomId:v.id('rooms'),titleFr:v.string(),titleEn:v.string(),category:v.string(),storageId:v.id('_storage'),sha256:v.string(),sizeBytes:v.number(),operatorId:v.string()},handler:async(ctx,a)=>{
 staging();const metadata=await ctx.db.system.get(a.storageId)
 if(!await ctx.db.get(a.roomId)||!Number.isSafeInteger(a.sizeBytes)||a.sizeBytes<1||a.sizeBytes>maxSize||!/^([a-f0-9]{64})$/.test(a.sha256)||!metadata||metadata.size!==a.sizeBytes||!storageShaMatches(metadata.sha256,a.sha256)||metadata.contentType!=='application/pdf'||await ctx.db.query('documentVersions').withIndex('by_storage',q=>q.eq('storageId',a.storageId)).first())throw Error('Invalid document')
 const actor=validateText(a.operatorId,200)
 const id=await ctx.db.insert('documents',{roomId:a.roomId,titleFr:validateText(a.titleFr,180),titleEn:validateText(a.titleEn,180),category:validateText(a.category,80),status:'draft'})
 const versionId=await ctx.db.insert('documentVersions',{roomId:a.roomId,documentId:id,version:1,storageId:a.storageId,sha256:a.sha256,sizeBytes:a.sizeBytes,mime:'application/pdf',scanStatus:'pending',state:'draft',createdAt:Date.now(),authorId:actor})
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

function uploadEnabled(secret:string){
 const expected=process.env.ADC_DOCUMENT_UPLOAD_SECRET
 return process.env.ADC_CONVEX_UPLOAD_ENABLED==='true'&&!!expected&&expected.length>=32&&secret===expected
}
export const authorizeUpload=mutation({args:{roomId:v.id('rooms'),secret:v.string()},handler:async(ctx,a)=>{
 if(!uploadEnabled(a.secret))return null
 try{await admin(ctx,a.roomId,'content:edit');return await ctx.db.get(a.roomId)?await ctx.storage.generateUploadUrl():null}catch{return null}
}})
export const completeUpload=mutation({args:{roomId:v.id('rooms'),titleFr:v.string(),titleEn:v.string(),category:v.string(),storageId:v.id('_storage'),sha256:v.string(),sizeBytes:v.number(),secret:v.string()},handler:async(ctx,a):Promise<Id<'documents'>>=>{
 if(!uploadEnabled(a.secret)||!validUpload(a))throw Error('Unavailable')
 const {user}=await admin(ctx,a.roomId,'content:edit')
 const metadata=await ctx.db.system.get(a.storageId)
 if(!metadata||metadata.size!==a.sizeBytes||!storageShaMatches(metadata.sha256,a.sha256)||metadata.contentType!=='application/pdf'||await ctx.db.query('documentVersions').withIndex('by_storage',q=>q.eq('storageId',a.storageId)).first())throw Error('Invalid storage object')
 const id=await ctx.db.insert('documents',{roomId:a.roomId,titleFr:validateText(a.titleFr,180),titleEn:validateText(a.titleEn,180),category:a.category,status:'draft'})
 const versionId=await ctx.db.insert('documentVersions',{roomId:a.roomId,documentId:id,version:1,storageId:a.storageId,sha256:a.sha256,sizeBytes:a.sizeBytes,mime:'application/pdf',scanStatus:'pending',state:'draft',createdAt:Date.now(),authorId:user._id})
 await ctx.db.patch(id,{currentVersionId:versionId})
 await ctx.db.insert('auditLogs',{actorId:user._id,event:'document.uploaded',resourceId:id,at:Date.now()})
 return id
}})
export const adminPublish=mutation({args:{roomId:v.id('rooms'),documentId:v.id('documents')},handler:async(ctx,a):Promise<{ok:boolean}>=>{
 const {user}=await admin(ctx,a.roomId,'content:review')
 const d=await ctx.db.get(a.documentId);if(!d||d.roomId!==a.roomId||!d.currentVersionId||!(await ctx.db.get(d.currentVersionId))?.storageId)throw Error('Unavailable')
 await ctx.runMutation(internal.documents.publish,{documentId:a.documentId,operatorId:user._id});return {ok:true}
}})
export const adminArchive=mutation({args:{roomId:v.id('rooms'),documentId:v.id('documents')},handler:async(ctx,a)=>{
 const {user}=await admin(ctx,a.roomId,'content:review')
 const d=await ctx.db.get(a.documentId)
 if(!d||d.roomId!==a.roomId||d.status!=='published'||!d.currentVersionId)throw Error('Unavailable')
 const version=await ctx.db.get(d.currentVersionId)
 if(!version||version.documentId!==d._id||version.roomId!==a.roomId)throw Error('Unavailable')
 await ctx.db.patch(d._id,{status:'archived'});await ctx.db.patch(version._id,{state:'archived'})
 await ctx.db.insert('auditLogs',{actorId:user._id,event:'document.archived',resourceId:d._id,at:Date.now()});return {ok:true}
}})

export const consumeDelivery=internalMutation({args:{ticket:v.string()},handler:async(ctx,a)=>{
 if(!enabled())return null
 const ticket=await ctx.db.query('documentDeliveryTickets').withIndex('by_ticket',q=>q.eq('ticket',a.ticket)).unique()
 if(!ticket)return null
 await ctx.db.delete(ticket._id)
 if(ticket.expiresAt<=Date.now())return null
 const room=await ctx.db.get(ticket.roomId);if(!room)return null
 const grants=await grantsFor(ctx,ticket.authUserId,ticket.roomId),nda=await acceptance(ctx,ticket.authUserId,ticket.roomId,room.ndaVersion),now=Date.now()
 if(!permits(ticket.authUserId,room,grants,now,'room:read',undefined,nda)||!permits(ticket.authUserId,room,grants,now,'document:read',ticket.documentId,nda)||ticket.download&&!permits(ticket.authUserId,room,grants,now,'document:download',ticket.documentId,nda))return null
 const result=await versionFor(ctx,ticket.documentId,ticket.roomId)
 if(!result?.version.storageId||result.version._id!==ticket.versionId)return null
 const meta=await ctx.db.system.get(result.version.storageId)
 if(!meta||meta.size!==result.version.sizeBytes||meta.sha256!==result.version.sha256||meta.contentType!=='application/pdf')return null
 return {storageId:result.version.storageId,sizeBytes:result.version.sizeBytes,sha256:result.version.sha256}
}})
export const purgeTickets=internalMutation({args:{},handler:async ctx=>{
 const expired=await ctx.db.query('documentDeliveryTickets').withIndex('by_expiry',q=>q.lt('expiresAt',Date.now())).take(200)
 for(const t of expired)await ctx.db.delete(t._id)
 return expired.length
}})
