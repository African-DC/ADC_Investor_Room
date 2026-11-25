// Pure policy foundation. Only call with trusted server-resolved grants; NOT an authentication mechanism.
export type Capability = 'room:read'|'section:read'|'document:read'|'document:download'|'content:publish'|'access:manage'
export type Grant = {userId:string;roomId:string;capability:Capability;resourceId?:string;effect:'allow'|'deny';startsAt?:number;expiresAt?:number;revokedAt?:number}
export type AccessRequest = {userId:string;roomId:string;capability:Capability;resourceId?:string;now:number;published:boolean;requiredNdaVersion?:string;acceptedNdaVersion?:string}
export function canAccess(request:AccessRequest,grants:readonly Grant[]):boolean {
 if(!request.userId||!request.roomId||!Number.isFinite(request.now)) return false
 if(request.capability.endsWith(':read')||request.capability==='document:download'){
   if(!request.published) return false
   if(request.requiredNdaVersion&&request.requiredNdaVersion!==request.acceptedNdaVersion)return false
 }
 if((request.capability.startsWith('document:')||request.capability==='section:read')&&!request.resourceId)return false
 const matches=grants.filter(g=>g.userId===request.userId&&g.roomId===request.roomId&&g.capability===request.capability&&(!g.resourceId||g.resourceId===request.resourceId)&&g.revokedAt===undefined&&(g.startsAt===undefined||g.startsAt<=request.now)&&(g.expiresAt===undefined||g.expiresAt>request.now))
 return !matches.some(g=>g.effect==='deny')&&matches.some(g=>g.effect==='allow')
}
