import { defineSchema,defineTable } from 'convex/server'
import { v } from 'convex/values'
export default defineSchema({
 investorProfiles:defineTable({authUserId:v.string(),name:v.string(),email:v.string(),organization:v.optional(v.string()),investorType:v.optional(v.string()),position:v.optional(v.string()),phone:v.optional(v.string()),linkedin:v.optional(v.string()),createdAt:v.number(),updatedAt:v.number()}).index('by_auth_user',['authUserId']),
 rooms:defineTable({name:v.string(),organizationId:v.string(),status:v.union(v.literal('draft'),v.literal('published'),v.literal('archived'))}).index('by_organization',['organizationId']),
 accessGrants:defineTable({authUserId:v.string(),roomId:v.id('rooms'),capability:v.string(),resourceId:v.optional(v.string()),effect:v.union(v.literal('allow'),v.literal('deny')),expiresAt:v.optional(v.number()),revokedAt:v.optional(v.number())}).index('by_user_room',['authUserId','roomId']),
 ndaAcceptances:defineTable({authUserId:v.string(),roomId:v.id('rooms'),version:v.string(),acceptedAt:v.number()}).index('by_user_room',['authUserId','roomId']),
 auditLogs:defineTable({actorId:v.string(),event:v.string(),resourceId:v.optional(v.string()),at:v.number()}).index('by_actor',['actorId']),
})
