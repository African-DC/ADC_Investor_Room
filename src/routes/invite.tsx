import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader,setResponseHeaders } from '@tanstack/react-start/server'
import { useEffect,useRef,useState } from 'react'
import { z } from 'zod'
import { ArrowRight,KeyRound,ShieldAlert,BadgeCheck } from 'lucide-react'
import { getAuthBridge } from '../lib/auth-server'
import { authClient } from '../lib/auth-client'
import { safeAuthFailure } from '../lib/auth-token'
import { api } from '../../convex/_generated/api'
import { JourneyFrame } from '../features/onboarding/JourneyFrame'
import type { Lang } from '../features/onboarding/JourneyFrame'
const headers=()=>({'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'})
const redeem=createServerFn({method:'POST'}).validator(z.object({token:z.string().regex(/^[A-Za-z0-9_-]{40,60}$/)})).handler(async({data})=>{
 setResponseHeaders(new Headers(headers()))
 const bridge=getAuthBridge(),origin=process.env.ADC_APP_ORIGIN
 if(!bridge||!origin||getRequestHeader('origin')!==origin)return {ok:false as const,reason:'unavailable'}
 try{if(!await bridge.getToken())return {ok:false as const,reason:'signin'};return await bridge.fetchAuthMutation(api.access.redeem,{token:data.token})}catch(error){const failure=safeAuthFailure(error);console.warn('[adc:invite] redemption failed',failure);return {ok:false as const,reason:failure.kind==='unauthenticated'?'signin':failure.kind==='rate-limit'?'throttled':'unavailable'}}
})
export const Route=createFileRoute('/invite')({headers,head:()=>({meta:[{name:'referrer',content:'no-referrer'},{title:'Invitation · ADC Investor Room'}]}),component:Invite})
const KEY='adc-invite'
const msg:Record<string,[string,string]>={signin:['Vérifiez d’abord votre adresse e-mail.','Saisissez votre nom et votre adresse e-mail : vous recevrez un lien de connexion, puis votre invitation sera appliquée automatiquement.'],invalid:['Invitation invalide.','Ce lien n’existe pas ou a été désactivé par ADC.'],expired:['Invitation expirée.','La période de validité de ce lien est terminée. Contactez ADC pour en recevoir un nouveau.'],notyet:['Invitation pas encore active.','Ce lien sera utilisable à partir de la date prévue par ADC.'],full:['Invitation déjà utilisée.','Le nombre maximum d’utilisations de ce lien est atteint.'],email:['Invitation réservée à une autre adresse.','Connectez-vous avec l’adresse e-mail à laquelle ADC a adressé cette invitation.'],missing:['Invitation à rouvrir.','Rouvrez le lien d’invitation original dans ce navigateur après avoir vérifié votre adresse.'],grantExpired:['Période d’accès terminée.','ADC doit vous attribuer un nouvel accès.'],throttled:['Vérification temporairement limitée.','Patientez au moins une minute avant de réessayer.'],unavailable:['Service momentanément indisponible.','Votre invitation n’a pas été perdue. Réessayez dans quelques instants.']}
function Invite(){
 const [lang,setLang]=useState<Lang>('fr'),[state,setState]=useState<'loading'|'ok'|string>('loading'),done=useRef(false),pending=useRef(''),[retryAfter,setRetryAfter]=useState(0),[switchError,setSwitchError]=useState(false)
 async function attempt(token:string){
  if(!/^[A-Za-z0-9_-]{40,60}$/.test(token)){setState(token?'invalid':'missing');return}
  pending.current=token;setState('loading')
  try{
   const r=await redeem({data:{token}})
   if(r.ok){try{localStorage.removeItem(KEY)}catch{/* optional */};history.replaceState(null,'',location.pathname);setState('ok');location.replace('/investor?roomId='+encodeURIComponent(r.roomId));return}
   if(r.reason==='throttled')setRetryAfter(Date.now()+60000)
   setState(r.reason)
  }catch{setState('unavailable')}
 }
 useEffect(()=>{if(done.current)return;done.current=true
  let token=location.hash.slice(1)
  if(token&&!/^[A-Za-z0-9_-]{40,60}$/.test(token)){setState('invalid');return}
  try{if(token){localStorage.setItem(KEY,JSON.stringify({token,at:Date.now()}));history.replaceState(null,'',location.pathname)}else{const v=JSON.parse(localStorage.getItem(KEY)??'null');token=v&&Date.now()-v.at<86400000?v.token:''}}catch{/* retain the fragment when storage is unavailable */}
  void attempt(token)
 },[])
 useEffect(()=>{if(state!=='throttled')return;const timer=window.setInterval(()=>{if(Date.now()>=retryAfter){setRetryAfter(0);window.clearInterval(timer)}},1000);return()=>window.clearInterval(timer)},[state,retryAfter])
 async function switchAccount(){setSwitchError(false);try{const r=await authClient.signOut();if(r.error)throw Error('sign out');setState('signin')}catch{setSwitchError(true)}}
 if(state==='loading')return <JourneyFrame lang={lang} setLang={setLang}><div className="frame-loading" aria-busy="true"/><p className="frame-lead">Vérification de votre invitation…</p></JourneyFrame>
 if(state==='ok')return <JourneyFrame lang={lang} setLang={setLang} tone="success"><div className="frame-emblem is-success"><BadgeCheck size={30}/></div><p className="journey-kicker">INVITATION ACCEPTÉE</p><h1>Bienvenue dans la salle.</h1><p className="frame-lead" role="status">Vos accès sont prêts. Ouverture de la Data Room…</p></JourneyFrame>
 const [title,text]=msg[state]??msg.invalid
 return <JourneyFrame lang={lang} setLang={setLang} tone={state==='signin'?'default':'alert'}><div className={'frame-emblem'+(state==='signin'?'':' is-alert')}>{state==='signin'?<KeyRound size={30}/>:<ShieldAlert size={30}/>}</div><p className="journey-kicker">INVITATION ADC</p><h1>{title}</h1><p className="frame-lead" role={state==='signin'?undefined:'alert'}>{text}</p>{state==='signin'&&<><a className="primary journey-primary" href="/?invite=1">Vérifier mon adresse<ArrowRight size={19}/></a><a className="secondary journey-link" href="/connexion?next=%2Finvite">Déjà inscrit ? Connexion par code ou lien</a><p className="frame-note">Si votre e-mail s’ouvre dans un autre navigateur, rouvrez ensuite le lien d’invitation original dans ce navigateur.</p></>}{state==='email'&&<button className="primary journey-primary" onClick={()=>void switchAccount()}>Changer de compte</button>}{(state==='unavailable'||state==='throttled')&&<button className="primary journey-primary" disabled={state==='throttled'&&retryAfter>0} onClick={()=>void attempt(pending.current)}>Réessayer</button>}{switchError&&<p role="alert">Déconnexion impossible. Réessayez.</p>}</JourneyFrame>
}
