export const retentionDays=90
export const utcDay=(at:number)=>new Date(at).toISOString().slice(0,10)
export type EngagementKind='section_open'|'document_view_authorized'|'document_download_authorized'
export function summarize(rows:readonly {day:string;kind:EngagementKind;authUserId:string;resourceId:string}[]){
 const days=new Map<string,number>(),resources=new Map<string,{kind:EngagementKind;resourceId:string;count:number}>(),users=new Set<string>()
 for(const r of rows){users.add(r.authUserId);days.set(r.day,(days.get(r.day)??0)+1);const k=r.kind+':'+r.resourceId;const item=resources.get(k)??{kind:r.kind,resourceId:r.resourceId,count:0};item.count++;resources.set(k,item)}
 return {participants:users.size,events:rows.length,sections:rows.filter(r=>r.kind==='section_open').length,views:rows.filter(r=>r.kind==='document_view_authorized').length,downloads:rows.filter(r=>r.kind==='document_download_authorized').length,days:[...days].sort(([a],[b])=>a.localeCompare(b)).map(([day,count])=>({day,count})),resources:[...resources.values()].sort((a,b)=>b.count-a.count)}
}
