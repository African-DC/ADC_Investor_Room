import {it,expect} from 'vitest'
import {hasAdminCapability} from '../convex/lib/adminPolicy'
import type {Doc,Id} from '../convex/_generated/dataModel'
const roomId='a' as Id<'rooms'>
const m:Pick<Doc<'stagingAdminMemberships'>,'authUserId'|'roomId'|'capabilities'|'revokedAt'>={authUserId:'admin-a',roomId,capabilities:['content:edit']}
it('denies missing membership, cross-room, cross-user and capability escalation',()=>{
 expect(hasAdminCapability(null,'admin-a',roomId)).toBe(false)
 expect(hasAdminCapability(m,'investor',roomId)).toBe(false)
 expect(hasAdminCapability(m,'admin-a','other')).toBe(false)
 expect(hasAdminCapability(m,'admin-a',roomId,'content:review')).toBe(false)
 expect(hasAdminCapability(m,'admin-a',roomId,'content:edit')).toBe(true)
 expect(hasAdminCapability({...m,revokedAt:0},'admin-a',roomId)).toBe(false)
})
