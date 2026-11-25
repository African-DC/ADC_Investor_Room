import { useEffect,useRef,useState } from 'react'
import { Building2,LockKeyhole,ArrowRight,ArrowLeft,LogOut,Globe2,FileText,RefreshCw,LayoutDashboard,Menu,ChevronRight,Hourglass,ShieldCheck,Inbox,Eye,Download,Boxes,TrendingUp,Landmark,Rocket,Users,Cpu,Scale,FolderLock } from 'lucide-react'
import { JourneyFrame } from '../onboarding/JourneyFrame'
import { OverlayHost } from '@ui-sdk/react/overlays'
import { BlockView } from '../blocks/BlockView'
import { parseBlocks } from '../blocks/schema'
import type { Block } from '../blocks/schema'
import { SearchField } from '../../components/ui/SearchField'
import { IntelligencePanel } from '../intelligence/IntelligencePanel'
import type { Answer } from '../intelligence/retrieval'
import { Questions } from '../qa/Questions'
import type { Question,Thread,QuestionAction } from '../qa/Questions'
import { PdfReader } from '../documents/PdfReader'
import { FinanceView } from '../finance/FinanceView'
import type { MetricView } from '../finance/FinanceView'
import { authClient } from '../../lib/auth-client'
import { brandFor } from '../brand/products'
import type { CSSProperties } from 'react'
type Section={id:string;versionId:string;slug?:string;blocksFr?:string|null;blocksEn?:string|null;titleFr:string;titleEn:string;bodyFr:string;bodyEn:string;category:string;order:number;publishedAt:number}
type DocumentItem={id:string;titleFr:string;titleEn:string;category:string;version:number;sizeBytes:number;download:boolean}
export type Overview={name:string;rooms:{id:string;name:string}[];room:{id:string;name:string}|null;nda:{version:string;textFr:string;textEn:string}|null;sections:Section[];documents:DocumentItem[];metrics:MetricView[];qaEnabled:boolean;questions:Question[];analytics:{allowed:boolean}|null;aiEnabled:boolean;aiExternal:boolean}
const dictionary={fr:{private:'ESPACE INVESTISSEUR',welcome:'Bienvenue',overview:'Vue d’ensemble',search:'Rechercher dans les sections accessibles',empty:'Aucun contenu publié ne vous est encore accessible.',noRoom:'ADC n’a pas encore attribué de salle à votre compte.',nda:'Accord de confidentialité',agree:'J’ai lu et j’accepte cette version de l’accord.',continue:'Accepter et continuer',refresh:'Actualiser',expired:'Votre accès a changé ou la connexion est indisponible. Reconnectez-vous.',logout:'Déconnexion',profile:'Mon profil',published:'Publié le',error:'Impossible de terminer cette action.',none:'Aucun résultat.',room:'Salle de données',choose:'Choisir une salle',language:'EN'},en:{private:'INVESTOR ROOM',welcome:'Welcome',overview:'Overview',search:'Search accessible sections',empty:'No published content is currently available to you.',noRoom:'ADC has not assigned a room to your account yet.',nda:'Confidentiality agreement',agree:'I have read and accept this version of the agreement.',continue:'Accept and continue',refresh:'Refresh',expired:'Your access has changed or the connection is unavailable. Please sign in again.',logout:'Sign out',profile:'My profile',published:'Published on',error:'Unable to complete this action.',none:'No results.',room:'Data room',choose:'Select a room',language:'FR'}} as const
type Locale=keyof typeof dictionary
export function InvestorRoom({initial,refresh,acceptNda,questionRead,questionSend,engagement,intelligence}:{initial:Overview;refresh:(roomId?:string)=>Promise<Overview|null>;acceptNda:(roomId:string,version:string)=>Promise<{ok:boolean}>;questionRead:(roomId:string,id:string)=>Promise<Thread|null>;questionSend:(roomId:string,a:QuestionAction)=>Promise<{ok:boolean}>;intelligence:(a:{roomId:string;question:string;lang:Locale;externalConsent:boolean})=>Promise<Answer>;engagement:(a:{kind:'consent';roomId:string;allowed:boolean}|{kind:'section';roomId:string;sectionId:string})=>Promise<{ok:boolean}>}){
 const [lang,setLang]=useState<Locale>('fr'),[data,setData]=useState<Overview|null>(initial),[search,setSearch]=useState(''),[active,setActive]=useState<string|null>(null),[activeDocument,setActiveDocument]=useState<string|null>(null),[agreedVersion,setAgreedVersion]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(false),[menu,setMenu]=useState(false)
 const t=dictionary[lang]
 const sequence=useRef(0)
 const agreed=!!data?.nda&&agreedVersion===data.nda.version
 const roomId=data?.room?.id
 // Recheck authorization periodically and on window focus. Clear the rendered content on failure.
 useEffect(()=>{
  let alive=true
  async function load(){const token=++sequence.current;try{const next=await refresh(roomId);if(alive&&token===sequence.current)setData(next)}catch{if(alive&&token===sequence.current)setData(null)}}
  const timer=window.setInterval(()=>void load(),30000)
  const focus=()=>void load()
  window.addEventListener('focus',focus)
  return ()=>{alive=false;sequence.current++;window.clearInterval(timer);window.removeEventListener('focus',focus)}
 },[roomId,refresh])
 useEffect(()=>{document.documentElement.lang=lang},[lang])
 const title=(s:Section)=>lang==='fr'?s.titleFr:s.titleEn
 const body=(s:Section)=>lang==='fr'?s.bodyFr:s.bodyEn
 const visible=(data?.sections??[]).filter(s=>!search||[title(s),body(s)].some(v=>v.toLocaleLowerCase(lang).includes(search.toLocaleLowerCase(lang))))
 const selected=visible.find(s=>s.id===active)
 const selectedDocument=data?.documents.find(d=>d.id===activeDocument)
 async function reload(){setBusy(true);setError(false);const token=++sequence.current;try{const next=await refresh(roomId);if(token===sequence.current)setData(next)}catch{if(token===sequence.current)setData(null)}finally{setBusy(false)}}
 async function approve(){if(!data?.nda||!roomId||!agreed)return;setBusy(true);setError(false);sequence.current++;try{const r=await acceptNda(roomId,data.nda.version);if(!r.ok)throw new Error('Denied');const token=++sequence.current;const next=await refresh(roomId);if(token===sequence.current)setData(next);setAgreedVersion(null)}catch{setError(true)}finally{setBusy(false)}}
 function openSection(id:string){setActive(id);if(roomId&&data?.analytics?.allowed)void engagement({kind:'section',roomId,sectionId:id}).catch(()=>{})}
 async function consent(allowed:boolean){if(!roomId)return;setBusy(true);try{const result=await engagement({kind:'consent',roomId,allowed});if(!result.ok)throw Error('Unavailable');await reload()}catch{setError(true)}finally{setBusy(false)}}
 async function logout(){try{const r=await authClient.signOut();if(r.error)throw new Error('Sign out failed');sequence.current++;setData(null);location.replace('/')}catch{setError(true)}}
 const sections=data?.sections??[]
 const index=selected?sections.findIndex(s=>s.id===selected.id):-1
 const fr=lang==='fr'
 const date=(n:number)=>new Intl.DateTimeFormat(lang,{dateStyle:'long',timeZone:'UTC'}).format(n)
 function go(id:string|null){setSearch('');setActiveDocument(null);setMenu(false);if(id)openSection(id);else setActive(null);document.querySelector('.dr-main')?.scrollTo({top:0,behavior:'smooth'})}
 if(!data)return <JourneyFrame lang={lang} setLang={setLang} tone="alert"><div className="frame-emblem is-alert"><LockKeyhole size={30} aria-hidden="true"/></div><h1>{fr?'Session interrompue.':'Session ended.'}</h1><p role="alert" className="frame-lead">{t.expired}</p><a className="primary journey-primary" href="/">{fr?'Se reconnecter':'Sign in again'}<ArrowRight size={19}/></a></JourneyFrame>
 const navItem=(s:Section)=>{const b=brandFor(s.slug),Icon=categoryIcon(s.category);return <button key={s.id} className={'dr-nav-item'+(active===s.id?' is-active':'')} aria-current={active===s.id?'page':undefined} onClick={()=>go(s.id)} {...brandStyle(s.slug)}>{b?<img src={b.logo} alt="" width={22} height={22}/>:<Icon size={18} aria-hidden="true"/>}<span>{title(s)}</span></button>}
 return <div className={'dr'+(menu?' menu-open':'')}>
  <aside className="dr-side" aria-label={t.room}>
   <a className="dr-brand" href="/investor"><img src="/adc-logo-mark.png" alt="African Digit Consulting"/></a>
   <div className="dr-room"><span className="dr-label">{t.room}</span>{data.rooms.length>1?<select aria-label={t.choose} value={roomId??''} onChange={e=>location.assign('/investor?roomId='+encodeURIComponent(e.target.value))}><option value="" disabled>{t.choose}</option>{data.rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>:<strong>{data.room?.name??'—'}</strong>}</div>
   <nav className="dr-nav">
    <button className={'dr-nav-item'+(!active?' is-active':'')} aria-current={!active?'page':undefined} onClick={()=>go(null)}><LayoutDashboard size={18} aria-hidden="true"/><span>{t.overview}</span></button>
    {sections.length>0&&<p className="dr-label dr-nav-title">{fr?'Rubriques':'Sections'}</p>}
    {sections.map(navItem)}
   </nav>
   <div className="dr-user"><span className="dr-avatar" aria-hidden="true">{initials(data.name)}</span><div><strong>{data.name}</strong><a href="/access">{t.profile}</a></div><button className="dr-icon" onClick={()=>void logout()} aria-label={t.logout} title={t.logout}><LogOut size={17}/></button></div>
  </aside>
  <button className="dr-scrim" aria-label={fr?'Fermer le menu':'Close menu'} onClick={()=>setMenu(false)} tabIndex={menu?0:-1}/>
  <main className="dr-main">
   <header className="dr-top">
    <button className="dr-icon dr-menu" aria-label={fr?'Ouvrir le menu':'Open menu'} aria-expanded={menu} onClick={()=>setMenu(true)}><Menu size={20}/></button>
    <nav className="dr-crumbs" aria-label={fr?'Fil d’Ariane':'Breadcrumb'}><LockKeyhole size={14} aria-hidden="true"/><button onClick={()=>go(null)}>{data.room?.name??t.private}</button>{selected&&<><ChevronRight size={14} aria-hidden="true"/><span>{title(selected)}</span></>}</nav>
    <div className="dr-actions"><button className="dr-icon" onClick={()=>void reload()} disabled={busy} aria-label={t.refresh} title={t.refresh}><RefreshCw size={17} className={busy?'spin':''}/></button><button className="dr-pill" onClick={()=>setLang(l=>l==='fr'?'en':'fr')}><Globe2 size={16}/>{t.language}</button></div>
   </header>
   {error&&<p role="alert" className="dr-alert">{t.error}</p>}
   {!data.room?<section className="dr-empty"><div className="frame-emblem"><Hourglass size={30} aria-hidden="true"/></div><h1>{fr?'Votre accès est en préparation.':'Your access is being prepared.'}</h1><p>{t.noRoom}</p><a className="dr-link" href="/access">{t.profile}<ArrowRight size={15}/></a></section>
   :data.nda?<section className="dr-nda"><div className="frame-emblem"><ShieldCheck size={30} aria-hidden="true"/></div><p className="journey-kicker">{t.nda} · {data.nda.version}</p><h1>{fr?'Avant d’entrer dans la salle.':'Before entering the room.'}</h1><p className="dr-muted">{fr?'Lisez et acceptez l’accord de confidentialité pour accéder aux contenus.':'Read and accept the confidentiality agreement to access the content.'}</p><div className="dr-nda-text" tabIndex={0}>{fr?data.nda.textFr:data.nda.textEn}</div><label className="dr-check"><input type="checkbox" checked={agreed} onChange={e=>setAgreedVersion(e.target.checked?data.nda?.version??null:null)}/><span>{t.agree}</span></label><button className="primary journey-primary" disabled={!agreed||busy} onClick={()=>void approve()}>{t.continue}<ArrowRight size={18}/></button></section>
   :selected?<article key={selected.id} className="dr-article" {...brandStyle(selected.slug)}>
     <button className="dr-back" onClick={()=>go(null)}><ArrowLeft size={15}/>{t.overview}</button>
     <header className="dr-article-head">{brandFor(selected.slug)?<img className="dr-article-logo" src={brandFor(selected.slug)!.logo} alt="" width={84} height={84}/>:<span className="dr-article-icon">{(()=>{const I=categoryIcon(selected.category);return <I size={30}/>})()}</span>}<div><p className="journey-kicker">{categoryLabel(selected.category,lang)}</p><h1>{title(selected)}</h1><p className="dr-muted">{t.published} {date(selected.publishedAt)}</p></div></header>
     {(()=>{const blocks=safeBlocks(lang==='fr'?selected.blocksFr:selected.blocksEn??selected.blocksFr);return blocks?<BlockView blocks={blocks} lang={lang} documents={data.documents} openDocument={id=>setActiveDocument(id)}/>:<div className="dr-prose">{body(selected)}</div>})()}
     {selectedDocument&&data.room&&<PdfReader key={selectedDocument.id+'-'+selectedDocument.version} roomId={data.room.id} documentId={selectedDocument.id} title={fr?selectedDocument.titleFr:selectedDocument.titleEn} viewer={data.name} lang={lang} onClose={()=>setActiveDocument(null)}/>}
     {data.metrics.some(m=>m.sectionId===selected.id)&&<FinanceView metrics={data.metrics.filter(m=>m.sectionId===selected.id)} lang={lang}/>}
     <nav className="dr-pager">{index>0?<button onClick={()=>go(sections[index-1].id)}><ArrowLeft size={16}/><span><small>{fr?'Précédent':'Previous'}</small>{title(sections[index-1])}</span></button>:<span/>}{index<sections.length-1&&<button className="next" onClick={()=>go(sections[index+1].id)}><span><small>{fr?'Suivant':'Next'}</small>{title(sections[index+1])}</span><ArrowRight size={16}/></button>}</nav>
    </article>
   :<div className="dr-overview">
     <section className="dr-hero"><div className="dr-hero-glow" aria-hidden="true"/><p className="journey-kicker">{t.private}</p><h1>{t.welcome}, {data.name.split(' ')[0]}.</h1><p>{fr?'Explorez African Digit Consulting, ses produits et les éléments mis à votre disposition dans cette salle.':'Explore African Digit Consulting, its products and the materials made available to you in this room.'}</p>
      <ul className="dr-stats"><li><strong>{sections.length}</strong>{fr?'rubriques':'sections'}</li><li><strong>{data.documents.length}</strong>{fr?'documents':'documents'}</li><li><ShieldCheck size={16}/>{fr?'Accès confidentiel':'Confidential access'}</li></ul></section>
     <SearchField label={t.search} clearLabel={fr?'Effacer la recherche':'Clear search'} value={search} onChange={v=>{setSearch(v);setActiveDocument(null);setActive(null)}}/>
     {visible.length?<section><h2 className="dr-h2">{search?(fr?'Résultats':'Results'):(fr?'Rubriques':'Sections')}</h2><div className="dr-grid">{visible.map((s,i)=>{const b=brandFor(s.slug),Icon=categoryIcon(s.category);return <button key={s.id} className={'dr-card'+(b?' is-product':'')} style={{...brandStyle(s.slug).style,animationDelay:Math.min(i,8)*70+'ms'}} data-product={brandStyle(s.slug)['data-product']} onClick={()=>go(s.id)}>
       <span className="dr-card-mark">{b?<img src={b.logo} alt="" width={b?56:24} height={56}/>:<Icon size={22} aria-hidden="true"/>}</span>
       <span className="dr-card-cat">{categoryLabel(s.category,lang)}</span><span className="dr-card-title">{title(s)}</span><span className="dr-card-text">{body(s).slice(0,120)}{body(s).length>120?'…':''}</span><span className="dr-card-go">{fr?'Découvrir':'Explore'}<ArrowRight size={15}/></span></button>})}</div></section>
     :<section className="dr-empty small"><Inbox size={28} aria-hidden="true"/><p>{search?t.none:t.empty}</p></section>}
     {!search&&data.documents.length>0&&<section><h2 className="dr-h2">{fr?'Documents autorisés':'Authorized documents'}</h2><ul className="dr-docs">{data.documents.map(doc=>{const href='/api/documents/file?roomId='+encodeURIComponent(data.room!.id)+'&documentId='+encodeURIComponent(doc.id);return <li key={doc.id}><span className="dr-doc-icon" aria-hidden="true"><FileText size={20}/><small>PDF</small></span><div><strong>{fr?doc.titleFr:doc.titleEn}</strong><span>{categoryLabel(doc.category,lang)} · v{doc.version} · {formatSize(doc.sizeBytes,lang)}</span></div><div className="dr-doc-actions"><button className="dr-btn" onClick={()=>setActiveDocument(doc.id)}><Eye size={16}/>{fr?'Consulter':'View'}</button>{doc.download&&<a className="dr-btn ghost" href={href+'&download=1'}><Download size={16}/>{fr?'Télécharger':'Download'}</a>}</div></li>})}</ul></section>}
     {selectedDocument&&data.room&&!search&&<PdfReader key={selectedDocument.id+'-'+selectedDocument.version} roomId={data.room.id} documentId={selectedDocument.id} title={fr?selectedDocument.titleFr:selectedDocument.titleEn} viewer={data.name} lang={lang} onClose={()=>setActiveDocument(null)}/>}
     {!search&&<FinanceView metrics={data.metrics} lang={lang}/>}
     {data.aiEnabled&&data.room&&!search&&!selectedDocument&&<IntelligencePanel key={data.room.id+':'+lang+':'+JSON.stringify([data.sections.map(s=>[s.id,s.versionId]),data.metrics.map(m=>m.id)])} lang={lang} external={data.aiExternal} ask={(question,externalConsent)=>intelligence({roomId:data.room!.id,question,lang,externalConsent})} open={id=>go(id)}/>}
     {data.qaEnabled&&data.room&&!search&&!selectedDocument&&<Questions items={data.questions} lang={lang} read={id=>questionRead(data.room!.id,id)} send={async a=>{const result=await questionSend(data.room!.id,a);if(result.ok)await reload();return result}}/>}
     {data.analytics&&<section className="dr-consent"><label className="dr-switch"><input type="checkbox" role="switch" checked={data.analytics.allowed} disabled={busy} onChange={e=>void consent(e.target.checked)}/><span aria-hidden="true"/>{fr?'Autoriser les statistiques facultatives de consultation':'Allow optional engagement analytics'}</label><p>{fr?'Facultatif, sans impact sur vos accès. Mesure par jour, sans durée ni adresse IP. Retrait possible à tout moment ; historique conservé au maximum 90 jours.':'Optional, does not affect access. Daily counts, no duration or IP. Withdraw anytime; history retained up to 90 days.'}</p></section>}
    </div>}
   <footer className="dr-foot"><span><LockKeyhole size={13}/>{fr?'Contenu confidentiel — ne pas diffuser':'Confidential — do not distribute'}</span><span>African Digit Consulting © 2026</span></footer>
  </main>
  <OverlayHost/>
 </div>
}
const icons:Record<string,typeof FileText>={company:Building2,products:Boxes,investment:TrendingUp,finance:Landmark,traction:Rocket,team:Users,technology:Cpu,legal:Scale,compliance:ShieldCheck,documents:FolderLock}
function categoryIcon(c:string){return icons[c]??FileText}
const labels:Record<string,[string,string]>={company:['Entreprise','Company'],products:['Produit','Product'],investment:['Investissement','Investment'],finance:['Finances','Finance'],traction:['Traction','Traction'],team:['Équipe','Team'],technology:['Technologie','Technology'],legal:['Juridique','Legal'],compliance:['Conformité','Compliance'],documents:['Documents','Documents'],other:['Autre','Other']}
function categoryLabel(c:string,lang:Locale){const l=labels[c];return l?(lang==='fr'?l[0]:l[1]):c}
function initials(name:string){return name.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]!.toUpperCase()).join('')||'·'}
function formatSize(n:number,lang:Locale){return n>=1048576?(n/1048576).toLocaleString(lang,{maximumFractionDigits:1})+(lang==='fr'?' Mo':' MB'):Math.ceil(n/1024)+(lang==='fr'?' Ko':' KB')}
function brandStyle(slug?:string){const b=brandFor(slug);return b?{style:{'--product':b.accent,'--product-tint':b.tint} as CSSProperties,'data-product':b.name}:{style:undefined,'data-product':undefined}}

function safeBlocks(json?:string|null):Block[]|null{try{return parseBlocks(json)}catch{return null}}
