import {expect,it} from 'vitest'
import {parseBlocks,blocksToText,textToBlocks} from '../src/features/blocks/schema'
it('validates blocks strictly and rejects unsafe links',()=>{
 expect(parseBlocks(JSON.stringify([{id:'abcdef12',type:'paragraph',text:'Bonjour'}]))).toHaveLength(1)
 expect(()=>parseBlocks(JSON.stringify([{id:'abcdef12',type:'link',url:'javascript:alert(1)',label:'x'}]))).toThrow()
 expect(()=>parseBlocks(JSON.stringify([{id:'abcdef12',type:'link',url:'http://x.com',label:'x'}]))).toThrow()
 expect(()=>parseBlocks(JSON.stringify([{id:'abcdef12',type:'script',text:'x'}]))).toThrow()
 expect(()=>parseBlocks('x'.repeat(260000))).toThrow('Content too large')
})
it('converts legacy text and projects blocks to text',()=>{
 const b=textToBlocks('NOTRE VISION\nDevenir un acteur.\n\n• A\n• B')
 expect(b.map(x=>x.type)).toEqual(['heading','paragraph','list'])
 expect(blocksToText(b)).toContain('• A')
})
