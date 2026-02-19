/**
 * Shared server state — lightweight singleton for cross-module state.
 * Avoids circular imports between index.js ↔ routes/health.js.
 *
 * Usage:
 *   import { serverState } from '../services/serverState.js'
 *   serverState.cacheWarmedAt = Date.now()  // set in index.js
 *   serverState.cacheWarmedAt               // read in health.js
 */
export const serverState = {
  /** Timestamp when initial cache warming completed (null = not yet / failed) */
  cacheWarmedAt: null,
}
