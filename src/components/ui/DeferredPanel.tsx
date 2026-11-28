import {Component,Suspense,type ReactNode} from 'react'
type Props={children:ReactNode;lang?:'fr'|'en'}
class ChunkBoundary extends Component<Props,{failed:boolean}>{
 state={failed:false}
 static getDerivedStateFromError(){return {failed:true}}
 render(){
  const fr=this.props.lang!=='en'
  if(this.state.failed)return <section className="deferred-panel" role="alert"><span>{fr?'Cette rubrique n’a pas pu être chargée.':'This section could not be loaded.'}</span><button className="dr-btn ghost" onClick={()=>location.reload()}>{fr?'Recharger la page':'Reload page'}</button></section>
  return this.props.children
 }
}
export function DeferredPanel({children,lang='fr'}:Props){return <ChunkBoundary lang={lang}><Suspense fallback={<div className="deferred-panel" role="status"><span className="deferred-spinner" aria-hidden="true"/>{lang==='fr'?'Chargement de la rubrique…':'Loading section…'}</div>}>{children}</Suspense></ChunkBoundary>}
