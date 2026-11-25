import {it,expect} from 'vitest'
import {isPdf,validUpload,MAX_UPLOAD} from '../src/features/documents/uploadRules'
it('validates PDF magic, size, categories and required metadata',()=>{
 expect(isPdf(new TextEncoder().encode('%PDF-1.7'))).toBe(true)
 expect(isPdf(new TextEncoder().encode('<html>'))).toBe(false)
 const m={titleFr:'Fixture',titleEn:'Fixture',category:'finance',sizeBytes:100}
 expect(validUpload(m)).toBe(true);expect(validUpload({...m,sizeBytes:MAX_UPLOAD+1})).toBe(false)
 expect(validUpload({...m,titleFr:' '})).toBe(false);expect(validUpload({...m,category:'unknown'})).toBe(false)
})
