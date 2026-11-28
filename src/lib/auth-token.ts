// Request-scoped session exchange. Do not forward browser transport/proxy headers or log credentials.
export class AuthTokenError extends Error {
 constructor(readonly reason:'network'|'upstream'|'rate-limit'|'invalid-response',readonly status?:number,readonly retryAfterSeconds?:number){super('Convex token exchange failed');this.name='AuthTokenError'}
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
  if(response.status===429){const delay=retryDelay(response.headers);await response.body?.cancel().catch(()=>{});throw new AuthTokenError('rate-limit',429,delay)}
  if(!response.ok){if(attempt===0&&(response.status===408||response.status>=500)){await response.body?.cancel().catch(()=>{});continue}throw new AuthTokenError('upstream',response.status)}
  try{const body:unknown=await response.json();if(typeof body==='object'&&body!==null&&'token' in body&&typeof body.token==='string'&&body.token.length>0)return body.token}catch{/* no upstream body in logs */}
  throw new AuthTokenError('invalid-response',response.status)
 }
 throw new AuthTokenError('network')
}
export function safeAuthFailure(error:unknown){
 if(error instanceof ConvexThrottleError)return {kind:'rate-limit',status:429,source:'convex-http' as const,retryAfterSeconds:error.retryAfterSeconds}
 if(error instanceof AuthTokenError)return {kind:error.reason,status:error.status,source:'auth-token' as const,...(error.retryAfterSeconds===undefined?{}:{retryAfterSeconds:error.retryAfterSeconds})}
 const message=error instanceof Error?error.message:''
 const kind=/MFA required/i.test(message)?'mfa-required':/unauthenticated|unauthorized|authentication required|not authenticated/i.test(message)?'unauthenticated':/could not find public function|function.*not found/i.test(message)?'missing-function':/conflict|optimistic concurrency|OCC/i.test(message)?'database-conflict':/\b(?:HTTP|status(?: code)?|response)\s*[:=]?\s*429\b|\brate[- ]limit(?:ed|ing)?\b|too many requests/i.test(message)?'rate-limit':/timeout|fetch failed|network/i.test(message)?'network':'backend-error'
 return {kind}
}

/** Classify an actual Convex HTTP 429 without logging request headers or response bodies. */
export class ConvexThrottleError extends Error {constructor(readonly retryAfterSeconds:number){super('Convex HTTP rate limit');this.name='ConvexThrottleError'}}
export async function convexFetch(input:RequestInfo|URL,init?:RequestInit,request:typeof fetch=fetch){
 const response=await request(input,init)
 if(response.status===429){const seconds=retryDelay(response.headers);await response.body?.cancel().catch(()=>{});throw new ConvexThrottleError(seconds)}
 return response
}

export function retryDelay(headers:Headers,now=Date.now()){
 const raw=headers.get('x-retry-after')??headers.get('retry-after');const n=raw&&/^\d+$/.test(raw)?Number(raw):raw?Math.ceil((Date.parse(raw)-now)/1000):NaN
 return Number.isFinite(n)?Math.min(3600,Math.max(1,n)):60
}
