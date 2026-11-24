import { useEffect,useState } from 'react'
import { Building2,LockKeyhole,Search,ArrowRight,LogOut,Globe2,FileText,RefreshCw } from 'lucide-react'
import { authClient } from '../../lib/auth-client'
type Section={id:string;titleFr:string;titleEn:string;bodyFr:string;bodyEn:string;category:string;order:number;publishedAt:number}
export type Overview={name:string;rooms:{id:string;name:string}[];room:{id:string;name:string}|null;nda:{version:string;textFr:string;textEn:string}|null;sections:Section[]}
const dictionary={fr:{private:'ESPACE INVESTISSEUR',welcome:'Bienvenue',overview:'Vue d’ensemble',search:'Rechercher dans les sections accessibles',empty:'Aucun contenu publié ne vous est encore accessible.',noRoom:'ADC n’a pas encore attribué de salle à votre compte.',nda:'Accord de confidentialité',agree:'J’ai lu et j’accepte cette version de l’accord.',continue:'Accepter et continuer',refresh:'Actualiser',expired:'Votre accès a changé ou la connexion est indisponible. Reconnectez-vous.',logout:'Déconnexion',profile:'Mon profil',published:'Publié le',error:'Impossible de terminer cette action.',none:'Aucun résultat.',room:'Salle de données',choose:'Choisir une salle',language:'EN'},en:{private:'INVESTOR ROOM',welcome:'Welcome',overview:'Overview',search:'Search accessible sections',empty:'No published content is currently available to you.',noRoom:'ADC has not assigned a room to your account yet.',nda:'Confidentiality agreement',agree:'I have read and accept this version of the agreement.',continue:'Accept and continue',refresh:'Refresh',expired:'Your access has changed or the connection is unavailable. Please sign in again.',logout:'Sign out',profile:'My profile',published:'Published on',error:'Unable to complete this action.',none:'No results.',room:'Data room',choose:'Select a room',language:'FR'}} as const
type Locale=keyof typeof dictionary
export function InvestorRoom({initial,refresh,acceptNda}:{initial:Overview;refresh:(roomId?:string)=>Promise<Overview|null>;acceptNda:(roomId:string,version:string)=>Promise<{ok:boolean}>}){
 const [lang,setLang]=useState<Locale>('fr'),[data,setData]=useState<Overview|null>(initial),[search,setSearch]=useState(''),[active,setActive]=useState<string|null>(null),[agree,setAgree]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(false)
 const t=dictionary[lang]
 const roomId=data?.room?.id
 // Recheck authorization periodically and on window focus. Clear the rendered content on failure.
 useEffect(()=>{
  let alive=true,sequence=0
  async function load(){const token=++sequence;try{const next=await refresh(roomId);if(alive&&token===sequence)setData(next)}catch{if(alive&&token===sequence)setData(null)}}
  const timer=window.setInterval(()=>void load(),30000)
  const focus=()=>void load()
  window.addEventListener('focus',focus)
  return ()=>{alive=false;window.clearInterval(timer);window.removeEventListener('focus',focus)}
 },[roomId,refresh])
 useEffect(()=>{document.documentElement.lang=lang},[lang])
 const title=(s:Section)=>lang==='fr'?s.titleFr:s.titleEn
 const body=(s:Section)=>lang==='fr'?s.bodyFr:s.bodyEn
 const visible=(data?.sections??[]).filter(s=>!search||[title(s),body(s)].some(v=>v.toLocaleLowerCase(lang).includes(search.toLocaleLowerCase(lang))))
 const selected=visible.find(s=>s.id===active)
 async function reload(){setBusy(true);setError(false);try{setData(await refresh(roomId))}catch{setData(null)}finally{setBusy(false)}}
 async function approve(){if(!data?.nda||!roomId||!agree)return;setBusy(true);setError(false);try{const r=await acceptNda(roomId,data.nda.version);if(!r.ok)throw new Error('Denied');setData(await refresh(roomId));setAgree(false)}catch{setError(true)}finally{setBusy(false)}}
 async function logout(){try{const r=await authClient.signOut();if(r.error)throw new Error('Sign out failed');setData(null);location.replace('/')}catch{setError(true)}}
 if(!data)return <main className="welcome-shell"><section className="panel" style={{margin:'auto'}}><LockKeyhole/><h2>{t.private}</h2><p role="alert">{t.expired}</p><a href="/">{t.continue}</a></section></main>
 return <div className="room-layout">
  <aside className="room-sidebar"><img className="brand" src="/adc-logo.png" alt="African Digit Consulting"/><p className="eyebrow">{t.private}</p><label className="field">{t.room}<select aria-label={t.choose} value={roomId??''} onChange={e=>location.assign('/investor?roomId='+encodeURIComponent(e.target.value))}><option value="" disabled>{t.choose}</option>{data.rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><nav aria-label={t.room}><button className={'nav-item '+(!active?'chosen':'')} onClick={()=>{setActive(null);setSearch('')}}><Building2 size={17}/>{t.overview}</button>{data.sections.map(s=><button key={s.id} className={'nav-item '+(active===s.id?'chosen':'')} onClick={()=>{setSearch('');setActive(s.id)}}><FileText size={17}/>{title(s)}</button>)}</nav><div className="sidebar-bottom"><a href="/access">{t.profile}</a><button className="secondary" onClick={()=>void logout()}><LogOut size={16}/>{t.logout}</button></div></aside>
  <main className="room-main"><header className="room-toolbar"><span><LockKeyhole size={15}/> {data.room?.name??t.private}</span><div><button className="secondary" onClick={()=>void reload()} disabled={busy}><RefreshCw size={16}/>{t.refresh}</button><button className="language" onClick={()=>setLang(l=>l==='fr'?'en':'fr')}><Globe2 size={16}/>{t.language}</button></div></header>
   {error&&<p role="alert" className="error">{t.error}</p>}
   <section className="room-intro"><p className="eyebrow">{t.private}</p><h1>{t.welcome}, {data.name}</h1><p>{data.room?.name??'African Digit Consulting'}</p></section>
   {!data.room?<section className="room-card"><LockKeyhole/><p>{t.noRoom}</p></section>:data.nda?<section className="room-card"><h2>{t.nda}</h2><p className="eyebrow">{data.nda.version}</p><div className="room-body nda-text">{lang==='fr'?data.nda.textFr:data.nda.textEn}</div><label className="nda-agree"><input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)}/>{t.agree}</label><button className="primary" disabled={!agree||busy} onClick={()=>void approve()}>{t.continue}<ArrowRight size={18}/></button></section>:<>
    <label className="room-search"><Search size={18}/><input aria-label={t.search} placeholder={t.search} value={search} onChange={e=>{setSearch(e.target.value);setActive(null)}}/></label>
    {selected?<article className="room-card"><p className="eyebrow">{selected.category}</p><h2>{title(selected)}</h2><div className="room-body">{body(selected)}</div><p className="room-date">{t.published} {new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeZone:'UTC'}).format(selected.publishedAt)}</p></article>:visible.length?<div className="room-grid">{visible.map(s=><button className="room-card section-card" key={s.id} onClick={()=>setActive(s.id)}><FileText size={20}/><p className="eyebrow">{s.category}</p><h2>{title(s)}</h2><p>{body(s).slice(0,160)}{body(s).length>160?'…':''}</p><ArrowRight size={18}/></button>)}</div>:<section className="room-card"><p>{search?t.none:t.empty}</p></section>}
   </>}
  </main>
 </div>
}
