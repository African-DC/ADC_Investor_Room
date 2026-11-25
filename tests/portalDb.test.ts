// @vitest-environment edge-runtime
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {convexTest} from 'convex-test'
import schema from '../convex/schema'
import {api,internal} from '../convex/_generated/api'
import {overviewForIdentity} from '../convex/portal'
const modules=import.meta.glob(['../convex/**/*.*s','!../convex/**/*.test.ts'])
beforeEach(()=>vi.stubEnv('ADC_STAGING_CMS','true'))
afterEach(()=>vi.unstubAllEnvs())
const investor={_id:'test-investor',name:'Fixture only'}
const author='fixture-author',reviewer='fixture-reviewer'
async function fixture(){
 const t=convexTest(schema,modules)
 const roomId=await t.mutation(internal.stagingCms.createRoom,{name:'Synthetic room',organizationId:'fixture',operatorId:author})
 await t.mutation(internal.stagingCms.setRoomStatus,{roomId,status:'published',operatorId:author})
 const draftArgs={roomId,slug:'test-section',category:'company',order:1,titleFr:'Publié fictif',titleEn:'Synthetic published',bodyFr:'Texte fictif',bodyEn:'Fixture body',source:'fixture only',operatorId:author}
 const versionId=await t.mutation(internal.stagingCms.draft,draftArgs)
 const sectionId=await t.run(async ctx=>{const version=await ctx.db.get(versionId);if(!version)throw Error('Missing fixture');return version.sectionId})
 const read=()=>t.run(ctx=>overviewForIdentity(ctx,investor,roomId))
 return {t,roomId,versionId,sectionId,draftArgs,read}
}
it('CMS disabled by default and portal public API fail closed without its flag',async()=>{
 vi.stubEnv('ADC_STAGING_CMS','false');vi.stubEnv('ADC_CONVEX_PORTAL_ENABLED','false')
 const t=convexTest(schema,modules)
 await expect(t.mutation(internal.stagingCms.createRoom,{name:'Denied',organizationId:'fixture',operatorId:author})).rejects.toThrow('Staging CMS disabled')
 expect(await t.query(api.portal.overview,{})).toBeNull()
})
it('separates draft from publication; requires reviewer, explicit room and section scope; revokes',async()=>{
 const {t,roomId,sectionId,versionId,draftArgs,read}=await fixture()
 expect((await read()).rooms).toHaveLength(0)
 const roomGrant=await t.mutation(internal.stagingCms.grant,{roomId,authUserId:investor._id,capability:'room:read',effect:'allow',operatorId:author})
 expect((await read()).sections).toHaveLength(0)
 const grantId=await t.mutation(internal.stagingCms.grant,{roomId,authUserId:investor._id,capability:'section:read',sectionId,effect:'allow',operatorId:author})
 expect((await read()).sections).toHaveLength(0)
 await t.mutation(internal.stagingCms.submit,{versionId,operatorId:author})
 await expect(t.mutation(internal.stagingCms.publish,{versionId,operatorId:author})).rejects.toThrow('Separate reviewer required')
 await t.mutation(internal.stagingCms.publish,{versionId,operatorId:reviewer})
 expect((await read()).sections.map(x=>x.titleFr)).toEqual(['Publié fictif'])
 const newVersion=await t.mutation(internal.stagingCms.draft,{...draftArgs,titleFr:'Brouillon secret'})
 expect((await read()).sections.map(x=>x.titleFr)).toEqual(['Publié fictif'])
 await t.mutation(internal.stagingCms.submit,{versionId:newVersion,operatorId:author})
 await t.mutation(internal.stagingCms.publish,{versionId:newVersion,operatorId:reviewer})
 expect((await read()).sections.map(x=>x.titleFr)).toEqual(['Brouillon secret'])
 expect((await t.run(ctx=>overviewForIdentity(ctx,{_id:'other-user',name:'Other'},roomId))).sections).toHaveLength(0)
 await t.mutation(internal.stagingCms.revoke,{grantId,operatorId:author});expect((await read()).sections).toHaveLength(0)
 await t.mutation(internal.stagingCms.revoke,{grantId:roomGrant,operatorId:author});expect((await read()).rooms).toHaveLength(0)
})
it('NDA change invalidates previous consent and cannot reuse version',async()=>{
 const {t,roomId,sectionId,versionId,read}=await fixture()
 await t.mutation(internal.stagingCms.submit,{versionId,operatorId:author})
 await t.mutation(internal.stagingCms.publish,{versionId,operatorId:reviewer})
 await t.mutation(internal.stagingCms.grant,{roomId,authUserId:investor._id,capability:'room:read',effect:'allow',operatorId:author})
 await t.mutation(internal.stagingCms.grant,{roomId,authUserId:investor._id,capability:'section:read',sectionId,effect:'allow',operatorId:author})
 const nda={roomId,textFr:'Accord fictif',textEn:'Fixture NDA',operatorId:author}
 await t.mutation(internal.stagingCms.setNda,{...nda,version:'v1'})
 expect((await read()).nda?.version).toBe('v1');expect((await read()).sections).toHaveLength(0)
 await t.run(ctx=>ctx.db.insert('ndaAcceptances',{authUserId:investor._id,roomId,version:'v1',acceptedAt:Date.now()}))
 expect((await read()).sections).toHaveLength(1)
 await t.mutation(internal.stagingCms.setNda,{...nda,version:'v2'})
 expect((await read()).nda?.version).toBe('v2');expect((await read()).sections).toHaveLength(0)
 await expect(t.mutation(internal.stagingCms.setNda,{...nda,version:'v1'})).rejects.toThrow('NDA version already used')
})
