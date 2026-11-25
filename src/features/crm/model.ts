import {validDate} from '../finance/registry'
export const stages=['new','contacted','qualified','due_diligence','negotiation','committed','closed','declined'] as const
export type Stage=typeof stages[number]
export const stageLabels:Record<Stage,string>={new:'Nouveau',contacted:'Contacté',qualified:'Qualifié',due_diligence:'Due diligence',negotiation:'Négociation',committed:'Engagement déclaré',closed:'Clôturé',declined:'Non retenu'}
export function validFollowup(action:string,dueDate?:string){return action.length<=500&&(!dueDate||(validDate(dueDate)&&action.trim().length>0))}
export function followupStatus(dueDate:string|null,today:string){return !dueDate?'none':dueDate<today?'overdue':dueDate===today?'today':'upcoming'}
