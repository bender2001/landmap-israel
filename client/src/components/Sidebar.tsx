import React, { useState, useCallback, useEffect, useMemo, useRef as useRefHook } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { X, Phone, ChevronDown, ChevronRight, ChevronLeft, TrendingUp, TrendingDown, MapPin, FileText, Clock, Building2, Landmark, Info, ExternalLink, GitCompareArrows, Share2, Copy, Check, BarChart3, Construction, Globe, Sparkles, Printer, Navigation, Map as MapIcon2, Eye, Calculator, ClipboardCopy, Banknote, AlertTriangle } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { t, fadeInUp, mobile } from '../theme'
import { p, roi, fmt, calcScore, calcScoreBreakdown, getGrade, calcCAGR, calcTimeline, calcMonthly, zoningLabels, statusLabels, statusColors, daysOnMarket, zoningPipeline, pricePerSqm, pricePerDunam, pricePosition, calcRisk, findSimilarPlots, plotCenter, getLocationTags, generatePlotReport, calcAlternativeInvestments, nearestTrainStation, nearestHighway, calcBettermentTax, calcRentalYield, calcGrowthTrajectory, calcQuickInsight, investmentRecommendation } from '../utils'
import type { Plot } from '../types'
import { GoldButton, GhostButton, Badge, RadialScore, InfoTooltip, PriceAlertButton } from './UI'

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
const SidebarLocTags = styled.div`
  display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-top:4px;
`
const SidebarLocTag = styled.span<{$c:string}>`
  display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:700;
  padding:2px 7px;border-radius:${t.r.full};color:${pr=>pr.$c};
  background:${pr=>pr.$c}12;border:1px solid ${pr=>pr.$c}22;
`
const CloseBtn = styled.button`
  display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:${t.r.sm};
  background:transparent;border:1px solid ${t.border};color:${t.textSec};cursor:pointer;transition:all ${t.tr};flex-shrink:0;
  &:hover{background:${t.hover};color:${t.text};border-color:${t.goldBorder};}
`
const RecoBadge = styled.span<{$c:string}>`
  display:inline-flex;align-items:center;gap:4px;padding:3px 10px;
  background:${pr=>pr.$c}18;border:1px solid ${pr=>pr.$c}30;
  border-radius:${t.r.full};font-size:11px;font-weight:800;color:${pr=>pr.$c};
  font-family:${t.font};white-space:nowrap;
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

/* ── Score Breakdown ── */
const BreakdownWrap = styled.div`
  display:flex;flex-direction:column;gap:6px;padding:12px 14px;margin-bottom:16px;
  background:${t.surfaceLight};border:1px solid ${t.border};border-radius:${t.r.md};
  animation:${fadeSection} 0.45s 0.08s both;
`
const BreakdownTitle = styled.div`
  display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;
  color:${t.textDim};letter-spacing:0.3px;margin-bottom:2px;
`
const BreakdownRow = styled.div`
  display:flex;align-items:center;gap:8px;
`
const BreakdownIcon = styled.span`font-size:13px;flex-shrink:0;`
const BreakdownLabel = styled.span`font-size:11px;font-weight:600;color:${t.textSec};min-width:72px;`
const BreakdownBarOuter = styled.div`flex:1;height:6px;background:${t.bg};border-radius:3px;overflow:hidden;position:relative;`
const BreakdownBarInner = styled.div<{$pct:number;$c:string}>`
  position:absolute;top:0;left:0;height:100%;width:${pr=>pr.$pct}%;
  background:linear-gradient(90deg,${pr=>pr.$c},${pr=>pr.$c}CC);border-radius:3px;
  transition:width 0.6s cubic-bezier(0.32,0.72,0,1);
`
const BreakdownScore = styled.span<{$c:string}>`
  font-size:11px;font-weight:800;color:${pr=>pr.$c};min-width:36px;text-align:left;
`
const BreakdownDetail = styled.span`font-size:9px;color:${t.textDim};margin-inline-start:auto;`

function ScoreBreakdown({ plot }: { plot: Plot }) {
  const breakdown = useMemo(() => calcScoreBreakdown(plot), [plot])
  if (!breakdown) return null
  const grade = getGrade(breakdown.total)
  return (
    <BreakdownWrap>
      <BreakdownTitle>📊 פירוט ציון השקעה — {breakdown.total}/10</BreakdownTitle>
      {breakdown.factors.map(f => {
        const pct = f.maxScore > 0 ? (f.score / f.maxScore) * 100 : 0
        const color = pct >= 70 ? t.ok : pct >= 40 ? t.warn : t.err
        return (
          <BreakdownRow key={f.label} title={f.detail}>
            <BreakdownIcon>{f.icon}</BreakdownIcon>
            <BreakdownLabel>{f.label}</BreakdownLabel>
            <BreakdownBarOuter>
              <BreakdownBarInner $pct={pct} $c={color} />
            </BreakdownBarOuter>
            <BreakdownScore $c={color}>{f.score}/{f.maxScore}</BreakdownScore>
          </BreakdownRow>
        )
      })}
    </BreakdownWrap>
  )
}

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
let sectionIdCounter = 0
function Section({ icon: Icon, title, idx, children }: { icon: React.ElementType; title: string; idx: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(idx < 2)
  const [id] = useState(() => `sidebar-section-${++sectionIdCounter}`)
  return (
    <SectionWrap $i={idx}>
      <SectionHead
        $open={open}
        onClick={() => setOpen(o => !o)}
        role="button"
        aria-expanded={open}
        aria-controls={id}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o) } }}
      >
        <Icon size={16} color={t.gold} />{title}<span style={{ flex: 1 }} /><ChevronDown size={16} />
      </SectionHead>
      <SectionBody id={id} $open={open} role="region" aria-hidden={!open}>
        {children}
      </SectionBody>
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

/* ── Alternative Investment Comparison ── */
const AltInvestWrap = styled.div`
  margin-bottom:16px;padding:14px;background:${t.surfaceLight};
  border:1px solid ${t.border};border-radius:${t.r.md};
  animation:${fadeSection} 0.5s 0.2s both;
`
const AltInvestTitle = styled.div`
  font-size:11px;font-weight:700;color:${t.textDim};margin-bottom:12px;
  display:flex;align-items:center;gap:6px;text-transform:uppercase;letter-spacing:0.3px;
`
const AltInvestRow = styled.div<{$highlight?:boolean}>`
  display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;
  padding:8px 10px;margin-bottom:4px;
  background:${pr=>pr.$highlight ? 'rgba(16,185,129,0.06)' : 'transparent'};
  border:1px solid ${pr=>pr.$highlight ? 'rgba(16,185,129,0.15)' : 'transparent'};
  border-radius:${t.r.sm};transition:all ${t.tr};
  &:last-child{margin-bottom:0;}
`
const AltInvestName = styled.div`
  display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;
  color:${t.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
`
const AltInvestFV = styled.div`
  font-size:12px;font-weight:700;color:${t.textSec};text-align:left;white-space:nowrap;
`
const AltInvestReturn = styled.div<{$c:string}>`
  font-size:12px;font-weight:800;color:${pr=>pr.$c};text-align:left;white-space:nowrap;min-width:50px;
`
const AltInvestBar = styled.div<{$pct:number;$c:string}>`
  height:4px;border-radius:2px;background:${t.bg};overflow:hidden;
  grid-column:1/-1;margin-top:-2px;
  &::after{content:'';display:block;height:100%;width:${pr=>Math.min(100,Math.max(3,pr.$pct))}%;
    background:${pr=>pr.$c};border-radius:2px;transition:width 0.8s ease;}
`
const AltInvestWinner = styled.span`
  font-size:8px;font-weight:800;color:#10B981;background:rgba(16,185,129,0.12);
  padding:1px 6px;border-radius:${t.r.full};margin-inline-start:4px;
`

function AlternativeInvestments({ plot }: { plot: Plot }) {
  const alts = useMemo(() => calcAlternativeInvestments(plot), [plot])
  if (!alts || alts.length === 0) return null
  const maxReturn = Math.max(...alts.map(a => a.totalReturn))
  const winner = alts[0] // The plot is always first and should be the winner for good plots
  const isPlotBest = winner.totalReturn >= alts[1]?.totalReturn
  return (
    <AltInvestWrap>
      <AltInvestTitle>
        <Calculator size={12} color={t.gold} />
        השוואה מול השקעות חלופיות
      </AltInvestTitle>
      {alts.map((alt, i) => (
        <div key={alt.name}>
          <AltInvestRow $highlight={i === 0}>
            <AltInvestName>
              <span>{alt.emoji}</span> {alt.name}
              {i === 0 && isPlotBest && <AltInvestWinner>✓ מנצח</AltInvestWinner>}
            </AltInvestName>
            <AltInvestFV>{fmt.compact(alt.futureValue)}</AltInvestFV>
            <AltInvestReturn $c={alt.color}>+{alt.totalReturn}%</AltInvestReturn>
          </AltInvestRow>
          <AltInvestBar $pct={(alt.totalReturn / maxReturn) * 100} $c={alt.color} />
        </div>
      ))}
    </AltInvestWrap>
  )
}

/* ── Growth Trajectory Sparkline ── */
const GrowthWrap = styled.div`
  margin-bottom:16px;padding:14px;background:${t.surfaceLight};
  border:1px solid ${t.border};border-radius:${t.r.md};
  animation:${fadeSection} 0.5s 0.25s both;
`
const GrowthTitle = styled.div`
  font-size:11px;font-weight:700;color:${t.textDim};margin-bottom:12px;
  display:flex;align-items:center;gap:6px;text-transform:uppercase;letter-spacing:0.3px;
`
const GrowthSvg = styled.svg`width:100%;height:80px;overflow:visible;`
const GrowthLegend = styled.div`
  display:flex;align-items:center;justify-content:space-between;
  margin-top:8px;font-size:10px;color:${t.textDim};
`
const GrowthVal = styled.span<{$c?:string}>`font-weight:800;color:${pr=>pr.$c||t.gold};`

function GrowthTrajectory({ plot }: { plot: Plot }) {
  const trajectory = useMemo(() => calcGrowthTrajectory(plot), [plot])
  if (!trajectory || trajectory.length < 2) return null

  const values = trajectory.map(p => p.value)
  const minV = Math.min(...values) * 0.9
  const maxV = Math.max(...values) * 1.05
  const range = maxV - minV || 1
  const w = 300, h = 60, pad = 12

  const points = trajectory.map((pt, i) => ({
    x: pad + (i / (trajectory.length - 1)) * (w - pad * 2),
    y: h - pad - ((pt.value - minV) / range) * (h - pad * 2),
    ...pt,
  }))

  // Create smooth curve path
  const linePath = points.map((pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`
    const prev = points[i - 1]
    const cpx = (prev.x + pt.x) / 2
    return `C ${cpx} ${prev.y} ${cpx} ${pt.y} ${pt.x} ${pt.y}`
  }).join(' ')

  // Area fill path
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${h - pad} L ${points[0].x} ${h - pad} Z`

  const totalGrowth = trajectory.length >= 2
    ? Math.round(((trajectory[trajectory.length - 1].value - trajectory[0].value) / trajectory[0].value) * 100)
    : 0

  return (
    <GrowthWrap>
      <GrowthTitle>
        <TrendingUp size={12} color={t.ok} />
        מסלול צמיחה צפוי
      </GrowthTitle>
      <GrowthSvg viewBox={`0 0 ${w} ${h + 8}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={t.ok} stopOpacity="0.25" />
            <stop offset="100%" stopColor={t.ok} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <path d={areaPath} fill="url(#growthGrad)" />
        {/* Line */}
        <path d={linePath} fill="none" stroke={t.ok} strokeWidth="2" strokeLinecap="round" />
        {/* Data points */}
        {points.map((pt, i) => (
          <g key={i}>
            <circle cx={pt.x} cy={pt.y} r={pt.isCurrent ? 4 : 3} fill={pt.isCurrent ? t.gold : t.ok} stroke={t.surface} strokeWidth="1.5" />
            <text x={pt.x} y={pt.y - 8} textAnchor="middle" fill={pt.isCurrent ? t.gold : t.textDim} fontSize="7" fontWeight={pt.isCurrent ? '800' : '600'} fontFamily={t.font}>
              {fmt.compact(pt.value)}
            </text>
            <text x={pt.x} y={h + 4} textAnchor="middle" fill={t.textDim} fontSize="7" fontWeight="600" fontFamily={t.font}>
              {pt.label.length > 8 ? pt.label.slice(0, 8) + '…' : pt.label}
            </text>
          </g>
        ))}
      </GrowthSvg>
      <GrowthLegend>
        <span>היום → בנייה</span>
        <GrowthVal $c={t.ok}>+{totalGrowth}% צמיחה</GrowthVal>
      </GrowthLegend>
    </GrowthWrap>
  )
}

/* ── Rental Yield Estimate ── */
const RentalWrap = styled.div`
  margin-bottom:16px;padding:14px;background:${t.surfaceLight};
  border:1px solid ${t.border};border-radius:${t.r.md};
  animation:${fadeSection} 0.5s 0.3s both;
`
const RentalTitle = styled.div`
  font-size:11px;font-weight:700;color:${t.textDim};margin-bottom:10px;
  display:flex;align-items:center;gap:6px;text-transform:uppercase;letter-spacing:0.3px;
`
const RentalGrid = styled.div`display:grid;grid-template-columns:repeat(3,1fr);gap:8px;`
const RentalStat = styled.div`text-align:center;padding:8px 4px;background:${t.bg};border-radius:${t.r.sm};`
const RentalStatVal = styled.div<{$c?:string}>`font-size:14px;font-weight:800;color:${pr=>pr.$c||t.text};`
const RentalStatLabel = styled.div`font-size:9px;color:${t.textDim};margin-top:2px;font-weight:600;`
const RentalNote = styled.div`
  font-size:10px;color:${t.textDim};margin-top:8px;line-height:1.5;
  padding:6px 8px;background:rgba(59,130,246,0.05);border:1px solid rgba(59,130,246,0.1);
  border-radius:${t.r.sm};display:flex;align-items:flex-start;gap:4px;
`

function RentalYieldCard({ plot }: { plot: Plot }) {
  const rental = useMemo(() => calcRentalYield(plot), [plot])
  if (!rental) return null
  return (
    <RentalWrap>
      <RentalTitle>
        <Building2 size={12} color={t.gold} />
        תשואת שכירות משוערת (לאחר בנייה)
      </RentalTitle>
      <RentalGrid>
        <RentalStat>
          <RentalStatVal $c={t.gold}>{fmt.compact(rental.monthlyRent)}</RentalStatVal>
          <RentalStatLabel>שכ״ד חודשי</RentalStatLabel>
        </RentalStat>
        <RentalStat>
          <RentalStatVal $c={rental.grossYield >= 5 ? t.ok : t.warn}>{rental.grossYield}%</RentalStatVal>
          <RentalStatLabel>תשואה ברוטו</RentalStatLabel>
        </RentalStat>
        <RentalStat>
          <RentalStatVal $c={rental.netYield >= 3.5 ? t.ok : t.warn}>{rental.netYield}%</RentalStatVal>
          <RentalStatLabel>תשואה נטו</RentalStatLabel>
        </RentalStat>
      </RentalGrid>
      <RentalGrid style={{ marginTop: 6 }}>
        <RentalStat>
          <RentalStatVal>{rental.totalUnits}</RentalStatVal>
          <RentalStatLabel>יח״ד משוערות</RentalStatLabel>
        </RentalStat>
        <RentalStat>
          <RentalStatVal>{rental.avgUnitSize} מ״ר</RentalStatVal>
          <RentalStatLabel>דירה ממוצעת</RentalStatLabel>
        </RentalStat>
        <RentalStat>
          <RentalStatVal>₪{rental.rentPerSqm}</RentalStatVal>
          <RentalStatLabel>שכ״ד/מ״ר</RentalStatLabel>
        </RentalStat>
      </RentalGrid>
      <RentalNote>
        <Info size={10} style={{ flexShrink: 0, marginTop: 2 }} />
        הערכה בלבד על בסיס צפיפות וממוצעי שכירות באזור. התשואה בפועל תלויה בתוכנית הבנייה ותנאי השוק.
      </RentalNote>
    </RentalWrap>
  )
}

/* ── Quick Investment Insight Banner ── */
const QuickInsightBanner = styled.div<{$c:string}>`
  display:flex;align-items:center;gap:6px;padding:8px 12px;margin-bottom:12px;
  background:${pr=>pr.$c}0A;border:1px solid ${pr=>pr.$c}20;
  border-radius:${t.r.md};font-size:12px;font-weight:700;color:${pr=>pr.$c};
  direction:rtl;animation:${fadeSection} 0.4s ease-out both;
`

function QuickInsightBadge({ plot, allPlots }: { plot: Plot; allPlots?: Plot[] }) {
  const insight = useMemo(() => calcQuickInsight(plot, allPlots), [plot, allPlots])
  return (
    <QuickInsightBanner $c={insight.color}>
      <span style={{ fontSize: 16 }}>{insight.emoji}</span>
      {insight.text}
    </QuickInsightBanner>
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

/* ── Satellite Preview ── */
const SatPreviewWrap = styled.div`
  position:relative;width:100%;height:140px;border-radius:${t.r.md};overflow:hidden;
  margin-bottom:16px;border:1px solid ${t.border};
  animation:${fadeSection} 0.4s 0.05s both;
  cursor:pointer;transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};box-shadow:${t.sh.md};}
`
const SatImage = styled.img`
  width:100%;height:100%;object-fit:cover;display:block;
  transition:transform 0.4s ease;&:hover{transform:scale(1.05);}
`
const SatOverlay = styled.div`
  position:absolute;inset:0;
  background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,0.6) 100%);
  pointer-events:none;
`
const SatBadge = styled.span`
  position:absolute;top:8px;left:8px;
  display:inline-flex;align-items:center;gap:4px;
  padding:3px 8px;border-radius:${t.r.full};
  background:rgba(0,0,0,0.65);backdrop-filter:blur(8px);
  font-size:9px;font-weight:700;color:#fff;
  letter-spacing:0.3px;
`
const SatCoords = styled.span`
  position:absolute;bottom:8px;right:8px;
  padding:3px 8px;border-radius:${t.r.full};
  background:rgba(0,0,0,0.55);backdrop-filter:blur(8px);
  font-size:10px;font-weight:600;color:rgba(255,255,255,0.85);
  direction:ltr;
`
const SatPin = styled.div`
  position:absolute;top:50%;left:50%;transform:translate(-50%,-100%);
  width:24px;height:24px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));
  pointer-events:none;z-index:1;
`

/** Compute ESRI satellite tile URL from lat/lng */
function getSatelliteTileUrl(lat: number, lng: number, zoom: number = 17): string {
  const n = Math.pow(2, zoom)
  const x = Math.floor((lng + 180) / 360 * n)
  const latRad = lat * Math.PI / 180
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n)
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`
}

function SatellitePreview({ plot }: { plot: Plot }) {
  const center = plotCenter(plot.coordinates)
  if (!center) return null
  const { lat, lng } = center
  const tileUrl = getSatelliteTileUrl(lat, lng, 17)
  const mapsUrl = `https://www.google.com/maps/@${lat},${lng},18z/data=!1m1!1e1`
  return (
    <SatPreviewWrap onClick={() => window.open(mapsUrl, '_blank')}>
      <SatImage src={tileUrl} alt={`תצלום לוויין — ${plot.city}`} loading="lazy" />
      <SatOverlay />
      <SatPin>
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#D4A84B" stroke="#fff" strokeWidth="1.5"/>
          <circle cx="12" cy="9" r="2.5" fill="#fff"/>
        </svg>
      </SatPin>
      <SatBadge>🛰️ לוויין</SatBadge>
      <SatCoords>{lat.toFixed(4)}, {lng.toFixed(4)}</SatCoords>
    </SatPreviewWrap>
  )
}

/* ── Views / Popularity Badge ── */
const ViewsBadge = styled.div<{$hot?:boolean}>`
  display:inline-flex;align-items:center;gap:5px;padding:4px 10px;
  border-radius:${t.r.full};font-size:11px;font-weight:600;direction:rtl;
  background:${pr => pr.$hot ? 'rgba(239,68,68,0.08)' : 'rgba(99,102,241,0.06)'};
  border:1px solid ${pr => pr.$hot ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.15)'};
  color:${pr => pr.$hot ? '#EF4444' : '#818CF8'};
  animation:${fadeSection} 0.4s 0.1s both;
`

function PlotViewsBadge({ views }: { views?: number }) {
  if (!views || views <= 0) return null
  const isHot = views >= 50
  return (
    <ViewsBadge $hot={isHot}>
      <Eye size={12} />
      {views} צפיות
      {isHot && <span style={{ fontSize: 10 }}>🔥</span>}
    </ViewsBadge>
  )
}

/* ── Total Acquisition Cost Breakdown ── */
const CostBreakdownWrap = styled.div`
  padding:14px;margin-bottom:16px;
  background:${t.surfaceLight};border:1px solid ${t.border};border-radius:${t.r.md};
  animation:${fadeSection} 0.5s 0.16s both;direction:rtl;
`
const CostTitle = styled.div`
  font-size:11px;font-weight:700;color:${t.textDim};margin-bottom:10px;
  display:flex;align-items:center;gap:6px;text-transform:uppercase;letter-spacing:0.3px;
`
const CostRow = styled.div`
  display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:12px;
  border-bottom:1px dashed rgba(255,255,255,0.05);
  &:last-child{border-bottom:none;}
`
const CostLabel = styled.span<{$dim?:boolean}>`color:${pr=>pr.$dim?t.textDim:t.textSec};`
const CostVal = styled.span<{$c?:string;$bold?:boolean}>`
  font-weight:${pr=>pr.$bold?800:600};
  color:${pr=>pr.$c||t.text};font-family:${t.font};
`
const CostDivider = styled.div`
  height:1px;background:linear-gradient(90deg,transparent,${t.goldBorder},transparent);margin:8px 0;
`
const CostTotal = styled.div`
  display:flex;justify-content:space-between;align-items:center;padding:8px 12px;
  background:${t.goldDim};border:1px solid ${t.goldBorder};border-radius:${t.r.sm};margin-top:8px;
`
const CostTotalLabel = styled.span`font-size:13px;font-weight:700;color:${t.text};`
const CostTotalVal = styled.span`font-size:16px;font-weight:800;color:${t.gold};`

/** Calculate Israeli land acquisition costs */
function useAcquisitionCost(price: number) {
  return useMemo(() => {
    if (!price || price <= 0) return null
    // Purchase tax (מס רכישה) for investment property (not primary residence):
    // Up to ~6,055,070: 8%, above: 10% (2025-2026 brackets, simplified)
    const BRACKET_1 = 6_055_070
    let purchaseTax = 0
    if (price <= BRACKET_1) {
      purchaseTax = price * 0.08
    } else {
      purchaseTax = BRACKET_1 * 0.08 + (price - BRACKET_1) * 0.10
    }
    // Lawyer fees: ~0.5% + VAT (17%), min ~5,000
    const lawyerFees = Math.max(5000, price * 0.005 * 1.17)
    // Appraiser (שמאי): ~3,000-8,000 depending on plot size
    const appraiser = price > 2_000_000 ? 8000 : price > 500_000 ? 5000 : 3000
    // Broker fee: ~2% + VAT if applicable
    const brokerFee = price * 0.02 * 1.17
    const total = price + purchaseTax + lawyerFees + appraiser + brokerFee
    return {
      price,
      purchaseTax: Math.round(purchaseTax),
      purchaseTaxPct: ((purchaseTax / price) * 100).toFixed(1),
      lawyerFees: Math.round(lawyerFees),
      appraiser,
      brokerFee: Math.round(brokerFee),
      total: Math.round(total),
      overhead: Math.round(total - price),
      overheadPct: (((total - price) / price) * 100).toFixed(1),
    }
  }, [price])
}

/* ── Betterment Tax Card (היטל השבחה) ── */
const BettermentWrap = styled.div`
  padding:14px;margin-bottom:16px;
  background:linear-gradient(135deg,rgba(249,115,22,0.04),rgba(239,68,68,0.02));
  border:1px solid rgba(249,115,22,0.2);border-radius:${t.r.md};
  animation:${fadeSection} 0.5s 0.18s both;direction:rtl;
`
const BettermentTitle = styled.div`
  font-size:11px;font-weight:700;color:#F97316;margin-bottom:10px;
  display:flex;align-items:center;gap:6px;text-transform:uppercase;letter-spacing:0.3px;
`
const BettermentRow = styled.div`
  display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:12px;
  border-bottom:1px dashed rgba(255,255,255,0.04);
  &:last-child{border-bottom:none;}
`
const BettermentNote = styled.div`
  margin-top:10px;padding:8px 12px;
  background:rgba(249,115,22,0.06);border:1px dashed rgba(249,115,22,0.2);
  border-radius:${t.r.sm};font-size:10px;color:${t.textDim};line-height:1.6;
`

function BettermentTaxCard({ plot }: { plot: Plot }) {
  const betterment = useMemo(() => calcBettermentTax(plot), [plot])
  if (!betterment || betterment.estimatedTax <= 0) return null
  return (
    <BettermentWrap>
      <BettermentTitle>
        <AlertTriangle size={12} color="#F97316" />
        היטל השבחה (הערכה)
        <InfoTooltip text="היטל השבחה: 50% מעליית ערך הקרקע בעקבות שינוי ייעוד/תכנית. נגבה בעת מימוש — מכירה או קבלת היתר." pos="bottom" />
      </BettermentTitle>
      <BettermentRow>
        <CostLabel>שווי נוכחי</CostLabel>
        <CostVal>{fmt.compact(betterment.currentStageValue)}</CostVal>
      </BettermentRow>
      <BettermentRow>
        <CostLabel>שווי צפוי (סוף תהליך)</CostLabel>
        <CostVal>{fmt.compact(betterment.finalStageValue)}</CostVal>
      </BettermentRow>
      <BettermentRow>
        <CostLabel>עליית ערך</CostLabel>
        <CostVal $c={t.ok}>+{fmt.compact(betterment.valueIncrease)}</CostVal>
      </BettermentRow>
      <CostDivider />
      <BettermentRow>
        <CostLabel $dim>שיעור ההיטל</CostLabel>
        <CostVal>{betterment.taxRate}%</CostVal>
      </BettermentRow>
      <BettermentRow>
        <CostLabel>היטל השבחה משוער</CostLabel>
        <CostVal $c="#F97316" $bold>{fmt.compact(betterment.estimatedTax)}</CostVal>
      </BettermentRow>
      <BettermentNote>
        ⚠️ {betterment.label}. הסכום בפועל נקבע ע״י שמאי מקרקעין של הוועדה המקומית. פטורים: דירת מגורים יחידה בתנאים מסוימים. יש להתייעץ עם עו״ד.
      </BettermentNote>
    </BettermentWrap>
  )
}

function AcquisitionCostBreakdown({ price }: { price: number }) {
  const cost = useAcquisitionCost(price)
  const [expanded, setExpanded] = useState(false)
  if (!cost) return null
  return (
    <CostBreakdownWrap>
      <CostTitle>
        <Calculator size={12} color={t.gold} />
        עלות רכישה כוללת (הערכה)
        <InfoTooltip text="הערכה בלבד. מס רכישה לנכס שאינו דירה יחידה (8%/10%). שכ״ט עו״ד, שמאי ותיווך — אומדן שוק. התייעצו עם בעלי מקצוע." pos="bottom" />
      </CostTitle>
      <CostRow>
        <CostLabel>מחיר החלקה</CostLabel>
        <CostVal $bold>{fmt.compact(cost.price)}</CostVal>
      </CostRow>
      <CostRow>
        <CostLabel>מס רכישה ({cost.purchaseTaxPct}%)</CostLabel>
        <CostVal $c="#F59E0B">{fmt.compact(cost.purchaseTax)}</CostVal>
      </CostRow>
      {expanded && (
        <>
          <CostRow>
            <CostLabel $dim>שכ״ט עו״ד</CostLabel>
            <CostVal>{fmt.compact(cost.lawyerFees)}</CostVal>
          </CostRow>
          <CostRow>
            <CostLabel $dim>שמאי מקרקעין</CostLabel>
            <CostVal>{fmt.compact(cost.appraiser)}</CostVal>
          </CostRow>
          <CostRow>
            <CostLabel $dim>תיווך (2%+מע״מ)</CostLabel>
            <CostVal>{fmt.compact(cost.brokerFee)}</CostVal>
          </CostRow>
        </>
      )}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          background: 'none', border: 'none', color: t.textDim, fontSize: 10,
          fontWeight: 600, cursor: 'pointer', padding: '4px 0', fontFamily: t.font,
          display: 'flex', alignItems: 'center', gap: 4, transition: `color ${t.tr}`,
        }}
      >
        <ChevronDown size={10} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        {expanded ? 'הסתר פירוט' : 'הצג פירוט מלא'}
      </button>
      <CostDivider />
      <CostTotal>
        <CostTotalLabel>סה״כ עלות רכישה</CostTotalLabel>
        <CostTotalVal>{fmt.compact(cost.total)}</CostTotalVal>
      </CostTotal>
      <div style={{ fontSize: 10, color: t.textDim, marginTop: 6, textAlign: 'center' }}>
        +{cost.overheadPct}% מעל המחיר ({fmt.compact(cost.overhead)} עלויות נלוות)
      </div>
    </CostBreakdownWrap>
  )
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

/* ── Copy Report Button ── */
const CopyReportBtn = styled.button<{$copied?:boolean}>`
  display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 16px;
  background:${pr=>pr.$copied?'rgba(16,185,129,0.1)':'transparent'};
  color:${pr=>pr.$copied?'#10B981':t.textSec};
  border:1px solid ${pr=>pr.$copied?'#10B981':t.border};border-radius:${t.r.md};
  font-weight:600;font-size:13px;font-family:${t.font};cursor:pointer;transition:all ${t.tr};
  white-space:nowrap;
  &:hover{border-color:${t.goldBorder};color:${t.gold};background:${t.goldDim};}
  ${mobile}{padding:10px 10px;span{display:none;}}
`

/* ── Mortgage Quick Estimate Badge ── */
const MortgageBadge = styled.div`
  grid-column:1 / -1;display:flex;align-items:center;justify-content:center;gap:8px;
  padding:10px 14px;background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.15);
  border-radius:${t.r.md};font-size:12px;color:${t.info};font-weight:600;
  animation:${fadeSection} 0.5s 0.12s both;direction:rtl;
`
const MortgageVal = styled.span`font-weight:800;font-size:14px;color:${t.text};`
const MortgageNote = styled.span`font-size:10px;color:${t.textDim};font-weight:500;`

/* ── Sticky Mini Header (appears on scroll) ── */
const stickySlide = keyframes`from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}`
const StickyHeader = styled.div<{$show:boolean}>`
  position:absolute;top:0;left:0;right:0;z-index:3;
  display:${pr=>pr.$show?'flex':'none'};align-items:center;gap:10px;
  padding:8px 16px;direction:rtl;
  background:${t.surface};border-bottom:2px solid ${t.goldBorder};
  box-shadow:0 4px 20px rgba(0,0,0,0.3);
  animation:${stickySlide} 0.2s ease-out;
`
const StickyGrade = styled.span<{$c:string}>`
  display:inline-flex;align-items:center;justify-content:center;
  width:28px;height:28px;border-radius:50%;font-size:11px;font-weight:800;
  border:2px solid ${pr=>pr.$c};color:${pr=>pr.$c};flex-shrink:0;
`
const StickyInfo = styled.div`flex:1;min-width:0;`
const StickyTitle = styled.div`font-size:12px;font-weight:700;color:${t.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`
const StickyPrice = styled.span`font-size:14px;font-weight:800;color:${t.gold};white-space:nowrap;`
const StickyCta = styled.button`
  padding:6px 14px;background:linear-gradient(135deg,${t.gold},${t.goldBright});
  color:${t.bg};border:none;border-radius:${t.r.full};font-weight:700;font-size:11px;
  font-family:${t.font};cursor:pointer;transition:all ${t.tr};white-space:nowrap;flex-shrink:0;
  &:hover{box-shadow:${t.sh.glow};transform:scale(1.03);}
`

/* ── Price Thermometer Gauge (Madlan-style market position) ── */
const ThermWrap = styled.div`
  padding:14px;margin-bottom:16px;
  background:${t.surfaceLight};border:1px solid ${t.border};border-radius:${t.r.md};
  animation:${fadeSection} 0.5s 0.13s both;direction:rtl;
`
const ThermTitle = styled.div`
  font-size:11px;font-weight:700;color:${t.textDim};margin-bottom:12px;
  display:flex;align-items:center;gap:6px;text-transform:uppercase;letter-spacing:0.3px;
`
const ThermTrack = styled.div`
  position:relative;height:8px;border-radius:4px;overflow:visible;
  background:linear-gradient(90deg,#10B981 0%,#F59E0B 50%,#EF4444 100%);
  margin:16px 0 8px;
`
const ThermMarker = styled.div<{$pct:number}>`
  position:absolute;top:50%;left:${pr=>Math.max(2,Math.min(98,pr.$pct))}%;
  transform:translate(-50%,-50%);width:18px;height:18px;
  border-radius:50%;background:${t.bg};border:3px solid ${t.gold};
  box-shadow:0 0 0 3px rgba(212,168,75,0.25),0 2px 8px rgba(0,0,0,0.4);
  transition:left 0.8s cubic-bezier(0.32,0.72,0,1);z-index:1;
`
const ThermMarkerLabel = styled.div<{$pct:number}>`
  position:absolute;top:-22px;left:${pr=>Math.max(8,Math.min(92,pr.$pct))}%;
  transform:translateX(-50%);
  font-size:10px;font-weight:800;color:${t.gold};white-space:nowrap;
  background:${t.bg};padding:1px 6px;border-radius:${t.r.sm};
  border:1px solid ${t.goldBorder};
  transition:left 0.8s cubic-bezier(0.32,0.72,0,1);
`
const ThermAvgMarker = styled.div<{$pct:number}>`
  position:absolute;top:-4px;left:${pr=>Math.max(2,Math.min(98,pr.$pct))}%;
  transform:translateX(-50%);width:2px;height:16px;
  background:${t.text};border-radius:1px;opacity:0.6;z-index:0;
`
const ThermAvgLabel = styled.div<{$pct:number}>`
  position:absolute;bottom:-18px;left:${pr=>Math.max(8,Math.min(92,pr.$pct))}%;
  transform:translateX(-50%);
  font-size:8px;font-weight:600;color:${t.textDim};white-space:nowrap;
`
const ThermLabels = styled.div`
  display:flex;justify-content:space-between;font-size:9px;color:${t.textDim};margin-top:14px;
`
const ThermSummary = styled.div<{$c:string}>`
  display:flex;align-items:center;justify-content:center;gap:6px;
  margin-top:10px;padding:6px 12px;
  background:${pr=>pr.$c}0C;border:1px solid ${pr=>pr.$c}22;
  border-radius:${t.r.sm};font-size:12px;font-weight:700;color:${pr=>pr.$c};
`

function PriceThermometer({ plot, allPlots }: { plot: Plot; allPlots: Plot[] }) {
  const data = useMemo(() => {
    const plotPpd = pricePerDunam(plot)
    if (plotPpd <= 0) return null

    // Get price-per-dunam for all plots in the same city
    const cityPlots = allPlots.filter(pl => pl.city === plot.city)
    const allPpd = allPlots.map(pricePerDunam).filter(v => v > 0)
    const cityPpd = cityPlots.map(pricePerDunam).filter(v => v > 0)

    if (allPpd.length < 3) return null

    const allMin = Math.min(...allPpd)
    const allMax = Math.max(...allPpd)
    const allAvg = Math.round(allPpd.reduce((s, v) => s + v, 0) / allPpd.length)
    const cityAvg = cityPpd.length >= 2
      ? Math.round(cityPpd.reduce((s, v) => s + v, 0) / cityPpd.length)
      : null

    const range = allMax - allMin
    if (range <= 0) return null

    // Calculate percentile position (0-100)
    const pct = ((plotPpd - allMin) / range) * 100

    // Determine verdict
    const diff = cityAvg ? ((plotPpd - cityAvg) / cityAvg) * 100 : ((plotPpd - allAvg) / allAvg) * 100
    let verdict: { text: string; emoji: string; color: string }
    if (diff < -15) verdict = { text: 'מחיר אטרקטיבי מאוד', emoji: '🟢', color: t.ok }
    else if (diff < -5) verdict = { text: 'מתחת לממוצע', emoji: '✅', color: t.ok }
    else if (diff <= 5) verdict = { text: 'סביב הממוצע', emoji: '⚖️', color: t.warn }
    else if (diff <= 20) verdict = { text: 'מעל הממוצע', emoji: '⚠️', color: '#F97316' }
    else verdict = { text: 'מחיר גבוה', emoji: '🔴', color: t.err }

    return {
      plotPpd, allMin, allMax, allAvg, cityAvg, pct,
      avgPct: ((allAvg - allMin) / range) * 100,
      cityAvgPct: cityAvg ? ((cityAvg - allMin) / range) * 100 : null,
      verdict, diff: Math.round(diff),
    }
  }, [plot, allPlots])

  if (!data) return null

  return (
    <ThermWrap>
      <ThermTitle>
        <TrendingUp size={12} color={t.gold} />
        מדד מחיר לדונם — מיקום בשוק
      </ThermTitle>
      <div style={{ position: 'relative', margin: '20px 4px 22px' }}>
        <ThermTrack />
        <ThermMarkerLabel $pct={data.pct}>
          ₪{fmt.num(data.plotPpd)}
        </ThermMarkerLabel>
        <ThermMarker $pct={data.pct} />
        <ThermAvgMarker $pct={data.avgPct} />
        <ThermAvgLabel $pct={data.avgPct}>ממוצע ₪{fmt.num(data.allAvg)}</ThermAvgLabel>
        {data.cityAvgPct != null && data.cityAvg != null && Math.abs(data.cityAvgPct - data.avgPct) > 8 && (
          <>
            <ThermAvgMarker $pct={data.cityAvgPct} />
            <ThermAvgLabel $pct={data.cityAvgPct} style={{ bottom: -28 }}>עיר ₪{fmt.num(data.cityAvg)}</ThermAvgLabel>
          </>
        )}
      </div>
      <ThermLabels>
        <span>₪{fmt.num(data.allMin)} (זול)</span>
        <span>₪{fmt.num(data.allMax)} (יקר)</span>
      </ThermLabels>
      <ThermSummary $c={data.verdict.color}>
        {data.verdict.emoji} {data.verdict.text}
        {data.diff !== 0 && (
          <span style={{ fontWeight: 500, fontSize: 11 }}>
            ({data.diff > 0 ? '+' : ''}{data.diff}% מהממוצע)
          </span>
        )}
      </ThermSummary>
    </ThermWrap>
  )
}

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
  const [reportCopied, setReportCopied] = useState(false)
  const [showStickyHeader, setShowStickyHeader] = useState(false)

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
    if (plot && bodyRef.current) { bodyRef.current.scrollTop = 0; setShowStickyHeader(false) }
  }, [plot?.id])

  // Track scroll position for sticky header
  useEffect(() => {
    const body = bodyRef.current
    if (!body || !open) return
    const handler = () => setShowStickyHeader(body.scrollTop > 120)
    body.addEventListener('scroll', handler, { passive: true })
    return () => body.removeEventListener('scroll', handler)
  }, [open])

  // Reset copied state when plot changes
  useEffect(() => { setCopied(false); setReportCopied(false) }, [plot?.id])

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

  const handleCopyReport = useCallback(async () => {
    if (!plot) return
    const report = generatePlotReport(plot, plots)
    try {
      await navigator.clipboard.writeText(report)
      setReportCopied(true)
      setTimeout(() => setReportCopied(false), 2500)
    } catch { /* clipboard not available */ }
  }, [plot, plots])

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
  const locTags = getLocationTags(plot)

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
              {(() => { const reco = investmentRecommendation(plot); return <RecoBadge $c={reco.color}>{reco.emoji} {reco.text}</RecoBadge> })()}
              {dom && <Badge $color={dom.color}>{dom.label}</Badge>}
            </Badges>
            <CloseBtn ref={closeBtnRef} onClick={onClose} aria-label="סגור"><X size={18} /></CloseBtn>
          </TopRow>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
            <RadialScore score={score} grade={grade.grade} color={grade.color} size={52} strokeWidth={4} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Title>חלקה {plot.number} · גוש {d.block}</Title>
              <City>{plot.city}</City>
              {locTags.length > 0 && (
                <SidebarLocTags>
                  {locTags.map((tag, i) => <SidebarLocTag key={i} $c={tag.color}>{tag.icon} {tag.label}</SidebarLocTag>)}
                </SidebarLocTags>
              )}
              <div style={{ fontSize: 11, color: grade.color, fontWeight: 700, marginTop: 2 }}>
                {score}/10 · {grade.grade === 'A+' ? 'מצוין+' : grade.grade === 'A' ? 'מצוין' : grade.grade === 'A-' ? 'טוב מאוד' : grade.grade === 'B+' ? 'טוב' : grade.grade === 'B' ? 'סביר' : grade.grade === 'B-' ? 'מתחת לממוצע' : 'חלש'}
              </div>
            </div>
          </div>
        </Header>

        <div style={{ position: 'relative', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <StickyHeader $show={showStickyHeader}>
            <StickyGrade $c={grade.color}>{grade.grade}</StickyGrade>
            <StickyInfo>
              <StickyTitle>חלקה {plot.number} · {plot.city}</StickyTitle>
            </StickyInfo>
            <StickyPrice>{fmt.compact(d.price)}</StickyPrice>
            {onLead && <StickyCta onClick={onLead}><Phone size={12} /> פרטים</StickyCta>}
          </StickyHeader>
        <Body ref={bodyRef}>
          {/* Satellite Preview — visual context like Madlan */}
          <SatellitePreview plot={plot} />

          {/* Views / Popularity Social Proof */}
          {(plot.views ?? 0) > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <PlotViewsBadge views={plot.views} />
            </div>
          )}

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
            <MetricCard><MetricLabel>מחיר <InfoTooltip text="מחיר הנכס הנוכחי כפי שפורסם. מחיר סופי עשוי להשתנות במו״מ." pos="bottom" /></MetricLabel><MetricVal $gold>{fmt.compact(d.price)}</MetricVal></MetricCard>
            <MetricCard><MetricLabel>שטח <InfoTooltip text="שטח החלקה ברוטו. דונם = 1,000 מ״ר. שטח בנייה בפועל תלוי בתב״ע." pos="bottom" /></MetricLabel><MetricVal>{d.size >= 1000 ? `${fmt.dunam(d.size)} דונם` : `${fmt.num(d.size)} מ״ר`}</MetricVal></MetricCard>
            {ppd > 0 && <MetricCard><MetricLabel>₪ / דונם <InfoTooltip text="מחיר לדונם — מאפשר השוואה בין חלקות בגדלים שונים. ככל שנמוך יותר, כך המחיר אטרקטיבי יותר." pos="bottom" /></MetricLabel><MetricVal>{fmt.num(ppd)}</MetricVal></MetricCard>}
            <MetricCard><MetricLabel>תשואה <InfoTooltip text="תשואה צפויה (ROI) — אחוז הרווח הנקי מהשקעה עד למימוש. מבוססת על שווי חזוי ושלב תכנוני." pos="bottom" /></MetricLabel><MetricVal $gold={r > 0}>{fmt.pct(r)}</MetricVal></MetricCard>
            {/* Quick mortgage estimate — like Madlan's affordability indicator */}
            {(() => {
              const mortgage = d.price > 0 ? calcMonthly(d.price, 0.5, 0.06, 15) : null
              if (!mortgage) return null
              return (
                <MortgageBadge title="הערכת החזר חודשי: 50% מימון, ריבית 6%, 15 שנים">
                  <Banknote size={14} />
                  <span>החזר חודשי:</span>
                  <MortgageVal>{fmt.price(mortgage.monthly)}</MortgageVal>
                  <MortgageNote>(50% LTV · 6% · 15שנ׳)</MortgageNote>
                </MortgageBadge>
              )
            })()}
          </MetricsGrid>

          {/* Quick Investment Insight — one-line contextual summary */}
          <QuickInsightBadge plot={plot} allPlots={plots} />

          {/* Price Thermometer Gauge — visual market position indicator (like Madlan) */}
          {plots && plots.length >= 3 && <PriceThermometer plot={plot} allPlots={plots} />}

          {/* Score Breakdown — shows WHY the plot got its grade */}
          <ScoreBreakdown plot={plot} />

          {/* Total Acquisition Cost Breakdown — critical for investors */}
          {d.price > 0 && <AcquisitionCostBreakdown price={d.price} />}

          {/* Betterment Tax (היטל השבחה) — critical cost for Israeli land investors */}
          <BettermentTaxCard plot={plot} />

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

          {/* Alternative Investment Comparison — show ROI vs bank, bonds, S&P 500 */}
          <AlternativeInvestments plot={plot} />

          {/* Growth Trajectory Sparkline — visual path from current to future value */}
          <GrowthTrajectory plot={plot} />

          {/* Rental Yield Estimate — post-development income potential */}
          <RentalYieldCard plot={plot} />

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
            <Row><Label>ציון <InfoTooltip text="ציון כולל 1-10 המשקלל מחיר, תשואה, שלב תכנוני, מיקום וגודל. A+ = מעולה, C = חלש." /></Label><Val $c={grade.color}>{score}/10 ({grade.grade})</Val></Row>
            <Row><Label>שווי חזוי <InfoTooltip text="הערכת שווי הנכס לאחר השלמת כל שלבי התכנון והבנייה. מבוסס על עסקאות דומות ומגמות שוק." /></Label><Val>{fmt.compact(d.projected)}</Val></Row>
            {cagr && <Row><Label>CAGR <InfoTooltip text="שיעור צמיחה שנתי ממוצע (Compound Annual Growth Rate). מודד את קצב עליית הערך בממוצע לשנה." /></Label><Val $c={t.ok}>{cagr.cagr}% ({cagr.years} שנים)</Val></Row>}
            <Row><Label>מוכנות <InfoTooltip text="רמת המוכנות של החלקה לבנייה. משקף את השלב התכנוני הנוכחי ואת הקרבה לקבלת היתר." /></Label><Val>{d.readiness || '—'}</Val></Row>
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
                {/* Train station proximity badge */}
                {(() => {
                  const station = nearestTrainStation(plot)
                  if (!station) return null
                  const isClose = station.distance <= 2000
                  const isMedium = station.distance <= 5000
                  return (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                      background: isClose ? 'rgba(139,92,246,0.1)' : 'transparent',
                      border: `1px solid ${isClose ? 'rgba(139,92,246,0.3)' : isMedium ? 'rgba(139,92,246,0.15)' : t.border}`,
                      borderRadius: t.r.full, fontSize: 11, fontWeight: 600,
                      color: isClose ? '#8B5CF6' : isMedium ? '#A78BFA' : t.textSec,
                    }} title={`תחנת ${station.name}`}>
                      🚂 {station.distance < 1000 ? `${station.distance} מ׳` : `${(station.distance / 1000).toFixed(1)} ק״מ`}
                      {isClose && <span style={{ fontSize: 9, fontWeight: 800 }}>רכבת!</span>}
                    </div>
                  )
                })()}
                {/* Highway proximity badge */}
                {(() => {
                  const hw = nearestHighway(plot)
                  if (!hw || hw.distance > 15000) return null
                  const isClose = hw.distance <= 3000
                  return (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                      background: isClose ? 'rgba(59,130,246,0.06)' : 'transparent',
                      border: `1px solid ${isClose ? 'rgba(59,130,246,0.15)' : t.border}`,
                      borderRadius: t.r.full, fontSize: 11, fontWeight: 600,
                      color: isClose ? '#60A5FA' : t.textSec,
                    }} title={hw.name}>
                      🛣️ {hw.distance < 1000 ? `${hw.distance} מ׳` : `${(hw.distance / 1000).toFixed(1)} ק״מ`}
                    </div>
                  )
                })()}
              </div>
            )}
            {/* Train station proximity — detailed */}
            {(() => {
              const station = nearestTrainStation(plot)
              if (!station) return null
              const distLabel = station.distance < 1000 ? `${station.distance} מ׳` : `${(station.distance / 1000).toFixed(1)} ק״מ`
              return (
                <Row>
                  <Label>🚂 תחנת רכבת</Label>
                  <Val $c={station.distance <= 2000 ? '#8B5CF6' : station.distance <= 5000 ? t.textSec : t.textDim}>
                    {station.name} ({distLabel})
                  </Val>
                </Row>
              )
            })()}
            {/* Highway proximity — detailed */}
            {(() => {
              const hw = nearestHighway(plot)
              if (!hw || hw.distance > 20000) return null
              const distLabel = hw.distance < 1000 ? `${hw.distance} מ׳` : `${(hw.distance / 1000).toFixed(1)} ק״מ`
              return (
                <Row>
                  <Label>🛣️ כביש ראשי</Label>
                  <Val $c={hw.distance <= 3000 ? '#60A5FA' : t.textSec}>{hw.name.replace('מחלף ', '')} ({distLabel})</Val>
                </Row>
              )
            })()}
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
        </div>

        <Footer>
          <GoldButton style={{ flex: 1 }} onClick={onLead}><Phone size={16} />קבל פרטים</GoldButton>
          <PriceAlertButton plotId={plot.id} onToggle={(active) => {
            // Toast feedback would be nice but we don't have toast context here
          }} />
          <ShareBtn $copied={copied} onClick={handleShare} aria-label="שתף חלקה">
            {copied ? <Check size={15} /> : <Share2 size={15} />}
          </ShareBtn>
          {onToggleCompare && (
            <CompareBtn $active={isCompared} onClick={() => onToggleCompare(plot.id)} aria-label={isCompared ? 'הסר מהשוואה' : 'הוסף להשוואה'}>
              <GitCompareArrows size={15} />
            </CompareBtn>
          )}
          <CopyReportBtn $copied={reportCopied} onClick={handleCopyReport} aria-label="העתק דוח השקעה" title="העתק דוח השקעה ללוח">
            {reportCopied ? <Check size={15} /> : <ClipboardCopy size={15} />}
            <span>{reportCopied ? 'הועתק!' : 'דוח'}</span>
          </CopyReportBtn>
          <PrintBtn onClick={() => window.print()} aria-label="הדפס דוח" title="הדפס דוח השקעה">
            <Printer size={15} />
          </PrintBtn>
          <FullPageLink onClick={() => navigate(`/plot/${plot.id}`)}><ExternalLink size={14} />עמוד מלא</FullPageLink>
        </Footer>
      </Panel>
    </>
  )
}
