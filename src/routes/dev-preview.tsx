import { createFileRoute,notFound } from '@tanstack/react-router'
import { useState } from 'react'
import { InvestorRoom } from '../features/portal/InvestorRoom'
import type { Overview } from '../features/portal/InvestorRoom'
// DEV-ONLY visual harness. Synthetic placeholders, no real ADC content. 404 in production builds.
const lorem='Contenu de démonstration (fictif). Cette section sera rédigée et validée par ADC avant publication.\n\nLe texte définitif proviendra du CMS après relecture par un second administrateur.'
const sec=(id:string,slug:string,category:string,titleFr:string,order:number)=>({id,versionId:'v'+id,slug,category,order,titleFr,titleEn:titleFr,bodyFr:lorem,bodyEn:'Demo placeholder (synthetic). ADC will write and approve this section before publication.',publishedAt:Date.UTC(2026,10,20)})
const base:Overview={name:'Investisseur Démo',rooms:[{id:'r1',name:'Salle de démonstration'},{id:'r2',name:'Autre salle (démo)'}],room:{id:'r1',name:'Salle de démonstration'},nda:null,
 sections:[sec('s1','adc-overview','company','African Digit Consulting',10),sec('s2','klassci','products','KLASSCI',20),sec('s3','wouri','products','WOURI',30),sec('s4','investment','investment','Investissement et utilisation des fonds',40),sec('s5','traction','traction','Traction et adoption',60),sec('s6','team','team','Équipe et recrutement',70)],
 documents:[{id:'d1',titleFr:'Document de démonstration',titleEn:'Demo document',category:'company',version:1,sizeBytes:248000,download:false},{id:'d2',titleFr:'Autre document fictif',titleEn:'Another demo file',category:'legal',version:2,sizeBytes:1200000,download:true}],
 metrics:[],qaEnabled:false,questions:[],analytics:{allowed:false},aiEnabled:false,aiExternal:false}
export const Route=createFileRoute('/dev-preview')({beforeLoad:()=>{if(!import.meta.env.DEV)throw notFound()},validateSearch:(s:Record<string,unknown>)=>({state:typeof s.state==='string'?s.state:'room'}),component:Preview})
function Preview(){
 const {state}=Route.useSearch()
 const [data]=useState<Overview>(()=>state==='nda'?{...base,nda:{version:'NDA-2026-01',textFr:'Texte d’accord de confidentialité fictif pour la démonstration.\n\n'.repeat(8),textEn:'Demo NDA text.'}}:state==='noroom'?{...base,room:null,rooms:[],sections:[],documents:[]}:state==='empty'?{...base,sections:[],documents:[]}:base)
 const ok=async()=>({ok:true})
 return <InvestorRoom initial={data} refresh={async()=>data} acceptNda={ok} questionRead={async()=>null} questionSend={ok} engagement={ok} intelligence={async()=>({status:'empty'} as never)}/>
}
