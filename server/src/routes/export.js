import { Router } from 'express'
import { getPublishedPlots } from '../services/plotService.js'
import { sanitizePlotQuery } from '../middleware/sanitize.js'

const router = Router()

/**
 * GET /api/export/csv — Export filtered plots as CSV download.
 * Supports same query params as /api/plots (city, priceMin, etc.)
 * Used by real estate agents for offline analysis (like Madlan's export feature).
 */
router.get('/csv', sanitizePlotQuery, async (req, res, next) => {
  try {
    const plots = await getPublishedPlots(req.query)

    const headers = [
      'ID', 'גוש', 'חלקה', 'עיר', 'סטטוס', 'מחיר (₪)', 'שווי צפוי (₪)',
      'תשואה (%)', 'שטח (מ"ר)', 'שטח (דונם)', 'מחיר/מ"ר', 'מחיר/דונם',
      'ייעוד קרקע', 'מוכנות', 'מרחק לים (מ)', 'תיאור', 'תאריך יצירה'
    ]

    const escapeCSV = (val) => {
      if (val == null) return ''
      const str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const rows = plots.map(p => {
      const price = p.total_price ?? p.totalPrice ?? 0
      const proj = p.projected_value ?? p.projectedValue ?? 0
      const size = p.size_sqm ?? p.sizeSqM ?? 0
      const roi = price > 0 ? Math.round((proj - price) / price * 100) : 0
      const priceSqm = size > 0 ? Math.round(price / size) : 0
      const priceDunam = size > 0 ? Math.round(price / size * 1000) : 0

      return [
        p.id,
        p.block_number ?? p.blockNumber ?? '',
        p.number ?? '',
        p.city ?? '',
        p.status ?? '',
        price,
        proj,
        roi,
        size,
        size > 0 ? (size / 1000).toFixed(1) : '',
        priceSqm,
        priceDunam,
        p.zoning_stage ?? p.zoningStage ?? '',
        p.readiness_estimate ?? p.readinessEstimate ?? '',
        p.distance_to_sea ?? p.distanceToSea ?? '',
        p.description ?? '',
        p.created_at ?? p.createdAt ?? '',
      ].map(escapeCSV).join(',')
    })

    // BOM for Hebrew Excel compatibility
    const bom = '\uFEFF'
    const csv = bom + headers.join(',') + '\n' + rows.join('\n')

    const filename = `landmap-plots-${new Date().toISOString().slice(0, 10)}.csv`
    res.set('Content-Type', 'text/csv; charset=utf-8')
    res.set('Content-Disposition', `attachment; filename="${filename}"`)
    res.set('Cache-Control', 'no-cache')
    res.send(csv)
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/export/json — Export filtered plots as structured JSON report.
 * Useful for CRM integrations and external tools.
 */
router.get('/json', sanitizePlotQuery, async (req, res, next) => {
  try {
    const plots = await getPublishedPlots(req.query)

    const summary = {
      totalPlots: plots.length,
      totalValue: plots.reduce((s, p) => s + (p.total_price ?? p.totalPrice ?? 0), 0),
      avgRoi: plots.length > 0
        ? Math.round(plots.reduce((s, p) => {
            const price = p.total_price ?? p.totalPrice ?? 0
            const proj = p.projected_value ?? p.projectedValue ?? 0
            return s + (price > 0 ? ((proj - price) / price) * 100 : 0)
          }, 0) / plots.length)
        : 0,
      byCity: {},
      byStatus: {},
      exportedAt: new Date().toISOString(),
    }

    plots.forEach(p => {
      const city = p.city || 'unknown'
      summary.byCity[city] = (summary.byCity[city] || 0) + 1
      summary.byStatus[p.status || 'unknown'] = (summary.byStatus[p.status || 'unknown'] || 0) + 1
    })

    res.set('Cache-Control', 'no-cache')
    res.json({ summary, plots })
  } catch (err) {
    next(err)
  }
})

export default router
