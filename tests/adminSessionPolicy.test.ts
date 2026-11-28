import {it,expect} from 'vitest'
import {sameCapabilities} from '../src/features/admin/sessionPolicy'
it('allows only exactly the currently verified capabilities regardless of ordering',()=>{
 expect(sameCapabilities(['access:manage','crm:read'],['crm:read','access:manage'])).toBe(true)
 expect(sameCapabilities(['access:manage','crm:read'],['crm:read'])).toBe(false)
 expect(sameCapabilities(['crm:read'],['crm:read','access:manage'])).toBe(false)
 expect(sameCapabilities(['access:manage'],[])).toBe(false)
})
