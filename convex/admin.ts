// Isolated staging UI only. Explicit memberships, no auto-enrollment, MFA still required for production.
import { query,mutation,internalMutation } from './_generated/server'
import type { QueryCtx,MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { internal } from './_generated/api'
import { authComponent } from './auth'
import { hasAdminCapability } from './lib/adminPolicy'
import type { AdminCapability } from './lib/adminPolicy'
import { v } from 'convex/values'
import { requireMfa } from './mfa'
import { imagesFor,imageIdsIn } from './media'
const cap=v.union(v.literal('investors:read'),v.literal('access:manage'),v.literal('content:edit'),v.literal('content:review'),v.literal('finance:edit'),v.literal('finance:review'),v.literal('crm:read'),v.literal('crm:edit'),v.literal('qa:read'),v.literal('qa:reply'),v.literal('analytics:read'),v.literal('technical:read'))
function enabled(){return process.env.ADC_STAGING_ADMIN_UI==='true'&&process.env.ADC_STAGING_CMS==='true'}
export async function admin(ctx:QueryCtx|MutationCtx,roomId:Id<'rooms'>,capability?:AdminCapability){
 if(!enabled())throw new Error('Unavailable')
 const user=await authComponent.safeGetAuthUser(ctx)
 if(!user?.emailVerified)throw new Error('Unauthorized')
 const membership=await ctx.db.query('stagingAdminMemberships').withIndex('by_user_room',q=>q.eq('authUserId',user._id).eq('roomId',roomId)).unique()
 if(!hasAdminCapability(membership,user._id,roomId,capability))throw new Error('Unauthorized')
 await requireMfa(ctx,user._id)
 return {user,membership:membership!}
}
/** Lightweight read-only heartbeat. The same room membership and session-bound MFA gate
 * is enforced as for every privileged operation. No renewal or confidential records. */
export const sessionCheck=query({args:{roomId:v.id('rooms')},returns:v.object({capabilities:v.array(cap)}),handler:async(ctx,a)=>{
 const {membership}=await admin(ctx,a.roomId)
 return {capabilities:membership.capabilities}
}})
export const provision=internalMutation({args:{roomId:v.id('rooms'),authUserId:v.string(),capabilities:v.array(cap)},handler:async(ctx,a)=>{
 if(!enabled()||!await ctx.db.get(a.roomId)||!a.authUserId.trim()||!a.capabilities.length)throw new Error('Unavailable')
 const prior=await ctx.db.query('stagingAdminMemberships').withIndex('by_user_room',q=>q.eq('authUserId',a.authUserId).eq('roomId',a.roomId)).unique()
 if(prior)await ctx.db.patch(prior._id,{capabilities:[...new Set(a.capabilities)],revokedAt:undefined})
 else await ctx.db.insert('stagingAdminMemberships',{...a,capabilities:[...new Set(a.capabilities)]})
 await ctx.db.insert('auditLogs',{actorId:'staging-cli',event:'staging.admin.provisioned',resourceId:a.roomId,at:Date.now()})
}})
export const revokeMembership=internalMutation({args:{roomId:v.id('rooms'),authUserId:v.string()},handler:async(ctx,a)=>{
 if(!enabled())throw new Error('Unavailable')
 const prior=await ctx.db.query('stagingAdminMemberships').withIndex('by_user_room',q=>q.eq('authUserId',a.authUserId).eq('roomId',a.roomId)).unique()
 if(prior){await ctx.db.patch(prior._id,{revokedAt:Date.now()});await ctx.db.insert('auditLogs',{actorId:'staging-cli',event:'staging.admin.revoked',resourceId:a.roomId,at:Date.now()})}
}})
export const assignApplicant=internalMutation({args:{roomId:v.id('rooms'),profileId:v.id('investorProfiles')},handler:async(ctx,a)=>{
 if(!enabled()||!await ctx.db.get(a.roomId)||!await ctx.db.get(a.profileId))throw new Error('Unavailable')
 const existing=await ctx.db.query('roomApplicants').withIndex('by_room_profile',q=>q.eq('roomId',a.roomId).eq('profileId',a.profileId)).unique()
 if(!existing){await ctx.db.insert('roomApplicants',a);await ctx.db.insert('auditLogs',{actorId:'staging-cli',event:'staging.applicant.assigned',resourceId:a.roomId,at:Date.now()})}
}})
export const rooms=query({args:{},handler:async ctx=>{
 if(!enabled())return null
 const user=await authComponent.safeGetAuthUser(ctx)
 if(!user?.emailVerified)return null
 const memberships=await ctx.db.query('stagingAdminMemberships').withIndex('by_user_room',q=>q.eq('authUserId',user._id)).take(101)
 if(memberships.length>100)throw new Error('Access review required')
 const rooms=[]
 for(const m of memberships){if(!hasAdminCapability(m,user._id,m.roomId))continue;const room=await ctx.db.get(m.roomId);if(room)rooms.push({id:room._id,name:room.name})}
 return rooms.length?{name:user.name,rooms}:null
}})
export const dashboard=query({args:{roomId:v.id('rooms')},handler:async(ctx,a)=>{
 const {user,membership}=await admin(ctx,a.roomId)
 const room=await ctx.db.get(a.roomId)
 if(!room)throw new Error('Unavailable')
 const capabilities=membership.capabilities
 const applicants=[]
 if(capabilities.includes('investors:read')||capabilities.includes('access:manage')){
  const links=await ctx.db.query('roomApplicants').withIndex('by_room',q=>q.eq('roomId',a.roomId)).take(101)
  if(links.length>100)throw new Error('Pagination required')
  for(const link of links){const p=await ctx.db.get(link.profileId);if(!p)continue
   const grants=capabilities.includes('access:manage')?await ctx.db.query('accessGrants').withIndex('by_user_room',q=>q.eq('authUserId',p.authUserId).eq('roomId',a.roomId)).take(201):[]
   if(grants.length>200)throw new Error('Access review required')
   applicants.push({id:p._id,name:p.name,email:p.email,organization:p.organization??'',grants:grants.map(g=>({id:g._id,capability:g.capability,resourceId:g.resourceId??null,effect:g.effect,startsAt:g.startsAt??null,expiresAt:g.expiresAt??null,revokedAt:g.revokedAt??null}))})
  }
 }
 const sections=[]
 if(capabilities.includes('content:edit')||capabilities.includes('content:review')||capabilities.includes('access:manage')||capabilities.includes('finance:edit')||capabilities.includes('finance:review')){
  const rows=await ctx.db.query('sections').withIndex('by_room',q=>q.eq('roomId',a.roomId)).take(101)
  if(rows.length>100)throw new Error('Pagination required')
  for(const section of rows){
   const version=section.latestVersionId?await ctx.db.get(section.latestVersionId):null
   const canEdit=capabilities.includes('content:edit')||capabilities.includes('content:review')
   sections.push({id:section._id,slug:section.slug,category:section.category,order:section.order,published:!!section.publishedVersionId,latest:canEdit&&version&&version.roomId===a.roomId&&version.sectionId===section._id?{id:version._id,number:version.version,state:version.state,titleFr:version.titleFr,titleEn:version.titleEn,bodyFr:version.bodyFr,bodyEn:version.bodyEn,blocksFr:version.blocksFr??null,blocksEn:version.blocksEn??null,source:version.source,own:version.authorId===user._id}:null})
  }
 }
 const documents=[]
 if(capabilities.includes('content:edit')||capabilities.includes('content:review')||capabilities.includes('access:manage')||capabilities.includes('finance:edit')||capabilities.includes('finance:review')){
  const rows=await ctx.db.query('documents').withIndex('by_room',q=>q.eq('roomId',a.roomId)).take(101)
  if(rows.length>100)throw Error('Pagination required')
  for(const document of rows){const version=document.currentVersionId?await ctx.db.get(document.currentVersionId):null
   documents.push({id:document._id,titleFr:document.titleFr,titleEn:document.titleEn,category:document.category,status:document.status,version:version&&version.roomId===a.roomId&&version.documentId===document._id?{id:version._id,number:version.version,scanStatus:version.scanStatus,scanMethod:version.scanMethod??null,sha256:version.sha256,sizeBytes:version.sizeBytes,own:version.authorId===user._id}:null})
  }
 }
 const images=await imagesFor(ctx,room._id,sections.flatMap(s=>s.latest?[...imageIdsIn(s.latest.blocksFr),...imageIdsIn(s.latest.blocksEn)]:[]))
 return {room:{id:room._id,name:room.name,status:room.status},capabilities,applicants,sections,documents,images}
}})
export const grant=mutation({args:{roomId:v.id('rooms'),profileId:v.id('investorProfiles'),capability:v.union(v.literal('room:read'),v.literal('section:read')),sectionId:v.optional(v.id('sections')),effect:v.union(v.literal('allow'),v.literal('deny')),expiresAt:v.optional(v.number())},handler:async(ctx,a):Promise<Id<'accessGrants'>>=>{
 const {user}=await admin(ctx,a.roomId,'access:manage')
 const applicant=await ctx.db.query('roomApplicants').withIndex('by_room_profile',q=>q.eq('roomId',a.roomId).eq('profileId',a.profileId)).unique()
 const profile=applicant?await ctx.db.get(applicant.profileId):null
 if(!profile)throw new Error('Unavailable')
 if(a.capability==='section:read'&&!a.sectionId)throw new Error('Specific section required')
 if(a.sectionId){const section=await ctx.db.get(a.sectionId);if(!section||section.roomId!==a.roomId)throw new Error('Invalid scope')}
 return await ctx.runMutation(internal.stagingCms.grant,{roomId:a.roomId,authUserId:profile.authUserId,capability:a.capability,sectionId:a.sectionId,effect:a.effect,expiresAt:a.expiresAt,operatorId:user._id})
}})
export const revoke=mutation({args:{roomId:v.id('rooms'),grantId:v.id('accessGrants')},handler:async(ctx,a):Promise<{ok:boolean}>=>{
 const {user}=await admin(ctx,a.roomId,'access:manage')
 const grant=await ctx.db.get(a.grantId)
 if(!grant||grant.roomId!==a.roomId)throw new Error('Unavailable')
 await ctx.runMutation(internal.stagingCms.revoke,{grantId:a.grantId,operatorId:user._id});return {ok:true}
}})
export const draft=mutation({args:{roomId:v.id('rooms'),slug:v.string(),category:v.string(),order:v.number(),titleFr:v.string(),titleEn:v.string(),bodyFr:v.string(),bodyEn:v.string(),blocksFr:v.optional(v.string()),blocksEn:v.optional(v.string()),source:v.string()},handler:async(ctx,a):Promise<Id<'sectionVersions'>>=>{
 const {user}=await admin(ctx,a.roomId,'content:edit')
 return await ctx.runMutation(internal.stagingCms.draft,{...a,operatorId:user._id})
}})
export const transition=mutation({args:{roomId:v.id('rooms'),versionId:v.id('sectionVersions'),action:v.union(v.literal('submit'),v.literal('publish'))},handler:async(ctx,a):Promise<{ok:boolean}>=>{
 const {user}=await admin(ctx,a.roomId,a.action==='submit'?'content:edit':'content:review')
 const version=await ctx.db.get(a.versionId)
 if(!version||version.roomId!==a.roomId)throw new Error('Unavailable')
 if(a.action==='submit')await ctx.runMutation(internal.stagingCms.submit,{versionId:a.versionId,operatorId:user._id})
 else await ctx.runMutation(internal.stagingCms.publish,{versionId:a.versionId,operatorId:user._id})
 return {ok:true}
}})
export const archive=mutation({args:{roomId:v.id('rooms'),sectionId:v.id('sections')},handler:async(ctx,a):Promise<{ok:boolean}>=>{
 const {user}=await admin(ctx,a.roomId,'content:review')
 const section=await ctx.db.get(a.sectionId);if(!section||section.roomId!==a.roomId)throw new Error('Unavailable')
 await ctx.runMutation(internal.stagingCms.archive,{sectionId:a.sectionId,operatorId:user._id});return {ok:true}
}})

export const grantDocument=mutation({args:{roomId:v.id('rooms'),profileId:v.id('investorProfiles'),documentId:v.id('documents'),capability:v.union(v.literal('document:read'),v.literal('document:download')),effect:v.union(v.literal('allow'),v.literal('deny')),expiresAt:v.optional(v.number())},handler:async(ctx,a):Promise<Id<'accessGrants'>>=>{
 const {user}=await admin(ctx,a.roomId,'access:manage')
 const applicant=await ctx.db.query('roomApplicants').withIndex('by_room_profile',q=>q.eq('roomId',a.roomId).eq('profileId',a.profileId)).unique()
 const profile=applicant?await ctx.db.get(applicant.profileId):null
 if(!profile)throw Error('Unavailable')
 const document=await ctx.db.get(a.documentId)
 if(!document||document.roomId!==a.roomId)throw Error('Unavailable')
 return await ctx.runMutation(internal.documents.grant,{roomId:a.roomId,documentId:a.documentId,authUserId:profile.authUserId,capability:a.capability,effect:a.effect,expiresAt:a.expiresAt,operatorId:user._id})
}})

export const technicalAccess=query({args:{roomId:v.id('rooms')},handler:async(ctx,a)=>{
 const {membership}=await admin(ctx,a.roomId,'technical:read')
 return {canDraft:membership.capabilities.includes('content:edit')}
}})
