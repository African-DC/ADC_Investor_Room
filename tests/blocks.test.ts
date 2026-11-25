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
it('validates charts and image references strictly',()=>{
 const chart={id:'abcdef12',type:'chart',kind:'line',title:'T',subtitle:'',unit:'%',labels:['A','B'],series:[{name:'S',values:[1,2]}],showValues:false,height:'md',note:''}
 expect(parseBlocks(JSON.stringify([chart]))).toHaveLength(1)
 expect(()=>parseBlocks(JSON.stringify([{...chart,kind:'pie3d'}]))).toThrow()
 expect(()=>parseBlocks(JSON.stringify([{...chart,series:Array(7).fill({name:'x',values:[1]})}]))).toThrow()
 expect(()=>parseBlocks(JSON.stringify([{...chart,series:[{name:'S',values:[Infinity]}]}]))).toThrow()
 expect(parseBlocks(JSON.stringify([{id:'abcdef13',type:'image',imageId:'jn716bhrhs7dp7jx9sd291r8px8jw7y8',alt:'Logo',caption:'',layout:'wide'}]))).toHaveLength(1)
 expect(()=>parseBlocks(JSON.stringify([{id:'abcdef13',type:'image',imageId:'https://evil.test/x.png',alt:'',caption:'',layout:'full'}]))).toThrow()
})
