import {api} from '../../../convex/_generated/api'
import type {Id} from '../../../convex/_generated/dataModel'
import type {FunctionReference,FunctionArgs,FunctionReturnType} from 'convex/server'
import type {AdminCommand} from './contracts'
import {safeAuthFailure} from '../../lib/auth-token'
export type MutationTransport={fetchAuthMutation:<M extends FunctionReference<'mutation'>>(m:M,args:FunctionArgs<M>)=>Promise<FunctionReturnType<M>>}
export async function executeCommand(bridge:MutationTransport,data:AdminCommand){
 const roomId=data.roomId as Id<'rooms'>
 try{
  switch(data.kind){
   case 'financeDraft':await bridge.fetchAuthMutation(api.finance.draft,{roomId,sectionId:data.sectionId as Id<'sections'>,kind:data.metricKind,scope:data.scope,periodStart:data.periodStart,periodEnd:data.periodEnd,definitionFr:data.definitionFr,definitionEn:data.definitionEn,value:data.value,unit:data.unit,evidenceVersionIds:data.evidenceVersionIds as Id<'documentVersions'>[]});break
   case 'financeTransition':await bridge.fetchAuthMutation(api.finance.transition,{roomId,metricId:data.metricId as Id<'financialMetrics'>,action:data.action});break
   case 'documentTransition':if(data.action==='publish')await bridge.fetchAuthMutation(api.documents.adminPublish,{roomId,documentId:data.documentId as Id<'documents'>});else await bridge.fetchAuthMutation(api.documents.adminArchive,{roomId,documentId:data.documentId as Id<'documents'>});break
   case 'crmUpdate':await bridge.fetchAuthMutation(api.crm.update,{roomId,profileId:data.profileId as Id<'investorProfiles'>,stage:data.stage,nextAction:data.nextAction,dueDate:data.dueDate,assignToMe:data.assignToMe,expectedRevision:data.expectedRevision});break
   case 'crmNote':await bridge.fetchAuthMutation(api.crm.note,{roomId,profileId:data.profileId as Id<'investorProfiles'>,text:data.text});break
   case 'qaReply':await bridge.fetchAuthMutation(api.qa.adminReply,{roomId,questionId:data.questionId as Id<'questions'>,body:data.body});break
   case 'qaClose':await bridge.fetchAuthMutation(api.qa.close,{roomId,questionId:data.questionId as Id<'questions'>});break
   case 'grant':await bridge.fetchAuthMutation(api.admin.grant,{roomId,profileId:data.profileId as Id<'investorProfiles'>,capability:data.capability,sectionId:data.sectionId as Id<'sections'>|undefined,effect:data.effect,expiresAt:data.expiresAt});break
   case 'grantDocument':await bridge.fetchAuthMutation(api.admin.grantDocument,{roomId,profileId:data.profileId as Id<'investorProfiles'>,documentId:data.documentId as Id<'documents'>,capability:data.capability,effect:data.effect,expiresAt:data.expiresAt});break
   case 'revoke':await bridge.fetchAuthMutation(api.admin.revoke,{roomId,grantId:data.grantId as Id<'accessGrants'>});break
   case 'draft':{const {kind,roomId:_,...fields}=data;void kind;void _;await bridge.fetchAuthMutation(api.admin.draft,{...fields,roomId});break}
   case 'transition':await bridge.fetchAuthMutation(api.admin.transition,{roomId,versionId:data.versionId as Id<'sectionVersions'>,action:data.action});break
   case 'setAccess':await bridge.fetchAuthMutation(api.access.setAccess,{roomId,profileIds:data.profileIds as Id<'investorProfiles'>[],targets:data.targets,effect:data.effect,startsAt:data.startsAt,expiresAt:data.expiresAt,groupId:data.groupId as Id<'investorGroups'>|undefined});break
   case 'revokeMany':await bridge.fetchAuthMutation(api.access.revokeMany,{roomId,grantIds:data.grantIds as Id<'accessGrants'>[]});break
   case 'saveGroup':await bridge.fetchAuthMutation(api.access.saveGroup,{roomId,groupId:data.groupId as Id<'investorGroups'>|undefined,name:data.name,profileIds:data.profileIds as Id<'investorProfiles'>[]});break
   case 'deleteGroup':await bridge.fetchAuthMutation(api.access.deleteGroup,{roomId,groupId:data.groupId as Id<'investorGroups'>});break
   case 'roomCreate':return {ok:true,roomCreatedId:await bridge.fetchAuthMutation(api.admin.createRoom,{roomId,name:data.name,description:data.description})}
   case 'roomUpdate':return {ok:true,roomUpdated:await bridge.fetchAuthMutation(api.admin.updateRoom,{roomId,name:data.name,description:data.description})}
   case 'roomStatus':await bridge.fetchAuthMutation(api.access.setRoomStatus,{roomId,status:data.status});break
   case 'manualReview':await bridge.fetchAuthMutation(api.documents.attestManualReview,{roomId,documentId:data.documentId as Id<'documents'>,sha256:data.sha256,verdict:data.verdict});break
   case 'teamInvite':return {ok:true,invite:await bridge.fetchAuthMutation(api.team.inviteWithReceipt,{roomId,email:data.email,capabilities:data.capabilities})}
   case 'teamSetCaps':await bridge.fetchAuthMutation(api.team.setCapabilities,{roomId,membershipId:data.membershipId as Id<'stagingAdminMemberships'>,capabilities:data.capabilities});break
   case 'teamRevoke':await bridge.fetchAuthMutation(api.team.revokeMember,{roomId,membershipId:data.membershipId as Id<'stagingAdminMemberships'>});break
   case 'teamRevokeInvite':await bridge.fetchAuthMutation(api.team.revokeInvite,{roomId,inviteId:data.inviteId as Id<'adminInvites'>});break
   case 'retryEmail':await bridge.fetchAuthMutation(api.outbox.retry,{roomId,id:data.emailId as Id<'emailOutbox'>});break
   case 'ndaPublish':await bridge.fetchAuthMutation(api.nda.publish,{roomId,textFr:data.textFr,textEn:data.textEn});break
   case 'ndaRemove':await bridge.fetchAuthMutation(api.nda.remove,{roomId});break
   case 'revokeLink':await bridge.fetchAuthMutation(api.access.revokeLink,{roomId,linkId:data.linkId as Id<'accessLinks'>});break
   case 'archive':await bridge.fetchAuthMutation(api.admin.archive,{roomId,sectionId:data.sectionId as Id<'sections'>});break
  }
  return {ok:true}
 }catch(error){const failure=safeAuthFailure(error);console.warn('[adc:admin] command failed',{command:data.kind,...failure});return {ok:false,reason:error instanceof Error&&error.message.includes('Room name already used')?'room-name-used':failure.kind,retryAfterSeconds:'retryAfterSeconds' in failure?failure.retryAfterSeconds:undefined}}
}
