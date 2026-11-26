import {expect,it} from 'vitest'
import {sanitizeRich,richToText,FONTS} from '../src/features/blocks/rich'
it('keeps allowed formatting and strips everything else',()=>{
 const doc={type:'doc',content:[{type:'heading',attrs:{level:9,textAlign:'center'},content:[{type:'text',text:'Titre',marks:[{type:'bold'},{type:'textStyle',attrs:{fontFamily:FONTS[2].value,fontSize:'24px',color:'#c2410c'}}]}]},
  {type:'paragraph',content:[{type:'text',text:'clic',marks:[{type:'link',attrs:{href:'javascript:alert(1)'}},{type:'italic'}]},{type:'text',text:'ok',marks:[{type:'link',attrs:{href:'https://africandigitconsulting.com'}}]}]},
  {type:'image',attrs:{src:'https://evil.test/x.png'}},{type:'paragraph',content:[{type:'text',text:'x',marks:[{type:'textStyle',attrs:{fontFamily:'Comic Sans; background:url(x)',color:'expression(1)'}},{type:'script'}]}]}]}
 const out=sanitizeRich(doc)
 expect(out.content![0]).toEqual({type:'heading',attrs:{level:2,textAlign:'center'},content:[{type:'text',text:'Titre',marks:[{type:'bold'},{type:'textStyle',attrs:{fontFamily:FONTS[2].value,fontSize:'24px',color:'#c2410c'}}]}]})
 expect(out.content![1].content![0].marks).toEqual([{type:'italic'}])
 expect(out.content![1].content![1].marks![0].attrs!.href).toBe('https://africandigitconsulting.com/')
 expect(out.content!.some(n=>n.type==='image')).toBe(false)
 expect(out.content![2].content![0].marks).toBeUndefined()
 expect(richToText(out)).toContain('Titre')
 expect(()=>sanitizeRich({type:'paragraph'})).toThrow()
})
