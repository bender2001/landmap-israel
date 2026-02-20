import type { Plot, InvestmentGrade } from './types'

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
export function daysOnMarket(created: string | null | undefined) {
  if (!created) return null; const d = Math.floor((Date.now() - new Date(created).getTime()) / 864e5)
  if (d <= 7) return { days: d, label: 'חדש', color: '#10B981' }; if (d <= 30) return { days: d, label: `${d} ימים`, color: '#84CC16' }
  if (d <= 90) return { days: d, label: `${Math.floor(d / 7)} שבועות`, color: '#F59E0B' }; return { days: d, label: `${Math.floor(d / 30)} חודשים`, color: '#EF4444' }
}

// ── Geo ──
export function plotCenter(coords: [number, number][] | null | undefined) {
  if (!coords?.length) return null
  const v = coords.filter(c => c.length >= 2 && isFinite(c[0]) && isFinite(c[1])); if (!v.length) return null
  return { lat: v.reduce((s, c) => s + c[0], 0) / v.length, lng: v.reduce((s, c) => s + c[1], 0) / v.length }
}

// ── Normalize ──
export function normalizePlot(plot: Plot): Plot {
  return { ...plot, total_price: plot.totalPrice ?? plot.total_price, projected_value: plot.projectedValue ?? plot.projected_value,
    size_sqm: plot.sizeSqM ?? plot.size_sqm, block_number: plot.blockNumber ?? plot.block_number,
    zoning_stage: plot.zoningStage ?? plot.zoning_stage, created_at: plot.created_at ?? plot.createdAt }
}
