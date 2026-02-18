import { Router } from 'express'
import crypto from 'crypto'
import { getPublishedPlots, getPlotById, getPlotsByIds, getPlotStats } from '../services/plotService.js'
import { sanitizePlotQuery, sanitizePlotId } from '../middleware/sanitize.js'
import { analytics } from '../services/analyticsService.js'
import { plotCache, statsCache } from '../services/cacheService.js'
import { supabaseAdmin } from '../config/supabase.js'

const router = Router()

// ─── View tracking rate limiter ────────────────────────────────────────
// Prevents bots from inflating view counts. Allows 1 view per IP+plotId per 5 minutes.
// Uses a compact Map with automatic cleanup every 10 minutes to prevent memory leaks.
const viewRateMap = new Map()
const VIEW_RATE_TTL = 5 * 60 * 1000 // 5 min cooldown per IP+plot
const VIEW_RATE_MAX = 5000 // max entries before forced cleanup

function isViewRateLimited(ip, plotId) {
  const key = `${ip}:${plotId}`
  const entry = viewRateMap.get(key)
  const now = Date.now()
  if (entry && now - entry < VIEW_RATE_TTL) return true
  // Cleanup if map is getting too large
  if (viewRateMap.size >= VIEW_RATE_MAX) {
    for (const [k, ts] of viewRateMap) {
      if (now - ts > VIEW_RATE_TTL) viewRateMap.delete(k)
    }
  }
  viewRateMap.set(key, now)
  return false
}

// Periodic cleanup every 10 minutes to reclaim memory
setInterval(() => {
  const now = Date.now()
  for (const [k, ts] of viewRateMap) {
    if (now - ts > VIEW_RATE_TTL) viewRateMap.delete(k)
  }
}, 10 * 60 * 1000).unref()

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

    // ETag support — consistent with main /plots endpoint
    const etag = generateETag(featured)
    res.set('ETag', etag)
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end()
    }

    res.json(featured)
  } catch (err) {
    next(err)
  }
})

// GET /api/plots/batch - Fetch multiple plots by IDs in one request.
// Used by the Compare page to avoid loading the entire dataset (~90% payload reduction).
// Example: GET /api/plots/batch?ids=uuid1,uuid2,uuid3
router.get('/batch', async (req, res, next) => {
  try {
    const idsParam = req.query.ids
    if (!idsParam || typeof idsParam !== 'string') {
      return res.status(400).json({ error: 'חסר פרמטר ids', errorCode: 'MISSING_IDS' })
    }
    const ids = idsParam.split(',').map(id => id.trim()).filter(Boolean)
    if (ids.length === 0) {
      return res.status(400).json({ error: 'רשימת IDs ריקה', errorCode: 'EMPTY_IDS' })
    }
    if (ids.length > 10) {
      return res.status(400).json({ error: 'עד 10 חלקות בבקשה אחת', errorCode: 'TOO_MANY_IDS' })
    }
    // Validate UUID format to prevent injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!ids.every(id => uuidRegex.test(id))) {
      return res.status(400).json({ error: 'פורמט ID לא תקין', errorCode: 'INVALID_ID_FORMAT' })
    }

    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120')
    const cacheKey = `batch:${ids.sort().join(',')}`
    const plots = await plotCache.wrap(cacheKey, () => getPlotsByIds(ids), 60_000)

    const etag = generateETag(plots)
    res.set('ETag', etag)
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end()
    }

    res.json(plots)
  } catch (err) {
    next(err)
  }
})

// GET /api/plots/popular - Most viewed plots (social proof, like Yad2's "הכי נצפים")
// Returns plots sorted by view count, useful for "trending" badges and a popular section.
router.get('/popular', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 6, 20)
    const days = Math.min(parseInt(req.query.days) || 30, 90)
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')

    const cacheKey = `popular:${limit}:${days}`
    const popular = await plotCache.wrap(cacheKey, async () => {
      const { data, error } = await supabaseAdmin
        .from('plots')
        .select('id, block_number, number, city, status, total_price, projected_value, size_sqm, readiness_estimate, views, created_at, plot_images(id, url, alt)')
        .eq('is_published', true)
        .gt('views', 0)
        .order('views', { ascending: false })
        .limit(limit)

      if (error) throw error
      if (!data || data.length === 0) return []

      // Enrich with computed metrics
      return data.map(p => {
        const price = p.total_price || 0
        const proj = p.projected_value || 0
        const roi = price > 0 ? Math.round(((proj - price) / price) * 100) : 0
        return { ...p, _roi: roi }
      })
    }, 300_000)

    // ETag support — consistent with main /plots endpoint
    const etag = generateETag(popular)
    res.set('ETag', etag)
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end()
    }

    res.json(popular)
  } catch (err) {
    next(err)
  }
})

// GET /api/plots/:id/similar - Find plots with similar investment characteristics
// Unlike /nearby (geography), this matches by zoning stage, price range, size, and ROI.
// Ideal for "חלקות דומות" — investors want similar *opportunities*, not just nearby land.
router.get('/:id/similar', sanitizePlotId, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 4, 10)
    const cacheKey = `similar:${req.params.id}:${limit}`
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

    const price = plot.total_price || 0
    const sizeSqM = plot.size_sqm || 0
    const zoning = plot.zoning_stage || 'AGRICULTURAL'
    const projValue = plot.projected_value || 0
    const plotRoi = price > 0 ? ((projValue - price) / price) * 100 : 0

    // Zoning pipeline order for proximity matching
    const ZONING_ORDER = [
      'AGRICULTURAL', 'MASTER_PLAN_DEPOSIT', 'MASTER_PLAN_APPROVED',
      'DETAILED_PLAN_PREP', 'DETAILED_PLAN_DEPOSIT', 'DETAILED_PLAN_APPROVED',
      'DEVELOPER_TENDER', 'BUILDING_PERMIT',
    ]
    const plotZoningIdx = ZONING_ORDER.indexOf(zoning)

    // Get all published plots (uses 30s cache)
    const allPlots = await plotCache.wrap('plots:{}', () => getPublishedPlots({}), 30_000)

    const scored = allPlots
      .filter(p => p.id !== req.params.id && p.status !== 'SOLD')
      .map(p => {
        const pPrice = p.total_price || 0
        const pSize = p.size_sqm || 0
        const pZoning = p.zoning_stage || 'AGRICULTURAL'
        const pProj = p.projected_value || 0
        const pRoi = pPrice > 0 ? ((pProj - pPrice) / pPrice) * 100 : 0
        const pZoningIdx = ZONING_ORDER.indexOf(pZoning)

        // Price similarity (0-3 pts) — lower diff = higher score
        const priceDiff = price > 0 ? Math.abs(pPrice - price) / price : 1
        const priceScore = Math.max(0, 3 - priceDiff * 3)

        // Size similarity (0-2 pts)
        const sizeDiff = sizeSqM > 0 ? Math.abs(pSize - sizeSqM) / sizeSqM : 1
        const sizeScore = Math.max(0, 2 - sizeDiff * 2)

        // Zoning proximity (0-3 pts) — same or adjacent stage scores highest
        const zoningDist = Math.abs(pZoningIdx - plotZoningIdx)
        const zoningScore = zoningDist === 0 ? 3 : zoningDist === 1 ? 2 : zoningDist === 2 ? 1 : 0

        // ROI similarity (0-2 pts)
        const roiDiff = plotRoi > 0 ? Math.abs(pRoi - plotRoi) / Math.max(plotRoi, 1) : 1
        const roiScore = Math.max(0, 2 - roiDiff * 2)

        // Same city bonus (1 pt) — investors often focus on specific areas
        const cityBonus = p.city === plot.city ? 1 : 0

        const totalScore = priceScore + sizeScore + zoningScore + roiScore + cityBonus

        return {
          ...p,
          _similarityScore: Math.round(totalScore * 100) / 100,
          _matchReasons: [
            zoningDist <= 1 && 'שלב תכנוני דומה',
            priceDiff < 0.3 && 'טווח מחיר דומה',
            sizeDiff < 0.4 && 'שטח דומה',
            roiDiff < 0.3 && 'תשואה דומה',
            p.city === plot.city && 'אותה עיר',
          ].filter(Boolean),
        }
      })
      .filter(p => p._similarityScore > 2) // minimum threshold
      .sort((a, b) => b._similarityScore - a._similarityScore)
      .slice(0, limit)

    setCache(cacheKey, scored)
    res.json(scored)
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

    // Get all plots (cached) and compute distance — avoids redundant Supabase queries.
    // Previously called getPublishedPlots({}) directly, bypassing the 30s plot cache.
    const allPlots = await plotCache.wrap('plots:{}', () => getPublishedPlots({}), 30_000)

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
// Rate-limited: 1 view per IP+plotId per 5 minutes to prevent inflation
router.post('/:id/view', sanitizePlotId, async (req, res) => {
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown'
  const plotId = req.params.id

  // Check rate limit — if already counted recently, respond OK but don't increment
  if (isViewRateLimited(clientIp, plotId)) {
    return res.json({ ok: true, cached: true })
  }

  // Track in analytics
  analytics.trackPlotClick(plotId)
  // Always respond immediately — view tracking is non-critical
  res.json({ ok: true })

  try {
    // Try RPC first (atomic increment, best approach)
    const { error: rpcError } = await supabaseAdmin.rpc('increment_views', { plot_id: plotId })
    if (rpcError) {
      // Fallback: read-then-write (acceptable race condition for view counts)
      const { data: plot } = await supabaseAdmin
        .from('plots')
        .select('views')
        .eq('id', plotId)
        .single()
      if (plot) {
        await supabaseAdmin
          .from('plots')
          .update({ views: (plot.views || 0) + 1 })
          .eq('id', plotId)
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
