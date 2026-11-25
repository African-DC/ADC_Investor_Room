import { useState } from 'react'
import { Tabs,TabsList,TabsTab,TabsPanel } from '@ui-sdk/react/tabs'
import { MetricTrends } from './MetricTrends'
import { labels,formatMetric } from './registry'
import type { Kind } from './registry'
export type MetricView={id:string;sectionId:string;kind:Kind;scope:string;periodStart:string;periodEnd:string;definitionFr:string;definitionEn:string;value:number;unit:'XOF'|'count'}
const groups=[['revenue',['invoiced','collected','recognized_revenue','arr','forecast']],['traction',['paying_accounts','paying_sites','pilot_sites','active_users']],['investment',['fundraise_target','fund_use']]] as const
export function FinanceView({metrics,lang}:{metrics:MetricView[];lang:'fr'|'en'}){
 const [period,setPeriod]=useState('all')
 if(!metrics.length)return null
 const periods=[...new Set(metrics.map(m=>m.periodStart+' / '+m.periodEnd))].sort().reverse()
 const visible=metrics.filter(m=>period==='all'||period===m.periodStart+' / '+m.periodEnd)
 const fr=lang==='fr'
 return <section className="room-card admin-card"><h2>{fr?'Indicateurs validés':'Approved metrics'}</h2><p>{fr?'Chaque montant conserve sa définition et sa période. Aucun total ne mélange ces catégories.':'Each amount retains its definition and period. Categories are never summed together.'}</p><label className="field">{fr?'Période':'Period'}<select value={period} onChange={e=>setPeriod(e.target.value)}><option value="all">{fr?'Toutes les périodes':'All periods'}</option>{periods.map(p=><option key={p}>{p}</option>)}</select></label><Tabs defaultValue="revenue"><TabsList className="admin-tabs" aria-label={fr?'Indicateurs':'Metrics'}><TabsTab value="revenue">{fr?'Finances':'Financials'}</TabsTab><TabsTab value="traction">Traction</TabsTab><TabsTab value="investment">{fr?'Investissement':'Investment'}</TabsTab></TabsList>{groups.map(([key,kinds])=><TabsPanel key={key} value={key}><div className="admin-grid">{visible.filter(m=>(kinds as readonly string[]).includes(m.kind)).map(m=><article className="room-card" key={m.id}><p className="eyebrow">{labels[m.kind][fr?0:1]}</p><div className="admin-stat">{formatMetric(m.value,m.unit,lang)}</div><p>{m.scope} · {m.periodStart} — {m.periodEnd}</p><p>{fr?m.definitionFr:m.definitionEn}</p></article>)}</div>{period==='all'&&<MetricTrends metrics={visible.filter(m=>(kinds as readonly string[]).includes(m.kind))} lang={lang}/>}{!visible.some(m=>(kinds as readonly string[]).includes(m.kind))&&<p>{fr?'Aucun indicateur publié pour cette période.':'No published metrics for this period.'}</p>}</TabsPanel>)}</Tabs></section>
}
