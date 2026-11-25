// @vitest-environment edge-runtime
import {afterEach,beforeEach,it,expect,vi} from 'vitest'
import {convexTest} from 'convex-test'
import schema from '../convex/schema'
import {api,internal} from '../convex/_generated/api'
import {listForIdentity} from '../convex/qa'
const modules=import.meta.glob(['../convex/**/*.*s','!../convex/**/*.test.ts'])
beforeEach(()=>vi.stubEnv('ADC_STAGING_CMS','true'))
afterEach(()=>vi.unstubAllEnvs())
it('requires room access and isolates private threads, including direct IDs and revocation',async()=>{
 const t=convexTest(schema,modules)
 const roomId=await t.mutation(internal.stagingCms.createRoom,{name:'Fixture',organizationId:'fixture',operatorId:'author'})
 await t.mutation(internal.stagingCms.setRoomStatus,{roomId,status:'published',operatorId:'author'})
 const a={roomId,subject:'Fixture subject',body:'Fixture message',actor:'investor-a'}
 await expect(t.mutation(internal.qa.fixtureAsk,a)).rejects.toThrow('Unavailable')
 const grantId=await t.mutation(internal.stagingCms.grant,{roomId,authUserId:a.actor,capability:'room:read',effect:'allow',operatorId:'author'})
 await t.mutation(internal.stagingCms.grant,{roomId,authUserId:'investor-b',capability:'room:read',effect:'allow',operatorId:'author'})
 await t.mutation(internal.qa.fixtureAsk,a)
 const read=(id:string)=>t.run(ctx=>listForIdentity(ctx,roomId,id))
 const rows=await read(a.actor);expect(rows).toHaveLength(1);expect(await read('investor-b')).toEqual([])
 const questionId=rows[0]!.id
 await expect(t.mutation(internal.qa.fixtureReply,{roomId,questionId,body:'Denied',actor:'investor-b'})).rejects.toThrow('Unavailable')
 await t.mutation(internal.qa.fixtureReply,{roomId,questionId,body:'Fixture reply',actor:a.actor})
 await t.mutation(internal.stagingCms.revoke,{grantId,operatorId:'author'})
 expect(await read(a.actor)).toEqual([])
 await expect(t.mutation(internal.qa.fixtureReply,{roomId,questionId,body:'Denied',actor:a.actor})).rejects.toThrow('Unavailable')
 expect(await t.query(api.qa.read,{roomId,questionId})).toBeNull()
})
