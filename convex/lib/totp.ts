// RFC 6238 TOTP (SHA-1, 6 digits, 30 s) + AES-GCM secret sealing. WebCrypto only (Convex runtime).
const ALPHA='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
export function base32Encode(bytes:Uint8Array){let bits=0,value=0,out='';for(const b of bytes){value=(value<<8)|b;bits+=8;while(bits>=5){out+=ALPHA[(value>>>(bits-5))&31];bits-=5}}if(bits>0)out+=ALPHA[(value<<(5-bits))&31];return out}
export function base32Decode(s:string){const clean=s.replace(/=+$/,'').toUpperCase();let bits=0,value=0;const out:number[]=[];for(const c of clean){const i=ALPHA.indexOf(c);if(i<0)throw new Error('Invalid secret');value=(value<<5)|i;bits+=5;if(bits>=8){out.push((value>>>(bits-8))&255);bits-=8}}return new Uint8Array(out)}
async function hotp(secret:Uint8Array,counter:number){
 const msg=new Uint8Array(8);let c=counter;for(let i=7;i>=0;i--){msg[i]=c&255;c=Math.floor(c/256)}
 const key=await crypto.subtle.importKey("raw",secret as BufferSource,{name:'HMAC',hash:'SHA-1'},false,['sign'])
 const h=new Uint8Array(await crypto.subtle.sign('HMAC',key,msg)),o=h[19]&15
 const code=((h[o]&127)<<24|h[o+1]<<16|h[o+2]<<8|h[o+3])%1000000
 return code.toString().padStart(6,'0')
}
/** Returns the matched time step (for replay protection) or null. Accepts ±1 step drift. */
export async function verifyTotp(secretB32:string,code:string,now:number,after=-1){
 if(!/^\d{6}$/.test(code))return null
 const secret=base32Decode(secretB32),step=Math.floor(now/30000)
 for(const s of [step-1,step,step+1]){if(s<=after)continue;if(timingSafe(await hotp(secret,s),code))return s}
 return null
}
export async function totpAt(secretB32:string,now:number){return hotp(base32Decode(secretB32),Math.floor(now/30000))}
function timingSafe(a:string,b:string){if(a.length!==b.length)return false;let r=0;for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0}
function hexBytes(hex:string){if(!/^[a-f0-9]{64}$/.test(hex))throw new Error('MFA key misconfigured');return new Uint8Array(hex.match(/../g)!.map(h=>parseInt(h,16)))}
async function aesKey(){return crypto.subtle.importKey("raw",hexBytes(process.env.ADC_MFA_KEY??"") as BufferSource,'AES-GCM',false,['encrypt','decrypt'])}
const b64=(u:Uint8Array)=>btoa(String.fromCharCode(...u)),unb64=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0))
export async function seal(plain:string,iv:Uint8Array){const ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv:iv as BufferSource},await aesKey(),new TextEncoder().encode(plain)));return b64(iv)+'.'+b64(ct)}
export async function unseal(sealed:string){const [iv,ct]=sealed.split('.');return new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(iv!) as BufferSource},await aesKey(),unb64(ct!) as BufferSource))}
export async function sha256Hex(s:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('')}
export function normalizeRecovery(code:string){return code.toUpperCase().replace(/[^A-Z0-9]/g,'')}
