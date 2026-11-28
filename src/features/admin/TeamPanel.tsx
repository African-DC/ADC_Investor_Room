import { useState } from 'react'
import { UserPlus,ShieldCheck,Trash2,Mail,Clock } from 'lucide-react'
import { confirm } from '@ui-sdk/react/alert-dialog'
import type { AdminCommand } from './contracts'
type Member={id:string;name:string;email:string;capabilities:string[];revoked:boolean;self:boolean}
export type Invite={id:string;email:string;capabilities:string[];createdAt:number;expiresAt:number;status:string}
export const CAP_LABELS:Record<string,[string,string]>={'content:edit':['Rédiger les pages','Contenu'],'content:review':['Valider et publier','Contenu'],'access:manage':['Gérer accès et équipe','Accès'],'investors:read':['Voir les investisseurs','Accès'],'crm:read':['Consulter le CRM','CRM'],'crm:edit':['Modifier le CRM','CRM'],'qa:read':['Lire les questions','Questions'],'qa:reply':['Répondre aux questions','Questions'],'finance:edit':['Saisir les indicateurs','Finances'],'finance:review':['Valider les indicateurs','Finances'],'analytics:read':['Statistiques','Données'],'technical:read':['Rapports techniques','Données']}
const PRESETS:{label:string;caps:string[]}[]=[{label:'Rédacteur',caps:['content:edit','investors:read','qa:read','crm:read']},{label:'Relecteur',caps:['content:review','investors:read','qa:read','qa:reply','finance:review']},{label:'Administrateur complet',caps:Object.keys(CAP_LABELS)}]
const statusLabel:Record<string,[string,string]>={pending:['En attente','b-scheduled'],accepted:['Acceptée','b-active'],expired:['Expirée','b-expired'],revoked:['Révoquée','b-expired']}
const fmt=(n:number)=>new Intl.DateTimeFormat('fr',{dateStyle:'medium'}).format(n)
export function TeamPanel({roomId,members,invites,myCaps,busy,run}:{roomId:string;members:Member[];invites:Invite[];myCaps:string[];busy:boolean;run:(c:AdminCommand,onSuccess?:()=>void)=>Promise<void>}){
 const [email,setEmail]=useState(''),[caps,setCaps]=useState<string[]>(()=>PRESETS[0].caps.filter(c=>myCaps.includes(c))),[edit,setEdit]=useState<string|null>(null),[editCaps,setEditCaps]=useState<string[]>([])
 const Caps=({value,onChange}:{value:string[];onChange:(v:string[])=>void})=><div className="tm-caps">{Object.entries(CAP_LABELS).map(([k,[label,group]])=><label key={k} className={'am-target'+(value.includes(k)?' is-on':'')+(myCaps.includes(k)?'':' tm-off')} title={myCaps.includes(k)?undefined:'Vous ne pouvez pas déléguer un droit que vous n’avez pas'}><input type="checkbox" disabled={!myCaps.includes(k)} checked={value.includes(k)} onChange={()=>onChange(value.includes(k)?value.filter(x=>x!==k):[...value,k])}/><span>{label}</span><small>{group}</small></label>)}</div>
 const valid=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())&&caps.length>0&&caps.every(c=>myCaps.includes(c))
 return <div className="am-grid wide">
  <section className="am-card"><h3><UserPlus size={18}/>Inviter un administrateur</h3>
   <label className="tm-field">Adresse e-mail<input className="am-search" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nom@entreprise.com" autoComplete="email"/></label>
   <div className="am-chips">{PRESETS.map(p=><button key={p.label} type="button" onClick={()=>setCaps(p.caps.filter(c=>myCaps.includes(c)))}>{p.label}</button>)}</div>
   <Caps value={caps} onChange={setCaps}/>
   <button className="dr-btn" disabled={busy||!valid} onClick={()=>void run({kind:'teamInvite',roomId,email:email.trim(),capabilities:caps},()=>setEmail(''))}><Mail size={15}/>Créer l’invitation</button>
   <p className="am-help">Les liens de partage investisseurs sont dans Accès &amp; invitations → Liens, et non dans cette liste.</p><p className="am-help">L’invitation est valable 14 jours et ne fonctionne que pour cette adresse, une fois vérifiée par lien de connexion. La personne devra ensuite activer sa double authentification. Pour publier, il faut toujours deux administrateurs différents.</p></section>
  <section className="am-card"><h3><ShieldCheck size={18}/>Équipe ({members.filter(m=>!m.revoked).length})</h3>
   <ul className="tm-list">{members.map(m=><li key={m.id} className={m.revoked?'is-revoked':''}><span className="dr-avatar sm">{m.name.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase()}</span><div><strong>{m.name}{m.self&&<em> (vous)</em>}</strong><small>{m.email}</small>
     {edit===m.id?<><Caps value={editCaps} onChange={setEditCaps}/><div className="am-row"><button className="dr-btn" disabled={busy||!editCaps.length||editCaps.some(c=>!myCaps.includes(c))} onClick={()=>void run({kind:'teamSetCaps',roomId,membershipId:m.id,capabilities:editCaps},()=>setEdit(null))}>Enregistrer</button><button className="dr-btn ghost" onClick={()=>setEdit(null)}>Annuler</button></div></>
     :<div className="tm-tags">{m.revoked?<span className="am-badge b-revoked">Révoqué</span>:m.capabilities.map(c=><span key={c} className="tm-tag">{CAP_LABELS[c]?.[0]??c}</span>)}</div>}</div>
    {!m.self&&!m.revoked&&edit!==m.id&&<div className="tm-actions"><button className="dr-btn ghost" onClick={()=>{setEdit(m.id);setEditCaps(m.capabilities)}}>Modifier</button><button className="be-x" aria-label={'Révoquer '+m.name} disabled={busy} onClick={async()=>{if(await confirm({title:'Révoquer '+m.name+' ?',description:'Ses accès d’administration et ses sessions MFA sont retirés immédiatement.',cancelLabel:'Annuler',confirmLabel:'Révoquer'}))void run({kind:'teamRevoke',roomId,membershipId:m.id})}}><Trash2 size={15}/></button></div>}
   </li>)}</ul>
   <h3 className="tm-sub"><Clock size={16}/>Invitations ({invites.length})</h3>{invites.length>0?<table className="am-table"><tbody>{invites.map(i=><tr key={i.id}><td><b>{i.email}</b><small>créée le {fmt(i.createdAt)} · expire le {fmt(i.expiresAt)}</small></td><td><span className={'am-badge '+(statusLabel[i.status]?.[1]??'')}>{statusLabel[i.status]?.[0]??i.status}</span></td><td>{i.status==='pending'&&<button className="be-x" aria-label="Annuler l’invitation" disabled={busy} onClick={()=>void run({kind:'teamRevokeInvite',roomId,inviteId:i.id})}><Trash2 size={14}/></button>}</td></tr>)}</tbody></table>:<p className="am-help">Aucune invitation administrative enregistrée.</p>}
  </section>
 </div>
}
