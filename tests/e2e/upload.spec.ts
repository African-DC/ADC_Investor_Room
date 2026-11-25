import {test,expect} from '@playwright/test'
test('upload stays unavailable without configured authenticated staging',async({request})=>{
 const r=await request.post('/api/documents/upload?roomId=fixture',{data:'not-a-pdf'})
 expect(r.status()).toBe(404);expect(r.headers()['cache-control']).toContain('no-store')
})
