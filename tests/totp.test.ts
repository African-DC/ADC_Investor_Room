import {expect,it,beforeAll} from 'vitest'
import {base32Encode,base32Decode,verifyTotp,totpAt,seal,unseal} from '../convex/lib/totp'
beforeAll(()=>{process.env.ADC_MFA_KEY='a'.repeat(64)})
it('matches RFC 6238 SHA-1 vectors',async()=>{
 const secret=base32Encode(new TextEncoder().encode('12345678901234567890'))
 expect(base32Decode(secret)).toEqual(new TextEncoder().encode('12345678901234567890'))
 // RFC 6238 appendix B, 8-digit values truncated to last 6 digits
 expect(await totpAt(secret,59_000)).toBe('287082')
 expect(await totpAt(secret,1111111109_000)).toBe('081804')
 expect(await totpAt(secret,2000000000_000)).toBe('279037')
})
it('accepts ±1 step, rejects replay and malformed codes',async()=>{
 const secret=base32Encode(crypto.getRandomValues(new Uint8Array(20))),now=1_800_000_000_000
 const code=await totpAt(secret,now),step=await verifyTotp(secret,code,now)
 expect(step).toBe(Math.floor(now/30000))
 expect(await verifyTotp(secret,code,now+30000)).toBe(step)
 expect(await verifyTotp(secret,code,now,step!)).toBeNull()
 expect(await verifyTotp(secret,code,now+120000)).toBeNull()
 expect(await verifyTotp(secret,'12345',now)).toBeNull()
})
it('seals secrets with AES-GCM',async()=>{
 const s=await seal('JBSWY3DPEHPK3PXP',crypto.getRandomValues(new Uint8Array(12)))
 expect(s).not.toContain('JBSWY3DPEHPK3PXP');expect(await unseal(s)).toBe('JBSWY3DPEHPK3PXP')
})
