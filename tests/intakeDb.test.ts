// @vitest-environment edge-runtime
import {afterEach,beforeEach,it,expect,vi} from 'vitest'
import {convexTest} from 'convex-test'
import schema from '../convex/schema'
import {internal,api} from '../convex/_generated/api'
const modules=import.meta.glob(['../convex/**/*.*s','!../convex/**/*.test.ts'])
beforeEach(()=>vi.stubEnv('ADC_STAGING_CMS','true'))
afterEach(()=>vi.unstubAllEnvs())
it('links only a verified profile to a published room, idempotently without granting access',async()=>{
 const t=convexTest(schema,modules)
 const roomId=await t.mutation(internal.stagingCms.createRoom,{name:'Fixture',organizationId:'fixture',operatorId:'author'})
 const profileId=await t.run(ctx=>ctx.db.insert('investorProfiles',{authUserId:'fixture',name:'Fixture',email:'fixture@example.test',createdAt:0,updatedAt:0}))
 const args={roomId,profileId,actor:'fixture'}
 await expect(t.mutation(internal.investors.fixtureRequest,args)).rejects.toThrow('Unavailable')
 await t.mutation(internal.stagingCms.setRoomStatus,{roomId,status:'published',operatorId:'author'})
 await expect(t.mutation(internal.investors.fixtureRequest,{...args,actor:'other'})).rejects.toThrow('Unavailable')
 await t.mutation(internal.investors.fixtureRequest,args);await t.mutation(internal.investors.fixtureRequest,args)
 const result=await t.run(async ctx=>({links:await ctx.db.query('roomApplicants').collect(),grants:await ctx.db.query('accessGrants').collect()}))
 expect(result.links).toHaveLength(1);expect(result.grants).toHaveLength(0)
 await expect(t.mutation(api.investors.registerVerified,{requestAccess:true})).rejects.toThrow('Unauthorized')
})
