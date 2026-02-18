import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'

const router = Router()

/**
 * GET /api/market/overview
 * Aggregated market stats: per-city averages, price ranges, distribution.
 * Used by the /areas page and market widgets.
 * Heavy cache (5 min) since this is expensive.
 */
router.get('/overview', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')

    const { data: plots, error } = await supabaseAdmin
      .from('plots')
      .select('city, status, total_price, projected_value, size_sqm, zoning_stage, readiness_estimate')
      .eq('is_published', true)

    if (error) throw error
    if (!plots || plots.length === 0) {
      return res.json({ total: 0, cities: [] })
    }

    // Per-city aggregation
    const cityMap = {}
    for (const p of plots) {
      const city = p.city || 'אחר'
      if (!cityMap[city]) {
        cityMap[city] = {
          city,
          count: 0,
          available: 0,
          totalPrice: 0,
          totalProj: 0,
          totalArea: 0,
          minPrice: Infinity,
          maxPrice: 0,
          minPriceSqm: Infinity,
          maxPriceSqm: 0,
          byZoning: {},
        }
      }
      const c = cityMap[city]
      const price = p.total_price || 0
      const size = p.size_sqm || 1

      c.count += 1
      if (p.status === 'AVAILABLE') c.available += 1
      c.totalPrice += price
      c.totalProj += p.projected_value || 0
      c.totalArea += p.size_sqm || 0

      if (price > 0 && price < c.minPrice) c.minPrice = price
      if (price > c.maxPrice) c.maxPrice = price

      const priceSqm = size > 0 ? price / size : 0
      if (priceSqm > 0 && priceSqm < c.minPriceSqm) c.minPriceSqm = priceSqm
      if (priceSqm > c.maxPriceSqm) c.maxPriceSqm = priceSqm

      const zoning = p.zoning_stage || 'UNKNOWN'
      c.byZoning[zoning] = (c.byZoning[zoning] || 0) + 1
    }

    const cities = Object.values(cityMap).map(c => ({
      city: c.city,
      count: c.count,
      available: c.available,
      avgPricePerSqm: c.totalArea > 0 ? Math.round(c.totalPrice / c.totalArea) : 0,
      avgPricePerDunam: c.totalArea > 0 ? Math.round((c.totalPrice / c.totalArea) * 1000) : 0,
      avgRoi: c.totalPrice > 0 ? Math.round(((c.totalProj - c.totalPrice) / c.totalPrice) * 100) : 0,
      totalArea: c.totalArea,
      totalValue: c.totalPrice,
      priceRange: { min: c.minPrice === Infinity ? 0 : c.minPrice, max: c.maxPrice },
      priceSqmRange: { min: c.minPriceSqm === Infinity ? 0 : Math.round(c.minPriceSqm), max: Math.round(c.maxPriceSqm) },
      byZoning: c.byZoning,
    })).sort((a, b) => b.count - a.count)

    // Global aggregates
    const totalPrice = plots.reduce((s, p) => s + (p.total_price || 0), 0)
    const totalProj = plots.reduce((s, p) => s + (p.projected_value || 0), 0)
    const totalArea = plots.reduce((s, p) => s + (p.size_sqm || 0), 0)

    res.json({
      total: plots.length,
      available: plots.filter(p => p.status === 'AVAILABLE').length,
      avgRoi: totalPrice > 0 ? Math.round(((totalProj - totalPrice) / totalPrice) * 100) : 0,
      totalArea,
      totalValue: totalPrice,
      cities,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/market/compare?cities=חדרה,נתניה
 * Side-by-side city comparison with detailed metrics.
 */
router.get('/compare', async (req, res, next) => {
  try {
    const citiesParam = req.query.cities
    if (!citiesParam) return res.status(400).json({ error: 'cities parameter required' })

    const cities = citiesParam.split(',').map(c => c.trim()).filter(Boolean).slice(0, 5)
    if (cities.length === 0) return res.status(400).json({ error: 'at least one city required' })

    res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300')

    const { data: plots, error } = await supabaseAdmin
      .from('plots')
      .select('city, status, total_price, projected_value, size_sqm, zoning_stage')
      .eq('is_published', true)
      .in('city', cities)

    if (error) throw error

    const result = {}
    for (const city of cities) {
      const cityPlots = (plots || []).filter(p => p.city === city)
      const totalPrice = cityPlots.reduce((s, p) => s + (p.total_price || 0), 0)
      const totalProj = cityPlots.reduce((s, p) => s + (p.projected_value || 0), 0)
      const totalArea = cityPlots.reduce((s, p) => s + (p.size_sqm || 0), 0)
      const prices = cityPlots.map(p => p.total_price || 0).filter(v => v > 0).sort((a, b) => a - b)
      const median = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0

      result[city] = {
        count: cityPlots.length,
        available: cityPlots.filter(p => p.status === 'AVAILABLE').length,
        avgPricePerSqm: totalArea > 0 ? Math.round(totalPrice / totalArea) : 0,
        medianPrice: median,
        avgRoi: totalPrice > 0 ? Math.round(((totalProj - totalPrice) / totalPrice) * 100) : 0,
        totalArea,
      }
    }

    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
