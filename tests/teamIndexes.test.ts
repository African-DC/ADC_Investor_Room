// @vitest-environment edge-runtime
import {expect,it} from 'vitest'
import {convexTest} from 'convex-test'
import schema from '../convex/schema'
import {activeInvites} from '../convex/team'
const modules=import.meta.glob(['../convex/**/*.*s','!../convex/**/*.test.ts'])
it('finds only unexpired pending invitations regardless of accumulated history',async()=>{
 const t=convexTest(schema,modules),now=Date.now()
 const id=await t.run(async ctx=>{
  const roomId=await ctx.db.insert('rooms',{name:'Fixture',organizationId:'org',status:'draft'})
  const fields={roomId,email:'test@example.com',capabilities:['access:manage'],invitedBy:'fixture',createdAt:now-1000,expiresAt:now+1000}
  await ctx.db.insert('adminInvites',{...fields,acceptedAt:now-500})
  await ctx.db.insert('adminInvites',{...fields,revokedAt:now-500})
  await ctx.db.insert('adminInvites',{...fields,expiresAt:now})
  await ctx.db.insert('adminInvites',{...fields,email:'other@example.com'})
  return ctx.db.insert('adminInvites',fields)
 })
 expect((await t.run(ctx=>activeInvites(ctx,' TEST@example.com ',now).collect())).map(i=>i._id)).toEqual([id])
})
