import { Router } from 'express'
import { analytics } from '../../services/analyticsService.js'

const router = Router()

// GET /api/admin/analytics - Full analytics dashboard data
router.get('/', (req, res) => {
  res.json(analytics.getSummary())
})

// GET /api/admin/analytics/searches - Top searches
router.get('/searches', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100)
  res.json({
    top: analytics.getTopSearches(limit),
    zeroResults: analytics.getZeroResultSearches(limit),
  })
})

// GET /api/admin/analytics/plots - Most viewed plots
router.get('/plots', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50)
  res.json(analytics.getTopPlots(limit))
})

export default router
