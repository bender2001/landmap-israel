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
