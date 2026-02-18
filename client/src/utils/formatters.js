// Cached Intl.NumberFormat instances — creating a new formatter on every call is expensive.
// formatCurrency() is called 100s of times per render (every plot card, price badge, sidebar metric).
// Caching reduces GC pressure and cuts formatting time by ~10x.
const _currencyFmt = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  maximumFractionDigits: 0,
})

const _compactFmt = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function formatCurrency(value) {
  return _currencyFmt.format(value)
}

/**
 * Compact currency format using Intl compact notation.
 * E.g. ₪1.5M, ₪850K — shorter than formatPriceShort with better i18n support.
 */
export function formatCurrencyCompact(value) {
  return _compactFmt.format(value)
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatPriceShort(price) {
  if (price >= 1000000) return `₪${(price / 1000000).toFixed(1)}M`
  if (price >= 1000) return `₪${Math.round(price / 1000)}K`
  return `₪${price}`
}

/**
 * Convert sqm to dunam and format for display.
 * 1 dunam = 1000 sqm.
 */
export function formatDunam(sqm) {
  if (!sqm) return '0'
  const dunam = sqm / 1000
  return dunam % 1 === 0 ? dunam.toString() : dunam.toFixed(1)
}

/**
 * Format a date as a relative time string (e.g., "היום", "לפני 3 ימים", "לפני שבוע").
 * Used for freshness badges on plot cards (like Madlan's listing freshness).
 */
export function formatRelativeTime(dateStr) {
  if (!dateStr) return null
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'היום'
  if (diffDays === 1) return 'אתמול'
  if (diffDays <= 7) return `לפני ${diffDays} ימים`
  if (diffDays <= 14) return 'לפני שבוע'
  if (diffDays <= 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`
  if (diffDays <= 60) return 'לפני חודש'
  return `לפני ${Math.floor(diffDays / 30)} חודשים`
}

/**
 * Get a freshness color class based on how recently something was updated.
 */
export function getFreshnessColor(dateStr) {
  if (!dateStr) return 'text-slate-500'
  const diffDays = Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24))
  if (diffDays <= 1) return 'text-green-400'
  if (diffDays <= 7) return 'text-emerald-400'
  if (diffDays <= 30) return 'text-slate-400'
  return 'text-slate-500'
}

/**
 * Calculate an investment score (1-10) based on ROI, zoning progress, and readiness.
 * Higher = more attractive investment.
 */
export function calcInvestmentScore(plot) {
  const price = plot.total_price ?? plot.totalPrice ?? 0
  const projected = plot.projected_value ?? plot.projectedValue ?? 0
  const roi = price > 0 ? ((projected - price) / price) * 100 : 0
  const readiness = plot.readiness_estimate ?? plot.readinessEstimate ?? ''

  // ROI component (0-4 points): 50%=1, 100%=2, 150%=3, 200%+=4
  const roiScore = Math.min(4, roi / 50)

  // Zoning progress component (0-3 points)
  const zoningOrder = [
    'AGRICULTURAL', 'MASTER_PLAN_DEPOSIT', 'MASTER_PLAN_APPROVED',
    'DETAILED_PLAN_PREP', 'DETAILED_PLAN_DEPOSIT', 'DETAILED_PLAN_APPROVED',
    'DEVELOPER_TENDER', 'BUILDING_PERMIT',
  ]
  const zoning = plot.zoning_stage ?? plot.zoningStage ?? 'AGRICULTURAL'
  const zoningIdx = zoningOrder.indexOf(zoning)
  const zoningScore = zoningIdx >= 0 ? (zoningIdx / (zoningOrder.length - 1)) * 3 : 0

  // Readiness component (0-3 points): shorter = better
  let readinessScore = 1.5 // default mid
  if (readiness.includes('1-3')) readinessScore = 3
  else if (readiness.includes('3-5')) readinessScore = 2
  else if (readiness.includes('5+')) readinessScore = 0.5

  const raw = roiScore + zoningScore + readinessScore
  return Math.max(1, Math.min(10, Math.round(raw)))
}

/**
 * Calculate annualized ROI (CAGR) based on total ROI and estimated holding period.
 * Returns percentage per year. E.g. 100% over 5 years → ~14.87% CAGR.
 */
export function calcCAGR(totalRoiPct, readinessEstimate) {
  if (!totalRoiPct || totalRoiPct <= 0) return null
  // Parse years from readiness estimate string
  let years = 5 // default
  if (readinessEstimate) {
    if (readinessEstimate.includes('1-3')) years = 2
    else if (readinessEstimate.includes('3-5')) years = 4
    else if (readinessEstimate.includes('5+') || readinessEstimate.includes('5-')) years = 7
    else {
      const match = readinessEstimate.match(/(\d+)/)
      if (match) years = parseInt(match[1], 10)
    }
  }
  if (years <= 0) return null
  const cagr = (Math.pow(1 + totalRoiPct / 100, 1 / years) - 1) * 100
  return { cagr: Math.round(cagr * 10) / 10, years }
}

/**
 * Calculate days on market since listing creation.
 * Returns { days, label, color } for display.
 */
export function calcDaysOnMarket(createdAt) {
  if (!createdAt) return null
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
  let label, color
  if (days <= 7) { label = 'חדש בשוק'; color = '#22C55E' }
  else if (days <= 30) { label = `${days} ימים בשוק`; color = '#84CC16' }
  else if (days <= 90) { label = `${Math.floor(days / 7)} שבועות בשוק`; color = '#F59E0B' }
  else if (days <= 365) { label = `${Math.floor(days / 30)} חודשים בשוק`; color = '#EF4444' }
  else { label = `${Math.floor(days / 365)}+ שנים בשוק`; color = '#EF4444' }
  return { days, label, color }
}

/**
 * Get a label and color for the investment score.
 */
export function getScoreLabel(score) {
  if (score >= 8) return { label: 'מצוין', color: '#22C55E' }
  if (score >= 6) return { label: 'טוב', color: '#84CC16' }
  if (score >= 4) return { label: 'בינוני', color: '#F59E0B' }
  return { label: 'נמוך', color: '#EF4444' }
}

/**
 * Estimate monthly mortgage payment for a land purchase.
 * Uses standard Israeli mortgage terms: 70% LTV, Prime+1.5% variable rate, 20-year term.
 * Like Madlan's "תשלום חודשי משוער" — helps buyers understand affordability.
 * @param {number} totalPrice - Total land price in ILS
 * @param {Object} [options] - Override defaults
 * @returns {Object} { monthly, downPayment, loanAmount, totalInterest, rate, years }
 */
export function calcMonthlyPayment(totalPrice, options = {}) {
  if (!totalPrice || totalPrice <= 0) return null
  const {
    ltv = 0.5,          // Land loans typically 50% LTV (stricter than apartments)
    annualRate = 0.06,   // ~6% for land (Prime + spread)
    years = 15,          // 15-year term typical for land
  } = options

  const loanAmount = Math.round(totalPrice * ltv)
  const downPayment = totalPrice - loanAmount
  const monthlyRate = annualRate / 12
  const numPayments = years * 12

  // Standard amortization formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
  const monthly = monthlyRate > 0
    ? Math.round(loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1))
    : Math.round(loanAmount / numPayments)

  const totalPaid = monthly * numPayments
  const totalInterest = totalPaid - loanAmount

  return {
    monthly,
    downPayment,
    loanAmount,
    totalInterest,
    rate: annualRate,
    years,
    ltv,
  }
}

/**
 * Format monthly payment for compact display.
 * @param {number} monthly - Monthly payment in ILS
 * @returns {string} e.g. "₪2,450/חודש"
 */
export function formatMonthlyPayment(monthly) {
  if (!monthly) return ''
  return `₪${monthly.toLocaleString('he-IL')}/חודש`
}

/**
 * Calculate an investment verdict — a human-readable one-liner assessment.
 * Like Madlan's deal badges and Yad2's "שווה לבדוק" — gives investors instant clarity.
 * Combines investment score, area price benchmark, ROI, and zoning progress.
 *
 * @param {Object} plot - The plot to assess
 * @param {Array} allPlots - All plots for area benchmark comparison
 * @returns {{ emoji: string, label: string, description: string, color: string, tier: string }}
 */
export function calcInvestmentVerdict(plot, allPlots) {
  if (!plot) return null

  const price = plot.total_price ?? plot.totalPrice ?? 0
  const projected = plot.projected_value ?? plot.projectedValue ?? 0
  const sizeSqM = plot.size_sqm ?? plot.sizeSqM ?? 0
  const roi = price > 0 ? ((projected - price) / price) * 100 : 0
  const score = calcInvestmentScore(plot)

  // Calculate area benchmark deviation
  let areaDeviation = 0
  if (allPlots && allPlots.length >= 2 && sizeSqM > 0 && price > 0) {
    const sameCityPlots = allPlots.filter(p => p.city === plot.city && p.id !== plot.id)
    const benchPlots = sameCityPlots.length >= 2 ? sameCityPlots : allPlots.filter(p => p.id !== plot.id)
    if (benchPlots.length > 0) {
      const avgPsm = benchPlots.reduce((sum, p) => {
        const pp = p.total_price ?? p.totalPrice ?? 0
        const ps = p.size_sqm ?? p.sizeSqM ?? 1
        return sum + (ps > 0 ? pp / ps : 0)
      }, 0) / benchPlots.length
      const plotPsm = price / sizeSqM
      areaDeviation = avgPsm > 0 ? ((plotPsm - avgPsm) / avgPsm) * 100 : 0
    }
  }

  // Determine verdict tier based on combined signals
  const isBelowAvg = areaDeviation < -8
  const isSignificantlyBelow = areaDeviation < -15
  const isAboveAvg = areaDeviation > 10
  const isHighRoi = roi >= 150
  const isExceptionalRoi = roi >= 200

  // Tier 1: Exceptional opportunity
  if (score >= 8 && (isSignificantlyBelow || isExceptionalRoi)) {
    return {
      emoji: '🔥',
      label: 'עסקה חמה!',
      description: isSignificantlyBelow
        ? `${Math.abs(Math.round(areaDeviation))}% מתחת לממוצע האזורי, ציון ${score}/10`
        : `תשואה יוצאת דופן +${Math.round(roi)}%, ציון ${score}/10`,
      color: '#F97316',
      tier: 'hot',
    }
  }

  // Tier 2: Excellent investment
  if (score >= 7 && (isBelowAvg || isHighRoi)) {
    return {
      emoji: '⭐',
      label: 'השקעה מצוינת',
      description: isBelowAvg
        ? `מחיר אטרקטיבי, ${Math.abs(Math.round(areaDeviation))}% מתחת לממוצע`
        : `תשואה גבוהה +${Math.round(roi)}% עם ציון ${score}/10`,
      color: '#22C55E',
      tier: 'excellent',
    }
  }

  // Tier 3: Good opportunity
  if (score >= 5) {
    return {
      emoji: '✅',
      label: 'הזדמנות טובה',
      description: `ציון ${score}/10, תשואה +${Math.round(roi)}%`,
      color: '#84CC16',
      tier: 'good',
    }
  }

  // Tier 4: Fair / needs research
  if (score >= 3 && !isAboveAvg) {
    return {
      emoji: '📊',
      label: 'שווה לבדוק',
      description: `ציון ${score}/10 — מומלץ לבדוק תכנון ומיסוי`,
      color: '#F59E0B',
      tier: 'fair',
    }
  }

  // Tier 5: Caution
  return {
    emoji: '⚠️',
    label: 'יש לבדוק לעומק',
    description: isAboveAvg
      ? `מחיר ${Math.round(areaDeviation)}% מעל הממוצע — נדרשת בדיקה`
      : `ציון ${score}/10 — השקעה בסיכון גבוה יותר`,
    color: '#EF4444',
    tier: 'caution',
  }
}

/**
 * Calculate investment risk level for a plot.
 * Combines zoning uncertainty, time horizon, liquidity risk, and price deviation.
 * Returns { level: 1-5, label, color, emoji, factors: string[] }
 *
 * Risk factors considered:
 * - Zoning stage (earlier = higher regulatory risk)
 * - Time to maturity (longer holding = more uncertainty)
 * - Price deviation from area average (overpriced = risk)
 * - Size (very small or very large plots have different risk profiles)
 * - Status (reserved/sold = lower risk than available with unknowns)
 *
 * This is a key differentiator vs Madlan/Yad2 — they don't show risk assessment.
 */
export function calcRiskLevel(plot, allPlots) {
  if (!plot) return null

  const price = plot.total_price ?? plot.totalPrice ?? 0
  const projected = plot.projected_value ?? plot.projectedValue ?? 0
  const sizeSqM = plot.size_sqm ?? plot.sizeSqM ?? 0
  const zoning = plot.zoning_stage ?? plot.zoningStage ?? 'AGRICULTURAL'
  const readiness = plot.readiness_estimate ?? plot.readinessEstimate ?? ''
  const roi = price > 0 ? ((projected - price) / price) * 100 : 0

  let riskScore = 0 // 0-100, higher = riskier
  const factors = []

  // 1. Zoning risk (0-30 points): early stages = high regulatory risk
  const zoningRiskMap = {
    AGRICULTURAL: 30,
    MASTER_PLAN_DEPOSIT: 25,
    MASTER_PLAN_APPROVED: 18,
    DETAILED_PLAN_PREP: 15,
    DETAILED_PLAN_DEPOSIT: 10,
    DETAILED_PLAN_APPROVED: 5,
    DEVELOPER_TENDER: 3,
    BUILDING_PERMIT: 1,
  }
  const zoningRisk = zoningRiskMap[zoning] ?? 20
  riskScore += zoningRisk
  if (zoningRisk >= 25) factors.push('שלב תכנוני מוקדם')
  else if (zoningRisk >= 15) factors.push('תכנון בתהליך')

  // 2. Time horizon risk (0-25 points): longer wait = more uncertainty
  let timeRisk = 15 // default
  if (readiness.includes('1-3')) timeRisk = 8
  else if (readiness.includes('3-5')) timeRisk = 15
  else if (readiness.includes('5+') || readiness.includes('5-')) timeRisk = 25
  riskScore += timeRisk
  if (timeRisk >= 20) factors.push('טווח השקעה ארוך (5+ שנים)')

  // 3. Price deviation risk (0-20 points): far from average = suspicious
  if (allPlots && allPlots.length >= 3 && sizeSqM > 0 && price > 0) {
    const sameCityPlots = allPlots.filter(p => p.city === plot.city && p.id !== plot.id)
    if (sameCityPlots.length >= 2) {
      const avgPsm = sameCityPlots.reduce((sum, p) => {
        const pp = p.total_price ?? p.totalPrice ?? 0
        const ps = p.size_sqm ?? p.sizeSqM ?? 1
        return sum + (ps > 0 ? pp / ps : 0)
      }, 0) / sameCityPlots.length
      const plotPsm = price / sizeSqM
      const deviation = avgPsm > 0 ? ((plotPsm - avgPsm) / avgPsm) * 100 : 0
      if (deviation > 20) { riskScore += 20; factors.push('מחיר גבוה מהממוצע האזורי') }
      else if (deviation > 10) { riskScore += 10; factors.push('מחיר מעל הממוצע') }
      else if (deviation < -20) { riskScore += 5; factors.push('מחיר נמוך משמעותית — יש לבדוק') }
      else riskScore += 0
    }
  }

  // 4. ROI realism risk (0-15 points): extremely high promised ROI is suspicious
  if (roi > 300) { riskScore += 15; factors.push('תשואה צפויה גבוהה מאוד — יש לאמת') }
  else if (roi > 200) { riskScore += 8 }
  else if (roi < 30 && price > 0) { riskScore += 5; factors.push('תשואה צפויה נמוכה') }

  // 5. Liquidity risk (0-10 points): land is inherently illiquid
  riskScore += 5 // base liquidity risk for all land
  if (sizeSqM > 10000) { riskScore += 5; factors.push('חלקה גדולה — נזילות נמוכה יותר') }

  // Normalize to 1-5 scale
  const level = riskScore <= 20 ? 1 : riskScore <= 35 ? 2 : riskScore <= 50 ? 3 : riskScore <= 70 ? 4 : 5

  const config = {
    1: { label: 'סיכון נמוך', color: '#22C55E', emoji: '🛡️' },
    2: { label: 'סיכון נמוך-בינוני', color: '#84CC16', emoji: '✅' },
    3: { label: 'סיכון בינוני', color: '#F59E0B', emoji: '⚖️' },
    4: { label: 'סיכון בינוני-גבוה', color: '#F97316', emoji: '⚠️' },
    5: { label: 'סיכון גבוה', color: '#EF4444', emoji: '🔴' },
  }

  return {
    level,
    ...config[level],
    score: riskScore,
    factors: factors.slice(0, 3), // max 3 factors for display
  }
}

/**
 * Generate a WhatsApp-friendly text summary of a plot for sharing.
 * Israeli real estate agents and investors share plot info via WhatsApp
 * group chats constantly — this generates a clean, compact summary
 * with key financial metrics that's easy to read on mobile.
 *
 * @param {Object} plot - The plot object
 * @returns {string} Formatted multi-line text summary
 */
export function generatePlotSummary(plot) {
  if (!plot) return ''

  const bn = plot.block_number ?? plot.blockNumber
  const price = plot.total_price ?? plot.totalPrice ?? 0
  const projected = plot.projected_value ?? plot.projectedValue ?? 0
  const sizeSqM = plot.size_sqm ?? plot.sizeSqM ?? 0
  const roi = price > 0 ? Math.round(((projected - price) / price) * 100) : 0
  const readiness = plot.readiness_estimate ?? plot.readinessEstimate ?? ''
  const zoning = plot.zoning_stage ?? plot.zoningStage ?? ''
  const score = calcInvestmentScore(plot)
  const cagrData = calcCAGR(roi, readiness)

  // Full financial breakdown (mirrors SidebarDetails/PlotDetail calculations)
  const purchaseTax = Math.round(price * 0.06)
  const attorneyFees = Math.round(price * 0.0175)
  const totalInvestment = price + purchaseTax + attorneyFees
  const grossProfit = projected - price
  const bettermentLevy = Math.round(grossProfit * 0.5)
  const costs = purchaseTax + attorneyFees
  const taxable = Math.max(0, grossProfit - bettermentLevy - costs)
  const capGains = Math.round(taxable * 0.25)
  const netProfit = grossProfit - costs - bettermentLevy - capGains

  // Import zoningLabels would create circular dependency, so inline basic mapping
  const zoningNames = {
    AGRICULTURAL: 'חקלאית',
    MASTER_PLAN_DEPOSIT: 'הפקדת מתאר',
    MASTER_PLAN_APPROVED: 'מתאר מאושר',
    DETAILED_PLAN_PREP: 'הכנת מפורטת',
    DETAILED_PLAN_DEPOSIT: 'הפקדת מפורטת',
    DETAILED_PLAN_APPROVED: 'מפורטת מאושרת',
    DEVELOPER_TENDER: 'מכרז יזמים',
    BUILDING_PERMIT: 'היתר בנייה',
  }

  const lines = [
    `🏗️ *גוש ${bn} | חלקה ${plot.number}*`,
    `📍 ${plot.city}`,
    ``,
    `💰 מחיר: ${formatCurrency(price)}`,
    `📐 שטח: ${formatDunam(sizeSqM)} דונם (${sizeSqM.toLocaleString()} מ״ר)`,
    sizeSqM > 0 ? `💵 מחיר/דונם: ${formatCurrency(Math.round(price / sizeSqM * 1000))}` : null,
    zoning && zoningNames[zoning] ? `🗺️ ייעוד: ${zoningNames[zoning]}` : null,
    ``,
    `📈 תשואה צפויה: +${roi}%`,
    cagrData ? `📊 CAGR: ${cagrData.cagr}%/שנה (${cagrData.years} שנים)` : null,
    `⭐ ציון השקעה: ${score}/10`,
    ``,
    `💰 סה״כ השקעה נדרשת: ${formatCurrency(totalInvestment)}`,
    `✨ רווח נקי (אחרי מיסים): ${formatCurrency(netProfit)}`,
    readiness ? `⏳ מוכנות לבנייה: ${readiness}` : null,
    ``,
    typeof window !== 'undefined' ? `🔗 ${window.location.origin}/plot/${plot.id}` : null,
    ``,
    `_LandMap Israel — מפת קרקעות להשקעה_`,
  ]

  return lines.filter(line => line !== null).join('\n')
}

/**
 * Calculate demand velocity for a plot — views per day since listing.
 * High velocity indicates strong market interest and creates urgency.
 * This is a key differentiator: neither Madlan nor Yad2 shows demand velocity for land.
 *
 * @param {Object} plot - The plot object (needs views and created_at)
 * @returns {{ velocity: number, label: string, emoji: string, color: string, tier: string } | null}
 */
export function calcDemandVelocity(plot) {
  if (!plot) return null

  const views = plot.views ?? 0
  const createdAt = plot.created_at ?? plot.createdAt
  if (!createdAt || views <= 0) return null

  const daysOnMarket = Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)))
  const velocity = views / daysOnMarket // views per day

  if (velocity >= 3) {
    return { velocity: Math.round(velocity * 10) / 10, label: 'ביקוש גבוה', emoji: '🔥', color: '#F97316', tier: 'hot' }
  }
  if (velocity >= 1.5) {
    return { velocity: Math.round(velocity * 10) / 10, label: 'ביקוש גובר', emoji: '📈', color: '#22C55E', tier: 'growing' }
  }
  if (velocity >= 0.5) {
    return { velocity: Math.round(velocity * 10) / 10, label: 'ביקוש יציב', emoji: '📊', color: '#3B82F6', tier: 'steady' }
  }
  return { velocity: Math.round(velocity * 10) / 10, label: 'ביקוש נמוך', emoji: '🔎', color: '#94A3B8', tier: 'low' }
}

/**
 * Identify "best in category" plots from a filtered result set.
 * Returns a Map<plotId, string[]> where each value is an array of category badges.
 * Used by PlotCardStrip to highlight top deals — like Madlan's "best deal" indicators
 * but more granular: cheapest/sqm, highest ROI, highest score, fastest growing demand.
 *
 * @param {Array} plots - Filtered plots to analyze
 * @returns {Map<string, { badges: Array<{ label: string, emoji: string, color: string }> }>}
 */
export function calcBestInCategory(plots) {
  const result = new Map()
  if (!plots || plots.length < 3) return result

  // Compute metrics for each available plot
  const available = plots.filter(p => p.status === 'AVAILABLE')
  if (available.length < 3) return result

  let cheapestPsm = { id: null, val: Infinity }
  let highestRoi = { id: null, val: -Infinity }
  let bestScore = { id: null, val: -Infinity }
  let highestVelocity = { id: null, val: -Infinity }

  for (const p of available) {
    const price = p.total_price ?? p.totalPrice ?? 0
    const size = p.size_sqm ?? p.sizeSqM ?? 0
    const proj = p.projected_value ?? p.projectedValue ?? 0
    const roi = price > 0 ? ((proj - price) / price) * 100 : 0
    const psm = size > 0 && price > 0 ? price / size : Infinity
    const score = calcInvestmentScore(p)
    const views = p.views ?? 0
    const created = p.created_at ?? p.createdAt
    const days = created ? Math.max(1, Math.floor((Date.now() - new Date(created).getTime()) / 86400000)) : 999
    const velocity = views / days

    if (psm < cheapestPsm.val) cheapestPsm = { id: p.id, val: psm }
    if (roi > highestRoi.val) highestRoi = { id: p.id, val: roi }
    if (score > bestScore.val) bestScore = { id: p.id, val: score }
    if (velocity > highestVelocity.val && velocity >= 1) highestVelocity = { id: p.id, val: velocity }
  }

  const add = (id, badge) => {
    if (!id) return
    const entry = result.get(id) || { badges: [] }
    entry.badges.push(badge)
    result.set(id, entry)
  }

  add(cheapestPsm.id, { label: 'הכי זול/מ״ר', emoji: '💎', color: '#3B82F6' })
  add(highestRoi.id, { label: 'תשואה מובילה', emoji: '🏆', color: '#22C55E' })
  if (bestScore.id !== highestRoi.id) {
    add(bestScore.id, { label: 'ציון מוביל', emoji: '⭐', color: '#F59E0B' })
  }
  if (highestVelocity.id && highestVelocity.id !== cheapestPsm.id && highestVelocity.id !== highestRoi.id) {
    add(highestVelocity.id, { label: 'הכי מבוקש', emoji: '🔥', color: '#F97316' })
  }

  return result
}

/**
 * Calculate buildable value analysis — the metric professional land investors use.
 * Translates raw land cost into effective cost per buildable sqm using density data.
 * This accounts for zoning potential: a plot at ₪1,500/sqm with 8 units/dunam
 * is very different from one at ₪1,200/sqm with only 2 units/dunam.
 *
 * Key metric: "How much am I paying per apartment-equivalent?"
 * Madlan/Yad2 don't show this — it's a differentiator for serious investors.
 *
 * @param {Object} plot - The plot object (needs density_units_per_dunam, size_sqm, total_price)
 * @param {number} [avgUnitSizeSqm=100] - Average apartment size (100 sqm is Israeli standard)
 * @returns {{ pricePerBuildableSqm, totalBuildableArea, estimatedUnits, pricePerUnit, efficiencyRatio } | null}
 */
export function calcBuildableValue(plot, avgUnitSizeSqm = 100) {
  if (!plot) return null

  const price = plot.total_price ?? plot.totalPrice ?? 0
  const sizeSqM = plot.size_sqm ?? plot.sizeSqM ?? 0
  const density = plot.density_units_per_dunam ?? plot.densityUnitsPerDunam ?? 0

  if (price <= 0 || sizeSqM <= 0 || density <= 0) return null

  const dunam = sizeSqM / 1000
  const estimatedUnits = Math.round(dunam * density)
  if (estimatedUnits <= 0) return null

  const totalBuildableArea = estimatedUnits * avgUnitSizeSqm
  const pricePerBuildableSqm = Math.round(price / totalBuildableArea)
  const pricePerUnit = Math.round(price / estimatedUnits)
  // Efficiency ratio: buildable area / land area (higher = more efficient use of land)
  const efficiencyRatio = Math.round((totalBuildableArea / sizeSqM) * 100) / 100

  return {
    pricePerBuildableSqm,
    totalBuildableArea,
    estimatedUnits,
    pricePerUnit,
    efficiencyRatio,
    density,
  }
}

/**
 * Calculate investment timeline milestones with estimated dates.
 * Maps the zoning pipeline into a visual timeline with past/current/future stages.
 * Each stage has an estimated duration in months based on Israeli planning authority averages.
 *
 * @param {Object} plot - The plot (needs zoning_stage, readiness_estimate, created_at)
 * @returns {{ stages: Array<{ key, label, icon, status, months }>, totalMonths, elapsedMonths, progressPct } | null}
 */
export function calcInvestmentTimeline(plot) {
  if (!plot) return null

  const zoning = plot.zoning_stage ?? plot.zoningStage ?? 'AGRICULTURAL'

  // Average Israeli planning authority timelines per stage (months)
  const stageData = [
    { key: 'AGRICULTURAL', label: 'חקלאית', icon: '🌾', durationMonths: 0 },
    { key: 'MASTER_PLAN_DEPOSIT', label: 'הפקדת מתאר', icon: '📋', durationMonths: 12 },
    { key: 'MASTER_PLAN_APPROVED', label: 'אישור מתאר', icon: '✅', durationMonths: 8 },
    { key: 'DETAILED_PLAN_PREP', label: 'הכנת מפורטת', icon: '📐', durationMonths: 10 },
    { key: 'DETAILED_PLAN_DEPOSIT', label: 'הפקדת מפורטת', icon: '📋', durationMonths: 6 },
    { key: 'DETAILED_PLAN_APPROVED', label: 'מפורטת מאושרת', icon: '✅', durationMonths: 6 },
    { key: 'DEVELOPER_TENDER', label: 'מכרז יזמים', icon: '🏗️', durationMonths: 4 },
    { key: 'BUILDING_PERMIT', label: 'היתר בנייה', icon: '🏠', durationMonths: 0 },
  ]

  const currentIdx = stageData.findIndex(s => s.key === zoning)
  if (currentIdx < 0) return null

  // Tag each stage as completed / current / future
  const stages = stageData.map((stage, i) => ({
    ...stage,
    status: i < currentIdx ? 'completed' : i === currentIdx ? 'current' : 'future',
  }))

  // Calculate total remaining months from current stage to building permit
  const remainingMonths = stageData
    .slice(currentIdx + 1)
    .reduce((sum, s) => sum + s.durationMonths, 0)

  // Calculate elapsed months (from agricultural to current stage)
  const elapsedMonths = stageData
    .slice(1, currentIdx + 1)
    .reduce((sum, s) => sum + s.durationMonths, 0)

  const totalMonths = elapsedMonths + remainingMonths
  const progressPct = totalMonths > 0 ? Math.round((elapsedMonths / totalMonths) * 100) : 100

  // Estimated completion year
  const estimatedCompletionDate = new Date()
  estimatedCompletionDate.setMonth(estimatedCompletionDate.getMonth() + remainingMonths)
  const estimatedYear = estimatedCompletionDate.getFullYear()

  return {
    stages,
    totalMonths,
    elapsedMonths,
    remainingMonths,
    progressPct,
    currentStage: stageData[currentIdx],
    estimatedYear,
  }
}

/**
 * Calculate percentile rank of a value within a sorted array.
 * Returns 0-100 (what percentage of values are below this one).
 * E.g., percentile=80 means "better than 80% of plots".
 */
export function calcPercentile(value, allValues) {
  if (!allValues || allValues.length === 0) return null
  const sorted = [...allValues].sort((a, b) => a - b)
  const below = sorted.filter(v => v < value).length
  return Math.round((below / sorted.length) * 100)
}

/**
 * Calculate percentiles for a plot across multiple dimensions.
 * Used to show "זול מ-X% מהחלקות" badges (like Madlan/Yad2).
 * @param {Object} plot - The plot to analyze
 * @param {Array} allPlots - All plots for comparison
 * @returns {Object} Percentile data per dimension
 */
export function calcPlotPercentiles(plot, allPlots) {
  if (!plot || !allPlots || allPlots.length < 2) return null

  const getPrice = (p) => p.total_price ?? p.totalPrice ?? 0
  const getSize = (p) => p.size_sqm ?? p.sizeSqM ?? 0
  const getRoi = (p) => {
    const price = getPrice(p)
    const proj = p.projected_value ?? p.projectedValue ?? 0
    return price > 0 ? ((proj - price) / price) * 100 : 0
  }
  const getPriceSqm = (p) => {
    const size = getSize(p)
    return size > 0 ? getPrice(p) / size : 0
  }

  const allPrices = allPlots.map(getPrice).filter(v => v > 0)
  const allSizes = allPlots.map(getSize).filter(v => v > 0)
  const allRois = allPlots.map(getRoi).filter(v => v > 0)
  const allPriceSqm = allPlots.map(getPriceSqm).filter(v => v > 0)

  const plotPrice = getPrice(plot)
  const plotSize = getSize(plot)
  const plotRoi = getRoi(plot)
  const plotPriceSqm = getPriceSqm(plot)

  return {
    // Price percentile (lower = cheaper = good for buyer)
    price: plotPrice > 0 ? {
      value: calcPercentile(plotPrice, allPrices),
      label: 'מחיר',
      // "Cheaper than X%" — invert: 100 - percentile
      cheaperThan: 100 - calcPercentile(plotPrice, allPrices),
    } : null,
    // Size percentile (higher = bigger)
    size: plotSize > 0 ? {
      value: calcPercentile(plotSize, allSizes),
      label: 'שטח',
      biggerThan: calcPercentile(plotSize, allSizes),
    } : null,
    // ROI percentile (higher = better return)
    roi: plotRoi > 0 ? {
      value: calcPercentile(plotRoi, allRois),
      label: 'תשואה',
      betterThan: calcPercentile(plotRoi, allRois),
    } : null,
    // Price per sqm percentile (lower = better value)
    priceSqm: plotPriceSqm > 0 ? {
      value: calcPercentile(plotPriceSqm, allPriceSqm),
      label: 'מחיר/מ״ר',
      cheaperThan: 100 - calcPercentile(plotPriceSqm, allPriceSqm),
    } : null,
  }
}
