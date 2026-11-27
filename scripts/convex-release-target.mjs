// Compare public endpoint identities without exposing credentials or deployment URLs.
function origin(value){
  if(typeof value!=='string'||!value)throw Error('Missing Convex endpoint configuration')
  const u=new URL(value)
  if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/'||u.port)throw Error('Expected an HTTPS Convex origin')
  return u.origin
}
export function verifyConvexTarget(env){
  const expected=origin(env.VITE_CONVEX_URL),resolved=origin(env.ADC_RESOLVED_CONVEX_URL)
  if(expected!==resolved)throw Error('Production Convex target mismatch: deployment stopped before push')
  const cloud=new URL(expected)
  if(!cloud.hostname.endsWith('.convex.cloud'))throw Error('Custom Convex endpoint requires explicit release review')
  const site=origin(env.VITE_CONVEX_SITE_URL)
  if(site!==expected.replace(/\.convex\.cloud$/,'.convex.site'))throw Error('Convex HTTP site does not match deployment')
}
