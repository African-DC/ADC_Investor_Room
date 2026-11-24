// @vitest-environment edge-runtime
import {afterEach,beforeEach,it,expect,vi} from 'vitest'
import {convexTest} from 'convex-test'
import schema from '../convex/schema'
import {api,internal} from '../convex/_generated/api'
import {retrieveForIdentity} from '../convex/intelligence'
const modules=import.meta.glob(['../convex/**/*.*s','!../convex/**/*.test.ts'])
beforeEach(()=>{vi.stubEnv('ADC_STAGING_CMS','true');vi.stubEnv('ADC_CONVEX_AI_ENABLED','true');vi.stubEnv('ADC_CONVEX_PORTAL_ENABLED','true')})
afterEach(()=>vi.unstubAllEnvs())
it('checks exact room, published version, section ACL, NDA and quota without persisting prompts',async()=>{
 const t=convexTest(schema,modules)
 const roomId=await t.mutation(internal.stagingCms.createRoom,{name:'Fixture',organizationId:'fixture',operatorId:'author'})
 const other=await t.mutation(internal.stagingCms.createRoom,{name:'Other',organizationId:'fixture',operatorId:'author'})
 await t.mutation(internal.stagingCms.setRoomStatus,{roomId,status:'published',operatorId:'author'})
 const a={roomId,slug:'fixture',category:'company',order:1,titleFr:'Projet fixture',titleEn:'Fixture project',bodyFr:'Projet alpha publié',bodyEn:'Published alpha project',source:'fixture',operatorId:'author'}
 const version=await t.mutation(internal.stagingCms.draft,a)
 const sectionId=await t.run(async ctx=>{const v=await ctx.db.get(version);if(!v)throw Error('fixture');return v.sectionId})
 const publish=async(id:typeof version)=>{await t.mutation(internal.stagingCms.submit,{versionId:id,operatorId:'author'});await t.mutation(internal.stagingCms.publish,{versionId:id,operatorId:'reviewer'})}
 await publish(version)
 const user='fixture-investor'
 const read=()=>t.run(ctx=>retrieveForIdentity(ctx,roomId,user,'alpha','fr',false))
 expect(await read()).toBeNull()
 await t.mutation(internal.stagingCms.grant,{roomId,authUserId:user,capability:'room:read',effect:'allow',operatorId:'author'})
 expect(await read()).toEqual([])
 const grant=await t.mutation(internal.stagingCms.grant,{roomId,sectionId,authUserId:user,capability:'section:read',effect:'allow',operatorId:'author'})
 expect((await read())?.map(p=>p.text)).toEqual(['Projet alpha publié'])
 expect(await t.run(ctx=>retrieveForIdentity(ctx,other,user,'alpha','fr',false))).toBeNull()
 const draft=await t.mutation(internal.stagingCms.draft,{...a,bodyFr:'Projet alpha brouillon'})
 expect((await read())?.[0]?.version).toBe(version)
 await publish(draft)
 expect((await read())?.[0]?.version).toBe(draft)
 await t.run(ctx=>ctx.db.patch(roomId,{ndaVersion:'v2'}))
 expect(await read()).toBeNull()
 await t.run(ctx=>ctx.db.patch(roomId,{ndaVersion:undefined}))
 for(let i=0;i<10;i++)expect(await t.mutation(internal.intelligence.fixtureQuota,{roomId,actor:user})).toEqual({ok:true,limit:false})
 expect(await t.mutation(internal.intelligence.fixtureQuota,{roomId,actor:user})).toEqual({ok:false,limit:true})
 await t.mutation(internal.stagingCms.revoke,{grantId:grant,operatorId:'author'})
 expect(await read()).toEqual([])
 expect(await t.query(api.intelligence.sources,{roomId,question:'alpha',lang:'fr',includeFinance:false})).toBeNull()
 const quotas=await t.run(ctx=>ctx.db.query('aiQuotas').collect())
 expect(quotas).toHaveLength(1);expect(quotas[0]).not.toHaveProperty('question')
})
