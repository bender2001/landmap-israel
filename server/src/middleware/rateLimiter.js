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
