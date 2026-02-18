import { Router } from 'express'
import { auth } from '../../middleware/auth.js'
import { adminOnly } from '../../middleware/adminOnly.js'
import { validate } from '../../middleware/validate.js'
import { createPlotSchema, updatePlotSchema } from '../../schemas/plot.js'
import { getAllPlots, getPlotByIdAdmin, createPlot, updatePlot, deletePlot } from '../../services/plotService.js'
import { supabaseAdmin } from '../../config/supabase.js'
import { logActivity } from '../../services/activityLogger.js'
import { invalidatePlotCaches } from '../../services/cacheService.js'

const router = Router()
router.use(auth, adminOnly)

// Whitelist of columns allowed for sorting
const SORT_COLUMNS = ['created_at', 'city', 'block_number', 'total_price', 'size_sqm', 'status', 'zoning_stage', 'is_published']

// ─── Bulk endpoints (must be before /:id) ───

// POST /api/admin/plots/bulk-delete
router.post('/bulk-delete', async (req, res, next) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' })
    }

    const { error } = await supabaseAdmin
      .from('plots')
      .delete()
      .in('id', ids)

    if (error) throw error

    invalidatePlotCaches()
    logActivity({
      action: 'delete',
      entityType: 'plot',
      entityId: null,
      userId: req.user?.id,
      description: `נמחקו ${ids.length} חלקות בפעולה מרוכזת`,
      metadata: { ids },
    })

    res.json({ success: true, deleted: ids.length })
  } catch (err) {
    next(err)
  }
})

// POST /api/admin/plots/bulk-publish
router.post('/bulk-publish', async (req, res, next) => {
  try {
    const { ids, is_published } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' })
    }

    const { error } = await supabaseAdmin
      .from('plots')
      .update({ is_published: !!is_published, updated_at: new Date().toISOString() })
      .in('id', ids)

    if (error) throw error

    invalidatePlotCaches()
    logActivity({
      action: is_published ? 'publish' : 'unpublish',
      entityType: 'plot',
      entityId: null,
      userId: req.user?.id,
      description: `${is_published ? 'פורסמו' : 'הוסרו מפרסום'} ${ids.length} חלקות`,
      metadata: { ids },
    })

    res.json({ success: true, updated: ids.length })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/plots - List all plots with pagination & sorting
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 25, search, sort_by = 'created_at', sort_dir = 'desc' } = req.query
    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
    const offset = (pageNum - 1) * limitNum

    const sortColumn = SORT_COLUMNS.includes(sort_by) ? sort_by : 'created_at'
    const ascending = sort_dir === 'asc'

    let query = supabaseAdmin
      .from('plots')
      .select('*', { count: 'exact' })
      .order(sortColumn, { ascending })
      .range(offset, offset + limitNum - 1)

    if (search) {
      query = query.or(`city.ilike.%${search}%,block_number.ilike.%${search}%`)
    }

    const { data, error, count } = await query
    if (error) throw error

    res.json({
      data: data || [],
      total: count || 0,
      page: pageNum,
      limit: limitNum,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/plots/:id
router.get('/:id', async (req, res, next) => {
  try {
    const plot = await getPlotByIdAdmin(req.params.id)
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
    invalidatePlotCaches()
    logActivity({
      action: 'create',
      entityType: 'plot',
      entityId: plot.id,
      userId: req.user?.id,
      description: `נוצרה חלקה: גוש ${plot.block_number} חלקה ${plot.number} - ${plot.city}`,
    })
    res.status(201).json(plot)
  } catch (err) {
    next(err)
  }
})

// PATCH /api/admin/plots/:id
router.patch('/:id', validate(updatePlotSchema), async (req, res, next) => {
  try {
    const plot = await updatePlot(req.params.id, req.validated)
    invalidatePlotCaches()
    logActivity({
      action: 'update',
      entityType: 'plot',
      entityId: plot.id,
      userId: req.user?.id,
      description: `עודכנה חלקה: גוש ${plot.block_number} חלקה ${plot.number}`,
    })
    res.json(plot)
  } catch (err) {
    next(err)
  }
})

// DELETE /api/admin/plots/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await deletePlot(req.params.id)
    invalidatePlotCaches()
    logActivity({
      action: 'delete',
      entityType: 'plot',
      entityId: req.params.id,
      userId: req.user?.id,
      description: `נמחקה חלקה ${req.params.id}`,
    })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/admin/plots/:id/publish
router.patch('/:id/publish', async (req, res, next) => {
  try {
    const plot = await updatePlot(req.params.id, { is_published: req.body.is_published })
    invalidatePlotCaches()
    logActivity({
      action: req.body.is_published ? 'publish' : 'unpublish',
      entityType: 'plot',
      entityId: req.params.id,
      userId: req.user?.id,
      description: `חלקה ${req.params.id} ${req.body.is_published ? 'פורסמה' : 'הוסרה מפרסום'}`,
    })
    res.json(plot)
  } catch (err) {
    next(err)
  }
})

export default router
