export type Target={key:string;label:string;repo:string;order:number}
export type Snapshot={key:string;label:string;observedAt:string;archived:boolean;defaultBranch:string;lastPush:string|null;latestRelease:string|null;releaseDate:string|null;closedPrSample:number;mergedPrSample:number}
export function targetsFor(raw:string|undefined,roomId:string):Target[]{
 if(!raw)return []
 try{
  const config:unknown=JSON.parse(raw)
  if(!config||typeof config!=='object'||Array.isArray(config)||!Object.prototype.hasOwnProperty.call(config,roomId))return []
  const rows=(config as Record<string,unknown>)[roomId]
  if(!Array.isArray(rows)||rows.length>10)return []
  const targets:Target[]=[]
  for(const row of rows){
   if(!row||typeof row!=='object'||typeof row.key!=='string'||!/^[a-z0-9-]{1,40}$/.test(row.key)||typeof row.label!=='string'||!row.label.trim()||row.label.length>100||typeof row.repo!=='string'||!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(row.repo)||row.repo.split('/').some((s:string)=>s==='.'||s==='..')||!Number.isSafeInteger(row.order)||row.order<0||row.order>10000||targets.some(t=>t.key===row.key))return []
   targets.push({key:row.key,label:row.label,repo:row.repo,order:row.order})
  }
  return targets
 }catch{return []}
}
export function draftText(s:Snapshot){
 const frDate=s.observedAt, release=s.latestRelease??'Non disponible',releaseEn=s.latestRelease??'Unavailable'
 return {titleFr:s.label+' — rapport technique',titleEn:s.label+' — technical report',bodyFr:`Observation UTC : ${frDate}\nDépôt archivé : ${s.archived?'oui':'non'}\nDernière activité push : ${s.lastPush??'Non disponible'}\nDernière release publiée : ${release} (${s.releaseDate??'date indisponible'})\nÉchantillon des ${s.closedPrSample} PR fermées les plus récemment mises à jour : ${s.mergedPrSample} fusionnées. Ce n'est pas un total historique ni un taux de livraison. Ces métadonnées ne démontrent pas la qualité, la sécurité ou l'adoption du produit.`,bodyEn:`Observed UTC: ${frDate}\nArchived repository: ${s.archived?'yes':'no'}\nLast push activity: ${s.lastPush??'Unavailable'}\nLatest published release: ${releaseEn} (${s.releaseDate??'date unavailable'})\nSample of ${s.closedPrSample} most recently updated closed PRs: ${s.mergedPrSample} merged. Not a historical total or delivery rate. These metadata do not establish product quality, security or adoption.`}
}
