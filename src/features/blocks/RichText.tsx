import type { CSSProperties,ReactNode } from 'react'
import { safeHref } from './rich'
import type { RichNode } from './rich'
// Renders sanitized rich text as React elements (SSR-safe, no raw HTML).
export function RichText({doc}:{doc:RichNode}){return <div className="rt">{(doc.content??[]).map((n,i)=>node(n,i))}</div>}
function kids(n:RichNode){return (n.content??[]).map((c,i)=>node(c,i))}
function node(n:RichNode,key:number):ReactNode{
 const align=n.attrs?.textAlign?{textAlign:n.attrs.textAlign as CSSProperties['textAlign']}:undefined
 switch(n.type){
  case 'paragraph':return <p key={key} style={align}>{n.content?kids(n):<br/>}</p>
  case 'heading':{const l=n.attrs?.level===3?3:n.attrs?.level===4?4:2;return l===2?<h2 key={key} style={align}>{kids(n)}</h2>:l===3?<h3 key={key} style={align}>{kids(n)}</h3>:<h4 key={key} style={align}>{kids(n)}</h4>}
  case 'bulletList':return <ul key={key}>{kids(n)}</ul>
  case 'orderedList':return <ol key={key} start={typeof n.attrs?.start==='number'?n.attrs.start:undefined}>{kids(n)}</ol>
  case 'listItem':return <li key={key}>{kids(n)}</li>
  case 'blockquote':return <blockquote key={key}>{kids(n)}</blockquote>
  case 'horizontalRule':return <hr key={key}/>
  case 'hardBreak':return <br key={key}/>
  case 'text':return <span key={key}>{marks(n)}</span>
  default:return null
 }
}
function marks(n:RichNode):ReactNode{
 let out:ReactNode=n.text
 for(const m of n.marks??[]){
  if(m.type==='bold')out=<strong>{out}</strong>
  else if(m.type==='italic')out=<em>{out}</em>
  else if(m.type==='underline')out=<u>{out}</u>
  else if(m.type==='strike')out=<s>{out}</s>
  else if(m.type==='code')out=<code>{out}</code>
  else if(m.type==='highlight')out=<mark style={{background:String(m.attrs?.color??'')}}>{out}</mark>
  else if(m.type==='textStyle')out=<span style={{fontFamily:m.attrs?.fontFamily as string|undefined,fontSize:m.attrs?.fontSize as string|undefined,color:m.attrs?.color as string|undefined}}>{out}</span>
  else if(m.type==='link'){const href=safeHref(m.attrs?.href);if(href)out=<a href={href} target="_blank" rel="noopener noreferrer nofollow">{out}</a>}
 }
 return out
}
