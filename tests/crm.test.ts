import {it,expect} from 'vitest'
import {validFollowup,followupStatus} from '../src/features/crm/model'
it('validates real dates and requires action for a deadline',()=>{
 expect(validFollowup('Call','2026-11-30')).toBe(true);expect(validFollowup('','2026-11-30')).toBe(false);expect(validFollowup('Call','2026-02-30')).toBe(false)
 expect(followupStatus('2026-11-23','2026-11-24')).toBe('overdue');expect(followupStatus('2026-11-24','2026-11-24')).toBe('today');expect(followupStatus(null,'2026-11-24')).toBe('none')
})
