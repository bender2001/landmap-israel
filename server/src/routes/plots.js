import { Router } from 'express'
import crypto from 'crypto'
import { getPublishedPlots, getPlotById, getPlotsByIds, getPlotStats } from '../services/plotService.js'
import { sanitizePlotQuery, sanitizePlotId } from '../middleware/sanitize.js'
import { computeHeavyLimiter } from '../middleware/rateLimiter.js'
import { requestAbortSignal, isAbortError } from '../middleware/abortSignal.js'
import { analytics } from '../services/analyticsService.js'
import { plotCache, statsCache } from '../services/cacheService.js'
import { supabaseAdmin } from '../config/supabase.js'
import { haversineKm, calcCentroid, formatDistance, estimateTravelTime } from '../utils/geo.js'

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

// ─── Sparse fieldsets (fields param) ──────────────────────────────────
// Whitelist of allowed field names for the `fields` query parameter.
// Prevents clients from requesting internal/sensitive columns.
// When `fields` is provided, only these columns + computed enrichments are returned,
// reducing JSON payload by 40-60% for list views (e.g., map only needs coordinates + price).
const ALLOWED_SPARSE_FIELDS = new Set([
  'id', 'block_number', 'number', 'city', 'status', 'total_price', 'projected_value',
  'size_sqm', 'coordinates', 'zoning_stage', 'readiness_estimate', 'description',
  'created_at', 'updated_at', 'views', 'plot_images',
])

/**
 * Strip plots to only requested fields (sparse fieldset / partial response).
 * Like Google API's `fields` parameter — reduces bandwidth for clients that
 * only need a subset (e.g., map view only needs coordinates + price + status).
 * Computed enrichment fields (_investmentScore, _grade, etc.) are always included.
 */
function applySparseFields(plots, fieldsParam) {
  if (!fieldsParam || !plots || plots.length === 0) return plots
  const requested = fieldsParam.split(',').map(f => f.trim()).filter(f => ALLOWED_SPARSE_FIELDS.has(f))
  if (requested.length === 0) return plots // invalid fields → return full response

  return plots.map(p => {
    const sparse = {}
    for (const field of requested) {
      if (field in p) sparse[field] = p[field]
    }
    // Always include computed enrichment fields (lightweight, ~100 bytes each)
    if (p._investmentScore != null) sparse._investmentScore = p._investmentScore
    if (p._grade != null) sparse._grade = p._grade
    if (p._roi != null) sparse._roi = p._roi
    if (p._pricePerSqm != null) sparse._pricePerSqm = p._pricePerSqm
    if (p._monthlyPayment != null) sparse._monthlyPayment = p._monthlyPayment
    if (p._daysOnMarket != null) sparse._daysOnMarket = p._daysOnMarket
    if (p._riskLevel != null) sparse._riskLevel = p._riskLevel
    if (p._riskScore != null) sparse._riskScore = p._riskScore
    if (p._riskFactors != null) sparse._riskFactors = p._riskFactors
    if (p._cagr != null) sparse._cagr = p._cagr
    if (p._holdingYears != null) sparse._holdingYears = p._holdingYears
    if (p._marketTrend != null) sparse._marketTrend = p._marketTrend
    if (p._dealDiscount != null) sparse._dealDiscount = p._dealDiscount
    return sparse
  })
}

// GET /api/plots/trending-searches - Public popular search terms for autocomplete suggestions.
// Returns the top N search queries from the analytics service (in-memory, no DB hit).
// Feeds into SearchAutocomplete's "Popular Searches" section when the input is focused
// without a query — like Google's trending searches or Madlan's "חיפושים פופולריים".
// Cached 2 minutes to avoid hammering the analytics singleton.
router.get('/trending-searches', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 5, 15)
    res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300')

    const topSearches = analytics.getTopSearches(limit)
    // Only return searches with 2+ occurrences to filter out noise
    const meaningful = topSearches.filter(s => s.count >= 2).map(s => s.query)

    const etag = generateETag(meaningful)
    res.set('ETag', etag)
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end()
    }

    res.json({ searches: meaningful })
  } catch {
    // Non-critical — return empty on error
    res.json({ searches: [] })
  }
})

// GET /api/plots - List published plots with optional filters
router.get('/', sanitizePlotQuery, async (req, res, next) => {
  try {
    const t0 = process.hrtime.bigint()

    // Cache list for 30s — data doesn't change often
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60, stale-if-error=300')
    const cacheKey = `plots:${JSON.stringify(req.query)}`
    const plots = await plotCache.wrap(cacheKey, () => getPublishedPlots(req.query), 30_000)

    const tQuery = process.hrtime.bigint()

    // Cache observability headers — helps the frontend detect stale data
    // and lets DevTools/monitoring show cache hit/miss status.
    const dataAge = plotCache.getAge(cacheKey)
    const cacheHit = dataAge !== null
    if (cacheHit) {
      res.set('X-Cache', 'HIT')
      res.set('X-Data-Age', `${Math.round(dataAge / 1000)}s`)
    } else {
      res.set('X-Cache', 'MISS')
    }

    // ETag support — avoid re-sending unchanged data
    const etag = generateETag(plots)
    res.set('ETag', etag)
    if (req.headers['if-none-match'] === etag) {
      // Decomposed Server-Timing even on 304 — helps profile conditional request overhead
      const tEnd = process.hrtime.bigint()
      const queryMs = Number(tQuery - t0) / 1e6
      const totalMs = Number(tEnd - t0) / 1e6
      res.set('Server-Timing', [
        `${cacheHit ? 'cache' : 'db'};dur=${queryMs.toFixed(1)};desc="${cacheHit ? 'Cache Hit' : 'DB Query'}"`,
        `etag;dur=${(totalMs - queryMs).toFixed(1)};desc="ETag Match"`,
        `total;dur=${totalMs.toFixed(1)};desc="Total"`,
      ].join(', '))
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

    // Indicate fuzzy search results — lets the UI show "did you mean?" hints
    if (plots._fuzzy) {
      res.set('X-Search-Fuzzy', 'true')
    }

    // Last-Modified from most recent updated_at — enables If-Modified-Since
    // conditional requests from CDNs, proxies, and browsers. ETag handles
    // content-level dedup; Last-Modified covers time-based cache validation.
    if (plots.length > 0) {
      let maxTs = 0
      for (const p of plots) {
        const ts = p.updated_at ? new Date(p.updated_at).getTime() : 0
        if (ts > maxTs) maxTs = ts
      }
      if (maxTs > 0) {
        res.set('Last-Modified', new Date(maxTs).toUTCString())
      }
    }

    // Apply sparse fieldsets if `fields` param is provided.
    // Example: /api/plots?fields=id,city,total_price,coordinates
    // Reduces JSON payload by 40-60% for clients that only need specific columns.
    let result = req.query.fields ? applySparseFields(plots, req.query.fields) : plots

    // Save-Data optimization: strip plot_images from list responses when the browser
    // has data saver enabled (Save-Data: on). Images are the heaviest part of the
    // plot list payload (~30-40% of JSON size). The detail endpoint still returns
    // full images when a user clicks into a specific plot — this only affects the list.
    // Combined with the client's useNetworkStatus(), this provides end-to-end data savings.
    if (req.saveData && Array.isArray(result) && result.length > 0) {
      result = result.map(p => {
        if (p.plot_images) {
          const { plot_images, ...rest } = p
          // Preserve image count so the UI can show "📷 3" without loading images
          return { ...rest, _imageCount: plot_images.length }
        }
        return p
      })
      res.set('X-Save-Data', 'applied')
    }

    // Decomposed Server-Timing — shows in Chrome/Edge DevTools "Timing" tab.
    // Breaks down: cache/db lookup, post-processing (ETag, sparse fields, analytics).
    // Like Cloudflare/Fastly timing headers — zero client code needed.
    const tEnd = process.hrtime.bigint()
    const queryMs = Number(tQuery - t0) / 1e6
    const processMs = Number(tEnd - tQuery) / 1e6
    const totalMs = Number(tEnd - t0) / 1e6
    res.set('Server-Timing', [
      `${cacheHit ? 'cache' : 'db'};dur=${queryMs.toFixed(1)};desc="${cacheHit ? 'Cache Hit' : 'DB Query'}"`,
      `process;dur=${processMs.toFixed(1)};desc="ETag+Serialize"`,
      `total;dur=${totalMs.toFixed(1)};desc="Total"`,
    ].join(', '))

    res.json(result)
  } catch (err) {
    next(err)
  }
})

// GET /api/plots/stats - Lightweight aggregate stats
router.get('/stats', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300')
    const stats = await statsCache.wrap('plot-stats', () => getPlotStats(), 120_000)

    // ETag support — avoids re-sending unchanged stats (saves ~1-2KB per polling interval).
    // Stats are polled frequently by widgets (MarketStatsWidget, FeaturedDeals) and rarely change,
    // so conditional requests with 304 responses significantly reduce bandwidth.
    const etag = generateETag(stats)
    res.set('ETag', etag)
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end()
    }

    res.json(stats)
  } catch (err) {
    next(err)
  }
})

// GET /api/plots/featured - Top investment opportunities (server-computed scoring)
// Like Madlan's "הזדמנויות חמות" — cached 5min, avoids heavy client-side computation
router.get('/featured', computeHeavyLimiter, requestAbortSignal, async (req, res, next) => {
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
    if (isAbortError(err)) return // Client disconnected — nothing to send
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
    if (ids.length > 30) {
      return res.status(400).json({ error: 'עד 30 חלקות בבקשה אחת', errorCode: 'TOO_MANY_IDS' })
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
router.get('/popular', computeHeavyLimiter, requestAbortSignal, async (req, res, next) => {
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
        .abortSignal(req.signal)

      if (error) throw error
      if (!data || data.length === 0) return []

      // Enrich with computed metrics + view velocity (views per day since listing).
      // View velocity is a better "hotness" signal than raw views:
      // a plot with 100 views over 6 months is less "hot" than one with 20 views in 2 days.
      // Like YouTube/Reddit's "trending" algorithm — recency-weighted popularity.
      return data.map(p => {
        const price = p.total_price || 0
        const proj = p.projected_value || 0
        const roi = price > 0 ? Math.round(((proj - price) / price) * 100) : 0
        const daysOld = p.created_at
          ? Math.max(1, Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000))
          : 30
        const viewsPerDay = (p.views || 0) / daysOld
        return { ...p, _roi: roi, _viewVelocity: Math.round(viewsPerDay * 100) / 100, _daysOld: daysOld }
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
    if (isAbortError(err)) return
    next(err)
  }
})

// GET /api/plots/:id/nearby-pois - Find POIs within radius of a plot's centroid.
// Powers the "What's Nearby" section in the sidebar — like Madlan's amenity proximity
// indicators but with actual distance calculations and categorized results.
router.get('/:id/nearby-pois', sanitizePlotId, computeHeavyLimiter, requestAbortSignal, async (req, res, next) => {
  try {
    const maxKm = Math.min(parseFloat(req.query.maxKm) || 3, 10)
    const limit = Math.min(parseInt(req.query.limit) || 20, 50)
    const cacheKey = `nearby-pois:${req.params.id}:${maxKm}:${limit}`
    const cached = getCached(cacheKey)
    if (cached) {
      res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
      res.set('X-Cache', 'HIT')
      return res.json(cached)
    }

    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
    res.set('X-Cache', 'MISS')

    const plot = await getPlotById(req.params.id)
    if (!plot) return res.status(404).json({ error: 'Plot not found' })

    const center = calcCentroid(plot.coordinates)
    if (!center) return res.json({ pois: [], categories: {} })

    // Fetch all POIs (lightweight table, small dataset)
    const { data: pois, error } = await supabaseAdmin
      .from('points_of_interest')
      .select('*')
      .abortSignal(req.signal)

    if (error) throw error
    if (!pois || pois.length === 0) {
      return res.json({ pois: [], categories: {} })
    }

    // Distance calculation + filter by radius (uses shared haversine utility)
    // Enriched with walking/driving time estimates — like Madlan's "X דקות הליכה"
    const nearbyPois = pois
      .map(poi => {
        const lat = poi.lat ?? poi.latitude
        const lng = poi.lng ?? poi.longitude
        if (!lat || !lng || !isFinite(lat) || !isFinite(lng)) return null
        const dist = formatDistance(haversineKm(center.lat, center.lng, lat, lng))
        if (dist.km > maxKm) return null
        const travel = estimateTravelTime(dist.m)
        return { ...poi, distance_km: dist.km, distance_m: dist.m, walk_min: travel.walkMin, drive_min: travel.driveMin, walk_label: travel.walkLabel, drive_label: travel.driveLabel }
      })
      .filter(Boolean)
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, limit)

    // Group by category for structured display
    const categories = {}
    for (const poi of nearbyPois) {
      const cat = poi.category || poi.type || 'אחר'
      if (!categories[cat]) categories[cat] = []
      categories[cat].push(poi)
    }

    const result = {
      pois: nearbyPois,
      categories,
      plotCenter: center,
      count: nearbyPois.length,
    }

    setCache(cacheKey, result)
    res.json(result)
  } catch (err) {
    if (isAbortError(err)) return
    next(err)
  }
})

// GET /api/plots/:id/similar - Find plots with similar investment characteristics.
// Unlike /nearby (geography only), this matches by zoning stage, price range, size, ROI,
// AND geographic proximity. Investors want similar *opportunities* — and nearby similar
// plots are more relevant for comparison than distant ones with the same price.
// Like Madlan's "נכסים דומים" but with multi-factor scoring.
router.get('/:id/similar', sanitizePlotId, computeHeavyLimiter, requestAbortSignal, async (req, res, next) => {
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

    // Compute centroid of the source plot for geographic proximity scoring
    const plotCentroid = calcCentroid(plot.coordinates)

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

        // Geographic proximity bonus (0-2 pts) — nearby similar plots are more useful
        // for comparison than distant ones. Uses haversine distance with a decay curve:
        //   <3km → 2pts, <10km → 1pt, <20km → 0.5pt, >20km → 0pts
        // This nudges the algorithm to prefer nearby matches when similarity is equal,
        // giving investors the most actionable comparisons for their area of interest.
        let geoScore = 0
        let distanceKm = null
        if (plotCentroid) {
          const pCentroid = calcCentroid(p.coordinates)
          if (pCentroid) {
            distanceKm = haversineKm(plotCentroid.lat, plotCentroid.lng, pCentroid.lat, pCentroid.lng)
            if (distanceKm <= 3) geoScore = 2
            else if (distanceKm <= 10) geoScore = 1
            else if (distanceKm <= 20) geoScore = 0.5
          }
        }

        const totalScore = priceScore + sizeScore + zoningScore + roiScore + cityBonus + geoScore

        return {
          ...p,
          _similarityScore: Math.round(totalScore * 100) / 100,
          _distanceKm: distanceKm !== null ? Math.round(distanceKm * 10) / 10 : null,
          _matchReasons: [
            zoningDist <= 1 && 'שלב תכנוני דומה',
            priceDiff < 0.3 && 'טווח מחיר דומה',
            sizeDiff < 0.4 && 'שטח דומה',
            roiDiff < 0.3 && 'תשואה דומה',
            p.city === plot.city && 'אותה עיר',
            distanceKm !== null && distanceKm <= 5 && 'קרוב גיאוגרפית',
          ].filter(Boolean),
        }
      })
      .filter(p => p._similarityScore > 2) // minimum threshold
      .sort((a, b) => b._similarityScore - a._similarityScore)
      .slice(0, limit)

    setCache(cacheKey, scored)
    res.json(scored)
  } catch (err) {
    if (isAbortError(err)) return
    next(err)
  }
})

// GET /api/plots/:id/nearby - Find plots near a given plot (geo-proximity)
router.get('/:id/nearby', sanitizePlotId, computeHeavyLimiter, requestAbortSignal, async (req, res, next) => {
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

    const center = calcCentroid(plot.coordinates)
    if (!center) return res.json([])

    // Get all plots (cached) and compute distance — avoids redundant Supabase queries.
    // Previously called getPublishedPlots({}) directly, bypassing the 30s plot cache.
    const allPlots = await plotCache.wrap('plots:{}', () => getPublishedPlots({}), 30_000)

    const nearby = allPlots
      .filter(p => p.id !== req.params.id && p.coordinates && p.coordinates.length > 0)
      .map(p => {
        const pCenter = calcCentroid(p.coordinates)
        if (!pCenter) return null
        const dist = formatDistance(haversineKm(center.lat, center.lng, pCenter.lat, pCenter.lng))
        return { ...p, distance_km: dist.km }
      })
      .filter(p => p && p.distance_km <= maxKm)
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, limit)

    setCache(cacheKey, nearby)
    res.json(nearby)
  } catch (err) {
    if (isAbortError(err)) return
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

// GET /api/plots/by-gush/:block/:parcel — SEO-friendly plot lookup by gush/helka numbers.
// Enables human-readable URLs like /plot/by-gush/10043/15 for search engines and sharing.
// Google indexes these better than UUID-based URLs, and investors naturally search
// "גוש 10043 חלקה 15" — this route resolves that to the actual plot.
// Returns 301 redirect to the canonical UUID-based URL for deduplication.
router.get('/by-gush/:block/:parcel', async (req, res, next) => {
  try {
    const { block, parcel } = req.params
    // Validate inputs — must be numeric
    if (!/^\d+$/.test(block) || !/^\d+$/.test(parcel)) {
      return res.status(400).json({
        error: 'מספר גוש/חלקה לא תקין',
        errorCode: 'INVALID_GUSH_HELKA',
      })
    }

    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')

    const cacheKey = `gush:${block}:${parcel}`
    const plot = await plotCache.wrap(cacheKey, async () => {
      const { data, error } = await supabaseAdmin
        .from('plots')
        .select('id, block_number, number, city')
        .eq('block_number', parseInt(block, 10))
        .eq('number', parcel)
        .eq('is_published', true)
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
      return data || null
    }, 300_000)

    if (!plot) {
      return res.status(404).json({
        error: `לא נמצאה חלקה: גוש ${block} חלקה ${parcel}`,
        errorCode: 'PLOT_NOT_FOUND',
        suggestion: 'נסה לחפש במפה הראשית',
      })
    }

    // Return the plot info with its canonical ID (for API consumers)
    // The frontend can use this to redirect to /plot/:id
    res.json({
      id: plot.id,
      block_number: plot.block_number,
      number: plot.number,
      city: plot.city,
      url: `/plot/${plot.id}`,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/plots/recommendations - Personalized plot recommendations based on favorites.
// Analyzes the user's favorite plots to build a preference profile (price range, city,
// zoning stage, ROI level, size) and returns non-favorited plots that match that profile.
// Like Netflix's "Because you liked..." or Madlan's "מומלץ עבורך" — a proven engagement
// pattern that increases time-on-site and conversion rates.
// No auth required — favorites are client-side, IDs are sent as a query param.
router.get('/recommendations', computeHeavyLimiter, requestAbortSignal, async (req, res, next) => {
  try {
    const favParam = req.query.favorites
    if (!favParam || typeof favParam !== 'string') {
      return res.status(400).json({ error: 'חסר פרמטר favorites', errorCode: 'MISSING_FAVORITES' })
    }
    const favIds = favParam.split(',').map(id => id.trim()).filter(Boolean)
    if (favIds.length === 0) {
      return res.json([])
    }
    if (favIds.length > 20) {
      return res.status(400).json({ error: 'עד 20 מועדפים', errorCode: 'TOO_MANY_FAVORITES' })
    }
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!favIds.every(id => uuidRegex.test(id))) {
      return res.status(400).json({ error: 'פורמט ID לא תקין', errorCode: 'INVALID_ID_FORMAT' })
    }

    const limit = Math.min(parseInt(req.query.limit) || 6, 12)
    res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300')

    const cacheKey = `recommendations:${favIds.sort().join(',')}:${limit}`
    const recommendations = await plotCache.wrap(cacheKey, async () => {
      // Fetch all published plots (from cache — very fast after first call)
      const allPlots = await plotCache.wrap('plots:{}', () => getPublishedPlots({}), 30_000)
      if (!allPlots || allPlots.length === 0) return []

      const favSet = new Set(favIds)
      const favPlots = allPlots.filter(p => favSet.has(p.id))
      if (favPlots.length === 0) return []

      // ── Build preference profile from favorites ───────────────────
      // Extract the statistical center of the user's favorites for each dimension.
      // Using median instead of mean to resist outlier skew (e.g., one ₪5M plot
      // among ₪200K plots shouldn't shift the entire profile).
      const sortedNum = arr => [...arr].sort((a, b) => a - b)
      const median = arr => {
        if (arr.length === 0) return 0
        const mid = Math.floor(arr.length / 2)
        return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2
      }

      const prices = sortedNum(favPlots.map(p => p.total_price || 0).filter(x => x > 0))
      const sizes = sortedNum(favPlots.map(p => p.size_sqm || 0).filter(x => x > 0))
      const rois = sortedNum(favPlots.map(p => {
        const price = p.total_price || 0
        const proj = p.projected_value || 0
        return price > 0 ? ((proj - price) / price) * 100 : 0
      }).filter(x => x !== 0))

      const medianPrice = median(prices)
      const medianSize = median(sizes)
      const medianRoi = median(rois)

      // Preferred cities (frequency-weighted)
      const cityCounts = {}
      favPlots.forEach(p => { cityCounts[p.city || ''] = (cityCounts[p.city || ''] || 0) + 1 })
      const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).map(([city]) => city)

      // Preferred zoning stages
      const ZONING_ORDER = [
        'AGRICULTURAL', 'MASTER_PLAN_DEPOSIT', 'MASTER_PLAN_APPROVED',
        'DETAILED_PLAN_PREP', 'DETAILED_PLAN_DEPOSIT', 'DETAILED_PLAN_APPROVED',
        'DEVELOPER_TENDER', 'BUILDING_PERMIT',
      ]
      const zoningIdxes = favPlots
        .map(p => ZONING_ORDER.indexOf(p.zoning_stage || 'AGRICULTURAL'))
        .filter(i => i >= 0)
      const medianZoningIdx = zoningIdxes.length > 0
        ? Math.round(median(sortedNum(zoningIdxes)))
        : 3

      // Compute centroid of favorite plots for geographic proximity scoring
      let avgLat = 0, avgLng = 0, geoCount = 0
      for (const p of favPlots) {
        const center = calcCentroid(p.coordinates)
        if (center) {
          avgLat += center.lat
          avgLng += center.lng
          geoCount++
        }
      }
      const favCentroid = geoCount > 0 ? { lat: avgLat / geoCount, lng: avgLng / geoCount } : null

      // ── Score each candidate plot against the preference profile ────
      const candidates = allPlots
        .filter(p => !favSet.has(p.id) && p.status !== 'SOLD')
        .map(p => {
          const price = p.total_price || 0
          const size = p.size_sqm || 0
          const proj = p.projected_value || 0
          const roi = price > 0 ? ((proj - price) / price) * 100 : 0
          const zoningIdx = ZONING_ORDER.indexOf(p.zoning_stage || 'AGRICULTURAL')

          // Price similarity (0-3): closer to median = higher score
          let priceScore = 0
          if (medianPrice > 0 && price > 0) {
            const diff = Math.abs(price - medianPrice) / medianPrice
            priceScore = Math.max(0, 3 - diff * 4)
          }

          // Size similarity (0-2)
          let sizeScore = 0
          if (medianSize > 0 && size > 0) {
            const diff = Math.abs(size - medianSize) / medianSize
            sizeScore = Math.max(0, 2 - diff * 3)
          }

          // ROI similarity (0-2): prefer equal or better ROI
          let roiScore = 0
          if (medianRoi > 0) {
            if (roi >= medianRoi) roiScore = 2 // Equal or better ROI = max
            else {
              const diff = (medianRoi - roi) / medianRoi
              roiScore = Math.max(0, 2 - diff * 3)
            }
          }

          // City preference (0-2): top city = 2, second = 1, other = 0
          const cityRank = topCities.indexOf(p.city || '')
          const cityScore = cityRank === 0 ? 2 : cityRank === 1 ? 1.5 : cityRank >= 2 ? 0.5 : 0

          // Zoning proximity (0-2): closer stage to median = higher
          const zoningDist = Math.abs(zoningIdx - medianZoningIdx)
          const zoningScore = zoningDist === 0 ? 2 : zoningDist === 1 ? 1.5 : zoningDist === 2 ? 0.5 : 0

          // Geographic proximity (0-2): closer to favorites cluster = higher
          let geoScore = 0
          let distKm = null
          if (favCentroid) {
            const pCenter = calcCentroid(p.coordinates)
            if (pCenter) {
              distKm = haversineKm(favCentroid.lat, favCentroid.lng, pCenter.lat, pCenter.lng)
              if (distKm <= 3) geoScore = 2
              else if (distKm <= 8) geoScore = 1.5
              else if (distKm <= 15) geoScore = 1
              else if (distKm <= 25) geoScore = 0.5
            }
          }

          // Freshness bonus (0-1): newer listings are more relevant
          const daysOld = p.created_at
            ? Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000)
            : 999
          const freshBonus = daysOld <= 3 ? 1 : daysOld <= 7 ? 0.7 : daysOld <= 14 ? 0.3 : 0

          const totalScore = priceScore + sizeScore + roiScore + cityScore + zoningScore + geoScore + freshBonus

          // Build explanation of why this was recommended
          const reasons = [
            priceScore >= 2 && 'טווח מחיר דומה',
            sizeScore >= 1.5 && 'שטח דומה',
            roiScore >= 1.5 && (roi >= medianRoi ? 'תשואה גבוהה יותר' : 'תשואה דומה'),
            cityScore >= 1.5 && `${p.city}`,
            zoningScore >= 1.5 && 'שלב תכנוני דומה',
            geoScore >= 1.5 && 'קרוב למועדפים שלך',
            freshBonus >= 0.7 && 'חדש בשוק',
          ].filter(Boolean)

          return {
            ...p,
            _recScore: Math.round(totalScore * 100) / 100,
            _recReasons: reasons.slice(0, 3),
            _distanceKm: distKm !== null ? Math.round(distKm * 10) / 10 : null,
            _roi: Math.round(roi),
          }
        })
        .filter(p => p._recScore > 3) // minimum relevance threshold
        .sort((a, b) => b._recScore - a._recScore)
        .slice(0, limit)

      return candidates
    }, 120_000) // Cache for 2 minutes

    const etag = generateETag(recommendations)
    res.set('ETag', etag)
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end()
    }

    res.json(recommendations)
  } catch (err) {
    if (isAbortError(err)) return
    next(err)
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

    // Last-Modified — enables If-Modified-Since conditional requests from CDNs/proxies.
    // The list endpoint already sets this; matching it here ensures consistent caching
    // behavior across all plot endpoints (CDNs can validate both ways: ETag or time-based).
    const updatedAt = plot.updated_at || plot.created_at
    if (updatedAt) {
      res.set('Last-Modified', new Date(updatedAt).toUTCString())
    }

    res.json(plot)
  } catch (err) {
    next(err)
  }
})

export default router
