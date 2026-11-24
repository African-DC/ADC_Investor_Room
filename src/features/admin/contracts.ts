import { z } from 'zod'
const id=z.string().min(1).max(128)
const base=z.object({roomId:id})
export const adminCommand=z.discriminatedUnion('kind',[
 base.extend({kind:z.literal('grant'),profileId:id,capability:z.enum(['room:read','section:read']),sectionId:id.optional(),effect:z.enum(['allow','deny']),expiresAt:z.number().finite().optional()}),
 base.extend({kind:z.literal('revoke'),grantId:id}),
 base.extend({kind:z.literal('draft'),slug:z.string().regex(/^[a-z0-9-]+$/).max(80),category:z.enum(['company','products','investment','finance','traction','team','technology','legal','compliance','documents','updates']),order:z.number().int().min(0).max(10000),titleFr:z.string().trim().min(1).max(180),titleEn:z.string().trim().min(1).max(180),bodyFr:z.string().trim().min(1).max(40000),bodyEn:z.string().trim().min(1).max(40000),source:z.string().trim().min(1).max(2000)}),
 base.extend({kind:z.literal('transition'),versionId:id,action:z.enum(['submit','publish'])}),
 base.extend({kind:z.literal('archive'),sectionId:id}),
])
export type AdminCommand=z.infer<typeof adminCommand>
