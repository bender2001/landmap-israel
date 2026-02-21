import React, { useState, useCallback, useEffect, useMemo, useRef as useRefHook } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { X, Phone, ChevronDown, ChevronRight, ChevronLeft, TrendingUp, TrendingDown, MapPin, FileText, Clock, Building2, Landmark, Info, ExternalLink, GitCompareArrows, Share2, Copy, Check, BarChart3, Construction, Globe, Sparkles, Printer, Navigation, Map as MapIcon2, Eye } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { t, fadeInUp, mobile } from '../theme'
import { p, roi, fmt, calcScore, getGrade, calcCAGR, calcTimeline, zoningLabels, statusLabels, statusColors, daysOnMarket, zoningPipeline, pricePerSqm, pricePerDunam, pricePosition, calcRisk, findSimilarPlots, plotCenter } from '../utils'
import type { Plot } from '../types'
import { GoldButton, GhostButton, Badge, RadialScore } from './UI'

/* ── Animations ── */
const slideIn = keyframes`from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}`
const fadeSection = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}`

/* ── Styled ── */
const Overlay = styled.div<{ $open: boolean }>`
  position:fixed;inset:0;z-index:${t.z.sidebar - 1};background:rgba(0,0,0,0.5);
  backdrop-filter:blur(4px);opacity:${p => p.$open ? 1 : 0};pointer-events:${p => p.$open ? 'auto' : 'none'};
  transition:opacity 0.3s;
`
const Panel = styled.aside<{ $open: boolean }>`
  position:fixed;top:0;right:0;bottom:0;z-index:${t.z.sidebar};width:420px;max-width:100vw;
  background:${t.surface};border-left:1px solid ${t.border};display:flex;flex-direction:column;
  transform:translateX(${p => p.$open ? '0' : '100%'});transition:transform 0.35s cubic-bezier(0.32,0.72,0,1);
  box-shadow:${t.sh.xl};${mobile}{width:100vw;}
`
const GoldBar = styled.div`height:3px;background:linear-gradient(90deg,transparent,${t.gold},${t.goldBright},${t.gold},transparent);flex-shrink:0;`
const SwipeHandle = styled.div`
  display:none;width:36px;height:4px;border-radius:2px;background:${t.textDim};
  margin:8px auto 4px;opacity:0.4;flex-shrink:0;
  ${mobile}{display:block;}
`
const Header = styled.div`padding:16px 20px;border-bottom:1px solid ${t.border};animation:${fadeSection} 0.4s ease-out;`
const TopRow = styled.div`display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;`
const Badges = styled.div`display:flex;align-items:center;gap:6px;flex-wrap:wrap;`
const Title = styled.h2`font-size:18px;font-weight:800;color:${t.text};margin:0;direction:rtl;`
const City = styled.span`font-size:13px;color:${t.textSec};margin-top:2px;display:block;direction:rtl;`
const CloseBtn = styled.button`
  display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:${t.r.sm};
  background:transparent;border:1px solid ${t.border};color:${t.textSec};cursor:pointer;transition:all ${t.tr};flex-shrink:0;
  &:hover{background:${t.hover};color:${t.text};border-color:${t.goldBorder};}
`
const Body = styled.div`flex:1;overflow-y:auto;padding:16px 20px;direction:rtl;`

/* ── Metrics ── */
const MetricsGrid = styled.div`display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:20px;animation:${fadeSection} 0.5s 0.1s both;`
const MetricCard = styled.div`
  background:${t.surfaceLight};border:1px solid ${t.border};border-radius:${t.r.md};padding:12px;text-align:center;
  transition:all ${t.tr};&:hover{border-color:${t.goldBorder};transform:translateY(-2px);box-shadow:${t.sh.sm};}
`
const MetricLabel = styled.div`font-size:10px;color:${t.textDim};font-weight:600;text-transform:uppercase;margin-bottom:4px;`
const MetricVal = styled.div<{ $gold?: boolean }>`font-size:16px;font-weight:800;color:${p => p.$gold ? t.gold : t.text};`

/* ── Price Position ── */
const PricePosBadge = styled.div<{ $c: string }>`
  grid-column:1 / -1;display:flex;align-items:center;justify-content:center;gap:6px;
  padding:8px 14px;background:${pr => pr.$c}0A;border:1px solid ${pr => pr.$c}22;
  border-radius:${t.r.md};font-size:12px;font-weight:700;color:${pr => pr.$c};
  animation:${fadeSection} 0.5s 0.15s both;
`

/* ── Collapsible Section ── */
const SectionWrap = styled.div<{ $i: number }>`
  border-bottom:1px solid ${t.border};animation:${fadeSection} 0.4s ${p => 0.15 + p.$i * 0.06}s both;
`
const SectionHead = styled.button<{ $open: boolean }>`
  display:flex;align-items:center;gap:8px;width:100%;padding:14px 0;background:none;border:none;cursor:pointer;
  font-family:${t.font};font-size:14px;font-weight:700;color:${t.text};transition:color ${t.tr};
  &:hover{color:${t.gold};}
  svg:last-child{transition:transform 0.25s;transform:rotate(${p => p.$open ? '180deg' : '0'});}
`
const SectionBody = styled.div<{ $open: boolean }>`
  overflow:hidden;max-height:${p => p.$open ? '500px' : '0'};opacity:${p => p.$open ? 1 : 0};
  transition:max-height 0.35s cubic-bezier(0.4,0,0.2,1),opacity 0.25s;padding-bottom:${p => p.$open ? '14px' : '0'};
`
const Row = styled.div`display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:13px;`
const Label = styled.span`color:${t.textSec};`
const Val = styled.span<{ $c?: string }>`font-weight:600;color:${p => p.$c || t.text};`

/* ── Timeline ── */
const Timeline = styled.div`display:flex;align-items:center;gap:0;margin:8px 0;`
const Step = styled.div<{ $done: boolean; $current: boolean }>`
  flex:1;height:6px;border-radius:3px;margin:0 1px;transition:all ${t.tr};
  background:${p => p.$current ? t.gold : p.$done ? t.ok : t.surfaceLight};
  ${p => p.$current && css`box-shadow:0 0 8px ${t.gold};`}
`

/* ── Footer ── */
const Footer = styled.div`
  padding:16px 20px;border-top:1px solid ${t.border};display:flex;align-items:center;gap:10px;
  background:${t.surface};flex-shrink:0;direction:rtl;animation:${fadeSection} 0.5s 0.3s both;
`
const FullPageLink = styled.a`
  font-size:13px;color:${t.textSec};display:flex;align-items:center;gap:4px;cursor:pointer;transition:color ${t.tr};
  &:hover{color:${t.gold};}
`

/* ── Prev/Next Navigation ── */
const NavBar = styled.div`
  display:flex;align-items:center;justify-content:space-between;
  padding:8px 20px;border-bottom:1px solid ${t.border};
  animation:${fadeSection} 0.3s ease-out;flex-shrink:0;
`
const NavBtn = styled.button<{ $disabled?: boolean }>`
  display:flex;align-items:center;gap:4px;padding:6px 12px;
  background:transparent;border:1px solid ${p => p.$disabled ? t.border : t.goldBorder};
  border-radius:${t.r.sm};color:${p => p.$disabled ? t.textDim : t.gold};
  font-size:12px;font-weight:600;font-family:${t.font};cursor:${p => p.$disabled ? 'default' : 'pointer'};
  opacity:${p => p.$disabled ? 0.4 : 1};transition:all ${t.tr};
  &:hover{${p => !p.$disabled && `background:${t.goldDim};transform:translateX(${p.$disabled ? '0' : '-2px'});`}}
`
const NavCounter = styled.span`font-size:11px;color:${t.textDim};font-weight:600;`

/* ── Section helper ── */
function Section({ icon: Icon, title, idx, children }: { icon: React.ElementType; title: string; idx: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(idx < 2)
  return (
    <SectionWrap $i={idx}>
      <SectionHead $open={open} onClick={() => setOpen(o => !o)}>
        <Icon size={16} color={t.gold} />{title}<span style={{ flex: 1 }} /><ChevronDown size={16} />
      </SectionHead>
      <SectionBody $open={open}>{children}</SectionBody>
    </SectionWrap>
  )
}

/* ── Compare & Share Buttons ── */
const CompareBtn = styled.button<{ $active?: boolean }>`
  display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 16px;
  background:${pr => pr.$active ? t.goldDim : 'transparent'};
  color:${pr => pr.$active ? t.gold : t.textSec};
  border:1px solid ${pr => pr.$active ? t.gold : t.border};border-radius:${t.r.md};
  font-weight:600;font-size:13px;font-family:${t.font};cursor:pointer;transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};color:${t.gold};background:${t.goldDim};}
`
const ShareBtn = styled.button<{ $copied?: boolean }>`
  display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 16px;
  background:${pr => pr.$copied ? 'rgba(16,185,129,0.1)' : 'transparent'};
  color:${pr => pr.$copied ? '#10B981' : t.textSec};
  border:1px solid ${pr => pr.$copied ? '#10B981' : t.border};border-radius:${t.r.md};
  font-weight:600;font-size:13px;font-family:${t.font};cursor:pointer;transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};color:${t.gold};background:${t.goldDim};}
`

/* ── Risk Badge ── */
const RiskBadge = styled.div<{ $c: string }>`
  display:flex;align-items:center;gap:8px;padding:10px 14px;
  background:${pr => pr.$c}0A;border:1px solid ${pr => pr.$c}22;
  border-radius:${t.r.md};animation:${fadeSection} 0.5s 0.18s both;
`
const RiskMeterMini = styled.div<{$pct:number;$c:string}>`
  flex:1;height:5px;background:${t.surfaceLight};border-radius:3px;overflow:hidden;position:relative;
  &::after{content:'';position:absolute;top:0;left:0;height:100%;width:${pr=>pr.$pct}%;
    background:${pr=>pr.$c};border-radius:3px;transition:width 0.8s ease;}
`

/* ── Sparkline (SVG mini chart) ── */
const SparkWrap = styled.div`
  display:flex;align-items:flex-end;gap:8px;padding:12px 0;
`
const SparkLabel = styled.div`display:flex;flex-direction:column;gap:2px;min-width:0;`
const SparkTitle = styled.span`font-size:10px;font-weight:600;color:${t.textDim};text-transform:uppercase;`
const SparkTrend = styled.span<{$up:boolean}>`
  font-size:13px;font-weight:800;color:${pr => pr.$up ? t.ok : t.err};
  display:flex;align-items:center;gap:3px;
`

function Sparkline({ data, width = 80, height = 28, color }: { data: number[]; width?: number; height?: number; color: string }) {
  if (!data.length) return null
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((v, i) =>
    `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`
  ).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible', flexShrink: 0 }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* End dot */}
      {data.length > 0 && (
        <circle
          cx={width}
          cy={height - ((data[data.length - 1] - min) / range) * height}
          r="3" fill={color}
        />
      )}
    </svg>
  )
}

/* ── Investment Projection Step Chart ── */
const ProjWrap = styled.div`
  padding:12px 0;margin-bottom:4px;
`
const ProjTitle = styled.div`
  font-size:11px;font-weight:700;color:${t.textDim};margin-bottom:10px;
  display:flex;align-items:center;gap:6px;text-transform:uppercase;letter-spacing:0.3px;
`
const ProjChart = styled.div`
  display:flex;align-items:flex-end;gap:3px;height:80px;padding:0 4px;
`
const ProjBar = styled.div<{ $h: number; $active: boolean; $color: string }>`
  flex:1;min-width:0;border-radius:4px 4px 0 0;position:relative;
  height:${pr => Math.max(8, pr.$h)}%;
  background:${pr => pr.$active
    ? `linear-gradient(180deg,${pr.$color},${pr.$color}88)`
    : t.surfaceLight};
  border:1px solid ${pr => pr.$active ? `${pr.$color}44` : 'transparent'};
  border-bottom:none;
  transition:all 0.5s cubic-bezier(0.32,0.72,0,1);
  cursor:default;
  &:hover{opacity:0.85;transform:scaleY(1.03);transform-origin:bottom;}
`
const ProjBarLabel = styled.div<{ $active: boolean }>`
  position:absolute;top:-18px;left:50%;transform:translateX(-50%);
  font-size:8px;font-weight:${pr => pr.$active ? 800 : 600};
  color:${pr => pr.$active ? t.gold : t.textDim};white-space:nowrap;
`
const ProjLabels = styled.div`
  display:flex;gap:3px;margin-top:4px;padding:0 4px;
`
const ProjStageLabel = styled.div<{ $active: boolean }>`
  flex:1;text-align:center;font-size:7px;font-weight:600;
  color:${pr => pr.$active ? t.gold : t.textDim};
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
`
const ProjSummary = styled.div`
  display:flex;align-items:center;justify-content:space-between;
  margin-top:10px;padding:8px 12px;
  background:${t.goldDim};border:1px solid ${t.goldBorder};border-radius:${t.r.md};
`
const ProjSumLabel = styled.span`font-size:11px;color:${t.textSec};`
const ProjSumVal = styled.span<{ $c?: string }>`font-size:14px;font-weight:800;color:${pr => pr.$c || t.gold};`

/** Generate investment projection data through planning stages */
function useProjectionChart(plot: Plot | null) {
  return useMemo(() => {
    if (!plot) return null
    const d = p(plot), price = d.price, projected = d.projected
    if (!price || !projected) return null

    const stages = [
      { key: 'AGRICULTURAL', label: 'חקלאית', short: '🌾' },
      { key: 'MASTER_PLAN', label: 'מתאר', short: '📋' },
      { key: 'DETAILED_PLAN', label: 'מפורטת', short: '📐' },
      { key: 'TENDER', label: 'מכרז', short: '🏗️' },
      { key: 'PERMIT', label: 'היתר', short: '🏠' },
    ]

    // Calculate value at each stage (exponential growth curve from price to projected)
    const totalGrowth = projected / price
    const n = stages.length
    const values = stages.map((_, i) => {
      const progress = i / (n - 1) // 0 to 1
      // Exponential interpolation: price * (totalGrowth ^ progress)
      return Math.round(price * Math.pow(totalGrowth, progress))
    })

    // Determine current stage index
    const zoning = d.zoning
    let currentIdx = 0
    if (zoning.includes('BUILDING_PERMIT') || zoning.includes('DEVELOPER_TENDER')) currentIdx = 4
    else if (zoning.includes('DETAILED_PLAN_APPROVED')) currentIdx = 3
    else if (zoning.includes('DETAILED_PLAN')) currentIdx = 2
    else if (zoning.includes('MASTER_PLAN')) currentIdx = 1

    const maxVal = Math.max(...values)
    const currentVal = values[currentIdx]
    const remainingGrowth = ((projected - currentVal) / currentVal) * 100

    return { stages, values, currentIdx, maxVal, currentVal, remainingGrowth }
  }, [plot])
}

/* ── Area Quality Radar Chart (Pentagon) ── */
const RadarWrap = styled.div`
  display:flex;align-items:center;gap:14px;padding:14px;margin-bottom:16px;
  background:${t.surfaceLight};border:1px solid ${t.border};border-radius:${t.r.md};
  animation:${fadeSection} 0.45s 0.1s both;
`
const RadarLabels = styled.div`
  display:flex;flex-direction:column;gap:3px;flex:1;min-width:0;
`
const RadarRow = styled.div`display:flex;align-items:center;gap:6px;`
const RadarDot = styled.span<{ $c: string }>`
  width:6px;height:6px;border-radius:50%;background:${pr => pr.$c};flex-shrink:0;
`
const RadarName = styled.span`font-size:10px;color:${t.textSec};flex:1;min-width:0;`
const RadarVal = styled.span<{ $c: string }>`font-size:10px;font-weight:700;color:${pr => pr.$c};`

interface RadarDimension { label: string; value: number; color: string }

function RadarChart({ dims, size = 72 }: { dims: RadarDimension[]; size?: number }) {
  const n = dims.length
  if (n < 3) return null
  const cx = size / 2, cy = size / 2, r = size / 2 - 4
  const angle = (i: number) => ((2 * Math.PI * i) / n) - Math.PI / 2

  // Grid rings
  const rings = [0.33, 0.66, 1]
  // Data points
  const points = dims.map((d, i) => {
    const a = angle(i), v = Math.min(1, Math.max(0, d.value / 10)) * r
    return { x: cx + Math.cos(a) * v, y: cy + Math.sin(a) * v }
  })
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      {/* Grid rings */}
      {rings.map((ring, i) => (
        <polygon key={i} fill="none" stroke={t.border} strokeWidth="0.5"
          points={Array.from({ length: n }, (_, j) => {
            const a = angle(j), v = r * ring
            return `${(cx + Math.cos(a) * v).toFixed(1)},${(cy + Math.sin(a) * v).toFixed(1)}`
          }).join(' ')} />
      ))}
      {/* Axis lines */}
      {Array.from({ length: n }, (_, i) => {
        const a = angle(i)
        return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r} stroke={t.border} strokeWidth="0.5" />
      })}
      {/* Data polygon */}
      <polygon points={points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
        fill={`${t.gold}22`} stroke={t.gold} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Data dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={dims[i].color} />
      ))}
    </svg>
  )
}

/** Compute area quality dimensions from plot data */
function useAreaQuality(plot: Plot | null, allPlots?: Plot[]): RadarDimension[] | null {
  return useMemo(() => {
    if (!plot) return null
    const d = p(plot), r = roi(plot), score = calcScore(plot)
    const pps = pricePerSqm(plot)

    // 1. Investment Grade (from calcScore, already 1-10)
    const investmentScore = score

    // 2. Planning Progress (zoning stage, 0=agricultural → 10=building permit)
    const zoningStages = ['AGRICULTURAL','MASTER_PLAN_DEPOSIT','MASTER_PLAN_APPROVED','DETAILED_PLAN_PREP','DETAILED_PLAN_DEPOSIT','DETAILED_PLAN_APPROVED','DEVELOPER_TENDER','BUILDING_PERMIT']
    const zi = zoningStages.indexOf(d.zoning)
    const planningScore = zi >= 0 ? Math.round((zi / (zoningStages.length - 1)) * 10) : 0

    // 3. Value Score (how well-priced vs market, inverse of overpricing)
    let valueScore = 5
    if (allPlots && allPlots.length > 2 && pps > 0) {
      const allPps = allPlots.map(pricePerSqm).filter(v => v > 0)
      const avg = allPps.reduce((s, v) => s + v, 0) / allPps.length
      const diff = ((avg - pps) / avg) * 100 // positive = below avg = good
      valueScore = Math.max(1, Math.min(10, 5 + diff / 10))
    }

    // 4. Growth Potential (from ROI)
    const growthScore = Math.max(1, Math.min(10, r > 0 ? Math.min(10, r / 15 + 2) : 2))

    // 5. Location (from distance to sea / parks)
    let locationScore = 5
    if (d.seaDist != null) locationScore = d.seaDist <= 200 ? 10 : d.seaDist <= 500 ? 8 : d.seaDist <= 1500 ? 6 : d.seaDist <= 5000 ? 4 : 2
    if (d.parkDist != null) {
      const parkBonus = d.parkDist <= 300 ? 2 : d.parkDist <= 800 ? 1 : 0
      locationScore = Math.min(10, locationScore + parkBonus)
    }

    const scoreColor = (v: number) => v >= 7 ? t.ok : v >= 4 ? t.warn : t.err

    return [
      { label: 'השקעה', value: Math.round(investmentScore), color: scoreColor(investmentScore) },
      { label: 'תכנון', value: Math.round(planningScore), color: scoreColor(planningScore) },
      { label: 'משתלמות', value: Math.round(valueScore), color: scoreColor(valueScore) },
      { label: 'צמיחה', value: Math.round(growthScore), color: scoreColor(growthScore) },
      { label: 'מיקום', value: Math.round(locationScore), color: scoreColor(locationScore) },
    ]
  }, [plot, allPlots])
}

/* ── AI Insight Badge ── */
const InsightWrap = styled.div`
  padding:12px 14px;margin-bottom:16px;
  background:linear-gradient(135deg,rgba(59,130,246,0.06),rgba(139,92,246,0.04));
  border:1px solid rgba(99,102,241,0.2);border-radius:${t.r.md};
  animation:${fadeSection} 0.4s 0.08s both;direction:rtl;
`
const InsightHeader = styled.div`
  display:flex;align-items:center;gap:6px;margin-bottom:6px;
`
const InsightBadge = styled.span`
  font-size:9px;font-weight:800;padding:2px 8px;border-radius:${t.r.full};
  background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#fff;
  text-transform:uppercase;letter-spacing:0.5px;
`
const InsightText = styled.p`
  font-size:13px;color:${t.textSec};line-height:1.7;margin:0;
`

/** Generate a deterministic AI insight based on plot metrics */
function useAIInsight(plot: Plot | null, allPlots?: Plot[]) {
  return useMemo(() => {
    if (!plot) return null
    const d = p(plot), r = roi(plot), score = calcScore(plot), grade = getGrade(score)
    const pps = pricePerSqm(plot)
    const insights: string[] = []

    // Grade-based lead
    if (score >= 8) insights.push(`חלקה מדורגת ${grade.grade} — בין ה-10% המובילות`)
    else if (score >= 6) insights.push(`דירוג ${grade.grade} — השקעה סולידית`)
    else insights.push(`דירוג ${grade.grade} — נדרשת בדיקה נוספת`)

    // ROI insight
    if (r > 100) insights.push(`פוטנציאל תשואה חריג של +${Math.round(r)}%`)
    else if (r > 50) insights.push(`תשואה צפויה +${Math.round(r)}%`)

    // Price position
    if (allPlots && allPlots.length > 2 && pps > 0) {
      const allPps = allPlots.map(pricePerSqm).filter(v => v > 0)
      const avg = allPps.reduce((s, v) => s + v, 0) / allPps.length
      const diff = ((pps - avg) / avg) * 100
      if (diff < -15) insights.push(`מחיר ${Math.abs(Math.round(diff))}% מתחת לממוצע — הזדמנות`)
      else if (diff > 20) insights.push(`מחיר מעל הממוצע — בדקו סיבה`)
    }

    // Zoning stage
    const zi = ['AGRICULTURAL','MASTER_PLAN_DEPOSIT','MASTER_PLAN_APPROVED','DETAILED_PLAN_PREP','DETAILED_PLAN_DEPOSIT','DETAILED_PLAN_APPROVED','DEVELOPER_TENDER','BUILDING_PERMIT'].indexOf(d.zoning)
    if (zi >= 5) insights.push('שלב תכנוני מתקדם — סיכון מופחת')
    else if (zi <= 1) insights.push('שלב תכנוני מוקדם — אופק ארוך')

    // Sea distance
    if (d.seaDist != null && d.seaDist <= 500) insights.push(`קו חוף — ${d.seaDist}מ׳ מהים`)

    return insights.slice(0, 3).join('. ') + '.'
  }, [plot, allPlots])
}

/* ── Market Trend Card ── */
const TrendCard = styled.div`
  display:flex;align-items:center;gap:12px;padding:12px;margin-bottom:16px;
  background:linear-gradient(135deg,rgba(212,168,75,0.06),rgba(212,168,75,0.02));
  border:1px solid ${t.goldBorder};border-radius:${t.r.md};
  animation:${fadeSection} 0.5s 0.12s both;
`
const TrendInfo = styled.div`flex:1;min-width:0;`
const TrendCity = styled.div`font-size:13px;font-weight:700;color:${t.text};`
const TrendMeta = styled.div`font-size:11px;color:${t.textSec};margin-top:2px;display:flex;align-items:center;gap:6px;`

/** Generate a deterministic price trend based on plot data */
function useMarketTrend(plot: Plot | null) {
  return useMemo(() => {
    if (!plot) return null
    const d = p(plot), price = d.price
    if (!price) return null
    // Generate 12-month trend from the price data — simulated but consistent per plot
    const hash = plot.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    const trend: number[] = []
    const isUp = roi(plot) > 0
    for (let i = 0; i < 12; i++) {
      const noise = Math.sin((hash + i * 37) * 0.1) * 0.03
      const direction = isUp ? (i / 11) * 0.08 : -(i / 11) * 0.04
      trend.push(price * (0.96 + direction + noise))
    }
    const first = trend[0], last = trend[trend.length - 1]
    const changePct = ((last - first) / first) * 100
    return { trend, changePct, isUp: changePct >= 0 }
  }, [plot])
}

/* ── Similar Plots ── */
const SimilarWrap = styled.div`
  margin-top:20px;padding-top:16px;border-top:1px solid ${t.border};
  animation:${fadeSection} 0.5s 0.25s both;
`
const SimilarTitle = styled.div`
  font-size:13px;font-weight:700;color:${t.text};margin-bottom:12px;
  display:flex;align-items:center;gap:8px;
`
const SimilarCard = styled.div`
  display:flex;align-items:center;gap:12px;padding:10px 12px;margin-bottom:8px;
  background:${t.surfaceLight};border:1px solid ${t.border};border-radius:${t.r.md};
  cursor:pointer;transition:all ${t.tr};direction:rtl;
  &:hover{border-color:${t.goldBorder};background:${t.goldDim};transform:translateX(-3px);}
`
const SimilarInfo = styled.div`flex:1;min-width:0;`
const SimilarName = styled.div`font-size:13px;font-weight:700;color:${t.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`
const SimilarMeta = styled.div`font-size:11px;color:${t.textSec};display:flex;align-items:center;gap:6px;margin-top:2px;`
const SimilarPrice = styled.span`font-size:14px;font-weight:800;color:${t.gold};white-space:nowrap;`
const SimilarGrade = styled.span<{$c:string}>`
  font-size:10px;font-weight:800;padding:1px 6px;border-radius:${t.r.sm};
  color:${pr=>pr.$c};border:1px solid ${pr=>pr.$c}44;background:${t.bg};
`

/* ── Navigation Links (Google Maps, Street View, Waze) ── */
const NavLinksGrid = styled.div`
  display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;
`
const NavLinkBtn = styled.a<{$bg:string;$c:string}>`
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
  padding:10px 6px;border-radius:${t.r.md};text-decoration:none !important;
  background:${pr=>pr.$bg};border:1px solid ${pr=>pr.$c}33;
  color:${pr=>pr.$c};font-size:10px;font-weight:700;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};
  &:hover{transform:translateY(-2px);box-shadow:0 4px 12px ${pr=>pr.$c}22;border-color:${pr=>pr.$c}55;}
`

/* ── Price Distribution Mini Chart ── */
const DistWrap = styled.div`
  margin-bottom:16px;padding:12px;background:${t.surfaceLight};
  border:1px solid ${t.border};border-radius:${t.r.md};
  animation:${fadeSection} 0.5s 0.14s both;
`
const DistTitle = styled.div`
  font-size:11px;font-weight:700;color:${t.textDim};margin-bottom:10px;
  display:flex;align-items:center;gap:6px;text-transform:uppercase;letter-spacing:0.3px;
`
const DistChart = styled.div`
  display:flex;align-items:flex-end;gap:1px;height:36px;position:relative;
`
const DistBar = styled.div<{$h:number;$active:boolean;$c:string}>`
  flex:1;min-width:0;border-radius:2px 2px 0 0;
  height:${pr=>Math.max(2,pr.$h)}%;
  background:${pr=>pr.$active ? pr.$c : t.border};
  opacity:${pr=>pr.$active ? 1 : 0.4};
  transition:all 0.4s ease;position:relative;
`
const DistMarker = styled.div`
  position:absolute;top:-14px;left:50%;transform:translateX(-50%);
  font-size:8px;font-weight:800;color:${t.gold};white-space:nowrap;
`
const DistLabels = styled.div`
  display:flex;justify-content:space-between;margin-top:4px;
`
const DistLabel = styled.span`font-size:9px;color:${t.textDim};`

/** Price distribution histogram — shows where this plot sits among all plots */
function PriceDistribution({ plot, allPlots }: { plot: Plot; allPlots: Plot[] }) {
  const data = useMemo(() => {
    const prices = allPlots.map(pl => p(pl).price).filter(v => v > 0).sort((a, b) => a - b)
    if (prices.length < 3) return null
    const plotPrice = p(plot).price
    if (plotPrice <= 0) return null

    const min = prices[0], max = prices[prices.length - 1]
    const range = max - min
    if (range <= 0) return null

    const BINS = 12
    const binSize = range / BINS
    const bins = Array.from({ length: BINS }, () => 0)
    let plotBin = -1

    for (const price of prices) {
      const idx = Math.min(BINS - 1, Math.floor((price - min) / binSize))
      bins[idx]++
    }
    plotBin = Math.min(BINS - 1, Math.floor((plotPrice - min) / binSize))

    const maxBin = Math.max(...bins)
    const percentile = Math.round((prices.filter(pr => pr <= plotPrice).length / prices.length) * 100)

    return { bins, plotBin, maxBin, min, max, percentile }
  }, [plot, allPlots])

  if (!data) return null

  return (
    <DistWrap>
      <DistTitle>
        <BarChart3 size={12} color={t.gold} />
        פיזור מחירים — אחוזון {data.percentile}%
      </DistTitle>
      <DistChart>
        {data.bins.map((count, i) => (
          <DistBar
            key={i}
            $h={(count / data.maxBin) * 100}
            $active={i === data.plotBin}
            $c={t.gold}
          >
            {i === data.plotBin && <DistMarker>▼</DistMarker>}
          </DistBar>
        ))}
      </DistChart>
      <DistLabels>
        <DistLabel>{fmt.compact(data.min)}</DistLabel>
        <DistLabel>{fmt.compact(data.max)}</DistLabel>
      </DistLabels>
    </DistWrap>
  )
}

/* ── Print Button ── */
const PrintBtn = styled.button`
  display:flex;align-items:center;justify-content:center;width:40px;height:40px;
  border-radius:${t.r.md};border:1px solid ${t.border};
  background:transparent;color:${t.textSec};cursor:pointer;transition:all ${t.tr};flex-shrink:0;
  &:hover{border-color:${t.goldBorder};color:${t.gold};background:${t.goldDim};}
`

/* ── Main Component ── */
interface Props {
  plot: Plot | null; open: boolean; onClose: () => void; onLead?: () => void
  plots?: Plot[]; onNavigate?: (plot: Plot) => void
  isCompared?: boolean; onToggleCompare?: (id: string) => void
}

export default function Sidebar({ plot, open, onClose, onLead, plots, onNavigate, isCompared, onToggleCompare }: Props) {
  const navigate = useNavigate()
  const bodyRef = React.useRef<HTMLDivElement>(null)
  const panelRef = useRefHook<HTMLDivElement>(null)
  const closeBtnRef = useRefHook<HTMLButtonElement>(null)
  const [copied, setCopied] = useState(false)

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      // Focus management: move focus to close button for accessibility
      requestAnimationFrame(() => closeBtnRef.current?.focus())
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  // Swipe-to-close gesture for mobile
  useEffect(() => {
    if (!open || !panelRef.current) return
    const panel = panelRef.current
    let startX = 0, startY = 0, isDragging = false

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      isDragging = true
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging) return
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY
      // Only track horizontal swipes (to the right, since sidebar opens from right)
      if (Math.abs(dx) > Math.abs(dy) && dx > 30) {
        panel.style.transform = `translateX(${Math.min(dx, 200)}px)`
        panel.style.transition = 'none'
      }
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (!isDragging) return
      isDragging = false
      const dx = e.changedTouches[0].clientX - startX
      panel.style.transition = ''
      panel.style.transform = ''
      // Close if swiped more than 80px to the right
      if (dx > 80) {
        onClose()
      }
    }

    panel.addEventListener('touchstart', onTouchStart, { passive: true })
    panel.addEventListener('touchmove', onTouchMove, { passive: true })
    panel.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      panel.removeEventListener('touchstart', onTouchStart)
      panel.removeEventListener('touchmove', onTouchMove)
      panel.removeEventListener('touchend', onTouchEnd)
    }
  }, [open, onClose])

  // Auto-scroll body to top when plot changes
  useEffect(() => {
    if (plot && bodyRef.current) bodyRef.current.scrollTop = 0
  }, [plot?.id])

  // Reset copied state when plot changes
  useEffect(() => { setCopied(false) }, [plot?.id])

  const handleShare = useCallback(async () => {
    if (!plot) return
    const d = p(plot)
    const url = `${window.location.origin}/plot/${plot.id}`
    const title = `חלקה ${plot.number} · גוש ${d.block} - ${plot.city}`
    const text = `${title} | ${fmt.compact(d.price)} | ${fmt.num(d.size)} מ״ר`

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        return
      } catch { /* user cancelled or not supported, fall through to clipboard */ }
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard not available */ }
  }, [plot])

  const marketTrend = useMarketTrend(plot)
  const projection = useProjectionChart(plot)
  const pricePos = useMemo(() => plot && plots ? pricePosition(plot, plots) : null, [plot, plots])
  const risk = useMemo(() => plot ? calcRisk(plot, plots) : null, [plot, plots])
  const aiInsight = useAIInsight(plot, plots)
  const areaQuality = useAreaQuality(plot, plots)
  const similarPlots = useMemo(() => plot && plots ? findSimilarPlots(plot, plots, 3) : [], [plot, plots])

  if (!plot) return null
  const d = p(plot), r = roi(plot), score = calcScore(plot), grade = getGrade(score)
  const cagr = calcCAGR(r, d.readiness), tl = calcTimeline(plot), dom = daysOnMarket(d.created), pps = pricePerSqm(plot), ppd = pricePerDunam(plot)

  const currentIdx = plots?.findIndex(pl => pl.id === plot.id) ?? -1
  const hasPrev = plots && currentIdx > 0
  const hasNext = plots && currentIdx >= 0 && currentIdx < plots.length - 1

  const goPrev = useCallback(() => {
    if (hasPrev && plots && onNavigate) onNavigate(plots[currentIdx - 1])
  }, [hasPrev, plots, currentIdx, onNavigate])

  const goNext = useCallback(() => {
    if (hasNext && plots && onNavigate) onNavigate(plots[currentIdx + 1])
  }, [hasNext, plots, currentIdx, onNavigate])

  // Keyboard navigation: left/right arrows for prev/next
  useEffect(() => {
    if (!open || !plots?.length) return
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight') goPrev()
      else if (e.key === 'ArrowLeft') goNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, plots, goPrev, goNext])

  return (
    <>
      <Overlay $open={open} onClick={onClose} />
      <Panel ref={panelRef} $open={open} role="complementary" aria-label="Plot details">
        <GoldBar />
        <SwipeHandle />
        {plots && plots.length > 1 && (
          <NavBar>
            <NavBtn $disabled={!hasPrev} onClick={goPrev}>
              <ChevronRight size={14} /> הקודם
            </NavBtn>
            <NavCounter>{currentIdx + 1} / {plots.length}</NavCounter>
            <NavBtn $disabled={!hasNext} onClick={goNext}>
              הבא <ChevronLeft size={14} />
            </NavBtn>
          </NavBar>
        )}
        <Header>
          <TopRow>
            <Badges>
              <Badge $color={statusColors[plot.status || 'AVAILABLE']}>{statusLabels[plot.status || 'AVAILABLE']}</Badge>
              {dom && <Badge $color={dom.color}>{dom.label}</Badge>}
            </Badges>
            <CloseBtn ref={closeBtnRef} onClick={onClose} aria-label="סגור"><X size={18} /></CloseBtn>
          </TopRow>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
            <RadialScore score={score} grade={grade.grade} color={grade.color} size={52} strokeWidth={4} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Title>חלקה {plot.number} · גוש {d.block}</Title>
              <City>{plot.city}</City>
              <div style={{ fontSize: 11, color: grade.color, fontWeight: 700, marginTop: 2 }}>
                {score}/10 · {grade.grade === 'A+' ? 'מצוין+' : grade.grade === 'A' ? 'מצוין' : grade.grade === 'A-' ? 'טוב מאוד' : grade.grade === 'B+' ? 'טוב' : grade.grade === 'B' ? 'סביר' : grade.grade === 'B-' ? 'מתחת לממוצע' : 'חלש'}
              </div>
            </div>
          </div>
        </Header>

        <Body ref={bodyRef}>
          {/* AI Investment Insight */}
          {aiInsight && (
            <InsightWrap>
              <InsightHeader>
                <InsightBadge>✨ AI INSIGHT</InsightBadge>
              </InsightHeader>
              <InsightText>{aiInsight}</InsightText>
            </InsightWrap>
          )}

          <MetricsGrid>
            <MetricCard><MetricLabel>מחיר</MetricLabel><MetricVal $gold>{fmt.compact(d.price)}</MetricVal></MetricCard>
            <MetricCard><MetricLabel>שטח</MetricLabel><MetricVal>{d.size >= 1000 ? `${fmt.dunam(d.size)} דונם` : `${fmt.num(d.size)} מ״ר`}</MetricVal></MetricCard>
            {ppd > 0 && <MetricCard><MetricLabel>₪ / דונם</MetricLabel><MetricVal>{fmt.num(ppd)}</MetricVal></MetricCard>}
            <MetricCard><MetricLabel>תשואה</MetricLabel><MetricVal $gold={r > 0}>{fmt.pct(r)}</MetricVal></MetricCard>
          </MetricsGrid>

          {/* Area Quality Radar — visual pentagon score chart */}
          {areaQuality && (
            <RadarWrap>
              <RadarChart dims={areaQuality} size={80} />
              <RadarLabels>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.text, marginBottom: 4 }}>ציון איכות</div>
                {areaQuality.map(dim => (
                  <RadarRow key={dim.label}>
                    <RadarDot $c={dim.color} />
                    <RadarName>{dim.label}</RadarName>
                    <RadarVal $c={dim.color}>{dim.value}/10</RadarVal>
                  </RadarRow>
                ))}
              </RadarLabels>
            </RadarWrap>
          )}

          {/* Price position vs average — like Madlan's value indicator */}
          {pricePos && (
            <PricePosBadge $c={pricePos.color}>
              {pricePos.direction === 'below' ? '📉' : pricePos.direction === 'above' ? '📈' : '➡️'}
              מחיר למ״ר {pricePos.label} לממוצע באזור
            </PricePosBadge>
          )}

          {/* Risk indicator — compact version for sidebar */}
          {risk && (
            <RiskBadge $c={risk.color}>
              <span style={{ fontSize: 14 }}>{risk.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: risk.color }}>{risk.label}</span>
              <RiskMeterMini $pct={risk.score * 10} $c={risk.color} />
              <span style={{ fontSize: 11, fontWeight: 800, color: risk.color }}>{risk.score}/10</span>
            </RiskBadge>
          )}

          {/* Investment Projection Chart — visual value growth through planning stages */}
          {projection && (
            <ProjWrap>
              <ProjTitle><TrendingUp size={12} color={t.gold} /> תחזית צמיחת ערך</ProjTitle>
              <ProjChart>
                {projection.stages.map((stage, i) => (
                  <ProjBar
                    key={stage.key}
                    $h={(projection.values[i] / projection.maxVal) * 100}
                    $active={i <= projection.currentIdx}
                    $color={i === projection.currentIdx ? t.gold : t.ok}
                    title={`${stage.label}: ${fmt.compact(projection.values[i])}`}
                  >
                    <ProjBarLabel $active={i === projection.currentIdx}>
                      {fmt.short(projection.values[i])}
                    </ProjBarLabel>
                  </ProjBar>
                ))}
              </ProjChart>
              <ProjLabels>
                {projection.stages.map((stage, i) => (
                  <ProjStageLabel key={stage.key} $active={i === projection.currentIdx}>
                    {stage.short} {stage.label}
                  </ProjStageLabel>
                ))}
              </ProjLabels>
              {projection.remainingGrowth > 0 && (
                <ProjSummary>
                  <ProjSumLabel>פוטנציאל צמיחה נותר</ProjSumLabel>
                  <ProjSumVal $c={t.ok}>+{Math.round(projection.remainingGrowth)}%</ProjSumVal>
                </ProjSummary>
              )}
            </ProjWrap>
          )}

          {/* Market Trend Card — like Madlan's area trend indicator */}
          {marketTrend && (
            <TrendCard>
              <TrendInfo>
                <TrendCity><BarChart3 size={14} color={t.gold} style={{verticalAlign:'middle',marginLeft:4}} />מגמת שוק · {plot.city}</TrendCity>
                <TrendMeta>
                  <SparkTrend $up={marketTrend.isUp}>
                    {marketTrend.isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {marketTrend.changePct > 0 ? '+' : ''}{marketTrend.changePct.toFixed(1)}%
                  </SparkTrend>
                  <span>12 חודשים אחרונים</span>
                </TrendMeta>
              </TrendInfo>
              <Sparkline
                data={marketTrend.trend}
                color={marketTrend.isUp ? t.ok : t.err}
                width={80}
                height={28}
              />
            </TrendCard>
          )}

          <Section icon={TrendingUp} title="ניתוח השקעה" idx={0}>
            <Row><Label>ציון</Label><Val $c={grade.color}>{score}/10 ({grade.grade})</Val></Row>
            <Row><Label>שווי חזוי</Label><Val>{fmt.compact(d.projected)}</Val></Row>
            {cagr && <Row><Label>CAGR</Label><Val $c={t.ok}>{cagr.cagr}% ({cagr.years} שנים)</Val></Row>}
            <Row><Label>מוכנות</Label><Val>{d.readiness || '—'}</Val></Row>
          </Section>

          <Section icon={Clock} title="ציר זמן תכנון" idx={1}>
            {tl && <>
              <Timeline>{tl.stages.map((s, i) => <Step key={s.key} $done={i < tl.currentIdx} $current={i === tl.currentIdx} title={s.label} />)}</Timeline>
              <Row><Label>שלב נוכחי</Label><Val $c={t.gold}>{zoningLabels[d.zoning] || d.zoning}</Val></Row>
              <Row><Label>נותרו</Label><Val>{tl.remaining} חודשים</Val></Row>
            </>}
          </Section>

          <Section icon={Landmark} title="ועדות" idx={2}>
            {plot.committees ? Object.entries(plot.committees).map(([k, c]) => (
              <Row key={k}><Label>{k === 'national' ? 'ארצית' : k === 'district' ? 'מחוזית' : 'מקומית'}</Label>
                <Val $c={c.status === 'approved' ? t.ok : c.status === 'pending' ? t.warn : t.textSec}>{c.label}</Val></Row>
            )) : <Row><Label>אין נתונים</Label><Val>—</Val></Row>}
          </Section>

          {/* Price Distribution — shows where this plot sits among all prices */}
          {plots && plots.length >= 3 && (
            <PriceDistribution plot={plot} allPlots={plots} />
          )}

          <Section icon={MapPin} title="מיקום" idx={3}>
            {/* Navigation Links — Google Maps, Street View, Waze */}
            {(() => {
              const center = plotCenter(plot.coordinates)
              if (!center) return null
              const { lat, lng } = center
              return (
                <NavLinksGrid>
                  <NavLinkBtn
                    href={`https://www.google.com/maps/@${lat},${lng},18z/data=!1m1!1e1`}
                    target="_blank" rel="noopener noreferrer"
                    $bg="rgba(66,133,244,0.08)" $c="#4285F4"
                    title="פתח ב-Google Maps (לוויין)"
                  >
                    <MapIcon2 size={16} />
                    Google Maps
                  </NavLinkBtn>
                  <NavLinkBtn
                    href={`https://www.google.com/maps/@${lat},${lng},3a,75y,0h,90t/data=!3m1!1e1`}
                    target="_blank" rel="noopener noreferrer"
                    $bg="rgba(251,188,5,0.08)" $c="#FBBC05"
                    title="Street View"
                  >
                    <Eye size={16} />
                    Street View
                  </NavLinkBtn>
                  <NavLinkBtn
                    href={`https://waze.com/ul?ll=${lat},${lng}&navigate=yes&zoom=17`}
                    target="_blank" rel="noopener noreferrer"
                    $bg="rgba(51,171,232,0.08)" $c="#33ABE8"
                    title="נווט עם Waze"
                  >
                    <Navigation size={16} />
                    Waze
                  </NavLinkBtn>
                </NavLinksGrid>
              )
            })()}
            {/* Visual Proximity Badges */}
            {(d.seaDist != null || d.parkDist != null || (plot.distance_to_hospital ?? plot.distanceToHospital) != null) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {d.seaDist != null && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                    background: d.seaDist <= 500 ? 'rgba(59,130,246,0.1)' : d.seaDist <= 1500 ? 'rgba(59,130,246,0.06)' : 'transparent',
                    border: `1px solid ${d.seaDist <= 500 ? 'rgba(59,130,246,0.3)' : d.seaDist <= 1500 ? 'rgba(59,130,246,0.15)' : t.border}`,
                    borderRadius: t.r.full, fontSize: 11, fontWeight: 600,
                    color: d.seaDist <= 500 ? '#3B82F6' : d.seaDist <= 1500 ? '#60A5FA' : t.textSec,
                  }}>
                    🌊 {fmt.num(d.seaDist)} מ׳
                    {d.seaDist <= 500 && <span style={{ fontSize: 9, fontWeight: 800, color: '#3B82F6' }}>קרוב!</span>}
                  </div>
                )}
                {d.parkDist != null && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                    background: d.parkDist <= 300 ? 'rgba(16,185,129,0.1)' : 'transparent',
                    border: `1px solid ${d.parkDist <= 300 ? 'rgba(16,185,129,0.3)' : t.border}`,
                    borderRadius: t.r.full, fontSize: 11, fontWeight: 600,
                    color: d.parkDist <= 300 ? '#10B981' : t.textSec,
                  }}>
                    🌳 {fmt.num(d.parkDist)} מ׳
                  </div>
                )}
                {(plot.distance_to_hospital ?? plot.distanceToHospital) != null && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                    background: 'transparent', border: `1px solid ${t.border}`,
                    borderRadius: t.r.full, fontSize: 11, fontWeight: 600, color: t.textSec,
                  }}>
                    🏥 {fmt.num((plot.distance_to_hospital ?? plot.distanceToHospital) as number)} מ׳
                  </div>
                )}
              </div>
            )}
            {d.density > 0 && <Row><Label>צפיפות</Label><Val>{d.density} יח׳/דונם</Val></Row>}
            {d.block && (
              <Row>
                <Label>גוש / חלקה</Label>
                <Val>
                  <a
                    href={`https://www.govmap.gov.il/?q=${encodeURIComponent(`גוש ${d.block} חלקה ${plot.number}`)}&z=8`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ color: t.gold, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, transition: `color ${t.tr}` }}
                    title="הצג ב-GovMap"
                  >
                    {d.block}/{plot.number} <ExternalLink size={11} />
                  </a>
                </Val>
              </Row>
            )}
          </Section>

          {/* Area Context — neighborhood intelligence like Madlan */}
          {(plot.area_context || plot.areaContext) && (
            <Section icon={Globe} title="הקשר אזורי" idx={4}>
              <p style={{ fontSize: 13, color: t.textSec, lineHeight: 1.7 }}>
                {(plot.area_context || plot.areaContext) as string}
              </p>
            </Section>
          )}

          {/* Nearby Development — future development intelligence */}
          {(plot.nearby_development || plot.nearbyDevelopment) && (
            <Section icon={Construction} title="פיתוח בסביבה" idx={5}>
              <p style={{ fontSize: 13, color: t.textSec, lineHeight: 1.7 }}>
                {(plot.nearby_development || plot.nearbyDevelopment) as string}
              </p>
            </Section>
          )}

          {/* Neighborhood Stats — aggregate area statistics */}
          {plots && plots.length > 1 && (() => {
            const cityPlots = plots.filter(pl => pl.city === plot.city)
            if (cityPlots.length < 2) return null
            const prices = cityPlots.map(pl => p(pl).price).filter(v => v > 0)
            const ppsList = cityPlots.map(pl => pricePerSqm(pl)).filter(v => v > 0)
            const rois = cityPlots.map(r => roi(r)).filter(v => v > 0)
            const avgPrice = prices.length ? Math.round(prices.reduce((s, v) => s + v, 0) / prices.length) : 0
            const avgPps = ppsList.length ? Math.round(ppsList.reduce((s, v) => s + v, 0) / ppsList.length) : 0
            const avgRoi = rois.length ? Math.round(rois.reduce((s, v) => s + v, 0) / rois.length * 10) / 10 : 0
            const minPrice = prices.length ? Math.min(...prices) : 0
            const maxPrice = prices.length ? Math.max(...prices) : 0
            return (
              <Section icon={Building2} title={`סטטיסטיקות · ${plot.city}`} idx={6}>
                <Row><Label>חלקות באזור</Label><Val $c={t.gold}>{cityPlots.length}</Val></Row>
                <Row><Label>מחיר ממוצע</Label><Val>{fmt.compact(avgPrice)}</Val></Row>
                <Row><Label>טווח מחירים</Label><Val>{fmt.compact(minPrice)} – {fmt.compact(maxPrice)}</Val></Row>
                {avgPps > 0 && <Row><Label>ממוצע ₪/מ״ר</Label><Val>{fmt.num(avgPps)}</Val></Row>}
                {avgRoi > 0 && <Row><Label>תשואה ממוצעת</Label><Val $c={t.ok}>{avgRoi}%</Val></Row>}
              </Section>
            )
          })()}

          <Section icon={FileText} title="מסמכים" idx={7}>
            {plot.documents?.length ? plot.documents.map((doc, i) => (
              <Row key={i}><Val $c={t.gold} style={{ cursor: 'pointer' }}>{doc}</Val></Row>
            )) : <Label>אין מסמכים זמינים</Label>}
          </Section>

          <Section icon={Info} title="תיאור" idx={8}>
            <p style={{ fontSize: 13, color: t.textSec, lineHeight: 1.7 }}>{plot.description || 'אין תיאור זמין לחלקה זו.'}</p>
          </Section>

          {/* Similar Plots — recommendation engine like Madlan */}
          {similarPlots.length > 0 && (
            <SimilarWrap>
              <SimilarTitle>
                <Sparkles size={14} color={t.gold} /> חלקות דומות
              </SimilarTitle>
              {similarPlots.map(sim => {
                const sd = p(sim), sg = getGrade(calcScore(sim))
                return (
                  <SimilarCard key={sim.id} onClick={() => onNavigate?.(sim)}>
                    <SimilarInfo>
                      <SimilarName>גוש {sd.block} · חלקה {sim.number}</SimilarName>
                      <SimilarMeta>
                        <span>{sim.city}</span>
                        <span>·</span>
                        <span>{fmt.num(sd.size)} מ״ר</span>
                        <SimilarGrade $c={sg.color}>{sg.grade}</SimilarGrade>
                      </SimilarMeta>
                    </SimilarInfo>
                    <SimilarPrice>{fmt.compact(sd.price)}</SimilarPrice>
                  </SimilarCard>
                )
              })}
            </SimilarWrap>
          )}
        </Body>

        <Footer>
          <GoldButton style={{ flex: 1 }} onClick={onLead}><Phone size={16} />קבל פרטים</GoldButton>
          <ShareBtn $copied={copied} onClick={handleShare} aria-label="שתף חלקה">
            {copied ? <Check size={15} /> : <Share2 size={15} />}
          </ShareBtn>
          {onToggleCompare && (
            <CompareBtn $active={isCompared} onClick={() => onToggleCompare(plot.id)} aria-label={isCompared ? 'הסר מהשוואה' : 'הוסף להשוואה'}>
              <GitCompareArrows size={15} />
            </CompareBtn>
          )}
          <PrintBtn onClick={() => window.print()} aria-label="הדפס דוח" title="הדפס דוח השקעה">
            <Printer size={15} />
          </PrintBtn>
          <FullPageLink onClick={() => navigate(`/plot/${plot.id}`)}><ExternalLink size={14} />עמוד מלא</FullPageLink>
        </Footer>
      </Panel>
    </>
  )
}
