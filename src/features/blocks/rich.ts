// Rich text model (Tiptap/ProseMirror JSON) — strict allow-list shared by server validation and the React renderer.
export const FONTS=[
 {value:'Poppins, system-ui, sans-serif',label:'Poppins (ADC)'},
 {value:'Montserrat, system-ui, sans-serif',label:'Montserrat'},
 {value:'Fraunces, Georgia, serif',label:'Fraunces (titres ADC)'},
 {value:'Georgia, serif',label:'Georgia'},
 {value:'ui-monospace, Menlo, monospace',label:'Monospace'},
] as const
export const SIZES=[{value:'13px',label:'Petit'},{value:'16px',label:'Normal'},{value:'19px',label:'Moyen'},{value:'24px',label:'Grand'},{value:'32px',label:'Très grand'},{value:'44px',label:'Énorme'}] as const
export const COLORS=['#1a0f06','#4a3f35','#6b5d50','#c2410c','#e8590c','#1a5d3a','#1d5fa8','#b7791f','#7c3aed','#be185d','#9f3030','#ffffff'] as const
export const HIGHLIGHTS=['#fdeee4','#fff4c2','#e8f3ec','#eef4fb','#f3e8ff','#fde2e7'] as const
export type RichMark={type:string;attrs?:Record<string,unknown>}
export type RichNode={type:string;attrs?:Record<string,unknown>;content?:RichNode[];text?:string;marks?:RichMark[]}
const NODES=new Set(['doc','paragraph','heading','text','bulletList','orderedList','listItem','blockquote','horizontalRule','hardBreak'])
const MARKS=new Set(['bold','italic','underline','strike','code','link','textStyle','highlight'])
const ALIGN=new Set(['left','center','right','justify'])
const fonts=new Set<string>(FONTS.map(f=>f.value)),sizes=new Set<string>(SIZES.map(s=>s.value)),colors=new Set<string>(COLORS),highlights=new Set<string>(HIGHLIGHTS)
export function safeHref(href:unknown){if(typeof href!=='string'||href.length>500)return null;try{const u=new URL(href);return u.protocol==='https:'||u.protocol==='mailto:'?u.toString():null}catch{return null}}
/** Returns a cleaned copy containing only allowed nodes/marks/attributes. Throws on structural abuse. */
export function sanitizeRich(input:unknown):RichNode{
 let count=0,chars=0
 const node=(n:unknown,depth:number):RichNode|null=>{
  if(++count>5000||depth>12)throw new Error('Rich text too large')
  if(!n||typeof n!=='object')return null
  const o=n as RichNode;if(!NODES.has(o.type))return null
  if(o.type==='text'){if(typeof o.text!=='string'||!o.text)return null;chars+=o.text.length;if(chars>40000)throw new Error('Rich text too large');const marks=(o.marks??[]).map(mark).filter(Boolean) as RichMark[];return marks.length?{type:'text',text:o.text,marks}:{type:'text',text:o.text}}
  const out:RichNode={type:o.type},attrs:Record<string,unknown>={}
  if(o.type==='heading'){const l=Number(o.attrs?.level);attrs.level=l===3||l===4?l:2}
  if((o.type==='paragraph'||o.type==='heading')&&ALIGN.has(String(o.attrs?.textAlign))&&o.attrs?.textAlign!=='left')attrs.textAlign=o.attrs!.textAlign
  if(o.type==='orderedList'){const s=Number(o.attrs?.start);if(Number.isSafeInteger(s)&&s>1&&s<10000)attrs.start=s}
  if(Object.keys(attrs).length)out.attrs=attrs
  if(Array.isArray(o.content)){const c=o.content.map(x=>node(x,depth+1)).filter(Boolean) as RichNode[];if(c.length)out.content=c}
  return out
 }
 const mark=(m:unknown):RichMark|null=>{
  if(!m||typeof m!=='object')return null;const o=m as RichMark;if(!MARKS.has(o.type))return null
  if(o.type==='link'){const href=safeHref(o.attrs?.href);return href?{type:'link',attrs:{href}}:null}
  if(o.type==='highlight'){const c=String(o.attrs?.color??'');return {type:'highlight',attrs:{color:highlights.has(c)?c:HIGHLIGHTS[0]}}}
  if(o.type==='textStyle'){const a:Record<string,string>={},f=String(o.attrs?.fontFamily??''),s=String(o.attrs?.fontSize??''),c=String(o.attrs?.color??'');if(fonts.has(f))a.fontFamily=f;if(sizes.has(s))a.fontSize=s;if(colors.has(c))a.color=c;return Object.keys(a).length?{type:'textStyle',attrs:a}:null}
  return {type:o.type}
 }
 const root=node(input,0);if(!root||root.type!=='doc')throw new Error('Invalid rich text');return root
}
export function richToText(n:RichNode):string{
 if(n.type==='text')return n.text??''
 const inner=(n.content??[]).map(richToText).join(n.type==='doc'||n.type==='bulletList'||n.type==='orderedList'?'\n':'')
 return n.type==='listItem'?'• '+inner:n.type==='hardBreak'?'\n':inner
}
