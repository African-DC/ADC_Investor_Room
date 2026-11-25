import {it,expect} from 'vitest'
import {templates} from '../src/features/admin/contentTemplates'
it('provides unique bilingual editorial shells without fabricated content or amounts',()=>{
 expect(new Set(templates.map(t=>t.slug)).size).toBe(templates.length)
 expect(templates.some(t=>t.slug==='klassci')).toBe(true)
 expect(templates.some(t=>t.slug==='wouri')).toBe(true)
 for(const t of templates){expect(t.titleFr.trim()).not.toBe('');expect(t.titleEn.trim()).not.toBe('');expect(t).not.toHaveProperty('bodyFr');expect(t).not.toHaveProperty('value')}
})
