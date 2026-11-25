import {it,expect} from 'vitest'
import {summarize} from '../src/features/analytics/model'
it('counts distinct consenting actors and separates authorizations from section opens',()=>{const a={day:'2026-11-24',kind:'section_open' as const,authUserId:'fixture',resourceId:'s'};const r=summarize([a,{...a,kind:'document_view_authorized',resourceId:'d'},{...a,day:'2026-11-25',authUserId:'fixture2'}]);expect(r.participants).toBe(2);expect(r.sections).toBe(2);expect(r.views).toBe(1);expect(r.downloads).toBe(0);expect(r.days.map(d=>d.count)).toEqual([2,1])})
