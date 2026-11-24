import { it,expect } from 'vitest'
import { publishable,sumMetrics } from '../src/features/finance/metrics'
import type { Metric } from '../src/features/finance/metrics'
const m:Metric={kind:'invoiced',amountXof:100,period:'2026',status:'published',evidenceIds:['test']}
it('separates metrics and excludes drafts',()=>expect(sumMetrics([m,{...m,kind:'collected'},{...m,status:'draft'},{...m,period:'2025'}],'invoiced','2026')).toBe(100))
it('requires integer amounts and evidence',()=>{expect(publishable({...m,evidenceIds:[]})).toBe(false);expect(publishable({...m,amountXof:1.5})).toBe(false)})
