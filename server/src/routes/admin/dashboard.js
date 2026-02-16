import { Router } from 'express'
import { auth } from '../../middleware/auth.js'
import { adminOnly } from '../../middleware/adminOnly.js'
import { supabaseAdmin } from '../../config/supabase.js'

const router = Router()
router.use(auth, adminOnly)

// GET /api/admin/dashboard - Dashboard stats
router.get('/', async (req, res, next) => {
  try {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [plotsResult, availableResult, leadsMonthResult, leadsAllResult, recentLeadsResult] = await Promise.all([
      supabaseAdmin.from('plots').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('plots').select('id', { count: 'exact', head: true }).eq('status', 'AVAILABLE').eq('is_published', true),
      supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
      supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('leads').select(`*, plots:plot_id(block_number, number, city)`).order('created_at', { ascending: false }).limit(10),
    ])

    const convertedResult = await supabaseAdmin
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'converted')

    const totalLeads = leadsAllResult.count || 0
    const convertedLeads = convertedResult.count || 0
    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0

    res.json({
      totalPlots: plotsResult.count || 0,
      availablePlots: availableResult.count || 0,
      leadsThisMonth: leadsMonthResult.count || 0,
      conversionRate,
      recentLeads: recentLeadsResult.data || [],
    })
  } catch (err) {
    next(err)
  }
})

export default router
