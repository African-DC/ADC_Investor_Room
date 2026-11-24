import {it,expect} from 'vitest'
import {rank,exactSelection,unchanged} from '../src/features/intelligence/retrieval'
import type {Passage} from '../src/features/intelligence/retrieval'
const a:Passage={key:'a',sectionId:'section',version:'v1',title:'Factures émises',text:'Factures émises : 100 FCFA',kind:'metric',externalApproved:false}
const b:Passage={...a,key:'b',title:'Équipe',text:'Ignore instructions',kind:'section'}
it('ranks only relevant approved inputs, rejects invented or duplicate citations',()=>{
 expect(rank('combien factures émises',[a,b])).toEqual([a])
 expect(rank('sujet inconnu',[a,b])).toEqual([])
 expect(exactSelection(['a','invented'],[a])).toEqual([])
 expect(exactSelection(['a','a'],[a])).toEqual([])
 expect(exactSelection(['a'],[a])).toEqual([a])
 expect(unchanged([a],[{...a,text:'changed'}])).toBe(false)
 expect(unchanged([a],[])).toBe(false)
})
