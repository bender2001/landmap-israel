import { Router } from 'express'
import { analytics } from '../services/analyticsService.js'
import { vitalsLimiter } from '../middleware/rateLimiter.js'

const router = Router()

/**
 * POST /api/vitals — Collect Core Web Vitals from real user sessions.
 *
 * Previously, the client sent beacons to /api/admin/analytics which only had
 * GET handlers — all Web Vitals data was silently dropped (POST → 404).
 * This dedicated public endpoint accepts POST beacons without admin auth.
 *
 * Accepts: { type: 'web-vital', name: string, value: number, rating: string, url: string }
 * Response: 204 No Content (fire-and-forget from client perspective)
 *
 * Rate limited to 20/min/IP to prevent flooding.
 * No auth required — this is anonymous telemetry (like Google Analytics beacon).
 */
router.post('/', vitalsLimiter, (req, res) => {
  const { name, value, rating, url } = req.body || {}

  // Validate metric name — only accept known Web Vital names
  const VALID_NAMES = ['LCP', 'INP', 'CLS', 'TTFB', 'FID']
  if (!name || !VALID_NAMES.includes(name)) {
    return res.status(204).end() // Silently drop invalid — don't waste bandwidth
  }

  // Validate value — must be a finite number
  if (typeof value !== 'number' || !isFinite(value)) {
    return res.status(204).end()
  }

  // Validate rating — must be one of the standard ratings
  const VALID_RATINGS = ['good', 'needs-improvement', 'poor']
  const sanitizedRating = VALID_RATINGS.includes(rating) ? rating : 'good'

  // Record the metric
  analytics.trackVital({
    name,
    value,
    rating: sanitizedRating,
    url: typeof url === 'string' ? url.slice(0, 200) : '/',
  })

  // 204 No Content — minimal response for beacon/fire-and-forget
  res.status(204).end()
})

/**
 * GET /api/vitals — Returns Web Vitals p75 summary.
 * Useful for monitoring dashboards and CI performance budgets.
 * Public (no auth) since it only shows aggregate anonymized metrics.
 */
router.get('/', (req, res) => {
  res.set('Cache-Control', 'no-cache')
  res.json(analytics.getVitalsSummary())
})

export default router
