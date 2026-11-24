import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, ArrowLeft, LockKeyhole, Mail, Globe2 } from 'lucide-react'
import { emptyProfile, identitySchema, profileSchema } from './schema'
import { authClient } from '../../lib/auth-client'
import type { Profile } from './schema'

const copy={
 fr:{private:'ESPACE PRIVÉ · INVESTISSEURS',welcome:'Bienvenue chez ADC.',tag:'Construisons ensemble les technologies de demain.',description:'Découvrez African Digit Consulting, notre vision et les opportunités qui façonnent notre avenir.',start:'Commencer',back:'Retour',next:'Continuer',skip:'Passer',name:'Nom complet',email:'Adresse e-mail',organization:'Organisation',type:'Profil investisseur',role:'Fonction',phone:'Téléphone / WhatsApp',linkedin:'LinkedIn',identity:'Faisons connaissance.',profile:'Parlez-nous de vous.',contact:'Gardons le lien.',optional:'Facultatif',error:'Vérifiez les champs indiqués.',unavailable:'Votre accès n’a pas été demandé : le service sécurisé n’est pas encore configuré.',review:'Vérifier ma demande',privacy:'Confidentiel · Aucune donnée envoyée dans cet aperçu',existing:'Déjà invité ?',existingHint:'La connexion sécurisée sera disponible après configuration.',done:'Votre profil est prêt.',noSend:'Aucun e-mail envoyé. Les informations restent uniquement dans cette page.',types:['Sélectionner','Business Angel','Fonds d’investissement','Institutionnel','Partenaire stratégique','Autre']},
 en:{private:'PRIVATE SPACE · INVESTORS',welcome:'Welcome to ADC.',tag:'Building tomorrow’s technology, together.',description:'Discover African Digit Consulting, our vision and the opportunities shaping our future.',start:'Get started',back:'Back',next:'Continue',skip:'Skip',name:'Full name',email:'Email address',organization:'Organization',type:'Investor profile',role:'Position',phone:'Phone / WhatsApp',linkedin:'LinkedIn',identity:'Let’s get acquainted.',profile:'Tell us about yourself.',contact:'Let’s stay in touch.',optional:'Optional',error:'Please check the indicated fields.',unavailable:'Your access has not been requested: the secure service is not configured yet.',review:'Review my request',privacy:'Confidential · No data transmitted in this preview',existing:'Already invited?',existingHint:'Secure sign-in will be available after configuration.',done:'Your profile is ready.',noSend:'No email was sent. Information remains in this page only.',types:['Select','Business Angel','Venture capital','Institutional','Strategic partner','Other']}
} as const
type Locale=keyof typeof copy
const choices=['','angel','vc','institution','partner','other'] as const
export function Welcome(){
 const [lang,setLang]=useState<Locale>('fr')
 const [step,setStep]=useState(0)
 const [ready,setReady]=useState(false)
 const [sending,setSending]=useState(false)
 const [sent,setSent]=useState(false)
 const [sendError,setSendError]=useState(false)
 const enabled=import.meta.env.VITE_ADC_AUTH_ENABLED==='true'
 const [profile,setProfile]=useState<Profile>(emptyProfile)
 const [errors,setErrors]=useState<string[]>([])
 const [showExisting,setShowExisting]=useState(false)
 const t=copy[lang]
 useEffect(()=>{document.documentElement.lang=lang},[lang])
 useEffect(()=>{setReady(true)},[])
 async function requestLink(){
  if(!enabled||sending)return
  const parsed=profileSchema.safeParse(profile)
  if(!parsed.success){setErrors(parsed.error.issues.map(i=>String(i.path[0])));setSendError(true);return}
  setSending(true);setSendError(false)
  try{
   const result=await authClient.signIn.magicLink({email:parsed.data.email,name:parsed.data.name,callbackURL:'/access',newUserCallbackURL:'/access',errorCallbackURL:'/'})
   if(result.error)throw new Error('Request failed')
   setSent(true)
  }catch{setSendError(true)}finally{setSending(false)}
 }
 function update<K extends keyof Profile>(key:K,value:Profile[K]){setProfile(p=>({...p,[key]:value}));setErrors(e=>e.filter(x=>x!==key))}
 function next(event?:FormEvent){event?.preventDefault()
  const result=step===1?identitySchema.safeParse(profile):step===3?profileSchema.safeParse(profile):null
  if(result&&!result.success){setErrors(result.error.issues.map(i=>String(i.path[0])));return}
  setErrors([]);setStep(s=>Math.min(4,s+1))
 }
 function field(key:Exclude<keyof Profile,'type'>,label:string,type='text',required=false){return <label className="field" key={key}>{label}{required?' *':<small> · {t.optional}</small>}<input type={type} required={required} autoComplete={key==='name'?'name':key==='email'?'email':key==='organization'?'organization':key==='phone'?'tel':'off'} aria-invalid={errors.includes(key)} maxLength={key==='email'?254:key==='linkedin'?300:key==='phone'?40:key==='name'?120:160} value={profile[key]} onChange={e=>update(key,e.target.value)}/></label>}
 return <main className="welcome-shell">
  <header><img className="brand" src="/adc-logo.png" alt="African Digit Consulting"/><button className="language" onClick={()=>setLang(l=>l==='fr'?'en':'fr')} aria-label="Change language"><Globe2 size={16}/>{lang==='fr'?'EN':'FR'}</button></header>
  <div className="stage"><section className="intro"><p className="eyebrow">{t.private}</p><div className="accent"/><h1>{t.welcome}</h1><p className="tagline">{t.tag}</p><p className="description">{t.description}</p><div className="confidential"><LockKeyhole size={16}/>{enabled?(lang==='fr'?'Espace privé · Accès contrôlé':'Private space · Controlled access'):t.privacy}</div></section>
  <section className="panel" aria-label={t.private}>
   <div className="progress" aria-label={`${step+1}/5`}>{[0,1,2,3,4].map(i=><span key={i} className={i<=step?'active':''}/>)}</div>
   <p className="eyebrow">0{step+1} / 05</p>
   {step===0?<><h2>{t.welcome}</h2><p>{t.description}</p><button className="primary" disabled={!ready} onClick={()=>next()}>{t.start}<ArrowRight size={19}/></button><button className="secondary" onClick={()=>setShowExisting(v=>!v)}>{t.existing}</button>{showExisting&&<p role="status">{enabled?(lang==='fr'?'Utilisez votre adresse e-mail habituelle pour recevoir un nouveau lien.':'Use your usual email to request a new link.'):t.existingHint}</p>}</>:step===4?<><Mail size={32}/><h2>{t.done}</h2>{enabled?<>{sent?<p role="status">{lang==='fr'?'Consultez votre boîte e-mail pour poursuivre.':'Check your email to continue.'}</p>:<><p>{lang==='fr'?'Confirmez votre adresse e-mail. Les informations facultatives seront à compléter dans votre espace vérifié.':'Verify your email. Optional details can be completed in your verified space.'}</p><button className="primary" disabled={sending} onClick={()=>void requestLink()}>{sending?(lang==='fr'?'En cours…':'Sending…'):(lang==='fr'?'Recevoir mon lien':'Send my link')}</button>{sendError&&<p role="alert">{lang==='fr'?'Impossible de traiter la demande. Réessayez plus tard.':'Unable to process your request. Try again later.'}</p>}</>}</>:<><p>{t.unavailable}</p><p role="status">{t.noSend}</p></>}<button className="secondary" disabled={sending} onClick={()=>{setProfile({...emptyProfile});setStep(0);setErrors([]);setSent(false);setSendError(false)}}>{t.back}</button></>:<form onSubmit={next}>
    <h2>{step===1?t.identity:step===2?t.profile:t.contact}</h2>{enabled&&step>1&&<p>{lang==='fr'?'Vous pouvez passer cette étape et compléter ces informations après vérification de votre adresse.':'You can skip this step and complete these details after verifying your address.'}</p>}
    {step===1?<>{field('name',t.name,'text',true)}{field('email',t.email,'email',true)}</>:step===2?<>{field('organization',t.organization)}<label className="field">{t.type} <small>· {t.optional}</small><select value={profile.type} onChange={e=>update('type',e.target.value as Profile['type'])}>{choices.map((v,i)=><option key={v} value={v}>{t.types[i]}</option>)}</select></label>{field('role',t.role)}</>:<>{field('phone',t.phone,'tel')}{field('linkedin',t.linkedin,'url')}</>}
    {errors.length>0&&<p role="alert" className="error">{t.error}</p>}
    <button type="submit" className="primary">{step===3?t.review:t.next}<ArrowRight size={19}/></button>
    <div className="actions"><button type="button" className="secondary" onClick={()=>{setErrors([]);setStep(s=>s-1)}}><ArrowLeft size={15}/>{t.back}</button>{step>1&&<button type="button" className="secondary" onClick={()=>{if(step===2)setProfile(p=>({...p,organization:'',type:'',role:''}));else setProfile(p=>({...p,phone:'',linkedin:''}));setErrors([]);setStep(s=>s+1)}}>{t.skip}</button>}</div>
   </form>}
  </section></div><footer>African Digit Consulting © 2026 <span>Investor Room</span></footer>
 </main>
}
