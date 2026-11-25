// Content images for blocks. Stored inline (bounded) and only ever returned together with content the caller may read.
import { mutation } from './_generated/server'
import type { QueryCtx,MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { v } from 'convex/values'
import { admin } from './admin'
export const MAX_IMAGE_DATA_URL=900_000
const PREFIX=/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/
export const upload=mutation({args:{roomId:v.id('rooms'),dataUrl:v.string(),width:v.number(),height:v.number()},handler:async(ctx,a)=>{
 const {user}=await admin(ctx,a.roomId,'content:edit')
 if(a.dataUrl.length>MAX_IMAGE_DATA_URL||!PREFIX.test(a.dataUrl))throw new Error('Invalid image')
 if(!Number.isSafeInteger(a.width)||!Number.isSafeInteger(a.height)||a.width<1||a.height<1||a.width>4000||a.height>4000)throw new Error('Invalid image')
 const bytes=Math.floor((a.dataUrl.length-a.dataUrl.indexOf(',')-1)*3/4)
 const id=await ctx.db.insert('contentImages',{roomId:a.roomId,dataUrl:a.dataUrl,width:a.width,height:a.height,bytes,createdBy:user._id,createdAt:Date.now()})
 await ctx.db.insert('auditLogs',{actorId:user._id,event:'content.image_uploaded',resourceId:id,at:Date.now()});return id
}})
/** Collects image ids referenced by blocks JSON (image, media, gallery). */
export function imageIdsIn(json:string|undefined|null):string[]{
 if(!json)return []
 const ids=new Set<string>();for(const m of json.matchAll(/"imageId":"([a-z0-9]{20,40})"/g))ids.add(m[1]!);return [...ids]
}
/** Resolves ids to images of THIS room only (never cross-room). */
export async function imagesFor(ctx:QueryCtx|MutationCtx,roomId:Id<'rooms'>,ids:string[]){
 const out:Record<string,{src:string;width:number;height:number}>={}
 for(const id of ids.slice(0,120)){const img=await ctx.db.get(id as Id<'contentImages'>).catch(()=>null);if(img&&img.roomId===roomId)out[id]={src:img.dataUrl,width:img.width,height:img.height}}
 return out
}
