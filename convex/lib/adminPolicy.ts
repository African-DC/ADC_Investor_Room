import type {Doc} from '../_generated/dataModel'
export type AdminCapability=Doc<'stagingAdminMemberships'>['capabilities'][number]
export function hasAdminCapability(membership:Pick<Doc<'stagingAdminMemberships'>,'authUserId'|'roomId'|'capabilities'|'revokedAt'>|null,userId:string,roomId:string,capability?:AdminCapability):boolean{
 return !!membership&&membership.authUserId===userId&&membership.roomId===roomId&&membership.revokedAt===undefined&&membership.capabilities.length>0&&(!capability||membership.capabilities.includes(capability))
}
