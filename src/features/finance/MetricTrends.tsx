import {useState} from 'react'
import {comparableSeries} from './series'
import {labels,formatMetric} from './registry'
import type {MetricView} from './FinanceView'
export function MetricTrends({metrics,lang}:{metrics:MetricView[];lang:'fr'|'en'}){
 const series=comparableSeries(metrics)
 const [selected,setSelected]=useState('')
 if(!series.length)return null
 const current=series.find(s=>s.key===selected)??series[0]!
 const fr=lang==='fr',first=current.rows[0]!,max=Math.max(1,...current.rows.map(r=>Math.abs(r.value)))
 return <div className="metric-trends"><h3>{fr?'Évolution par période':'Trends by period'}</h3><p>{fr?'Même périmètre, définition et unité. Les périodes ne sont pas additionnées.':'Same scope, definition and unit. Periods are not added together.'}</p><label className="field">{fr?'Série comparable':'Comparable series'}<select value={current.key} onChange={e=>setSelected(e.target.value)}>{series.map(s=><option key={s.key} value={s.key}>{labels[s.rows[0]!.kind][fr?0:1]} · {s.rows[0]!.scope}</option>)}</select></label><p>{fr?first.definitionFr:first.definitionEn}</p><div className="trend-rows">{current.rows.map(r=><div key={r.id} className="trend-row"><span>{r.periodStart} — {r.periodEnd}</span><div className="trend-track" aria-hidden="true"><div className="trend-half negative">{r.value<0&&<span style={{width:(Math.abs(r.value)/max*100)+'%'}}/>}</div><div className="trend-half positive">{r.value>0&&<span style={{width:(r.value/max*100)+'%'}}/>}</div></div><strong>{formatMetric(r.value,r.unit,lang)}</strong></div>)}</div></div>
}
