import { z } from 'zod'
import { kinds } from '../finance/registry'
import { stages,MAX_XOF } from '../crm/model'
const id=z.string().min(1).max(128)
const base=z.object({roomId:id})
export const adminCommand=z.discriminatedUnion('kind',[
 base.extend({kind:z.literal('grant'),profileId:id,capability:z.enum(['room:read','section:read']),sectionId:id.optional(),effect:z.enum(['allow','deny']),expiresAt:z.number().finite().optional()}),
 base.extend({kind:z.literal('grantDocument'),profileId:id,documentId:id,capability:z.enum(['document:read','document:download']),effect:z.enum(['allow','deny']),expiresAt:z.number().finite().optional()}),
 base.extend({kind:z.literal('financeDraft'),sectionId:id,metricKind:z.enum(kinds),scope:z.string().trim().min(1).max(120),periodStart:z.string().max(10),periodEnd:z.string().max(10),definitionFr:z.string().trim().min(1).max(2000),definitionEn:z.string().trim().min(1).max(2000),value:z.number().int().safe(),unit:z.enum(['XOF','count']),evidenceVersionIds:z.array(id).min(1).max(10)}),
 base.extend({kind:z.literal('financeTransition'),metricId:id,action:z.enum(['submit','publish','archive'])}),
 base.extend({kind:z.literal('documentTransition'),documentId:id,action:z.enum(['publish','archive'])}),
 base.extend({kind:z.literal('crmUpdate'),profileId:id,stage:z.enum(stages),nextAction:z.string().max(500),dueDate:z.string().max(10).optional(),assignToMe:z.boolean(),ownerMembershipId:id.nullable().optional(),expectedXof:z.number().int().min(0).max(MAX_XOF).nullable().optional(),committedXof:z.number().int().min(0).max(MAX_XOF).nullable().optional(),expectedRevision:z.number().int().nonnegative()}),
 base.extend({kind:z.literal('crmTarget'),targetXof:z.number().int().min(1).max(MAX_XOF).nullable(),expectedTarget:z.number().int().min(1).max(MAX_XOF).nullable()}),
 base.extend({kind:z.literal('crmNote'),profileId:id,text:z.string().trim().min(1).max(4000)}),
 base.extend({kind:z.literal('qaReply'),questionId:id,body:z.string().trim().min(1).max(4000)}),
 base.extend({kind:z.literal('qaClose'),questionId:id}),
 base.extend({kind:z.literal('revoke'),grantId:id}),
 base.extend({kind:z.literal('draft'),slug:z.string().regex(/^[a-z0-9-]+$/).max(80),category:z.enum(['company','products','investment','finance','traction','team','technology','legal','compliance','documents','updates']),order:z.number().int().min(0).max(10000),titleFr:z.string().trim().min(1).max(180),titleEn:z.string().trim().min(1).max(180),bodyFr:z.string().trim().min(1).max(40000),bodyEn:z.string().trim().min(1).max(40000),blocksFr:z.string().max(250000).optional(),blocksEn:z.string().max(250000).optional(),source:z.string().trim().min(1).max(2000)}),
 base.extend({kind:z.literal('transition'),versionId:id,action:z.enum(['submit','publish'])}),
 base.extend({kind:z.literal('archive'),sectionId:id}),
 base.extend({kind:z.literal('setAccess'),profileIds:z.array(id).min(1).max(200),targets:z.array(z.object({capability:z.enum(['room:read','section:read','document:read','document:download']),resourceId:id.optional()})).min(1).max(50),effect:z.enum(['allow','deny']),startsAt:z.number().finite().optional(),expiresAt:z.number().finite().optional(),groupId:id.optional()}),
 base.extend({kind:z.literal('revokeMany'),grantIds:z.array(id).min(1).max(500)}),
 base.extend({kind:z.literal('saveGroup'),groupId:id.optional(),name:z.string().trim().min(1).max(80),profileIds:z.array(id).max(200)}),
 base.extend({kind:z.literal('deleteGroup'),groupId:id}),
 base.extend({kind:z.literal('roomStatus'),status:z.enum(['draft','published'])}),
 base.extend({kind:z.literal('revokeLink'),linkId:id}),
 base.extend({kind:z.literal('teamInvite'),email:z.string().email().max(254),capabilities:z.array(z.string().max(40)).min(1).max(12)}),
 base.extend({kind:z.literal('teamSetCaps'),membershipId:id,capabilities:z.array(z.string().max(40)).min(1).max(12)}),
 base.extend({kind:z.literal('teamRevoke'),membershipId:id}),
 base.extend({kind:z.literal('teamRevokeInvite'),inviteId:id}),
 base.extend({kind:z.literal('retryEmail'),emailId:id}),
 base.extend({kind:z.literal('ndaPublish'),textFr:z.string().trim().min(1).max(40000),textEn:z.string().trim().min(1).max(40000)}),
 base.extend({kind:z.literal('ndaRemove')}),
 base.extend({kind:z.literal('manualReview'),documentId:id,sha256:z.string().regex(/^[a-f0-9]{64}$/),verdict:z.enum(['clean','rejected'])}),
])
export type AdminCommand=z.infer<typeof adminCommand>
