// One authenticated optional-panel read replaces eight HTTP calls.
import {query} from './_generated/server'
import {v} from 'convex/values'
import {admin} from './admin'
import {readFinance} from './finance'
import {readContacts} from './crm'
import {readQuestions} from './qa'
import {readAnalytics} from './analytics'
import {readAccess} from './access'
import {readTeam} from './team'
import {readEmails} from './outbox'
import {readNda} from './nda'
async function safe<T>(panel:string,read:()=>Promise<T>):Promise<T|null>{try{return await read()}catch{console.warn('[adc:panel] read failed',{panel});return null}}
export const overview=query({args:{roomId:v.id('rooms')},handler:async(ctx,a)=>{
 const actor=await admin(ctx,a.roomId),has=(...caps:string[])=>caps.some(c=>(actor.membership.capabilities as readonly string[]).includes(c))
 return {
 metrics:has('finance:edit','finance:review')?await safe('finance',()=>readFinance(ctx,a,actor)):null,
 contacts:has('crm:read','crm:edit')?await safe('crm',()=>readContacts(ctx,a,actor)):null,
 questions:has('qa:read','qa:reply')?await safe('qa',()=>readQuestions(ctx,a,actor)):null,
 analytics:has('analytics:read')?await safe('analytics',()=>readAnalytics(ctx,{...a,days:30},actor)):null,
 access:has('access:manage')?await safe('access',()=>readAccess(ctx,a)):null,
 team:has('access:manage')?await safe('team',()=>readTeam(ctx,a,actor)):null,
 emails:has('access:manage')?await safe('emails',()=>readEmails(ctx,a)):null,
 nda:has('access:manage')?await safe('nda',()=>readNda(ctx,a)):null
 }
}})
