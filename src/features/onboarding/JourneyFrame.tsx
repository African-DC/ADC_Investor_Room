import { Globe2, LockKeyhole } from 'lucide-react'
import type { ReactNode } from 'react'
export type Lang='fr'|'en'
// Shared immersive frame for secondary public pages (confirm, access, not found).
export type Space='investor'|'admin'|'neutral'
const spaces:Record<Space,[string,string]>={investor:['ESPACE PRIVÉ · INVESTISSEURS','PRIVATE SPACE · INVESTORS'],admin:['ADMINISTRATION ADC','ADC ADMINISTRATION'],neutral:['ADC INVESTOR ROOM','ADC INVESTOR ROOM']}
export function JourneyFrame({lang,setLang,children,tone='default',space='investor'}:{lang:Lang;setLang:(l:Lang)=>void;children:ReactNode;tone?:'default'|'success'|'alert';space?:Space}){
 return <main className={'journey-shell journey-frame tone-'+tone+' space-'+space} lang={lang}>
  <div className="journey-atmosphere" aria-hidden="true"><span/><span/><span/><i/><i/></div>
  <header className="journey-header">
   <a className="journey-wordmark" href="/" aria-label="African Digit Consulting"><img src="/adc-logo-mark.png" alt=""/><span><span className="journey-dot"/>{spaces[space][lang==='fr'?0:1]}</span></a>
   <div className="journey-controls"><button type="button" className="journey-control" onClick={()=>setLang(lang==='fr'?'en':'fr')} aria-label={lang==='fr'?'Switch to English':'Passer en français'}><Globe2 size={17}/>{lang==='fr'?'EN':'FR'}</button></div>
  </header>
  <section className="frame-stage"><div className="frame-card">{children}</div></section>
  <footer className="journey-footer"><span><LockKeyhole size={14}/>{lang==='fr'?'Accès privé et confidentiel':'Private, confidential access'}</span><span>African Digit Consulting © 2026</span><span className="journey-footer-edition">Investor Room</span></footer>
 </main>
}
