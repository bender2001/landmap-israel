import { Router } from 'express'
import crypto from 'crypto'
import { getPublishedPlots, getPlotById, getPlotStats } from '../services/plotService.js'
import { sanitizePlotQuery, sanitizePlotId } from '../middleware/sanitize.js'

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
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
    const plots = await getPublishedPlots(req.query)

    // ETag support — avoid re-sending unchanged data
    const etag = generateETag(plots)
    res.set('ETag', etag)
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end()
    }

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
    const stats = await getPlotStats()
    res.json(stats)
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
  try {
    // Atomic increment to avoid read-then-write race condition
    const { supabaseAdmin } = await import('../config/supabase.js')
    await supabaseAdmin.rpc('increment_views', { plot_id: req.params.id }).catch(async () => {
      // Fallback if RPC doesn't exist: use raw update with coalesce
      await supabaseAdmin
        .from('plots')
        .update({ views: supabaseAdmin.raw('coalesce(views, 0) + 1') })
        .eq('id', req.params.id)
        .catch(() => {
          // Last resort: read-then-write
          return supabaseAdmin
            .from('plots')
            .select('views')
            .eq('id', req.params.id)
            .single()
            .then(({ data: plot }) => {
              if (plot) {
                return supabaseAdmin
                  .from('plots')
                  .update({ views: (plot.views || 0) + 1 })
                  .eq('id', req.params.id)
              }
            })
        })
    })
    res.json({ ok: true })
  } catch {
    // Non-critical — don't fail the request
    res.json({ ok: true })
  }
})

// GET /api/plots/:id - Single plot with documents & images
router.get('/:id', sanitizePlotId, async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120')
    const plot = await getPlotById(req.params.id)
    if (!plot) return res.status(404).json({ error: 'Plot not found' })
    res.json(plot)
  } catch (err) {
    next(err)
  }
})

export default router
