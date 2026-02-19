import type {
  Plot,
  InvestmentGrade,
  CAGRResult,
  DaysOnMarket,
  ScoreLabel,
  MonthlyPaymentOptions,
  MonthlyPaymentResult,
  InvestmentVerdict,
  RiskLevel,
  DemandVelocity,
  CategoryBadge,
  BestInCategoryEntry,
  BuildableValue,
  TimelineStage,
  InvestmentTimeline,
  PercentileDimension,
  PlotPercentiles,
  AlternativeReturns,
  ScoreFactor,
  InvestmentScoreBreakdown,
  ScoreBreakdownContext,
  NarrativeContext,
} from '../types'
import { formatCurrency, formatDunam, formatMonthlyPayment } from './format'
import { plotCenter, calcPlotPerimeter } from './geo'

const ZONING_ORDER = [
  'AGRICULTURAL', 'MASTER_PLAN_DEPOSIT', 'MASTER_PLAN_APPROVED',
  'DETAILED_PLAN_PREP', 'DETAILED_PLAN_DEPOSIT', 'DETAILED_PLAN_APPROVED',
  'DEVELOPER_TENDER', 'BUILDING_PERMIT',
] as const

export function calcInvestmentScore(plot: Plot): number {
  const price = plot.total_price ?? plot.totalPrice ?? 0
  const projected = plot.projected_value ?? plot.projectedValue ?? 0
  const roi = price > 0 ? ((projected - price) / price) * 100 : 0
  const readiness = plot.readiness_estimate ?? plot.readinessEstimate ?? ''

  const roiScore = Math.min(4, roi / 50)

  const zoning = plot.zoning_stage ?? plot.zoningStage ?? 'AGRICULTURAL'
  const zoningIdx = ZONING_ORDER.indexOf(zoning as typeof ZONING_ORDER[number])
  const zoningScore = zoningIdx >= 0 ? (zoningIdx / (ZONING_ORDER.length - 1)) * 3 : 0

  let readinessScore = 1.5
  if (readiness.includes('1-3')) readinessScore = 3
  else if (readiness.includes('3-5')) readinessScore = 2
  else if (readiness.includes('5+')) readinessScore = 0.5

  const raw = roiScore + zoningScore + readinessScore
  return Math.max(1, Math.min(10, Math.round(raw)))
}

export function getInvestmentGrade(score: number): InvestmentGrade {
  if (score >= 9) return { grade: 'A+', color: '#22C55E', bg: '#22C55E', tier: 'exceptional' }
  if (score >= 8) return { grade: 'A',  color: '#22C55E', bg: '#22C55E', tier: 'excellent' }
  if (score >= 7) return { grade: 'A-', color: '#4ADE80', bg: '#4ADE80', tier: 'very-good' }
  if (score >= 6) return { grade: 'B+', color: '#84CC16', bg: '#84CC16', tier: 'good' }
  if (score >= 5) return { grade: 'B',  color: '#F59E0B', bg: '#F59E0B', tier: 'fair' }
  if (score >= 4) return { grade: 'B-', color: '#F97316', bg: '#F97316', tier: 'below-avg' }
  if (score >= 3) return { grade: 'C+', color: '#EF4444', bg: '#EF4444', tier: 'weak' }
  return              { grade: 'C',  color: '#DC2626', bg: '#DC2626', tier: 'poor' }
}

export function calcCAGR(totalRoiPct: number, readinessEstimate: string | null | undefined): CAGRResult | null {
  if (!totalRoiPct || totalRoiPct <= 0) return null
  let years = 5
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

export function calcDaysOnMarket(createdAt: string | null | undefined): DaysOnMarket | null {
  if (!createdAt) return null
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
  let label: string, color: string
  if (days <= 7) { label = 'חדש בשוק'; color = '#22C55E' }
  else if (days <= 30) { label = `${days} ימים בשוק`; color = '#84CC16' }
  else if (days <= 90) { label = `${Math.floor(days / 7)} שבועות בשוק`; color = '#F59E0B' }
  else if (days <= 365) { label = `${Math.floor(days / 30)} חודשים בשוק`; color = '#EF4444' }
  else { label = `${Math.floor(days / 365)}+ שנים בשוק`; color = '#EF4444' }
  return { days, label, color }
}

export function getScoreLabel(score: number): ScoreLabel {
  if (score >= 8) return { label: 'מצוין', color: '#22C55E' }
  if (score >= 6) return { label: 'טוב', color: '#84CC16' }
  if (score >= 4) return { label: 'בינוני', color: '#F59E0B' }
  return { label: 'נמוך', color: '#EF4444' }
}

export function calcMonthlyPayment(
  totalPrice: number,
  options: MonthlyPaymentOptions = {}
): MonthlyPaymentResult | null {
  if (!totalPrice || totalPrice <= 0) return null
  const { ltv = 0.5, annualRate = 0.06, years = 15 } = options

  const loanAmount = Math.round(totalPrice * ltv)
  const downPayment = totalPrice - loanAmount
  const monthlyRate = annualRate / 12
  const numPayments = years * 12

  const monthly = monthlyRate > 0
    ? Math.round(loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1))
    : Math.round(loanAmount / numPayments)

  const totalPaid = monthly * numPayments
  const totalInterest = totalPaid - loanAmount

  return { monthly, downPayment, loanAmount, totalInterest, rate: annualRate, years, ltv }
}

export function calcInvestmentVerdict(plot: Plot, allPlots: Plot[]): InvestmentVerdict | null {
  if (!plot) return null

  const price = plot.total_price ?? plot.totalPrice ?? 0
  const projected = plot.projected_value ?? plot.projectedValue ?? 0
  const sizeSqM = plot.size_sqm ?? plot.sizeSqM ?? 0
  const roi = price > 0 ? ((projected - price) / price) * 100 : 0
  const score = calcInvestmentScore(plot)

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

  const isBelowAvg = areaDeviation < -8
  const isSignificantlyBelow = areaDeviation < -15
  const isAboveAvg = areaDeviation > 10
  const isHighRoi = roi >= 150
  const isExceptionalRoi = roi >= 200

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

  if (score >= 5) {
    return {
      emoji: '✅',
      label: 'הזדמנות טובה',
      description: `ציון ${score}/10, תשואה +${Math.round(roi)}%`,
      color: '#84CC16',
      tier: 'good',
    }
  }

  if (score >= 3 && !isAboveAvg) {
    return {
      emoji: '📊',
      label: 'שווה לבדוק',
      description: `ציון ${score}/10 — מומלץ לבדוק תכנון ומיסוי`,
      color: '#F59E0B',
      tier: 'fair',
    }
  }

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

export function calcRiskLevel(plot: Plot, allPlots: Plot[]): RiskLevel | null {
  if (!plot) return null

  const price = plot.total_price ?? plot.totalPrice ?? 0
  const projected = plot.projected_value ?? plot.projectedValue ?? 0
  const sizeSqM = plot.size_sqm ?? plot.sizeSqM ?? 0
  const zoning = plot.zoning_stage ?? plot.zoningStage ?? 'AGRICULTURAL'
  const readiness = plot.readiness_estimate ?? plot.readinessEstimate ?? ''
  const roi = price > 0 ? ((projected - price) / price) * 100 : 0

  let riskScore = 0
  const factors: string[] = []

  const zoningRiskMap: Record<string, number> = {
    AGRICULTURAL: 30, MASTER_PLAN_DEPOSIT: 25, MASTER_PLAN_APPROVED: 18,
    DETAILED_PLAN_PREP: 15, DETAILED_PLAN_DEPOSIT: 10, DETAILED_PLAN_APPROVED: 5,
    DEVELOPER_TENDER: 3, BUILDING_PERMIT: 1,
  }
  const zoningRisk = zoningRiskMap[zoning] ?? 20
  riskScore += zoningRisk
  if (zoningRisk >= 25) factors.push('שלב תכנוני מוקדם')
  else if (zoningRisk >= 15) factors.push('תכנון בתהליך')

  let timeRisk = 15
  if (readiness.includes('1-3')) timeRisk = 8
  else if (readiness.includes('3-5')) timeRisk = 15
  else if (readiness.includes('5+') || readiness.includes('5-')) timeRisk = 25
  riskScore += timeRisk
  if (timeRisk >= 20) factors.push('טווח השקעה ארוך (5+ שנים)')

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
    }
  }

  if (roi > 300) { riskScore += 15; factors.push('תשואה צפויה גבוהה מאוד — יש לאמת') }
  else if (roi > 200) { riskScore += 8 }
  else if (roi < 30 && price > 0) { riskScore += 5; factors.push('תשואה צפויה נמוכה') }

  riskScore += 5
  if (sizeSqM > 10000) { riskScore += 5; factors.push('חלקה גדולה — נזילות נמוכה יותר') }

  const level = (riskScore <= 20 ? 1 : riskScore <= 35 ? 2 : riskScore <= 50 ? 3 : riskScore <= 70 ? 4 : 5) as 1 | 2 | 3 | 4 | 5

  const config: Record<number, { label: string; color: string; emoji: string }> = {
    1: { label: 'סיכון נמוך', color: '#22C55E', emoji: '🛡️' },
    2: { label: 'סיכון נמוך-בינוני', color: '#84CC16', emoji: '✅' },
    3: { label: 'סיכון בינוני', color: '#F59E0B', emoji: '⚖️' },
    4: { label: 'סיכון בינוני-גבוה', color: '#F97316', emoji: '⚠️' },
    5: { label: 'סיכון גבוה', color: '#EF4444', emoji: '🔴' },
  }

  return { level, ...config[level], score: riskScore, factors: factors.slice(0, 3) }
}

export function generatePlotSummary(plot: Plot): string {
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

  const purchaseTax = Math.round(price * 0.06)
  const attorneyFees = Math.round(price * 0.0175)
  const totalInvestment = price + purchaseTax + attorneyFees
  const grossProfit = projected - price
  const bettermentLevy = Math.round(grossProfit * 0.5)
  const costs = purchaseTax + attorneyFees
  const taxable = Math.max(0, grossProfit - bettermentLevy - costs)
  const capGains = Math.round(taxable * 0.25)
  const netProfit = grossProfit - costs - bettermentLevy - capGains

  const zoningNames: Record<string, string> = {
    AGRICULTURAL: 'חקלאית', MASTER_PLAN_DEPOSIT: 'הפקדת מתאר',
    MASTER_PLAN_APPROVED: 'מתאר מאושר', DETAILED_PLAN_PREP: 'הכנת מפורטת',
    DETAILED_PLAN_DEPOSIT: 'הפקדת מפורטת', DETAILED_PLAN_APPROVED: 'מפורטת מאושרת',
    DEVELOPER_TENDER: 'מכרז יזמים', BUILDING_PERMIT: 'היתר בנייה',
  }

  const perimeter = calcPlotPerimeter(plot.coordinates)
  const perimeterStr = perimeter
    ? perimeter >= 1000 ? `${(perimeter / 1000).toFixed(1)} ק״מ` : `${perimeter} מ׳`
    : null

  const { grade } = getInvestmentGrade(score)

  const statusNames: Record<string, string> = {
    AVAILABLE: '🟢 זמין', RESERVED: '🟡 שמור', SOLD: '🔴 נמכר', IN_PROCESS: '🟠 בתהליך',
  }
  const statusLabel = statusNames[plot.status ?? ''] || plot.status

  const distToSea = plot.distance_to_sea ?? plot.distanceToSea
  const distToPark = plot.distance_to_park ?? plot.distanceToPark
  const payment = calcMonthlyPayment(price)

  const lines: (string | null)[] = [
    `🏗️ *גוש ${bn} | חלקה ${plot.number}*`,
    `📍 ${plot.city} · ${statusLabel} · דירוג ${grade}`,
    ``,
    `━━━ פרטי חלקה ━━━`,
    `💰 מחיר: ${formatCurrency(price)}`,
    `📐 שטח: ${formatDunam(sizeSqM)} דונם (${sizeSqM.toLocaleString()} מ״ר)`,
    perimeterStr ? `📏 היקף: ${perimeterStr}` : null,
    sizeSqM > 0 ? `💵 מחיר/דונם: ${formatCurrency(Math.round(price / sizeSqM * 1000))}` : null,
    payment ? `🏦 החזר חודשי: ~${formatMonthlyPayment(payment.monthly)} (${Math.round(payment.ltv * 100)}% מימון)` : null,
    zoning && zoningNames[zoning] ? `🗺️ שלב תכנוני: ${zoningNames[zoning]}` : null,
    distToSea != null ? `🌊 ${distToSea} מ׳ מהים` : null,
    distToPark != null ? `🌳 ${distToPark} מ׳ מפארק` : null,
    ``,
    `━━━ ניתוח השקעה ━━━`,
    `📈 תשואה צפויה: +${roi}% (שווי ${formatCurrency(projected)})`,
    cagrData ? `📊 CAGR: ${cagrData.cagr}%/שנה (${cagrData.years} שנים)` : null,
    `⭐ ציון השקעה: ${score}/10 (${grade})`,
    ``,
    `💰 סה״כ השקעה נדרשת: ${formatCurrency(totalInvestment)}`,
    `✨ רווח נקי (אחרי מיסים): ${formatCurrency(netProfit)}`,
    readiness ? `⏳ מוכנות לבנייה: ${readiness}` : null,
    ``,
    typeof window !== 'undefined' ? `🔗 ${window.location.origin}/plot/${plot.id}` : null,
    ``,
    `_LandMap Israel — מפת קרקעות להשקעה_`,
  ]

  return lines.filter((line): line is string => line !== null).join('\n')
}

export function calcDemandVelocity(plot: Plot): DemandVelocity | null {
  if (!plot) return null

  const views = plot.views ?? 0
  const createdAt = plot.created_at ?? plot.createdAt
  if (!createdAt || views <= 0) return null

  const daysOnMarket = Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)))
  const velocity = views / daysOnMarket

  if (velocity >= 3) return { velocity: Math.round(velocity * 10) / 10, label: 'ביקוש גבוה', emoji: '🔥', color: '#F97316', tier: 'hot' }
  if (velocity >= 1.5) return { velocity: Math.round(velocity * 10) / 10, label: 'ביקוש גובר', emoji: '📈', color: '#22C55E', tier: 'growing' }
  if (velocity >= 0.5) return { velocity: Math.round(velocity * 10) / 10, label: 'ביקוש יציב', emoji: '📊', color: '#3B82F6', tier: 'steady' }
  return { velocity: Math.round(velocity * 10) / 10, label: 'ביקוש נמוך', emoji: '🔎', color: '#94A3B8', tier: 'low' }
}

export function calcBestInCategory(plots: Plot[]): Map<string, BestInCategoryEntry> {
  const result = new Map<string, BestInCategoryEntry>()
  if (!plots || plots.length < 3) return result

  const available = plots.filter(p => p.status === 'AVAILABLE')
  if (available.length < 3) return result

  let cheapestPsm = { id: null as string | null, val: Infinity }
  let highestRoi = { id: null as string | null, val: -Infinity }
  let bestScore = { id: null as string | null, val: -Infinity }
  let highestVelocity = { id: null as string | null, val: -Infinity }

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

  const add = (id: string | null, badge: CategoryBadge) => {
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

export function calcBuildableValue(plot: Plot, avgUnitSizeSqm = 100): BuildableValue | null {
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
  const efficiencyRatio = Math.round((totalBuildableArea / sizeSqM) * 100) / 100

  return { pricePerBuildableSqm, totalBuildableArea, estimatedUnits, pricePerUnit, efficiencyRatio, density }
}

export function calcInvestmentTimeline(plot: Plot): InvestmentTimeline | null {
  if (!plot) return null

  const zoning = plot.zoning_stage ?? plot.zoningStage ?? 'AGRICULTURAL'

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

  const stages: TimelineStage[] = stageData.map((stage, i) => ({
    ...stage,
    status: i < currentIdx ? 'completed' : i === currentIdx ? 'current' : 'future',
  }))

  const remainingMonths = stageData.slice(currentIdx + 1).reduce((sum, s) => sum + s.durationMonths, 0)
  const elapsedMonths = stageData.slice(1, currentIdx + 1).reduce((sum, s) => sum + s.durationMonths, 0)
  const totalMonths = elapsedMonths + remainingMonths
  const progressPct = totalMonths > 0 ? Math.round((elapsedMonths / totalMonths) * 100) : 100

  const estimatedCompletionDate = new Date()
  estimatedCompletionDate.setMonth(estimatedCompletionDate.getMonth() + remainingMonths)
  const estimatedYear = estimatedCompletionDate.getFullYear()

  return { stages, totalMonths, elapsedMonths, remainingMonths, progressPct, currentStage: stageData[currentIdx], estimatedYear }
}

export function calcPercentile(value: number, allValues: number[]): number {
  if (!allValues || allValues.length === 0) return 0
  const sorted = [...allValues].sort((a, b) => a - b)
  const below = sorted.filter(v => v < value).length
  return Math.round((below / sorted.length) * 100)
}

export function calcPlotPercentiles(plot: Plot, allPlots: Plot[]): PlotPercentiles | null {
  if (!plot || !allPlots || allPlots.length < 2) return null

  const getPrice = (p: Plot) => p.total_price ?? p.totalPrice ?? 0
  const getSize = (p: Plot) => p.size_sqm ?? p.sizeSqM ?? 0
  const getRoi = (p: Plot) => {
    const price = getPrice(p)
    const proj = p.projected_value ?? p.projectedValue ?? 0
    return price > 0 ? ((proj - price) / price) * 100 : 0
  }
  const getPriceSqm = (p: Plot) => {
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
    price: plotPrice > 0 ? {
      value: calcPercentile(plotPrice, allPrices),
      label: 'מחיר',
      cheaperThan: 100 - calcPercentile(plotPrice, allPrices),
    } : null,
    size: plotSize > 0 ? {
      value: calcPercentile(plotSize, allSizes),
      label: 'שטח',
      biggerThan: calcPercentile(plotSize, allSizes),
    } : null,
    roi: plotRoi > 0 ? {
      value: calcPercentile(plotRoi, allRois),
      label: 'תשואה',
      betterThan: calcPercentile(plotRoi, allRois),
    } : null,
    priceSqm: plotPriceSqm > 0 ? {
      value: calcPercentile(plotPriceSqm, allPriceSqm),
      label: 'מחיר/מ״ר',
      cheaperThan: 100 - calcPercentile(plotPriceSqm, allPriceSqm),
    } : null,
  }
}

export function calcAlternativeReturns(
  investmentAmount: number,
  expectedReturn: number,
  years: number
): AlternativeReturns | null {
  if (!investmentAmount || investmentAmount <= 0 || !years || years <= 0) return null

  const bankRate = 0.045
  const stockRate = 0.09
  const inflationRate = 0.03

  const bankFutureValue = Math.round(investmentAmount * Math.pow(1 + bankRate, years))
  const stockFutureValue = Math.round(investmentAmount * Math.pow(1 + stockRate, years))
  const landFutureValue = investmentAmount + expectedReturn

  const realBankRate = ((1 + bankRate) / (1 + inflationRate)) - 1
  const realStockRate = ((1 + stockRate) / (1 + inflationRate)) - 1
  const landNominalCagr = years > 0 ? Math.pow(landFutureValue / investmentAmount, 1 / years) - 1 : 0
  const realLandRate = ((1 + landNominalCagr) / (1 + inflationRate)) - 1

  return {
    bank: { label: 'פיקדון בנקאי', emoji: '🏦', rate: bankRate, futureValue: bankFutureValue, profit: bankFutureValue - investmentAmount, color: '#94A3B8' },
    stock: { label: 'TA-125 (מניות)', emoji: '📊', rate: stockRate, futureValue: stockFutureValue, profit: stockFutureValue - investmentAmount, color: '#3B82F6' },
    land: { label: 'קרקע זו', emoji: '🏗️', rate: landNominalCagr, futureValue: landFutureValue, profit: expectedReturn, color: '#C8942A' },
    years,
    inflationRate,
    realReturns: {
      bank: Math.round(realBankRate * 1000) / 10,
      stock: Math.round(realStockRate * 1000) / 10,
      land: Math.round(realLandRate * 1000) / 10,
    },
  }
}

export function calcInvestmentScoreBreakdown(
  plot: Plot,
  context: ScoreBreakdownContext = {}
): InvestmentScoreBreakdown | null {
  if (!plot) return null

  const price = plot.total_price ?? plot.totalPrice ?? 0
  const projected = plot.projected_value ?? plot.projectedValue ?? 0
  const sizeSqM = plot.size_sqm ?? plot.sizeSqM ?? 0
  const roi = price > 0 ? ((projected - price) / price) * 100 : 0
  const readiness = plot.readiness_estimate ?? plot.readinessEstimate ?? ''
  const zoning = plot.zoning_stage ?? plot.zoningStage ?? 'AGRICULTURAL'
  const views = plot.views ?? 0

  const ZONING_LABELS: Record<string, string> = {
    'AGRICULTURAL': 'חקלאית', 'MASTER_PLAN_DEPOSIT': 'הפקדת מתאר',
    'MASTER_PLAN_APPROVED': 'מתאר מאושר', 'DETAILED_PLAN_PREP': 'הכנת מפורטת',
    'DETAILED_PLAN_DEPOSIT': 'הפקדת מפורטת', 'DETAILED_PLAN_APPROVED': 'מפורטת מאושרת',
    'DEVELOPER_TENDER': 'מכרז יזמים', 'BUILDING_PERMIT': 'היתר בנייה',
  }
  const zoningIdx = ZONING_ORDER.indexOf(zoning as typeof ZONING_ORDER[number])

  const roiScore = Math.min(4, roi / 50)
  const roiNorm = roiScore / 4
  let roiExplanation: string
  if (roi >= 200) roiExplanation = `תשואה יוצאת דופן +${Math.round(roi)}% — פוטנציאל הכפלה כפולה`
  else if (roi >= 150) roiExplanation = `תשואה גבוהה מאוד +${Math.round(roi)}% — מעל הממוצע בשוק`
  else if (roi >= 100) roiExplanation = `תשואה טובה +${Math.round(roi)}% — הכפלת ההשקעה`
  else if (roi >= 50) roiExplanation = `תשואה סבירה +${Math.round(roi)}% — מעל פיקדון בנקאי`
  else roiExplanation = `תשואה נמוכה +${Math.round(roi)}% — יש לבדוק חלופות`

  const zoningScore = zoningIdx >= 0 ? (zoningIdx / (ZONING_ORDER.length - 1)) * 3 : 0
  const zoningNorm = zoningScore / 3
  const zoningLabel = ZONING_LABELS[zoning] || zoning
  let zoningExplanation: string
  if (zoningIdx >= 6) zoningExplanation = `שלב ${zoningLabel} — קרוב מאוד לבנייה, סיכון נמוך`
  else if (zoningIdx >= 4) zoningExplanation = `שלב ${zoningLabel} — התקדמות טובה בתכנון`
  else if (zoningIdx >= 2) zoningExplanation = `שלב ${zoningLabel} — בתהליך, 3-5 שנים להערכה`
  else zoningExplanation = `שלב ${zoningLabel} — שלב מוקדם, אופק ארוך`

  let readinessScore = 1.5
  let readinessExplanation: string
  if (readiness.includes('1-3')) {
    readinessScore = 3; readinessExplanation = 'אופק 1-3 שנים — תשואה מהירה, נזילות גבוהה'
  } else if (readiness.includes('3-5')) {
    readinessScore = 2; readinessExplanation = 'אופק 3-5 שנים — השקעה לטווח בינוני'
  } else if (readiness.includes('5+') || readiness.includes('5-')) {
    readinessScore = 0.5; readinessExplanation = 'אופק 5+ שנים — השקעה ארוכת טווח, צריך סבלנות'
  } else {
    readinessExplanation = 'אופק לא ידוע — מומלץ לברר עם יועץ'
  }
  const readinessNorm = readinessScore / 3

  let marketScore = 0
  let marketExplanation = 'אין מספיק נתונים להשוואה אזורית'
  if (context.areaAvgPriceSqm && sizeSqM > 0 && price > 0) {
    const plotPsm = price / sizeSqM
    const deviation = ((plotPsm - context.areaAvgPriceSqm) / context.areaAvgPriceSqm) * 100
    if (deviation < -15) { marketScore = 1; marketExplanation = `${Math.abs(Math.round(deviation))}% מתחת לממוצע — עסקה אטרקטיבית` }
    else if (deviation < -5) { marketScore = 0.6; marketExplanation = `${Math.abs(Math.round(deviation))}% מתחת לממוצע — מחיר תחרותי` }
    else if (deviation <= 10) { marketScore = 0.3; marketExplanation = 'מחיר סביר ביחס לאזור' }
    else { marketScore = 0; marketExplanation = `${Math.round(deviation)}% מעל הממוצע — מחיר גבוה` }
  }
  const marketNorm = marketScore

  let demandScore = 0
  let demandExplanation = 'ללא נתוני ביקוש'
  if (views > 0) {
    if (views >= 20) { demandScore = 0.5; demandExplanation = `${views} צפיות — ביקוש גבוה, חלקה פופולרית` }
    else if (views >= 10) { demandScore = 0.3; demandExplanation = `${views} צפיות — עניין מתון` }
    else { demandScore = 0.1; demandExplanation = `${views} צפיות — עדיין מתחת לרדאר` }
  }

  const rawBase = roiScore + zoningScore + readinessScore
  const bonusPoints = marketScore + demandScore
  const total = Math.max(1, Math.min(10, Math.round(rawBase + bonusPoints)))
  const grade = getInvestmentGrade(total)

  const factors: ScoreFactor[] = [
    { key: 'roi', label: 'תשואה צפויה', emoji: '📈', score: roiNorm, maxPoints: 4, points: Math.round(roiScore * 100) / 100, explanation: roiExplanation, color: roiNorm >= 0.7 ? '#22C55E' : roiNorm >= 0.4 ? '#F59E0B' : '#EF4444' },
    { key: 'zoning', label: 'שלב תכנוני', emoji: '🏗️', score: zoningNorm, maxPoints: 3, points: Math.round(zoningScore * 100) / 100, explanation: zoningExplanation, color: zoningNorm >= 0.7 ? '#22C55E' : zoningNorm >= 0.4 ? '#F59E0B' : '#EF4444' },
    { key: 'readiness', label: 'אופק זמן', emoji: '⏱️', score: readinessNorm, maxPoints: 3, points: Math.round(readinessScore * 100) / 100, explanation: readinessExplanation, color: readinessNorm >= 0.7 ? '#22C55E' : readinessNorm >= 0.4 ? '#F59E0B' : '#EF4444' },
    { key: 'market', label: 'מיקום בשוק', emoji: '🏷️', score: marketNorm, maxPoints: 1, points: Math.round(marketScore * 100) / 100, explanation: marketExplanation, color: marketNorm >= 0.7 ? '#22C55E' : marketNorm >= 0.3 ? '#F59E0B' : '#94A3B8' },
    { key: 'demand', label: 'ביקוש', emoji: '👁️', score: demandScore / 0.5, maxPoints: 0.5, points: Math.round(demandScore * 100) / 100, explanation: demandExplanation, color: demandScore >= 0.3 ? '#22C55E' : demandScore > 0 ? '#F59E0B' : '#94A3B8' },
  ]

  return { total, grade, factors }
}

export function generateInvestmentNarrative(plot: Plot, context: NarrativeContext = {}): string {
  if (!plot) return ''

  const price = plot.total_price ?? plot.totalPrice ?? 0
  const projected = plot.projected_value ?? plot.projectedValue ?? 0
  const sizeSqM = plot.size_sqm ?? plot.sizeSqM ?? 0
  const roi = price > 0 ? ((projected - price) / price) * 100 : 0
  const blockNum = plot.block_number ?? plot.blockNumber ?? ''
  const city = plot.city || ''
  const zoning = plot.zoning_stage ?? plot.zoningStage ?? 'AGRICULTURAL'
  const readiness = plot.readiness_estimate ?? plot.readinessEstimate ?? ''
  const dunam = sizeSqM > 0 ? (sizeSqM / 1000).toFixed(1) : '?'
  const priceSqm = sizeSqM > 0 ? Math.round(price / sizeSqM) : 0
  const priceFormatted = price >= 1_000_000
    ? `₪${(price / 1_000_000).toFixed(1)}M`
    : `₪${Math.round(price / 1000).toLocaleString()}K`

  const ZONING_LABELS: Record<string, string> = {
    'AGRICULTURAL': 'חקלאית', 'MASTER_PLAN_DEPOSIT': 'הפקדת מתאר',
    'MASTER_PLAN_APPROVED': 'מתאר מאושר', 'DETAILED_PLAN_PREP': 'הכנת תכנית מפורטת',
    'DETAILED_PLAN_DEPOSIT': 'הפקדת מפורטת', 'DETAILED_PLAN_APPROVED': 'מפורטת מאושרת',
    'DEVELOPER_TENDER': 'מכרז יזמים', 'BUILDING_PERMIT': 'היתר בנייה',
  }

  const parts: string[] = []

  parts.push(`חלקה ${plot.number} בגוש ${blockNum} ב${city} — שטח של ${dunam} דונם (${sizeSqM.toLocaleString()} מ״ר)`)

  if (context.areaAvgPriceSqm && priceSqm > 0) {
    const deviation = ((priceSqm - context.areaAvgPriceSqm) / context.areaAvgPriceSqm) * 100
    if (deviation < -10) {
      parts.push(`במחיר ${priceFormatted} (₪${priceSqm.toLocaleString()}/מ״ר), ${Math.abs(Math.round(deviation))}% מתחת לממוצע האזורי — מחיר אטרקטיבי`)
    } else if (deviation > 10) {
      parts.push(`במחיר ${priceFormatted} (₪${priceSqm.toLocaleString()}/מ״ר), מעל הממוצע — ייתכן שמשקף מיקום או פוטנציאל פרימיום`)
    } else {
      parts.push(`במחיר ${priceFormatted} (₪${priceSqm.toLocaleString()}/מ״ר), תואם את הממוצע האזורי`)
    }
  } else {
    parts.push(`במחיר ${priceFormatted}${priceSqm > 0 ? ` (₪${priceSqm.toLocaleString()}/מ״ר)` : ''}`)
  }

  if (roi >= 200) parts.push(`פוטנציאל תשואה של +${Math.round(roi)}% — הכפלה כפולה ומעלה של ההון`)
  else if (roi >= 100) parts.push(`תשואה צפויה +${Math.round(roi)}% — הכפלת ההשקעה`)
  else if (roi >= 50) parts.push(`תשואה צפויה +${Math.round(roi)}% — מעל תשואת שוק ההון`)
  else if (roi > 0) parts.push(`תשואה צפויה +${Math.round(roi)}%`)

  const zoningLabel = ZONING_LABELS[zoning] || zoning
  const zoningIdx = ZONING_ORDER.indexOf(zoning as typeof ZONING_ORDER[number])
  if (zoningIdx >= 6) parts.push(`הקרקע בשלב מתקדם (${zoningLabel}) — קרובה מאוד למימוש`)
  else if (zoningIdx >= 3) parts.push(`שלב תכנוני: ${zoningLabel} — בתהליך התקדמות`)
  else parts.push(`שלב תכנוני: ${zoningLabel} — השקעה לטווח ארוך`)

  if (readiness.includes('1-3')) parts.push('אופק מימוש של 1-3 שנים')
  else if (readiness.includes('3-5')) parts.push('אופק מימוש של 3-5 שנים')
  else if (readiness.includes('5+') || readiness.includes('5-')) parts.push('אופק מימוש של 5 שנים ומעלה')

  const score = calcInvestmentScore(plot)
  if (score >= 8) parts.push('סיכום: הזדמנות השקעה יוצאת דופן — מומלץ לבחון בהקדם.')
  else if (score >= 6) parts.push('סיכום: השקעה מבטיחה עם יחס סיכון-תשואה טוב.')
  else if (score >= 4) parts.push('סיכום: דורש בדיקת נאותות מעמיקה, אך יש פוטנציאל.')
  else parts.push('סיכום: סיכון גבוה — מומלץ ייעוץ מקצועי לפני קבלת החלטה.')

  return parts.join('. ') + '.'
}
