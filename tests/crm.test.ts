import {it,expect} from 'vitest'
import {validFollowup,followupStatus,fundraisingSummary,parseAmount} from '../src/features/crm/model'
it('validates real dates and requires action for a deadline',()=>{
 expect(validFollowup('Call','2026-11-30')).toBe(true);expect(validFollowup('','2026-11-30')).toBe(false);expect(validFollowup('Call','2026-02-30')).toBe(false)
 expect(followupStatus('2026-11-23','2026-11-24')).toBe('overdue');expect(followupStatus('2026-11-24','2026-11-24')).toBe('today');expect(followupStatus(null,'2026-11-24')).toBe('none')
})

it('separates open pipeline and declared commitments without double counting or treating missing amounts as zero',()=>{const base={dueDate:null,owner:'none'};const s=fundraisingSummary([{...base,stage:'negotiation',expectedXof:20},{...base,stage:'committed',expectedXof:25,committedXof:15},{...base,stage:'closed',committedXof:10},{...base,stage:'declined',expectedXof:100},{...base,stage:'committed'}],'2026-11-27');expect(s.expectedXof).toBe(20);expect(s.committedXof).toBe(25);expect(s.missingCommitments).toBe(1);expect(parseAmount('')).toBeNull();expect(parseAmount('0')).toBe(0);expect(parseAmount('-1')).toBeUndefined();expect(parseAmount('1.5')).toBeUndefined()})
