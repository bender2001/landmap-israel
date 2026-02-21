import { memo, useMemo, useCallback, useEffect, useState } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { X, TrendingUp, TrendingDown, MapPin, Ruler, DollarSign, BarChart3, ExternalLink, Star, Shield, Clock, Award, Radar } from 'lucide-react'
import { t, mobile } from '../theme'
import { p, roi, fmt, calcScore, getGrade, pricePerSqm, pricePerDunam, statusLabels, statusColors, zoningLabels, calcCAGR, calcTimeline, calcRisk, exportPlotsCsv } from '../utils'
import { GoldButton, Badge } from './UI'
import { useFocusTrap } from '../hooks'
import type { Plot } from '../types'

/* ── Animations ── */
const slideUp = keyframes`from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}`
const fadeIn = keyframes`from{opacity:0}to{opacity:1}`

/* ── Styled ── */
const Backdrop = styled.div<{ $open: boolean }>`
  position:fixed;inset:0;z-index:${t.z.modal};
  background:rgba(0,0,0,0.6);backdrop-filter:blur(6px);
  opacity:${pr => pr.$open ? 1 : 0};pointer-events:${pr => pr.$open ? 'auto' : 'none'};
  transition:opacity 0.3s;animation:${pr => pr.$open ? fadeIn : 'none'} 0.3s;
`
const Panel = styled.div<{ $open: boolean }>`
  position:fixed;bottom:0;left:0;right:0;z-index:${t.z.modal + 1};
  max-height:85vh;overflow-y:auto;direction:rtl;
  background:${t.bg};border-top:3px solid ${t.gold};
  border-radius:${t.r.xl} ${t.r.xl} 0 0;box-shadow:${t.sh.xl};
  transform:translateY(${pr => pr.$open ? '0' : '100%'});
  transition:transform 0.4s cubic-bezier(0.32,0.72,0,1);
  ${pr => pr.$open && css`animation:${slideUp} 0.4s cubic-bezier(0.32,0.72,0,1);`}
`
const Header = styled.div`
  position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;
  padding:16px 24px;background:${t.surface};border-bottom:1px solid ${t.border};
`
const Title = styled.h2`
  font-size:18px;font-weight:800;color:${t.text};margin:0;font-family:${t.font};
  display:flex;align-items:center;gap:10px;
`
const CloseBtn = styled.button`
  display:flex;align-items:center;justify-content:center;width:36px;height:36px;
  border-radius:${t.r.sm};background:transparent;border:1px solid ${t.border};
  color:${t.textSec};cursor:pointer;transition:all ${t.tr};
  &:hover{background:${t.hover};color:${t.text};border-color:${t.goldBorder};}
`
const Grid = styled.div<{ $cols: number }>`
  display:grid;grid-template-columns:180px repeat(${pr => pr.$cols}, 1fr);
  ${mobile}{grid-template-columns:120px repeat(${(pr: any) => pr.$cols}, 1fr);}
`
const HeaderCell = styled.div<{ $best?: boolean }>`
  padding:14px 16px;text-align:center;border-bottom:1px solid ${t.border};
  border-left:1px solid ${t.border};background:${pr => pr.$best ? t.goldDim : t.surface};
  ${pr => pr.$best && css`border-bottom:2px solid ${t.gold};`}
  ${mobile}{padding:10px 8px;}
`
const PlotName = styled.div`font-size:14px;font-weight:800;color:${t.text};font-family:${t.font};`
const PlotCity = styled.div`font-size:11px;color:${t.textSec};margin-top:2px;`
const GradeCircle = styled.div<{ $c: string }>`
  display:inline-flex;align-items:center;justify-content:center;
  width:36px;height:36px;border-radius:50%;margin:6px auto 0;
  background:${pr => pr.$c}18;border:2px solid ${pr => pr.$c};
  font-size:14px;font-weight:900;color:${pr => pr.$c};
`
const LabelCell = styled.div`
  padding:10px 16px;font-size:12px;font-weight:600;color:${t.textDim};
  border-bottom:1px solid ${t.border};display:flex;align-items:center;gap:6px;
  background:${t.surface};
  ${mobile}{padding:8px 10px;font-size:11px;}
`
const ValueCell = styled.div<{ $best?: boolean; $highlight?: string }>`
  padding:10px 16px;text-align:center;font-size:13px;font-weight:600;
  color:${pr => pr.$highlight || t.text};border-bottom:1px solid ${t.border};
  border-left:1px solid ${t.border};
  background:${pr => pr.$best ? t.goldDim : 'transparent'};
  ${mobile}{padding:8px 10px;font-size:12px;}
`
/* ── Visual Comparison Bar ── */
const BarWrap = styled.div`
  width:100%;height:6px;background:${t.surfaceLight};border-radius:3px;
  overflow:hidden;margin-top:6px;
`
const BarFill = styled.div<{ $pct: number; $color: string }>`
  height:100%;width:${pr => pr.$pct}%;background:${pr => pr.$color};
  border-radius:3px;transition:width 0.8s cubic-bezier(0.32,0.72,0,1);
  min-width:${pr => pr.$pct > 0 ? '4px' : '0'};
`
const WinnerBadge = styled.span`
  display:inline-flex;align-items:center;gap:4px;
  padding:2px 8px;border-radius:${t.r.full};
  background:${t.goldDim};border:1px solid ${t.goldBorder};
  font-size:10px;font-weight:700;color:${t.gold};margin-top:4px;
`
const Footer = styled.div`
  padding:16px 24px;border-top:1px solid ${t.border};
  display:flex;align-items:center;justify-content:center;gap:12px;background:${t.surface};
`
const FooterLink = styled.a`
  display:inline-flex;align-items:center;gap:4px;padding:8px 16px;
  background:transparent;border:1px solid ${t.border};border-radius:${t.r.md};
  color:${t.textSec};font-size:12px;font-weight:600;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};text-decoration:none;
  &:hover{border-color:${t.goldBorder};color:${t.gold};background:${t.goldDim};}
`
const EmptyCompare = styled.div`
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:16px;padding:60px 24px;text-align:center;
`
/* ── Winner Summary ── */
const SummaryBar = styled.div`
  display:flex;align-items:center;gap:16px;padding:14px 24px;direction:rtl;
  background:linear-gradient(135deg,rgba(212,168,75,0.08),rgba(212,168,75,0.02));
  border-bottom:1px solid ${t.goldBorder};flex-wrap:wrap;
  ${mobile}{gap:10px;padding:10px 16px;}
`
const SummaryItem = styled.div`
  display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:${t.textSec};
`
const SummaryWinner = styled.span`
  font-weight:800;color:${t.gold};
`
const SummaryIcon = styled.span`font-size:14px;`

/* ── View Toggle (Table vs Radar) ── */
const ViewToggle = styled.div`
  display:flex;align-items:center;gap:4px;padding:3px;
  background:${t.surfaceLight};border-radius:${t.r.md};border:1px solid ${t.border};
`
const ViewBtn = styled.button<{$active:boolean}>`
  display:flex;align-items:center;gap:5px;padding:6px 14px;
  border:none;border-radius:${t.r.sm};font-size:11px;font-weight:700;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};
  background:${pr=>pr.$active?t.goldDim:'transparent'};
  color:${pr=>pr.$active?t.gold:t.textDim};
  &:hover{color:${t.gold};}
`

/* ── SVG Radar Chart ── */
const radarFadeIn = keyframes`from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}`
const RadarWrap = styled.div`
  padding:24px;display:flex;flex-direction:column;align-items:center;gap:16px;
  animation:${radarFadeIn} 0.5s cubic-bezier(0.32,0.72,0,1);
  ${mobile}{padding:16px 8px;}
`
const RadarLegend = styled.div`
  display:flex;align-items:center;gap:16px;flex-wrap:wrap;justify-content:center;direction:rtl;
  ${mobile}{gap:10px;}
`
const RadarLegendItem = styled.div`
  display:flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:${t.textSec};
`
const RadarDot = styled.span<{$c:string}>`
  width:10px;height:10px;border-radius:50%;background:${pr=>pr.$c};flex-shrink:0;
`

const RADAR_COLORS = ['#D4A84B', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6']
const RADAR_DIMS = [
  { key: 'score', label: 'ציון', icon: '⭐' },
  { key: 'roi', label: 'תשואה', icon: '📈' },
  { key: 'size', label: 'שטח', icon: '📐' },
  { key: 'priceComp', label: 'מחיר', icon: '💰' },
  { key: 'zoning', label: 'תכנון', icon: '🏗️' },
  { key: 'risk', label: 'ביטחון', icon: '🛡️' },
] as const

function RadarChart({ plots, allPlots }: { plots: Plot[]; allPlots: Plot[] }) {
  const cx = 160, cy = 160, R = 120
  const dims = RADAR_DIMS
  const n = dims.length
  const angles = dims.map((_, i) => (Math.PI * 2 * i) / n - Math.PI / 2)

  // Normalize each dimension to 0-1
  const zoningOrder = ['AGRICULTURAL', 'MASTER_PLAN_DEPOSIT', 'MASTER_PLAN_APPROVED', 'DETAILED_PLAN_PREP', 'DETAILED_PLAN_DEPOSIT', 'DETAILED_PLAN_APPROVED', 'DEVELOPER_TENDER', 'BUILDING_PERMIT']

  const plotData = useMemo(() => {
    const maxPrice = Math.max(...plots.map(pl => p(pl).price)) || 1
    const maxSize = Math.max(...plots.map(pl => p(pl).size)) || 1
    const maxRoi = Math.max(...plots.map(r => roi(r)), 1)

    return plots.map(pl => {
      const d = p(pl)
      const r = roi(pl)
      const score = calcScore(pl)
      const risk = calcRisk(pl, allPlots)
      const zi = zoningOrder.indexOf(d.zoning)
      const zoningNorm = zi >= 0 ? (zi + 1) / zoningOrder.length : 0.1

      return {
        score: Math.min(1, score / 10),
        roi: maxRoi > 0 ? Math.min(1, r / maxRoi) : 0,
        size: maxSize > 0 ? Math.min(1, d.size / maxSize) : 0,
        priceComp: maxPrice > 0 ? 1 - (d.price / maxPrice) : 0, // inverted: lower = better
        zoning: zoningNorm,
        risk: risk ? Math.min(1, 1 - (risk.score / 10)) : 0.5, // inverted: lower risk = better
      }
    })
  }, [plots, allPlots])

  // Build polygon paths
  const getPath = (values: Record<string, number>) => {
    return dims.map((dim, i) => {
      const val = Math.max(0.05, values[dim.key] || 0) // minimum visible
      const x = cx + Math.cos(angles[i]) * R * val
      const y = cy + Math.sin(angles[i]) * R * val
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ') + ' Z'
  }

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1]

  return (
    <RadarWrap>
      <svg viewBox="0 0 320 320" width="100%" style={{ maxWidth: 400, maxHeight: 400 }}>
        {/* Grid rings */}
        {rings.map(r => (
          <polygon key={r}
            points={angles.map(a => `${cx + Math.cos(a) * R * r},${cy + Math.sin(a) * R * r}`).join(' ')}
            fill="none" stroke={t.border} strokeWidth={r === 1 ? 1.5 : 0.5}
            strokeDasharray={r < 1 ? '3 3' : 'none'} opacity={0.6}
          />
        ))}

        {/* Axis lines */}
        {angles.map((a, i) => (
          <line key={i} x1={cx} y1={cy}
            x2={cx + Math.cos(a) * R} y2={cy + Math.sin(a) * R}
            stroke={t.border} strokeWidth={0.5} opacity={0.4}
          />
        ))}

        {/* Dimension labels */}
        {dims.map((dim, i) => {
          const labelR = R + 24
          const x = cx + Math.cos(angles[i]) * labelR
          const y = cy + Math.sin(angles[i]) * labelR
          return (
            <text key={dim.key} x={x} y={y}
              textAnchor="middle" dominantBaseline="central"
              fill={t.textSec} fontSize={11} fontWeight={700} fontFamily={t.font}
            >
              {dim.icon} {dim.label}
            </text>
          )
        })}

        {/* Plot polygons (filled) */}
        {plotData.map((values, i) => (
          <path key={`fill-${i}`} d={getPath(values)}
            fill={RADAR_COLORS[i % RADAR_COLORS.length]} fillOpacity={0.12}
            stroke="none"
          />
        ))}

        {/* Plot polygons (strokes) */}
        {plotData.map((values, i) => (
          <path key={`stroke-${i}`} d={getPath(values)}
            fill="none" stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
            strokeWidth={2.5} strokeLinejoin="round" opacity={0.85}
          />
        ))}

        {/* Data points */}
        {plotData.map((values, pi) =>
          dims.map((dim, di) => {
            const val = Math.max(0.05, values[dim.key] || 0)
            const x = cx + Math.cos(angles[di]) * R * val
            const y = cy + Math.sin(angles[di]) * R * val
            return (
              <circle key={`pt-${pi}-${di}`} cx={x} cy={y} r={4}
                fill={RADAR_COLORS[pi % RADAR_COLORS.length]}
                stroke={t.bg} strokeWidth={2}
              />
            )
          })
        )}

        {/* Ring labels */}
        {rings.map(r => (
          <text key={`rl-${r}`}
            x={cx + 4} y={cy - R * r + 1}
            fill={t.textDim} fontSize={8} fontFamily={t.font} opacity={0.5}
          >
            {Math.round(r * 100)}%
          </text>
        ))}
      </svg>

      <RadarLegend>
        {plots.map((pl, i) => (
          <RadarLegendItem key={pl.id}>
            <RadarDot $c={RADAR_COLORS[i % RADAR_COLORS.length]} />
            חלקה {pl.number} · {pl.city}
          </RadarLegendItem>
        ))}
      </RadarLegend>
    </RadarWrap>
  )
}

interface CompareDrawerProps {
  open: boolean
  onClose: () => void
  plots: Plot[]
  allPlots: Plot[]
}

/** Find which plot "wins" a metric (lower = better for price, higher = better for ROI, etc.) */
function findBest(plots: Plot[], getValue: (pl: Plot) => number, lowerIsBetter = false): string | null {
  if (plots.length < 2) return null
  let bestId = plots[0].id
  let bestVal = getValue(plots[0])
  for (let i = 1; i < plots.length; i++) {
    const v = getValue(plots[i])
    if (lowerIsBetter ? v < bestVal : v > bestVal) {
      bestVal = v
      bestId = plots[i].id
    }
  }
  return bestId
}

function CompareDrawer({ open, onClose, plots, allPlots }: CompareDrawerProps) {
  const focusTrapRef = useFocusTrap(open)
  const [view, setView] = useState<'table' | 'radar'>('table')

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  const metrics = useMemo(() => {
    if (!plots.length) return null
    const data = plots.map(pl => {
      const d = p(pl)
      const r = roi(pl)
      const score = calcScore(pl)
      const grade = getGrade(score)
      const pps = pricePerSqm(pl)
      const cagr = calcCAGR(r, d.readiness)
      const tl = calcTimeline(pl)
      const risk = calcRisk(pl, allPlots)
      return { pl, d, r, score, grade, pps, cagr, tl, risk }
    })

    // Find winners for each metric
    const bestPrice = findBest(plots, pl => p(pl).price, true)
    const bestPps = findBest(plots, pricePerSqm, true)
    const bestRoi = findBest(plots, roi)
    const bestScore = findBest(plots, calcScore)
    const bestSize = findBest(plots, pl => p(pl).size)

    // Calculate max values for bar visualization
    const maxPrice = Math.max(...data.map(d => d.d.price)) || 1
    const maxSize = Math.max(...data.map(d => d.d.size)) || 1
    const maxPps = Math.max(...data.map(d => d.pps)) || 1
    const maxRoi = Math.max(...data.map(d => d.r)) || 1

    return { data, bestPrice, bestPps, bestRoi, bestScore, bestSize, maxPrice, maxSize, maxPps, maxRoi }
  }, [plots, allPlots])

  if (!plots.length) return null

  const cols = plots.length

  return (
    <>
      <Backdrop $open={open} onClick={onClose} />
      <Panel $open={open} role="dialog" aria-modal="true" aria-label="השוואת חלקות" ref={focusTrapRef as any}>
        <Header>
          <Title><BarChart3 size={20} color={t.gold} /> השוואת {plots.length} חלקות</Title>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ViewToggle>
              <ViewBtn $active={view === 'table'} onClick={() => setView('table')}>
                <BarChart3 size={13} /> טבלה
              </ViewBtn>
              <ViewBtn $active={view === 'radar'} onClick={() => setView('radar')}>
                <Radar size={13} /> רדאר
              </ViewBtn>
            </ViewToggle>
            <button
              onClick={() => exportPlotsCsv(plots, `landmap-compare-${new Date().toISOString().slice(0, 10)}.csv`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px',
                background: 'transparent', border: `1px solid ${t.border}`, borderRadius: t.r.sm,
                color: t.textSec, fontSize: 11, fontWeight: 600, fontFamily: t.font, cursor: 'pointer',
                transition: `all ${t.tr}`,
              }}
              title="ייצוא השוואה ל-CSV"
            >
              ↓ CSV
            </button>
            <CloseBtn onClick={onClose} aria-label="סגור"><X size={18} /></CloseBtn>
          </div>
        </Header>

        {metrics ? (
          <>
            {/* Winner Summary Bar */}
            <SummaryBar style={{ flexWrap: 'wrap' }}>
              {metrics.bestScore && (() => {
                const winner = metrics.data.find(d => d.pl.id === metrics.bestScore)
                return winner ? (
                  <SummaryItem>
                    <SummaryIcon>🏆</SummaryIcon>
                    מומלץ: <SummaryWinner>חלקה {winner.pl.number} ({winner.pl.city})</SummaryWinner>
                    — ציון {winner.score}/10
                  </SummaryItem>
                ) : null
              })()}
              {metrics.bestPrice && (() => {
                const cheapest = metrics.data.find(d => d.pl.id === metrics.bestPrice)
                return cheapest ? (
                  <SummaryItem>
                    <SummaryIcon>💰</SummaryIcon>
                    מחיר נמוך: <SummaryWinner>{fmt.compact(cheapest.d.price)}</SummaryWinner>
                  </SummaryItem>
                ) : null
              })()}
              {metrics.bestRoi && (() => {
                const topRoi = metrics.data.find(d => d.pl.id === metrics.bestRoi)
                return topRoi ? (
                  <SummaryItem>
                    <SummaryIcon>📈</SummaryIcon>
                    תשואה גבוהה: <SummaryWinner>+{fmt.pct(topRoi.r)}</SummaryWinner>
                  </SummaryItem>
                ) : null
              })()}
            </SummaryBar>

            {/* Radar Chart View */}
            {view === 'radar' && <RadarChart plots={plots} allPlots={allPlots} />}

            {/* Table View */}
            {view === 'table' && (
              <Grid $cols={cols}>
                {/* Header row */}
                <LabelCell style={{ background: t.bg, borderBottom: `2px solid ${t.border}` }}>
                  <Award size={14} color={t.gold} /> מדד
                </LabelCell>
                {metrics.data.map(({ pl, grade, score }) => (
                  <HeaderCell key={pl.id} $best={pl.id === metrics.bestScore}>
                    <PlotName>חלקה {pl.number}</PlotName>
                    <PlotCity>גוש {p(pl).block} · {pl.city}</PlotCity>
                    <GradeCircle $c={grade.color}>{grade.grade}</GradeCircle>
                    {pl.id === metrics.bestScore && <WinnerBadge><Star size={10} /> מומלץ</WinnerBadge>}
                  </HeaderCell>
                ))}

                {/* Status */}
                <LabelCell><Badge $color={t.info} style={{ fontSize: 10, padding: '1px 6px' }}>סטטוס</Badge></LabelCell>
                {metrics.data.map(({ pl }) => (
                  <ValueCell key={pl.id}>
                    <Badge $color={statusColors[pl.status || 'AVAILABLE']} style={{ fontSize: 11 }}>
                      {statusLabels[pl.status || 'AVAILABLE']}
                    </Badge>
                  </ValueCell>
                ))}

                {/* Price */}
                <LabelCell><DollarSign size={13} color={t.textDim} /> מחיר</LabelCell>
                {metrics.data.map(({ pl, d }) => (
                  <ValueCell key={pl.id} $best={pl.id === metrics.bestPrice} $highlight={pl.id === metrics.bestPrice ? t.ok : undefined}>
                    {fmt.compact(d.price)}
                    <BarWrap><BarFill $pct={d.price > 0 ? (d.price / metrics.maxPrice) * 100 : 0} $color={pl.id === metrics.bestPrice ? t.ok : t.gold} /></BarWrap>
                  </ValueCell>
                ))}

                {/* Size */}
                <LabelCell><Ruler size={13} color={t.textDim} /> שטח (מ״ר)</LabelCell>
                {metrics.data.map(({ pl, d }) => (
                  <ValueCell key={pl.id} $best={pl.id === metrics.bestSize}>
                    {fmt.num(d.size)}
                    <BarWrap><BarFill $pct={d.size > 0 ? (d.size / metrics.maxSize) * 100 : 0} $color={pl.id === metrics.bestSize ? t.gold : t.textDim} /></BarWrap>
                  </ValueCell>
                ))}

                {/* Price per sqm */}
                <LabelCell><DollarSign size={13} color={t.textDim} /> ₪/מ״ר</LabelCell>
                {metrics.data.map(({ pl, pps }) => (
                  <ValueCell key={pl.id} $best={pl.id === metrics.bestPps} $highlight={pl.id === metrics.bestPps ? t.ok : undefined}>
                    {pps > 0 ? fmt.num(pps) : '—'}
                    {pps > 0 && <BarWrap><BarFill $pct={(pps / metrics.maxPps) * 100} $color={pl.id === metrics.bestPps ? t.ok : t.warn} /></BarWrap>}
                  </ValueCell>
                ))}

                {/* Price per dunam */}
                <LabelCell><DollarSign size={13} color={t.textDim} /> ₪/דונם</LabelCell>
                {metrics.data.map(({ pl }) => {
                  const ppd = pricePerDunam(pl)
                  return (
                    <ValueCell key={pl.id}>
                      {ppd > 0 ? fmt.num(ppd) : '—'}
                    </ValueCell>
                  )
                })}

                {/* ROI */}
                <LabelCell><TrendingUp size={13} color={t.textDim} /> תשואה צפויה</LabelCell>
                {metrics.data.map(({ pl, r }) => (
                  <ValueCell key={pl.id} $best={pl.id === metrics.bestRoi} $highlight={pl.id === metrics.bestRoi ? t.ok : r > 0 ? t.gold : t.err}>
                    {r > 0 ? `+${fmt.pct(r)}` : fmt.pct(r)}
                    {r > 0 && <BarWrap><BarFill $pct={metrics.maxRoi > 0 ? (r / metrics.maxRoi) * 100 : 0} $color={pl.id === metrics.bestRoi ? t.ok : t.gold} /></BarWrap>}
                  </ValueCell>
                ))}

                {/* Score */}
                <LabelCell><Star size={13} color={t.textDim} /> ציון השקעה</LabelCell>
                {metrics.data.map(({ pl, score, grade }) => (
                  <ValueCell key={pl.id} $best={pl.id === metrics.bestScore} $highlight={grade.color}>
                    {score}/10 ({grade.grade})
                    <BarWrap><BarFill $pct={score * 10} $color={grade.color} /></BarWrap>
                  </ValueCell>
                ))}

                {/* CAGR */}
                <LabelCell><TrendingUp size={13} color={t.textDim} /> CAGR</LabelCell>
                {metrics.data.map(({ pl, cagr }) => (
                  <ValueCell key={pl.id} $highlight={cagr ? t.ok : t.textDim}>
                    {cagr ? `${cagr.cagr}% (${cagr.years}y)` : '—'}
                  </ValueCell>
                ))}

                {/* Zoning Stage */}
                <LabelCell><Clock size={13} color={t.textDim} /> שלב תכנון</LabelCell>
                {metrics.data.map(({ pl, d }) => (
                  <ValueCell key={pl.id}>
                    {zoningLabels[d.zoning] || d.zoning || '—'}
                  </ValueCell>
                ))}

                {/* Timeline remaining */}
                <LabelCell><Clock size={13} color={t.textDim} /> נותרו (חודשים)</LabelCell>
                {metrics.data.map(({ pl, tl }) => (
                  <ValueCell key={pl.id} $highlight={tl && tl.remaining <= 12 ? t.ok : tl && tl.remaining > 36 ? t.warn : undefined}>
                    {tl ? `${tl.remaining}` : '—'}
                  </ValueCell>
                ))}

                {/* Risk */}
                <LabelCell><Shield size={13} color={t.textDim} /> סיכון</LabelCell>
                {metrics.data.map(({ pl, risk }) => (
                  <ValueCell key={pl.id} $highlight={risk?.color}>
                    {risk ? `${risk.label} (${risk.score}/10)` : '—'}
                  </ValueCell>
                ))}

                {/* Distance to sea */}
                <LabelCell><MapPin size={13} color={t.textDim} /> מרחק מהים</LabelCell>
                {metrics.data.map(({ pl, d }) => (
                  <ValueCell key={pl.id}>
                    {d.seaDist != null ? `${fmt.num(d.seaDist)} מ׳` : '—'}
                  </ValueCell>
                ))}
              </Grid>
            )}

            {/* Footer with links to full pages */}
            <Footer>
              {plots.map(pl => (
                <FooterLink key={pl.id} href={`/plot/${pl.id}`}>
                  <ExternalLink size={12} /> חלקה {pl.number}
                </FooterLink>
              ))}
            </Footer>
          </>
        ) : (
          <EmptyCompare>
            <BarChart3 size={40} color={t.textDim} />
            <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>אין חלקות להשוואה</div>
            <div style={{ fontSize: 13, color: t.textSec }}>הוסיפו לפחות 2 חלקות להשוואה מהמפה</div>
          </EmptyCompare>
        )}
      </Panel>
    </>
  )
}

export default memo(CompareDrawer)
