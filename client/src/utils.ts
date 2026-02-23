import type { Plot, InvestmentGrade } from './types'

// ── Site Config (centralized) ──
export const SITE_CONFIG = {
  whatsapp: '9720521234567',
  phone: '052-1234567',
  siteName: 'LandMap Israel',
  waBaseUrl: 'https://wa.me/',
  get waLink() { return `${this.waBaseUrl}${this.whatsapp}` },
} as const

// ── Constants ──
export const statusLabels: Record<string, string> = { AVAILABLE: 'זמין', SOLD: 'נמכר', RESERVED: 'שמור', IN_PLANNING: 'בתכנון' }
export const statusColors: Record<string, string> = { AVAILABLE: '#10B981', SOLD: '#EF4444', RESERVED: '#F59E0B', IN_PLANNING: '#8B5CF6' }
export const zoningLabels: Record<string, string> = {
  AGRICULTURAL: 'קרקע חקלאית', MASTER_PLAN_DEPOSIT: 'הפקדת תוכנית מתאר', MASTER_PLAN_APPROVED: 'תוכנית מתאר מאושרת',
  DETAILED_PLAN_PREP: 'הכנת תוכנית מפורטת', DETAILED_PLAN_DEPOSIT: 'הפקדת תוכנית מפורטת',
  DETAILED_PLAN_APPROVED: 'תוכנית מפורטת מאושרת', DEVELOPER_TENDER: 'מכרז יזמים', BUILDING_PERMIT: 'היתר בנייה',
}
export const zoningPipeline = [
  { key: 'AGRICULTURAL', label: 'חקלאית', icon: '🌾' }, { key: 'MASTER_PLAN_DEPOSIT', label: 'הפקדת מתאר', icon: '📋' },
  { key: 'MASTER_PLAN_APPROVED', label: 'אישור מתאר', icon: '✅' }, { key: 'DETAILED_PLAN_PREP', label: 'הכנת מפורטת', icon: '📐' },
  { key: 'DETAILED_PLAN_DEPOSIT', label: 'הפקדת מפורטת', icon: '📋' }, { key: 'DETAILED_PLAN_APPROVED', label: 'מפורטת מאושרת', icon: '✅' },
  { key: 'DEVELOPER_TENDER', label: 'מכרז יזמים', icon: '🏗️' }, { key: 'BUILDING_PERMIT', label: 'היתר בנייה', icon: '🏠' },
]
export const leadStatusLabels: Record<string, string> = { new: 'חדש', contacted: 'נוצר קשר', qualified: 'מתאים', converted: 'הומר', lost: 'אבוד', closed: 'נסגר' }
export const leadStatusColors: Record<string, string> = { new: '#3B82F6', contacted: '#F59E0B', qualified: '#8B5CF6', converted: '#10B981', lost: '#EF4444', closed: '#64748B' }

// ── Plot Accessors ──
export const p = (plot: Plot) => ({
  price: plot.total_price ?? plot.totalPrice ?? 0, projected: plot.projected_value ?? plot.projectedValue ?? 0,
  size: plot.size_sqm ?? plot.sizeSqM ?? 0, block: String(plot.block_number ?? plot.blockNumber ?? ''),
  zoning: String(plot.zoning_stage ?? plot.zoningStage ?? 'AGRICULTURAL'),
  readiness: String(plot.readiness_estimate ?? plot.readinessEstimate ?? ''),
  created: plot.created_at ?? plot.createdAt ?? '', seaDist: plot.distance_to_sea ?? plot.distanceToSea ?? null,
  parkDist: plot.distance_to_park ?? plot.distanceToPark ?? null,
  density: plot.density_units_per_dunam ?? plot.densityUnitsPerDunam ?? 0,
})
export const roi = (plot: Plot) => { const { price, projected } = p(plot); return price > 0 ? ((projected - price) / price) * 100 : 0 }

// ── Price per sqm ──
export const pricePerSqm = (plot: Plot) => {
  const { price, size } = p(plot)
  return price > 0 && size > 0 ? Math.round(price / size) : 0
}

// ── Price per dunam (1000 sqm) — the Israeli land deal standard ──
export const pricePerDunam = (plot: Plot) => {
  const { price, size } = p(plot)
  if (price <= 0 || size <= 0) return 0
  const dunams = size / 1000
  return dunams > 0 ? Math.round(price / dunams) : 0
}

// ── Formatting ──
const cFmt = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 })
const kFmt = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', notation: 'compact', maximumFractionDigits: 1 })
export const fmt = {
  price: (v: number) => cFmt.format(v), compact: (v: number) => kFmt.format(v),
  short: (v: number) => v >= 1e6 ? `₪${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `₪${Math.round(v / 1e3)}K` : `₪${v}`,
  dunam: (sqm: number) => { const d = sqm / 1000; return d % 1 === 0 ? String(d) : d.toFixed(1) },
  date: (s: string | null | undefined) => s ? new Date(s).toLocaleDateString('he-IL', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
  relative: (s: string | null | undefined) => { if (!s) return null; const d = Math.floor((Date.now() - new Date(s).getTime()) / 864e5); if (d === 0) return 'היום'; if (d === 1) return 'אתמול'; if (d <= 7) return `לפני ${d} ימים`; if (d <= 30) return `לפני ${Math.floor(d / 7)} שבועות`; return `לפני ${Math.floor(d / 30)} חודשים` },
  pct: (v: number) => `${Math.round(v)}%`, num: (v: number) => v.toLocaleString('he-IL'),
}

// ── Investment ──
const ZO = ['AGRICULTURAL', 'MASTER_PLAN_DEPOSIT', 'MASTER_PLAN_APPROVED', 'DETAILED_PLAN_PREP', 'DETAILED_PLAN_DEPOSIT', 'DETAILED_PLAN_APPROVED', 'DEVELOPER_TENDER', 'BUILDING_PERMIT']
export function calcScore(plot: Plot) {
  const r = roi(plot), { zoning, readiness } = p(plot)
  const rs = Math.min(4, r / 50), zi = ZO.indexOf(zoning), zs = zi >= 0 ? (zi / 7) * 3 : 0
  let rs2 = 1.5; if (readiness.includes('1-3')) rs2 = 3; else if (readiness.includes('3-5')) rs2 = 2; else if (readiness.includes('5+')) rs2 = 0.5
  return Math.max(1, Math.min(10, Math.round(rs + zs + rs2)))
}
/** Detailed breakdown of score components for transparency */
export function calcScoreBreakdown(plot: Plot): { total: number; factors: { label: string; score: number; maxScore: number; icon: string; detail: string }[] } {
  const r = roi(plot), { zoning, readiness } = p(plot)
  const rs = Math.min(4, r / 50)
  const zi = ZO.indexOf(zoning), zs = zi >= 0 ? (zi / 7) * 3 : 0
  let rs2 = 1.5; if (readiness.includes('1-3')) rs2 = 3; else if (readiness.includes('3-5')) rs2 = 2; else if (readiness.includes('5+')) rs2 = 0.5
  const total = Math.max(1, Math.min(10, Math.round(rs + zs + rs2)))
  return {
    total,
    factors: [
      {
        label: 'תשואה (ROI)',
        score: Math.round(rs * 10) / 10,
        maxScore: 4,
        icon: '📈',
        detail: r > 0 ? `${Math.round(r)}% תשואה צפויה` : 'ללא נתוני תשואה',
      },
      {
        label: 'שלב תכנוני',
        score: Math.round(zs * 10) / 10,
        maxScore: 3,
        icon: '📋',
        detail: zoningLabels[zoning] || 'לא ידוע',
      },
      {
        label: 'ציר זמן',
        score: Math.round(rs2 * 10) / 10,
        maxScore: 3,
        icon: '⏱️',
        detail: readiness.includes('1-3') ? '1-3 שנים' : readiness.includes('3-5') ? '3-5 שנים' : readiness.includes('5+') ? '5+ שנים' : 'בינוני',
      },
    ],
  }
}

export function getGrade(score: number): InvestmentGrade {
  if (score >= 9) return { grade: 'A+', color: '#10B981', tier: 'exceptional' }
  if (score >= 8) return { grade: 'A', color: '#10B981', tier: 'excellent' }
  if (score >= 7) return { grade: 'A-', color: '#4ADE80', tier: 'very-good' }
  if (score >= 6) return { grade: 'B+', color: '#84CC16', tier: 'good' }
  if (score >= 5) return { grade: 'B', color: '#F59E0B', tier: 'fair' }
  if (score >= 4) return { grade: 'B-', color: '#F97316', tier: 'below-avg' }
  return { grade: 'C', color: '#EF4444', tier: 'weak' }
}
export function calcCAGR(totalRoi: number, readiness: string) {
  if (totalRoi <= 0) return null; let y = 5
  if (readiness.includes('1-3')) y = 2; else if (readiness.includes('3-5')) y = 4; else if (readiness.includes('5+')) y = 7
  return { cagr: Math.round((Math.pow(1 + totalRoi / 100, 1 / y) - 1) * 1000) / 10, years: y }
}
export function calcMonthly(price: number, ltv = 0.5, rate = 0.06, years = 15) {
  if (price <= 0) return null; const loan = Math.round(price * ltv), mr = rate / 12, n = years * 12
  const m = mr > 0 ? Math.round(loan * (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1)) : Math.round(loan / n)
  return { monthly: m, down: price - loan, loan }
}
export function calcTimeline(plot: Plot) {
  const { zoning } = p(plot)
  const stages = [{ key: 'AGRICULTURAL', label: 'חקלאית', m: 0 }, { key: 'MASTER_PLAN_DEPOSIT', label: 'הפקדת מתאר', m: 12 }, { key: 'MASTER_PLAN_APPROVED', label: 'אישור מתאר', m: 8 }, { key: 'DETAILED_PLAN_PREP', label: 'הכנת מפורטת', m: 10 }, { key: 'DETAILED_PLAN_DEPOSIT', label: 'הפקדת מפורטת', m: 6 }, { key: 'DETAILED_PLAN_APPROVED', label: 'מפורטת מאושרת', m: 6 }, { key: 'DEVELOPER_TENDER', label: 'מכרז יזמים', m: 4 }, { key: 'BUILDING_PERMIT', label: 'היתר בנייה', m: 0 }]
  const idx = stages.findIndex(s => s.key === zoning); if (idx < 0) return null
  const elapsed = stages.slice(1, idx + 1).reduce((s, st) => s + st.m, 0), remaining = stages.slice(idx + 1).reduce((s, st) => s + st.m, 0), total = elapsed + remaining
  return { stages, currentIdx: idx, elapsed, remaining, progress: total > 0 ? Math.round((elapsed / total) * 100) : 100 }
}
/** Estimated year the plot reaches building permit stage */
export function estimatedYear(plot: Plot): { year: number; label: string; monthsLeft: number } | null {
  const tl = calcTimeline(plot)
  if (!tl || tl.remaining <= 0) return null
  const now = new Date()
  const estDate = new Date(now.getFullYear(), now.getMonth() + tl.remaining)
  return { year: estDate.getFullYear(), label: `~${estDate.getFullYear()}`, monthsLeft: tl.remaining }
}

export function daysOnMarket(created: string | null | undefined) {
  if (!created) return null; const d = Math.floor((Date.now() - new Date(created).getTime()) / 864e5)
  if (d <= 7) return { days: d, label: 'חדש', color: '#10B981' }; if (d <= 30) return { days: d, label: `${d} ימים`, color: '#84CC16' }
  if (d <= 90) return { days: d, label: `${Math.floor(d / 7)} שבועות`, color: '#F59E0B' }; return { days: d, label: `${Math.floor(d / 30)} חודשים`, color: '#EF4444' }
}

// ── Geolocation Distance ──
/** Haversine distance between two [lat, lng] points in meters */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Distance from user to plot center in meters, or null if no coordinates */
export function plotDistanceFromUser(plot: Plot, userLat: number, userLng: number): number | null {
  const center = plotCenter(plot.coordinates)
  if (!center) return null
  return haversineDistance(userLat, userLng, center.lat, center.lng)
}

/** Format distance for display */
export function fmtDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} מ׳`
  if (meters < 10000) return `${(meters / 1000).toFixed(1)} ק״מ`
  return `${Math.round(meters / 1000)} ק״מ`
}

// ── Sort ──
export type SortKey = 'recommended' | 'price-asc' | 'price-desc' | 'size-asc' | 'size-desc' | 'roi-desc' | 'price-sqm-asc' | 'price-dunam-asc' | 'score-desc' | 'nearest' | 'date-desc'
export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recommended', label: 'מומלץ' },
  { key: 'nearest', label: '📍 קרוב אלי' },
  { key: 'price-asc', label: 'מחיר ↑' },
  { key: 'price-desc', label: 'מחיר ↓' },
  { key: 'price-sqm-asc', label: '₪/מ״ר ↑' },
  { key: 'price-dunam-asc', label: '₪/דונם ↑' },
  { key: 'size-desc', label: 'שטח ↓' },
  { key: 'roi-desc', label: 'תשואה ↓' },
  { key: 'score-desc', label: 'ציון ↓' },
  { key: 'date-desc', label: '✨ חדש ביותר' },
]
/** Composite recommendation score: investment score (40%), ROI (30%), zoning progress (20%), below-avg price bonus (10%) */
function recommendationScore(plot: Plot, avgPps: number): number {
  const score = calcScore(plot) // 1-10
  const r = roi(plot)
  const { zoning } = p(plot)
  const zi = ZO.indexOf(zoning)
  const zoningProgress = zi >= 0 ? zi / (ZO.length - 1) : 0 // 0-1

  // Price-per-sqm bonus: below average = bonus, above = penalty
  const pps = pricePerSqm(plot)
  let priceBonus = 0
  if (pps > 0 && avgPps > 0) {
    const diff = (avgPps - pps) / avgPps // positive = below avg = good
    priceBonus = Math.max(-1, Math.min(1, diff)) // clamp to [-1, 1]
  }

  return (score / 10) * 0.4 + Math.min(1, r / 100) * 0.3 + zoningProgress * 0.2 + ((priceBonus + 1) / 2) * 0.1
}

export function sortPlots(plots: Plot[], key: SortKey, userLocation?: { lat: number; lng: number } | null): Plot[] {
  if (key === 'recommended') {
    // Smart recommendation: composite of score, ROI, zoning progress, and price position
    const ppsList = plots.map(pricePerSqm).filter(v => v > 0)
    const avgPps = ppsList.length ? ppsList.reduce((s, v) => s + v, 0) / ppsList.length : 0
    return [...plots].sort((a, b) => recommendationScore(b, avgPps) - recommendationScore(a, avgPps))
  }
  if (key === 'nearest') {
    if (!userLocation) return [...plots] // can't sort without location
    return [...plots].sort((a, b) => {
      const dA = plotDistanceFromUser(a, userLocation.lat, userLocation.lng) ?? Infinity
      const dB = plotDistanceFromUser(b, userLocation.lat, userLocation.lng) ?? Infinity
      return dA - dB
    })
  }
  const sorted = [...plots]
  switch (key) {
    case 'price-asc': return sorted.sort((a, b) => p(a).price - p(b).price)
    case 'price-desc': return sorted.sort((a, b) => p(b).price - p(a).price)
    case 'price-sqm-asc': return sorted.sort((a, b) => (pricePerSqm(a) || Infinity) - (pricePerSqm(b) || Infinity))
    case 'price-dunam-asc': return sorted.sort((a, b) => (pricePerDunam(a) || Infinity) - (pricePerDunam(b) || Infinity))
    case 'size-asc': return sorted.sort((a, b) => p(a).size - p(b).size)
    case 'size-desc': return sorted.sort((a, b) => p(b).size - p(a).size)
    case 'roi-desc': return sorted.sort((a, b) => roi(b) - roi(a))
    case 'score-desc': return sorted.sort((a, b) => calcScore(b) - calcScore(a))
    case 'date-desc': return sorted.sort((a, b) => {
      const aDate = p(a).created ? new Date(p(a).created).getTime() : 0
      const bDate = p(b).created ? new Date(p(b).created).getTime() : 0
      return bDate - aDate
    })
    default: return sorted
  }
}

// ── Price Position (vs area average) ──
export function pricePosition(plot: Plot, allPlots: Plot[]): { pct: number; label: string; color: string; direction: 'below' | 'above' | 'avg' } | null {
  const pps = pricePerSqm(plot)
  if (pps <= 0) return null
  const allPps = allPlots.map(pricePerSqm).filter(v => v > 0)
  if (allPps.length < 2) return null
  const avg = allPps.reduce((s, v) => s + v, 0) / allPps.length
  const diff = ((pps - avg) / avg) * 100
  if (Math.abs(diff) < 5) return { pct: diff, label: 'בממוצע', color: '#F59E0B', direction: 'avg' }
  if (diff < 0) return { pct: diff, label: `${Math.abs(Math.round(diff))}% מתחת`, color: '#10B981', direction: 'below' }
  return { pct: diff, label: `${Math.round(diff)}% מעל`, color: '#EF4444', direction: 'above' }
}

// ── Aggregate Stats ──
export function calcAggregateStats(plots: Plot[]) {
  if (!plots.length) return null
  const prices = plots.map(pl => p(pl).price).filter(v => v > 0)
  const rois = plots.map(roi).filter(v => v > 0)
  const ppsList = plots.map(pricePerSqm).filter(v => v > 0)
  return {
    count: plots.length,
    avgPrice: prices.length ? Math.round(prices.reduce((s, v) => s + v, 0) / prices.length) : 0,
    avgPps: ppsList.length ? Math.round(ppsList.reduce((s, v) => s + v, 0) / ppsList.length) : 0,
    avgRoi: rois.length ? Math.round(rois.reduce((s, v) => s + v, 0) / rois.length) : 0,
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
  }
}

// ── Best Value per City ──
/** Returns a Set of plot IDs that are the "best value" in their city (highest score with below-avg price) */
export function findBestValueIds(plots: Plot[]): Set<string> {
  const bestIds = new Set<string>()
  if (plots.length < 2) return bestIds
  // Group by city
  const byCity = new Map<string, Plot[]>()
  for (const pl of plots) {
    if (!pl.city) continue
    const arr = byCity.get(pl.city) || []
    arr.push(pl)
    byCity.set(pl.city, arr)
  }
  // For each city with 2+ plots, find the one with best value score
  for (const [, cityPlots] of byCity) {
    if (cityPlots.length < 2) continue
    const ppsList = cityPlots.map(pricePerSqm).filter(v => v > 0)
    const avgPps = ppsList.length ? ppsList.reduce((s, v) => s + v, 0) / ppsList.length : 0
    // Best value = highest investment score among plots with below-avg price/sqm
    let best: Plot | null = null
    let bestScore = -1
    for (const pl of cityPlots) {
      const pps = pricePerSqm(pl)
      if (pps <= 0 || pps >= avgPps) continue // only below-average price
      const score = calcScore(pl)
      if (score > bestScore) { bestScore = score; best = pl }
    }
    if (best) bestIds.add(best.id)
  }
  return bestIds
}

// ── Geo ──
export function plotCenter(coords: [number, number][] | null | undefined) {
  if (!coords?.length) return null
  const v = coords.filter(c => c.length >= 2 && isFinite(c[0]) && isFinite(c[1])); if (!v.length) return null
  return { lat: v.reduce((s, c) => s + c[0], 0) / v.length, lng: v.reduce((s, c) => s + c[1], 0) / v.length }
}

// ── Risk Assessment ──
export type RiskLevel = 'low' | 'medium' | 'high'
export interface RiskAssessment {
  level: RiskLevel
  score: number // 1-10 (1=lowest risk, 10=highest)
  label: string
  color: string
  icon: string
  factors: { name: string; impact: 'positive' | 'negative' | 'neutral'; detail: string }[]
}

export function calcRisk(plot: Plot, allPlots?: Plot[]): RiskAssessment {
  const d = p(plot), r = roi(plot)
  const factors: RiskAssessment['factors'] = []
  let riskScore = 5 // baseline

  // Zoning stage — earlier = higher risk
  const zi = ZO.indexOf(d.zoning)
  if (zi <= 1) {
    riskScore += 2
    factors.push({ name: 'שלב תכנוני מוקדם', impact: 'negative', detail: zoningLabels[d.zoning] || d.zoning })
  } else if (zi >= 5) {
    riskScore -= 2
    factors.push({ name: 'שלב תכנוני מתקדם', impact: 'positive', detail: zoningLabels[d.zoning] || d.zoning })
  } else {
    factors.push({ name: 'שלב תכנוני בינוני', impact: 'neutral', detail: zoningLabels[d.zoning] || d.zoning })
  }

  // ROI — very high ROI often means higher risk
  if (r > 100) {
    riskScore += 1
    factors.push({ name: 'תשואה גבוהה מאוד', impact: 'negative', detail: `${Math.round(r)}% — תשואות חריגות מרמזות על סיכון` })
  } else if (r > 40) {
    factors.push({ name: 'תשואה טובה', impact: 'positive', detail: `${Math.round(r)}%` })
  } else if (r > 0) {
    factors.push({ name: 'תשואה נמוכה', impact: 'neutral', detail: `${Math.round(r)}%` })
  }

  // Readiness
  if (d.readiness.includes('1-3')) {
    riskScore -= 1
    factors.push({ name: 'מוכנות גבוהה', impact: 'positive', detail: '1-3 שנים' })
  } else if (d.readiness.includes('5+') || d.readiness.includes('7+')) {
    riskScore += 1
    factors.push({ name: 'זמן המתנה ארוך', impact: 'negative', detail: d.readiness })
  }

  // Price vs market (if allPlots available)
  if (allPlots && allPlots.length >= 3) {
    const pps = pricePerSqm(plot)
    if (pps > 0) {
      const allPps = allPlots.map(pricePerSqm).filter(v => v > 0)
      const avg = allPps.reduce((s, v) => s + v, 0) / allPps.length
      const diff = ((pps - avg) / avg) * 100
      if (diff < -15) {
        factors.push({ name: 'מחיר מתחת לממוצע', impact: 'positive', detail: `${Math.abs(Math.round(diff))}% מתחת` })
        riskScore -= 1
      } else if (diff > 20) {
        factors.push({ name: 'מחיר מעל הממוצע', impact: 'negative', detail: `${Math.round(diff)}% מעל` })
        riskScore += 1
      }
    }
  }

  // Committees
  if (plot.committees) {
    const approvedCount = Object.values(plot.committees).filter(c => c.status === 'approved').length
    if (approvedCount >= 2) {
      riskScore -= 1
      factors.push({ name: 'אישורי ועדות', impact: 'positive', detail: `${approvedCount} ועדות מאושרות` })
    }
  }

  // Clamp
  riskScore = Math.max(1, Math.min(10, riskScore))

  const level: RiskLevel = riskScore <= 3 ? 'low' : riskScore <= 6 ? 'medium' : 'high'
  const label = level === 'low' ? 'סיכון נמוך' : level === 'medium' ? 'סיכון בינוני' : 'סיכון גבוה'
  const color = level === 'low' ? '#10B981' : level === 'medium' ? '#F59E0B' : '#EF4444'
  const icon = level === 'low' ? '🛡️' : level === 'medium' ? '⚠️' : '🔴'

  return { level, score: riskScore, label, color, icon, factors }
}

// ── Location Quality Score ──
// Madlan-style location quality assessment based on proximity data
export interface LocationScore {
  score: number // 1-10
  label: string
  color: string
  factors: { name: string; icon: string; score: number; maxScore: number; detail: string }[]
  tags: { label: string; icon: string; color: string }[]
}

export function calcLocationScore(plot: Plot): LocationScore {
  const d = p(plot)
  const factors: LocationScore['factors'] = []
  const tags: LocationScore['tags'] = []
  let total = 0, maxTotal = 0

  // 1. Distance to sea (max 2.5 pts) — closer is better
  const seaDist = d.seaDist
  if (seaDist != null && seaDist > 0) {
    const maxPts = 2.5
    maxTotal += maxPts
    let pts = 0
    if (seaDist <= 500) { pts = maxPts; tags.push({ label: 'חוף הים', icon: '🌊', color: '#3B82F6' }) }
    else if (seaDist <= 1500) { pts = maxPts * 0.8; tags.push({ label: 'קרוב לים', icon: '🌊', color: '#60A5FA' }) }
    else if (seaDist <= 3000) pts = maxPts * 0.5
    else if (seaDist <= 5000) pts = maxPts * 0.25
    else pts = maxPts * 0.1
    total += pts
    factors.push({ name: 'קרבה לים', icon: '🌊', score: pts, maxScore: maxPts, detail: `${fmt.num(seaDist)} מ׳` })
  }

  // 2. Distance to park (max 2.5 pts)
  const parkDist = d.parkDist
  if (parkDist != null && parkDist > 0) {
    const maxPts = 2.5
    maxTotal += maxPts
    let pts = 0
    if (parkDist <= 300) { pts = maxPts; tags.push({ label: 'ליד פארק', icon: '🌳', color: '#10B981' }) }
    else if (parkDist <= 800) { pts = maxPts * 0.75; tags.push({ label: 'פארק קרוב', icon: '🌳', color: '#4ADE80' }) }
    else if (parkDist <= 1500) pts = maxPts * 0.5
    else if (parkDist <= 3000) pts = maxPts * 0.25
    else pts = maxPts * 0.1
    total += pts
    factors.push({ name: 'קרבה לפארק', icon: '🌳', score: pts, maxScore: maxPts, detail: `${fmt.num(parkDist)} מ׳` })
  }

  // 3. Distance to hospital (max 2 pts)
  const hospDist = plot.distance_to_hospital ?? plot.distanceToHospital as number | undefined
  if (hospDist != null && hospDist > 0) {
    const maxPts = 2
    maxTotal += maxPts
    let pts = 0
    if (hospDist <= 1000) { pts = maxPts; tags.push({ label: 'ליד בי״ח', icon: '🏥', color: '#EF4444' }) }
    else if (hospDist <= 3000) pts = maxPts * 0.7
    else if (hospDist <= 5000) pts = maxPts * 0.4
    else pts = maxPts * 0.15
    total += pts
    factors.push({ name: 'קרבה לבי״ח', icon: '🏥', score: pts, maxScore: maxPts, detail: `${fmt.num(hospDist)} מ׳` })
  }

  // 4. Density — higher density = more developed area (max 2 pts)
  if (d.density > 0) {
    const maxPts = 2
    maxTotal += maxPts
    let pts = 0
    if (d.density >= 10) { pts = maxPts; tags.push({ label: 'צפיפות גבוהה', icon: '🏙️', color: '#8B5CF6' }) }
    else if (d.density >= 6) pts = maxPts * 0.7
    else if (d.density >= 3) pts = maxPts * 0.4
    else pts = maxPts * 0.15
    total += pts
    factors.push({ name: 'צפיפות פיתוח', icon: '🏙️', score: pts, maxScore: maxPts, detail: `${d.density} יח"ד/דונם` })
  }

  // 5. Train station proximity (max 2 pts)
  const station = nearestTrainStation(plot)
  if (station) {
    const maxPts = 2
    maxTotal += maxPts
    let pts = 0
    if (station.distance <= 1000) { pts = maxPts; tags.push({ label: 'ליד רכבת', icon: '🚂', color: '#8B5CF6' }) }
    else if (station.distance <= 2500) { pts = maxPts * 0.75; tags.push({ label: 'קרוב לרכבת', icon: '🚂', color: '#A78BFA' }) }
    else if (station.distance <= 5000) pts = maxPts * 0.4
    else if (station.distance <= 10000) pts = maxPts * 0.15
    else pts = 0
    total += pts
    factors.push({ name: 'קרבה לרכבת', icon: '🚂', score: pts, maxScore: maxPts, detail: `${station.name} (${fmtDistance(station.distance)})` })
  }

  // 6. Zoning stage bonus (max 1 pt) — advanced zoning = better location infrastructure
  const zi = ZO.indexOf(d.zoning)
  if (zi >= 0) {
    const maxPts = 1
    maxTotal += maxPts
    const pts = (zi / (ZO.length - 1)) * maxPts
    total += pts
    factors.push({ name: 'רמת פיתוח', icon: '📋', score: pts, maxScore: maxPts, detail: zoningLabels[d.zoning] || d.zoning })
  }

  // Normalize to 1-10 scale
  const normalizedScore = maxTotal > 0 ? Math.max(1, Math.min(10, Math.round((total / maxTotal) * 10))) : 5
  const label = normalizedScore >= 9 ? 'מיקום מעולה' : normalizedScore >= 7 ? 'מיקום טוב מאוד'
    : normalizedScore >= 5 ? 'מיקום טוב' : normalizedScore >= 3 ? 'מיקום סביר' : 'מיקום בסיסי'
  const color = normalizedScore >= 8 ? '#10B981' : normalizedScore >= 6 ? '#84CC16'
    : normalizedScore >= 4 ? '#F59E0B' : '#EF4444'

  return { score: normalizedScore, label, color, factors, tags }
}

/** Get just the location proximity tags for a plot (lightweight for list cards) */
export function getLocationTags(plot: Plot): { label: string; icon: string; color: string }[] {
  const d = p(plot)
  const tags: { label: string; icon: string; color: string }[] = []
  const seaDist = d.seaDist
  if (seaDist != null && seaDist > 0 && seaDist <= 2000) {
    tags.push({ label: seaDist <= 500 ? 'חוף הים' : 'קרוב לים', icon: '🌊', color: '#3B82F6' })
  }
  const parkDist = d.parkDist
  if (parkDist != null && parkDist > 0 && parkDist <= 1000) {
    tags.push({ label: parkDist <= 300 ? 'ליד פארק' : 'פארק קרוב', icon: '🌳', color: '#10B981' })
  }
  const hospDist = plot.distance_to_hospital ?? plot.distanceToHospital as number | undefined
  if (hospDist != null && hospDist > 0 && hospDist <= 2000) {
    tags.push({ label: 'ליד בי״ח', icon: '🏥', color: '#EF4444' })
  }
  // Train station proximity tag
  const station = nearestTrainStation(plot)
  if (station && station.distance <= 2000) {
    tags.push({ label: 'ליד רכבת', icon: '🚂', color: '#8B5CF6' })
  }
  return tags
}

// ── OG Meta Helper ──
export function setOgMeta(tags: Record<string, string>) {
  for (const [property, content] of Object.entries(tags)) {
    let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute('property', property)
      document.head.appendChild(el)
    }
    el.setAttribute('content', content)
  }
}

export function removeOgMeta(properties: string[]) {
  for (const property of properties) {
    const el = document.querySelector(`meta[property="${property}"]`)
    if (el) el.remove()
  }
}

// ── CSV Export ──
export function exportPlotsCsv(plots: Plot[], filename = 'landmap-plots.csv') {
  if (!plots.length) return

  const headers = ['עיר', 'גוש', 'חלקה', 'מחיר (₪)', 'שטח (מ״ר)', 'דונם', '₪/מ״ר', '₪/דונם', 'תשואה (%)', 'ציון', 'דירוג', 'שלב תכנוני', 'סטטוס']
  const rows = plots.map(plot => {
    const d = p(plot), r = roi(plot), score = calcScore(plot), grade = getGrade(score)
    const pps = pricePerSqm(plot), ppd = pricePerDunam(plot)
    return [
      plot.city || '',
      d.block,
      plot.number || '',
      d.price,
      d.size,
      fmt.dunam(d.size),
      pps,
      ppd,
      Math.round(r),
      score,
      grade.grade,
      zoningLabels[d.zoning] || d.zoning,
      statusLabels[plot.status || 'AVAILABLE'] || plot.status || '',
    ]
  })

  // BOM for Hebrew UTF-8 support in Excel
  const BOM = '\uFEFF'
  const csvContent = BOM + [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      const str = String(cell)
      // Escape cells containing commas, quotes, or newlines
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    }).join(',')),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// ── Similar Plots ──
/** Find up to `limit` plots similar to the given plot using a weighted similarity score.
 *  Considers: price range (40%), size (25%), city (20%), zoning stage (15%) */
export function findSimilarPlots(plot: Plot, allPlots: Plot[], limit = 3): Plot[] {
  if (allPlots.length <= 1) return []
  const d = p(plot), pps = pricePerSqm(plot)
  const price = d.price, size = d.size, city = plot.city, zoning = d.zoning

  const candidates = allPlots
    .filter(pl => pl.id !== plot.id)
    .map(pl => {
      const pd = p(pl), plPps = pricePerSqm(pl)
      let score = 0

      // Price similarity (40%) — inverse of relative price difference
      if (price > 0 && pd.price > 0) {
        const priceDiff = Math.abs(pd.price - price) / Math.max(price, pd.price)
        score += (1 - Math.min(1, priceDiff)) * 40
      }

      // Size similarity (25%)
      if (size > 0 && pd.size > 0) {
        const sizeDiff = Math.abs(pd.size - size) / Math.max(size, pd.size)
        score += (1 - Math.min(1, sizeDiff)) * 25
      }

      // Same city bonus (20%)
      if (pl.city === city) score += 20

      // Zoning stage proximity (15%)
      const zi1 = ZO.indexOf(zoning), zi2 = ZO.indexOf(pd.zoning)
      if (zi1 >= 0 && zi2 >= 0) {
        const stageDiff = Math.abs(zi1 - zi2) / (ZO.length - 1)
        score += (1 - stageDiff) * 15
      }

      return { plot: pl, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return candidates.map(c => c.plot)
}

// ── Percentile Rank ──
/** Calculate what percentile a plot falls in by investment score (e.g. "Top 10%") */
export function calcPercentileRank(plot: Plot, allPlots: Plot[]): { rank: number; label: string; color: string; icon: string } | null {
  if (allPlots.length < 3) return null
  const score = calcScore(plot)
  const betterCount = allPlots.filter(pl => calcScore(pl) > score).length
  const rank = Math.round((betterCount / allPlots.length) * 100)
  if (rank <= 5) return { rank, label: 'Top 5%', color: '#10B981', icon: '🏆' }
  if (rank <= 10) return { rank, label: 'Top 10%', color: '#10B981', icon: '🥇' }
  if (rank <= 25) return { rank, label: 'Top 25%', color: '#84CC16', icon: '⭐' }
  if (rank <= 50) return { rank, label: 'Top 50%', color: '#F59E0B', icon: '📊' }
  return null // Don't show for bottom half
}

// ── Generate Investment Report (clipboard-friendly) ──
/** Generates a formatted plain-text investment report for a plot — for sharing with partners */
export function generatePlotReport(plot: Plot, allPlots?: Plot[]): string {
  const d = p(plot), r = roi(plot), score = calcScore(plot), grade = getGrade(score)
  const pps = pricePerSqm(plot), ppd = pricePerDunam(plot)
  const cagr = calcCAGR(r, d.readiness)
  const risk = calcRisk(plot, allPlots)
  const locTags = getLocationTags(plot)
  const estYr = estimatedYear(plot)
  const pos = allPlots ? pricePosition(plot, allPlots) : null

  const lines: string[] = []
  lines.push('━━━ דוח השקעה — LandMap Israel ━━━')
  lines.push('')
  lines.push(`📍 ${plot.city} — גוש ${d.block} · חלקה ${plot.number}`)
  lines.push(`🏷️ סטטוס: ${statusLabels[plot.status || 'AVAILABLE'] || plot.status || 'לא ידוע'}`)
  lines.push(`📊 ציון השקעה: ${score}/10 (${grade.grade})`)
  lines.push('')
  lines.push('── מחירים ──')
  lines.push(`💰 מחיר: ${fmt.price(d.price)}`)
  if (d.projected > 0) lines.push(`📈 שווי חזוי: ${fmt.price(d.projected)}`)
  if (r > 0) lines.push(`🔄 תשואה (ROI): +${Math.round(r)}%`)
  if (cagr) lines.push(`📊 CAGR: ${cagr.cagr}% (${cagr.years} שנים)`)
  if (pps > 0) lines.push(`₪/מ״ר: ${fmt.num(pps)}`)
  if (ppd > 0) lines.push(`₪/דונם: ${fmt.num(ppd)}`)
  if (pos) lines.push(`📉 מיקום מחיר: ${pos.label} לממוצע`)
  lines.push('')
  lines.push('── חלקה ──')
  lines.push(`📐 שטח: ${fmt.num(d.size)} מ״ר (${fmt.dunam(d.size)} דונם)`)
  lines.push(`📋 שלב תכנוני: ${zoningLabels[d.zoning] || d.zoning}`)
  if (d.readiness) lines.push(`⏱️ מוכנות: ${d.readiness}`)
  if (estYr) lines.push(`🏗️ השלמה משוערת: ${estYr.label} (~${estYr.monthsLeft} חודשים)`)
  if (d.density > 0) lines.push(`🏙️ צפיפות: ${d.density} יח"ד/דונם`)
  lines.push('')
  lines.push('── סיכון ──')
  lines.push(`${risk.icon} ${risk.label} (${risk.score}/10)`)
  if (locTags.length > 0) {
    lines.push('')
    lines.push('── מיקום ──')
    locTags.forEach(tag => lines.push(`${tag.icon} ${tag.label}`))
    if (d.seaDist != null) lines.push(`🌊 מרחק מהים: ${fmt.num(d.seaDist)} מ׳`)
    if (d.parkDist != null) lines.push(`🌳 מרחק מפארק: ${fmt.num(d.parkDist)} מ׳`)
  }
  // Infrastructure proximity
  const station = nearestTrainStation(plot)
  if (station) lines.push(`🚂 תחנת רכבת: ${station.name} (${fmtDistance(station.distance)})`)
  const hw = nearestHighway(plot)
  if (hw) lines.push(`🛣️ כביש ראשי: ${hw.name} (${fmtDistance(hw.distance)})`)
  // Quick mortgage estimate
  const mortgage = calcMonthly(d.price, 0.5, 0.06, 15)
  if (mortgage) {
    lines.push('')
    lines.push('── מימון (הערכה) ──')
    lines.push(`💳 החזר חודשי: ${fmt.price(mortgage.monthly)} (50% מימון, 6%, 15 שנים)`)
    lines.push(`🏦 הון עצמי: ${fmt.price(mortgage.down)}`)
  }
  // Betterment tax estimate
  const betterment = calcBettermentTax(plot)
  if (betterment) {
    lines.push('')
    lines.push('── היטל השבחה (הערכה) ──')
    lines.push(`⚠️ היטל משוער: ${fmt.price(betterment.estimatedTax)} (${betterment.taxRate}% מעליית ערך ${fmt.compact(betterment.valueIncrease)})`)
    lines.push(`📋 ${betterment.label}`)
  }
  lines.push('')
  lines.push(`🔗 ${typeof window !== 'undefined' ? window.location.origin : ''}/plot/${plot.id}`)
  lines.push(`📅 ${new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })}`)
  lines.push('')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  return lines.join('\n')
}

// ── Satellite Tile URL ──
/** Generate a static satellite tile URL centered on a lat/lng using ESRI World Imagery */
export function satelliteTileUrl(lat: number, lng: number, zoom: number = 16): string {
  const n = Math.pow(2, zoom)
  const x = Math.floor(((lng + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n)
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`
}

// ── Alternative Investment Comparison ──
export type AltInvestment = { name: string; emoji: string; annualReturn: number; futureValue: number; totalReturn: number; color: string }
/** Compare a plot's expected return against standard financial instruments */
export function calcAlternativeInvestments(plot: Plot): AltInvestment[] | null {
  const d = p(plot), tl = calcTimeline(plot)
  if (d.price <= 0 || d.projected <= d.price) return null
  const years = tl.remaining > 0 ? Math.max(1, Math.round(tl.remaining / 12)) : 5
  const plotReturn = ((d.projected - d.price) / d.price) * 100
  const plotCAGR = (Math.pow(d.projected / d.price, 1 / years) - 1) * 100
  const fv = (rate: number) => d.price * Math.pow(1 + rate / 100, years)
  return [
    { name: 'חלקה זו', emoji: '🏗️', annualReturn: Math.round(plotCAGR * 10) / 10, futureValue: Math.round(d.projected), totalReturn: Math.round(plotReturn), color: '#10B981' },
    { name: 'פיקדון בנקאי', emoji: '🏦', annualReturn: 3.5, futureValue: Math.round(fv(3.5)), totalReturn: Math.round(((fv(3.5) - d.price) / d.price) * 100), color: '#94A3B8' },
    { name: 'אג״ח ממשלתי', emoji: '📜', annualReturn: 5.0, futureValue: Math.round(fv(5.0)), totalReturn: Math.round(((fv(5.0) - d.price) / d.price) * 100), color: '#64748B' },
    { name: 'מדד S&P 500', emoji: '📈', annualReturn: 10.0, futureValue: Math.round(fv(10.0)), totalReturn: Math.round(((fv(10.0) - d.price) / d.price) * 100), color: '#3B82F6' },
  ]
}

// ── Market Temperature ──
export function calcMarketTemperature(plots: Plot[]): { label: string; emoji: string; color: string; score: number } {
  if (!plots.length) return { label: 'אין נתונים', emoji: '❓', color: '#64748B', score: 0 }
  const rois = plots.map(roi).filter(v => v > 0)
  const avgRoi = rois.length ? rois.reduce((s, v) => s + v, 0) / rois.length : 0
  const scores = plots.map(calcScore)
  const avgScore = scores.reduce((s, v) => s + v, 0) / scores.length
  const hotDeals = plots.filter(pl => calcScore(pl) >= 8).length
  const hotRatio = hotDeals / plots.length
  // Weighted temperature: ROI weight 40%, score weight 40%, hot ratio 20%
  const temp = (avgRoi / 300) * 40 + (avgScore / 10) * 40 + hotRatio * 20
  if (temp >= 60) return { label: 'שוק חם', emoji: '🔥', color: '#EF4444', score: Math.min(100, Math.round(temp)) }
  if (temp >= 40) return { label: 'שוק פעיל', emoji: '📈', color: '#F59E0B', score: Math.round(temp) }
  if (temp >= 20) return { label: 'שוק יציב', emoji: '📊', color: '#3B82F6', score: Math.round(temp) }
  return { label: 'שוק קר', emoji: '❄️', color: '#94A3B8', score: Math.round(temp) }
}

// ── Investment Recommendation ──
/** Generate a short Hebrew investment recommendation based on plot metrics */
export function investmentRecommendation(plot: Plot): { text: string; emoji: string; color: string } {
  const score = calcScore(plot), r = roi(plot), d = p(plot)
  const pps = pricePerSqm(plot)
  if (score >= 9) return { text: 'מומלץ בחום', emoji: '🔥', color: '#10B981' }
  if (score >= 8 && r >= 100) return { text: 'פוטנציאל גבוה', emoji: '🚀', color: '#10B981' }
  if (score >= 7) return { text: 'השקעה מומלצת', emoji: '👍', color: '#4ADE80' }
  if (score >= 6) return { text: 'שווה בדיקה', emoji: '🔍', color: '#84CC16' }
  if (score >= 5) return { text: 'סיכון בינוני', emoji: '⚖️', color: '#F59E0B' }
  if (score >= 4) return { text: 'דורש ניתוח', emoji: '📊', color: '#F97316' }
  return { text: 'סיכון גבוה', emoji: '⚠️', color: '#EF4444' }
}

// ── Exit Strategy Scenarios ──
export interface ExitScenario {
  stage: string
  stageLabel: string
  stageIcon: string
  monthsFromNow: number
  yearsLabel: string
  estimatedValue: number
  profit: number
  roi: number
  annualized: number
  color: string
}

/**
 * Calculate projected returns at each future zoning stage.
 * Models realistic value multipliers based on Israeli land market data:
 * - AGRICULTURAL → MASTER_PLAN_DEPOSIT: ~1.5-2x
 * - Each subsequent stage adds 15-30%
 * - BUILDING_PERMIT stage: ~3-5x original agricultural value
 */
export function calcExitScenarios(plot: Plot): ExitScenario[] | null {
  const d = p(plot)
  if (d.price <= 0) return null
  const currentIdx = ZO.indexOf(d.zoning)
  if (currentIdx < 0 || currentIdx >= ZO.length - 1) return null

  // Value multipliers relative to AGRICULTURAL baseline
  // These are based on market research of Israeli land deals
  const stageMultipliers: Record<string, number> = {
    'AGRICULTURAL': 1.0,
    'MASTER_PLAN_DEPOSIT': 1.6,
    'MASTER_PLAN_APPROVED': 2.2,
    'DETAILED_PLAN_PREP': 2.8,
    'DETAILED_PLAN_DEPOSIT': 3.5,
    'DETAILED_PLAN_APPROVED': 4.5,
    'DEVELOPER_TENDER': 5.5,
    'BUILDING_PERMIT': 7.0,
  }

  // Months between each stage (realistic Israeli planning timelines)
  const stageDurations: Record<string, number> = {
    'AGRICULTURAL': 0,
    'MASTER_PLAN_DEPOSIT': 18,
    'MASTER_PLAN_APPROVED': 12,
    'DETAILED_PLAN_PREP': 14,
    'DETAILED_PLAN_DEPOSIT': 8,
    'DETAILED_PLAN_APPROVED': 8,
    'DEVELOPER_TENDER': 6,
    'BUILDING_PERMIT': 4,
  }

  const currentMultiplier = stageMultipliers[d.zoning] || 1.0
  // Implied base value (what the land would be worth at agricultural stage)
  const baseValue = d.price / currentMultiplier

  const scenarios: ExitScenario[] = []
  let cumulativeMonths = 0

  for (let i = currentIdx + 1; i < ZO.length; i++) {
    const stage = ZO[i]
    cumulativeMonths += stageDurations[stage] || 10
    const multiplier = stageMultipliers[stage] || 1.0
    const estimatedValue = Math.round(baseValue * multiplier)
    const profit = estimatedValue - d.price
    const roiPct = (profit / d.price) * 100
    const years = cumulativeMonths / 12
    const annualized = years > 0 ? (Math.pow(1 + roiPct / 100, 1 / years) - 1) * 100 : 0

    const stageInfo = zoningPipeline.find(s => s.key === stage)
    scenarios.push({
      stage,
      stageLabel: stageInfo?.label || zoningLabels[stage] || stage,
      stageIcon: stageInfo?.icon || '📋',
      monthsFromNow: cumulativeMonths,
      yearsLabel: years < 1 ? `${cumulativeMonths} חודשים` : years % 1 === 0 ? `${years} שנים` : `${years.toFixed(1)} שנים`,
      estimatedValue,
      profit,
      roi: Math.round(roiPct),
      annualized: Math.round(annualized * 10) / 10,
      color: roiPct >= 100 ? '#10B981' : roiPct >= 50 ? '#4ADE80' : roiPct >= 20 ? '#84CC16' : '#F59E0B',
    })
  }

  return scenarios.length > 0 ? scenarios : null
}

// ── Israel Rail Stations (coordinates from Israel Railways) ──
export const ISRAEL_RAIL_STATIONS: { name: string; lat: number; lng: number }[] = [
  { name: 'חיפה מרכזית', lat: 32.7925, lng: 34.9891 },
  { name: 'חיפה חוף הכרמל', lat: 32.7995, lng: 34.9628 },
  { name: 'בנימינה', lat: 32.5179, lng: 34.9496 },
  { name: 'קיסריה-פרדס חנה', lat: 32.4751, lng: 34.9462 },
  { name: 'חדרה מערב', lat: 32.4488, lng: 34.9003 },
  { name: 'נתניה', lat: 32.3234, lng: 34.8567 },
  { name: 'הרצליה', lat: 32.1621, lng: 34.7975 },
  { name: 'תל אביב מרכז', lat: 32.0741, lng: 34.7862 },
  { name: 'תל אביב השלום', lat: 32.0686, lng: 34.7867 },
  { name: 'כפר סבא-נורדאו', lat: 32.1784, lng: 34.9005 },
  { name: 'ראש העין צפון', lat: 32.0973, lng: 34.9554 },
  { name: 'רעננה מערב', lat: 32.1871, lng: 34.8385 },
  { name: 'רעננה דרום', lat: 32.1705, lng: 34.8541 },
  { name: 'הוד השרון-סוקולוב', lat: 32.1539, lng: 34.8759 },
  { name: 'ירושלים יצחק נבון', lat: 31.7879, lng: 35.2026 },
  { name: 'באר שבע מרכזית', lat: 31.2429, lng: 34.7951 },
  { name: 'אשדוד', lat: 31.8044, lng: 34.6535 },
  { name: 'אשקלון', lat: 31.6659, lng: 34.5682 },
  { name: 'רחובות', lat: 31.8987, lng: 34.8095 },
  { name: 'לוד', lat: 31.9523, lng: 34.8756 },
  { name: 'ראשון לציון', lat: 31.9693, lng: 34.7748 },
  { name: 'פתח תקווה', lat: 32.0924, lng: 34.8837 },
  { name: 'עכו', lat: 32.9285, lng: 35.0777 },
  { name: 'נהריה', lat: 33.0072, lng: 35.0956 },
]

/** Find the nearest Israel Rail station to a plot */
export function nearestTrainStation(plot: Plot): { name: string; distance: number } | null {
  const center = plotCenter(plot.coordinates)
  if (!center) return null
  let best: { name: string; distance: number } | null = null
  for (const station of ISRAEL_RAIL_STATIONS) {
    const dist = haversineDistance(center.lat, center.lng, station.lat, station.lng)
    if (!best || dist < best.distance) {
      best = { name: station.name, distance: Math.round(dist) }
    }
  }
  return best
}

// ── Major Highway Interchanges (Israel) ──
export const MAJOR_HIGHWAYS: { name: string; lat: number; lng: number }[] = [
  { name: 'מחלף נתניה (כביש 2)', lat: 32.3268, lng: 34.8654 },
  { name: 'מחלף חדרה (כביש 2/65)', lat: 32.4362, lng: 34.9203 },
  { name: 'מחלף הרצליה (כביש 2)', lat: 32.1600, lng: 34.7998 },
  { name: 'מחלף קיסריה (כביש 2)', lat: 32.4943, lng: 34.9126 },
  { name: 'מחלף כפר סבא (כביש 6/531)', lat: 32.1862, lng: 34.9251 },
  { name: 'גלילות (כביש 5/2)', lat: 32.1321, lng: 34.8059 },
  { name: 'מחלף בר אילן (כביש 4)', lat: 32.0880, lng: 34.8510 },
  { name: 'מחלף אייר-פורט סיטי (כביש 1/6)', lat: 31.9753, lng: 34.8908 },
  { name: 'מחלף נחשונים (כביש 6)', lat: 32.0490, lng: 34.9507 },
]

/** Find the nearest major highway interchange to a plot */
export function nearestHighway(plot: Plot): { name: string; distance: number } | null {
  const center = plotCenter(plot.coordinates)
  if (!center) return null
  let best: { name: string; distance: number } | null = null
  for (const hw of MAJOR_HIGHWAYS) {
    const dist = haversineDistance(center.lat, center.lng, hw.lat, hw.lng)
    if (!best || dist < best.distance) {
      best = { name: hw.name, distance: Math.round(dist) }
    }
  }
  return best
}

// ── Betterment Tax (היטל השבחה) Estimation ──
/** Estimate the betterment tax (היטל השבחה) for a plot based on value increase from zoning change.
 *  In Israel, municipalities levy ~50% of the value increase resulting from planning approvals.
 *  This is due on sale or permit, not on purchase, but investors must account for it.
 */
export function calcBettermentTax(plot: Plot): {
  estimatedTax: number; taxRate: number; valueIncrease: number;
  currentStageValue: number; finalStageValue: number; label: string;
} | null {
  const d = p(plot)
  if (d.price <= 0 || d.projected <= d.price) return null

  // The betterment tax is assessed on the value increase attributable to planning changes
  // Standard rate: 50% of the appreciation (חוק התכנון והבנייה §196א)
  const TAX_RATE = 0.50
  const valueIncrease = d.projected - d.price
  const estimatedTax = Math.round(valueIncrease * TAX_RATE)

  // Label based on when tax is typically triggered
  const zi = ZO.indexOf(d.zoning)
  let label = 'בעת מימוש (מכירה/היתר)'
  if (zi <= 2) label = 'בעת אישור תוכנית ומימוש'
  else if (zi >= 5) label = 'בעת קבלת היתר/מכירה'

  return {
    estimatedTax,
    taxRate: TAX_RATE * 100,
    valueIncrease,
    currentStageValue: d.price,
    finalStageValue: d.projected,
    label,
  }
}

// ── Normalize ──
export function normalizePlot(plot: Plot): Plot {
  return { ...plot, total_price: plot.totalPrice ?? plot.total_price, projected_value: plot.projectedValue ?? plot.projected_value,
    size_sqm: plot.sizeSqM ?? plot.size_sqm, block_number: plot.blockNumber ?? plot.block_number,
    zoning_stage: plot.zoningStage ?? plot.zoning_stage, created_at: plot.created_at ?? plot.createdAt }
}
