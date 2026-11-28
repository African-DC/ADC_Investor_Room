import { createFileRoute } from '@tanstack/react-router'
import { useEffect,useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight,Mail,MailCheck,KeyRound } from 'lucide-react'
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
 const [lang,setLang]=useState<Lang>('fr'),t=copy[lang],fr=lang==='fr'
 const [email,setEmail]=useState(''),[otp,setOtp]=useState(''),[method,setMethod]=useState<'link'|'otp'>(next==='/invite'?'otp':'link'),[state,setState]=useState<'idle'|'sending'|'sent'|'error'|'invalid'>('idle'),[verifying,setVerifying]=useState(false),[codeError,setCodeError]=useState(false),[sentAt,setSentAt]=useState(0),[resendWait,setResendWait]=useState(false)
 const [ready,setReady]=useState(false)
 useEffect(()=>setReady(true),[])
 const space=next==='/admin'?'admin':'investor'
 async function submit(e?:FormEvent){e?.preventDefault();if(!ready||state==='sending'||verifying)return;const v=email.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)){setState('invalid');return}
  setState('sending');setCodeError(false);setOtp('');setResendWait(false);try{
   const r=method==='link'?await authClient.signIn.magicLink({email:v,callbackURL:next,newUserCallbackURL:next,errorCallbackURL:'/connexion?next='+encodeURIComponent(next)}):await authClient.emailOtp.sendVerificationOtp({email:v,type:'sign-in'})
   if(r.error)throw Error('failed');setSentAt(Date.now());setState('sent')
  }catch{setState('error')}
 }
 async function verify(e:FormEvent){e.preventDefault();if(verifying||!/^\d{6}$/.test(otp))return;setVerifying(true);setCodeError(false)
  try{const r=await authClient.signIn.emailOtp({email:email.trim().toLowerCase(),otp});if(r.error)throw Error('failed');location.replace(next)}catch{setCodeError(true);setOtp('');setVerifying(false)}
 }
 if(state==='sent')return <JourneyFrame space={space} lang={lang} setLang={setLang} tone={method==='link'?'success':'default'}><div className="frame-emblem"><MailCheck size={30}/></div><p className="journey-kicker">{next==='/admin'?t.admin:t.kicker}</p><h1>{method==='link'?t.sentTitle:fr?'Saisissez votre code.':'Enter your code.'}</h1><p className="frame-lead" role="status">{method==='link'?t.sent:fr?'Un code à 6 chiffres a été demandé pour':'A six-digit code was requested for'} <b>{email.trim()}</b>.</p>
  {method==='otp'?<form className="mfa-form" onSubmit={verify}><label className="field"><span>{fr?'Code reçu par e-mail':'Email verification code'}</span><input className="mfa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))} aria-invalid={codeError} autoFocus placeholder="••••••"/></label>{codeError&&<p role="alert" className="frame-status error">{fr?'Code invalide ou expiré. Réessayez ou demandez un nouveau code.':'Invalid or expired code. Try again or request a new one.'}</p>}<button className="primary journey-primary" disabled={verifying||otp.length!==6}>{fr?'Vérifier mon code':'Verify my code'}<ArrowRight size={19}/></button><p className="frame-note">{fr?'Valable 10 minutes · 5 tentatives maximum.':'Valid 10 minutes · maximum 5 attempts.'}</p></form>:<p className="frame-note">{t.hint}</p>}
  <button className="secondary journey-link" disabled={verifying} onClick={()=>{if(Date.now()-sentAt<60000){setResendWait(true);return}void submit()}}>{fr?'Renvoyer après 60 secondes':'Resend after 60 seconds'}</button>{resendWait&&<p role="status">{fr?'Patientez 60 secondes avant un nouvel envoi.':'Wait 60 seconds before resending.'}</p>}
  <button className="secondary journey-link frame-back" disabled={verifying} onClick={()=>{setState('idle');setCodeError(false);setOtp('')}}>{t.again} / {fr?'Changer de méthode':'Change method'}</button></JourneyFrame>
 return <JourneyFrame space={space} lang={lang} setLang={setLang}>
  <div className="frame-emblem"><Mail size={30}/></div><p className="journey-kicker">{next==='/admin'?t.admin:t.kicker}</p><h1>{t.title}</h1><p className="frame-lead">{fr?'Choisissez votre méthode de connexion sécurisée. Aucun mot de passe.':'Choose your secure sign-in method. No password.'}</p>
  <div className="login-methods" role="group" aria-label={fr?'Méthode de connexion':'Sign-in method'}><button type="button" disabled={!ready||state==='sending'} aria-pressed={method==='link'} onClick={()=>{setMethod('link');setState('idle')}}><Mail size={16}/>{fr?'Lien par e-mail':'Email link'}</button><button type="button" disabled={!ready||state==='sending'} aria-pressed={method==='otp'} onClick={()=>{setMethod('otp');setState('idle')}}><KeyRound size={16}/>{fr?'Code OTP':'Email code'}</button></div>
  <form className="mfa-form" onSubmit={submit} noValidate><label className="field"><span>{t.email}</span><input className="am-search login-input" type="email" autoComplete="email" inputMode="email" autoFocus disabled={!ready||state==='sending'} value={email} aria-invalid={state==='invalid'} onChange={e=>{setEmail(e.target.value);if(state!=='sending')setState('idle')}} placeholder="nom@entreprise.com"/></label>
   {state==='invalid'&&<p role="alert" className="frame-status error">{t.invalid}</p>}{state==='error'&&<p role="alert" className="frame-status error">{t.error}</p>}
   <button className="primary journey-primary" disabled={!ready||state==='sending'}>{state==='sending'?t.sending:method==='link'?t.send:fr?'Recevoir mon code':'Send my code'}<ArrowRight size={19}/></button></form>
  {next==='/admin'?<p className="frame-note">{fr?'Après vérification de votre adresse, votre application Authenticator reste obligatoire.':'After email verification, your authenticator app is still required.'}</p>:<a className="secondary journey-link frame-back" href="/">{t.new}</a>}
 </JourneyFrame>
}
