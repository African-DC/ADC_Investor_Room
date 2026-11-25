import type {Kind} from './registry'
export type Snapshot={id:string;sectionId:string;kind:Kind;scope:string;periodStart:string;periodEnd:string;definitionFr:string;definitionEn:string;value:number;unit:'XOF'|'count'}
export function comparableSeries<T extends Snapshot>(metrics:readonly T[]){
 const groups=new Map<string,T[]>()
 for(const m of metrics){
  if(!Number.isSafeInteger(m.value)||m.kind==='fund_use'||m.kind==='fundraise_target')continue
  const key=JSON.stringify([m.sectionId,m.kind,m.scope,m.unit,m.definitionFr.trim(),m.definitionEn.trim()])
  const rows=groups.get(key)??[];rows.push(m);groups.set(key,rows)
 }
 return [...groups.entries()].flatMap(([key,rows])=>{
  const sorted=[...rows].sort((a,b)=>a.periodStart.localeCompare(b.periodStart)||a.periodEnd.localeCompare(b.periodEnd))
  // Reject overlaps or duplicate periods rather than silently summing snapshots.
  if(sorted.length<2||sorted.some((m,i)=>i>0&&m.periodStart<=sorted[i-1]!.periodEnd))return []
  // For flow metrics, compare only equal calendar granularity, not a month with a year.
  const granularity=(m:T)=>{
   const start=new Date(m.periodStart+'T00:00:00Z'),end=new Date(m.periodEnd+'T00:00:00Z')
   const next=new Date(end.getTime()+86400000)
   if(start.getUTCDate()===1&&next.getUTCDate()===1)return 'months:'+((next.getUTCFullYear()-start.getUTCFullYear())*12+next.getUTCMonth()-start.getUTCMonth())
   return 'days:'+((end.getTime()-start.getTime())/86400000+1)
  }
  if(['invoiced','collected','recognized_revenue','forecast'].includes(sorted[0]!.kind)&&new Set(sorted.map(granularity)).size!==1)return []
  return [{key,rows:sorted}]
 })
}
