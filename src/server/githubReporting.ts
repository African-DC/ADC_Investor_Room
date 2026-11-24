import {z} from 'zod'
import {targetsFor} from '../features/technical/model'
import type {Snapshot} from '../features/technical/model'
const repoSchema=z.object({full_name:z.string(),archived:z.boolean(),default_branch:z.string().max(255),pushed_at:z.string().nullable()})
const releaseSchema=z.object({tag_name:z.string().max(180),published_at:z.string().nullable(),draft:z.boolean(),prerelease:z.boolean()})
const pullSchema=z.array(z.object({merged_at:z.string().nullable()})).max(30)
export async function getTechnicalSnapshot(roomId:string,key:string):Promise<Snapshot>{
 const target=targetsFor(process.env.ADC_GITHUB_TARGETS,roomId).find(t=>t.key===key),token=process.env.ADC_GITHUB_READ_TOKEN
 if(process.env.ADC_GITHUB_REPORTING_ENABLED!=='true'||!target||!token)throw Error('Unavailable')
 const base='https://api.github.com/repos/'+target.repo.split('/').map(encodeURIComponent).join('/')
 async function get(path:string,optional=false){
  const res=await fetch(base+path,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'ADC-Investor-Room'},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)})
  if(optional&&res.status===404)return null
  if(!res.ok)throw Error('GitHub unavailable')
  return res.json() as Promise<unknown>
 }
 const [raw,rel,prs]=await Promise.all([get(''),get('/releases/latest',true),get('/pulls?state=closed&sort=updated&direction=desc&per_page=30')])
 const repo=repoSchema.parse(raw),release=rel===null?null:releaseSchema.parse(rel),sample=pullSchema.parse(prs)
 if(repo.full_name.toLowerCase()!==target.repo.toLowerCase())throw Error('Unexpected repository')
 return {key:target.key,label:target.label,observedAt:new Date().toISOString(),archived:repo.archived,defaultBranch:repo.default_branch,lastPush:repo.pushed_at,latestRelease:release&&!release.draft&&!release.prerelease?release.tag_name:null,releaseDate:release&&!release.draft&&!release.prerelease?release.published_at:null,closedPrSample:sample.length,mergedPrSample:sample.filter(p=>p.merged_at!==null).length}
}
