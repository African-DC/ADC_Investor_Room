import { createFileRoute,redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader,setResponseHeaders } from '@tanstack/react-start/server'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { z } from 'zod'
import { getAuthBridge } from '../lib/auth-server'
import { authClient } from '../lib/auth-client'
import { api } from '../../convex/_generated/api'
const privateHeaders=()=>({'Cache-Control':'private, no-store','Vary':'Cookie, Authorization','Referrer-Policy':'no-referrer'})
const verifiedSession=createServerFn({method:'GET'}).handler(async()=>{
 setResponseHeaders(new Headers(privateHeaders()))
 const bridge=getAuthBridge()
 if(!bridge)return null
 try{return await bridge.fetchAuthQuery(api.investors.me,{})}catch{return null}
})
const detailsSchema=z.object({organization:z.string().trim().max(160),investorType:z.enum(['','angel','vc','institution','partner','other']),position:z.string().trim().max(160),phone:z.string().trim().max(40),linkedin:z.string().trim().max(300).refine(v=>!v||/^https:\/\/(www\.)?linkedin\.com\//i.test(v))})
const saveProfile=createServerFn({method:'POST'}).validator(detailsSchema).handler(async({data})=>{
 setResponseHeaders(new Headers(privateHeaders()))
 const origin=getRequestHeader('origin')
 const expected=process.env.ADC_APP_ORIGIN
 if(!expected||origin!==expected)return {ok:false}
 const bridge=getAuthBridge()
 if(!bridge)return {ok:false}
 try{await bridge.fetchAuthMutation(api.investors.registerVerified,{...data,investorType:data.investorType||undefined});return {ok:true}}catch{return {ok:false}}
})
export const Route=createFileRoute('/access')({headers:privateHeaders,beforeLoad:async()=>{const session=await verifiedSession();if(!session)throw redirect({to:'/'});return {session}},component:Access})
function Access(){
 const {session}=Route.useRouteContext()
 const [details,setDetails]=useState<z.infer<typeof detailsSchema>>({organization:'',investorType:'',position:'',phone:'',linkedin:''})
 const [status,setStatus]=useState<'idle'|'saving'|'saved'|'error'>('idle')
 const [signOutError,setSignOutError]=useState(false)
 async function submit(event:FormEvent){
  event.preventDefault();setStatus('saving')
  try{const result=await saveProfile({data:detailsSchema.parse(details)});setStatus(result.ok?'saved':'error')}catch{setStatus('error')}
 }
 function input(key:'organization'|'position'|'phone'|'linkedin',label:string,type='text'){return <label className="field">{label}<input type={type} maxLength={key==='phone'?40:key==='linkedin'?300:160} value={details[key]} onChange={e=>setDetails(d=>({...d,[key]:e.target.value}))}/></label>}
 return <main className="welcome-shell"><section className="panel" style={{margin:'auto'}}><img className="brand" src="/adc-logo.png" alt="African Digit Consulting"/><h2>Bienvenue, {session.name}</h2><p>Votre adresse est vérifiée. L’accès aux documents nécessite une autorisation explicite d’ADC.</p><p>Your email is verified. Document access requires explicit ADC approval.</p><a className="secondary" href="/investor">Ouvrir la Data Room / Open investor room →</a><form onSubmit={submit}><p className="eyebrow">Profil facultatif / Optional profile</p>{input('organization','Organisation / Organization')}{input('position','Fonction / Position')}<label className="field">Profil / Investor type<select value={details.investorType} onChange={e=>{const value=detailsSchema.shape.investorType.safeParse(e.target.value);if(value.success)setDetails(d=>({...d,investorType:value.data}))}}><option value="">Non renseigné / Not specified</option><option value="angel">Business Angel</option><option value="vc">Venture Capital</option><option value="institution">Institutionnel / Institutional</option><option value="partner">Partenaire / Partner</option><option value="other">Autre / Other</option></select></label>{input('phone','Téléphone / Phone','tel')}{input('linkedin','LinkedIn','url')}<button className="primary" disabled={status==='saving'}>{status==='saving'?'Enregistrement…':'Enregistrer mon profil / Save profile'}</button>{status==='saved'&&<p role="status">Profil enregistré. / Profile saved.</p>}{status==='error'&&<p role="alert">Enregistrement impossible. / Unable to save.</p>}</form><button className="secondary" onClick={async()=>{setSignOutError(false);try{const result=await authClient.signOut();if(result.error)throw new Error('Sign out failed');location.assign('/')}catch{setSignOutError(true)}}}>Déconnexion / Sign out</button>{signOutError&&<p role="alert">Déconnexion impossible. / Unable to sign out.</p>}</section></main>
}
