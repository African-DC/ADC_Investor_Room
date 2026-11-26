// @vitest-environment edge-runtime
import {afterEach,beforeEach,it,expect,vi} from 'vitest'
import {convexTest} from 'convex-test'
import schema from '../convex/schema'
import {api,internal} from '../convex/_generated/api'
import {storePdf} from './storageFixture'
const modules=import.meta.glob(['../convex/**/*.*s','!../convex/**/*.test.ts'])
beforeEach(()=>{vi.stubEnv('ADC_STAGING_CMS','true');vi.stubEnv('ADC_CONVEX_PORTAL_ENABLED','true');vi.stubEnv('ADC_CONVEX_DOCUMENTS_ENABLED','true')})
afterEach(()=>vi.unstubAllEnvs())
it('consumes expired or unauthorized tickets once, purges stale tickets and rejects direct requests',async()=>{
 const t=convexTest(schema,modules)
 const roomId=await t.mutation(internal.stagingCms.createRoom,{name:'Fixture',organizationId:'fixture',operatorId:'author'})
 await t.mutation(internal.stagingCms.setRoomStatus,{roomId,status:'published',operatorId:'author'})
 const actor='fixture'
 const file=await storePdf(t)
 const documentId=await t.mutation(internal.documents.registerDraft,{roomId,titleFr:'Fixture',titleEn:'Fixture',category:'legal',...file,operatorId:'author'})
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

it('serves a valid published file with Convex storage hash encoding, once only; rejects revoked access',async()=>{
 const t=convexTest(schema,modules),actor='fixture-reader'
 const roomId=await t.mutation(internal.stagingCms.createRoom,{name:'Fixture',organizationId:'fixture',operatorId:'author'})
 await t.mutation(internal.stagingCms.setRoomStatus,{roomId,status:'published',operatorId:'author'})
 const file=await storePdf(t)
 const documentId=await t.mutation(internal.documents.registerDraft,{roomId,titleFr:'Fixture',titleEn:'Fixture',category:'legal',...file,operatorId:'author'})
 const versionId=await t.run(async ctx=>{const d=await ctx.db.get(documentId);if(!d?.currentVersionId)throw Error('Fixture');return d.currentVersionId})
 await t.mutation(internal.documents.recordScan,{versionId,status:'clean',operatorId:'scanner'})
 await t.mutation(internal.documents.publish,{documentId,operatorId:'reviewer'})
 await t.mutation(internal.stagingCms.grant,{roomId,authUserId:actor,capability:'room:read',effect:'allow',operatorId:'author'})
 const grant=await t.mutation(internal.documents.grant,{roomId,authUserId:actor,documentId,capability:'document:read',effect:'allow',operatorId:'author'})
 const add=(ticket:string)=>t.run(ctx=>ctx.db.insert('documentDeliveryTickets',{ticket,roomId,documentId,versionId,authUserId:actor,download:false,expiresAt:Date.now()+60000}))
 const valid='e'.repeat(64);await add(valid)
 expect(await t.mutation(internal.documents.consumeDelivery,{ticket:valid})).toEqual(file)
 expect(await t.mutation(internal.documents.consumeDelivery,{ticket:valid})).toBeNull()
 const revoked='f'.repeat(64);await add(revoked)
 await t.run(ctx=>ctx.db.patch(grant,{revokedAt:Date.now()}))
 expect(await t.mutation(internal.documents.consumeDelivery,{ticket:revoked})).toBeNull()
})
it('draft review fails closed without authenticated reviewer or secret',async()=>{
 const t=convexTest(schema,modules)
 const roomId=await t.mutation(internal.stagingCms.createRoom,{name:'Fixture',organizationId:'fixture',operatorId:'author'})
 const file=await storePdf(t)
 const documentId=await t.mutation(internal.documents.registerDraft,{roomId,titleFr:'Fixture',titleEn:'Fixture',category:'legal',...file,operatorId:'author'})
 vi.stubEnv('ADC_STAGING_ADMIN_UI','true')
 await expect(t.query(api.documents.reviewUrl,{roomId,documentId})).rejects.toThrow('Unauthorized')
 expect(await t.action(api.documents.reviewFile,{roomId,documentId,deliverySecret:'wrong'})).toBeNull()
})
