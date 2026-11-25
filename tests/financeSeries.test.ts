import {it,expect} from 'vitest'
import {comparableSeries} from '../src/features/finance/series'
import type {Snapshot} from '../src/features/finance/series'
const a:Snapshot={id:'a',sectionId:'s',kind:'invoiced',scope:'fixture',periodStart:'2026-01-01',periodEnd:'2026-01-31',definitionFr:'fixture',definitionEn:'fixture',value:10,unit:'XOF'}
const b={...a,id:'b',periodStart:'2026-02-01',periodEnd:'2026-02-28',value:20}
it('only charts comparable non-overlapping periods without aggregation',()=>{
 expect(comparableSeries([b,a])[0]?.rows.map(r=>r.value)).toEqual([10,20])
 expect(comparableSeries([a,{...b,scope:'other'}])).toEqual([])
 expect(comparableSeries([a,{...b,definitionFr:'different'}])).toEqual([])
 expect(comparableSeries([a,{...b,periodStart:'2026-01-15'}])).toEqual([])
 expect(comparableSeries([a,{...b,periodEnd:'2026-12-31'}])).toEqual([])
 expect(comparableSeries([a,{...b,kind:'collected'}])).toEqual([])
})
