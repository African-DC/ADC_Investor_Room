export const MAX_UPLOAD=3*1024*1024
export const MAX_REQUEST=MAX_UPLOAD+32*1024
export const pdfCategories=['company','products','investment','finance','traction','team','technology','legal','compliance','other'] as const
export function isPdf(bytes:Uint8Array){return bytes.length>=5&&bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70&&bytes[4]===45}
export function validUpload(meta:{titleFr:string;titleEn:string;category:string;sizeBytes:number}){
 return meta.titleFr.trim().length>0&&meta.titleFr.length<=180&&meta.titleEn.trim().length>0&&meta.titleEn.length<=180&&(pdfCategories as readonly string[]).includes(meta.category)&&Number.isSafeInteger(meta.sizeBytes)&&meta.sizeBytes>=5&&meta.sizeBytes<=MAX_UPLOAD
}
