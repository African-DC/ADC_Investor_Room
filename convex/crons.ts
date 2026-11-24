import {cronJobs} from 'convex/server'
import {internal} from './_generated/api'
const crons=cronJobs()
// Bounded purge; recurring deletion also runs when analytics collection is disabled.
crons.interval('engagement retention',{hours:1},internal.analytics.purge,{})
export default crons
