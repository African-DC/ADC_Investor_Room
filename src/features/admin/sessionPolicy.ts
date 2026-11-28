/** Permission changes require a fresh, authorized data load rather than retaining a stale privileged view. */
export function sameCapabilities(current:readonly string[],verified:readonly string[]){
 const a=[...new Set(current)].sort(),b=[...new Set(verified)].sort()
 return a.length===b.length&&a.every((cap,i)=>cap===b[i])
}
