// @vitest-environment edge-runtime
import {afterEach,beforeEach,it,expect,vi} from 'vitest'
import {convexTest} from 'convex-test'
import schema from '../convex/schema'
import {internal,api} from '../convex/_generated/api'
const modules=import.meta.glob(['../convex/**/*.*s','!../convex/**/*.test.ts'])
beforeEach(()=>vi.stubEnv('ADC_STAGING_CMS','true'))
afterEach(()=>vi.unstubAllEnvs())
it('keeps pipeline private and independent of grants, denies cross-room and stale updates',async()=>{
 const t=convexTest(schema,modules)
 const roomId=await t.mutation(internal.stagingCms.createRoom,{name:'Fixture',organizationId:'fixture',operatorId:'author'})
 const other=await t.mutation(internal.stagingCms.createRoom,{name:'Other fixture',organizationId:'fixture',operatorId:'author'})
 const profileId=await t.run(async ctx=>{const id=await ctx.db.insert('investorProfiles',{authUserId:'fixture',name:'Fixture',email:'fixture@example.test',createdAt:0,updatedAt:0});await ctx.db.insert('roomApplicants',{roomId,profileId:id});return id})
 const a={roomId,profileId,stage:'qualified' as const,nextAction:'Fixture follow-up',dueDate:'2026-12-01',assignToMe:true,expectedRevision:0,actor:'operator'}
 await expect(t.mutation(internal.crm.fixtureUpdate,{...a,roomId:other})).rejects.toThrow('Unavailable')
 await t.mutation(internal.crm.fixtureUpdate,a)
 await expect(t.mutation(internal.crm.fixtureUpdate,a)).rejects.toThrow('Refresh required')
 await t.mutation(internal.crm.fixtureNote,{roomId,profileId,text:'Fixture private note',actor:'operator'})
 const result=await t.run(async ctx=>({grants:await ctx.db.query('accessGrants').collect(),events:await ctx.db.query('crmEvents').collect()}))
 expect(result.grants).toHaveLength(0);expect(result.events).toHaveLength(2)
 await expect(t.query(api.crm.history,{roomId,profileId})).rejects.toThrow('Unavailable')
 await expect(t.mutation(api.crm.note,{roomId,profileId,text:'Denied'})).rejects.toThrow('Unavailable')
})
