import {useEffect,useState,type ReactNode} from 'react'
import {ConvexReactClient} from 'convex/react'
import {ConvexBetterAuthProvider} from '@convex-dev/better-auth/react'
import {authClient} from './auth-client'
export function LiveConvex({children}:{children:ReactNode}){
 const [client]=useState(()=>new ConvexReactClient(import.meta.env.VITE_CONVEX_URL,{expectAuth:true}))
 useEffect(()=>()=>{void client.close()},[client])
 return <ConvexBetterAuthProvider client={client} authClient={authClient}>{children}</ConvexBetterAuthProvider>
}
export function liveConvexEnabled(){return typeof import.meta.env.VITE_CONVEX_URL==='string'&&/^https:\/\//.test(import.meta.env.VITE_CONVEX_URL)}
