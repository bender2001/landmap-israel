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
