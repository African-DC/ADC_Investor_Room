import { FileText,ShieldCheck,ShieldQuestion,ShieldX,UploadCloud,KeyRound,Globe2,Archive } from 'lucide-react'
import { confirm } from '@ui-sdk/react/alert-dialog'
import { DocumentUpload } from './DocumentUpload'
import type { AdminCommand } from './contracts'
type Doc={id:string;titleFr:string;titleEn:string;category:string;status:string;version:{id:string;number:number;scanStatus:string;sizeBytes:number;own:boolean}|null}
const cat:Record<string,string>={company:'Entreprise',products:'Produits',investment:'Investissement',finance:'Finances',traction:'Traction',team:'Équipe',technology:'Technologie',legal:'Juridique',compliance:'Conformité',other:'Autre'}
const status:Record<string,[string,string]>={draft:['Brouillon','b-scheduled'],published:['Publié','b-active'],archived:['Archivé','b-expired']}
const scan:Record<string,[string,string,typeof ShieldCheck]>={clean:['Analyse antivirus : sain','ok',ShieldCheck],pending:['Analyse antivirus en attente','wait',ShieldQuestion],rejected:['Rejeté par l’analyse','bad',ShieldX]}
const size=(n:number)=>n>=1048576?(n/1048576).toLocaleString('fr',{maximumFractionDigits:1})+' Mo':Math.ceil(n/1024)+' Ko'
export function DocumentsPanel({roomId,documents,canEdit,canReview,uploadEnabled,busy,run,onUploaded,goAccess}:{roomId:string;documents:Doc[];canEdit:boolean;canReview:boolean;uploadEnabled:boolean;busy:boolean;run:(c:AdminCommand)=>Promise<void>;onUploaded:()=>Promise<void>;goAccess:()=>void}){
 const act=async(doc:Doc,action:'publish'|'archive')=>{if(await confirm({title:action==='publish'?'Publier « '+doc.titleFr+' » ?':'Archiver « '+doc.titleFr+' » ?',description:action==='publish'?'Le document devient consultable par les investisseurs qui en ont le droit.':'Le document et les indicateurs qui en dépendent ne seront plus visibles.',cancelLabel:'Annuler',confirmLabel:action==='publish'?'Publier':'Archiver'}))await run({kind:'documentTransition',roomId,documentId:doc.id,action})}
 return <div className="dp">
  <section className="adm-card"><div className="dp-head"><h3><FileText size={18}/>Bibliothèque ({documents.length})</h3><button className="dr-btn ghost" onClick={goAccess}><KeyRound size={15}/>Gérer les droits</button></div>
   {documents.length?<ul className="dp-list">{documents.map(doc=>{const st=status[doc.status]??[doc.status,''],sc=scan[doc.version?.scanStatus??'pending']??scan.pending;return <li key={doc.id}>
    <span className="dr-doc-icon" aria-hidden="true"><FileText size={20}/><small>PDF</small></span>
    <div className="dp-main"><strong>{doc.titleFr}</strong><span>{cat[doc.category]??doc.category}{doc.version&&<> · version {doc.version.number} · {size(doc.version.sizeBytes)}</>}</span><span className={'dp-scan '+sc[1]}><ScanIcon Icon={sc[2]}/>{sc[0]}</span></div>
    <span className={'am-badge '+st[1]}>{st[0]}</span>
    <div className="dp-actions">{canReview&&doc.status==='draft'&&doc.version?.scanStatus==='clean'&&!doc.version.own&&<button className="dr-btn" disabled={busy} onClick={()=>void act(doc,'publish')}><Globe2 size={15}/>Publier</button>}
     {canReview&&doc.status==='draft'&&doc.version?.own&&<small className="dp-hint">Un autre administrateur doit publier</small>}
     {canReview&&doc.status==='published'&&<button className="dr-btn ghost danger" disabled={busy} onClick={()=>void act(doc,'archive')}><Archive size={15}/>Archiver</button>}</div>
   </li>})}</ul>:<div className="adm-zero"><FileText size={26}/><p>Aucun document pour l’instant.</p></div>}
   <p className="am-help">Chaque PDF est vérifié (format, taille, empreinte SHA-256) puis doit passer une analyse antivirus avant publication. La publication exige un second administrateur. Les investisseurs ne reçoivent jamais d’URL de stockage : chaque consultation passe par un ticket à usage unique.</p></section>
  {canEdit&&<section className="adm-card"><h3><UploadCloud size={18}/>Ajouter un document</h3>{uploadEnabled?<DocumentUpload roomId={roomId} onUploaded={onUploaded}/>:<p className="am-help">Le téléversement est désactivé sur cet environnement tant que l’analyse antivirus n’est pas raccordée.</p>}</section>}
 </div>
}
function ScanIcon({Icon}:{Icon:typeof ShieldCheck}){return <Icon size={13}/>}
