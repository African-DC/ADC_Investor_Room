import { CheckCircle2,CircleDashed,Clock3,ExternalLink,FileText,Info,AlertTriangle,Sparkles,Eye } from 'lucide-react'
import type { Block } from './schema'
import {lazy} from 'react'
import {DeferredPanel} from '../../components/ui/DeferredPanel'
const Chart=lazy(()=>import('./Chart').then(m=>({default:m.Chart})))
import { RichText } from './RichText'
export type ImageMap=Record<string,{src:string;width:number;height:number}>
type Doc={id:string;titleFr:string;titleEn:string}
// Renders validated blocks. Document blocks only render when the document is in the caller's ACL-filtered list.
export function BlockView({blocks,lang,documents=[],openDocument,images={}}:{blocks:Block[];lang:'fr'|'en';documents?:Doc[];openDocument?:(id:string)=>void;images?:ImageMap}){
 return <div className="bk">{blocks.map((b,i)=><div key={b.id} className={'bk-item t-'+b.type+(b.type==='image'?' layout-'+b.layout:'')} style={{animationDelay:Math.min(i,12)*40+'ms'}}>{render(b)}</div>)}</div>
 function render(b:Block){switch(b.type){
  case 'heading':return b.level===2?<h2 className="bk-h2">{b.text}</h2>:<h3 className="bk-h3">{b.text}</h3>
  case 'paragraph':return <p className="bk-p">{b.text}</p>
  case 'rich':return <RichText doc={b.doc}/>
  case 'list':{const L=b.ordered?'ol':'ul';return <L className="bk-list">{b.items.filter(Boolean).map((x,i)=><li key={i}>{x}</li>)}</L>}
  case 'callout':{const I={info:Info,success:CheckCircle2,warning:AlertTriangle,brand:Sparkles}[b.tone];return <aside className={'bk-callout tone-'+b.tone}><I size={20} aria-hidden="true"/><div>{b.title&&<strong>{b.title}</strong>}{b.text&&<p>{b.text}</p>}</div></aside>}
  case 'stats':return <dl className="bk-stats">{b.items.map((x,i)=><div key={i}><dt>{x.label}</dt><dd>{x.value}</dd></div>)}</dl>
  case 'table':{const [head,...rows]=b.header?b.rows:[null,...b.rows];return <div className="bk-table-wrap"><table className="bk-table">{head&&<thead><tr>{head.map((c,i)=><th key={i} scope="col">{c}</th>)}</tr></thead>}<tbody>{rows.map((r,i)=><tr key={i}>{(r??[]).map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody></table></div>}
  case 'quote':return <blockquote className="bk-quote"><p>{b.text}</p>{b.author&&<cite>{b.author}</cite>}</blockquote>
  case 'divider':return <hr className="bk-hr"/>
  case 'allocation':return <figure className="bk-alloc">{(b.title||b.total)&&<figcaption><span>{b.title}</span><strong>{b.total}</strong></figcaption>}{b.items.map((x,i)=><div key={i} className="bk-alloc-row"><div><span>{x.label}</span><span><b>{x.amount}</b> · {x.percent} %</span></div><div className="bk-bar" role="img" aria-label={x.label+' '+x.percent+' %'}><span style={{width:x.percent+'%',animationDelay:i*120+'ms'}}/></div></div>)}{b.note&&<p className="bk-note">{b.note}</p>}</figure>
  case 'status':return <ul className="bk-status">{b.items.map((x,i)=>{const I={done:CheckCircle2,progress:Clock3,todo:CircleDashed}[x.state];return <li key={i} className={'is-'+x.state}><I size={18} aria-hidden="true"/><span>{x.label}</span><em>{x.note||({fr:{done:'Disponible',progress:'En cours',todo:'À venir'},en:{done:'Available',progress:'In progress',todo:'Upcoming'}})[lang][x.state]}</em></li>})}</ul>
  case 'cards':return <div className="bk-cards">{b.items.map((x,i)=><article key={i}><strong>{x.title}</strong><p>{x.text}</p></article>)}</div>
  case 'document':{const d=documents.find(x=>x.id===b.documentId);if(!d)return null;return <div className="bk-doc"><span className="dr-doc-icon" aria-hidden="true"><FileText size={20}/><small>PDF</small></span><div><strong>{lang==='fr'?d.titleFr:d.titleEn}</strong>{b.caption&&<span>{b.caption}</span>}</div>{openDocument&&<button className="dr-btn" onClick={()=>openDocument(d.id)}><Eye size={16}/>{lang==='fr'?'Consulter':'View'}</button>}</div>}
  case 'chart':return <DeferredPanel lang={lang}><Chart b={b} lang={lang}/></DeferredPanel>
  case 'image':{const img=images[b.imageId];if(!img)return null;return <figure className="bk-img"><img src={img.src} alt={b.alt} width={img.width} height={img.height} loading="lazy" decoding="async"/>{b.caption&&<figcaption>{b.caption}</figcaption>}</figure>}
  case 'media':{const img=images[b.imageId];return <div className={'bk-media side-'+b.side}>{img&&<div className="bk-media-img" style={{aspectRatio:b.ratio}}><img src={img.src} alt={b.alt} loading="lazy" decoding="async"/></div>}<div className="bk-media-text">{b.title&&<h3 className="bk-h3">{b.title}</h3>}{b.text&&<p className="bk-p">{b.text}</p>}</div></div>}
  case 'gallery':return <div className="bk-gallery" style={{'--cols':b.columns} as React.CSSProperties}>{b.images.map((x,i)=>{const img=images[x.imageId];return img?<figure key={i}><img src={img.src} alt={x.alt} loading="lazy" decoding="async"/>{x.caption&&<figcaption>{x.caption}</figcaption>}</figure>:null})}</div>
  case 'link':return <a className="bk-link" href={b.url} target="_blank" rel="noopener noreferrer nofollow">{b.label||b.url}<ExternalLink size={15} aria-hidden="true"/></a>
 }}
}
