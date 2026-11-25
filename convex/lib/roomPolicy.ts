import { canAccess } from '../../src/features/access/policy'
import type { Capability,Grant } from '../../src/features/access/policy'
import type { Doc } from '../_generated/dataModel'
type StoredGrant=Pick<Doc<'accessGrants'>,'authUserId'|'roomId'|'capability'|'resourceId'|'effect'|'expiresAt'|'revokedAt'>
export function permits(userId:string,room:Pick<Doc<'rooms'>,'_id'|'status'|'ndaVersion'>,grants:readonly StoredGrant[],now:number,capability:Capability,resourceId?:string,acceptedNdaVersion?:string,ignoreNdaForRoomListing=false){
 const mapped:Grant[]=grants.filter(g=>g.capability===capability).map(g=>({userId:g.authUserId,roomId:g.roomId,capability,resourceId:g.resourceId,effect:g.effect,expiresAt:g.expiresAt,revokedAt:g.revokedAt}))
 return canAccess({userId,roomId:room._id,capability,resourceId,now,published:room.status==='published',requiredNdaVersion:ignoreNdaForRoomListing&&capability==='room:read'?undefined:room.ndaVersion,acceptedNdaVersion},mapped)
}
export function currentPublication(section:Pick<Doc<'sections'>,'_id'|'roomId'|'publishedVersionId'>,version:Doc<'sectionVersions'>|null){
 if(!version||section.publishedVersionId!==version._id||version.sectionId!==section._id||version.roomId!==section.roomId||version.state!=='published')return null
 return {id:section._id,titleFr:version.titleFr,titleEn:version.titleEn,bodyFr:version.bodyFr,bodyEn:version.bodyEn,blocksFr:version.blocksFr??null,blocksEn:version.blocksEn??null,publishedAt:version.publishedAt??version.createdAt}
}
