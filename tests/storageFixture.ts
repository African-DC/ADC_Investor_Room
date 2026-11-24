import type {Id} from '../convex/_generated/dataModel'
// Synthetic PDF bytes stored through convex-test's Convex File Storage emulation.
export async function storePdf(t:{run:<T>(fn:(ctx:{storage:{store:(b:Blob)=>Promise<Id<'_storage'>>}})=>Promise<T>)=>Promise<T>},label='fixture'){
 const bytes=new TextEncoder().encode(`%PDF-1.4\n% synthetic ${label}\n%%EOF\n`)
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))
 const sha256=[...digest].map(b=>b.toString(16).padStart(2,'0')).join('')
 const storageId=await t.run(ctx=>ctx.storage.store(new Blob([bytes],{type:'application/pdf'})))
 return {storageId,sha256,sizeBytes:bytes.length}
}
