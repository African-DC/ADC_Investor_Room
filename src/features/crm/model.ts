import {validDate} from '../finance/registry'
export const stages=['new','contacted','qualified','due_diligence','negotiation','committed','closed','declined'] as const
export type Stage=typeof stages[number]
export const stageLabels:Record<Stage,string>={new:'Nouveau',contacted:'Contacté',qualified:'Qualifié',due_diligence:'Due diligence',negotiation:'Négociation',committed:'Engagement déclaré',closed:'Clôturé',declined:'Non retenu'}
export function validFollowup(action:string,dueDate?:string){return action.length<=500&&(!dueDate||(validDate(dueDate)&&action.trim().length>0))}
export function followupStatus(dueDate:string|null,today:string){return !dueDate?'none':dueDate<today?'overdue':dueDate===today?'today':'upcoming'}

export const MAX_XOF=1_000_000_000_000
export function validAmount(value:number|null){return value===null||Number.isSafeInteger(value)&&value>=0&&value<=MAX_XOF}
export function parseAmount(value:string):number|null|undefined{const s=value.trim();if(!s)return null;if(!/^\d+$/.test(s))return undefined;const n=Number(s);return validAmount(n)?n:undefined}
export function fundraisingSummary(rows:readonly {stage:Stage;expectedXof?:number|null;committedXof?:number|null;dueDate:string|null;owner:string}[],today:string){
 const open=rows.filter(c=>c.stage!=='declined'&&c.stage!=='closed')
 const eligible=rows.filter(c=>c.stage==='committed'||c.stage==='closed')
 return {expectedXof:open.filter(c=>c.stage!=='committed').reduce((n,c)=>n+(c.expectedXof??0),0),expectedCount:open.filter(c=>c.stage!=='committed'&&c.expectedXof!=null).length,committedXof:eligible.reduce((n,c)=>n+(c.committedXof??0),0),committedCount:eligible.filter(c=>c.committedXof!=null).length,missingCommitments:eligible.filter(c=>c.committedXof==null).length,due:open.filter(c=>['today','overdue'].includes(followupStatus(c.dueDate,today))).length,unassigned:open.filter(c=>c.owner==='none'||c.owner==='unavailable').length}
}

export const interactionTypes=['note','call','email','meeting','followup'] as const
export type InteractionType=typeof interactionTypes[number]
export const interactionLabels:Record<InteractionType,string>={note:'Note interne',call:'Appel',email:'E-mail',meeting:'Rendez-vous',followup:'Relance'}
