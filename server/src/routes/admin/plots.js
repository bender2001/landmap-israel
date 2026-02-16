import { Router } from 'express'
import { auth } from '../../middleware/auth.js'
import { adminOnly } from '../../middleware/adminOnly.js'
import { validate } from '../../middleware/validate.js'
import { createPlotSchema, updatePlotSchema } from '../../schemas/plot.js'
import { getAllPlots, getPlotById, createPlot, updatePlot, deletePlot } from '../../services/plotService.js'

const router = Router()
router.use(auth, adminOnly)

// GET /api/admin/plots - List all plots (including unpublished)
router.get('/', async (req, res, next) => {
  try {
    const plots = await getAllPlots()
    res.json(plots)
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/plots/:id
router.get('/:id', async (req, res, next) => {
  try {
    const plot = await getPlotById(req.params.id)
    if (!plot) return res.status(404).json({ error: 'Plot not found' })
    res.json(plot)
  } catch (err) {
    next(err)
  }
})

// POST /api/admin/plots
router.post('/', validate(createPlotSchema), async (req, res, next) => {
  try {
    const plot = await createPlot(req.validated)
    res.status(201).json(plot)
  } catch (err) {
    next(err)
  }
})

// PATCH /api/admin/plots/:id
router.patch('/:id', validate(updatePlotSchema), async (req, res, next) => {
  try {
    const plot = await updatePlot(req.params.id, req.validated)
    res.json(plot)
  } catch (err) {
    next(err)
  }
})

// DELETE /api/admin/plots/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await deletePlot(req.params.id)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/admin/plots/:id/publish
router.patch('/:id/publish', async (req, res, next) => {
  try {
    const plot = await updatePlot(req.params.id, { is_published: req.body.is_published })
    res.json(plot)
  } catch (err) {
    next(err)
  }
})

export default router
