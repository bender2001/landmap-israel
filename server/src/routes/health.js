import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'
import { plotCache, statsCache, marketCache } from '../services/cacheService.js'
import { getClientCount } from '../services/sseService.js'

const router = Router()

const startedAt = Date.now()

/**
 * GET /api/health
 * Production health check endpoint with detailed diagnostics.
 * Used by uptime monitors (UptimeRobot, Pingdom), load balancers, and deployment scripts.
 *
 * Returns:
 * - status: "ok" | "degraded" | "error"
 * - uptime: seconds since process started
 * - supabase: connectivity check with latency
 * - memory: process heap usage (helps catch memory leaks)
 * - cache: hit/miss stats for each cache layer
 * - timestamp: ISO 8601 for log correlation
 *
 * Response codes:
 * - 200: healthy
 * - 503: critical dependency down (Supabase)
 */
router.get('/', async (req, res) => {
  const checks = {}
  let overallStatus = 'ok'

  // 1. Supabase connectivity (critical)
  try {
    const start = performance.now()
    const { count, error } = await supabaseAdmin
      .from('plots')
      .select('id', { count: 'exact', head: true })
      .limit(0)
    const latencyMs = Math.round((performance.now() - start) * 10) / 10

    if (error) {
      checks.supabase = { status: 'error', error: error.message, latencyMs }
      overallStatus = 'error'
    } else {
      checks.supabase = { status: 'ok', latencyMs, plotCount: count }
    }
  } catch (err) {
    checks.supabase = { status: 'error', error: err.message }
    overallStatus = 'error'
  }

  // 2. Memory usage — includes heap utilization for leak detection.
  // >85% heap utilization sustained = probable memory leak.
  const mem = process.memoryUsage()
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024 * 10) / 10
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024 * 10) / 10
  const heapUtilPct = heapTotalMB > 0 ? Math.round((heapUsedMB / heapTotalMB) * 100) : 0
  checks.memory = {
    heapUsedMB,
    heapTotalMB,
    heapUtilPct,
    rssMB: Math.round(mem.rss / 1024 / 1024 * 10) / 10,
    externalMB: Math.round(mem.external / 1024 / 1024 * 10) / 10,
    arrayBuffersMB: Math.round((mem.arrayBuffers || 0) / 1024 / 1024 * 10) / 10,
  }
  // Flag memory pressure — helps catch leaks before OOM kill
  if (heapUtilPct > 85) {
    checks.memory.warning = 'High heap utilization — possible memory leak'
    if (overallStatus === 'ok') overallStatus = 'degraded'
  }

  // 3. Cache stats
  checks.cache = {
    plot: getCacheStats(plotCache),
    stats: getCacheStats(statsCache),
    market: getCacheStats(marketCache),
  }

  // 4. Uptime
  const uptimeSec = Math.round((Date.now() - startedAt) / 1000)

  const statusCode = overallStatus === 'error' ? 503 : 200

  // No caching — health checks should always be fresh
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate')

  res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptimeSeconds: uptimeSec,
    uptimeHuman: formatUptime(uptimeSec),
    nodeVersion: process.version,
    pid: process.pid,
    env: process.env.NODE_ENV || 'development',
    sseClients: getClientCount(),
    checks,
  })
})

/**
 * GET /api/health/ping
 * Ultra-lightweight ping for load balancer health checks.
 * No DB calls, no computation — just proves the process is alive.
 */
router.get('/ping', (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store')
  res.json({ pong: true, ts: Date.now() })
})

// ─── Client Error Reporting ────────────────────────────────────────────
// POST /api/health/client-error
// Receives client-side errors from ErrorBoundary / window.onerror for server-side logging.
// Rate-limited: 5 reports per IP per minute to prevent abuse.
// Like Google's Error Reporting — knowing what breaks in production is essential.
const errorRateMap = new Map()
const ERROR_RATE_TTL = 60_000
const ERROR_RATE_LIMIT = 5

router.post('/client-error', (req, res) => {
  // Rate limit per IP
  const ip = req.ip || req.connection?.remoteAddress || 'unknown'
  const now = Date.now()
  const entry = errorRateMap.get(ip) || { count: 0, resetAt: now + ERROR_RATE_TTL }
  if (now > entry.resetAt) {
    entry.count = 0
    entry.resetAt = now + ERROR_RATE_TTL
  }
  entry.count++
  errorRateMap.set(ip, entry)
  if (entry.count > ERROR_RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many error reports' })
  }

  const { message, stack, componentStack, url, userAgent, timestamp } = req.body || {}
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing error message' })
  }

  // Log to server console with structured format for log aggregation
  console.error('[CLIENT_ERROR]', JSON.stringify({
    message: message.slice(0, 500),
    stack: (stack || '').slice(0, 1000),
    componentStack: (componentStack || '').slice(0, 500),
    url: (url || '').slice(0, 200),
    userAgent: (userAgent || '').slice(0, 200),
    ip,
    timestamp: timestamp || new Date().toISOString(),
  }))

  res.status(204).end()
})

// Periodic cleanup for error rate limiter
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of errorRateMap) {
    if (now > v.resetAt) errorRateMap.delete(k)
  }
}, 120_000).unref()

function getCacheStats(cache) {
  if (!cache || typeof cache.getStats !== 'function') {
    // Cache service may not expose stats — return basic info
    return { available: !!cache }
  }
  try {
    return cache.getStats()
  } catch {
    return { available: !!cache }
  }
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  parts.push(`${m}m`)
  return parts.join(' ')
}

export default router
