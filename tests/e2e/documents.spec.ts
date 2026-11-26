import {test,expect} from '@playwright/test'
test('document delivery fails closed when services are disabled',async({request})=>{
 const r=await request.get('/api/documents/file?roomId=fixture&documentId=fixture&download=1')
 expect(r.status()).toBe(404)
 expect(r.headers()['cache-control']).toContain('no-store')
 expect(await r.text()).toBe('Document unavailable')
})

test('draft review endpoint also fails closed without admin access',async({request})=>{
 const r=await request.get('/api/documents/file?roomId=fixture&documentId=fixture&review=1')
 expect(r.status()).toBe(404)
 expect(r.headers()['cache-control']).toContain('no-store')
})
