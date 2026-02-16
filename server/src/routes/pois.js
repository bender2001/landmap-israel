import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'

const router = Router()

// GET /api/pois - List all points of interest
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('points_of_interest')
      .select('*')
      .order('name')

    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

export default router
