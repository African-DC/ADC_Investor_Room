import { createFileRoute,redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getAuthBridge } from '../lib/auth-server'
import { authClient } from '../lib/auth-client'
import { api } from '../../convex/_generated/api'
const verifiedSession=createServerFn({method:'GET'}).handler(async()=>{
 const bridge=getAuthBridge()
 if(!bridge)return null
 try{return await bridge.fetchAuthQuery(api.investors.me,{})}catch{return null}
})
export const Route=createFileRoute('/access')({beforeLoad:async()=>{const session=await verifiedSession();if(!session)throw redirect({to:'/'});return {session}},component:Access})
function Access(){
 const {session}=Route.useRouteContext()
 return <main className="welcome-shell"><section className="panel" style={{margin:'auto'}}><img className="brand" src="/adc-logo.png" alt="African Digit Consulting"/><h2>Bienvenue, {session.name}</h2><p>Votre adresse est vérifiée. L’accès aux documents nécessite une autorisation explicite d’ADC.</p><p>Your email is verified. Document access requires explicit ADC approval.</p><button className="secondary" onClick={async()=>{try{await authClient.signOut();location.assign('/')}catch{/* remain on page */}}}>Déconnexion / Sign out</button></section></main>
}
