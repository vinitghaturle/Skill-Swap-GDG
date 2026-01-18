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
import type * as auth from "../auth.js";
import type * as calls from "../calls.js";
import type * as chat from "../chat.js";
import type * as compliance from "../compliance.js";
import type * as fcm from "../fcm.js";
import type * as files from "../files.js";
import type * as logs from "../logs.js";
import type * as matching from "../matching.js";
import type * as notifications from "../notifications.js";
import type * as presence from "../presence.js";
import type * as profiles from "../profiles.js";
import type * as ratings from "../ratings.js";
import type * as safety from "../safety.js";
import type * as security from "../security.js";
import type * as sessions from "../sessions.js";
import type * as skills from "../skills.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  calls: typeof calls;
  chat: typeof chat;
  compliance: typeof compliance;
  fcm: typeof fcm;
  files: typeof files;
  logs: typeof logs;
  matching: typeof matching;
  notifications: typeof notifications;
  presence: typeof presence;
  profiles: typeof profiles;
  ratings: typeof ratings;
  safety: typeof safety;
  security: typeof security;
  sessions: typeof sessions;
  skills: typeof skills;
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

export declare const components: {};
