import { useMemo,useState } from 'react'
import { confirm } from '@ui-sdk/react/alert-dialog'
const ask=(title:string)=>confirm({title,description:'Cette action est journalisée.',cancelLabel:'Annuler',confirmLabel:'Confirmer'})
import { Users,Link2,ShieldCheck,ShieldX,Clock,CalendarRange,Copy,Check,Trash2,Globe2,Lock,Eye,Download,Plus,UsersRound,FileText,LayoutList } from 'lucide-react'
import type { AdminCommand } from './contracts'
type Grant={id:string;capability:string;resourceId:string|null;effect:string;startsAt?:number|null;expiresAt:number|null;revokedAt:number|null}
type Applicant={id:string;name:string;email:string;organization:string;grants:Grant[]}
type Item={id:string;title:string}
type Group={id:string;name:string;profileIds:string[]}
type LinkRow={id:string;label:string;targets:{capability:string;resourceId?:string}[];email:string|null;startsAt:number;expiresAt:number;grantUntil:number|null;maxUses:number;uses:number;active:boolean;revoked:boolean}
type Cap='room:read'|'section:read'|'document:read'|'document:download'
type Target={capability:Cap;resourceId?:string}
const key=(t:Target)=>t.capability+':'+(t.resourceId??'*')
const day=(d:string,end=false)=>d?new Date(d+(end?'T23:59:59':'T00:00:00')).getTime():undefined
const fmt=(n:number)=>new Intl.DateTimeFormat('fr',{dateStyle:'medium'}).format(n)
function state(g:Grant,now:number){if(g.revokedAt)return 'revoked';if(g.expiresAt&&g.expiresAt<=now)return 'expired';if(g.startsAt&&g.startsAt>now)return 'scheduled';return g.effect==='deny'?'denied':'active'}
const stateLabel:Record<string,string>={active:'Actif',denied:'Refusé',scheduled:'Programmé',expired:'Expiré',revoked:'Révoqué'}
export function AccessManager({reload,roomId,roomStatus,canPublishRoom,applicants,sections,documents,groups,links,busy,run,createLink}:{reload:()=>Promise<void>;roomId:string;roomStatus:string;canPublishRoom:boolean;applicants:Applicant[];sections:Item[];documents:Item[];groups:Group[];links:LinkRow[];busy:boolean;run:(c:AdminCommand)=>Promise<void>;createLink:(d:{label:string;targets:Target[];email?:string;startsAt:number;expiresAt:number;grantUntil?:number;maxUses:number})=>Promise<{url:string}|null>}){
 const [tab,setTab]=useState<'people'|'groups'|'links'>('people'),now=Date.now()
 const [selected,setSelected]=useState<string[]>([]),[targets,setTargets]=useState<Target[]>([{capability:'room:read'}]),[effect,setEffect]=useState<'allow'|'deny'>('allow'),[from,setFrom]=useState(''),[to,setTo]=useState(''),[q,setQ]=useState('')
 const label=(t:Target)=>t.capability==='room:read'?'Salle entière':t.capability==='section:read'?(sections.find(s=>s.id===t.resourceId)?.title??'Rubrique'):(documents.find(d=>d.id===t.resourceId)?.title??'Document')+(t.capability==='document:download'?' · téléchargement':'')
 const filtered=applicants.filter(a=>[a.name,a.email,a.organization].some(x=>x.toLowerCase().includes(q.toLowerCase())))
 const one=selected.length===1?applicants.find(a=>a.id===selected[0]):null
 const toggle=(id:string)=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])
 async function apply(){if(!selected.length||!targets.length)return;await run({kind:'setAccess',roomId,profileIds:selected,targets,effect,startsAt:day(from),expiresAt:day(to,true)})}
 return <div className="am">
  <section className={'am-room '+(roomStatus==='published'?'is-live':'')}><span className="am-room-icon">{roomStatus==='published'?<Globe2 size={22}/>:<Lock size={22}/>}</span><div><strong>{roomStatus==='published'?'Salle publiée':'Salle non publiée'}</strong><p>{roomStatus==='published'?'Les investisseurs autorisés voient les rubriques publiées.':'Aucun investisseur ne voit la salle, quels que soient ses droits.'}</p></div>{canPublishRoom&&<button className={'dr-btn'+(roomStatus==='published'?' ghost':'')} disabled={busy} onClick={()=>void run({kind:'roomStatus',roomId,status:roomStatus==='published'?'draft':'published'})}>{roomStatus==='published'?'Dépublier la salle':'Publier la salle'}</button>}</section>
  <nav className="am-tabs" role="tablist"><button role="tab" aria-selected={tab==='people'} onClick={()=>setTab('people')}><Users size={16}/>Investisseurs & droits</button><button role="tab" aria-selected={tab==='groups'} onClick={()=>setTab('groups')}><UsersRound size={16}/>Groupes ({groups.length})</button><button role="tab" aria-selected={tab==='links'} onClick={()=>setTab('links')}><Link2 size={16}/>Liens temporaires ({links.filter(l=>l.active).length})</button></nav>
  {tab==='people'&&<div className="am-grid">
   <aside className="am-people"><input className="am-search" placeholder="Rechercher un investisseur…" value={q} onChange={e=>setQ(e.target.value)}/>
    {groups.length>0&&<div className="am-chips">{groups.map(g=><button key={g.id} onClick={()=>setSelected(g.profileIds.filter(id=>applicants.some(a=>a.id===id)))}><UsersRound size={13}/>{g.name}</button>)}</div>}
    <label className="am-all"><input type="checkbox" checked={filtered.length>0&&filtered.every(a=>selected.includes(a.id))} onChange={e=>setSelected(e.target.checked?filtered.map(a=>a.id):[])}/>Tout sélectionner ({filtered.length})</label>
    <ul>{filtered.map(a=>{const active=a.grants.filter(g=>state(g,now)==='active').length;return <li key={a.id}><label className={selected.includes(a.id)?'is-on':''}><input type="checkbox" checked={selected.includes(a.id)} onChange={()=>toggle(a.id)}/><span className="dr-avatar sm">{a.name.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase()}</span><span><b>{a.name}</b><small>{a.organization||a.email}</small></span><em>{active} droit{active>1?'s':''}</em></label></li>})}{!filtered.length&&<li className="am-empty">Aucun investisseur. Ils apparaissent après une demande d’accès ou via un lien temporaire.</li>}</ul></aside>
   <div className="am-work">
    <section className="am-card"><h3><ShieldCheck size={18}/>Attribuer des droits {selected.length>0&&<span className="am-count">{selected.length} investisseur{selected.length>1?'s':''}</span>}</h3>
     <div className="am-presets"><span className="am-label">Profils rapides</span>{[
      {label:'Découverte',hint:'Rubriques générales, 14 jours, sans documents',build:()=>({t:sections.filter(x=>/african|pourquoi|klassci|wouri|équipe|technolog/i.test(x.title)).map(x=>({capability:'section:read' as Cap,resourceId:x.id})),days:14})},
      {label:'Due diligence',hint:'Toute la salle + consultation des documents, 30 jours',build:()=>({t:[{capability:'room:read' as Cap},...documents.map(d=>({capability:'document:read' as Cap,resourceId:d.id}))],days:30})},
      {label:'Due diligence + téléchargement',hint:'Comme ci-dessus, avec téléchargement, 30 jours',build:()=>({t:[{capability:'room:read' as Cap},...documents.flatMap(d=>[{capability:'document:read' as Cap,resourceId:d.id},{capability:'document:download' as Cap,resourceId:d.id}])],days:30})},
      {label:'Investisseur',hint:'Toute la salle et les documents, sans date de fin',build:()=>({t:[{capability:'room:read' as Cap},...documents.map(d=>({capability:'document:read' as Cap,resourceId:d.id}))],days:0})},
     ].map(p=><button key={p.label} type="button" title={p.hint} onClick={()=>{const r=p.build();setTargets(r.t.length?r.t:[{capability:'room:read'}]);setEffect('allow');const today=new Date();setFrom(today.toISOString().slice(0,10));setTo(r.days?new Date(today.getTime()+r.days*864e5).toISOString().slice(0,10):'')}}><b>{p.label}</b><small>{p.hint}</small></button>)}</div>
     <TargetPicker sections={sections} documents={documents} value={targets} onChange={setTargets}/>
     <div className="am-row"><div className="pe-seg" role="group" aria-label="Effet"><button aria-pressed={effect==='allow'} onClick={()=>setEffect('allow')}>Autoriser</button><button aria-pressed={effect==='deny'} onClick={()=>setEffect('deny')}>Refuser</button></div>
      <label className="am-date"><CalendarRange size={15}/>Du<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label className="am-date">au<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
      <button className={'dr-btn'+(effect==='deny'?' danger-solid':'')} disabled={busy||!selected.length||!targets.length} onClick={()=>void apply()}>{effect==='allow'?<ShieldCheck size={16}/>:<ShieldX size={16}/>}Appliquer</button></div>
     <p className="am-help">Sans date de fin, le droit reste actif jusqu’à révocation. Un refus l’emporte toujours sur une autorisation. Le téléchargement est un droit distinct de la consultation.</p></section>
    {one&&<section className="am-card"><h3><LayoutList size={18}/>Droits de {one.name}</h3>{one.grants.length?<table className="am-table"><thead><tr><th>Élément</th><th>Statut</th><th>Période</th><th/></tr></thead><tbody>{[...one.grants].sort((a,b)=>(a.revokedAt?1:0)-(b.revokedAt?1:0)).map(g=>{const st=state(g,now);return <tr key={g.id} className={'st-'+st}><td>{g.capability==='document:download'?<Download size={14}/>:<Eye size={14}/>} {label({capability:g.capability as Cap,resourceId:g.resourceId??undefined})}</td><td><span className={'am-badge b-'+st}>{stateLabel[st]}</span></td><td>{g.startsAt?fmt(g.startsAt):'—'} → {g.expiresAt?fmt(g.expiresAt):'illimité'}</td><td>{!g.revokedAt&&<button className="be-x" aria-label="Révoquer" disabled={busy} onClick={()=>void run({kind:'revokeMany',roomId,grantIds:[g.id]})}><Trash2 size={14}/></button>}</td></tr>})}</tbody></table>:<p className="am-help">Aucun droit pour le moment.</p>}
     {one.grants.some(g=>!g.revokedAt)&&<button className="dr-btn ghost danger" disabled={busy} onClick={async()=>{if(await ask('Révoquer tous les droits de '+one.name+' ?'))void run({kind:'revokeMany',roomId,grantIds:one.grants.filter(g=>!g.revokedAt).map(g=>g.id)})}}><Trash2 size={15}/>Tout révoquer</button>}</section>}
   </div></div>}
  {tab==='groups'&&<Groups roomId={roomId} applicants={applicants} groups={groups} busy={busy} run={run}/>}
  {tab==='links'&&<Links reload={reload} sections={sections} documents={documents} links={links} label={label} busy={busy} run={run} roomId={roomId} createLink={createLink}/>}
 </div>
}
function TargetPicker({sections,documents,value,onChange}:{sections:Item[];documents:Item[];value:Target[];onChange:(t:Target[])=>void}){
 const has=(t:Target)=>value.some(v=>key(v)===key(t)),flip=(t:Target)=>onChange(has(t)?value.filter(v=>key(v)!==key(t)):[...value,t])
 const Row=({t,icon,text}:{t:Target;icon:React.ReactNode;text:string})=><label className={'am-target'+(has(t)?' is-on':'')}><input type="checkbox" checked={has(t)} onChange={()=>flip(t)}/>{icon}<span>{text}</span></label>
 return <div className="am-targets">
  <Row t={{capability:'room:read'}} icon={<Globe2 size={15}/>} text="Salle entière (toutes les rubriques publiées)"/>
  {sections.length>0&&<details open><summary>Rubriques ({sections.length})</summary>{sections.map(s=><Row key={s.id} t={{capability:'section:read',resourceId:s.id}} icon={<LayoutList size={15}/>} text={s.title}/>)}</details>}
  {documents.length>0&&<details open><summary>Documents ({documents.length})</summary>{documents.map(d=><div className="am-docrow" key={d.id}><span><FileText size={15}/>{d.title}</span><Row t={{capability:'document:read',resourceId:d.id}} icon={<Eye size={14}/>} text="Consulter"/><Row t={{capability:'document:download',resourceId:d.id}} icon={<Download size={14}/>} text="Télécharger"/></div>)}</details>}
 </div>
}
function Groups({roomId,applicants,groups,busy,run}:{roomId:string;applicants:Applicant[];groups:Group[];busy:boolean;run:(c:AdminCommand)=>Promise<void>}){
 const [edit,setEdit]=useState<{id?:string;name:string;profileIds:string[]}|null>(null)
 return <div className="am-grid">
  <aside className="am-people"><button className="be-add" onClick={()=>setEdit({name:'',profileIds:[]})}><Plus size={14}/>Nouveau groupe</button><ul>{groups.map(g=><li key={g.id}><label className={edit?.id===g.id?'is-on':''} onClick={()=>setEdit({id:g.id,name:g.name,profileIds:g.profileIds})}><UsersRound size={16}/><span><b>{g.name}</b><small>{g.profileIds.length} membre{g.profileIds.length>1?'s':''}</small></span></label></li>)}{!groups.length&&<li className="am-empty">Créez des groupes (ex. « Business Angels », « Fonds ») pour attribuer des droits en un clic.</li>}</ul></aside>
  {edit&&<section className="am-card am-work"><h3><UsersRound size={18}/>{edit.id?'Modifier le groupe':'Nouveau groupe'}</h3><input className="am-search" placeholder="Nom du groupe" value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})}/>
   <div className="am-targets">{applicants.map(a=><label key={a.id} className={'am-target'+(edit.profileIds.includes(a.id)?' is-on':'')}><input type="checkbox" checked={edit.profileIds.includes(a.id)} onChange={()=>setEdit({...edit,profileIds:edit.profileIds.includes(a.id)?edit.profileIds.filter(x=>x!==a.id):[...edit.profileIds,a.id]})}/><span>{a.name} · <small>{a.email}</small></span></label>)}</div>
   <div className="am-row"><button className="dr-btn" disabled={busy||!edit.name.trim()} onClick={()=>void run({kind:'saveGroup',roomId,groupId:edit.id,name:edit.name,profileIds:edit.profileIds}).then(()=>setEdit(null))}>Enregistrer</button>{edit.id&&<button className="dr-btn ghost danger" disabled={busy} onClick={async()=>{if(await ask('Supprimer ce groupe ? Les droits déjà attribués restent en place.'))void run({kind:'deleteGroup',roomId,groupId:edit.id!}).then(()=>setEdit(null))}}><Trash2 size={15}/>Supprimer</button>}</div></section>}
 </div>
}
function Links({reload,roomId,sections,documents,links,label,busy,run,createLink}:{reload:()=>Promise<void>;roomId:string;sections:Item[];documents:Item[];links:LinkRow[];label:(t:Target)=>string;busy:boolean;run:(c:AdminCommand)=>Promise<void>;createLink:(d:{label:string;targets:Target[];email?:string;startsAt:number;expiresAt:number;grantUntil?:number;maxUses:number})=>Promise<{url:string}|null>}){
 const today=new Date().toISOString().slice(0,10),week=new Date(Date.now()+7*86400000).toISOString().slice(0,10)
 const [f,setF]=useState({label:'',email:'',from:today,to:week,until:'',uses:1}),[targets,setTargets]=useState<Target[]>([{capability:'room:read'}]),[url,setUrl]=useState<string|null>(null),[err,setErr]=useState(false),[copied,setCopied]=useState(false),[working,setWorking]=useState(false)
 const sorted=useMemo(()=>[...links].sort((a,b)=>Number(b.active)-Number(a.active)),[links])
 async function create(){setWorking(true);setErr(false);setUrl(null);const r=await createLink({label:f.label,targets,email:f.email||undefined,startsAt:new Date(f.from+'T00:00:00').getTime(),expiresAt:new Date(f.to+'T23:59:59').getTime(),grantUntil:f.until?new Date(f.until+'T23:59:59').getTime():undefined,maxUses:f.uses}).catch(()=>null);setWorking(false);if(r){setUrl(r.url);await reload()}else setErr(true)}
 return <div className="am-grid wide">
  <section className="am-card"><h3><Link2 size={18}/>Créer un lien d’invitation</h3>
   <div className="am-form"><label>Nom du lien<input value={f.label} onChange={e=>setF({...f,label:e.target.value})} placeholder="ex. Fonds XYZ — due diligence"/></label><label>Réservé à l’e-mail (recommandé)<input type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} placeholder="investisseur@fonds.com"/></label>
    <label><Clock size={14}/>Lien valable du<input type="date" value={f.from} onChange={e=>setF({...f,from:e.target.value})}/></label><label>au<input type="date" value={f.to} onChange={e=>setF({...f,to:e.target.value})}/></label>
    <label>Accès accordé jusqu’au (facultatif)<input type="date" value={f.until} onChange={e=>setF({...f,until:e.target.value})}/></label><label>Utilisations maximum<input type="number" min={1} max={500} value={f.uses} onChange={e=>setF({...f,uses:Math.max(1,Math.min(500,Number(e.target.value)||1))})}/></label></div>
   <p className="am-label">Ce que le lien ouvre</p><TargetPicker sections={sections} documents={documents} value={targets} onChange={setTargets}/>
   <button className="dr-btn" disabled={working||busy||!f.label.trim()||!targets.length} onClick={()=>void create()}><Link2 size={16}/>Générer le lien</button>
   {err&&<p role="alert" className="frame-status error">Création impossible : vérifiez les dates et le périmètre.</p>}
   {url&&<div className="am-url"><p><b>Lien prêt.</b> Il ne sera plus affiché : copiez-le maintenant. L’investisseur devra vérifier son adresse e-mail avant d’accéder.</p><code>{url}</code><button className="dr-btn ghost" onClick={()=>{void navigator.clipboard?.writeText(url).then(()=>setCopied(true))}}>{copied?<Check size={15}/>:<Copy size={15}/>}{copied?'Copié':'Copier'}</button></div>}
  </section>
  <section className="am-card"><h3><LayoutList size={18}/>Liens existants</h3>{sorted.length?<table className="am-table"><thead><tr><th>Lien</th><th>Périmètre</th><th>Validité</th><th>Utilisations</th><th/></tr></thead><tbody>{sorted.map(l=><tr key={l.id}><td><b>{l.label}</b>{l.email&&<small>{l.email}</small>}</td><td>{l.targets.map(t=>label(t as Target)).join(', ')}</td><td>{fmt(l.startsAt)} → {fmt(l.expiresAt)}{l.grantUntil&&<small>accès jusqu’au {fmt(l.grantUntil)}</small>}</td><td>{l.uses}/{l.maxUses}</td><td><span className={'am-badge b-'+(l.revoked?'revoked':l.active?'active':'expired')}>{l.revoked?'Révoqué':l.active?'Actif':'Inactif'}</span>{!l.revoked&&<button className="be-x" aria-label="Révoquer le lien" disabled={busy} onClick={async()=>{if(await ask('Révoquer ce lien ? Les accès qu’il a ouverts seront aussi retirés.'))void run({kind:'revokeLink',roomId,linkId:l.id})}}><Trash2 size={14}/></button>}</td></tr>)}</tbody></table>:<p className="am-help">Aucun lien pour l’instant.</p>}</section>
 </div>
}
