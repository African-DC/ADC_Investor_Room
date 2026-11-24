import { convexBetterAuthReactStart } from '@convex-dev/better-auth/react-start'
export function getAuthBridge(){
 const convexUrl=process.env.VITE_CONVEX_URL
 const convexSiteUrl=process.env.VITE_CONVEX_SITE_URL
 if(process.env.ADC_AUTH_ENABLED!=='true'||!convexUrl||!convexSiteUrl)return null
 return convexBetterAuthReactStart({convexUrl,convexSiteUrl})
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
