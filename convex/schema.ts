import { defineSchema,defineTable } from 'convex/server'
import { v } from 'convex/values'
export default defineSchema({
 investorProfiles:defineTable({authUserId:v.string(),name:v.string(),email:v.string(),organization:v.optional(v.string()),investorType:v.optional(v.string()),position:v.optional(v.string()),phone:v.optional(v.string()),linkedin:v.optional(v.string()),createdAt:v.number(),updatedAt:v.number()}).index('by_auth_user',['authUserId']),
 rooms:defineTable({name:v.string(),organizationId:v.string(),ndaVersion:v.optional(v.string()),ndaTextFr:v.optional(v.string()),ndaTextEn:v.optional(v.string()),status:v.union(v.literal('draft'),v.literal('published'),v.literal('archived'))}).index('by_organization',['organizationId']),
 accessGrants:defineTable({authUserId:v.string(),roomId:v.id('rooms'),capability:v.string(),resourceId:v.optional(v.string()),effect:v.union(v.literal('allow'),v.literal('deny')),expiresAt:v.optional(v.number()),revokedAt:v.optional(v.number())}).index('by_user_room',['authUserId','roomId']),
 ndaVersions:defineTable({roomId:v.id('rooms'),version:v.string(),textFr:v.string(),textEn:v.string(),createdAt:v.number()}).index('by_room_version',['roomId','version']),
 ndaAcceptances:defineTable({authUserId:v.string(),roomId:v.id('rooms'),version:v.string(),acceptedAt:v.number()}).index('by_user_room',['authUserId','roomId']),
 sections:defineTable({roomId:v.id('rooms'),slug:v.string(),category:v.string(),order:v.number(),publishedVersionId:v.optional(v.id('sectionVersions')),latestVersionId:v.optional(v.id('sectionVersions'))}).index('by_room',['roomId']).index('by_room_slug',['roomId','slug']),
 sectionVersions:defineTable({sectionId:v.id('sections'),roomId:v.id('rooms'),version:v.number(),titleFr:v.string(),titleEn:v.string(),bodyFr:v.string(),bodyEn:v.string(),source:v.string(),authorId:v.string(),reviewerId:v.optional(v.string()),state:v.union(v.literal('draft'),v.literal('review'),v.literal('published'),v.literal('archived')),createdAt:v.number(),publishedAt:v.optional(v.number())}).index('by_section_version',['sectionId','version']),
 auditLogs:defineTable({actorId:v.string(),event:v.string(),resourceId:v.optional(v.string()),at:v.number()}).index('by_actor',['actorId']),
})
