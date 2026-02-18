import { Router } from 'express'
import crypto from 'crypto'
import { getPublishedPlots, getPlotById, getPlotStats } from '../services/plotService.js'
import { sanitizePlotQuery, sanitizePlotId } from '../middleware/sanitize.js'
import { analytics } from '../services/analyticsService.js'
import { plotCache, statsCache } from '../services/cacheService.js'

const router = Router()

// Simple in-memory cache for nearby queries (TTL: 5 min, max 50 entries)
const nearbyCache = new Map()
const NEARBY_TTL = 5 * 60 * 1000
const NEARBY_MAX = 50
function getCached(key) {
  const entry = nearbyCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > NEARBY_TTL) { nearbyCache.delete(key); return null }
  return entry.data
}
function setCache(key, data) {
  if (nearbyCache.size >= NEARBY_MAX) {
    const oldest = nearbyCache.keys().next().value
    nearbyCache.delete(oldest)
  }
  nearbyCache.set(key, { data, ts: Date.now() })
}

function generateETag(data) {
  return '"' + crypto.createHash('md5').update(JSON.stringify(data)).digest('hex').slice(0, 16) + '"'
}

// GET /api/plots - List published plots with optional filters
router.get('/', sanitizePlotQuery, async (req, res, next) => {
  try {
    // Cache list for 30s — data doesn't change often
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60, stale-if-error=300')
    const cacheKey = `plots:${JSON.stringify(req.query)}`
    const plots = await plotCache.wrap(cacheKey, () => getPublishedPlots(req.query), 30_000)

    // ETag support — avoid re-sending unchanged data
    const etag = generateETag(plots)
    res.set('ETag', etag)
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end()
    }

    // Track search analytics (non-blocking)
    if (req.query.q || req.query.city || req.query.priceMin || req.query.priceMax || req.query.status) {
      analytics.trackSearch(req.query.q || '', plots.length, req.query)
      if (req.query.city && req.query.city !== 'all') analytics.trackFilter(`city:${req.query.city}`)
      if (req.query.priceMin || req.query.priceMax) analytics.trackFilter('price-range')
      if (req.query.status) analytics.trackFilter('status')
      if (req.query.sort) analytics.trackFilter(`sort:${req.query.sort}`)
    }
    analytics.trackSession()

    // Add total count header for pagination-ready responses
    res.set('X-Total-Count', String(plots.length))
    res.json(plots)
  } catch (err) {
    next(err)
  }
})

// GET /api/plots/stats - Lightweight aggregate stats
router.get('/stats', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300')
    const stats = await statsCache.wrap('plot-stats', () => getPlotStats(), 120_000)
    res.json(stats)
  } catch (err) {
    next(err)
  }
})

// GET /api/plots/featured - Top investment opportunities (server-computed scoring)
// Like Madlan's "הזדמנויות חמות" — cached 5min, avoids heavy client-side computation
router.get('/featured', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 3, 10)
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')

    const cacheKey = `featured:${limit}`
    const featured = await plotCache.wrap(cacheKey, async () => {
      const allPlots = await getPublishedPlots({})
      if (!allPlots || allPlots.length < 3) return allPlots || []

      // Compute area average price/sqm
      let totalPsm = 0, count = 0
      for (const p of allPlots) {
        const price = p.total_price || 0
        const size = p.size_sqm || 0
        if (price > 0 && size > 0) { totalPsm += price / size; count++ }
      }
      const avgPsm = count > 0 ? totalPsm / count : 0

      // Score each available plot
      const scored = allPlots
        .filter(p => p.status === 'AVAILABLE' && (p.total_price || 0) > 0)
        .map(p => {
          const price = p.total_price || 0
          const size = p.size_sqm || 0
          const proj = p.projected_value || 0
          const roi = price > 0 ? ((proj - price) / price) * 100 : 0
          const priceSqm = size > 0 ? price / size : Infinity

          // Deal factor: below-average price (0-3 pts)
          const dealFactor = avgPsm > 0
            ? Math.max(0, Math.min(3, ((avgPsm - priceSqm) / avgPsm) * 10))
            : 0

          // ROI bonus (0-3 pts)
          const roiBonus = Math.min(3, roi / 80)

          // Freshness (0-1 pt)
          const daysOld = p.created_at
            ? Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000)
            : 999
          const freshBonus = daysOld <= 7 ? 1 : daysOld <= 14 ? 0.5 : 0

          // Views popularity (0-1 pt)
          const popBonus = (p.views || 0) >= 10 ? 1 : (p.views || 0) >= 5 ? 0.5 : 0

          const score = dealFactor + roiBonus + freshBonus + popBonus
          return {
            ...p,
            _score: Math.round(score * 100) / 100,
            _roi: Math.round(roi),
            _dealPct: Math.round(((avgPsm - priceSqm) / avgPsm) * 100),
          }
        })
        .sort((a, b) => b._score - a._score)
        .slice(0, limit)

      return scored
    }, 300_000)

    res.json(featured)
  } catch (err) {
    next(err)
  }
})

// GET /api/plots/:id/nearby - Find plots near a given plot (geo-proximity)
router.get('/:id/nearby', sanitizePlotId, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 5, 10)
    const maxKm = parseFloat(req.query.maxKm) || 10
    const cacheKey = `${req.params.id}:${limit}:${maxKm}`
    const cached = getCached(cacheKey)
    if (cached) {
      res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300')
      res.set('X-Cache', 'HIT')
      return res.json(cached)
    }

    res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300')
    res.set('X-Cache', 'MISS')
    const plot = await getPlotById(req.params.id)
    if (!plot) return res.status(404).json({ error: 'Plot not found' })

    const coords = plot.coordinates
    if (!coords || !Array.isArray(coords) || coords.length === 0) {
      return res.json([])
    }

    // Calculate centroid
    const valid = coords.filter(c => Array.isArray(c) && c.length >= 2 && isFinite(c[0]) && isFinite(c[1]))
    if (valid.length === 0) return res.json([])
    const centLat = valid.reduce((s, c) => s + c[0], 0) / valid.length
    const centLng = valid.reduce((s, c) => s + c[1], 0) / valid.length

    // Get all plots and compute distance
    const allPlots = await getPublishedPlots({})

    const nearby = allPlots
      .filter(p => p.id !== req.params.id && p.coordinates && p.coordinates.length > 0)
      .map(p => {
        const pc = p.coordinates.filter(c => Array.isArray(c) && c.length >= 2)
        if (pc.length === 0) return null
        const lat = pc.reduce((s, c) => s + c[0], 0) / pc.length
        const lng = pc.reduce((s, c) => s + c[1], 0) / pc.length
        // Haversine distance in km
        const R = 6371
        const dLat = (lat - centLat) * Math.PI / 180
        const dLng = (lng - centLng) * Math.PI / 180
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos(centLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
          Math.sin(dLng / 2) ** 2
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return { ...p, distance_km: Math.round(dist * 100) / 100 }
      })
      .filter(p => p && p.distance_km <= maxKm)
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, limit)

    setCache(cacheKey, nearby)
    res.json(nearby)
  } catch (err) {
    next(err)
  }
})

// POST /api/plots/:id/view - Track a plot view (fire-and-forget, no auth needed)
router.post('/:id/view', sanitizePlotId, async (req, res) => {
  // Track in analytics
  analytics.trackPlotClick(req.params.id)
  // Always respond immediately — view tracking is non-critical
  res.json({ ok: true })

  try {
    const { supabaseAdmin } = await import('../config/supabase.js')
    // Try RPC first (atomic increment, best approach)
    const { error: rpcError } = await supabaseAdmin.rpc('increment_views', { plot_id: req.params.id })
    if (rpcError) {
      // Fallback: read-then-write (acceptable race condition for view counts)
      const { data: plot } = await supabaseAdmin
        .from('plots')
        .select('views')
        .eq('id', req.params.id)
        .single()
      if (plot) {
        await supabaseAdmin
          .from('plots')
          .update({ views: (plot.views || 0) + 1 })
          .eq('id', req.params.id)
      }
    }
  } catch {
    // Silently ignore — view tracking failure is not user-facing
  }
})

// GET /api/plots/:id - Single plot with documents & images
router.get('/:id', sanitizePlotId, async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120')
    const plot = await getPlotById(req.params.id)
    if (!plot) return res.status(404).json({ error: 'Plot not found' })

    // ETag for conditional requests — avoid resending unchanged data
    const etag = generateETag(plot)
    res.set('ETag', etag)
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end()
    }

    res.json(plot)
  } catch (err) {
    next(err)
  }
})

export default router
