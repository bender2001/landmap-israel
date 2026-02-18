import { Router } from 'express'
import crypto from 'crypto'
import { getPublishedPlots, getPlotById, getPlotStats } from '../services/plotService.js'

const router = Router()

function generateETag(data) {
  return '"' + crypto.createHash('md5').update(JSON.stringify(data)).digest('hex').slice(0, 16) + '"'
}

// GET /api/plots - List published plots with optional filters
router.get('/', async (req, res, next) => {
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
router.get('/:id/nearby', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300')
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
    const limit = Math.min(parseInt(req.query.limit) || 5, 10)
    const maxKm = parseFloat(req.query.maxKm) || 10

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

    res.json(nearby)
  } catch (err) {
    next(err)
  }
})

// GET /api/plots/:id - Single plot with documents & images
router.get('/:id', async (req, res, next) => {
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
