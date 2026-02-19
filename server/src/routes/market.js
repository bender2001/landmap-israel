import { Router } from 'express'
import crypto from 'crypto'
import { rateLimit } from 'express-rate-limit'
import { supabaseAdmin } from '../config/supabase.js'
import { takeDailySnapshot, getPlotPriceHistory, getCityPriceHistory } from '../services/priceHistoryService.js'
import { marketCache } from '../services/cacheService.js'
import { auth } from '../middleware/auth.js'
import { adminOnly } from '../middleware/adminOnly.js'

// ─── Auto-snapshot tracking ────────────────────────────────────────────
// Ensures a daily price snapshot is taken automatically on the first request
// that hits trends/overview each day, without relying on manual admin triggers.
// Investors need real historical data — synthetic trends are misleading.
let lastAutoSnapshotDate = null

// ─── Dedicated rate limiter for data-heavy endpoints ───────────────────
// Price history and city history endpoints return large datasets and hit the DB.
// Without a tighter limiter, a scraper could enumerate all plots and download
// the entire price history database via the global 200/15min limit.
// 30 requests per 5 minutes is generous for real users but blocks bulk scraping.
const historyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.connection?.remoteAddress || 'unknown',
  message: {
    error: 'יותר מדי בקשות לנתוני מחירים — נסה שוב בעוד מספר דקות',
    errorCode: 'RATE_LIMIT_HISTORY',
    retryAfter: 300,
  },
})

function generateETag(data) {
  return '"' + crypto.createHash('md5').update(JSON.stringify(data)).digest('hex').slice(0, 16) + '"'
}

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

    // Auto-trigger daily snapshot (non-blocking, same as /trends)
    const today = new Date().toISOString().slice(0, 10)
    if (lastAutoSnapshotDate !== today) {
      lastAutoSnapshotDate = today
      takeDailySnapshot().catch(err => {
        console.warn('[market/overview] auto-snapshot failed:', err.message)
        lastAutoSnapshotDate = null
      })
    }

    // Wrap in marketCache — this is an expensive aggregation query that doesn't change often.
    // Without caching, every Areas page load / market widget triggers a full Supabase scan.
    const overview = await marketCache.wrap('market-overview', async () => {
      const { data: plots, error } = await supabaseAdmin
        .from('plots')
        .select('city, status, total_price, projected_value, size_sqm, zoning_stage, readiness_estimate')
        .eq('is_published', true)

      if (error) throw error
      if (!plots || plots.length === 0) {
        return { total: 0, cities: [] }
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
            // Collect arrays for median/percentile calculations —
            // median price is more meaningful than average in real estate
            // (not skewed by outliers). Both Madlan and Yad2 show medians.
            prices: [],
            priceSqmArr: [],
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

        if (price > 0) {
          c.prices.push(price)
          if (price < c.minPrice) c.minPrice = price
        }
        if (price > c.maxPrice) c.maxPrice = price

        const priceSqm = size > 0 ? price / size : 0
        if (priceSqm > 0) {
          c.priceSqmArr.push(priceSqm)
          if (priceSqm < c.minPriceSqm) c.minPriceSqm = priceSqm
        }
        if (priceSqm > c.maxPriceSqm) c.maxPriceSqm = priceSqm

        const zoning = p.zoning_stage || 'UNKNOWN'
        c.byZoning[zoning] = (c.byZoning[zoning] || 0) + 1
      }

      // Helper: compute median of a numeric array
      function median(arr) {
        if (arr.length === 0) return 0
        const sorted = [...arr].sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        return sorted.length % 2 === 0
          ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
          : Math.round(sorted[mid])
      }

      const cities = Object.values(cityMap).map(c => ({
        city: c.city,
        count: c.count,
        available: c.available,
        avgPricePerSqm: c.totalArea > 0 ? Math.round(c.totalPrice / c.totalArea) : 0,
        avgPricePerDunam: c.totalArea > 0 ? Math.round((c.totalPrice / c.totalArea) * 1000) : 0,
        // Median prices — more representative than averages for real estate
        // (not skewed by a single expensive plot like averages are)
        medianPrice: median(c.prices),
        medianPricePerSqm: median(c.priceSqmArr),
        medianPricePerDunam: median(c.priceSqmArr.map(v => Math.round(v * 1000))),
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

      // Global median price — investors trust median over average in real estate
      const allPrices = plots.map(p => p.total_price || 0).filter(v => v > 0)
      const allPriceSqm = plots
        .filter(p => (p.total_price || 0) > 0 && (p.size_sqm || 0) > 0)
        .map(p => p.total_price / p.size_sqm)

      return {
        total: plots.length,
        available: plots.filter(p => p.status === 'AVAILABLE').length,
        avgRoi: totalPrice > 0 ? Math.round(((totalProj - totalPrice) / totalPrice) * 100) : 0,
        medianPrice: median(allPrices),
        medianPricePerSqm: median(allPriceSqm),
        totalArea,
        totalValue: totalPrice,
        cities,
      }
    }, 300_000) // 5 min TTL — matches Cache-Control max-age

    // ETag support — market overview is heavy (~2-5KB) and polled by the Areas page,
    // MarketStatsWidget, and various widgets. With 304 responses, return visits skip
    // the full payload — especially valuable on mobile with limited bandwidth.
    const etag = generateETag(overview)
    res.set('ETag', etag)
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end()
    }

    res.json(overview)
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

/**
 * GET /api/market/trends
 * Monthly price trend data per city — uses REAL price_snapshots when available.
 * Falls back to synthetic projection only for months with no snapshot data.
 * Auto-triggers a daily snapshot to continuously build historical data.
 *
 * This is a critical data integrity improvement: investors make decisions based on
 * price trends. Showing synthetic data is misleading — Madlan/Yad2 use real transaction
 * data. We now use real snapshots, clearly marking any synthetic fill-ins.
 */
router.get('/trends', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200')

    // Auto-trigger daily snapshot (non-blocking, fire-and-forget)
    // This ensures price history accumulates passively without admin intervention.
    const today = new Date().toISOString().slice(0, 10)
    if (lastAutoSnapshotDate !== today) {
      lastAutoSnapshotDate = today
      takeDailySnapshot().catch(err => {
        console.warn('[market/trends] auto-snapshot failed:', err.message)
        lastAutoSnapshotDate = null // retry next request
      })
    }

    const trends = await marketCache.wrap('market-trends-v2', async () => {
      // 1. Get current published plots for baseline data
      const { data: plots, error } = await supabaseAdmin
        .from('plots')
        .select('id, city, total_price, size_sqm, created_at, updated_at')
        .eq('is_published', true)

      if (error) throw error
      if (!plots || plots.length === 0) {
        return { months: [], cities: {}, dataSource: 'empty' }
      }

      // 2. Generate 12 months of date keys
      const now = new Date()
      const months = []
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        months.push({
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          label: d.toLocaleDateString('he-IL', { month: 'short', year: '2-digit' }),
        })
      }

      // 3. Try to load real snapshot data (last 365 days)
      const sinceDate = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().slice(0, 10)
      let snapshots = []
      let hasRealData = false
      try {
        const { data: snaps, error: snapError } = await supabaseAdmin
          .from('price_snapshots')
          .select('plot_id, total_price, price_per_sqm, snapshot_date')
          .gte('snapshot_date', sinceDate)
          .order('snapshot_date', { ascending: true })

        if (!snapError && snaps && snaps.length > 0) {
          snapshots = snaps
          hasRealData = true
        }
      } catch {
        // Table may not exist yet — continue with synthetic fallback
      }

      // 4. Build city map from current plots
      const plotCityMap = new Map()
      for (const p of plots) {
        plotCityMap.set(p.id, p.city || 'אחר')
      }

      // 5. Aggregate snapshot data by city + month
      const realDataByCity = {}
      if (hasRealData) {
        for (const snap of snapshots) {
          const city = plotCityMap.get(snap.plot_id)
          if (!city) continue
          const monthKey = snap.snapshot_date.slice(0, 7) // "YYYY-MM"
          if (!realDataByCity[city]) realDataByCity[city] = {}
          if (!realDataByCity[city][monthKey]) {
            realDataByCity[city][monthKey] = { totalPsm: 0, count: 0 }
          }
          const psm = snap.price_per_sqm || (snap.total_price > 0 ? snap.total_price / 1 : 0)
          if (psm > 0) {
            realDataByCity[city][monthKey].totalPsm += psm
            realDataByCity[city][monthKey].count += 1
          }
        }
      }

      // 6. Build per-city trends using real data with synthetic fill for gaps
      const cityData = {}
      for (const p of plots) {
        const city = p.city || 'אחר'
        const size = p.size_sqm || 1
        const priceSqm = size > 0 ? p.total_price / size : 0
        if (priceSqm <= 0) continue
        if (!cityData[city]) cityData[city] = { prices: [], count: 0 }
        cityData[city].prices.push(priceSqm)
        cityData[city].count += 1
      }

      const cities = {}
      for (const [city, data] of Object.entries(cityData)) {
        const currentAvg = data.prices.reduce((s, v) => s + v, 0) / data.prices.length
        const citySnapData = realDataByCity[city] || {}

        // Count how many months have real data
        const realMonthCount = months.filter(m => citySnapData[m.key]?.count > 0).length

        const trend = months.map((m, i) => {
          const real = citySnapData[m.key]
          if (real && real.count > 0) {
            // Use REAL average from snapshots
            return {
              month: m.key,
              label: m.label,
              avgPriceSqm: Math.round(real.totalPsm / real.count),
              samples: real.count,
              source: 'snapshot',
            }
          }
          // Synthetic fallback — gentle backward projection from current average
          // Clearly marked as 'estimated' so the frontend can distinguish
          const monthsAgo = 11 - i
          const growthFactor = 1 - (monthsAgo * 0.005)
          const noise = 1 + (Math.sin(i * 2.1 + city.charCodeAt(0)) * 0.015)
          return {
            month: m.key,
            label: m.label,
            avgPriceSqm: Math.round(currentAvg * growthFactor * noise),
            samples: 0,
            source: 'estimated',
          }
        })

        const first = trend[0].avgPriceSqm
        const last = trend[trend.length - 1].avgPriceSqm
        const changePercent = first > 0 ? Math.round(((last - first) / first) * 100) : 0

        cities[city] = {
          count: data.count,
          currentAvg: Math.round(currentAvg),
          trend,
          change12m: changePercent,
          realMonths: realMonthCount,
          dataQuality: realMonthCount >= 6 ? 'high' : realMonthCount >= 2 ? 'medium' : 'low',
        }
      }

      return {
        months: months.map(m => m.key),
        monthLabels: months.map(m => m.label),
        cities,
        dataSource: hasRealData ? 'snapshots' : 'synthetic',
        snapshotCount: snapshots.length,
      }
    }, 600_000) // 10 min TTL

    const etag = generateETag(trends)
    res.set('ETag', etag)
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end()
    }

    res.json(trends)
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/market/new-listings
 * Returns recently added plots (last 7 days) for "חדש!" badges.
 */
router.get('/new-listings', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabaseAdmin
      .from('plots')
      .select('id, created_at')
      .eq('is_published', true)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })

    if (error) throw error

    res.json({
      count: (data || []).length,
      plotIds: (data || []).map(p => p.id),
      since: sevenDaysAgo,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/market/price-changes
 * Returns plots whose current price differs from their most recent snapshot.
 * Enables persistent, cross-device "Price dropped!" / "Price rose!" badges.
 * Unlike the localStorage-based usePriceTracker (per-device only), this works
 * for any visitor and survives browser clears.
 *
 * Query params:
 *   days=7    — compare to snapshot from N days ago (default 7, max 90)
 *   minPct=3  — minimum % change to include (default 3, filters noise)
 */
router.get('/price-changes', async (req, res, next) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days) || 7, 1), 90)
    const minPct = Math.max(parseFloat(req.query.minPct) || 3, 0)
    res.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200')

    const cacheKey = `price-changes:${days}:${minPct}`
    const changes = await marketCache.wrap(cacheKey, async () => {
      // Get current prices for all published plots
      const { data: plots, error: plotsErr } = await supabaseAdmin
        .from('plots')
        .select('id, block_number, number, city, total_price, size_sqm, status')
        .eq('is_published', true)
        .gt('total_price', 0)

      if (plotsErr) throw plotsErr
      if (!plots || plots.length === 0) return []

      // Get the oldest snapshot within the window for each plot
      const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const { data: snapshots, error: snapErr } = await supabaseAdmin
        .from('price_snapshots')
        .select('plot_id, total_price, snapshot_date')
        .gte('snapshot_date', sinceDate)
        .order('snapshot_date', { ascending: true })

      if (snapErr) {
        // Table may not exist — return empty gracefully
        if (snapErr.code === '42P01' || snapErr.message?.includes('does not exist')) return []
        throw snapErr
      }
      if (!snapshots || snapshots.length === 0) return []

      // Build map: plotId → earliest snapshot price in window
      const oldestPriceMap = new Map()
      for (const snap of snapshots) {
        if (!oldestPriceMap.has(snap.plot_id)) {
          oldestPriceMap.set(snap.plot_id, snap.total_price)
        }
      }

      // Compare current vs snapshot prices
      const result = []
      for (const plot of plots) {
        const oldPrice = oldestPriceMap.get(plot.id)
        if (oldPrice == null || oldPrice <= 0) continue

        const currentPrice = plot.total_price
        const diff = currentPrice - oldPrice
        const pctChange = Math.round(Math.abs((diff / oldPrice) * 100) * 10) / 10

        if (pctChange < minPct) continue

        result.push({
          plotId: plot.id,
          blockNumber: plot.block_number,
          number: plot.number,
          city: plot.city,
          status: plot.status,
          oldPrice,
          currentPrice,
          diff,
          pctChange,
          direction: diff < 0 ? 'down' : 'up',
        })
      }

      // Sort by absolute % change descending (biggest changes first)
      result.sort((a, b) => b.pctChange - a.pctChange)
      return result
    }, 600_000) // 10 min cache

    const etag = generateETag(changes)
    res.set('ETag', etag)
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end()
    }

    res.json(changes)
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/market/momentum
 * Price momentum analysis — week-over-week and month-over-month price velocity per city.
 * This is a key differentiator vs Madlan/Yad2: serious investors want to see the *rate*
 * of price change, not just the current level. Is the market accelerating or decelerating?
 *
 * Returns per-city:
 *   - wow: week-over-week % change in avg price/sqm
 *   - mom: month-over-month % change
 *   - trend: 'accelerating' | 'steady' | 'decelerating' | 'insufficient_data'
 *   - velocity: absolute change rate (₪/sqm per day)
 */
router.get('/momentum', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200')

    const momentum = await marketCache.wrap('market-momentum', async () => {
      // We need snapshots from at least 5 weeks ago for meaningful momentum
      const sinceDate = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

      let snapshots = []
      try {
        const { data, error } = await supabaseAdmin
          .from('price_snapshots')
          .select('plot_id, price_per_sqm, total_price, snapshot_date, plots!inner(city, size_sqm)')
          .gte('snapshot_date', sinceDate)
          .order('snapshot_date', { ascending: true })

        if (!error && data) snapshots = data
      } catch {
        // Table may not exist — return empty momentum data
      }

      if (snapshots.length === 0) {
        // No snapshot data — return current state with 'insufficient_data' trend
        const { data: plots } = await supabaseAdmin
          .from('plots')
          .select('city, total_price, size_sqm')
          .eq('is_published', true)

        const cityMap = {}
        for (const p of (plots || [])) {
          const city = p.city || 'אחר'
          const size = p.size_sqm || 1
          if (p.total_price > 0 && size > 0) {
            if (!cityMap[city]) cityMap[city] = { total: 0, count: 0 }
            cityMap[city].total += p.total_price / size
            cityMap[city].count += 1
          }
        }

        const cities = {}
        for (const [city, data] of Object.entries(cityMap)) {
          cities[city] = {
            currentAvgPsm: Math.round(data.total / data.count),
            wow: null,
            mom: null,
            velocity: null,
            trend: 'insufficient_data',
            plotCount: data.count,
          }
        }
        return { cities, dataSource: 'current_only', snapshotDays: 0 }
      }

      // Aggregate snapshots into weekly buckets per city
      const now = Date.now()
      const weekMs = 7 * 24 * 60 * 60 * 1000
      const cityWeekly = {}

      for (const snap of snapshots) {
        const city = snap.plots?.city
        if (!city) continue
        const sizeSqm = snap.plots?.size_sqm || 1
        const psm = snap.price_per_sqm || (snap.total_price > 0 && sizeSqm > 0 ? snap.total_price / sizeSqm : 0)
        if (psm <= 0) continue

        const snapDate = new Date(snap.snapshot_date)
        const weeksAgo = Math.floor((now - snapDate.getTime()) / weekMs)
        const weekKey = Math.min(weeksAgo, 5) // Cap at 5 weeks ago

        if (!cityWeekly[city]) cityWeekly[city] = {}
        if (!cityWeekly[city][weekKey]) cityWeekly[city][weekKey] = { total: 0, count: 0 }
        cityWeekly[city][weekKey].total += psm
        cityWeekly[city][weekKey].count += 1
      }

      // Calculate momentum per city
      const cities = {}
      for (const [city, weeks] of Object.entries(cityWeekly)) {
        const getWeekAvg = (w) => weeks[w] && weeks[w].count > 0 ? weeks[w].total / weeks[w].count : null

        const thisWeek = getWeekAvg(0)
        const lastWeek = getWeekAvg(1)
        const twoWeeksAgo = getWeekAvg(2)
        const fourWeeksAgo = getWeekAvg(4) || getWeekAvg(3) // month ago, fallback 3 weeks

        // Week-over-week change
        const wow = thisWeek && lastWeek
          ? Math.round(((thisWeek - lastWeek) / lastWeek) * 1000) / 10
          : null

        // Month-over-month change
        const mom = thisWeek && fourWeeksAgo
          ? Math.round(((thisWeek - fourWeeksAgo) / fourWeeksAgo) * 1000) / 10
          : null

        // Daily velocity (₪/sqm per day) — over the last 2 weeks
        const velocity = thisWeek && twoWeeksAgo
          ? Math.round(((thisWeek - twoWeeksAgo) / 14) * 100) / 100
          : null

        // Trend determination — is the rate of change increasing or decreasing?
        let trend = 'insufficient_data'
        if (wow !== null && mom !== null) {
          // Compare recent rate (wow) vs longer-term rate (mom/4 = weekly equivalent)
          const weeklyFromMonthly = mom / 4
          if (wow > weeklyFromMonthly + 0.3) trend = 'accelerating'
          else if (wow < weeklyFromMonthly - 0.3) trend = 'decelerating'
          else trend = 'steady'
        } else if (wow !== null) {
          trend = wow > 0.5 ? 'rising' : wow < -0.5 ? 'falling' : 'steady'
        }

        cities[city] = {
          currentAvgPsm: thisWeek ? Math.round(thisWeek) : null,
          wow,
          mom,
          velocity,
          trend,
          plotCount: weeks[0]?.count || 0,
          // Signal labels for UI display (Hebrew)
          signal: trend === 'accelerating' ? '🚀 מאיץ'
            : trend === 'decelerating' ? '📉 מאט'
            : trend === 'rising' ? '📈 עולה'
            : trend === 'falling' ? '📉 יורד'
            : trend === 'steady' ? '➡️ יציב'
            : '❓ אין מספיק נתונים',
        }
      }

      // Determine earliest snapshot date for data freshness
      const dates = snapshots.map(s => s.snapshot_date).filter(Boolean)
      const earliestDate = dates.length > 0 ? dates[0] : null
      const latestDate = dates.length > 0 ? dates[dates.length - 1] : null
      const snapshotDays = earliestDate && latestDate
        ? Math.round((new Date(latestDate) - new Date(earliestDate)) / (24 * 60 * 60 * 1000))
        : 0

      return { cities, dataSource: 'snapshots', snapshotDays, dateRange: { from: earliestDate, to: latestDate } }
    }, 3600_000) // 1 hour TTL — momentum doesn't change rapidly

    const etag = generateETag(momentum)
    res.set('ETag', etag)
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end()
    }

    res.json(momentum)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/market/snapshot
 * Trigger a daily price snapshot (idempotent — safe to call multiple times).
 * In production, call this from a daily cron job.
 * Protected: requires admin auth — prevents unauthenticated users from triggering DB writes.
 */
router.post('/snapshot', auth, adminOnly, async (req, res, next) => {
  try {
    const result = await takeDailySnapshot()
    res.json(result)
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/market/price-history/:plotId
 * Get historical price data for a specific plot.
 * Rate-limited: 30 req/5min per IP to prevent bulk scraping of price history data.
 */
router.get('/price-history/:plotId', historyLimiter, async (req, res, next) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 365, 730)
    res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200')
    const history = await getPlotPriceHistory(req.params.plotId, days)
    res.json(history)
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/market/city-history/:city
 * Get aggregated price history for a city.
 * Rate-limited: 30 req/5min per IP to prevent bulk scraping of price history data.
 */
router.get('/city-history/:city', historyLimiter, async (req, res, next) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 365, 730)
    res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200')
    const history = await getCityPriceHistory(decodeURIComponent(req.params.city), days)
    res.json(history)
  } catch (err) {
    next(err)
  }
})

export default router
