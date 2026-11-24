export type Passage={key:string;sectionId:string;version:string;title:string;text:string;kind:'section'|'metric';externalApproved:boolean}
const stop=new Set('a an the is are was were be to of in on for with and or what which how who when where why can you me please i we our your it do does le la les un une des du de et ou en est sont dans pour par sur avec quel quelle quels quelles que quoi qui comment combien pourquoi quand nous vous je tu il elle au aux ce cette ces son sa ses notre votre mes mon ma moi peut peux savoir donner tell about show'.split(' '))
export function terms(s:string){return [...new Set(s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>=3&&!stop.has(w)))].slice(0,32)}
export function rank(question:string,passages:readonly Passage[]){
 const q=terms(question);if(!q.length)return []
 return passages.map(p=>{const title=new Set(terms(p.title)),text=new Set(p.text.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().split(/[^\p{L}\p{N}]+/u));return {p,score:q.reduce((sum,w)=>sum+(title.has(w)?3:0)+(text.has(w)?1:0),0)}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.p.key.localeCompare(b.p.key)).slice(0,6).map(x=>x.p)
}
export function chunks(text:string){const parts=text.split(/\n+/).map(s=>s.trim()).filter(Boolean);return parts.flatMap(s=>{const out:string[]=[];for(let i=0;i<s.length;i+=1000)out.push(s.slice(i,i+1000));return out}).slice(0,40)}
export function exactSelection(keys:readonly string[],candidates:readonly Passage[]){
 if(keys.length>4||new Set(keys).size!==keys.length||keys.some(k=>!candidates.some(p=>p.key===k)))return []
 return keys.map(k=>candidates.find(p=>p.key===k)!)
}
export function unchanged(selected:readonly Passage[],current:readonly Passage[]){
 return selected.every(p=>current.some(c=>c.key===p.key&&c.sectionId===p.sectionId&&c.version===p.version&&c.text===p.text&&c.title===p.title&&c.externalApproved===p.externalApproved))
}
export type Answer={status:'ok'|'no_evidence'|'unavailable'|'limit';sources:{sectionId:string;title:string;text:string;kind:'section'|'metric'}[]}
