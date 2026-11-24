import {it,expect} from 'vitest'
import {targetsFor,draftText} from '../src/features/technical/model'
it('only permits explicit per-room targets and rejects unsafe repository paths',()=>{
 const target={key:'klassci',label:'KLASSCI',repo:'African-DC/fixture',order:120}
 expect(targetsFor(JSON.stringify({roomA:[target]}),'roomA')).toEqual([target])
 expect(targetsFor(JSON.stringify({roomA:[target]}),'roomB')).toEqual([])
 expect(targetsFor(JSON.stringify({roomA:[{...target,repo:'https://evil.test/x'}]}),'roomA')).toEqual([])
 expect(targetsFor(JSON.stringify({roomA:[target,target]}),'roomA')).toEqual([])
})
it('does not present missing release as zero or sample as a total',()=>{
 const d=draftText({key:'fixture',label:'Fixture',observedAt:'2026-11-24T00:00:00Z',archived:false,defaultBranch:'main',lastPush:null,latestRelease:null,releaseDate:null,closedPrSample:30,mergedPrSample:20})
 expect(d.bodyFr).toContain('Non disponible');expect(d.bodyFr).toContain('pas un total historique')
})
