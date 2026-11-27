import {spawnSync} from 'node:child_process'
// Production uses the existing, scoped Vercel secret. Preview builds must never deploy to production.
const env=process.env
const production=env.VERCEL_ENV==='production'
if(production&&(!env.CONVEX_DEPLOY_KEY||!env.VITE_CONVEX_URL||!env.VITE_CONVEX_SITE_URL)){
  console.error('ADC: required production deployment configuration missing.')
  process.exit(1)
}
const childEnv={...env}
if(!production)delete childEnv.CONVEX_DEPLOY_KEY
const command=production?'npx':'npm'
const args=production?['--no-install','convex','deploy','--typecheck','enable','--cmd-url-env-var-name','ADC_RESOLVED_CONVEX_URL','--cmd','node scripts/verify-convex-target.mjs && npm run build']:['run','build']
const result=spawnSync(command,args,{env:childEnv,stdio:'inherit',shell:process.platform==='win32'})
if(result.error){console.error('ADC: build command could not start.');process.exit(1)}
process.exit(result.status??1)
