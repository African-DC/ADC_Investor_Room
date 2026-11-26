import { useEffect,useRef,useState } from 'react'
import { authClient } from '../../lib/auth-client'
import { Questions } from '../qa/Questions'
import type { Question,Thread } from '../qa/Questions'
import { TechnicalPanel } from '../technical/TechnicalPanel'
import type { TechnicalResult } from '../technical/TechnicalPanel'
import { AnalyticsPanel } from '../analytics/AnalyticsPanel'
import type { AnalyticsResult } from '../analytics/AnalyticsPanel'
import { CrmBoard } from '../crm/CrmBoard'
import type { Contact,HistoryEvent } from '../crm/CrmBoard'
import { FinanceEditor } from './FinanceEditor'
import { PageEditor } from '../blocks/PageEditor'
import { AccessManager } from './AccessManager'
import { DocumentsPanel } from './DocumentsPanel'
import { TeamPanel } from './TeamPanel'
import { EmailLog } from './EmailLog'
import { NdaPanel } from './NdaPanel'
import type { NdaState } from './NdaPanel'
import { LayoutDashboard,PanelsTopLeft,FolderLock,KeyRound,Contact2,MessagesSquare,Landmark,BarChart3,GitBranch,ShieldCheck,ShieldAlert,LogOut,Menu,Search,Eye,FileText,FileClock,Globe2,UserPlus,Users,Link2,ChevronRight,CheckCircle2,PenLine,UsersRound,Mails,FileSignature } from 'lucide-react'
import { Dialog,DialogBackdrop,DialogContent,DialogShortcut,DialogTitle,DialogTrigger } from '@ui-sdk/react/dialog'
import { Command,CommandEmpty,CommandGroup,CommandGroupLabel,CommandInput,CommandItem,CommandItemIcon,CommandList } from '@ui-sdk/react/command'
import { Toast,ToastDescription,ToastRegion,ToastTitle,toast } from '@ui-sdk/react/toast'
import { confirm } from '@ui-sdk/react/alert-dialog'
import { OverlayHost } from '@ui-sdk/react/overlays'
const success:Record<string,string>={draft:'Brouillon enregistré',transition:'Statut de la page mis à jour',archive:'Page retirée de la salle',setAccess:'Droits appliqués',revokeMany:'Droits révoqués',saveGroup:'Groupe enregistré',deleteGroup:'Groupe supprimé',roomStatus:'Statut de la salle mis à jour',revokeLink:'Lien révoqué',teamInvite:'Invitation créée',teamSetCaps:'Rôles mis à jour',teamRevoke:'Administrateur révoqué',teamRevokeInvite:'Invitation annulée',retryEmail:'Nouvel envoi programmé',ndaPublish:'Nouvelle version du NDA publiée',ndaRemove:'NDA retiré',grantDocument:'Droit documentaire enregistré',documentTransition:'Document mis à jour',financeDraft:'Indicateur enregistré',financeTransition:'Indicateur mis à jour',crmUpdate:'Fiche CRM mise à jour',crmNote:'Note ajoutée',qaReply:'Réponse envoyée',qaClose:'Question clôturée'}
import type { AdminMetric } from './FinanceEditor'
import type { AdminCommand } from './contracts'
type Grant={id:string;capability:string;resourceId:string|null;effect:string;startsAt?:number|null;expiresAt:number|null;revokedAt:number|null}
type Applicant={id:string;name:string;email:string;organization:string;grants:Grant[]}
type Section={id:string;slug:string;category:string;order:number;published:boolean;latest:{id:string;number:number;state:string;titleFr:string;titleEn:string;bodyFr:string;bodyEn:string;source:string;own:boolean}|null}
type DocumentItem={id:string;titleFr:string;titleEn:string;category:string;status:string;version:{id:string;number:number;scanStatus:string;scanMethod?:string|null;sha256?:string;sizeBytes:number;own:boolean}|null}
type State={identity:{name:string;rooms:{id:string;name:string}[]};dashboard:{room:{id:string;name:string;status:string};capabilities:string[];applicants:Applicant[];sections:Section[];documents:DocumentItem[];metrics:AdminMetric[];uploadEnabled:boolean;manualScan?:boolean;nda?:NdaState|null;emails?:{id:string;kind:string;to:string;subject:string;status:string;attempts:number;lastError:string|null;createdAt:number;sentAt:number|null}[]|null;team?:{members:{id:string;name:string;email:string;capabilities:string[];revoked:boolean;self:boolean}[];invites:{id:string;email:string;capabilities:string[];createdAt:number;expiresAt:number;status:string}[]}|null;images?:Record<string,{src:string;width:number;height:number}>;contacts:Contact[];questions:Question[];analytics:AnalyticsResult|null;technicalTargets:{key:string;label:string}[];access:{groups:{id:string;name:string;profileIds:string[]}[];links:{id:string;label:string;targets:{capability:string;resourceId?:string}[];email:string|null;startsAt:number;expiresAt:number;grantUntil:number|null;maxUses:number;uses:number;active:boolean;revoked:boolean}[]}|null}}
export function AdminRoom({initial,reload,touch,command,history,questionRead,technical,createLink,reviewUrl,uploadImage}:{initial:State;touch:()=>Promise<{ok:boolean}>;reload:()=>Promise<State|null>;command:(data:AdminCommand)=>Promise<{ok:boolean}>;history:(id:string)=>Promise<HistoryEvent[]|null>;questionRead:(id:string)=>Promise<Thread|null>;technical:(key:string,draft:boolean)=>Promise<TechnicalResult|null>;createLink:Parameters<typeof AccessManager>[0]['createLink'];reviewUrl:(documentId:string)=>Promise<string|null>;uploadImage:(f:{dataUrl:string;width:number;height:number})=>Promise<string|null>}){
 const [data,setData]=useState<State|null>(initial),[busy,setBusy]=useState(false),[view,setView]=useState('dashboard'),[menu,setMenu]=useState(false),[palette,setPalette]=useState(false)
 const seq=useRef(0),lastTouch=useRef(0),touching=useRef(false),lastVerified=useRef(Date.now())
 const [connectionWarning,setConnectionWarning]=useState(false)
 useEffect(()=>{let alive=true;const activity=(event:Event)=>{if(!event.isTrusted||document.visibilityState!=='visible'||touching.current||Date.now()-lastTouch.current<60000)return;touching.current=true;lastTouch.current=Date.now();void touch().then(async r=>{if(!r.ok){if(alive)setData(null);return}const session=await authClient.getSession();if(session.error)throw Error('Session refresh unavailable');if(alive&&!session.data)setData(null)}).catch(()=>{if(alive)setConnectionWarning(true)}).finally(()=>{touching.current=false})};const events=['pointerdown','keydown','wheel','touchstart'] as const;for(const event of events)window.addEventListener(event,activity,{passive:true});return()=>{alive=false;for(const event of events)window.removeEventListener(event,activity)}},[touch])
 // The URL fragment is client-only: read it after mount (no SSR mismatch) and follow back/forward.
 useEffect(()=>{const sync=()=>{const h=location.hash.slice(1);if(h)setView(h)};sync();window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync)},[])
 async function run(data:AdminCommand){setBusy(true);seq.current++
  try{const result=await command(data);if(!result.ok)throw Error('Denied');const token=++seq.current;const next=await reload().catch(()=>null);if(token===seq.current&&next){lastVerified.current=Date.now();setData(next)}else if(token===seq.current){setConnectionWarning(true)}toast.success(success[data.kind]??'Modification enregistrée')}catch{toast.error('Action refusée',{description:'Vérifiez vos droits, les dates ou les champs, puis réessayez.'})}finally{setBusy(false)}
 }
 // Background refresh tolerates transient failures: only two consecutive "no session" answers end the session view.
 useEffect(()=>{let alive=true,misses=0;async function refresh(){const token=++seq.current;try{const next=await reload();if(!alive||seq.current!==token)return;if(next){misses=0;lastVerified.current=Date.now();setConnectionWarning(false);setData(next)}else if(++misses>=2){seq.current++;setData(null)}else window.setTimeout(()=>{if(alive)void refresh()},2500)}catch{if(alive&&seq.current===token)setConnectionWarning(true)}}const id=window.setInterval(()=>{if(document.visibilityState==='visible')void refresh()},30000);const checkAge=()=>{if(Date.now()-lastVerified.current>=90000){alive=false;seq.current++;setData(null)}};const expiry=window.setInterval(checkAge,1000);const focus=()=>{checkAge();if(alive)void refresh()};window.addEventListener('focus',focus);return()=>{alive=false;seq.current++;window.clearInterval(id);window.clearInterval(expiry);window.removeEventListener('focus',focus)}},[reload])
 if(!data)return <main className="adm-gone"><ShieldAlert size={28}/><h1>Vérification de session requise</h1><p>Votre accès d’administration doit être revérifié. Si votre session est encore valide, seul l’Authenticator sera demandé.</p><a className="dr-btn" href="/admin">Vérifier ma session</a></main>
 const {dashboard:d,identity}=data,roomId=d.room.id,has=(cap:string)=>d.capabilities.includes(cap)
 const review=d.sections.filter(s=>s.latest?.state==='review'),published=d.sections.filter(s=>s.published)
 const openQ=d.questions.filter(q=>q.status!=='closed'),activeLinks=(d.access?.links??[]).filter(l=>l.active)
 const now=Date.now(),activeGrants=d.applicants.reduce((n,a)=>n+a.grants.filter(g=>!g.revokedAt&&(!g.expiresAt||g.expiresAt>now)&&g.effect==='allow').length,0)
 const docsPending=d.documents.filter(x=>x.status==='draft')
 type View={key:string;label:string;icon:typeof LayoutDashboard;group:string;show:boolean;badge?:number;desc:string}
 const views:View[]=[
  {key:'dashboard',label:'Tableau de bord',icon:LayoutDashboard,group:'Pilotage',show:true,desc:'Vue d’ensemble de la salle et des actions à traiter.'},
  {key:'team',label:'Équipe ADC',icon:UsersRound,group:'Pilotage',show:has('access:manage'),badge:(d.team?.invites??[]).filter(i=>i.status==='pending').length,desc:'Administrateurs, rôles et invitations. Aucun auto-enrôlement.'},
  {key:'pages',label:'Pages',icon:PanelsTopLeft,group:'Contenu',show:has('content:edit')||has('content:review'),badge:review.length,desc:'Rédigez, relisez et publiez les pages de la salle, bloc par bloc.'},
  {key:'nda',label:'Accord de confidentialité',icon:FileSignature,group:'Contenu',show:has('access:manage'),desc:'NDA versionné : rédaction FR/EN, publication, suivi des acceptations.'},
  {key:'documents',label:'Documents',icon:FolderLock,group:'Contenu',show:has('content:edit')||has('content:review')||has('access:manage'),badge:docsPending.length,desc:'Bibliothèque privée des pièces PDF, contrôle et publication.'},
  {key:'access',label:'Accès & invitations',icon:KeyRound,group:'Investisseurs',show:has('investors:read')||has('access:manage'),badge:d.applicants.filter(a=>!a.grants.some(g=>!g.revokedAt)).length,desc:'Droits par investisseur, groupes et liens temporaires.'},
  {key:'crm',label:'CRM',icon:Contact2,group:'Investisseurs',show:has('crm:read')||has('crm:edit'),desc:'Pipeline, relances et notes internes (jamais visibles des investisseurs).'},
  {key:'qa',label:'Questions',icon:MessagesSquare,group:'Investisseurs',show:has('qa:read')||has('qa:reply'),badge:openQ.length,desc:'Questions privées des investisseurs et réponses d’ADC.'},
  {key:'emails',label:'Notifications e-mail',icon:Mails,group:'Pilotage',show:has('access:manage'),badge:(d.emails??[]).filter(e=>e.status==='failed').length,desc:'Journal des e-mails envoyés aux investisseurs et à l’équipe, avec statut réel.'},
  {key:'finance',label:'Finances',icon:Landmark,group:'Données',show:has('finance:edit')||has('finance:review'),desc:'Registre des indicateurs financiers, justificatifs et validation.'},
  {key:'analytics',label:'Statistiques',icon:BarChart3,group:'Données',show:has('analytics:read'),desc:'Engagement consenti par salle, rubrique et document.'},
  {key:'technical',label:'Rapports techniques',icon:GitBranch,group:'Données',show:has('technical:read'),desc:'Rapports GitHub en lecture seule, à publier via le CMS.'},
 ].filter(v=>v.show)
 const current=views.find(v=>v.key===view)??views[0],go=(k:string)=>{setView(k);setMenu(false);try{window.history.replaceState(null,'',location.pathname+location.search+'#'+k)}catch{/* ignore */};document.querySelector('.adm-main')?.scrollTo({top:0})}
 const groups=[...new Set(views.map(v=>v.group))]
 const todo=[
  ...review.map(s=>({icon:FileClock,text:'Page à relire : '+(s.latest?.titleFr??s.slug),hint:s.latest?.own?'Rédigée par vous : un autre administrateur doit valider':'En attente de votre validation',view:'pages',tone:'blue'})),
  ...(d.room.status!=='published'&&has('content:review')?[{icon:Globe2,text:'La salle n’est pas publiée',hint:'Aucun investisseur ne la voit pour l’instant',view:'access',tone:'amber'}]:[]),
  ...d.applicants.filter(a=>!a.grants.some(g=>!g.revokedAt)).map(a=>({icon:UserPlus,text:'Demande d’accès : '+a.name,hint:a.organization||a.email,view:'access',tone:'amber'})),
  ...openQ.map(q=>({icon:MessagesSquare,text:'Question : '+q.subject,hint:'Réponse attendue',view:'qa',tone:'green'})),
  ...docsPending.map(x=>({icon:FileText,text:'Document en attente : '+x.titleFr,hint:({clean:'Vérifié, prêt à publier',pending:'Vérification en attente',rejected:'Rejeté'} as Record<string,string>)[x.version?.scanStatus??'pending']??'Vérification en attente',view:'documents',tone:'blue'})),
 ]
 return <div className={'adm'+(menu?' menu-open':'')}>
  <aside className="adm-side">
   <div className="adm-brand"><img src="/adc-logo-mark.png" alt="African Digit Consulting"/><span>Administration</span></div>
   <div className="adm-room"><span className={'adm-dot '+(d.room.status==='published'?'live':'')}/>{identity.rooms.length>1?<select aria-label="Salle" value={roomId} onChange={e=>location.assign('/admin?roomId='+encodeURIComponent(e.target.value))}>{identity.rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>:<strong>{d.room.name}</strong>}<small>{d.room.status==='published'?'En ligne':'Non publiée'}</small></div>
   <nav aria-label="Administration">{groups.map(g=><div key={g} className="adm-group"><p>{g}</p>{views.filter(v=>v.group===g).map(v=><button key={v.key} className={'adm-nav'+(current.key===v.key?' is-active':'')} aria-current={current.key===v.key?'page':undefined} onClick={()=>go(v.key)}><v.icon size={18}/><span>{v.label}</span>{!!v.badge&&<em>{v.badge}</em>}</button>)}</div>)}</nav>
   <div className="adm-me"><span className="dr-avatar">{identity.name.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase()}</span><div><strong>{identity.name}</strong><small><ShieldCheck size={12}/>Session sécurisée (MFA)</small></div><button className="dr-icon" aria-label="Se déconnecter" title="Se déconnecter" onClick={async()=>{if(!await confirm({title:'Se déconnecter ?',description:'Vous devrez recevoir un nouveau lien et saisir votre code MFA pour revenir.',cancelLabel:'Annuler',confirmLabel:'Se déconnecter'}))return;try{const r=await authClient.signOut();if(r.error)throw Error();seq.current++;location.replace('/connexion?next=/admin')}catch{toast.error('Déconnexion impossible')}}}><LogOut size={17}/></button></div>
  </aside>
  <button className="adm-scrim" aria-label="Fermer le menu" tabIndex={menu?0:-1} onClick={()=>setMenu(false)}/>
  <main className="adm-main">
    {connectionWarning&&<div className="session-warning" role="status">Connexion temporairement perturbée. Votre session n’a pas été fermée. <button type="button" onClick={()=>{void reload().then(next=>{if(next){lastVerified.current=Date.now();setData(next);setConnectionWarning(false)}}).catch(()=>{})}}>Réessayer</button></div>}
   <header className="adm-top"><button className="dr-icon adm-burger" aria-label="Ouvrir le menu" onClick={()=>setMenu(true)}><Menu size={19}/></button>
    <div className="adm-title"><h1>{current.label}</h1><p>{current.desc}</p></div>
    <div className="adm-actions">
     <Dialog open={palette} onOpenChange={setPalette}><DialogTrigger shortcut="mod+k" className="adm-search"><Search size={16}/><span>Rechercher…</span><DialogShortcut className="adm-kbd"/></DialogTrigger><DialogBackdrop className="adm-backdrop"/><DialogContent className="adm-palette"><DialogTitle className="sr-only">Aller à…</DialogTitle>
      <Command onAction={(value)=>{setPalette(false);const [kind,id]=String(value).split(':');if(kind==='view')go(id);else if(kind==='page'){go('pages')}else if(kind==='open')window.open(id,'_blank')}}>
       <div className="adm-palette-input"><Search size={18}/><CommandInput aria-label="Rechercher" placeholder="Aller à une section, une page…"/></div><CommandEmpty className="adm-palette-empty">Aucun résultat.</CommandEmpty>
       <CommandList className="adm-palette-list"><CommandGroup><CommandGroupLabel>Sections</CommandGroupLabel>{views.map(v=><CommandItem key={v.key} value={'view:'+v.key}><CommandItemIcon><v.icon size={16}/></CommandItemIcon>{v.label}</CommandItem>)}</CommandGroup>
        {d.sections.length>0&&<CommandGroup><CommandGroupLabel>Pages</CommandGroupLabel>{d.sections.map(s=><CommandItem key={s.id} value={'page:'+s.id}><CommandItemIcon><FileText size={16}/></CommandItemIcon>{s.latest?.titleFr??s.slug}</CommandItem>)}</CommandGroup>}
        <CommandGroup><CommandGroupLabel>Raccourcis</CommandGroupLabel><CommandItem value={'open:/investor?roomId='+roomId}><CommandItemIcon><Eye size={16}/></CommandItemIcon>Voir la salle comme un investisseur</CommandItem></CommandGroup></CommandList></Command></DialogContent></Dialog>
     <a className="dr-btn ghost adm-preview" href={'/investor?roomId='+encodeURIComponent(roomId)} target="_blank" rel="noopener"><Eye size={16}/><span>Voir comme investisseur</span></a>
    </div></header>
   <div className={'adm-body view-'+current.key} key={current.key}>
    {current.key==='dashboard'&&<div className="adm-dash">
     <section className={'adm-hero '+(d.room.status==='published'?'live':'')}><div className="dr-hero-glow" aria-hidden="true"/><div><p className="journey-kicker">{d.room.name}</p><h2>Bonjour {identity.name.split(' ')[0]}.</h2><p>{d.room.status==='published'?'La salle est en ligne. Les investisseurs autorisés voient les pages publiées.':'La salle n’est pas encore publiée : préparez les pages et les accès, puis mettez-la en ligne.'}</p></div>
      <div className="adm-hero-cta">{has('content:review')&&<button className={'dr-btn'+(d.room.status==='published'?' ghost light':'')} disabled={busy} onClick={async()=>{if(await confirm({title:d.room.status==='published'?'Dépublier la salle ?':'Publier la salle ?',description:d.room.status==='published'?'Plus aucun investisseur ne pourra la consulter jusqu’à nouvelle publication.':'Les investisseurs disposant d’un accès verront immédiatement les pages publiées.',cancelLabel:'Annuler',confirmLabel:d.room.status==='published'?'Dépublier':'Publier'}))void run({kind:'roomStatus',roomId,status:d.room.status==='published'?'draft':'published'})}}><Globe2 size={16}/>{d.room.status==='published'?'Dépublier':'Publier la salle'}</button>}<a className="dr-btn ghost light" href={'/investor?roomId='+encodeURIComponent(roomId)} target="_blank" rel="noopener"><Eye size={16}/>Aperçu</a></div></section>
     <div className="adm-kpis">{[
      {label:'Pages publiées',value:published.length+' / '+d.sections.length,icon:PanelsTopLeft,view:'pages'},
      {label:'En relecture',value:review.length,icon:FileClock,view:'pages'},
      {label:'Investisseurs',value:d.applicants.length,icon:Users,view:'access'},
      {label:'Droits actifs',value:activeGrants,icon:ShieldCheck,view:'access'},
      {label:'Liens actifs',value:activeLinks.length,icon:Link2,view:'access'},
      {label:'Questions ouvertes',value:openQ.length,icon:MessagesSquare,view:'qa'},
     ].filter(k=>views.some(v=>v.key===k.view)).map(k=><button key={k.label} className="adm-kpi" onClick={()=>go(k.view)}><k.icon size={18}/><strong>{k.value}</strong><span>{k.label}</span></button>)}</div>
     <div className="adm-cols">
      <section className="adm-card"><h3>À traiter {todo.length>0&&<em className="adm-pill">{todo.length}</em>}</h3>{todo.length?<ul className="adm-todo">{todo.slice(0,12).map((t,i)=><li key={i}><button onClick={()=>go(t.view)}><span className={'adm-ico '+t.tone}><t.icon size={16}/></span><span><b>{t.text}</b><small>{t.hint}</small></span><ChevronRight size={16}/></button></li>)}</ul>:<div className="adm-zero"><CheckCircle2 size={26}/><p>Tout est à jour.</p></div>}</section>
      <section className="adm-card"><h3>Actions rapides</h3><div className="adm-quick">
       {has('content:edit')&&<button onClick={()=>go('pages')}><PenLine size={18}/><span><b>Rédiger une page</b><small>Éditeur par blocs</small></span></button>}
       {has('access:manage')&&<button onClick={()=>go('access')}><Link2 size={18}/><span><b>Inviter un investisseur</b><small>Lien temporaire sécurisé</small></span></button>}
       {has('access:manage')&&<button onClick={()=>go('access')}><KeyRound size={18}/><span><b>Gérer les droits</b><small>Consulter, télécharger, périodes</small></span></button>}
       {(has('content:edit')||has('content:review'))&&<button onClick={()=>go('documents')}><FolderLock size={18}/><span><b>Documents</b><small>Bibliothèque privée</small></span></button>}
      </div></section>
     </div></div>}
    {current.key==='team'&&<TeamPanel roomId={roomId} members={d.team?.members??[]} invites={d.team?.invites??[]} myCaps={d.capabilities} busy={busy} run={run}/>}
    {current.key==='emails'&&<EmailLog roomId={roomId} rows={d.emails??[]} busy={busy} run={run}/>}
    {current.key==='nda'&&<NdaPanel roomId={roomId} nda={d.nda??null} canPublish={has('content:review')} busy={busy} run={run}/>}
    {current.key==='pages'&&<PageEditor images={d.images} uploadImage={uploadImage} roomId={roomId} sections={d.sections} documents={d.documents} canEdit={has('content:edit')} canReview={has('content:review')} busy={busy} run={run}/>}
    {current.key==='access'&&<AccessManager reload={async()=>{const token=++seq.current;const next=await reload();if(token===seq.current)setData(next)}} roomId={roomId} roomStatus={d.room.status} canPublishRoom={has('content:review')} applicants={d.applicants} sections={d.sections.map(s=>({id:s.id,title:s.latest?.titleFr??s.slug}))} documents={d.documents.map(x=>({id:x.id,title:x.titleFr}))} groups={d.access?.groups??[]} links={d.access?.links??[]} busy={busy} run={run} createLink={createLink}/>}
    {current.key==='finance'&&<div className="adm-legacy"><FinanceEditor roomId={roomId} sections={d.sections} documents={d.documents} metrics={d.metrics} canEdit={has('finance:edit')} canReview={has('finance:review')} busy={busy} run={run}/></div>}
    {current.key==='crm'&&<div className="adm-legacy"><CrmBoard roomId={roomId} contacts={d.contacts} canEdit={has('crm:edit')} busy={busy} run={run} history={history}/></div>}
    {current.key==='qa'&&<div className="adm-legacy"><Questions items={d.questions} admin canReply={has('qa:reply')} read={questionRead} send={async a=>{if(a.kind==='ask')return {ok:false};const result=await command(a.kind==='reply'?{kind:'qaReply',roomId,questionId:a.questionId,body:a.body}:{kind:'qaClose',roomId,questionId:a.questionId});if(result.ok){const token=++seq.current;const next=await reload();if(token===seq.current)setData(next)}return result}}/></div>}
    {current.key==='analytics'&&<div className="adm-legacy"><AnalyticsPanel data={d.analytics}/></div>}
    {current.key==='technical'&&<div className="adm-legacy"><TechnicalPanel targets={d.technicalTargets} canDraft={has('content:edit')} request={technical}/></div>}
    {current.key==='documents'&&<DocumentsPanel roomId={roomId} documents={d.documents} canEdit={has('content:edit')} canReview={has('content:review')} uploadEnabled={d.uploadEnabled} manualScan={!!d.manualScan} reviewUrl={reviewUrl} busy={busy} run={run} goAccess={()=>go('access')} onUploaded={async()=>{const token=++seq.current;const next=await reload();if(token===seq.current)setData(next);if(!next)throw Error('Refresh failed')}}/>}
   </div>
  </main>
  <ToastRegion className="adm-toasts">{()=><Toast className="adm-toast"><div><ToastTitle className="adm-toast-title"/><ToastDescription className="adm-toast-desc"/></div></Toast>}</ToastRegion>
  <OverlayHost/>
 </div>
}
