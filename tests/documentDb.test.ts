// @vitest-environment edge-runtime
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {convexTest} from 'convex-test'
import schema from '../convex/schema'
import {api,internal} from '../convex/_generated/api'
const modules=import.meta.glob(['../convex/**/*.*s','!../convex/**/*.test.ts'])
beforeEach(()=>vi.stubEnv('ADC_STAGING_CMS','true'))
afterEach(()=>vi.unstubAllEnvs())
it('unscanned document cannot publish, requires separate operator, key bound to room',async()=>{
 const t=convexTest(schema,modules)
 const roomId=await t.mutation(internal.stagingCms.createRoom,{name:'Fixture',organizationId:'fixture',operatorId:'author'})
 const sha256='a'.repeat(64)
 const args={roomId,titleFr:'PDF fictif',titleEn:'Fixture PDF',category:'legal',sha256,sizeBytes:100,operatorId:'author'}
 await expect(t.mutation(internal.documents.registerDraft,{...args,objectKey:'wrong/path.pdf'})).rejects.toThrow('Invalid document')
 const documentId=await t.mutation(internal.documents.registerDraft,{...args,objectKey:`rooms/${roomId}/${sha256}.pdf`})
 const versionId=await t.run(async ctx=>{const d=await ctx.db.get(documentId);if(!d?.currentVersionId)throw Error('Missing fixture');return d.currentVersionId})
 await expect(t.mutation(internal.documents.publish,{documentId,operatorId:'reviewer'})).rejects.toThrow('Publication denied')
 await t.mutation(internal.documents.recordScan,{versionId,status:'clean',operatorId:'scanner'})
 await expect(t.mutation(internal.documents.publish,{documentId,operatorId:'author'})).rejects.toThrow('Publication denied')
 await t.mutation(internal.documents.publish,{documentId,operatorId:'reviewer'})
 expect(await t.run(async ctx=>(await ctx.db.get(documentId))?.status)).toBe('published')
 const other=await t.mutation(internal.stagingCms.createRoom,{name:'Other fixture',organizationId:'fixture',operatorId:'author'})
 await expect(t.mutation(internal.documents.grant,{roomId:other,documentId,authUserId:'fixture',capability:'document:read',effect:'allow',operatorId:'reviewer'})).rejects.toThrow('Invalid scope')
 expect(await t.query(api.documents.list,{roomId})).toEqual([])
 expect(await t.mutation(api.documents.authorizeDelivery,{roomId,documentId,download:false,deliverySecret:'wrong'})).toBeNull()
})
