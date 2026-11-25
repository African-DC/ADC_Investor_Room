// Accept only the exact same-origin Better Auth verification endpoint.
export function verifiedLink(raw:string,origin:string):string|null{
 try{
  const url=new URL(raw,origin)
  if(url.origin!==origin||url.pathname!=='/api/auth/magic-link/verify'||!url.searchParams.get('token')||url.username||url.password)return null
  for(const key of ['callbackURL','newUserCallbackURL','errorCallbackURL']){
   const value=url.searchParams.get(key)
   if(value&&new URL(value,origin).origin!==origin)return null
  }
  return url.pathname+url.search
 }catch{return null}
}
