import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import css from '../styles.css?url'
import { JourneyFrame } from '../features/onboarding/JourneyFrame'
import type { Lang } from '../features/onboarding/JourneyFrame'
const SITE='https://dataroom.africandigitconsulting.com'
const TITLE='ADC Investor Room — African Digit Consulting'
const DESCRIPTION='Espace investisseurs privé d’African Digit Consulting : découvrez notre vision, KLASSCI, WOURI et nos opportunités. Accès sur invitation, confidentiel et sécurisé.'
export const Route = createRootRoute({
 head: () => ({
  meta: [
   {charSet:'utf-8'},{name:'viewport',content:'width=device-width, initial-scale=1, viewport-fit=cover'},{title:TITLE},
   {name:'description',content:DESCRIPTION},{name:'robots',content:'noindex, nofollow'},{name:'theme-color',content:'#fbf7f2'},
   {property:'og:type',content:'website'},{property:'og:site_name',content:'African Digit Consulting'},{property:'og:locale',content:'fr_FR'},{property:'og:locale:alternate',content:'en_US'},
   {property:'og:url',content:SITE},{property:'og:title',content:TITLE},{property:'og:description',content:DESCRIPTION},
   {property:'og:image',content:SITE+'/og-image.jpg'},{property:'og:image:secure_url',content:SITE+'/og-image.jpg'},{property:'og:image:type',content:'image/jpeg'},{property:'og:image:width',content:'1200'},{property:'og:image:height',content:'630'},{property:'og:image:alt',content:'ADC Investor Room — Bienvenue chez African Digit Consulting'},
   {name:'twitter:card',content:'summary_large_image'},{name:'twitter:title',content:TITLE},{name:'twitter:description',content:DESCRIPTION},{name:'twitter:image',content:SITE+'/og-image.jpg'},
  ],
  links:[{rel:'preconnect',href:'https://fonts.googleapis.com'},{rel:'preconnect',href:'https://fonts.gstatic.com',crossOrigin:'anonymous'},{rel:'stylesheet',href:'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Montserrat:wght@400;600;700&family=Poppins:wght@400;500;600;700&display=swap'},{rel:'stylesheet',href:css},{rel:'icon',type:'image/png',sizes:'64x64',href:'/favicon.png'},{rel:'apple-touch-icon',href:'/apple-touch-icon.png'},{rel:'canonical',href:SITE}],
 }),
 component: Root,
 notFoundComponent: NotFound,
})
function Root(){return <html lang="fr"><head><HeadContent/></head><body><Outlet/><Scripts/></body></html>}
function NotFound(){
 const [lang,setLang]=useState<Lang>('fr')
 return <JourneyFrame space="neutral" lang={lang} setLang={setLang}>
  <p className="frame-numeral" aria-hidden="true">404</p>
  <h1>{lang==='fr'?'Ce chemin n’existe pas.':'This path does not exist.'}</h1>
  <p className="frame-lead">{lang==='fr'?'La page demandée est introuvable ou n’est plus disponible. Reprenons depuis l’accueil.':'The page you requested cannot be found or is no longer available. Let’s start again from the welcome page.'}</p>
  <a className="primary journey-primary" href="/"><span>{lang==='fr'?'Retour à l’accueil':'Back to welcome'}</span><ArrowRight size={19}/></a>
 </JourneyFrame>
}
