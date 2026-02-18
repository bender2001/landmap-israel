/**
 * data-sources.js — API routes for real data from Israeli government sources
 *
 * Routes:
 * - GET  /api/data/transactions         — Real transactions by city
 * - GET  /api/data/transactions/nearby/:plotId — Transactions near a plot
 * - GET  /api/data/plans                — Planning permits by city
 * - GET  /api/data/plans/plot/:plotId   — Plans affecting a plot
 * - POST /api/data/enrich/:plotId       — Trigger enrichment (admin)
 * - GET  /api/data/sources              — Data source status
 * - POST /api/data/fetch/:source        — Trigger fetch from source (admin)
 */

import { Router } from 'express'
import {
  fetchRealTransactions,
  storeTransactions,
  fetchPlanningData,
  fetchPlanningDataByCity,
  storePlans,
  getDataSourceStatus,
} from '../services/dataSourceService.js'
import {
  enrichPlotFromSources,
  getNearbyTransactions,
  getPlotPlans,
} from '../services/dataEnrichmentService.js'
import { supabaseAdmin } from '../config/supabase.js'

const router = Router()

// UUID validation
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Simple admin check (reuse existing admin token pattern)
function requireAdmin(req, res, next) {
  const secret = process.env.ADMIN_SECRET
  const token = req.headers['x-admin-token'] || req.query.adminToken
  if (secret && token !== secret) {
    return res.status(403).json({ error: 'גישת מנהל נדרשת', errorCode: 'ADMIN_REQUIRED' })
  }
  next()
}

// ─── GET /transactions ─────────────────────────────────────────────────
// Fetch real transactions by city (from nadlan.gov.il or DB cache)
router.get('/transactions', async (req, res, next) => {
  try {
    const city = req.query.city
    const months = Math.min(parseInt(req.query.months) || 12, 60)

    if (!city) {
      return res.status(400).json({
        error: 'נדרש שם עיר (city)',
        errorCode: 'MISSING_CITY',
        example: '/api/data/transactions?city=חדרה&months=12',
      })
    }

    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')

    const transactions = await fetchRealTransactions(city, months)

    // If we got fresh data from the API, store it in background
    if (transactions.length > 0 && transactions[0]?.raw_data) {
      storeTransactions(transactions).catch(err =>
        console.warn('[data-routes] Background store failed:', err.message)
      )
    }

    res.json({
      city,
      months,
      count: transactions.length,
      source: 'nadlan.gov.il',
      transactions,
      disclaimer: 'נתוני עסקאות ממשרד המשפטים — נדל"ן נט (nadlan.gov.il). נתונים לצורכי מידע בלבד.',
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET /transactions/nearby/:plotId ──────────────────────────────────
// Get transactions near a specific plot (from linked data)
router.get('/transactions/nearby/:plotId', async (req, res, next) => {
  try {
    const { plotId } = req.params
    if (!UUID_RE.test(plotId)) {
      return res.status(400).json({ error: 'מזהה חלקה לא תקין', errorCode: 'INVALID_PLOT_ID' })
    }

    const radius = Math.min(parseInt(req.query.radius) || 1000, 10000) // max 10km

    res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300')

    const transactions = await getNearbyTransactions(plotId, radius)

    // Compute summary stats
    const validTx = transactions.filter(t => t.deal_amount > 0 && t.size_sqm > 0)
    const avgPriceSqm = validTx.length > 0
      ? Math.round(validTx.reduce((s, t) => s + t.deal_amount / t.size_sqm, 0) / validTx.length)
      : null

    res.json({
      plotId,
      radius,
      count: transactions.length,
      avg_price_per_sqm: avgPriceSqm,
      source: 'nadlan.gov.il',
      transactions,
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET /plans ────────────────────────────────────────────────────────
// Fetch planning permits by city
router.get('/plans', async (req, res, next) => {
  try {
    const city = req.query.city

    if (!city) {
      return res.status(400).json({
        error: 'נדרש שם עיר (city)',
        errorCode: 'MISSING_CITY',
        example: '/api/data/plans?city=חדרה',
      })
    }

    res.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200')

    const plans = await fetchPlanningDataByCity(city)

    // Store in background
    if (plans.length > 0 && plans[0]?.raw_data) {
      storePlans(plans).catch(err =>
        console.warn('[data-routes] Background plan store failed:', err.message)
      )
    }

    res.json({
      city,
      count: plans.length,
      source: 'govmap.gov.il',
      plans,
      disclaimer: 'נתוני תכנון ממנהל התכנון — GovMap (govmap.gov.il). נתונים לצורכי מידע בלבד.',
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET /plans/plot/:plotId ───────────────────────────────────────────
// Get plans affecting a specific plot
router.get('/plans/plot/:plotId', async (req, res, next) => {
  try {
    const { plotId } = req.params
    if (!UUID_RE.test(plotId)) {
      return res.status(400).json({ error: 'מזהה חלקה לא תקין', errorCode: 'INVALID_PLOT_ID' })
    }

    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')

    const plans = await getPlotPlans(plotId)

    res.json({
      plotId,
      count: plans.length,
      source: 'govmap.gov.il',
      plans,
    })
  } catch (err) {
    next(err)
  }
})

// ─── POST /enrich/:plotId ──────────────────────────────────────────────
// Trigger full enrichment for a plot (admin only)
router.post('/enrich/:plotId', requireAdmin, async (req, res, next) => {
  try {
    const { plotId } = req.params
    if (!UUID_RE.test(plotId)) {
      return res.status(400).json({ error: 'מזהה חלקה לא תקין', errorCode: 'INVALID_PLOT_ID' })
    }

    const result = await enrichPlotFromSources(plotId)

    res.json({
      success: result.errors.length === 0,
      ...result,
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET /sources ──────────────────────────────────────────────────────
// Get data source status and health
router.get('/sources', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120')

    const sources = await getDataSourceStatus()

    // Add transaction and plan counts
    const [txCount, planCount] = await Promise.all([
      supabaseAdmin.from('real_transactions').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('planning_permits').select('id', { count: 'exact', head: true }),
    ])

    res.json({
      sources,
      totals: {
        transactions: txCount.count || 0,
        plans: planCount.count || 0,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ─── POST /fetch/:source ──────────────────────────────────────────────
// Trigger a manual fetch from a data source (admin only)
router.post('/fetch/:source', requireAdmin, async (req, res, next) => {
  try {
    const { source } = req.params
    const { city, blockNumber, parcelNumber, months } = req.body || {}

    switch (source) {
      case 'nadlan': {
        if (!city) {
          return res.status(400).json({ error: 'נדרש שם עיר (city)', errorCode: 'MISSING_CITY' })
        }
        const transactions = await fetchRealTransactions(city, months || 12)
        const stored = await storeTransactions(transactions)
        res.json({
          source: 'nadlan.gov.il',
          city,
          fetched: transactions.length,
          ...stored,
        })
        break
      }

      case 'govmap': {
        if (!city && !blockNumber) {
          return res.status(400).json({
            error: 'נדרש שם עיר (city) או מספר גוש (blockNumber)',
            errorCode: 'MISSING_PARAMS',
          })
        }
        const plans = blockNumber
          ? await fetchPlanningData(blockNumber, parcelNumber)
          : await fetchPlanningDataByCity(city)
        const stored = await storePlans(plans)
        res.json({
          source: 'govmap.gov.il',
          fetched: plans.length,
          ...stored,
        })
        break
      }

      default:
        res.status(400).json({
          error: `מקור לא מוכר: ${source}`,
          errorCode: 'UNKNOWN_SOURCE',
          available: ['nadlan', 'govmap'],
        })
    }
  } catch (err) {
    next(err)
  }
})

export default router
