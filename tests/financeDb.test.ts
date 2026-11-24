// @vitest-environment edge-runtime
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {convexTest} from 'convex-test'
import schema from '../convex/schema'
import {api,internal} from '../convex/_generated/api'
import {publishedForIdentity} from '../convex/finance'
const modules=import.meta.glob(['../convex/**/*.*s','!../convex/**/*.test.ts'])
beforeEach(()=>vi.stubEnv('ADC_STAGING_CMS','true'))
afterEach(()=>vi.unstubAllEnvs())
it('requires evidence, separates review, replaces exact snapshot and respects section scope',async()=>{
 const t=convexTest(schema,modules)
 const roomId=await t.mutation(internal.stagingCms.createRoom,{name:'Fixture',organizationId:'fixture',operatorId:'author'})
 await t.mutation(internal.stagingCms.setRoomStatus,{roomId,status:'published',operatorId:'author'})
 const version=await t.mutation(internal.stagingCms.draft,{roomId,slug:'finance',category:'finance',order:1,titleFr:'Fixture',titleEn:'Fixture',bodyFr:'Fixture',bodyEn:'Fixture',source:'fixture',operatorId:'author'})
 const sectionId=await t.run(async ctx=>{const v=await ctx.db.get(version);if(!v)throw Error('fixture');return v.sectionId})
 await t.mutation(internal.stagingCms.submit,{versionId:version,operatorId:'author'})
 await t.mutation(internal.stagingCms.publish,{versionId:version,operatorId:'reviewer'})
 const sha256='a'.repeat(64)
 const documentId=await t.mutation(internal.documents.registerDraft,{roomId,titleFr:'Fixture',titleEn:'Fixture',category:'finance',objectKey:`rooms/${roomId}/${sha256}.pdf`,sha256,sizeBytes:100,operatorId:'author'})
 const evidence=await t.run(async ctx=>{const d=await ctx.db.get(documentId);if(!d?.currentVersionId)throw Error('fixture');return d.currentVersionId})
 const args={roomId,sectionId,kind:'invoiced' as const,unit:'XOF' as const,value:100,scope:'Fixture',periodStart:'2026-01-01',periodEnd:'2026-01-31',definitionFr:'Fixture',definitionEn:'Fixture',evidenceVersionIds:[evidence],operatorId:'author'}
 await expect(t.mutation(internal.finance.stagingDraft,args)).rejects.toThrow('Invalid metric or evidence')
 await t.mutation(internal.documents.recordScan,{versionId:evidence,status:'clean',operatorId:'scanner'})
 await t.mutation(internal.documents.publish,{documentId,operatorId:'reviewer'})
 const first=await t.mutation(internal.finance.stagingDraft,args)
 const publish=async(metricId:typeof first)=>{await t.mutation(internal.finance.stagingTransition,{roomId,metricId,action:'submit',operatorId:'author'});await expect(t.mutation(internal.finance.stagingTransition,{roomId,metricId,action:'publish',operatorId:'author'})).rejects.toThrow('Separate reviewer required');await t.mutation(internal.finance.stagingTransition,{roomId,metricId,action:'publish',operatorId:'reviewer'})}
 await publish(first)
 const second=await t.mutation(internal.finance.stagingDraft,{...args,value:120})
 await publish(second)
 expect(await t.run(async ctx=>(await ctx.db.get(first))?.status)).toBe('archived')
 const read=()=>t.run(ctx=>publishedForIdentity(ctx,'investor',roomId))
 expect(await read()).toEqual([])
 await t.mutation(internal.stagingCms.grant,{roomId,authUserId:'investor',capability:'room:read',effect:'allow',operatorId:'author'})
 expect(await read()).toEqual([])
 const grantId=await t.mutation(internal.stagingCms.grant,{roomId,sectionId,authUserId:'investor',capability:'section:read',effect:'allow',operatorId:'author'})
 expect((await read()).map(m=>m.value)).toEqual([120])
 expect((await read())[0]).not.toHaveProperty('evidenceVersionIds')
 await t.run(ctx=>ctx.db.patch(documentId,{status:'archived'}))
 expect(await read()).toEqual([])
 await t.mutation(internal.stagingCms.revoke,{grantId,operatorId:'author'})
 expect(await read()).toEqual([])
 expect(await t.query(api.finance.published,{roomId})).toEqual([])
})
