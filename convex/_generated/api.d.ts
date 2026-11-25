/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as crm from "../crm.js";
import type * as crons from "../crons.js";
import type * as documents from "../documents.js";
import type * as finance from "../finance.js";
import type * as http from "../http.js";
import type * as intelligence from "../intelligence.js";
import type * as investors from "../investors.js";
import type * as lib_adminPolicy from "../lib/adminPolicy.js";
import type * as lib_hash from "../lib/hash.js";
import type * as lib_roomPolicy from "../lib/roomPolicy.js";
import type * as portal from "../portal.js";
import type * as qa from "../qa.js";
import type * as stagingCms from "../stagingCms.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  analytics: typeof analytics;
  auth: typeof auth;
  crm: typeof crm;
  crons: typeof crons;
  documents: typeof documents;
  finance: typeof finance;
  http: typeof http;
  intelligence: typeof intelligence;
  investors: typeof investors;
  "lib/adminPolicy": typeof lib_adminPolicy;
  "lib/hash": typeof lib_hash;
  "lib/roomPolicy": typeof lib_roomPolicy;
  portal: typeof portal;
  qa: typeof qa;
  stagingCms: typeof stagingCms;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
