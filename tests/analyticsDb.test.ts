// @vitest-environment edge-runtime
import {afterEach,beforeEach,it,expect,vi} from 'vitest'
import {convexTest} from 'convex-test'
import schema from '../convex/schema'
import {api,internal} from '../convex/_generated/api'
const modules=import.meta.glob(['../convex/**/*.*s','!../convex/**/*.test.ts'])
beforeEach(()=>{vi.stubEnv('ADC_STAGING_CMS','true');vi.stubEnv('ADC_CONVEX_ANALYTICS_ENABLED','true');vi.stubEnv('ADC_CONVEX_PORTAL_ENABLED','true')})
afterEach(()=>vi.unstubAllEnvs())
it('requires consent, deduplicates, rejects unrelated sections and respects revocation',async()=>{
 const t=convexTest(schema,modules)
 const roomId=await t.mutation(internal.stagingCms.createRoom,{name:'Fixture',organizationId:'fixture',operatorId:'author'})
 const other=await t.mutation(internal.stagingCms.createRoom,{name:'Other',organizationId:'fixture',operatorId:'author'})
 await t.mutation(internal.stagingCms.setRoomStatus,{roomId,status:'published',operatorId:'author'})
 const version=await t.mutation(internal.stagingCms.draft,{roomId,slug:'fixture',category:'company',order:1,titleFr:'Fixture',titleEn:'Fixture',bodyFr:'Fixture',bodyEn:'Fixture',source:'fixture',operatorId:'author'})
 const sectionId=await t.run(async ctx=>{const v=await ctx.db.get(version);if(!v)throw Error('Fixture');return v.sectionId})
 await t.mutation(internal.stagingCms.submit,{versionId:version,operatorId:'author'})
 await t.mutation(internal.stagingCms.publish,{versionId:version,operatorId:'reviewer'})
 const actor='fixture-user',a={roomId,sectionId,actor}
 const events=()=>t.run(ctx=>ctx.db.query('engagement').collect())
 await expect(t.mutation(internal.analytics.fixtureConsent,{roomId,actor,allowed:true})).rejects.toThrow('Unavailable')
 await t.mutation(internal.stagingCms.grant,{roomId,authUserId:actor,capability:'room:read',effect:'allow',operatorId:'author'})
 const grant=await t.mutation(internal.stagingCms.grant,{roomId,sectionId,authUserId:actor,capability:'section:read',effect:'allow',operatorId:'author'})
 await t.mutation(internal.analytics.fixtureSection,a);expect(await events()).toHaveLength(0)
 await t.mutation(internal.analytics.fixtureConsent,{roomId,actor,allowed:true})
 await t.mutation(internal.analytics.fixtureSection,a);await t.mutation(internal.analytics.fixtureSection,a)
 expect(await events()).toHaveLength(1)
 expect(await t.mutation(internal.analytics.fixtureSection,{...a,roomId:other})).toEqual({ok:false})
 await t.mutation(internal.analytics.fixtureConsent,{roomId,actor,allowed:false})
 await t.mutation(internal.analytics.fixtureSection,a);expect(await events()).toHaveLength(1)
 await t.mutation(internal.stagingCms.revoke,{grantId:grant,operatorId:'author'})
 expect(await t.mutation(internal.analytics.fixtureSection,a)).toEqual({ok:false})
 await expect(t.query(api.analytics.dashboard,{roomId,days:30})).rejects.toThrow('Unavailable')
 const expired=Date.now()-91*86400000
 await t.run(ctx=>ctx.db.insert('engagement',{roomId,authUserId:actor,kind:'section_open',resourceId:sectionId,day:new Date(expired).toISOString().slice(0,10),at:expired}))
 expect(await t.mutation(internal.analytics.purge,{})).toEqual({deleted:1,more:false})
 expect(await t.mutation(internal.analytics.purge,{})).toEqual({deleted:0,more:false})
 expect(await events()).toHaveLength(1)
})
