// @vitest-environment edge-runtime
import {it,expect} from 'vitest'
import {convexTest} from 'convex-test'
import schema from '../convex/schema'
import {createRoomForActor} from '../convex/admin'
const modules=import.meta.glob(['../convex/**/*.*s','!../convex/**/*.test.ts'])
it('creates a private empty room in the source organization without escalating or copying memberships',async()=>{
 const t=convexTest(schema,modules)
 const source=await t.run(ctx=>ctx.db.insert('rooms',{organizationId:'adc-fixture',name:'Source',status:'published'}))
 await t.run(async ctx=>{
  await ctx.db.insert('stagingAdminMemberships',{roomId:source,authUserId:'creator',capabilities:['access:manage','content:review']})
  await ctx.db.insert('stagingAdminMemberships',{roomId:source,authUserId:'other',capabilities:['content:edit']})
  await ctx.db.insert('accessGrants',{roomId:source,authUserId:'investor',capability:'room:read',effect:'allow'})
 })
 await expect(t.run(ctx=>createRoomForActor(ctx,source,'other','Denied',''))).rejects.toThrow('Unauthorized')
 await expect(t.run(ctx=>createRoomForActor(ctx,source,'outsider','Denied',''))).rejects.toThrow('Unauthorized')
 const id=await t.run(ctx=>createRoomForActor(ctx,source,'creator','  KLASSCI  ',' Note '))
 const room=await t.run(ctx=>ctx.db.get(id))
 expect(room).toMatchObject({organizationId:'adc-fixture',name:'KLASSCI',description:'Note',status:'draft'})
 const members=await t.run(ctx=>ctx.db.query('stagingAdminMemberships').collect())
 expect(members.filter(m=>m.roomId===id)).toEqual([expect.objectContaining({authUserId:'creator',capabilities:['access:manage','content:review']})])
 expect((await t.run(ctx=>ctx.db.query('accessGrants').collect())).filter(g=>g.roomId===id)).toHaveLength(0)
 await expect(t.run(ctx=>createRoomForActor(ctx,source,'creator','KLASSCI',''))).rejects.toThrow('Room name already used')
})
