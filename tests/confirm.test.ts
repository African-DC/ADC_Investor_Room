import {it,expect} from 'vitest'
import {verifiedLink} from '../src/features/access/confirm'
const origin='https://investors.example.com'
it('only accepts same origin verification endpoint with token',()=>{
 expect(verifiedLink('/api/auth/magic-link/verify?token=test',origin)).toBe('/api/auth/magic-link/verify?token=test')
 expect(verifiedLink('https://evil.test/api/auth/magic-link/verify?token=test',origin)).toBeNull()
 expect(verifiedLink('/api/auth/magic-link/verify',origin)).toBeNull()
 expect(verifiedLink('/api/auth/magic-link/verify?token=test&callbackURL=https://evil.test',origin)).toBeNull()
 expect(verifiedLink('/admin?token=test',origin)).toBeNull()
})
