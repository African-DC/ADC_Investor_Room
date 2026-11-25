import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader,setResponseHeaders } from '@tanstack/react-start/server'
import { useEffect,useRef,useState } from 'react'
import { z } from 'zod'
import { ArrowRight,KeyRound,ShieldAlert,BadgeCheck } from 'lucide-react'
import { getAuthBridge } from '../lib/auth-server'
import { api } from '../../convex/_generated/api'
import { JourneyFrame } from '../features/onboarding/JourneyFrame'
import type { Lang } from '../features/onboarding/JourneyFrame'
const headers=()=>({'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'})
const redeem=createServerFn({method:'POST'}).validator(z.object({token:z.string().regex(/^[A-Za-z0-9_-]{40,60}$/)})).handler(async({data})=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge(),origin=process.env.ADC_APP_ORIGIN
 if(!bridge||!origin||getRequestHeader('origin')!==origin)return {ok:false as const,reason:'unavailable'}
 try{return await bridge.fetchAuthMutation(api.access.redeem,{token:data.token})}catch{return {ok:false as const,reason:'signin'}}
})
export const Route=createFileRoute('/invite')({headers,head:()=>({meta:[{name:'referrer',content:'no-referrer'},{title:'Invitation · ADC Investor Room'}]}),component:Invite})
const KEY='adc-invite'
const msg:Record<string,[string,string]>={signin:['Vérifiez d’abord votre adresse e-mail.','Saisissez votre nom et votre adresse e-mail : vous recevrez un lien de connexion, puis votre invitation sera appliquée automatiquement.'],invalid:['Invitation invalide.','Ce lien n’existe pas ou a été désactivé par ADC.'],expired:['Invitation expirée.','La période de validité de ce lien est terminée. Contactez ADC pour en recevoir un nouveau.'],notyet:['Invitation pas encore active.','Ce lien sera utilisable à partir de la date prévue par ADC.'],full:['Invitation déjà utilisée.','Le nombre maximum d’utilisations de ce lien est atteint.'],email:['Invitation réservée à une autre adresse.','Connectez-vous avec l’adresse e-mail à laquelle ADC a adressé cette invitation.'],unavailable:['Service momentanément indisponible.','Réessayez dans quelques instants.']}
function Invite(){
 const [lang,setLang]=useState<Lang>('fr'),[state,setState]=useState<'loading'|'ok'|string>('loading'),done=useRef(false)
 useEffect(()=>{if(done.current)return;done.current=true
  let token=new URLSearchParams(location.hash.slice(1)).toString().replace(/=$/,'')||location.hash.slice(1)
  if(token)history.replaceState(null,'',location.pathname)
  try{if(token)localStorage.setItem(KEY,JSON.stringify({token,at:Date.now()}));else{const v=JSON.parse(localStorage.getItem(KEY)??'null');token=v&&Date.now()-v.at<86400000?v.token:''}}catch{/* storage optional */}
  if(!token){setState('invalid');return}
  void redeem({data:{token}}).then(r=>{if(r.ok){try{localStorage.removeItem(KEY)}catch{/* ignore */};setState('ok');setTimeout(()=>location.assign('/investor?roomId='+encodeURIComponent(r.roomId)),1400)}else setState(r.reason)}).catch(()=>setState('unavailable'))
 },[])
 if(state==='loading')return <JourneyFrame lang={lang} setLang={setLang}><div className="frame-loading" aria-busy="true"/><p className="frame-lead">Vérification de votre invitation…</p></JourneyFrame>
 if(state==='ok')return <JourneyFrame lang={lang} setLang={setLang} tone="success"><div className="frame-emblem is-success"><BadgeCheck size={30}/></div><p className="journey-kicker">INVITATION ACCEPTÉE</p><h1>Bienvenue dans la salle.</h1><p className="frame-lead" role="status">Vos accès sont prêts. Ouverture de la Data Room…</p></JourneyFrame>
 const [title,text]=msg[state]??msg.invalid
 return <JourneyFrame lang={lang} setLang={setLang} tone={state==='signin'?'default':'alert'}><div className={'frame-emblem'+(state==='signin'?'':' is-alert')}>{state==='signin'?<KeyRound size={30}/>:<ShieldAlert size={30}/>}</div><p className="journey-kicker">INVITATION ADC</p><h1>{title}</h1><p className="frame-lead" role={state==='signin'?undefined:'alert'}>{text}</p>{state==='signin'&&<a className="primary journey-primary" href="/?invite=1">Vérifier mon adresse<ArrowRight size={19}/></a>}</JourneyFrame>
}
