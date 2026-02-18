export function formatCurrency(value) {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value)
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
 * Get a label and color for the investment score.
 */
export function getScoreLabel(score) {
  if (score >= 8) return { label: 'מצוין', color: '#22C55E' }
  if (score >= 6) return { label: 'טוב', color: '#84CC16' }
  if (score >= 4) return { label: 'בינוני', color: '#F59E0B' }
  return { label: 'נמוך', color: '#EF4444' }
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
