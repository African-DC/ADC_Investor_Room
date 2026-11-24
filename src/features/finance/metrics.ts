export type MetricKind='invoiced'|'collected'|'recognized_revenue'|'arr'|'forecast'
export type Metric={kind:MetricKind;amountXof:number;period:string;status:'draft'|'review'|'published';evidenceIds:string[]}
export function publishable(metric:Metric):boolean{
 return Number.isSafeInteger(metric.amountXof)&&metric.period.trim().length>0&&metric.status==='published'&&metric.evidenceIds.some(id=>id.trim().length>0)
}
export function sumMetrics(metrics:readonly Metric[],kind:MetricKind,period:string):number{
 const total=metrics.filter(m=>publishable(m)&&m.kind===kind&&m.period===period).reduce((a,m)=>a+m.amountXof,0)
 if(!Number.isSafeInteger(total))throw new RangeError('Unsafe XOF total')
 return total
}
