import { rateLimit } from 'express-rate-limit'

/**
 * Rate limiters with Hebrew user-facing error messages.
 * Consistent with errorHandler.js Hebrew translation layer.
 * Each limiter returns errorCode for client-side programmatic handling
 * and retryAfter (seconds) so the UI can show a countdown.
 */

export const leadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'יותר מדי פניות — נסה שוב בעוד שעה',
    errorCode: 'RATE_LIMIT_LEADS',
    retryAfter: 3600,
  },
})

export const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'יותר מדי בקשות צ׳אט — נסה שוב בעוד דקה',
    errorCode: 'RATE_LIMIT_CHAT',
    retryAfter: 3600,
  },
})

/**
 * Burst limiter for AI chat — prevents rapid-fire requests that burn Claude API credits.
 * Allows max 3 messages per minute per IP, then forces a cooldown.
 * Stacks with chatLimiter (20/hr) for layered protection.
 */
export const chatBurstLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'אנא המתן מספר שניות בין הודעות',
    errorCode: 'RATE_LIMIT_CHAT_BURST',
    retryAfter: 60,
  },
})

/**
 * Export rate limiter — prevents CSV/data export abuse.
 * Max 5 exports per 15 minutes per IP.
 */
export const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'יותר מדי ייצואים — נסה שוב בעוד מספר דקות',
    errorCode: 'RATE_LIMIT_EXPORT',
    retryAfter: 900,
  },
})

/**
 * Compute-heavy endpoint rate limiter — protects CPU-intensive routes:
 * /api/plots/:id/similar, /api/plots/:id/nearby, /api/plots/featured, /api/plots/popular
 *
 * These endpoints iterate ALL plots with O(n) scoring algorithms (multi-factor similarity,
 * geo-distance, deal scoring). Without a dedicated limiter, the global 200/15min allows
 * a single client to hammer these ~13 times/min, each triggering a full dataset scan.
 *
 * Limit: 30 requests per 5 minutes per IP — sufficient for normal browsing
 * (opening ~6 plots/min, each fetching similar+nearby), but blocks scraping/abuse.
 */
export const computeHeavyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'יותר מדי בקשות כבדות — נסה שוב בעוד מספר דקות',
    errorCode: 'RATE_LIMIT_COMPUTE',
    retryAfter: 300,
  },
})

/**
 * Web Vitals beacon rate limiter — prevents flooding the vitals endpoint.
 * Each page load reports ~5 metrics (LCP, INP, CLS, TTFB, FID).
 * Limit: 20 per minute per IP — covers 4 page loads/min with headroom.
 */
export const vitalsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  // Silently drop excess — don't waste bandwidth on error responses for beacons
  handler: (req, res) => res.status(204).end(),
})
