import { Input } from '@ui-sdk/react/input'
import { useState, useEffect, useRef } from 'react'
import type { FormEvent,CSSProperties } from 'react'
import { ArrowRight, ArrowLeft, LockKeyhole, Mail, Globe2, Volume2, VolumeX, Check, ArrowUpRight } from 'lucide-react'
import { emptyProfile, identitySchema, profileSchema } from './schema'
import { authClient } from '../../lib/auth-client'
import type { Profile } from './schema'
import { useJourneySound } from './useJourneySound'

const copy={
 fr:{private:'ESPACE PRIVÉ · INVESTISSEURS',welcome:'Bienvenue chez ADC.',tag:'Construisons ensemble les technologies de demain.',description:'Découvrez African Digit Consulting, notre vision et les opportunités qui façonnent notre avenir.',start:'Commencer',back:'Retour',next:'Continuer',skip:'Passer',name:'Nom complet',email:'Adresse e-mail',organization:'Organisation',type:'Profil investisseur',role:'Fonction',phone:'Téléphone / WhatsApp',linkedin:'LinkedIn',identity:'Faisons connaissance.',profile:'Parlez-nous de vous.',contact:'Gardons le lien.',optional:'Facultatif',error:'Vérifiez les champs indiqués.',unavailable:'Votre accès n’a pas été demandé : le service sécurisé n’est pas encore configuré.',review:'Vérifier ma demande',privacy:'Confidentiel · Aucune donnée envoyée dans cet aperçu',existing:'Déjà invité ?',existingHint:'La connexion sécurisée sera disponible après configuration.',done:'Votre profil est prêt.',noSend:'Aucun e-mail envoyé. Les informations restent uniquement dans cette page.',types:['Sélectionner','Business Angel','Fonds d’investissement','Institutionnel','Partenaire stratégique','Autre']},
 en:{private:'PRIVATE SPACE · INVESTORS',welcome:'Welcome to ADC.',tag:'Building tomorrow’s technology, together.',description:'Discover African Digit Consulting, our vision and the opportunities shaping our future.',start:'Get started',back:'Back',next:'Continue',skip:'Skip',name:'Full name',email:'Email address',organization:'Organization',type:'Investor profile',role:'Position',phone:'Phone / WhatsApp',linkedin:'LinkedIn',identity:'Let’s get acquainted.',profile:'Tell us about yourself.',contact:'Let’s stay in touch.',optional:'Optional',error:'Please check the indicated fields.',unavailable:'Your access has not been requested: the secure service is not configured yet.',review:'Review my request',privacy:'Confidential · No data transmitted in this preview',existing:'Already invited?',existingHint:'Secure sign-in will be available after configuration.',done:'Your profile is ready.',noSend:'No email was sent. Information remains in this page only.',types:['Select','Business Angel','Venture capital','Institutional','Strategic partner','Other']}
} as const
type Locale=keyof typeof copy
const fieldErrors={fr:{name:'Indiquez votre nom complet.',email:'Saisissez une adresse e-mail valide, par exemple nom@entreprise.com.',organization:'Texte trop long.',role:'Texte trop long.',phone:'Numéro invalide.',linkedin:'Utilisez une adresse LinkedIn complète (https://linkedin.com/…).'},en:{name:'Please enter your full name.',email:'Enter a valid email address, e.g. name@company.com.',organization:'Text is too long.',role:'Text is too long.',phone:'Invalid number.',linkedin:'Use a full LinkedIn URL (https://linkedin.com/…).'}} as const
const choices=['','angel','vc','institution','partner','other'] as const
const journey={
 fr:{chapters:['Bienvenue','Identité','Profil','Contact','Vérification'],kicker:['01 — LA RENCONTRE','02 — FAISONS CONNAISSANCE','03 — VOTRE PERSPECTIVE','04 — RESTONS EN CONTACT','05 — VOTRE ACCÈS'],side:['Un avenir à construire ensemble.','Toute grande collaboration commence par une rencontre.','Comprendre votre perspective.','Ouvrir le dialogue.','Une relation de confiance.'],intro:['','Commençons par l’essentiel. Seuls votre nom et votre adresse e-mail sont requis.','Quelques informations pour mieux comprendre votre organisation. Vous pouvez passer cette étape.','Choisissez comment rester en contact avec nous. Ces informations sont facultatives.',''],sound:'Activer le son',mute:'Couper le son',soundOn:'Son activé',soundOff:'Son désactivé',journey:'Votre parcours',minutes:'Quelques instants pour faire connaissance',vision:'Notre ambition : bâtir la prochaine licorne africaine.',privacy:'Accès privé et confidentiel',optionalNote:'Les informations facultatives seront à renseigner à nouveau après vérification.',home:'Retour à l’accueil',check:'Consultez votre boîte e-mail',progress:'Étape'},
 en:{chapters:['Welcome','Identity','Profile','Contact','Verification'],kicker:['01 — THE ENCOUNTER','02 — LET’S MEET','03 — YOUR PERSPECTIVE','04 — STAY CONNECTED','05 — YOUR ACCESS'],side:['A future to build together.','Every great collaboration starts with a conversation.','Understanding your perspective.','Opening the dialogue.','A relationship built on trust.'],intro:['','Start with the essentials. Only your name and email are required.','Help us understand your organization. You may skip this step.','Choose how to stay in touch. These details are optional.',''],sound:'Enable sound',mute:'Mute sound',soundOn:'Sound on',soundOff:'Sound off',journey:'Your journey',minutes:'A few moments to get acquainted',vision:'Our ambition: build the next African unicorn.',privacy:'Private, confidential access',optionalNote:'Optional details will need to be entered again after verification.',home:'Back to welcome',check:'Check your inbox',progress:'Step'}
} as const
export function Welcome(){
 const [lang,setLang]=useState<Locale>('fr')
 const [step,setStep]=useState(0)
 const [direction,setDirection]=useState<'forward'|'back'>('forward')
 const [ready,setReady]=useState(false)
 const [sending,setSending]=useState(false)
 const [sent,setSent]=useState(false)
 const [sendError,setSendError]=useState(false)
 const enabled=import.meta.env.VITE_ADC_AUTH_ENABLED==='true'
 const [profile,setProfile]=useState<Profile>(emptyProfile)
 const [errors,setErrors]=useState<string[]>([])
 const [showExisting,setShowExisting]=useState(false)
 const heading=useRef<HTMLHeadingElement>(null),previousStep=useRef(0)
 const sound=useJourneySound()
 const t=copy[lang],j=journey[lang]
 useEffect(()=>{document.documentElement.lang=lang},[lang])
 useEffect(()=>{setReady(true)},[])
 useEffect(()=>{if(previousStep.current!==step){previousStep.current=step;heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'nearest',behavior:'instant'})}},[step])
 function go(target:number){
  const back=target<step
  setDirection(back?'back':'forward');setStep(target);setErrors([]);setSendError(false)
  sound.play(back?'back':step===0?'start':'forward')
 }
 async function requestLink(){
  if(!enabled||sending||sent)return
  const parsed=identitySchema.safeParse(profile)
  if(!parsed.success){go(1);setErrors(parsed.error.issues.map(i=>String(i.path[0])));return}
  setSending(true);setSendError(false)
  try{
   const result=await authClient.signIn.magicLink({email:parsed.data.email,name:parsed.data.name,callbackURL:pendingInvite()?'/invite':'/access',newUserCallbackURL:pendingInvite()?'/invite':'/access',errorCallbackURL:'/'})
   if(result.error)throw new Error('Request failed')
   setSent(true);sound.play('success')
  }catch{setSendError(true)}finally{setSending(false)}
 }
 function update<K extends keyof Profile>(key:K,value:Profile[K]){setProfile(p=>({...p,[key]:value}));setErrors(e=>e.filter(x=>x!==key))}
 function next(event?:FormEvent){event?.preventDefault()
  const result=step===1?identitySchema.safeParse(profile):step===3?profileSchema.safeParse(profile):null
  if(result&&!result.success){setErrors(result.error.issues.map(i=>String(i.path[0])));return}
  go(Math.min(4,step+1))
 }
 function skip(){if(step===2)setProfile(p=>({...p,organization:'',type:'',role:''}));else setProfile(p=>({...p,phone:'',linkedin:''}));go(step+1)}
 function reset(){setProfile({...emptyProfile});setSent(false);setShowExisting(false);go(0)}
 function field(key:Exclude<keyof Profile,'type'>,label:string,type='text',required=false){return <label className="field" key={key}><span>{label}{required?' *':<small> · {t.optional}</small>}</span><Input type={type} required={required} autoComplete={key==='name'?'name':key==='email'?'email':key==='organization'?'organization':key==='phone'?'tel':'off'} aria-invalid={errors.includes(key)} aria-describedby={errors.includes(key)?key+'-error':undefined} maxLength={key==='email'?254:key==='linkedin'?300:key==='phone'?40:key==='name'?120:160} value={profile[key]} onValueChange={value=>update(key,value)}/>{errors.includes(key)&&<span className="field-error" id={key+'-error'}>{fieldErrors[lang][key]}</span>}</label>}
 return <main className={'journey-shell '+(step===0?'journey-welcome':'journey-inner')+(sent?' is-sent':'')} data-step={step} style={{'--p':step/4} as CSSProperties}>
  <div className="journey-atmosphere" aria-hidden="true"><span/><span/><span/><i/><i/></div>
  <header className="journey-header">
   <div className="journey-wordmark">{step!==0&&<img src="/adc-logo-mark.png" alt="African Digit Consulting"/>}<span><span className="journey-dot"/>{t.private}</span></div>
   <div className="journey-controls">{step===0&&!sound.enabled&&<span className="journey-sound-hint" aria-hidden="true">{lang==='fr'?'Vivez l’expérience avec le son':'Experience it with sound'}</span>}<button type="button" className="journey-control" disabled={!ready} aria-pressed={sound.enabled} aria-label={sound.enabled?j.mute:j.sound} onClick={sound.toggle}>{sound.enabled?<Volume2 size={17}/>:<VolumeX size={17}/>}<span>{sound.enabled?j.soundOn:j.soundOff}</span></button><button type="button" className="journey-control" onClick={()=>setLang(l=>l==='fr'?'en':'fr')} aria-label={lang==='fr'?'Switch to English':'Passer en français'}><Globe2 size={17}/>{lang==='fr'?'EN':'FR'}</button></div>
  </header>
  {step===0?<section className="journey-hero" key="welcome">
   <div className="journey-logo-reveal"><div className="journey-logo-halo" aria-hidden="true"/><svg className="journey-logo-ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48"/></svg><img className="journey-hero-logo" src="/adc-logo-mark.png" alt="African Digit Consulting" width="1254" height="1254" fetchPriority="high"/></div>
   <div className="journey-hero-copy"><p className="journey-kicker">{j.kicker[0]}</p><h1 ref={heading} tabIndex={-1}>{t.welcome}</h1><p className="journey-vision">{j.vision}</p><p className="journey-description">{t.description}</p><div className="products" aria-label={lang==='fr'?'Nos produits':'Our products'}><span><img src="/logo-klassci.png" alt="" width={28} height={28}/>KLASSCI</span><span><img src="/logo-wouri.png" alt="" width={28} height={28}/>WOURI</span></div></div>
   <div className="journey-hero-actions"><button className="primary journey-primary" disabled={!ready} onClick={()=>next()}>{t.start}<ArrowRight size={20}/></button><button className="secondary journey-link" type="button" onClick={()=>setShowExisting(v=>!v)} aria-expanded={showExisting}>{t.existing}<ArrowUpRight size={15}/></button>{showExisting&&<p role="status" className="journey-existing">{enabled?(lang==='fr'?'Utilisez votre adresse e-mail habituelle pour recevoir un nouveau lien.':'Use your usual email to request a new link.'):t.existingHint}</p>}</div>
   <p className="journey-quiet">{j.minutes}</p>
  </section>:<section className="journey-stage">
   <aside className={'journey-story '+direction} key={'story'+step}><span className="journey-numeral" aria-hidden="true">0{step+1}</span><p className="journey-kicker">{j.journey} · 0{step+1}</p><img className="journey-story-logo" src="/adc-logo-mark.png" alt="" width="1254" height="1254"/><p className="journey-story-title">{j.side[step]}</p><p className="journey-story-text">{t.tag}</p><div className="journey-story-rule"/><p className="journey-quiet"><LockKeyhole size={15}/>{j.privacy}</p></aside>
   <section className="journey-panel" aria-label={j.journey}>
    <div className="journey-panel-top"><p className="journey-kicker">{j.journey}</p><span className="journey-counter">{j.progress} 0{step+1} <span>/ 05</span></span></div>
    <div className="journey-track" aria-hidden="true"><span className="journey-track-fill"/><span className="journey-track-spark"/></div><ol className="journey-progress" aria-label={j.journey}>{j.chapters.map((chapter,i)=><li key={i} className={i<step?'complete':i===step?'current':''} aria-current={i===step?'step':undefined}><span className="journey-step-line"/><span className="journey-step-label">{i<step?<Check size={12} aria-hidden="true"/>:null}{chapter}</span></li>)}</ol>
    <div key={step} className={'journey-chapter '+direction}>
     <p className="journey-kicker">{j.kicker[step]}</p>
     {step===4?<><div className={'journey-mail '+(sent?'is-sent':'')}>{sent?<Check size={26} aria-hidden="true"/>:<Mail size={26} aria-hidden="true"/>}{sent&&<span className="journey-burst" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{'--a':i*30+'deg'} as CSSProperties}/>)}</span>}</div><h1 ref={heading} tabIndex={-1}>{sent?j.check:t.done}</h1>{enabled?<>{sent?<p role="status">{lang==='fr'?'Consultez votre boîte e-mail pour poursuivre.':'Check your email to continue.'}</p>:<><p>{lang==='fr'?'Confirmez votre adresse e-mail pour poursuivre dans votre espace sécurisé.':'Verify your email to continue to your secure space.'}</p><dl className="journey-recap"><div><dt>{t.name}</dt><dd>{profile.name}</dd></div><div><dt>{t.email}</dt><dd>{profile.email}</dd></div>{profile.organization&&<div><dt>{t.organization}</dt><dd>{profile.organization}</dd></div>}<button type="button" className="journey-recap-edit" onClick={()=>go(1)}>{lang==='fr'?'Modifier':'Edit'}</button></dl><p className="journey-note">{j.optionalNote}</p><button className="primary journey-primary" disabled={sending} onClick={()=>void requestLink()}>{sending?(lang==='fr'?'En cours…':'Sending…'):(lang==='fr'?'Recevoir mon lien':'Send my link')}<ArrowRight size={19}/></button>{sendError&&<p role="alert" className="error">{lang==='fr'?'Impossible de traiter la demande. Réessayez plus tard.':'Unable to process your request. Try again later.'}</p>}</>}</>:<><p>{t.unavailable}</p><p role="status">{t.noSend}</p></>}<button className="secondary journey-link" disabled={sending} onClick={()=>sent?reset():go(3)}><ArrowLeft size={16}/>{sent?j.home:t.back}</button></>:<form onSubmit={next} noValidate>
      <h1 ref={heading} tabIndex={-1}>{step===1?t.identity:step===2?t.profile:t.contact}</h1><p className="journey-form-intro">{j.intro[step]}</p>
      <div className="journey-fields">{step===1?<>{field('name',t.name,'text',true)}{field('email',t.email,'email',true)}</>:step===2?<>{field('organization',t.organization)}<label className="field"><span>{t.type} <small>· {t.optional}</small></span><select value={profile.type} onChange={e=>{update('type',e.target.value as Profile['type']);sound.play('select')}}>{choices.map((v,i)=><option key={v} value={v}>{t.types[i]}</option>)}</select></label>{field('role',t.role)}</>:<>{field('phone',t.phone,'tel')}{field('linkedin',t.linkedin,'url')}</>}</div>
      {errors.length>0&&<p role="alert" className="error">{t.error}</p>}
      <button type="submit" className="primary journey-primary">{step===3?t.review:t.next}<ArrowRight size={19}/></button>
      <div className="actions"><button type="button" className="secondary journey-link" onClick={()=>go(step-1)}><ArrowLeft size={15}/>{t.back}</button>{step>1&&<button type="button" className="secondary journey-link" onClick={skip}>{t.skip}<ArrowRight size={15}/></button>}</div>
     </form>}
    </div>
   </section>
  </section>}
  <footer className="journey-footer"><span><LockKeyhole size={14}/>{enabled?j.privacy:t.privacy}</span><span>African Digit Consulting © 2026</span><span className="journey-footer-edition">Investor Room</span></footer>
 </main>
}

function pendingInvite(){try{const v=JSON.parse(localStorage.getItem('adc-invite')??'null');return !!v&&Date.now()-v.at<86400000}catch{return false}}
