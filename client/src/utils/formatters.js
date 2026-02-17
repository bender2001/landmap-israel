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
 * Get a label and color for the investment score.
 */
export function getScoreLabel(score) {
  if (score >= 8) return { label: 'מצוין', color: '#22C55E' }
  if (score >= 6) return { label: 'טוב', color: '#84CC16' }
  if (score >= 4) return { label: 'בינוני', color: '#F59E0B' }
  return { label: 'נמוך', color: '#EF4444' }
}
