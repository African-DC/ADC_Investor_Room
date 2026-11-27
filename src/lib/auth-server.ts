import { convexBetterAuthReactStart } from '@convex-dev/better-auth/react-start'
import { ConvexHttpClient } from 'convex/browser'
import { getRequestHeader } from '@tanstack/react-start/server'
import { requestConvexToken,convexFetch } from './auth-token'
import type { FunctionReference,FunctionArgs,FunctionReturnType } from 'convex/server'
/**
 * Server-side Convex bridge. One Convex JWT is fetched per server function invocation and reused for every call:
 * fetching a token per call multiplied auth requests (~10 per admin page load) and tripped the auth rate limit,
 * which surfaced as spurious "Unauthorized" / logouts while the user was active.
 */
export function getAuthBridge(){
 const convexUrl=process.env.VITE_CONVEX_URL
 const convexSiteUrl=process.env.VITE_CONVEX_SITE_URL
 if(process.env.ADC_AUTH_ENABLED!=='true'||!convexUrl||!convexSiteUrl)return null
 const base=convexBetterAuthReactStart({convexUrl,convexSiteUrl})
 let token:Promise<string|undefined>|null=null
 const getToken=()=>token??=requestConvexToken(convexSiteUrl,{cookie:getRequestHeader('cookie'),authorization:getRequestHeader('authorization')});
 let http:Promise<ConvexHttpClient>|null=null
 const client=()=>http??=(async()=>{const t=await getToken();const c=new ConvexHttpClient(convexUrl,{fetch:convexFetch});if(t)c.setAuth(t);return c})()
 return {
  handler:base.handler,
  getToken,
  fetchAuthQuery:async<Q extends FunctionReference<'query'>>(q:Q,args:FunctionArgs<Q>):Promise<FunctionReturnType<Q>>=>(await client()).query(q,args),
  fetchAuthMutation:async<M extends FunctionReference<'mutation'>>(m:M,args:FunctionArgs<M>):Promise<FunctionReturnType<M>>=>(await client()).mutation(m,args),
  fetchAuthAction:async<A extends FunctionReference<'action'>>(a:A,args:FunctionArgs<A>):Promise<FunctionReturnType<A>>=>(await client()).action(a,args),
 }
}
export async function authHandler(request:Request){
 const bridge=getAuthBridge()
 if(!bridge)return new Response('Service unavailable',{status:503,headers:{'Cache-Control':'no-store'}})
 const response=await bridge.handler(request)
 const headers=new Headers(response.headers)
 headers.set('Cache-Control','no-store')
 headers.set('Referrer-Policy','no-referrer')
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers})
}
