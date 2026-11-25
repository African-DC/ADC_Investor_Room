import {useEffect,useRef,useState} from 'react'
type Cue='forward'|'back'|'success'
const notes:Record<Cue,number[]>={forward:[440,659.25],back:[440,329.63],success:[440,554.37,659.25]}
export function useJourneySound(){
 const [enabled,setEnabled]=useState(false)
 const context=useRef<AudioContext|null>(null),allowed=useRef(false)
 useEffect(()=>()=>{const ctx=context.current;context.current=null;if(ctx)void ctx.close().catch(()=>{})},[])
 function play(cue:Cue,force=false){
  if(!allowed.current&&!force)return
  try{
   if(!window.AudioContext)return
   const ctx=context.current??new AudioContext();context.current=ctx
   const render=()=>{
    if(!allowed.current||context.current!==ctx||ctx.state!=='running')return
    const now=ctx.currentTime
    notes[cue].forEach((frequency,i)=>{
     const start=now+i*.075,osc=ctx.createOscillator(),gain=ctx.createGain()
     osc.type='sine';osc.frequency.value=frequency
     gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.035,start+.018);gain.gain.exponentialRampToValueAtTime(.0001,start+.16)
     osc.connect(gain);gain.connect(ctx.destination);osc.onended=()=>{osc.disconnect();gain.disconnect()}
     osc.start(start);osc.stop(start+.17)
    })
   }
   if(ctx.state==='suspended')void ctx.resume().then(render).catch(()=>{})
   else render()
  }catch{/* Sound is optional: never block onboarding. */}
 }
 function toggle(){if(allowed.current){allowed.current=false;setEnabled(false);const ctx=context.current;if(ctx){context.current=null;void ctx.close().catch(()=>{})}}else{allowed.current=true;setEnabled(true);play('forward',true)}}
 return {enabled,toggle,play}
}
