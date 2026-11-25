import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight,Mail,MailCheck } from 'lucide-react'
import { authClient } from '../lib/auth-client'
import { JourneyFrame } from '../features/onboarding/JourneyFrame'
import type { Lang } from '../features/onboarding/JourneyFrame'
// Only these same-origin destinations may be requested after sign-in.
const allowed=['/investor','/admin','/access','/invite'] as const
type Next=typeof allowed[number]
export const Route=createFileRoute('/connexion')({validateSearch:(s:Record<string,unknown>):{next:Next}=>({next:(allowed as readonly string[]).includes(String(s.next))?s.next as Next:'/investor'}),head:()=>({meta:[{title:'Connexion · ADC Investor Room'}]}),component:SignIn})
const copy={
 fr:{kicker:'ESPACE PRIVÉ',title:'Connexion.',admin:'Équipe ADC · accès réservé',lead:'Saisissez votre adresse e-mail : vous recevrez un lien de connexion sécurisé, valable 15 minutes. Aucun mot de passe.',email:'Adresse e-mail',send:'Recevoir mon lien',sending:'Envoi…',sentTitle:'Consultez votre boîte e-mail.',sent:'Si cette adresse est connue, un lien de connexion vient d’être envoyé à',hint:'Pensez à vérifier les courriers indésirables. Ouvrez le lien sur cet appareil.',error:'Envoi impossible pour le moment. Réessayez dans quelques instants.',invalid:'Saisissez une adresse e-mail valide.',new:'Première visite ? Découvrir ADC',again:'Utiliser une autre adresse'},
 en:{kicker:'PRIVATE SPACE',title:'Sign in.',admin:'ADC team · restricted access',lead:'Enter your email: you will receive a secure sign-in link, valid for 15 minutes. No password.',email:'Email address',send:'Send my link',sending:'Sending…',sentTitle:'Check your inbox.',sent:'If this address is known, a sign-in link has just been sent to',hint:'Check your spam folder. Open the link on this device.',error:'Unable to send right now. Please try again shortly.',invalid:'Enter a valid email address.',new:'First visit? Discover ADC',again:'Use another address'}
} as const
function SignIn(){
 const {next}=Route.useSearch()
 const [lang,setLang]=useState<Lang>('fr'),t=copy[lang]
 const [email,setEmail]=useState(''),[state,setState]=useState<'idle'|'sending'|'sent'|'error'|'invalid'>('idle')
 async function submit(e:FormEvent){e.preventDefault();const v=email.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)){setState('invalid');return}
  setState('sending');try{const r=await authClient.signIn.magicLink({email:v,callbackURL:next,newUserCallbackURL:next==='/admin'?'/access':next,errorCallbackURL:'/connexion'});if(r.error)throw Error('failed');setState('sent')}catch{setState('error')}}
 if(state==='sent')return <JourneyFrame space={next==='/admin'?'admin':'investor'} lang={lang} setLang={setLang} tone="success"><div className="frame-emblem is-success"><MailCheck size={30}/></div><p className="journey-kicker">{next==='/admin'?t.admin:t.kicker}</p><h1>{t.sentTitle}</h1><p className="frame-lead" role="status">{t.sent} <b>{email.trim()}</b>.</p><p className="frame-note">{t.hint}</p><button className="secondary journey-link frame-back" onClick={()=>setState('idle')}>{t.again}</button></JourneyFrame>
 return <JourneyFrame space={next==='/admin'?'admin':'investor'} lang={lang} setLang={setLang}>
  <div className="frame-emblem"><Mail size={30}/></div><p className="journey-kicker">{next==='/admin'?t.admin:t.kicker}</p><h1>{t.title}</h1><p className="frame-lead">{t.lead}</p>
  <form className="mfa-form" onSubmit={submit} noValidate><label className="field"><span>{t.email}</span><input className="am-search login-input" type="email" autoComplete="email" inputMode="email" autoFocus value={email} aria-invalid={state==='invalid'} onChange={e=>{setEmail(e.target.value);if(state!=='sending')setState('idle')}} placeholder="nom@entreprise.com"/></label>
   {state==='invalid'&&<p role="alert" className="frame-status error">{t.invalid}</p>}{state==='error'&&<p role="alert" className="frame-status error">{t.error}</p>}
   <button className="primary journey-primary" disabled={state==='sending'}>{state==='sending'?t.sending:t.send}<ArrowRight size={19}/></button></form>
  {next!=='/admin'&&<a className="secondary journey-link frame-back" href="/">{t.new}</a>}
 </JourneyFrame>
}
