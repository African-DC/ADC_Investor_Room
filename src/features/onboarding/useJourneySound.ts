import {useEffect,useRef,useState} from 'react'
// Opt-in, synthesized sound design (no assets, no network). Muted by default.
export type Cue='start'|'forward'|'back'|'select'|'success'
type Tone={f:number;at:number;len:number;type?:OscillatorType;gain?:number}
const chimes:Record<Cue,Tone[]>={
 start:[{f:261.63,at:0,len:.9,type:'triangle',gain:.03},{f:392,at:.08,len:.8},{f:523.25,at:.18,len:.9},{f:783.99,at:.32,len:1.1,gain:.018}],
 forward:[{f:587.33,at:.06,len:.35},{f:880,at:.14,len:.45,gain:.022}],
 back:[{f:659.25,at:.04,len:.3},{f:493.88,at:.12,len:.4,gain:.022}],
 select:[{f:1046.5,at:0,len:.12,gain:.015}],
 success:[{f:523.25,at:0,len:.6},{f:659.25,at:.1,len:.6},{f:783.99,at:.2,len:.7},{f:1046.5,at:.32,len:1.2,gain:.024},{f:1567.98,at:.46,len:1,gain:.01}],
}
const sweeps:Partial<Record<Cue,[number,number,number]>>={start:[300,2400,.9],forward:[500,2600,.32],back:[2200,500,.3],success:[400,4000,.7]}
export function useJourneySound(){
 const [enabled,setEnabled]=useState(false)
 const context=useRef<AudioContext|null>(null),allowed=useRef(false)
 useEffect(()=>()=>{const ctx=context.current;context.current=null;if(ctx)void ctx.close().catch(()=>{})},[])
 function whoosh(ctx:AudioContext,out:AudioNode,[from,to,len]:[number,number,number]){
  const now=ctx.currentTime,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*len),ctx.sampleRate),data=buffer.getChannelData(0)
  for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1
  const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain()
  src.buffer=buffer;filter.type='bandpass';filter.Q.value=1.2;filter.frequency.setValueAtTime(from,now);filter.frequency.exponentialRampToValueAtTime(to,now+len)
  gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.05,now+len*.35);gain.gain.exponentialRampToValueAtTime(.0001,now+len)
  src.connect(filter);filter.connect(gain);gain.connect(out);src.onended=()=>{src.disconnect();filter.disconnect();gain.disconnect()};src.start(now);src.stop(now+len)
 }
 function play(cue:Cue,force=false){
  if(!allowed.current&&!force)return
  try{
   if(!window.AudioContext)return
   const ctx=context.current??new AudioContext();context.current=ctx
   const render=()=>{
    if(!allowed.current||context.current!==ctx||ctx.state!=='running')return
    const now=ctx.currentTime,master=ctx.createGain(),delay=ctx.createDelay(),feedback=ctx.createGain(),wet=ctx.createGain()
    // Gentle echo gives an airy, premium tail.
    master.gain.value=.9;delay.delayTime.value=.19;feedback.gain.value=.28;wet.gain.value=.35
    master.connect(ctx.destination);master.connect(delay);delay.connect(feedback);feedback.connect(delay);delay.connect(wet);wet.connect(ctx.destination)
    const sweep=sweeps[cue];if(sweep)whoosh(ctx,master,sweep)
    for(const tone of chimes[cue]){
     const start=now+tone.at,osc=ctx.createOscillator(),gain=ctx.createGain()
     osc.type=tone.type??'sine';osc.frequency.value=tone.f
     gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(tone.gain??.03,start+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+tone.len)
     osc.connect(gain);gain.connect(master);osc.onended=()=>{osc.disconnect();gain.disconnect()};osc.start(start);osc.stop(start+tone.len+.02)
    }
    window.setTimeout(()=>{try{master.disconnect();delay.disconnect();feedback.disconnect();wet.disconnect()}catch{/* already closed */}},2600)
   }
   if(ctx.state==='suspended')void ctx.resume().then(render).catch(()=>{})
   else render()
  }catch{/* Sound is optional: never block onboarding. */}
 }
 function toggle(){if(allowed.current){allowed.current=false;setEnabled(false);const ctx=context.current;if(ctx){context.current=null;void ctx.close().catch(()=>{})}}else{allowed.current=true;setEnabled(true);play('select',true)}}
 return {enabled,toggle,play}
}
