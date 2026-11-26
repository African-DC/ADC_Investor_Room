import { useEffect,useState } from 'react'
import { FileSignature,History,UserCheck,UserX,ShieldOff } from 'lucide-react'
import { confirm } from '@ui-sdk/react/alert-dialog'
import type { AdminCommand } from './contracts'
export type NdaState={current:{version:string;textFr:string;textEn:string}|null;history:{version:string;publishedAt:number;retiredAt:number|null}[];people:{name:string;email:string;organization:string;acceptedCurrentAt:number|null;lastVersion:string|null;lastAt:number|null}[]}
const fmt=(n:number)=>new Intl.DateTimeFormat('fr',{dateStyle:'medium',timeStyle:'short'}).format(n)
export function NdaPanel({roomId,nda,canPublish,busy,run}:{roomId:string;nda:NdaState|null;canPublish:boolean;busy:boolean;run:(c:AdminCommand)=>Promise<void>}){
 const [fr,setFr]=useState(nda?.current?.textFr??''),[en,setEn]=useState(nda?.current?.textEn??''),[lang,setLang]=useState<'fr'|'en'>('fr')
 useEffect(()=>{setFr(nda?.current?.textFr??'');setEn(nda?.current?.textEn??'')},[nda?.current?.version])
 const changed=fr.trim()!==(nda?.current?.textFr??'').trim()||en.trim()!==(nda?.current?.textEn??'').trim()
 const accepted=(nda?.people??[]).filter(p=>p.acceptedCurrentAt).length,total=nda?.people.length??0
 return <div className="dp">
  <section className={'am-room '+(nda?.current?'is-live':'')}><span className="am-room-icon"><FileSignature size={22}/></span><div><strong>{nda?.current?'NDA en vigueur : '+nda.current.version:'Aucun NDA exigé'}</strong><p>{nda?.current?`${accepted} investisseur${accepted>1?'s':''} sur ${total} ont accepté cette version. Les autres le verront à leur prochaine visite, avant tout contenu.`:'Les investisseurs accèdent au contenu sans accord de confidentialité préalable.'}</p></div>{canPublish&&nda?.current&&<button className="dr-btn ghost danger" disabled={busy} onClick={async()=>{if(await confirm({title:'Ne plus exiger de NDA ?',description:'Les investisseurs autorisés accéderont au contenu sans accepter d’accord. Les acceptations passées restent dans l’historique.',cancelLabel:'Annuler',confirmLabel:'Retirer le NDA'}))void run({kind:'ndaRemove',roomId})}}><ShieldOff size={15}/>Retirer</button>}</section>
  <div className="am-grid wide">
   <section className="am-card"><h3><FileSignature size={18}/>{nda?.current?'Nouvelle version de l’accord':'Rédiger l’accord'}</h3>
    <div className="pe-seg" role="group" aria-label="Langue"><button aria-pressed={lang==='fr'} onClick={()=>setLang('fr')}>Français</button><button aria-pressed={lang==='en'} onClick={()=>setLang('en')}>English</button></div>
    <textarea className="nda-edit" value={lang==='fr'?fr:en} onChange={e=>(lang==='fr'?setFr:setEn)(e.target.value)} placeholder={lang==='fr'?'Texte de l’accord de confidentialité (version française, fait foi)…':'Confidentiality agreement (English version)…'} rows={16} disabled={!canPublish}/>
    <p className="am-help">{(lang==='fr'?fr:en).length.toLocaleString('fr')} caractères. Les deux langues sont obligatoires. Publier crée une version horodatée : <b>tous les investisseurs devront l’accepter à nouveau</b> avant de revoir le contenu.</p>
    {canPublish?<button className="dr-btn" disabled={busy||!changed||!fr.trim()||!en.trim()} onClick={async()=>{if(await confirm({title:'Publier cette version du NDA ?',description:'Elle remplace la version en vigueur. Chaque investisseur devra l’accepter avant d’accéder de nouveau au contenu.',cancelLabel:'Annuler',confirmLabel:'Publier'}))void run({kind:'ndaPublish',roomId,textFr:fr,textEn:en})}}><FileSignature size={15}/>Publier la nouvelle version</button>:<p className="am-help">Seul un administrateur relecteur peut publier le NDA.</p>}
   </section>
   <section className="am-card"><h3><UserCheck size={18}/>Acceptations</h3>
    {total?<table className="am-table"><thead><tr><th>Investisseur</th><th>Version en vigueur</th><th>Dernière acceptation</th></tr></thead><tbody>{nda!.people.map(p=><tr key={p.email}><td><b>{p.name}</b><small>{p.organization||p.email}</small></td><td>{nda!.current?(p.acceptedCurrentAt?<span className="am-badge b-active"><UserCheck size={12}/> Acceptée</span>:<span className="am-badge b-scheduled"><UserX size={12}/> En attente</span>):'—'}</td><td>{p.lastAt?<>{p.lastVersion}<small>{fmt(p.lastAt)}</small></>:'Jamais'}</td></tr>)}</tbody></table>:<p className="am-help">Aucun investisseur rattaché à cette salle pour l’instant.</p>}
    <h3 className="tm-sub"><History size={16}/>Historique des versions</h3>
    {nda?.history.length?<ul className="nda-hist">{nda.history.map(h=><li key={h.version}><b>{h.version}</b><span>publiée le {fmt(h.publishedAt)}{h.retiredAt?' · remplacée le '+fmt(h.retiredAt):' · en vigueur'}</span></li>)}</ul>:<p className="am-help">Aucune version publiée.</p>}
   </section>
  </div>
 </div>
}
