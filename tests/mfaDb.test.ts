// @vitest-environment edge-runtime
import {expect,it} from 'vitest'
import {convexTest} from 'convex-test'
import schema from '../convex/schema'
import {internal} from '../convex/_generated/api'
import {requireMfa} from '../convex/mfa'
const modules=import.meta.glob(['../convex/**/*.*s','!../convex/**/*.test.ts'])
const U='user_admin'
async function setup(){
 const t=convexTest(schema,modules)
 await t.run(ctx=>ctx.db.insert('adminMfa',{authUserId:U,secretSealed:'x',status:'pending',lastStep:-1,recoveryHashes:[],failures:0,createdAt:Date.now()}))
 return t
}
const check=(t:ReturnType<typeof convexTest>,sessionId?:string)=>t.withIdentity({subject:U,...(sessionId?{sessionId}:{})}).run(ctx=>requireMfa(ctx,U))
it('session-bound proof is required; pending enrollment never counts',async()=>{
 const t=await setup()
 await expect(check(t)).rejects.toThrow('MFA required')
 await expect(check(t,'s1')).rejects.toThrow('MFA required')
 // activation with a valid step creates a proof for s1 only
 expect(await t.mutation(internal.mfa.recordAttempt,{userId:U,sessionId:'s1',step:100,activate:['h1','h2']})).toBe(true)
 await expect(check(t,'s1')).resolves.toBeNull()
 await expect(check(t,'s2')).rejects.toThrow('MFA required')
 // replay of same or older step is refused
 expect(await t.mutation(internal.mfa.recordAttempt,{userId:U,sessionId:'s2',step:100})).toBe(false)
 expect(await t.mutation(internal.mfa.recordAttempt,{userId:U,sessionId:'s2',step:101})).toBe(true)
 await expect(check(t,'s2')).resolves.toBeNull()
 // expired proof is refused
 await t.run(async ctx=>{for(const p of await ctx.db.query('adminMfaProofs').collect())await ctx.db.patch(p._id,{expiresAt:Date.now()-1})})
 await expect(check(t,'s1')).rejects.toThrow('MFA required')
})
it('recovery codes are single use; repeated failures lock the account',async()=>{
 const t=await setup()
 await t.mutation(internal.mfa.recordAttempt,{userId:U,sessionId:'s1',step:5,activate:['h1']})
 expect(await t.mutation(internal.mfa.recordAttempt,{userId:U,sessionId:'s3',step:null,recoveryHash:'h1'})).toBe(true)
 expect(await t.mutation(internal.mfa.recordAttempt,{userId:U,sessionId:'s4',step:null,recoveryHash:'h1'})).toBe(false)
 for(let i=0;i<5;i++)await t.mutation(internal.mfa.recordAttempt,{userId:U,sessionId:'s5',step:null})
 // even a fresh valid step is refused while locked
 expect(await t.mutation(internal.mfa.recordAttempt,{userId:U,sessionId:'s5',step:999})).toBe(false)
 await t.mutation(internal.mfa.resetForUser,{authUserId:U,operatorId:'ops'})
 await expect(check(t,'s3')).rejects.toThrow('MFA required')
})
