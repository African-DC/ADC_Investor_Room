import {expect,it} from 'vitest'
import {hexToBase64,storageShaMatches} from '../convex/lib/hash'
import {createHash} from 'node:crypto'
it('matches Convex base64 storage digests against hex digests',()=>{
 const h=createHash('sha256').update('%PDF-1.4').digest()
 expect(hexToBase64(h.toString('hex'))).toBe(h.toString('base64'))
 expect(storageShaMatches(h.toString('base64'),h.toString('hex'))).toBe(true)
 expect(storageShaMatches(h.toString('base64'),'0'.repeat(64))).toBe(false)
 expect(storageShaMatches(undefined,h.toString('hex'))).toBe(false)
 expect(hexToBase64('xyz')).toBeNull()
})
