// @vitest-environment edge-runtime
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {convexTest} from 'convex-test'
import schema from '../convex/schema'
import {internal} from '../convex/_generated/api'
import {enqueue} from '../convex/outbox'
const modules=import.meta.glob(['../convex/**/*.*s','!../convex/**/*.test.ts'])
beforeEach(()=>{vi.useFakeTimers()});afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();vi.unstubAllGlobals()})
it('enqueues once per key and never reports sent without provider acceptance',async()=>{
 const t=convexTest(schema,modules)
 const first=await t.run(ctx=>enqueue(ctx,{key:'k1',kind:'qa_answer',to:'Investor@Example.com',vars:{subject:'Q'}}))
 const dup=await t.run(ctx=>enqueue(ctx,{key:'k1',kind:'qa_answer',to:'investor@example.com',vars:{subject:'Q'}}))
 expect(first).toBeTruthy();expect(dup).toBeNull()
 expect(await t.run(ctx=>enqueue(ctx,{key:'k2',kind:'qa_answer',to:'not-an-email',vars:{subject:'Q'}}))).toBeNull()
 const row=(await t.run(ctx=>ctx.db.query('emailOutbox').collect()))
 expect(row).toHaveLength(1);expect(row[0].to).toBe('investor@example.com');expect(row[0].status).toBe('pending');expect(row[0].html).toContain('ADC')
})
it('retries transient failures with backoff, fails permanently on client errors, and sends with an idempotency key',async()=>{
 vi.stubEnv('RESEND_API_KEY','re_test');vi.stubEnv('MAIL_FROM','ADC <a@b.co>')
 const calls:{headers:Record<string,string>}[]=[]
 const responses=[new Response('busy',{status:503}),new Response(JSON.stringify({id:'em_1'}),{status:200})]
 vi.stubGlobal('fetch',async(_u:string,init:{headers:Record<string,string>})=>{calls.push({headers:init.headers});return responses.shift()!})
 const t=convexTest(schema,modules)
 const id=(await t.run(ctx=>enqueue(ctx,{key:'retry-me',kind:'admin_invite',to:'a@b.co',vars:{email:'a@b.co',expires:'demain'}})))!
 await t.action(internal.outbox.deliver,{id})
 let r=(await t.run(ctx=>ctx.db.get(id)))!;expect(r.status).toBe('pending');expect(r.lastError).toContain('503');expect(r.attempts).toBe(1)
 vi.setSystemTime(Date.now()+61_000);await t.action(internal.outbox.deliver,{id})
 r=(await t.run(ctx=>ctx.db.get(id)))!;expect(r.status).toBe('sent');expect(r.providerId).toBe('em_1')
 expect(calls.every(c=>c.headers['Idempotency-Key']==='retry-me')).toBe(true)
 // already sent: a duplicate delivery does nothing
 await t.action(internal.outbox.deliver,{id});expect(calls).toHaveLength(2)
 // 4xx -> failed immediately with the reason
 responses.push(new Response('invalid from',{status:422}))
 const id2=(await t.run(ctx=>enqueue(ctx,{key:'bad',kind:'admin_invite',to:'a@b.co',vars:{email:'a@b.co',expires:'x'}})))!
 await t.action(internal.outbox.deliver,{id:id2})
 const r2=(await t.run(ctx=>ctx.db.get(id2)))!;expect(r2.status).toBe('failed');expect(r2.lastError).toContain('422')
})
it('marks missing configuration as pending (not sent) and recovers stuck rows',async()=>{
 const t=convexTest(schema,modules)
 const id=(await t.run(ctx=>enqueue(ctx,{key:'nocfg',kind:'qa_answer',to:'a@b.co',vars:{subject:'Q'}})))!
 await t.action(internal.outbox.deliver,{id})
 const r=(await t.run(ctx=>ctx.db.get(id)))!;expect(r.status).toBe('pending');expect(r.lastError).toContain('non configuré')
 await t.run(ctx=>ctx.db.patch(id,{status:'sending',nextAttemptAt:Date.now()-20*60_000}))
 await t.mutation(internal.outbox.sweep,{})
 expect((await t.run(ctx=>ctx.db.get(id)))!.status).toBe('pending')
})

it('repeating identical admin invitations preserves the receipt and enqueues once',async()=>{
 vi.stubEnv('ADC_STAGING_CMS','true')
 const t=convexTest(schema,modules)
 const roomId=await t.mutation(internal.stagingCms.createRoom,{name:'Fixture',organizationId:'fixture',operatorId:'ops'})
 const args={roomId,email:'admin@example.com',capabilities:['access:manage'],operatorId:'ops'}
 const first=await t.mutation(internal.team.inviteInternal,args)
 expect(await t.mutation(internal.team.inviteInternal,args)).toBe(first)
 expect(await t.run(ctx=>ctx.db.query('emailOutbox').collect())).toHaveLength(1)
 expect(await t.query(internal.outbox.invitationForDelivery,{key:'admin_invite:'+first,to:args.email})).not.toBeNull()
 expect(await t.query(internal.outbox.invitationForDelivery,{key:'admin_invite:'+first,to:'other@example.com'})).toBeNull()
 await t.run(ctx=>ctx.db.patch(first,{revokedAt:Date.now()}))
 expect(await t.query(internal.outbox.invitationForDelivery,{key:'admin_invite:'+first,to:args.email})).toBeNull()
})
