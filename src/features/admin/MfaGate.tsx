import { useMemo,useRef,useState } from 'react'
import type { FormEvent } from 'react'
import qrcode from 'qrcode-generator'
import { ArrowRight,KeyRound,ShieldCheck,Smartphone,Copy,Check,LogOut } from 'lucide-react'
import { JourneyFrame } from '../onboarding/JourneyFrame'
import type { Lang } from '../onboarding/JourneyFrame'
import { authClient } from '../../lib/auth-client'
type Status={name:string;email:string;enrolled:boolean;verified:boolean;lockedUntil:number|null;recoveryLeft:number}
const copy={
 fr:{kicker:'ADMINISTRATION · SÉCURITÉ',setupTitle:'Activez la double authentification.',setupLead:'L’administration de la Data Room exige un second facteur. Scannez ce QR code avec Google Authenticator, Microsoft Authenticator ou 1Password.',start:'Générer mon QR code',manual:'Saisie manuelle',code:'Code à 6 chiffres',confirm:'Activer',verifyTitle:'Vérification en deux étapes.',verifyLead:'Saisissez le code affiché dans votre application d’authentification, ou un code de secours.',verify:'Vérifier',bad:'Code invalide ou déjà utilisé. Réessayez avec le code suivant.',locked:'Trop de tentatives. Réessayez après',recTitle:'Conservez vos codes de secours.',recLead:'Chacun fonctionne une seule fois si vous perdez votre téléphone. Ils ne seront plus jamais affichés.',copy:'Copier les codes',copied:'Copiés',saved:'J’ai conservé mes codes',continue:'Accéder au back-office',signout:'Se déconnecter',steps:['Installer une application d’authentification','Scanner le QR code','Saisir le code affiché'],left:'codes de secours restants'},
 en:{kicker:'ADMINISTRATION · SECURITY',setupTitle:'Turn on two-factor authentication.',setupLead:'Data room administration requires a second factor. Scan this QR code with Google Authenticator, Microsoft Authenticator or 1Password.',start:'Generate my QR code',manual:'Manual entry',code:'6-digit code',confirm:'Activate',verifyTitle:'Two-step verification.',verifyLead:'Enter the code shown in your authenticator app, or a recovery code.',verify:'Verify',bad:'Invalid or already used code. Try again with the next code.',locked:'Too many attempts. Try again after',recTitle:'Keep your recovery codes.',recLead:'Each works once if you lose your phone. They will never be shown again.',copy:'Copy codes',copied:'Copied',saved:'I have saved my codes',continue:'Open the back office',signout:'Sign out',steps:['Install an authenticator app','Scan the QR code','Enter the displayed code'],left:'recovery codes left'}
} as const
export function MfaGate({status,begin,confirm,verify}:{status:Status;begin:()=>Promise<{uri:string;secret:string}|null>;confirm:(code:string)=>Promise<{ok:boolean;recovery?:string[]}>;verify:(code:string)=>Promise<{ok:boolean}>}){
 const [lang,setLang]=useState<Lang>('fr'),t=copy[lang]
 const [enroll,setEnroll]=useState<{uri:string;secret:string}|null>(null),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(false),[recovery,setRecovery]=useState<string[]|null>(null),[ack,setAck]=useState(false),[copied,setCopied]=useState(false)
 const input=useRef<HTMLInputElement>(null)
 const qr=useMemo(()=>{if(!enroll)return null;const q=qrcode(0,'M');q.addData(enroll.uri);q.make();return q.createSvgTag({cellSize:5,margin:2,scalable:true})},[enroll])
 const locked=status.lockedUntil&&status.lockedUntil>Date.now()
 async function submit(e:FormEvent){e.preventDefault();if(busy)return;setBusy(true);setError(false)
  try{if(status.enrolled){const r=await verify(code);if(!r.ok)throw Error('bad');location.reload()}else{const r=await confirm(code);if(!r.ok||!r.recovery)throw Error('bad');setRecovery(r.recovery)}}
  catch{setError(true);setCode('');input.current?.focus()}finally{setBusy(false)}}
 const signOut=<button className="secondary journey-link frame-back" onClick={async()=>{await authClient.signOut().catch(()=>{});location.assign('/')}}><LogOut size={15}/>{t.signout}</button>
 const codeField=<form className="mfa-form" onSubmit={submit}><label className="field"><span>{t.code}</span><input ref={input} className="mfa-code" inputMode={status.enrolled?'text':'numeric'} autoComplete="one-time-code" maxLength={status.enrolled?12:6} value={code} onChange={e=>setCode(status.enrolled?e.target.value:e.target.value.replace(/\D/g,''))} aria-invalid={error} autoFocus placeholder="••••••"/></label>{error&&<p role="alert" className="frame-status error">{t.bad}</p>}<button className="primary journey-primary" disabled={busy||code.length<6}>{status.enrolled?t.verify:t.confirm}<ArrowRight size={19}/></button></form>
 if(recovery)return <JourneyFrame lang={lang} setLang={setLang} tone="success"><div className="frame-emblem is-success"><KeyRound size={30}/></div><p className="journey-kicker">{t.kicker}</p><h1>{t.recTitle}</h1><p className="frame-lead">{t.recLead}</p><ol className="mfa-recovery">{recovery.map(c=><li key={c}><code>{c}</code></li>)}</ol><button className="secondary journey-link frame-cta-alt" onClick={()=>{void navigator.clipboard?.writeText(recovery.join('\n')).then(()=>setCopied(true))}}>{copied?<Check size={15}/>:<Copy size={15}/>}{copied?t.copied:t.copy}</button><label className="dr-check"><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/><span>{t.saved}</span></label><button className="primary journey-primary" disabled={!ack} onClick={()=>location.reload()}>{t.continue}<ArrowRight size={19}/></button></JourneyFrame>
 return <JourneyFrame lang={lang} setLang={setLang}>
  <div className="frame-emblem"><ShieldCheck size={30}/></div><p className="journey-kicker">{t.kicker}</p>
  {locked?<><h1>{t.verifyTitle}</h1><p role="alert" className="frame-lead">{t.locked} {new Date(status.lockedUntil!).toLocaleTimeString(lang)}.</p></>
  :status.enrolled?<><h1>{t.verifyTitle}</h1><p className="frame-lead">{t.verifyLead}</p>{codeField}<p className="frame-note">{status.recoveryLeft} {t.left}</p></>
  :<><h1>{t.setupTitle}</h1><p className="frame-lead">{t.setupLead}</p>
   {!enroll?<><ol className="mfa-steps">{t.steps.map((s,i)=><li key={s}><span>{i+1}</span>{s}</li>)}</ol><button className="primary journey-primary" disabled={busy} onClick={async()=>{setBusy(true);const r=await begin().catch(()=>null);setBusy(false);if(r)setEnroll(r);else setError(true)}}><Smartphone size={18}/>{t.start}<ArrowRight size={19}/></button>{error&&<p role="alert" className="frame-status error">{t.bad}</p>}</>
   :<><div className="mfa-qr" dangerouslySetInnerHTML={{__html:qr!}} role="img" aria-label="QR code"/><details className="mfa-manual"><summary>{t.manual}</summary><code>{enroll.secret.match(/.{1,4}/g)!.join(' ')}</code></details>{codeField}</>}</>}
  <p className="frame-note">{status.email}</p>{signOut}
 </JourneyFrame>
}
