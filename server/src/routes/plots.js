import { Router } from 'express'
import { getPublishedPlots, getPlotById } from '../services/plotService.js'

const router = Router()

// GET /api/plots - List published plots with optional filters
router.get('/', async (req, res, next) => {
  try {
    const plots = await getPublishedPlots(req.query)
    res.json(plots)
  } catch (err) {
    next(err)
  }
})

// GET /api/plots/:id - Single plot with documents & images
router.get('/:id', async (req, res, next) => {
  try {
    const plot = await getPlotById(req.params.id)
    if (!plot) return res.status(404).json({ error: 'Plot not found' })
    res.json(plot)
  } catch (err) {
    next(err)
  }
})

export default router
