import { createFileRoute } from '@tanstack/react-router'
import { useEffect,useState } from 'react'
import { verifiedLink } from '../features/access/confirm'
export const Route=createFileRoute('/confirm')({component:Confirm,head:()=>({meta:[{name:'referrer',content:'no-referrer'}]})})
function Confirm(){
 const [link,setLink]=useState<string|null>(null)
 const [ready,setReady]=useState(false)
 useEffect(()=>{
  try{const raw=new URLSearchParams(location.hash.slice(1)).get('next');setLink(raw?verifiedLink(raw,location.origin):null)}finally{history.replaceState(null,'',location.pathname);setReady(true)}
 },[])
 return <main className="welcome-shell"><section className="panel" style={{margin:'auto'}}><img className="brand" src="/adc-logo.png" alt="African Digit Consulting"/><h2>Confirmez votre accès / Confirm access</h2><p>Pour votre sécurité, confirmez votre connexion en cliquant ci-dessous. / For your security, confirm your sign-in below.</p>{link?<button className="primary" onClick={()=>location.assign(link)}>Confirmer / Confirm</button>:ready?<p role="alert">Lien invalide ou expiré. / Invalid or expired link.</p>:null}<a href="/">Retour / Back</a></section></main>
}
