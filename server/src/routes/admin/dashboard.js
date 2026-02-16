import { Router } from 'express'
import { auth } from '../../middleware/auth.js'
import { adminOnly } from '../../middleware/adminOnly.js'
import { supabaseAdmin } from '../../config/supabase.js'

const router = Router()
router.use(auth, adminOnly)

// GET /api/admin/dashboard - Dashboard stats + chart data
router.get('/', async (req, res, next) => {
  try {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // 30 days ago for chart
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [plotsResult, availableResult, leadsMonthResult, leadsAllResult, recentLeadsResult, leadsByDayResult, leadsByStatusResult, plotsByStatusResult] = await Promise.all([
      supabaseAdmin.from('plots').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('plots').select('id', { count: 'exact', head: true }).eq('status', 'AVAILABLE').eq('is_published', true),
      supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
      supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('leads').select(`*, plots:plot_id(block_number, number, city)`).order('created_at', { ascending: false }).limit(10),
      // Leads by day (last 30 days)
      supabaseAdmin.from('leads').select('created_at').gte('created_at', thirtyDaysAgo).order('created_at', { ascending: true }),
      // Leads by status
      supabaseAdmin.from('leads').select('status'),
      // Plots by status
      supabaseAdmin.from('plots').select('status'),
    ])

    const convertedResult = await supabaseAdmin
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'converted')

    const totalLeads = leadsAllResult.count || 0
    const convertedLeads = convertedResult.count || 0
    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0

    // Aggregate leads by day
    const leadsByDay = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const key = d.toISOString().slice(0, 10)
      leadsByDay[key] = 0
    }
    for (const lead of (leadsByDayResult.data || [])) {
      const key = lead.created_at.slice(0, 10)
      if (leadsByDay[key] !== undefined) leadsByDay[key]++
    }

    // Aggregate leads by status
    const leadsByStatus = {}
    for (const lead of (leadsByStatusResult.data || [])) {
      leadsByStatus[lead.status] = (leadsByStatus[lead.status] || 0) + 1
    }

    // Aggregate plots by status
    const plotsByStatus = {}
    for (const plot of (plotsByStatusResult.data || [])) {
      plotsByStatus[plot.status] = (plotsByStatus[plot.status] || 0) + 1
    }

    res.json({
      totalPlots: plotsResult.count || 0,
      availablePlots: availableResult.count || 0,
      leadsThisMonth: leadsMonthResult.count || 0,
      conversionRate,
      recentLeads: recentLeadsResult.data || [],
      // Chart data
      charts: {
        leadsByDay: Object.entries(leadsByDay).map(([date, count]) => ({ date, count })),
        leadsByStatus,
        plotsByStatus,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
