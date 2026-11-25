import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import css from '../styles.css?url'
export const Route = createRootRoute({
 head: () => ({ meta: [{charSet:'utf-8'}, {name:'viewport',content:'width=device-width, initial-scale=1'}, {title:'ADC Investor Room'}, {name:'robots',content:'noindex, nofollow'}], links:[{rel:'stylesheet',href:css}] }),
 component: Root,
})
function Root(){return <html lang="fr"><head><HeadContent/></head><body><Outlet/><Scripts/></body></html>}
