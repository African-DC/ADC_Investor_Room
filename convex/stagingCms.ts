// Trusted Convex operator functions ONLY. Not callable by browsers. No production activation.
import { internalMutation } from './_generated/server'
import { v } from 'convex/values'
function staging(){if(process.env.ADC_STAGING_CMS!=='true')throw new Error('Staging CMS disabled')}
function text(value:string,max:number){const s=value.trim();if(!s||s.length>max)throw new Error('Invalid content');return s}
const categories=['company','products','investment','finance','traction','team','technology','legal','compliance','documents','updates']
export const createRoom=internalMutation({args:{name:v.string(),organizationId:v.string(),operatorId:v.string()},handler:async(ctx,a)=>{
 staging();const actor=text(a.operatorId,200)
 const id=await ctx.db.insert('rooms',{name:text(a.name,160),organizationId:text(a.organizationId,160),status:'draft'})
 await ctx.db.insert('auditLogs',{actorId:actor,event:'staging.room.created',resourceId:id,at:Date.now()});return id
}})
export const setRoomStatus=internalMutation({args:{roomId:v.id('rooms'),status:v.union(v.literal('draft'),v.literal('published'),v.literal('archived')),operatorId:v.string()},handler:async(ctx,a)=>{
 staging();const actor=text(a.operatorId,200);const room=await ctx.db.get(a.roomId);if(!room)throw new Error('Unavailable')
 await ctx.db.patch(room._id,{status:a.status});await ctx.db.insert('auditLogs',{actorId:actor,event:'staging.room.'+a.status,resourceId:room._id,at:Date.now()})
}})
export const setNda=internalMutation({args:{roomId:v.id('rooms'),version:v.string(),textFr:v.string(),textEn:v.string(),operatorId:v.string()},handler:async(ctx,a)=>{
 staging();const actor=text(a.operatorId,200);const room=await ctx.db.get(a.roomId);if(!room)throw new Error('Unavailable')
 const version=text(a.version,100),fr=text(a.textFr,40000),en=text(a.textEn,40000)
 if(room.ndaVersion===version)throw new Error('Use a new NDA version')
 // Do not reuse a historical version: prior acceptances must never apply to different wording.
 const existing=await ctx.db.query('ndaVersions').withIndex('by_room_version',q=>q.eq('roomId',room._id).eq('version',version)).unique()
 if(existing)throw new Error('NDA version already used')
 await ctx.db.insert('ndaVersions',{roomId:room._id,version,textFr:fr,textEn:en,createdAt:Date.now()})
 await ctx.db.patch(room._id,{ndaVersion:version,ndaTextFr:fr,ndaTextEn:en})
 await ctx.db.insert('auditLogs',{actorId:actor,event:'staging.nda.updated',resourceId:room._id,at:Date.now()})
}})
export const grant=internalMutation({args:{roomId:v.id('rooms'),authUserId:v.string(),capability:v.union(v.literal('room:read'),v.literal('section:read')),sectionId:v.optional(v.id('sections')),effect:v.union(v.literal('allow'),v.literal('deny')),expiresAt:v.optional(v.number()),operatorId:v.string()},handler:async(ctx,a)=>{
 staging();const actor=text(a.operatorId,200),user=text(a.authUserId,200)
 if(!await ctx.db.get(a.roomId))throw new Error('Unavailable')
 if(a.capability==='room:read'&&a.sectionId)throw new Error('Invalid scope')
 if(a.sectionId){const section=await ctx.db.get(a.sectionId);if(!section||section.roomId!==a.roomId)throw new Error('Invalid scope')}
 if(a.expiresAt!==undefined&&(!Number.isFinite(a.expiresAt)||a.expiresAt<=Date.now()))throw new Error('Invalid expiry')
 const id=await ctx.db.insert('accessGrants',{roomId:a.roomId,authUserId:user,capability:a.capability,resourceId:a.sectionId,effect:a.effect,expiresAt:a.expiresAt})
 await ctx.db.insert('auditLogs',{actorId:actor,event:'staging.grant.created',resourceId:id,at:Date.now()});return id
}})
export const revoke=internalMutation({args:{grantId:v.id('accessGrants'),operatorId:v.string()},handler:async(ctx,a)=>{
 staging();const actor=text(a.operatorId,200);const grant=await ctx.db.get(a.grantId);if(!grant)throw new Error('Unavailable')
 if(grant.revokedAt!==undefined)return
 await ctx.db.patch(grant._id,{revokedAt:Date.now()});await ctx.db.insert('auditLogs',{actorId:actor,event:'staging.grant.revoked',resourceId:grant._id,at:Date.now()})
}})
export const draft=internalMutation({args:{roomId:v.id('rooms'),slug:v.string(),category:v.string(),order:v.number(),titleFr:v.string(),titleEn:v.string(),bodyFr:v.string(),bodyEn:v.string(),source:v.string(),operatorId:v.string()},handler:async(ctx,a)=>{
 staging();const actor=text(a.operatorId,200),slug=text(a.slug,80)
 if(!/^[a-z0-9-]+$/.test(slug)||!categories.includes(a.category)||!Number.isSafeInteger(a.order)||!await ctx.db.get(a.roomId))throw new Error('Invalid section')
 let section=await ctx.db.query('sections').withIndex('by_room_slug',q=>q.eq('roomId',a.roomId).eq('slug',slug)).unique()
 if(!section){const id=await ctx.db.insert('sections',{roomId:a.roomId,slug,category:a.category,order:a.order});section=await ctx.db.get(id)}
 if(!section||section.category!==a.category||section.order!==a.order)throw new Error('Section metadata cannot change through draft')
 const latest=section.latestVersionId?await ctx.db.get(section.latestVersionId):null
 const id=await ctx.db.insert('sectionVersions',{sectionId:section._id,roomId:a.roomId,version:(latest?.version??0)+1,titleFr:text(a.titleFr,180),titleEn:text(a.titleEn,180),bodyFr:text(a.bodyFr,40000),bodyEn:text(a.bodyEn,40000),source:text(a.source,2000),authorId:actor,state:'draft',createdAt:Date.now()})
 await ctx.db.patch(section._id,{latestVersionId:id})
 await ctx.db.insert('auditLogs',{actorId:actor,event:'staging.section.drafted',resourceId:id,at:Date.now()});return id
}})
export const submit=internalMutation({args:{versionId:v.id('sectionVersions'),operatorId:v.string()},handler:async(ctx,a)=>{
 staging();const actor=text(a.operatorId,200),version=await ctx.db.get(a.versionId)
 if(!version||version.state!=='draft'||version.authorId!==actor)throw new Error('Invalid transition')
 const section=await ctx.db.get(version.sectionId);if(section?.latestVersionId!==version._id)throw new Error('Not current draft')
 await ctx.db.patch(version._id,{state:'review'});await ctx.db.insert('auditLogs',{actorId:actor,event:'staging.section.submitted',resourceId:version._id,at:Date.now()})
}})
export const publish=internalMutation({args:{versionId:v.id('sectionVersions'),operatorId:v.string()},handler:async(ctx,a)=>{
 staging();const actor=text(a.operatorId,200),version=await ctx.db.get(a.versionId)
 if(!version||version.state!=='review'||version.authorId===actor)throw new Error('Separate reviewer required')
 const section=await ctx.db.get(version.sectionId)
 if(!section||section.roomId!==version.roomId||section.latestVersionId!==version._id)throw new Error('Invalid version')
 const now=Date.now()
 if(section.publishedVersionId){const prior=await ctx.db.get(section.publishedVersionId);if(prior&&prior.sectionId===section._id)await ctx.db.patch(prior._id,{state:'archived'})}
 await ctx.db.patch(version._id,{state:'published',reviewerId:actor,publishedAt:now})
 await ctx.db.patch(section._id,{publishedVersionId:version._id})
 await ctx.db.insert('auditLogs',{actorId:actor,event:'staging.section.published',resourceId:version._id,at:now})
}})
export const archive=internalMutation({args:{sectionId:v.id('sections'),operatorId:v.string()},handler:async(ctx,a)=>{
 staging();const actor=text(a.operatorId,200),section=await ctx.db.get(a.sectionId);if(!section?.publishedVersionId)return
 const version=await ctx.db.get(section.publishedVersionId);if(!version||version.sectionId!==section._id)throw new Error('Invalid version')
 await ctx.db.patch(version._id,{state:'archived'});await ctx.db.patch(section._id,{publishedVersionId:undefined})
 await ctx.db.insert('auditLogs',{actorId:actor,event:'staging.section.archived',resourceId:version._id,at:Date.now()})
}})
