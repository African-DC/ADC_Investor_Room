// Notion-like content blocks. Shared by Convex (validation) and the UI (editor/renderer).
import { z } from 'zod'
const t=(max:number)=>z.string().max(max)
const id=z.string().regex(/^[a-z0-9]{6,24}$/)
const imageRef=z.string().regex(/^([a-z0-9]{20,40})?$/)
export const blockSchema=z.discriminatedUnion('type',[
 z.object({id,type:z.literal('heading'),level:z.union([z.literal(2),z.literal(3)]),text:t(200)}),
 z.object({id,type:z.literal('paragraph'),text:t(8000)}),
 z.object({id,type:z.literal('list'),ordered:z.boolean(),items:z.array(t(1000)).max(60)}),
 z.object({id,type:z.literal('callout'),tone:z.enum(['info','success','warning','brand']),title:t(160),text:t(4000)}),
 z.object({id,type:z.literal('stats'),items:z.array(z.object({value:t(40),label:t(160)})).max(8)}),
 z.object({id,type:z.literal('table'),header:z.boolean(),rows:z.array(z.array(t(400)).max(8)).max(60)}),
 z.object({id,type:z.literal('quote'),text:t(2000),author:t(160)}),
 z.object({id,type:z.literal('divider')}),
 z.object({id,type:z.literal('allocation'),title:t(160),total:t(60),note:t(400),items:z.array(z.object({label:t(160),amount:t(60),percent:z.number().min(0).max(100)})).max(12)}),
 z.object({id,type:z.literal('status'),items:z.array(z.object({label:t(200),state:z.enum(['done','progress','todo']),note:t(160)})).max(30)}),
 z.object({id,type:z.literal('cards'),items:z.array(z.object({title:t(160),text:t(600)})).max(12)}),
 z.object({id,type:z.literal('document'),documentId:t(64),caption:t(200)}),
 z.object({id,type:z.literal('chart'),kind:z.enum(['bar','hbar','stacked','line','area','donut']),title:t(160),subtitle:t(240),unit:t(24),labels:z.array(t(40)).min(1).max(24),series:z.array(z.object({name:t(60),values:z.array(z.number().finite()).max(24)})).min(1).max(6),showValues:z.boolean(),height:z.enum(['sm','md','lg']),note:t(240)}),
 z.object({id,type:z.literal('image'),imageId:imageRef,alt:t(240),caption:t(240),layout:z.enum(['full','wide','center','small'])}),
 z.object({id,type:z.literal('media'),imageId:imageRef,alt:t(240),side:z.enum(['left','right']),ratio:z.enum(['1/1','4/3','3/2','16/9']),title:t(160),text:t(4000)}),
 z.object({id,type:z.literal('gallery'),columns:z.union([z.literal(2),z.literal(3),z.literal(4)]),images:z.array(z.object({imageId:imageRef,alt:t(240),caption:t(160)})).max(12)}),
 z.object({id,type:z.literal('link'),url:z.string().url().max(500).refine(u=>u.startsWith('https://'),'https only'),label:t(160)}),
])
export type Block=z.infer<typeof blockSchema>
export type BlockType=Block['type']
export const blocksSchema=z.array(blockSchema).max(300)
export const MAX_BLOCKS_JSON=250_000
export function parseBlocks(json:string|undefined|null):Block[]|null{
 if(!json)return null
 if(json.length>MAX_BLOCKS_JSON)throw new Error('Content too large')
 const r=blocksSchema.safeParse(JSON.parse(json));if(!r.success)throw new Error('Invalid blocks');return r.data
}
/** Plain-text projection used for search, AI retrieval and legacy fallback. */
export function blocksToText(blocks:Block[]){
 return blocks.map(b=>{switch(b.type){
  case 'heading':return b.text.toUpperCase()
  case 'paragraph':return b.text
  case 'list':return b.items.map((x,i)=>(b.ordered?(i+1)+'. ':'• ')+x).join('\n')
  case 'callout':return [b.title,b.text].filter(Boolean).join('\n')
  case 'stats':return b.items.map(x=>'• '+x.value+' — '+x.label).join('\n')
  case 'table':return b.rows.map(r=>r.join(' | ')).join('\n')
  case 'quote':return '« '+b.text+' »'+(b.author?' — '+b.author:'')
  case 'divider':return ''
  case 'allocation':return [b.title,b.total,...b.items.map(x=>x.percent+' % — '+x.label+' ('+x.amount+')'),b.note].filter(Boolean).join('\n')
  case 'status':return b.items.map(x=>'• '+x.label+' : '+({done:'fait',progress:'en cours',todo:'à faire'})[x.state]+(x.note?' ('+x.note+')':'')).join('\n')
  case 'cards':return b.items.map(x=>'• '+x.title+' : '+x.text).join('\n')
  case 'document':return b.caption
  case 'chart':return [b.title,b.subtitle,...b.series.map(x=>x.name+' : '+b.labels.map((l,i)=>l+' '+(x.values[i]??'')+(b.unit?' '+b.unit:'')).join(', ')),b.note].filter(Boolean).join('\n')
  case 'image':return b.caption||b.alt
  case 'media':return [b.title,b.text].filter(Boolean).join('\n')
  case 'gallery':return b.images.map(x=>x.caption||x.alt).filter(Boolean).join(' · ')
  case 'link':return b.label+' ('+b.url+')'
 }}).filter(Boolean).join('\n\n').slice(0,40000)
}
export function newId(){return Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4)}
/** Best-effort conversion of legacy plain text into blocks (headings in caps, bullet lists, paragraphs). */
export function textToBlocks(text:string):Block[]{
 const out:Block[]=[]
 for(const chunk of text.split(/\n\s*\n/)){
  const lines=chunk.split('\n').map(l=>l.trim()).filter(Boolean);if(!lines.length)continue
  let rest=lines
  if(rest[0].length<=120&&!/^(•|-|\d+\.)\s/.test(rest[0])&&rest[0]===rest[0].toUpperCase()&&/[A-ZÉÈÀ]/.test(rest[0])){out.push({id:newId(),type:'heading',level:2,text:cap(rest[0])});rest=rest.slice(1)}
  if(!rest.length)continue
  if(rest.every(l=>/^(•|-|\d+\.)\s/.test(l)))out.push({id:newId(),type:'list',ordered:/^\d+\./.test(rest[0]),items:rest.map(l=>l.replace(/^(•|-|\d+\.)\s+/,''))})
  else out.push({id:newId(),type:'paragraph',text:rest.join('\n')})
 }
 return out
}
function cap(s:string){const l=s.toLocaleLowerCase('fr');return l.charAt(0).toUpperCase()+l.slice(1)}
