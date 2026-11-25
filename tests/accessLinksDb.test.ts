// @vitest-environment edge-runtime
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {convexTest} from 'convex-test'
import schema from '../convex/schema'
import {internal} from '../convex/_generated/api'
import {redeemCore} from '../convex/access'
import {sha256Hex} from '../convex/lib/totp'
import {permits} from '../convex/lib/roomPolicy'
const modules=import.meta.glob(['../convex/**/*.*s','!../convex/**/*.test.ts'])
beforeEach(()=>vi.stubEnv('ADC_STAGING_CMS','true'));afterEach(()=>vi.unstubAllEnvs())
const TOKEN='A'.repeat(43),OTHER='B'.repeat(43)
const alice={_id:'u_alice',email:'alice@example.com',name:'Alice'},bob={_id:'u_bob',email:'bob@example.com',name:'Bob'}
async function setup(over:Record<string,unknown>={}){
 const t=convexTest(schema,modules)
 const roomId=await t.mutation(internal.stagingCms.createRoom,{name:'Fixture',organizationId:'fixture',operatorId:'ops'})
 await t.mutation(internal.stagingCms.setRoomStatus,{roomId,status:'published',operatorId:'ops'})
 const now=Date.now()
 const linkId=await t.run(async ctx=>ctx.db.insert('accessLinks',{roomId,tokenHash:await sha256Hex(TOKEN),label:'Invitation',targets:[{capability:'room:read'}],startsAt:now-1000,expiresAt:now+3600_000,maxUses:1,uses:0,createdBy:'admin',createdAt:now,...over}))
 return {t,roomId,linkId}
}
it('grants exactly the link targets once, idempotently, and caps uses',async()=>{
 const {t,roomId}=await setup()
 expect(await t.run(ctx=>redeemCore(ctx,alice,TOKEN))).toEqual({ok:true,roomId})
 expect(await t.run(ctx=>redeemCore(ctx,alice,TOKEN))).toEqual({ok:true,roomId})
 expect(await t.run(ctx=>redeemCore(ctx,bob,TOKEN))).toEqual({ok:false,reason:'full'})
 const grants=await t.run(ctx=>ctx.db.query('accessGrants').collect())
 expect(grants).toHaveLength(1);expect(grants[0].authUserId).toBe('u_alice')
 const room=(await t.run(ctx=>ctx.db.get(roomId)))!
 expect(permits('u_alice',room,grants,Date.now(),'room:read')).toBe(true)
 expect(permits('u_bob',room,grants,Date.now(),'room:read')).toBe(false)
})
it('refuses unknown, malformed, future, expired, revoked and wrong-email links',async()=>{
 expect(await (await setup()).t.run(ctx=>redeemCore(ctx,alice,OTHER))).toEqual({ok:false,reason:'invalid'})
 expect(await (await setup()).t.run(ctx=>redeemCore(ctx,alice,'short'))).toEqual({ok:false,reason:'invalid'})
 expect(await (await setup({startsAt:Date.now()+60_000})).t.run(ctx=>redeemCore(ctx,alice,TOKEN))).toEqual({ok:false,reason:'notyet'})
 expect(await (await setup({expiresAt:Date.now()-1})).t.run(ctx=>redeemCore(ctx,alice,TOKEN))).toEqual({ok:false,reason:'expired'})
 expect(await (await setup({revokedAt:Date.now()})).t.run(ctx=>redeemCore(ctx,alice,TOKEN))).toEqual({ok:false,reason:'invalid'})
 expect(await (await setup({email:'bob@example.com'})).t.run(ctx=>redeemCore(ctx,alice,TOKEN))).toEqual({ok:false,reason:'email'})
})
it('access granted by a link ends at grantUntil',async()=>{
 const until=Date.now()+5000
 const {t,roomId}=await setup({grantUntil:until})
 await t.run(ctx=>redeemCore(ctx,alice,TOKEN))
 const grants=await t.run(ctx=>ctx.db.query('accessGrants').collect()),room=(await t.run(ctx=>ctx.db.get(roomId)))!
 expect(permits('u_alice',room,grants,Date.now(),'room:read')).toBe(true)
 expect(permits('u_alice',room,grants,until+1,'room:read')).toBe(false)
})
