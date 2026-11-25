import { useEffect,useMemo,useState } from 'react'
import { Eye,PenLine,Save,Send,CheckCircle2,Archive,Plus,Languages,FileText,Undo2 } from 'lucide-react'
import { BlockEditor } from './BlockEditor'
import { BlockView } from './BlockView'
import { parseBlocks,textToBlocks,blocksToText,newId } from './schema'
import type { Block } from './schema'
import { brandFor } from '../brand/products'
import type { AdminCommand } from '../admin/contracts'
import { templates } from '../admin/contentTemplates'
type Latest={id:string;number:number;state:string;titleFr:string;titleEn:string;bodyFr:string;bodyEn:string;blocksFr?:string|null;blocksEn?:string|null;source:string;own:boolean}
export type EditorSection={id:string;slug:string;category:string;order:number;published:boolean;latest:Latest|null}
type Doc={id:string;titleFr:string;titleEn:string}
const categories:[string,string][]=[['company','Entreprise'],['products','Produit'],['investment','Investissement'],['finance','Finances'],['traction','Traction'],['team','Équipe'],['technology','Technologie'],['legal','Juridique'],['compliance','Conformité'],['documents','Documents'],['updates','Actualités']]
const stateLabel:Record<string,string>={draft:'Brouillon',review:'En relecture',published:'Publiée',archived:'Archivée'}
function load(json:string|null|undefined,fallback:string){try{return parseBlocks(json)??textToBlocks(fallback)}catch{return textToBlocks(fallback)}}
export function PageEditor({roomId,sections,documents,canEdit,canReview,busy,run}:{roomId:string;sections:EditorSection[];documents:Doc[];canEdit:boolean;canReview:boolean;busy:boolean;run:(c:AdminCommand)=>Promise<void>}){
 const sorted=useMemo(()=>[...sections].sort((a,b)=>a.order-b.order),[sections])
 const [current,setCurrent]=useState<string|'new'|null>(sorted[0]?.id??null)
 const section=sorted.find(s=>s.id===current)
 const [meta,setMeta]=useState({slug:'',category:'company',order:10,titleFr:'',titleEn:'',source:''})
 const [fr,setFr]=useState<Block[]>([]),[en,setEn]=useState<Block[]>([]),[lang,setLang]=useState<'fr'|'en'>('fr'),[mode,setMode]=useState<'edit'|'split'|'preview'>('split'),[dirty,setDirty]=useState(false)
 useEffect(()=>{
  if(current==='new'){setMeta({slug:'',category:'company',order:(sorted.at(-1)?.order??0)+10,titleFr:'',titleEn:'',source:''});setFr([{id:newId(),type:'paragraph',text:''}]);setEn([]);setDirty(false);return}
  if(!section)return
  const l=section.latest;setMeta({slug:section.slug,category:section.category,order:section.order,titleFr:l?.titleFr??'',titleEn:l?.titleEn??'',source:l?.source??''})
  setFr(load(l?.blocksFr,l?.bodyFr??''));setEn(l?.blocksEn?load(l.blocksEn,''):[]);setDirty(false)
 },[current,section?.latest?.id])
 const blocks=lang==='fr'?fr:en,setBlocks=(b:Block[])=>{(lang==='fr'?setFr:setEn)(b);setDirty(true)}
 const valid=meta.slug.match(/^[a-z0-9-]+$/)&&meta.titleFr.trim()&&blocksToText(fr).trim()&&meta.source.trim()
 async function save(){
  if(!valid)return
  const enBlocks=en.length?en:fr,textFr=blocksToText(fr),textEn=blocksToText(enBlocks)
  await run({kind:'draft',roomId,slug:meta.slug,category:meta.category as never,order:meta.order,titleFr:meta.titleFr.trim(),titleEn:(meta.titleEn||meta.titleFr).trim(),bodyFr:textFr,bodyEn:textEn,blocksFr:JSON.stringify(fr),blocksEn:JSON.stringify(enBlocks),source:meta.source.trim()})
  setDirty(false);if(current==='new')setCurrent(null)
 }
 const l=section?.latest,b=brandFor(meta.slug)
 return <div className="pe">
  <aside className="pe-list"><div className="pe-list-head"><strong>Pages</strong>{canEdit&&<button type="button" className="be-add" onClick={()=>setCurrent('new')}><Plus size={14}/>Nouvelle page</button>}</div>
   <nav>{sorted.map(s=>{const bb=brandFor(s.slug);return <button key={s.id} type="button" className={'pe-item'+(current===s.id?' is-active':'')} onClick={()=>setCurrent(s.id)}>{bb?<img src={bb.logo} alt="" width={20} height={20}/>:<FileText size={16}/>}<span><b>{s.latest?.titleFr??s.slug}</b><small className={'pe-state st-'+(s.latest?.state??'none')}>{s.latest?stateLabel[s.latest.state]+' · v'+s.latest.number:'Sans version'}{s.published&&s.latest?.state!=='published'?' · en ligne':''}</small></span></button>})}{current==='new'&&<button type="button" className="pe-item is-active"><Plus size={16}/><span><b>Nouvelle page</b><small>Non enregistrée</small></span></button>}</nav></aside>
  {current?<section className="pe-main">
   <header className="pe-head">
    <div className="pe-titles"><input className="pe-title" value={lang==='fr'?meta.titleFr:meta.titleEn} placeholder={lang==='fr'?'Titre de la page':'Page title (English)'} onChange={e=>{setMeta(m=>lang==='fr'?{...m,titleFr:e.target.value}:{...m,titleEn:e.target.value});setDirty(true)}} disabled={!canEdit}/>
     {l&&<p className="pe-meta"><span className={'pe-state st-'+l.state}>{stateLabel[l.state]}</span> Version {l.number}{dirty&&<em> · modifications non enregistrées</em>}</p>}</div>
    <div className="pe-actions">
     <div className="pe-seg" role="group" aria-label="Langue"><button type="button" aria-pressed={lang==='fr'} onClick={()=>setLang('fr')}>FR</button><button type="button" aria-pressed={lang==='en'} onClick={()=>setLang('en')}>EN</button></div>
     <div className="pe-seg" role="group" aria-label="Affichage"><button type="button" aria-pressed={mode==='edit'} onClick={()=>setMode('edit')} title="Édition"><PenLine size={15}/></button><button type="button" aria-pressed={mode==='split'} onClick={()=>setMode('split')} title="Côte à côte"><Languages size={15}/></button><button type="button" aria-pressed={mode==='preview'} onClick={()=>setMode('preview')} title="Aperçu investisseur"><Eye size={15}/></button></div>
     {canEdit&&<button type="button" className="dr-btn" disabled={busy||!valid||!dirty} onClick={()=>void save()}><Save size={16}/>Enregistrer le brouillon</button>}
     {canEdit&&l?.state==='draft'&&l.own&&!dirty&&<button type="button" className="dr-btn ghost" disabled={busy} onClick={()=>void run({kind:'transition',roomId,versionId:l.id,action:'submit'})}><Send size={16}/>Soumettre en relecture</button>}
     {canReview&&l?.state==='review'&&!l.own&&!dirty&&<button type="button" className="dr-btn pe-publish" disabled={busy} onClick={()=>void run({kind:'transition',roomId,versionId:l.id,action:'publish'})}><CheckCircle2 size={16}/>Valider et publier</button>}
     {canReview&&l?.state==='review'&&l.own&&<span className="pe-hint">Un autre administrateur doit valider.</span>}
     {canReview&&section?.published&&<button type="button" className="dr-btn ghost danger" disabled={busy} onClick={()=>{if(confirm('Retirer cette page de la salle ?'))void run({kind:'archive',roomId,sectionId:section.id})}}><Archive size={16}/>Retirer</button>}
    </div>
   </header>
   {canEdit&&<details className="pe-settings" open={current==='new'}><summary>Réglages de la page</summary><div className="pe-settings-grid">
    <label className="field"><span>Identifiant (URL)</span><input value={meta.slug} disabled={current!=='new'} onChange={e=>{setMeta(m=>({...m,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'-')}));setDirty(true)}} placeholder="ex. klassci"/></label>
    <label className="field"><span>Catégorie</span><select value={meta.category} disabled={current!=='new'} onChange={e=>{setMeta(m=>({...m,category:e.target.value}));setDirty(true)}}>{categories.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
    <label className="field"><span>Ordre</span><input type="number" value={meta.order} disabled={current!=='new'} onChange={e=>{setMeta(m=>({...m,order:Number(e.target.value)||0}));setDirty(true)}}/></label>
    <label className="field pe-wide"><span>Source (obligatoire, traçabilité)</span><input value={meta.source} onChange={e=>{setMeta(m=>({...m,source:e.target.value}));setDirty(true)}} placeholder="ex. Document ADC du 19/11/2026, validé par…"/></label>
    {current==='new'&&<label className="field pe-wide"><span>Partir d’un modèle ADC</span><select defaultValue="" onChange={e=>{const t=templates.find(x=>x.slug===e.target.value);if(!t)return;setMeta(m=>({...m,slug:t.slug,category:t.category,order:t.order,titleFr:t.titleFr,titleEn:t.titleEn}));setFr([{id:newId(),type:'callout',tone:'info',title:'Guide de rédaction (à supprimer avant publication)',text:t.guide},{id:newId(),type:'paragraph',text:''}]);setDirty(true)}}><option value="">Page vierge</option>{templates.map(t=><option key={t.slug} value={t.slug} disabled={sorted.some(x=>x.slug===t.slug)}>{t.titleFr}</option>)}</select></label>}
    {lang==='en'&&en.length===0&&<button type="button" className="be-add" onClick={()=>{setEn(structuredClone(fr).map(x=>({...x,id:newId()})));setDirty(true)}}><Undo2 size={14}/>Copier la version française pour traduire</button>}
   </div></details>}
   <div className={'pe-canvas mode-'+mode}>
    {mode!=='preview'&&canEdit&&<div className="pe-edit">{lang==='en'&&en.length===0?<p className="be-empty">Pas encore de version anglaise : la version française sera utilisée. Ouvrez « Réglages » pour la copier et la traduire.</p>:<BlockEditor value={blocks} onChange={setBlocks} documents={documents}/>}</div>}
    {(mode!=='edit'||!canEdit)&&<div className="pe-preview" {...(b?{style:{'--product':b.accent,'--product-tint':b.tint} as React.CSSProperties}:{})}><p className="pe-preview-label"><Eye size={13}/>Aperçu investisseur</p><header className="dr-article-head">{b?<img className="dr-article-logo" src={b.logo} alt="" width={84} height={84}/>:null}<div><p className="journey-kicker">{categories.find(c=>c[0]===meta.category)?.[1]}</p><h1>{(lang==='en'&&meta.titleEn)||meta.titleFr||'Sans titre'}</h1></div></header><BlockView blocks={lang==='en'&&en.length?en:fr} lang={lang} documents={documents}/></div>}
   </div>
  </section>:<section className="pe-main"><p className="be-empty">Sélectionnez une page ou créez-en une.</p></section>}
 </div>
}
