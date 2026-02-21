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
export type SortKey = 'recommended' | 'price-asc' | 'price-desc' | 'size-asc' | 'size-desc' | 'roi-desc' | 'price-sqm-asc' | 'price-dunam-asc' | 'score-desc' | 'nearest'
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

  // 5. Zoning stage bonus (max 1 pt) — advanced zoning = better location infrastructure
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

// ── Normalize ──
export function normalizePlot(plot: Plot): Plot {
  return { ...plot, total_price: plot.totalPrice ?? plot.total_price, projected_value: plot.projectedValue ?? plot.projected_value,
    size_sqm: plot.sizeSqM ?? plot.size_sqm, block_number: plot.blockNumber ?? plot.block_number,
    zoning_stage: plot.zoningStage ?? plot.zoning_stage, created_at: plot.created_at ?? plot.createdAt }
}
