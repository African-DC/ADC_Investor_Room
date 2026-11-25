import { createFileRoute,redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader,setResponseHeaders } from '@tanstack/react-start/server'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { z } from 'zod'
import { getAuthBridge } from '../lib/auth-server'
import { authClient } from '../lib/auth-client'
import { api } from '../../convex/_generated/api'
import { ArrowRight, BadgeCheck, LogOut } from 'lucide-react'
import { JourneyFrame } from '../features/onboarding/JourneyFrame'
import type { Lang } from '../features/onboarding/JourneyFrame'
const privateHeaders=()=>({'Cache-Control':'private, no-store','Vary':'Cookie, Authorization','Referrer-Policy':'no-referrer'})
const verifiedSession=createServerFn({method:'GET'}).handler(async()=>{
 setResponseHeaders(new Headers(privateHeaders()))
 const bridge=getAuthBridge()
 if(!bridge)return null
 try{const session=await bridge.fetchAuthQuery(api.investors.me,{});return session?{...session,intakeAvailable:session.intakeAvailable&&process.env.ADC_INTAKE_ENABLED==='true'}:null}catch{return null}
})
const detailsSchema=z.object({organization:z.string().trim().max(160),investorType:z.enum(['','angel','vc','institution','partner','other']),position:z.string().trim().max(160),phone:z.string().trim().max(40),linkedin:z.string().trim().max(300).refine(v=>!v||/^https:\/\/(www\.)?linkedin\.com\//i.test(v))})
const saveProfile=createServerFn({method:'POST'}).validator(detailsSchema.extend({requestAccess:z.boolean()})).handler(async({data})=>{
 setResponseHeaders(new Headers(privateHeaders()))
 const origin=getRequestHeader('origin')
 const expected=process.env.ADC_APP_ORIGIN
 if(!expected||origin!==expected||data.requestAccess&&process.env.ADC_INTAKE_ENABLED!=='true')return {ok:false}
 const bridge=getAuthBridge()
 if(!bridge)return {ok:false}
 try{await bridge.fetchAuthMutation(api.investors.registerVerified,{...data,investorType:data.investorType});return {ok:true}}catch{return {ok:false}}
})
export const Route=createFileRoute('/access')({headers:privateHeaders,beforeLoad:async()=>{const session=await verifiedSession();if(!session)throw redirect({to:'/'});return {session}},component:Access})
function Access(){
 const {session}=Route.useRouteContext()
 const [details,setDetails]=useState<z.infer<typeof detailsSchema>>(()=>{const result=detailsSchema.safeParse(session.details);return result.success?result.data:{organization:'',investorType:'',position:'',phone:'',linkedin:''}})
 const [status,setStatus]=useState<'idle'|'saving'|'saved'|'error'>('idle')
 const [signOutError,setSignOutError]=useState(false)
 const [requested,setRequested]=useState(session.intakeRequested)
 async function save(requestAccess:boolean){
  setStatus('saving')
  try{const result=await saveProfile({data:{...detailsSchema.parse(details),requestAccess}});setStatus(result.ok?'saved':'error');if(result.ok&&requestAccess)setRequested(true)}catch{setStatus('error')}
 }
 function submit(event:FormEvent){event.preventDefault();void save(false)}
 const [lang,setLang]=useState<Lang>('fr')
 const fr=lang==='fr'
 function input(key:'organization'|'position'|'phone'|'linkedin',label:string,type='text'){return <label className="field"><span>{label} <small>· {fr?'Facultatif':'Optional'}</small></span><input type={type} maxLength={key==='phone'?40:key==='linkedin'?300:160} value={details[key]} onChange={e=>setDetails(d=>({...d,[key]:e.target.value}))}/></label>}
 return <JourneyFrame lang={lang} setLang={setLang} tone="success">
  <div className="frame-emblem is-success"><BadgeCheck size={30} aria-hidden="true"/></div>
  <p className="journey-kicker">{fr?'ADRESSE VÉRIFIÉE':'EMAIL VERIFIED'}</p>
  <h1>{fr?'Bienvenue, ':'Welcome, '}{session.name}.</h1>
  <p className="frame-lead">{fr?'Votre adresse est vérifiée. L’accès aux documents nécessite une autorisation explicite d’ADC.':'Your email is verified. Document access requires explicit approval from ADC.'}</p>
  <a className="primary journey-primary" href="/investor">{fr?'Ouvrir la Data Room':'Open the data room'}<ArrowRight size={19}/></a>
  {session.intakeAvailable&&!requested&&<button type="button" className="secondary journey-link frame-cta-alt" disabled={status==='saving'} onClick={()=>void save(true)}>{fr?'Demander un accès à ADC':'Request access from ADC'}<ArrowRight size={15}/></button>}
  {requested&&<p role="status" className="frame-status ok">{fr?'Demande transmise à ADC. L’accès sera ouvert après validation.':'Request sent to ADC. Access opens after approval.'}</p>}
  <form className="frame-form" onSubmit={submit}>
   <p className="journey-kicker">{fr?'VOTRE PROFIL · FACULTATIF':'YOUR PROFILE · OPTIONAL'}</p>
   <div className="journey-fields">{input('organization',fr?'Organisation':'Organization')}{input('position',fr?'Fonction':'Position')}
    <label className="field"><span>{fr?'Profil investisseur':'Investor type'} <small>· {fr?'Facultatif':'Optional'}</small></span><select value={details.investorType} onChange={e=>{const value=detailsSchema.shape.investorType.safeParse(e.target.value);if(value.success)setDetails(d=>({...d,investorType:value.data}))}}><option value="">{fr?'Non renseigné':'Not specified'}</option><option value="angel">Business Angel</option><option value="vc">{fr?'Fonds d’investissement':'Venture capital'}</option><option value="institution">{fr?'Institutionnel':'Institutional'}</option><option value="partner">{fr?'Partenaire stratégique':'Strategic partner'}</option><option value="other">{fr?'Autre':'Other'}</option></select></label>
    {input('phone',fr?'Téléphone / WhatsApp':'Phone / WhatsApp','tel')}{input('linkedin','LinkedIn','url')}</div>
   <button className="primary journey-primary" disabled={status==='saving'}>{status==='saving'?(fr?'Enregistrement…':'Saving…'):(fr?'Enregistrer mon profil':'Save my profile')}<ArrowRight size={19}/></button>
   {status==='saved'&&<p role="status" className="frame-status ok">{fr?'Profil enregistré.':'Profile saved.'}</p>}
   {status==='error'&&<p role="alert" className="frame-status error">{fr?'Enregistrement impossible. Réessayez.':'Unable to save. Please try again.'}</p>}
  </form>
  <button className="secondary journey-link frame-back" onClick={async()=>{setSignOutError(false);try{const result=await authClient.signOut();if(result.error)throw new Error('Sign out failed');location.assign('/')}catch{setSignOutError(true)}}}><LogOut size={15}/>{fr?'Déconnexion':'Sign out'}</button>
  {signOutError&&<p role="alert" className="frame-status error">{fr?'Déconnexion impossible.':'Unable to sign out.'}</p>}
 </JourneyFrame>
}
