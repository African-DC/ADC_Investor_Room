// Bootstrap bindings, regenerate via convex dev before provisioning.
import type * as investors from '../investors.js'
import type * as portal from '../portal.js'
import type * as documents from '../documents.js'
import type * as finance from '../finance.js'
import type * as admin from '../admin.js'
import type * as stagingCms from '../stagingCms.js'
import type { ApiFromModules,FilterApi,FunctionReference } from 'convex/server'
declare const fullApi:ApiFromModules<{investors:typeof investors;portal:typeof portal;stagingCms:typeof stagingCms;admin:typeof admin;documents:typeof documents;finance:typeof finance}>
export declare const api:FilterApi<typeof fullApi,FunctionReference<'query'|'mutation'|'action','public'>>
export declare const internal:FilterApi<typeof fullApi,FunctionReference<'query'|'mutation'|'action','internal'>>
export declare const components:{betterAuth:import('@convex-dev/better-auth/_generated/component.js').ComponentApi<'betterAuth'>}
