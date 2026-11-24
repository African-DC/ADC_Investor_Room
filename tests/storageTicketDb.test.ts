// @vitest-environment edge-runtime
import {afterEach,beforeEach,it,expect,vi} from 'vitest'
import {convexTest} from 'convex-test'
import schema from '../convex/schema'
import {api,internal} from '../convex/_generated/api'
const modules=import.meta.glob(['../convex/**/*.*s','!../convex/**/*.test.ts'])
beforeEach(()=>{vi.stubEnv('ADC_STAGING_CMS','true');vi.stubEnv('ADC_CONVEX_PORTAL_ENABLED','true');vi.stubEnv('ADC_CONVEX_DOCUMENTS_ENABLED','true')})
afterEach(()=>vi.unstubAllEnvs())
it('consumes expired or unauthorized tickets once, purges stale tickets and rejects direct requests',async()=>{
 const t=convexTest(schema,modules)
 const roomId=await t.mutation(internal.stagingCms.createRoom,{name:'Fixture',organizationId:'fixture',operatorId:'author'})
 await t.mutation(internal.stagingCms.setRoomStatus,{roomId,status:'published',operatorId:'author'})
 const sha256='a'.repeat(64),actor='fixture'
 const documentId=await t.mutation(internal.documents.registerDraft,{roomId,titleFr:'Fixture',titleEn:'Fixture',category:'legal',objectKey:`rooms/${roomId}/${sha256}.pdf`,sha256,sizeBytes:100,operatorId:'author'})
 const versionId=await t.run(async ctx=>{const d=await ctx.db.get(documentId);if(!d?.currentVersionId)throw Error('Fixture');return d.currentVersionId})
 const add=(ticket:string,expiresAt:number)=>t.run(ctx=>ctx.db.insert('documentDeliveryTickets',{ticket,roomId,documentId,versionId,authUserId:actor,download:false,expiresAt}))
 const expired='a'.repeat(64),denied='b'.repeat(64),stale='c'.repeat(64)
 await add(expired,Date.now()-1000);await add(denied,Date.now()+60000)
 expect(await t.mutation(internal.documents.consumeDelivery,{ticket:expired})).toBeNull()
 expect(await t.mutation(internal.documents.consumeDelivery,{ticket:denied})).toBeNull()
 expect(await t.mutation(internal.documents.consumeDelivery,{ticket:denied})).toBeNull()
 expect(await t.run(ctx=>ctx.db.query('documentDeliveryTickets').collect())).toEqual([])
 await add(stale,Date.now()-1000)
 expect(await t.mutation(internal.documents.purgeTickets,{})).toBe(1)
 expect(await t.mutation(internal.documents.purgeTickets,{})).toBe(0)
 expect(await t.mutation(api.documents.authorizeDelivery,{roomId,documentId,download:false,deliverySecret:'wrong',ticket:'d'.repeat(64)})).toBeNull()
 expect(await t.mutation(api.documents.authorizeUpload,{roomId,secret:'wrong'})).toBeNull()
})
