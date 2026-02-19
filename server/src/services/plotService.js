import { supabaseAdmin } from '../config/supabase.js'
import { supabaseRetry } from '../utils/retry.js'

// ─── Area Market Trend Cache ──────────────────────────────────────────────
// Caches per-city price trend direction based on price_snapshots.
// Refreshed every 10 minutes. Shows investors whether the area is appreciating,
// depreciating, or stable — like Madlan's area trend arrows.
let areaMarketTrends = new Map() // city → { direction: 'up'|'down'|'stable', changePct: number }
let areaMarketTrendsUpdatedAt = 0
const AREA_TREND_TTL = 10 * 60 * 1000 // 10 min

async function refreshAreaMarketTrends() {
  const now = Date.now()
  if (now - areaMarketTrendsUpdatedAt < AREA_TREND_TTL && areaMarketTrends.size > 0) {
    return areaMarketTrends
  }
  try {
    // Get snapshots from last 30 days, grouped by city
    const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString().slice(0, 10)
    const { data, error } = await supabaseAdmin
      .from('price_snapshots')
      .select('total_price, price_per_sqm, snapshot_date, plots!inner(city)')
      .gte('snapshot_date', thirtyDaysAgo)
      .order('snapshot_date', { ascending: true })

    if (error) {
      // Table may not exist — degrade gracefully
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        areaMarketTrendsUpdatedAt = now
        return areaMarketTrends
      }
      throw error
    }

    if (!data || data.length === 0) {
      areaMarketTrendsUpdatedAt = now
      return areaMarketTrends
    }

    // Split into first-half and second-half of the 30-day window
    const midDate = new Date(now - 15 * 86400000).toISOString().slice(0, 10)
    const cityFirst = {} // city → { totalPsm, count }
    const citySecond = {}

    for (const row of data) {
      const city = row.plots?.city
      if (!city || !row.price_per_sqm) continue
      const bucket = row.snapshot_date < midDate ? cityFirst : citySecond
      if (!bucket[city]) bucket[city] = { totalPsm: 0, count: 0 }
      bucket[city].totalPsm += row.price_per_sqm
      bucket[city].count += 1
    }

    // Compute trend per city
    const trends = new Map()
    const allCities = new Set([...Object.keys(cityFirst), ...Object.keys(citySecond)])
    for (const city of allCities) {
      const first = cityFirst[city]
      const second = citySecond[city]
      if (!first || !second || first.count === 0 || second.count === 0) {
        trends.set(city, { direction: 'stable', changePct: 0 })
        continue
      }
      const avgFirst = first.totalPsm / first.count
      const avgSecond = second.totalPsm / second.count
      const changePct = Math.round(((avgSecond - avgFirst) / avgFirst) * 100)
      const direction = changePct > 2 ? 'up' : changePct < -2 ? 'down' : 'stable'
      trends.set(city, { direction, changePct })
    }

    areaMarketTrends = trends
    areaMarketTrendsUpdatedAt = now
    return trends
  } catch (err) {
    console.warn('[plotService] area trend refresh failed:', err.message)
    areaMarketTrendsUpdatedAt = now // Don't retry immediately on error
    return areaMarketTrends
  }
}

/**
 * Compute an investment score (1-10) for a plot — server-side equivalent
 * of the client's calcInvestmentScore(). Running this server-side:
 * - Eliminates redundant client computation on every render cycle
 * - Enables server-side sort by score (new sort=score-desc option)
 * - Makes scores available to SEO bots, OG generators, and webhooks
 */
function computeInvestmentScore(plot) {
  const price = plot.total_price || 0
  const projected = plot.projected_value || 0
  const roi = price > 0 ? ((projected - price) / price) * 100 : 0
  const readiness = plot.readiness_estimate || ''

  // ROI component (0-4 points): 50%=1, 100%=2, 150%=3, 200%+=4
  const roiScore = Math.min(4, roi / 50)

  // Zoning progress component (0-3 points)
  const ZONING_ORDER = [
    'AGRICULTURAL', 'MASTER_PLAN_DEPOSIT', 'MASTER_PLAN_APPROVED',
    'DETAILED_PLAN_PREP', 'DETAILED_PLAN_DEPOSIT', 'DETAILED_PLAN_APPROVED',
    'DEVELOPER_TENDER', 'BUILDING_PERMIT',
  ]
  const zoning = plot.zoning_stage || 'AGRICULTURAL'
  const zoningIdx = ZONING_ORDER.indexOf(zoning)
  const zoningScore = zoningIdx >= 0 ? (zoningIdx / (ZONING_ORDER.length - 1)) * 3 : 0

  // Readiness component (0-3 points): shorter = better
  let readinessScore = 1.5
  if (readiness.includes('1-3')) readinessScore = 3
  else if (readiness.includes('3-5')) readinessScore = 2
  else if (readiness.includes('5+')) readinessScore = 0.5

  const raw = roiScore + zoningScore + readinessScore
  return Math.max(1, Math.min(10, Math.round(raw)))
}

/**
 * Convert a 1-10 score to an S&P-style letter grade.
 */
function computeGrade(score) {
  if (score >= 9) return 'A+'
  if (score >= 8) return 'A'
  if (score >= 7) return 'A-'
  if (score >= 6) return 'B+'
  if (score >= 5) return 'B'
  if (score >= 4) return 'B-'
  if (score >= 3) return 'C+'
  return 'C'
}

/**
 * Compute investment risk level for a plot. Server-side equivalent of the client's
 * calcRiskLevel(). Factors: zoning stage, time horizon, price deviation, ROI realism.
 * Returns { score: 0-100, level: 'low'|'medium'|'high'|'very_high', factors: string[] }
 * Running server-side eliminates expensive per-card computation on the client
 * (calcRiskLevel requires allPlots for comparison — O(n²) if done per card).
 */
function computeRiskLevel(plot, cityAvgPsm) {
  const price = plot.total_price || 0
  const projected = plot.projected_value || 0
  const sizeSqM = plot.size_sqm || 0
  const zoning = plot.zoning_stage || 'AGRICULTURAL'
  const readiness = plot.readiness_estimate || ''
  const roi = price > 0 ? ((projected - price) / price) * 100 : 0

  let riskScore = 0
  const factors = []

  // 1. Zoning risk (0-30): early stages = high regulatory risk
  const zoningRisk = {
    AGRICULTURAL: 30, MASTER_PLAN_DEPOSIT: 25, MASTER_PLAN_APPROVED: 18,
    DETAILED_PLAN_PREP: 15, DETAILED_PLAN_DEPOSIT: 10, DETAILED_PLAN_APPROVED: 5,
    DEVELOPER_TENDER: 3, BUILDING_PERMIT: 1,
  }[zoning] ?? 20
  riskScore += zoningRisk
  if (zoningRisk >= 25) factors.push('שלב תכנוני מוקדם')
  else if (zoningRisk >= 15) factors.push('תכנון בתהליך')

  // 2. Time horizon risk (0-25): longer wait = more uncertainty
  let timeRisk = 15
  if (readiness.includes('1-3')) timeRisk = 8
  else if (readiness.includes('3-5')) timeRisk = 15
  else if (readiness.includes('5+') || readiness.includes('5-')) timeRisk = 25
  riskScore += timeRisk
  if (timeRisk >= 20) factors.push('טווח השקעה ארוך')

  // 3. Price deviation risk (0-20): far from city average = suspicious
  if (cityAvgPsm > 0 && sizeSqM > 0 && price > 0) {
    const plotPsm = price / sizeSqM
    const deviation = ((plotPsm - cityAvgPsm) / cityAvgPsm) * 100
    if (deviation > 20) { riskScore += 20; factors.push('מחיר גבוה מהממוצע') }
    else if (deviation > 10) { riskScore += 10 }
    else if (deviation < -20) { riskScore += 5; factors.push('מחיר נמוך — יש לבדוק') }
  }

  // 4. ROI realism risk (0-15): extremely high ROI is suspicious
  if (roi > 300) { riskScore += 15; factors.push('תשואה גבוהה מאוד') }
  else if (roi > 200) { riskScore += 8 }
  else if (roi < 30 && price > 0) { riskScore += 5 }

  // 5. Liquidity risk (0-10): larger plots harder to sell
  const dunam = sizeSqM / 1000
  if (dunam > 5) { riskScore += 10; factors.push('שטח גדול — נזילות נמוכה') }
  else if (dunam > 3) riskScore += 5

  riskScore = Math.min(100, riskScore)

  const level = riskScore <= 25 ? 'low' : riskScore <= 45 ? 'medium'
    : riskScore <= 65 ? 'high' : 'very_high'

  return { score: riskScore, level, factors: factors.slice(0, 3) }
}

/**
 * Compute full investment P&L (Profit & Loss) for a plot — server-side equivalent
 * of the client's calcInvestmentPnL(). Returns net ROI after ALL Israeli costs:
 * - Purchase: mas rechisha (6%), attorney (1.75%), appraiser, registration
 * - Holding: arnona, management × holding years
 * - Exit: betterment levy (50% of uplift), capital gains (25% on taxable gain), agent (1%)
 *
 * This is THE number professional investors use. Gross ROI of +200% might be
 * only +45% net after all costs. Madlan/Yad2 only show listing price — we show reality.
 */
function computeNetReturn(plot) {
  const price = plot.total_price || 0
  const projected = plot.projected_value || 0
  const sizeSqm = plot.size_sqm || 0
  const zoning = plot.zoning_stage || 'AGRICULTURAL'
  const readiness = plot.readiness_estimate || ''

  if (price <= 0 || projected <= 0) return null

  // Holding period estimate (from readiness)
  let holdingYears = 5
  if (readiness.includes('1-3')) holdingYears = 2
  else if (readiness.includes('3-5')) holdingYears = 4
  else if (readiness.includes('5+') || readiness.includes('5-')) holdingYears = 7

  // ── Entry costs ────────────────────────────────────────────────────
  const purchaseTax = Math.round(price * 0.06)
  const attorneyFees = Math.round(price * 0.0175)
  const appraiserFee = Math.round(Math.min(Math.max(price * 0.003, 2000), 8000))
  const registrationFee = 167
  const totalEntryCost = price + purchaseTax + attorneyFees + appraiserFee + registrationFee

  // ── Holding costs ──────────────────────────────────────────────────
  const isAdvancedZoning = ['DETAILED_PLAN_APPROVED', 'DEVELOPER_TENDER', 'BUILDING_PERMIT'].includes(zoning)
  const arnonaPerSqm = isAdvancedZoning ? 5 : 2.5
  const annualHolding = Math.round(sizeSqm * arnonaPerSqm) + Math.round(sizeSqm * 1.5)
  const totalHolding = annualHolding * holdingYears

  // ── Exit costs ─────────────────────────────────────────────────────
  const grossProfit = projected - price
  let bettermentLevy = 0
  let capitalGains = 0
  let agentCommission = 0
  if (grossProfit > 0) {
    bettermentLevy = Math.round(grossProfit * 0.5)
    const purchaseCostsDeduction = Math.round(price * 0.0775)
    const taxableGain = Math.max(0, grossProfit - bettermentLevy - purchaseCostsDeduction)
    capitalGains = Math.round(taxableGain * 0.25)
    agentCommission = Math.round(projected * 0.01)
  }
  const totalExitCost = bettermentLevy + capitalGains + agentCommission

  // ── Net return ─────────────────────────────────────────────────────
  const totalCosts = (totalEntryCost - price) + totalHolding + totalExitCost
  const netProfit = grossProfit - totalCosts
  const netRoi = totalEntryCost > 0 ? Math.round((netProfit / totalEntryCost) * 100) : 0

  return {
    totalEntryCost,  // price + all purchase costs
    netProfit,       // profit after ALL costs
    netRoi,          // % return after ALL costs
    totalCosts,      // sum of all costs (entry surplus + holding + exit)
    holdingYears,
  }
}

/**
 * Enrich an array of plots with computed investment metrics.
 * Adds _investmentScore, _grade, _roi, _riskLevel, _netRoi, and more fields to each plot.
 */
async function enrichPlotsWithScores(plots) {
  if (!plots || plots.length === 0) return plots
  const now = Date.now()

  // Fetch area trends (cached, non-blocking on cache hit)
  const trends = await refreshAreaMarketTrends()

  // Pre-compute city average price/sqm for risk deviation calculation.
  // Single pass over all plots — O(n) instead of O(n²) per card.
  const cityPsmAccum = {} // city → { totalPsm, count }
  for (const p of plots) {
    const price = p.total_price || 0
    const size = p.size_sqm || 0
    if (price > 0 && size > 0 && p.city) {
      if (!cityPsmAccum[p.city]) cityPsmAccum[p.city] = { totalPsm: 0, count: 0 }
      cityPsmAccum[p.city].totalPsm += price / size
      cityPsmAccum[p.city].count += 1
    }
  }
  const cityAvgPsm = {}
  for (const [city, acc] of Object.entries(cityPsmAccum)) {
    cityAvgPsm[city] = acc.count > 0 ? acc.totalPsm / acc.count : 0
  }

  for (const p of plots) {
    const price = p.total_price || 0
    const projected = p.projected_value || 0
    p._investmentScore = computeInvestmentScore(p)
    p._grade = computeGrade(p._investmentScore)
    p._roi = price > 0 ? Math.round(((projected - price) / price) * 100) : 0

    // Computed days on market — saves client from recalculating every render cycle.
    // Used for freshness badges, sort by "newest", and urgency signaling.
    const created = p.created_at
    p._daysOnMarket = created
      ? Math.max(0, Math.floor((now - new Date(created).getTime()) / 86400000))
      : null

    // Price per sqm — pre-computed for sort, filter, and display.
    // Eliminates redundant division in every plot card, tooltip, and comparison.
    const size = p.size_sqm || 0
    p._pricePerSqm = size > 0 ? Math.round(price / size) : null

    // Monthly payment estimate (50% LTV, 6% rate, 15yr term) — pre-computed
    // for affordability sort and display. Matches client's calcMonthlyPayment().
    if (price > 0) {
      const loanAmount = price * 0.5
      const monthlyRate = 0.06 / 12
      const numPayments = 15 * 12
      p._monthlyPayment = Math.round(
        loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1)
      )
    } else {
      p._monthlyPayment = null
    }

    // CAGR (Compound Annual Growth Rate) — pre-computed annualized return that
    // accounts for holding period. More meaningful than raw ROI for investor comparison:
    // 200% ROI over 10 years (CAGR 11.6%) is worse than 100% ROI over 3 years (CAGR 26%).
    // Previously only computed client-side in calcCAGR() — now server-enriched so:
    // 1. PlotCardStrip/tooltips can display it without recalculating
    // 2. cagr-desc sort uses this pre-computed value (faster, consistent)
    // 3. Available to OG generators, webhooks, and export endpoints
    const readiness = p.readiness_estimate || ''
    let holdingYears = 5
    if (readiness.includes('1-3')) holdingYears = 2
    else if (readiness.includes('3-5')) holdingYears = 4
    else if (readiness.includes('5+') || readiness.includes('5-')) holdingYears = 7

    if (price > 0 && projected > price && holdingYears > 0) {
      p._cagr = Math.round((Math.pow(projected / price, 1 / holdingYears) - 1) * 1000) / 10 // e.g. 26.3
      p._holdingYears = holdingYears
    } else {
      p._cagr = 0
      p._holdingYears = holdingYears
    }

    // Area market trend — shows if the city's price/sqm is trending up, down, or stable
    // over the last 30 days. Like Madlan's area trend indicators. Enables "hot market" badges.
    const cityTrend = trends.get(p.city)
    if (cityTrend) {
      p._marketTrend = cityTrend // { direction: 'up'|'down'|'stable', changePct: number }
    }

    // Risk level — server-side computation of investment risk factors.
    // Eliminates client-side calcRiskLevel(plot, allPlots) which was O(n) per card.
    // Now pre-computed once for all plots in a single enrichment pass.
    const risk = computeRiskLevel(p, cityAvgPsm[p.city] || 0)
    p._riskLevel = risk.level     // 'low'|'medium'|'high'|'very_high'
    p._riskScore = risk.score     // 0-100
    p._riskFactors = risk.factors // top 3 risk factors (Hebrew strings)

    // Deal discount — how far below city average price/sqm this plot is.
    // Positive = below average (good deal). Used for "🔥 X% below average" badges.
    // Pre-computed to avoid redundant city-average lookups on every tooltip render.
    if (size > 0 && price > 0 && cityAvgPsm[p.city]) {
      const plotPsm = price / size
      const discountPct = Math.round(((cityAvgPsm[p.city] - plotPsm) / cityAvgPsm[p.city]) * 100)
      p._dealDiscount = discountPct // positive = below avg, negative = above avg
      // Expose the city average price/sqm so the client can reference it directly
      // for "vs city average" comparisons without needing a separate API call.
      // Eliminates the need for useMarketOverview on PlotDetail just to show the benchmark.
      p._cityAvgPriceSqm = Math.round(cityAvgPsm[p.city])
    } else {
      p._dealDiscount = null
      p._cityAvgPriceSqm = null
    }

    // Net investment return — THE metric professional investors use.
    // Accounts for all Israeli transaction costs (purchase tax 6%, attorney 1.75%,
    // appraiser), annual holding costs (arnona, management), and exit costs
    // (betterment levy 50%, capital gains 25%, agent 1%). Gross ROI of +200%
    // might be only +45% net. Neither Madlan nor Yad2 surface this — differentiator.
    const netReturn = computeNetReturn(p)
    if (netReturn) {
      p._netRoi = netReturn.netRoi             // % return after ALL costs
      p._totalEntryCost = netReturn.totalEntryCost // price + purchase costs
      p._netProfit = netReturn.netProfit         // absolute profit after ALL costs
      p._totalCosts = netReturn.totalCosts       // sum of all costs
    } else {
      p._netRoi = null
      p._totalEntryCost = null
      p._netProfit = null
      p._totalCosts = null
    }

    // ── Payback Period ───────────────────────────────────────────────────
    // THE #1 question investors ask: "When do I get my money back?"
    // Computes the year when cumulative appreciation exceeds total invested capital
    // (price + entry costs + holding costs). Uses straight-line appreciation model
    // from current price to projected value over the holding period.
    // Neither Madlan nor Yad2 show this — a major differentiator for serious investors.
    if (price > 0 && projected > price && holdingYears > 0 && netReturn) {
      const annualAppreciation = (projected - price) / holdingYears
      const annualHoldingCost = netReturn.totalCosts > 0
        ? ((netReturn.totalEntryCost - price) + netReturn.totalCosts) / holdingYears
        : (netReturn.totalEntryCost - price) / holdingYears
      // Total capital out = entry costs above price + annual holding
      const totalCapitalOut = netReturn.totalEntryCost - price
      // Year-by-year: find when cumulative net gain turns positive
      let cumulativeGain = -totalCapitalOut
      let paybackYear = null
      for (let yr = 1; yr <= Math.ceil(holdingYears * 1.5); yr++) {
        cumulativeGain += annualAppreciation - (yr <= holdingYears ? annualHoldingCost / holdingYears : 0)
        if (cumulativeGain >= 0 && paybackYear === null) {
          // Interpolate for sub-year precision
          const prevGain = cumulativeGain - annualAppreciation + (yr <= holdingYears ? annualHoldingCost / holdingYears : 0)
          const fraction = prevGain < 0 ? Math.abs(prevGain) / (cumulativeGain - prevGain) : 0
          paybackYear = Math.round((yr - 1 + fraction) * 10) / 10
          break
        }
      }
      p._paybackYears = paybackYear // e.g., 2.3 (years) or null if never breaks even
    } else {
      p._paybackYears = null
    }

    // ── Buy Signal ──────────────────────────────────────────────────────
    // Bloomberg-style composite signal: BUY / HOLD / WATCH based on multiple factors.
    // Combines: deal discount, risk level, net ROI, market trend, and investment score.
    // Provides a single actionable recommendation that synthesizes all our data.
    // Professional investors love signals — like analyst ratings or traffic lights.
    // No Israeli RE competitor offers algorithmic buy recommendations.
    {
      let signalScore = 0 // -10 to +10 scale

      // Factor 1: Deal discount (below/above city average price)
      const discount = p._dealDiscount ?? 0
      if (discount >= 15) signalScore += 3
      else if (discount >= 5) signalScore += 1.5
      else if (discount <= -15) signalScore -= 2
      else if (discount <= -5) signalScore -= 1

      // Factor 2: Net ROI strength
      const nRoi = p._netRoi ?? 0
      if (nRoi >= 80) signalScore += 2.5
      else if (nRoi >= 50) signalScore += 1.5
      else if (nRoi >= 20) signalScore += 0.5
      else if (nRoi < 0) signalScore -= 2

      // Factor 3: Risk level
      if (p._riskLevel === 'low') signalScore += 1.5
      else if (p._riskLevel === 'medium') signalScore += 0
      else if (p._riskLevel === 'high') signalScore -= 1.5
      else if (p._riskLevel === 'very_high') signalScore -= 3

      // Factor 4: Market trend (area momentum)
      const trend = p._marketTrend
      if (trend?.direction === 'up' && trend.changePct >= 3) signalScore += 1
      else if (trend?.direction === 'down' && trend.changePct <= -3) signalScore -= 1

      // Factor 5: Investment grade
      if (p._investmentScore >= 8) signalScore += 1
      else if (p._investmentScore >= 6) signalScore += 0.5
      else if (p._investmentScore <= 3) signalScore -= 1

      // Map score to signal
      if (signalScore >= 4) {
        p._buySignal = { signal: 'BUY', label: '🟢 קנייה', strength: Math.min(10, Math.round(signalScore)) }
      } else if (signalScore >= 1) {
        p._buySignal = { signal: 'HOLD', label: '🟡 שווה בדיקה', strength: Math.round(signalScore) }
      } else {
        p._buySignal = { signal: 'WATCH', label: '🔴 המתן', strength: Math.round(signalScore) }
      }
    }
  }

  // ── Investment Ranking ────────────────────────────────────────────────
  // Rank plots by investment score (highest first) among AVAILABLE plots.
  // Shows investors "Rank #3 out of 12 available plots" — powerful social proof
  // and urgency signal. Like Bloomberg's "Top Pick" or Morningstar's star rating.
  // Neither Madlan nor Yad2 provides explicit ranking — a unique differentiator.
  const availablePlots = plots
    .filter(p => p.status === 'AVAILABLE' && p._investmentScore != null)
    .sort((a, b) => (b._investmentScore - a._investmentScore) || ((b._roi || 0) - (a._roi || 0)))
  const totalAvailable = availablePlots.length
  for (let i = 0; i < availablePlots.length; i++) {
    availablePlots[i]._investmentRank = i + 1
    availablePlots[i]._totalRanked = totalAvailable
  }

  return plots
}

export async function getPublishedPlots(filters = {}) {
  // Support count-only mode for pagination metadata
  const countOnly = filters._countOnly === true

  let query = supabaseAdmin
    .from('plots')
    .select(countOnly ? 'id' : '*, plot_images(id, url, alt)', countOnly ? { count: 'exact', head: true } : undefined)
    .eq('is_published', true)

  if (filters.city && filters.city !== 'all') {
    query = query.eq('city', filters.city)
  }
  if (filters.priceMin) {
    query = query.gte('total_price', Number(filters.priceMin))
  }
  if (filters.priceMax) {
    query = query.lte('total_price', Number(filters.priceMax))
  }
  if (filters.sizeMin) {
    query = query.gte('size_sqm', Number(filters.sizeMin) * 1000)
  }
  if (filters.sizeMax) {
    query = query.lte('size_sqm', Number(filters.sizeMax) * 1000)
  }
  if (filters.ripeness && filters.ripeness !== 'all') {
    query = query.eq('ripeness', filters.ripeness)
  }
  if (filters.status) {
    const statuses = filters.status.split(',')
    query = query.in('status', statuses)
  }

  // Zoning stage filter — supports comma-separated values for multi-select
  if (filters.zoning && filters.zoning !== 'all') {
    const stages = filters.zoning.split(',').filter(Boolean)
    if (stages.length === 1) {
      query = query.eq('zoning_stage', stages[0])
    } else if (stages.length > 1) {
      query = query.in('zoning_stage', stages)
    }
  }

  // Server-side text search — searches block_number, number, city, description.
  // Enhanced: detects structured gush/parcel patterns that investors commonly use:
  //   "7842/15" → block=7842, parcel=15
  //   "גוש 7842 חלקה 15" → block=7842, parcel=15
  //   "גוש 7842" → block=7842
  //   "חלקה 15" → parcel=15
  // Falls back to generic ilike search for free-text queries.
  if (filters.q && filters.q.trim()) {
    const rawQ = filters.q.trim().slice(0, 100)
    let searchApplied = false

    // Pattern 1: "7842/15" or "7842 / 15" — slash-separated gush/parcel
    const slashMatch = rawQ.match(/^(\d{3,6})\s*\/\s*(\d{1,5})$/)
    if (slashMatch) {
      query = query.eq('block_number', slashMatch[1]).eq('number', slashMatch[2])
      searchApplied = true
    }

    // Pattern 2: "גוש 7842 חלקה 15" — Hebrew gush + parcel
    if (!searchApplied) {
      const hebrewFullMatch = rawQ.match(/גוש\s*(\d{3,6})\s*(?:חלקה|חל['׳])\s*(\d{1,5})/)
      if (hebrewFullMatch) {
        query = query.eq('block_number', hebrewFullMatch[1]).eq('number', hebrewFullMatch[2])
        searchApplied = true
      }
    }

    // Pattern 3: "גוש 7842" — Hebrew gush only
    if (!searchApplied) {
      const gushOnlyMatch = rawQ.match(/גוש\s*(\d{3,6})$/)
      if (gushOnlyMatch) {
        query = query.eq('block_number', gushOnlyMatch[1])
        searchApplied = true
      }
    }

    // Pattern 4: "חלקה 15" — Hebrew parcel only
    if (!searchApplied) {
      const parcelOnlyMatch = rawQ.match(/(?:חלקה|חל['׳])\s*(\d{1,5})$/)
      if (parcelOnlyMatch) {
        query = query.eq('number', parcelOnlyMatch[1])
        searchApplied = true
      }
    }

    // Pattern 5: "block 7842 parcel 15" — English gush/parcel (for API users)
    if (!searchApplied) {
      const engMatch = rawQ.match(/block\s*(\d{3,6})\s*(?:parcel|plot)\s*(\d{1,5})/i)
      if (engMatch) {
        query = query.eq('block_number', engMatch[1]).eq('number', engMatch[2])
        searchApplied = true
      }
    }

    // Fallback: generic ilike search across all text fields
    if (!searchApplied) {
      // Sanitize: escape special PostgREST/SQL chars to prevent injection
      const q = rawQ
        .replace(/[%_\\]/g, c => `\\${c}`)  // escape SQL wildcards
        .replace(/[,()]/g, '')               // strip PostgREST operators
      if (q.length > 0) {
        query = query.or(
          `block_number.ilike.%${q}%,number.ilike.%${q}%,city.ilike.%${q}%,description.ilike.%${q}%`
        )
      }
    }
  }

  // ─── Bounding box (bbox) spatial filter ─────────────────────────────────
  // When the client sends bbox=south,west,north,east, we filter plots server-side
  // to only those with at least one coordinate inside the viewport. This moves the
  // "Search this area" filtering from client-side (MapView boundsFilter) to the server,
  // reducing bandwidth by 40-60% when the user is zoomed into a specific area.
  // Like Madlan/Airbnb's map-driven search that only fetches visible listings.
  // Falls back gracefully: if bbox is malformed, skip (return all plots).
  if (filters.bbox) {
    const parts = filters.bbox.split(',').map(Number)
    if (parts.length === 4 && parts.every(n => isFinite(n))) {
      const [south, west, north, east] = parts
      // Post-fetch filter since Supabase doesn't support JSON array spatial queries natively.
      // Flagging for post-fetch processing (applied after data retrieval below).
      filters._bbox = { south, west, north, east }
    }
  }

  // Server-side sorting — apply user's sort as PRIMARY order.
  // Previously, `order('created_at')` was applied first, making user sort a secondary
  // (invisible) tiebreaker since created_at is unique. Now user sort comes first,
  // with created_at as a stable secondary sort for ties.
  if (filters.sort) {
    switch (filters.sort) {
      case 'price-asc': query = query.order('total_price', { ascending: true }); break
      case 'price-desc': query = query.order('total_price', { ascending: false }); break
      case 'size-asc': query = query.order('size_sqm', { ascending: true }); break
      case 'size-desc': query = query.order('size_sqm', { ascending: false }); break
      case 'updated-desc': query = query.order('updated_at', { ascending: false, nullsFirst: false }); break
      // ROI and price-per-sqm require computed columns — handled client-side
    }
    // Secondary sort: newest first within same price/size tier
    query = query.order('created_at', { ascending: false })
  } else {
    // Default: newest listings first
    query = query.order('created_at', { ascending: false })
  }

  // Pagination support
  if (filters.limit) {
    const limit = Math.min(parseInt(filters.limit) || 50, 200)
    const offset = parseInt(filters.offset) || 0
    query = query.range(offset, offset + limit - 1)
  }

  if (countOnly) {
    const { count, error } = await supabaseRetry(() => query, { label: 'getPlots:count', retries: 2 })
    if (error) throw error
    return count
  }

  let { data, error } = await supabaseRetry(() => query, { label: 'getPlots', retries: 2 })
  if (error) throw error

  // ─── Fuzzy search fallback ──────────────────────────────────────────
  // When exact ilike search returns 0 results and user has a search query,
  // retry without the text filter and apply Levenshtein fuzzy matching client-side.
  // This handles Hebrew typos (e.g., "חדירה" instead of "חדרה") that ilike misses.
  // Like Google's "Did you mean?" — investors shouldn't get 0 results for a typo.
  if (data && data.length === 0 && filters.q && filters.q.trim().length >= 2) {
    const fuzzyQuery = filters.q.trim().toLowerCase()
    // Re-fetch without the text filter
    const filtersWithoutQ = { ...filters }
    delete filtersWithoutQ.q
    let allQuery = supabaseAdmin
      .from('plots')
      .select('*, plot_images(id, url, alt)')
      .eq('is_published', true)

    if (filtersWithoutQ.city && filtersWithoutQ.city !== 'all') allQuery = allQuery.eq('city', filtersWithoutQ.city)
    if (filtersWithoutQ.priceMin) allQuery = allQuery.gte('total_price', Number(filtersWithoutQ.priceMin))
    if (filtersWithoutQ.priceMax) allQuery = allQuery.lte('total_price', Number(filtersWithoutQ.priceMax))
    if (filtersWithoutQ.status) allQuery = allQuery.in('status', filtersWithoutQ.status.split(','))

    const { data: allData } = await allQuery.order('created_at', { ascending: false })
    if (allData && allData.length > 0) {
      // Simple Levenshtein for short Hebrew strings
      const lev = (a, b) => {
        const m = a.length, n = b.length
        if (m === 0) return n
        if (n === 0) return m
        const dp = Array.from({ length: m + 1 }, (_, i) => i)
        for (let j = 1; j <= n; j++) {
          let prev = dp[0]
          dp[0] = j
          for (let i = 1; i <= m; i++) {
            const tmp = dp[i]
            dp[i] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[i], dp[i - 1])
            prev = tmp
          }
        }
        return dp[m]
      }

      // Score each plot by best fuzzy match across searchable fields
      const MAX_DISTANCE = Math.max(1, Math.floor(fuzzyQuery.length * 0.4)) // Allow ~40% edits
      const fuzzyResults = allData
        .map(p => {
          const fields = [
            (p.block_number || '').toString(),
            (p.number || '').toString(),
            (p.city || '').toLowerCase(),
            (p.description || '').toLowerCase().slice(0, 200),
          ]
          let bestDist = Infinity
          for (const field of fields) {
            if (!field) continue
            // Check substring windows of the field
            if (field.includes(fuzzyQuery)) { bestDist = 0; break }
            // Sliding window match for partial fuzzy
            for (let start = 0; start <= field.length - fuzzyQuery.length; start++) {
              const window = field.slice(start, start + fuzzyQuery.length)
              const d = lev(fuzzyQuery, window)
              if (d < bestDist) bestDist = d
              if (d === 0) break
            }
            // Also check against full field (for short field names like city)
            if (field.length <= fuzzyQuery.length + 3) {
              const d = lev(fuzzyQuery, field)
              if (d < bestDist) bestDist = d
            }
          }
          return { plot: p, distance: bestDist }
        })
        .filter(r => r.distance <= MAX_DISTANCE)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 20)
        .map(r => r.plot)

      if (fuzzyResults.length > 0) {
        // Mark results as fuzzy matches so the UI can optionally show "did you mean?"
        fuzzyResults._fuzzy = true
        data = fuzzyResults
      }
    }
  }

  // ─── Apply bbox spatial filter (post-fetch) ──────────────────────────────
  // Filters plots to only those with at least one coordinate inside the bounding box.
  // Must happen post-fetch since coordinates are stored as JSON arrays, not PostGIS geometry.
  // Performance: simple AABB test per coordinate — O(n*k) where k is avg coords per plot (~4-6).
  if (data && filters._bbox) {
    const { south, west, north, east } = filters._bbox
    data = data.filter(plot => {
      if (!plot.coordinates || !Array.isArray(plot.coordinates)) return false
      return plot.coordinates.some(c =>
        Array.isArray(c) && c.length >= 2 &&
        c[0] >= south && c[0] <= north &&
        c[1] >= west && c[1] <= east
      )
    })
  }

  // Optimize coordinate precision — 6 decimal places ≈ 11cm accuracy.
  // Full Supabase precision (15+ decimals) adds ~30% unnecessary bytes to the JSON
  // response for coordinate-heavy payloads. This reduces /api/plots response size
  // without any visible impact on map rendering (Leaflet renders at pixel level).
  if (data) {
    for (const plot of data) {
      if (plot.coordinates && Array.isArray(plot.coordinates)) {
        plot.coordinates = plot.coordinates.map(coord => {
          if (Array.isArray(coord) && coord.length >= 2) {
            return [
              Math.round(coord[0] * 1e6) / 1e6,
              Math.round(coord[1] * 1e6) / 1e6,
            ]
          }
          return coord
        })
      }
    }
  }

  // Enrich with server-computed investment metrics (async — fetches area trends)
  await enrichPlotsWithScores(data)

  // Post-fetch sorts for computed fields that can't be done in SQL.
  // These use the enriched _fields computed by enrichPlotsWithScores().
  // Stable tie-breaker: sort by id when primary values are equal.
  const tieBreak = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  if (filters.sort === 'score-desc' && data) {
    data.sort((a, b) => (b._investmentScore || 0) - (a._investmentScore || 0) || tieBreak(a, b))
  } else if (filters.sort === 'roi-desc' && data) {
    data.sort((a, b) => (b._roi || 0) - (a._roi || 0) || tieBreak(a, b))
  } else if (filters.sort === 'roi-asc' && data) {
    data.sort((a, b) => (a._roi || 0) - (b._roi || 0) || tieBreak(a, b))
  } else if (filters.sort === 'ppsqm-asc' && data) {
    // Price per sqm — ascending (cheapest per sqm first, best deals)
    data.sort((a, b) => (a._pricePerSqm || Infinity) - (b._pricePerSqm || Infinity) || tieBreak(a, b))
  } else if (filters.sort === 'ppsqm-desc' && data) {
    // Price per sqm — descending (premium plots first)
    data.sort((a, b) => (b._pricePerSqm || 0) - (a._pricePerSqm || 0) || tieBreak(a, b))
  } else if (filters.sort === 'monthly-asc' && data) {
    // Monthly payment — ascending (most affordable first)
    data.sort((a, b) => (a._monthlyPayment || Infinity) - (b._monthlyPayment || Infinity) || tieBreak(a, b))
  } else if (filters.sort === 'newest-first' && data) {
    // Newest listings first — sort by created_at descending (explicit, not relying on default)
    data.sort((a, b) => {
      const aTs = a.created_at ? new Date(a.created_at).getTime() : 0
      const bTs = b.created_at ? new Date(b.created_at).getTime() : 0
      return bTs - aTs || tieBreak(a, b)
    })
  } else if (filters.sort === 'cagr-desc' && data) {
    // CAGR sort: uses pre-computed _cagr from enrichPlotsWithScores().
    // No need to recalculate here — enrichment already stored it.
    data.sort((a, b) => (b._cagr || 0) - (a._cagr || 0) || tieBreak(a, b))
  } else if (filters.sort === 'net-roi-desc' && data) {
    // Net ROI sort: uses pre-computed _netRoi from enrichPlotsWithScores().
    // Ranks by REAL return after all costs — the metric pros actually use.
    data.sort((a, b) => (b._netRoi || -Infinity) - (a._netRoi || -Infinity) || tieBreak(a, b))
  } else if (filters.sort === 'deal-desc' && data) {
    // "Best deal first" — sort by how far below the area average price/sqm each plot is.
    // Compute average price/sqm across all results, then rank by discount.
    // A plot 25% below average ranks higher than one 5% below. Critical investor sort:
    // surfaces underpriced opportunities that Madlan/Yad2 don't explicitly expose.
    let totalPsm = 0, psmCount = 0
    for (const p of data) {
      const psm = p._pricePerSqm
      if (psm && psm > 0) { totalPsm += psm; psmCount++ }
    }
    const avgPsm = psmCount > 0 ? totalPsm / psmCount : 0
    if (avgPsm > 0) {
      // Add _dealDiscount enrichment: negative = below avg (good deal), positive = above
      for (const p of data) {
        const psm = p._pricePerSqm
        p._dealDiscount = psm && psm > 0
          ? Math.round(((psm - avgPsm) / avgPsm) * 100)
          : null
      }
      data.sort((a, b) => {
        const aDiscount = a._dealDiscount ?? Infinity
        const bDiscount = b._dealDiscount ?? Infinity
        return aDiscount - bDiscount || tieBreak(a, b)
      })
    }
  }

  return data
}

export async function getPlotById(id) {
  const { data, error } = await supabaseRetry(
    () => supabaseAdmin
      .from('plots')
      .select(`
        *,
        plot_documents(*),
        plot_images(*)
      `)
      .eq('id', id)
      .eq('is_published', true)
      .single(),
    { label: `getPlotById:${id}`, retries: 2 }
  )

  if (error) throw error

  // Enrich single plot with ALL computed metrics — same as list endpoint.
  // Previously only computed score/grade/roi, missing _pricePerSqm, _monthlyPayment,
  // and _daysOnMarket. This caused inconsistency between list and detail views:
  // the sidebar would recalculate metrics client-side that the card strip got for free.
  if (data) {
    await enrichPlotsWithScores([data])
  }

  return data
}

// Admin-specific: no is_published filter, includes images & docs
export async function getPlotByIdAdmin(id) {
  const { data, error } = await supabaseAdmin
    .from('plots')
    .select(`
      *,
      plot_documents(*),
      plot_images(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getAllPlots() {
  const { data, error } = await supabaseAdmin
    .from('plots')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createPlot(plotData) {
  const { data, error } = await supabaseAdmin
    .from('plots')
    .insert(plotData)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePlot(id, plotData) {
  const { data, error } = await supabaseAdmin
    .from('plots')
    .update({ ...plotData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deletePlot(id) {
  const { error } = await supabaseAdmin
    .from('plots')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Fetch multiple plots by their IDs in a single query.
 * Used by the Compare page to avoid loading the entire dataset.
 * Returns full plot data with images (same as getPlotById but batched).
 * @param {string[]} ids - Array of plot UUIDs (max 10)
 * @returns {Promise<Array>} Array of plot objects
 */
export async function getPlotsByIds(ids) {
  if (!ids || ids.length === 0) return []
  // Limit to 30 to match route validation (routes/plots.js allows up to 30)
  const safeIds = ids.slice(0, 30)

  const { data, error } = await supabaseAdmin
    .from('plots')
    .select('*, plot_images(id, url, alt)')
    .eq('is_published', true)
    .in('id', safeIds)

  if (error) throw error

  // Enrich with server-computed investment metrics — previously missing,
  // causing the Compare page to show plots without _investmentScore, _grade,
  // _roi, _pricePerSqm, _monthlyPayment, and _daysOnMarket. This forced
  // redundant client-side recalculation and inconsistent score display.
  await enrichPlotsWithScores(data)

  return data || []
}

// Lightweight aggregate stats for published plots
export async function getPlotStats() {
  const { data, error } = await supabaseAdmin
    .from('plots')
    .select('status, total_price, projected_value, size_sqm, city')
    .eq('is_published', true)

  if (error) throw error
  if (!data || data.length === 0) return { total: 0, cities: [], byStatus: {}, avgRoi: 0, totalArea: 0 }

  const byStatus = {}
  const citySet = new Set()
  let totalPrice = 0
  let totalProj = 0
  let totalArea = 0

  for (const p of data) {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1
    if (p.city) citySet.add(p.city)
    totalPrice += p.total_price || 0
    totalProj += p.projected_value || 0
    totalArea += p.size_sqm || 0
  }

  const avgRoi = totalPrice > 0 ? Math.round(((totalProj - totalPrice) / totalPrice) * 100) : 0

  // Per-city breakdown with avg price/sqm
  const byCity = {}
  for (const p of data) {
    const city = p.city || 'אחר'
    if (!byCity[city]) byCity[city] = { count: 0, totalPrice: 0, totalArea: 0, totalProj: 0 }
    byCity[city].count += 1
    byCity[city].totalPrice += p.total_price || 0
    byCity[city].totalArea += p.size_sqm || 0
    byCity[city].totalProj += p.projected_value || 0
  }
  const cityStats = Object.entries(byCity).map(([city, s]) => ({
    city,
    count: s.count,
    avgPricePerSqm: s.totalArea > 0 ? Math.round(s.totalPrice / s.totalArea) : 0,
    avgRoi: s.totalPrice > 0 ? Math.round(((s.totalProj - s.totalPrice) / s.totalPrice) * 100) : 0,
    totalArea: s.totalArea,
  })).sort((a, b) => b.count - a.count)

  return {
    total: data.length,
    cities: [...citySet].sort(),
    byStatus,
    avgRoi,
    totalArea,
    totalValue: totalPrice,
    cityStats,
  }
}
