import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'
import { plotCache, statsCache, marketCache } from '../services/cacheService.js'

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

  // 2. Memory usage
  const mem = process.memoryUsage()
  checks.memory = {
    heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024 * 10) / 10,
    heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024 * 10) / 10,
    rssMB: Math.round(mem.rss / 1024 / 1024 * 10) / 10,
    externalMB: Math.round(mem.external / 1024 / 1024 * 10) / 10,
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
