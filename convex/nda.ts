// Versioned confidentiality agreement per room. A new version forces re-acceptance (access checks compare exact versions).
import { mutation,query } from './_generated/server'
import { v } from 'convex/values'
import { admin } from './admin'
import { authComponent } from './auth'
const clean=(s:string,max:number)=>{const x=s.trim();if(!x||x.length>max)throw new Error('Invalid text');return x}
export const adminView=query({args:{roomId:v.id('rooms')},handler:async(ctx,a)=>{
 await admin(ctx,a.roomId,'access:manage');const room=await ctx.db.get(a.roomId);if(!room)throw new Error('Unavailable')
 const history=(await ctx.db.query('ndaVersions').withIndex('by_room_version',q=>q.eq('roomId',a.roomId)).order('desc').take(50)).map(h=>({version:h.version,publishedAt:h.createdAt,retiredAt:h.retiredAt??null,textFr:h.textFr,textEn:h.textEn}))
 const people=[]
 for(const link of await ctx.db.query('roomApplicants').withIndex('by_room',q=>q.eq('roomId',a.roomId)).take(500)){
  const p=await ctx.db.get(link.profileId);if(!p)continue
  const acc=await ctx.db.query('ndaAcceptances').withIndex('by_user_room',q=>q.eq('authUserId',p.authUserId).eq('roomId',a.roomId)).take(100)
  const current=room.ndaVersion?acc.find(x=>x.version===room.ndaVersion):undefined
  const last=acc.sort((x,y)=>y.acceptedAt-x.acceptedAt)[0]
  people.push({name:p.name,email:p.email,organization:p.organization??'',acceptedCurrentAt:current?.acceptedAt??null,lastVersion:last?.version??null,lastAt:last?.acceptedAt??null})
 }
 return {current:room.ndaVersion?{version:room.ndaVersion,textFr:room.ndaTextFr??'',textEn:room.ndaTextEn??''}:null,history,people}
}})
export const publish=mutation({args:{roomId:v.id('rooms'),textFr:v.string(),textEn:v.string()},handler:async(ctx,a)=>{
 const {user}=await admin(ctx,a.roomId,'content:review');const room=await ctx.db.get(a.roomId);if(!room)throw new Error('Unavailable')
 const fr=clean(a.textFr,40000),en=clean(a.textEn,40000),now=Date.now()
 if(room.ndaTextFr===fr&&room.ndaTextEn===en&&room.ndaVersion)throw new Error('No change')
 const day=new Date(now).toISOString().slice(0,10),n=(await ctx.db.query('ndaVersions').withIndex('by_room_version',q=>q.eq('roomId',a.roomId)).collect()).length+1
 const version=`NDA-${day}-v${n}`
 for(const h of await ctx.db.query('ndaVersions').withIndex('by_room_version',q=>q.eq('roomId',a.roomId)).collect())if(!h.retiredAt)await ctx.db.patch(h._id,{retiredAt:now})
 await ctx.db.insert('ndaVersions',{roomId:a.roomId,version,textFr:fr,textEn:en,publishedBy:user._id,createdAt:now})
 await ctx.db.patch(room._id,{ndaVersion:version,ndaTextFr:fr,ndaTextEn:en})
 await ctx.db.insert('auditLogs',{actorId:user._id,event:'nda.published',resourceId:version,at:now});return {version}
}})
export const remove=mutation({args:{roomId:v.id('rooms')},handler:async(ctx,a)=>{
 const {user}=await admin(ctx,a.roomId,'content:review');const room=await ctx.db.get(a.roomId);if(!room)throw new Error('Unavailable')
 const now=Date.now();for(const h of await ctx.db.query('ndaVersions').withIndex('by_room_version',q=>q.eq('roomId',a.roomId)).collect())if(!h.retiredAt)await ctx.db.patch(h._id,{retiredAt:now})
 await ctx.db.patch(room._id,{ndaVersion:undefined,ndaTextFr:undefined,ndaTextEn:undefined})
 await ctx.db.insert('auditLogs',{actorId:user._id,event:'nda.removed',resourceId:room._id,at:now});return {ok:true}
}})
void authComponent
