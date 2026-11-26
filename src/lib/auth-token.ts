// Request-scoped session exchange. Do not forward browser transport/proxy headers or log credentials.
export class AuthTokenError extends Error {
 constructor(readonly reason:'network'|'upstream'|'rate-limit'|'invalid-response',readonly status?:number){super('Convex token exchange failed');this.name='AuthTokenError'}
}
export async function requestConvexToken(siteUrl:string,credentials:{cookie?:string;authorization?:string},request:typeof fetch=fetch):Promise<string|undefined>{
 if(!credentials.cookie&&!credentials.authorization)return undefined
 const headers=new Headers({accept:'application/json','accept-encoding':'identity'})
 if(credentials.cookie)headers.set('cookie',credentials.cookie)
 if(credentials.authorization)headers.set('authorization',credentials.authorization)
 const endpoint=new URL('/api/auth/convex/token',siteUrl)
 for(let attempt=0;attempt<2;attempt++){
  let response:Response
  try{response=await request(endpoint,{method:'GET',headers,cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(8000)})}
  catch{if(attempt===0)continue;throw new AuthTokenError('network')}
  if(response.status===401)return undefined
  if(response.status===429)throw new AuthTokenError('rate-limit',429)
  if(!response.ok){if(attempt===0&&(response.status===408||response.status>=500)){await response.body?.cancel().catch(()=>{});continue}throw new AuthTokenError('upstream',response.status)}
  try{const body:unknown=await response.json();if(typeof body==='object'&&body!==null&&'token' in body&&typeof body.token==='string'&&body.token.length>0)return body.token}catch{/* no upstream body in logs */}
  throw new AuthTokenError('invalid-response',response.status)
 }
 throw new AuthTokenError('network')
}
export function safeAuthFailure(error:unknown){
 if(error instanceof AuthTokenError)return {kind:error.reason,status:error.status}
 const message=error instanceof Error?error.message:''
 const kind=/MFA required/i.test(message)?'mfa-required':/unauthenticated|unauthorized|authentication required|not authenticated/i.test(message)?'unauthenticated':/could not find public function|function.*not found/i.test(message)?'missing-function':/conflict|optimistic concurrency|OCC/i.test(message)?'database-conflict':/429|rate limit/i.test(message)?'rate-limit':/timeout|fetch failed|network/i.test(message)?'network':'backend-error'
 return {kind}
}
