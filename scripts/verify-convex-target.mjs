import {verifyConvexTarget} from './convex-release-target.mjs'
try{verifyConvexTarget(process.env);console.log('ADC: configured production Convex endpoints verified.')}
catch(error){console.error('ADC: '+(error instanceof Error?error.message:'Convex target verification failed'));process.exitCode=1}
