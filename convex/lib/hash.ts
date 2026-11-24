// Convex `_storage.sha256` is base64 encoded in the deployed backend and convex-test;
// application code computes lowercase hex. Compare both forms strictly.
const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
export function hexToBase64(hex:string){
 if(!/^[a-f0-9]{64}$/.test(hex))return null
 const bytes=hex.match(/../g)!.map(h=>parseInt(h,16))
 let out=''
 for(let i=0;i<bytes.length;i+=3){
  const [a,b,c]=[bytes[i],bytes[i+1],bytes[i+2]],n=(a<<16)|((b??0)<<8)|(c??0)
  out+=B64[(n>>18)&63]+B64[(n>>12)&63]+(b===undefined?'=':B64[(n>>6)&63])+(c===undefined?'=':B64[n&63])
 }
 return out
}
export function storageShaMatches(stored:string|undefined,hex:string){
 const b64=hexToBase64(hex)
 return !!stored&&!!b64&&(stored===b64||stored===hex)
}
