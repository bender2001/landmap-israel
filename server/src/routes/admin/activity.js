import { Router } from 'express'
import { auth } from '../../middleware/auth.js'
import { adminOnly } from '../../middleware/adminOnly.js'
import { supabaseAdmin } from '../../config/supabase.js'

const router = Router()
router.use(auth, adminOnly)

// GET /api/admin/activity — List activity log entries
router.get('/', async (req, res, next) => {
  try {
    const { entity_type, page = 1, limit = 50 } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)

    let query = supabaseAdmin
      .from('activity_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (entity_type) {
      query = query.eq('entity_type', entity_type)
    }

    const { data, error, count } = await query

    if (error) throw error
    res.json({
      data: data || [],
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
    })
  } catch (err) {
    next(err)
  }
})

export default router
