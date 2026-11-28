/** Permission changes require a fresh, authorized data load rather than retaining a stale privileged view. */
export function sameCapabilities(current:readonly string[],verified:readonly string[]){
 const a=[...new Set(current)].sort(),b=[...new Set(verified)].sort()
 return a.length===b.length&&a.every((cap,i)=>cap===b[i])
}

export const HEARTBEAT_INTERVAL_MS=60000
export const MAX_UNVERIFIED_MS=90000
export const TOUCH_INTERVAL_MS=300000
export function canVerify(now:number,last:number,visible:boolean,busy:boolean,blockedUntil:number){return visible&&!busy&&now>=blockedUntil&&now-last>=HEARTBEAT_INTERVAL_MS}
