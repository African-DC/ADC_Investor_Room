// @vitest-environment edge-runtime
import {afterEach,beforeEach,it,expect,vi} from 'vitest'
import {convexTest} from 'convex-test'
import schema from '../convex/schema'
import {changeTarget} from '../convex/crm'
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

it('funding values and assignments are scoped, validated, audited and do not change access',async()=>{
 const t=convexTest(schema,modules)
 const roomId=await t.mutation(internal.stagingCms.createRoom,{name:'Fixture',organizationId:'fixture',operatorId:'author'})
 const otherRoom=await t.mutation(internal.stagingCms.createRoom,{name:'Other',organizationId:'fixture',operatorId:'author'})
 const {profileId,owner,foreign,revoked}=await t.run(async ctx=>{
  const profileId=await ctx.db.insert('investorProfiles',{authUserId:'fixture',name:'Fixture',email:'fixture@example.test',createdAt:0,updatedAt:0})
  await ctx.db.insert('roomApplicants',{roomId,profileId})
  const owner=await ctx.db.insert('stagingAdminMemberships',{roomId,authUserId:'eligible',capabilities:['crm:edit']})
  const foreign=await ctx.db.insert('stagingAdminMemberships',{roomId:otherRoom,authUserId:'other',capabilities:['crm:edit']})
  const revoked=await ctx.db.insert('stagingAdminMemberships',{roomId,authUserId:'revoked',capabilities:['crm:edit'],revokedAt:1})
  return {profileId,owner,foreign,revoked}
 })
 const a={roomId,profileId,stage:'negotiation' as const,nextAction:'Follow up',assignToMe:false,expectedRevision:0,actor:'operator',expectedXof:20000000}
 await expect(t.mutation(internal.crm.fixtureUpdate,{...a,ownerMembershipId:foreign})).rejects.toThrow('Invalid assignee')
 await expect(t.mutation(internal.crm.fixtureUpdate,{...a,ownerMembershipId:revoked})).rejects.toThrow('Invalid assignee')
 await expect(t.mutation(internal.crm.fixtureUpdate,{...a,committedXof:1})).rejects.toThrow('Invalid funding amounts')
 await expect(t.mutation(internal.crm.fixtureUpdate,{...a,expectedXof:-1})).rejects.toThrow('Invalid funding amounts')
 await t.mutation(internal.crm.fixtureUpdate,{...a,ownerMembershipId:owner})
 await t.mutation(internal.crm.fixtureUpdate,{...a,stage:'committed',expectedRevision:1,committedXof:15000000})
 await expect(t.mutation(internal.crm.fixtureUpdate,{...a,expectedRevision:2})).rejects.toThrow('Invalid funding amounts')
 await t.mutation(internal.crm.fixtureUpdate,{...a,expectedRevision:2,committedXof:null,ownerMembershipId:null})
 await t.run(ctx=>changeTarget(ctx,roomId,100000000,null,'operator'))
 await expect(t.run(ctx=>changeTarget(ctx,roomId,200000000,null,'operator'))).rejects.toThrow('Refresh required')
 const result=await t.run(async ctx=>({contact:await ctx.db.query('crmContacts').withIndex('by_room_profile',q=>q.eq('roomId',roomId).eq('profileId',profileId)).unique(),room:await ctx.db.get(roomId),grants:await ctx.db.query('accessGrants').take(1)}))
 expect(result.contact?.expectedXof).toBe(20000000);expect(result.contact?.committedXof).toBeUndefined();expect(result.contact?.ownerId).toBeUndefined();expect(result.room?.crmTargetXof).toBe(100000000);expect(result.grants).toHaveLength(0)
 await expect(t.query(api.crm.settings,{roomId})).rejects.toThrow('Unavailable')
})
