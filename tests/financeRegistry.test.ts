import {it,expect} from 'vitest'
import {validMetric,unitFor,validDate} from '../src/features/finance/registry'
const base={kind:'invoiced' as const,unit:'XOF',value:100,scope:'fixture',periodStart:'2026-01-01',periodEnd:'2026-01-31',definitionFr:'fixture',definitionEn:'fixture',evidenceVersionIds:['fixture']}
it('requires exact dates, whole units and distinct evidence',()=>{
 expect(validMetric(base)).toBe(true);expect(validDate('2026-02-30')).toBe(false)
 expect(validMetric({...base,value:1.2})).toBe(false);expect(validMetric({...base,periodEnd:'2025-01-01'})).toBe(false)
 expect(validMetric({...base,evidenceVersionIds:[]})).toBe(false);expect(validMetric({...base,evidenceVersionIds:['a','a']})).toBe(false)
 expect(validMetric({...base,kind:'paying_sites'})).toBe(false);expect(unitFor('paying_sites')).toBe('count')
 expect(validMetric({...base,kind:'paying_sites',unit:'count',value:-1})).toBe(false)
})
