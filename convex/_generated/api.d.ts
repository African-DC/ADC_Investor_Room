// Bootstrap bindings, regenerate via convex dev before provisioning.
import type * as investors from '../investors.js'
import type { ApiFromModules,FilterApi,FunctionReference } from 'convex/server'
declare const fullApi:ApiFromModules<{investors:typeof investors}>
export declare const api:FilterApi<typeof fullApi,FunctionReference<'query'|'mutation'|'action','public'>>
export declare const internal:FilterApi<typeof fullApi,FunctionReference<'query'|'mutation'|'action','internal'>>
export declare const components:{betterAuth:import('@convex-dev/better-auth/_generated/component.js').ComponentApi<'betterAuth'>}
