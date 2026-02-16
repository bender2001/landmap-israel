import { Router } from 'express'
import { auth } from '../../middleware/auth.js'
import { adminOnly } from '../../middleware/adminOnly.js'
import { supabaseAdmin } from '../../config/supabase.js'
import { logActivity } from '../../services/activityLogger.js'

const router = Router()
router.use(auth, adminOnly)

const SORT_COLUMNS = ['created_at', 'full_name', 'phone', 'email', 'status']
const VALID_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost']

// ─── Bulk endpoints (before /:id) ───

// POST /api/admin/leads/bulk-status
router.post('/bulk-status', async (req, res, next) => {
  try {
    const { ids, status } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' })
    }
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    const { error } = await supabaseAdmin
      .from('leads')
      .update({ status, updated_at: new Date().toISOString() })
      .in('id', ids)

    if (error) throw error

    logActivity({
      action: 'status_change',
      entityType: 'lead',
      entityId: null,
      userId: req.user?.id,
      description: `עודכן סטטוס ${ids.length} לידים ל-${status}`,
      metadata: { ids, status },
    })

    res.json({ success: true, updated: ids.length })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/leads/export - Export leads as CSV (must be before /:id)
router.get('/export', async (req, res, next) => {
  try {
    const { data: leads, error } = await supabaseAdmin
      .from('leads')
      .select(`*, plots:plot_id(block_number, number, city)`)
      .order('created_at', { ascending: false })

    if (error) throw error

    const csv = [
      'Name,Phone,Email,Plot,Status,Date',
      ...(leads || []).map(l => {
        const plot = l.plots ? `${l.plots.block_number}/${l.plots.number} ${l.plots.city}` : ''
        return `"${l.full_name || l.name}","${l.phone}","${l.email}","${plot}","${l.status}","${l.created_at}"`
      }),
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=leads.csv')
    res.send('\uFEFF' + csv) // BOM for Hebrew support in Excel
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/leads - List with pagination & sorting
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 25, status, search, sort_by = 'created_at', sort_dir = 'desc' } = req.query
    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
    const offset = (pageNum - 1) * limitNum

    const sortColumn = SORT_COLUMNS.includes(sort_by) ? sort_by : 'created_at'
    const ascending = sort_dir === 'asc'

    let query = supabaseAdmin
      .from('leads')
      .select(`*, plots:plot_id(block_number, number, city)`, { count: 'exact' })
      .order(sortColumn, { ascending })
      .range(offset, offset + limitNum - 1)

    if (status) {
      query = query.eq('status', status)
    }
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
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

// GET /api/admin/leads/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('leads')
      .select(`*, plots:plot_id(block_number, number, city, total_price)`)
      .eq('id', req.params.id)
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Lead not found' })
    res.json(data)
  } catch (err) {
    next(err)
  }
})

// PATCH /api/admin/leads/:id/status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status, notes } = req.body
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    const update = { status, updated_at: new Date().toISOString() }
    if (notes !== undefined) update.notes = notes

    const { data, error } = await supabaseAdmin
      .from('leads')
      .update(update)
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error

    logActivity({
      action: 'status_change',
      entityType: 'lead',
      entityId: req.params.id,
      userId: req.user?.id,
      description: `שונה סטטוס ליד ${data.full_name || data.name} ל-${status}`,
    })

    res.json(data)
  } catch (err) {
    next(err)
  }
})

export default router
