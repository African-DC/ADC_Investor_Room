import {useState} from 'react'
import {FolderLock,Plus,Globe2,Archive,Settings2,ChevronRight} from 'lucide-react'
import {confirm} from '@ui-sdk/react/alert-dialog'
import type {AdminCommand} from './contracts'
type Room={id:string;name:string;description?:string;status:string}
const statusLabel=(s?:string)=>s==='published'?'Publiée':s==='archived'?'Archivée':'Brouillon'
export function RoomSettings({room,rooms,canManage,canReview,busy,run,go,available}:{room:Room;rooms:{id:string;name:string;status?:string}[];canManage:boolean;canReview:boolean;busy:boolean;run:(c:AdminCommand,onSuccess?:()=>void)=>Promise<void>;go:(v:string)=>void;available:string[]}){
 const [name,setName]=useState(room.name),[description,setDescription]=useState(room.description??''),[newName,setNewName]=useState(''),[newDescription,setNewDescription]=useState('')
 const canCreate=canManage&&canReview&&room.status!=='archived'
 async function change(status:'draft'|'published'|'archived'){
  const archived=room.status==='archived'
  const title=status==='archived'?'Archiver cette salle ?':archived?'Restaurer en brouillon ?':status==='published'?'Publier cette salle ?':'Dépublier cette salle ?'
  const description=status==='published'?'Les investisseurs déjà autorisés retrouveront les ressources publiées.':status==='archived'?'La consultation investisseur sera bloquée. Les documents, droits et historiques seront conservés.':archived?'La salle restera privée. Vérifiez les anciens droits avant de la republier.':'L’accès investisseur sera suspendu jusqu’à la prochaine publication.'
  if(await confirm({title,description,cancelLabel:'Annuler',confirmLabel:'Confirmer'}))void run({kind:'roomStatus',roomId:room.id,status})
 }
 return <div className="room-settings">
  <section className="am-card"><h3><FolderLock size={20}/>Mes salles ({rooms.length})</h3><p className="am-help">Chaque espace possède ses propres pages, documents, investisseurs, membres et droits.</p>
   <div className="rs-list">{rooms.map(r=><a key={r.id} aria-current={r.id===room.id?'page':undefined} className={'rs-item'+(r.id===room.id?' selected':'')} href={r.id===room.id?'#settings':'/admin?roomId='+encodeURIComponent(r.id)+'#settings'}><FolderLock size={18}/><span><b>{r.name}</b><small>{statusLabel(r.status??(r.id===room.id?room.status:undefined))}</small></span><ChevronRight size={16}/></a>)}</div>
  </section>
  <section className="am-card"><h3><Settings2 size={20}/>Configuration de la salle</h3><p className="am-help">Modifiez le nom sans changer les liens existants. La description est une note interne.</p>
   <form className="rs-form" onSubmit={e=>{e.preventDefault();void run({kind:'roomUpdate',roomId:room.id,name:name.trim(),description:description.trim()})}}>
    <label>Nom de la salle<input className="am-search" value={name} onChange={e=>setName(e.target.value)} maxLength={160} required disabled={!canManage||busy}/></label>
    <label>Description interne<textarea rows={3} className="am-search" value={description} onChange={e=>setDescription(e.target.value)} maxLength={1000} disabled={!canManage||busy}/></label>
    <button className="dr-btn" disabled={!canManage||busy||!name.trim()||(name.trim()===room.name&&description.trim()===(room.description??''))}>Enregistrer les paramètres</button>
   </form>
   <div className="rs-lifecycle"><b>Statut : {statusLabel(room.status)}</b><div className="am-row">{canReview&&room.status!=='archived'&&<button className="dr-btn ghost" disabled={busy} onClick={()=>void change(room.status==='published'?'draft':'published')}><Globe2 size={16}/>{room.status==='published'?'Dépublier':'Publier'}</button>}{canReview&&canManage&&<button className="dr-btn ghost" disabled={busy} onClick={()=>void change(room.status==='archived'?'draft':'archived')}><Archive size={16}/>{room.status==='archived'?'Restaurer':'Archiver'}</button>}</div></div>
  </section>
  <section className="am-card"><h3><Plus size={20}/>Nouvelle salle</h3><p className="am-help">La nouvelle salle est vide et non publiée. Seul le créateur reçoit ses propres droits administratifs actuels ; aucun investisseur, document ou membre n’est copié.</p>
   <form className="rs-form" onSubmit={e=>{e.preventDefault();if(canCreate&&newName.trim())void run({kind:'roomCreate',roomId:room.id,name:newName.trim(),description:newDescription.trim()})}}>
    <label>Nom de la nouvelle salle<input className="am-search" placeholder="Ex. KLASSCI — Levée de fonds" value={newName} onChange={e=>setNewName(e.target.value)} maxLength={160} required disabled={!canCreate||busy}/></label>
    <label>Description interne<textarea rows={3} className="am-search" value={newDescription} onChange={e=>setNewDescription(e.target.value)} maxLength={1000} disabled={!canCreate||busy}/></label>
    {!canCreate&&<p className="am-help">La création exige les droits de gestion des accès et de validation depuis une salle active.</p>}
    <button className="dr-btn" disabled={!canCreate||busy||!newName.trim()}><Plus size={16}/>Créer une salle</button>
   </form>
  </section>
  <section className="am-card"><h3>Paramétrage complet de cet espace</h3><div className="rs-list">{[['pages','Pages et contenu'],['documents','Documents'],['team','Équipe et rôles'],['access','Droits investisseurs et invitations'],['nda','Accord de confidentialité'],['emails','Notifications'],['finance','Finances'],['crm','CRM'],['qa','Questions'],['analytics','Statistiques'],['technical','Rapports techniques']].filter(([id])=>available.includes(id)).map(([id,label])=><button key={id} className="rs-item" onClick={()=>go(id)}><span>{label}</span><ChevronRight size={16}/></button>)}</div></section>
 </div>
}
