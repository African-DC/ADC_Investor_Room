import { createFileRoute } from '@tanstack/react-router'
import { useEffect,useRef,useState } from 'react'
import { ArrowLeft, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react'
import { verifiedLink } from '../features/access/confirm'
import { JourneyFrame } from '../features/onboarding/JourneyFrame'
import type { Lang } from '../features/onboarding/JourneyFrame'
export const Route=createFileRoute('/confirm')({component:Confirm,head:()=>({meta:[{name:'referrer',content:'no-referrer'},{title:'Confirmer l’accès · ADC Investor Room'}]})})
const copy={
 fr:{kicker:'VOTRE ACCÈS',adminKicker:'ÉQUIPE ADC · ACCÈS RÉSERVÉ',adminBody:'Pour votre sécurité, confirmez que c’est bien vous qui demandez l’accès à l’administration de la Data Room d’African Digit Consulting. Une vérification en deux étapes suivra.',title:'Une dernière étape.',body:'Pour votre sécurité, confirmez que c’est bien vous qui demandez l’accès à l’espace investisseur d’African Digit Consulting.',cta:'Confirmer mon accès',going:'Ouverture sécurisée…',why:'Ce bouton protège votre lien contre les vérifications automatiques des messageries.',badTitle:'Lien invalide ou expiré.',badBody:'Il a peut-être expiré (15 minutes) ou a déjà été utilisé. Demandez un nouveau lien depuis l’accueil.',again:'Demander un nouveau lien',back:'Retour à l’accueil'},
 en:{kicker:'YOUR ACCESS',adminKicker:'ADC TEAM · RESTRICTED ACCESS',adminBody:'For your security, confirm that you are the one requesting access to the African Digit Consulting data room administration. Two-step verification will follow.',title:'One last step.',body:'For your security, confirm that you are the one requesting access to the African Digit Consulting investor space.',cta:'Confirm my access',going:'Opening securely…',why:'This button protects your link from automated mailbox scanners.',badTitle:'Invalid or expired link.',badBody:'It may have expired (15 minutes) or already been used. Request a new link from the welcome page.',again:'Request a new link',back:'Back to welcome'}
} as const
function Confirm(){
 const read=useRef(false)
 const [link,setLink]=useState<string|null>(null),[ready,setReady]=useState(false),[going,setGoing]=useState(false),[lang,setLang]=useState<Lang>('fr')
 useEffect(()=>{
  if(read.current)return
  read.current=true
  try{const raw=new URLSearchParams(location.hash.slice(1)).get('next');setLink(raw?verifiedLink(raw,location.origin):null)}finally{history.replaceState(null,'',location.pathname);setReady(true)}
 },[])
 const t=copy[lang]
 const isAdmin=!!link&&new URL(link,'https://x.invalid').searchParams.get('callbackURL')==='/admin',space=isAdmin?'admin' as const:link?'investor' as const:'neutral' as const
 if(!ready)return <JourneyFrame space="neutral" lang={lang} setLang={setLang}><div className="frame-loading" aria-busy="true"/></JourneyFrame>
 return <JourneyFrame space={space} lang={lang} setLang={setLang} tone={link?'default':'alert'}>
  {link?<>
   <div className="frame-emblem"><ShieldCheck size={30} aria-hidden="true"/></div>
   <p className="journey-kicker">{isAdmin?t.adminKicker:t.kicker}</p><h1>{t.title}</h1><p className="frame-lead">{isAdmin?t.adminBody:t.body}</p>
   <button className="primary journey-primary" disabled={going} onClick={()=>{setGoing(true);location.assign(link)}}>{going?t.going:t.cta}<ArrowRight size={19}/></button>
   <p className="frame-note">{t.why}</p>
  </>:<>
   <div className="frame-emblem is-alert"><ShieldAlert size={30} aria-hidden="true"/></div>
   <h1 role="alert">{t.badTitle}</h1><p className="frame-lead">{t.badBody}</p>
   <a className="primary journey-primary" href="/">{t.again}<ArrowRight size={19}/></a>
  </>}
  <a className="secondary journey-link frame-back" href="/"><ArrowLeft size={15}/>{t.back}</a>
 </JourneyFrame>
}
