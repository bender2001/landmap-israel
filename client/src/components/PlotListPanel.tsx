import { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import { List, X, MapPin, TrendingUp, TrendingDown, Ruler, ChevronRight, ChevronLeft, BarChart3, ArrowDown, ArrowUp, Minus, ExternalLink, Activity, ChevronDown as LoadMoreIcon, Download, Share2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { t, mobile } from '../theme'
import { p, roi, fmt, calcScore, getGrade, pricePerSqm, pricePerDunam, statusColors, statusLabels, daysOnMarket, pricePosition, calcAggregateStats, plotDistanceFromUser, fmtDistance, zoningPipeline, exportPlotsCsv } from '../utils'
import { Skeleton } from './UI'
import type { Plot } from '../types'

const PAGE_SIZE = 20

/* ── Animations ── */
const slideIn = keyframes`from{transform:translateX(-100%);opacity:0}to{transform:translateX(0);opacity:1}`
const fadeIn = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}`

/* ── Styled ── */
const Overlay = styled.div<{ $open: boolean }>`
  position:fixed;inset:0;z-index:${t.z.sidebar - 2};
  background:rgba(0,0,0,0.3);backdrop-filter:blur(2px);
  opacity:${pr => pr.$open ? 1 : 0};pointer-events:${pr => pr.$open ? 'auto' : 'none'};
  transition:opacity 0.3s;display:none;
  ${mobile}{display:block;}
`

const Panel = styled.aside<{ $open: boolean }>`
  position:fixed;top:0;left:0;bottom:0;z-index:${t.z.sidebar - 1};
  width:340px;max-width:calc(100vw - 48px);
  background:${t.surface};border-right:1px solid ${t.border};
  display:flex;flex-direction:column;
  transform:translateX(${pr => pr.$open ? '0' : '-100%'});
  transition:transform 0.35s cubic-bezier(0.32,0.72,0,1);
  box-shadow:${t.sh.xl};
  ${mobile}{width:100vw;max-width:100vw;}
`

const GoldBar = styled.div`height:2px;background:linear-gradient(90deg,transparent,${t.gold},${t.goldBright},${t.gold},transparent);flex-shrink:0;`

const Header = styled.div`
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 16px;border-bottom:1px solid ${t.border};
  direction:rtl;flex-shrink:0;
`

const Title = styled.h3`
  font-size:15px;font-weight:700;color:${t.text};margin:0;
  display:flex;align-items:center;gap:8px;font-family:${t.font};
`

const Count = styled.span`
  font-size:12px;font-weight:700;color:${t.gold};
  background:${t.goldDim};padding:2px 8px;border-radius:${t.r.full};
`

const CloseBtn = styled.button`
  display:flex;align-items:center;justify-content:center;width:30px;height:30px;
  border-radius:${t.r.sm};background:transparent;border:1px solid ${t.border};
  color:${t.textSec};cursor:pointer;transition:all ${t.tr};
  &:hover{background:${t.hover};color:${t.text};border-color:${t.goldBorder};}
`

const ExportBtn = styled.button`
  display:flex;align-items:center;justify-content:center;gap:5px;
  padding:5px 12px;border-radius:${t.r.sm};
  background:transparent;border:1px solid ${t.border};
  color:${t.textSec};cursor:pointer;font-size:11px;font-weight:600;font-family:${t.font};
  transition:all ${t.tr};white-space:nowrap;
  &:hover{background:${t.goldDim};color:${t.gold};border-color:${t.goldBorder};}
`

const Body = styled.div`
  flex:1;overflow-y:auto;padding:8px;direction:rtl;
  scroll-behavior:smooth;
`

const EmptyState = styled.div`
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:48px 24px;text-align:center;color:${t.textDim};gap:12px;
`

/* ── Plot Item ── */
const ItemWrap = styled.div<{ $active: boolean; $i: number; $gradeColor?: string }>`
  display:flex;flex-direction:column;width:100%;padding:12px 14px;margin-bottom:6px;
  background:${pr => pr.$active ? t.goldDim : t.bg};
  border:1px solid ${pr => pr.$active ? t.goldBorder : t.border};
  border-radius:${t.r.md};cursor:pointer;font-family:${t.font};direction:rtl;
  text-align:right;transition:all ${t.tr};
  animation:${fadeIn} 0.3s ease-out both;
  animation-delay:${pr => Math.min(pr.$i * 0.03, 0.5)}s;
  border-right:3px solid ${pr => pr.$active ? t.gold : pr.$gradeColor || t.border};
  &:hover{background:${t.hover};border-color:${t.goldBorder};border-right-color:${pr => pr.$gradeColor || t.goldBorder};transform:translateX(-2px);}
  ${pr => pr.$active && `box-shadow:inset 3px 0 0 ${t.gold};`}
`

const ItemTop = styled.div`display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;`

const ItemCity = styled.span`font-size:14px;font-weight:700;color:${t.text};`

const ItemBadge = styled.span<{ $c: string }>`
  font-size:10px;font-weight:700;padding:1px 7px;border-radius:${t.r.full};
  color:${pr => pr.$c};background:${pr => pr.$c}18;
`

/* ── New / Hot Listing Badges ── */
const newPulse = keyframes`0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,0.3)}50%{box-shadow:0 0 0 4px rgba(59,130,246,0)}`
const hotPulse = keyframes`0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.3)}50%{box-shadow:0 0 0 4px rgba(239,68,68,0)}`
const NewBadge = styled.span`
  display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:800;
  padding:2px 8px;border-radius:${t.r.full};color:#3B82F6;
  background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.25);
  animation:${newPulse} 2.5s ease-in-out infinite;white-space:nowrap;
`
const HotBadge = styled.span`
  display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:800;
  padding:2px 8px;border-radius:${t.r.full};color:#EF4444;
  background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);
  animation:${hotPulse} 2s ease-in-out infinite;white-space:nowrap;
`

const ItemGrade = styled.span<{ $c: string }>`
  font-size:11px;font-weight:800;padding:2px 6px;border-radius:${t.r.sm};
  color:${pr => pr.$c};border:1px solid ${pr => pr.$c}44;background:${t.bg};
`

const ItemBlock = styled.div`font-size:11px;color:${t.textDim};margin-bottom:8px;`

const Metrics = styled.div`display:flex;align-items:center;gap:12px;`

const Metric = styled.div`
  display:flex;align-items:center;gap:4px;font-size:12px;color:${t.textSec};
  svg{flex-shrink:0;color:${t.textDim};}
`

const MetricVal = styled.span<{ $gold?: boolean }>`font-weight:700;color:${pr => pr.$gold ? t.gold : t.text};`

const ItemDom = styled.span<{ $c: string }>`
  font-size:10px;font-weight:600;color:${pr => pr.$c};margin-inline-start:auto;
`

const DetailLink = styled.div.attrs({ role: 'button', tabIndex: 0 })`
  display:flex;align-items:center;justify-content:center;width:28px;height:28px;
  border-radius:${t.r.sm};border:1px solid ${t.border};background:transparent;
  color:${t.textDim};cursor:pointer;transition:all ${t.tr};flex-shrink:0;
  margin-inline-start:auto;
  &:hover{border-color:${t.goldBorder};color:${t.gold};background:${t.goldDim};}
`

/* ── Distance Badge ── */
const DistanceBadge = styled.span`
  display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;
  padding:1px 7px;border-radius:${t.r.full};color:${t.info};
  background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.2);
  white-space:nowrap;
`

/* ── Price Position Badge ── */
const PricePosTag = styled.span<{ $c: string }>`
  display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;
  padding:1px 7px;border-radius:${t.r.full};color:${pr => pr.$c};
  background:${pr => pr.$c}12;border:1px solid ${pr => pr.$c}28;
  white-space:nowrap;
`

/* ── Summary Stats Bar ── */
const SummaryBar = styled.div`
  display:grid;grid-template-columns:repeat(3,1fr);gap:1px;
  padding:0;margin:0;border-bottom:1px solid ${t.border};
  background:${t.border};flex-shrink:0;
`
const SummaryStat = styled.div`
  display:flex;flex-direction:column;align-items:center;gap:2px;
  padding:10px 8px;background:${t.surface};
`
const SummaryStatVal = styled.div`font-size:14px;font-weight:800;color:${t.gold};font-family:${t.font};`
const SummaryStatLabel = styled.div`font-size:9px;font-weight:600;color:${t.textDim};text-transform:uppercase;letter-spacing:0.3px;`

/* ── Grade Distribution Bar ── */
const GradeDistWrap = styled.div`
  padding:8px 14px;border-bottom:1px solid ${t.border};flex-shrink:0;direction:rtl;
`
const GradeDistTitle = styled.div`
  display:flex;align-items:center;gap:6px;font-size:10px;font-weight:700;color:${t.textDim};
  margin-bottom:6px;letter-spacing:0.3px;
`
const GradeDistBar = styled.div`
  display:flex;align-items:center;gap:0;height:8px;border-radius:4px;overflow:hidden;
  background:${t.surfaceLight};
`
const GradeDistSegment = styled.div<{ $w: number; $c: string }>`
  height:100%;width:${pr => pr.$w}%;min-width:${pr => pr.$w > 0 ? '2px' : '0'};
  background:${pr => pr.$c};transition:width 0.5s cubic-bezier(0.32,0.72,0,1);
`
const GradeDistLegend = styled.div`
  display:flex;align-items:center;gap:10px;margin-top:5px;flex-wrap:wrap;
`
const GradeDistItem = styled.div`
  display:flex;align-items:center;gap:3px;font-size:9px;color:${t.textSec};font-weight:600;
`
const GradeDistDot = styled.span<{ $c: string }>`
  width:6px;height:6px;border-radius:50%;background:${pr => pr.$c};flex-shrink:0;
`

/* ── Toggle Button (always visible) ── */
const ToggleBtn = styled.button<{ $open: boolean }>`
  position:fixed;top:50%;left:${pr => pr.$open ? '340px' : '0'};
  z-index:${t.z.sidebar - 1};transform:translateY(-50%);
  width:28px;height:64px;
  background:${t.surface};border:1px solid ${t.goldBorder};
  border-left:${pr => pr.$open ? 'none' : `1px solid ${t.goldBorder}`};
  border-radius:${pr => pr.$open ? `0 ${t.r.sm} ${t.r.sm} 0` : `0 ${t.r.sm} ${t.r.sm} 0`};
  color:${t.gold};cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:all 0.35s cubic-bezier(0.32,0.72,0,1);
  box-shadow:${t.sh.md};
  &:hover{background:${t.goldDim};width:32px;}
  ${mobile}{
    top:auto;bottom:70px;left:8px;
    width:44px;height:44px;border-radius:${t.r.full};
    transform:none;border:1px solid ${t.goldBorder};
  }
`

/* ── City Quick-Filter Chips ── */
const CityChipRow = styled.div`
  display:flex;align-items:center;gap:6px;padding:8px 12px;overflow-x:auto;direction:rtl;
  border-bottom:1px solid ${t.border};flex-shrink:0;
  scrollbar-width:none;&::-webkit-scrollbar{display:none;}
`
const CityChip = styled.button<{ $active: boolean }>`
  display:inline-flex;align-items:center;gap:4px;padding:4px 12px;white-space:nowrap;
  border:1px solid ${pr => pr.$active ? t.gold : t.border};
  border-radius:${t.r.full};font-size:11px;font-weight:600;font-family:${t.font};
  background:${pr => pr.$active ? t.goldDim : 'transparent'};
  color:${pr => pr.$active ? t.gold : t.textSec};cursor:pointer;transition:all ${t.tr};flex-shrink:0;
  &:hover{border-color:${t.goldBorder};color:${t.gold};}
`
const CityChipCount = styled.span`
  font-size:9px;font-weight:800;padding:1px 5px;border-radius:${t.r.full};
  background:${t.surfaceLight};color:${t.textDim};
`

/* ── Skeleton Card ── */
const SkeletonCard = styled.div<{ $i: number }>`
  display:flex;flex-direction:column;gap:10px;padding:14px;margin-bottom:6px;
  background:${t.bg};border:1px solid ${t.border};border-radius:${t.r.md};
  animation:${fadeIn} 0.3s ease-out both;animation-delay:${pr => pr.$i * 0.08}s;
`
const SkeletonRow = styled.div`display:flex;align-items:center;gap:8px;`

/* ── Price Distribution Histogram ── */
const DistWrap = styled.div`
  padding:10px 14px 6px;border-bottom:1px solid ${t.border};flex-shrink:0;direction:rtl;
`
const DistTitle = styled.div`
  display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:${t.textDim};
  margin-bottom:8px;letter-spacing:0.3px;
`
const DistChart = styled.div`
  display:flex;align-items:flex-end;gap:2px;height:40px;
`
const DistBar = styled.div<{ $h: number; $highlight: boolean; $color: string }>`
  flex:1;min-width:0;border-radius:2px 2px 0 0;
  height:${pr => Math.max(2, pr.$h)}%;
  background:${pr => pr.$highlight ? pr.$color : t.surfaceLight};
  opacity:${pr => pr.$highlight ? 1 : 0.5};
  transition:all 0.4s cubic-bezier(0.32,0.72,0,1);
  cursor:default;position:relative;
  &:hover{opacity:1;transform:scaleY(1.05);transform-origin:bottom;}
`
const DistLabels = styled.div`
  display:flex;justify-content:space-between;margin-top:4px;
`
const DistLabel = styled.span`font-size:9px;color:${t.textDim};`

/* ── Zoning Pipeline Mini Bar ── */
const ZoningBar = styled.div`
  display:flex;align-items:center;gap:2px;margin-top:6px;width:100%;
`
const ZoningStep = styled.div<{ $done: boolean; $current: boolean }>`
  flex:1;height:3px;border-radius:1.5px;
  background:${pr => pr.$current ? t.gold : pr.$done ? t.ok : t.surfaceLight};
  ${pr => pr.$current && `box-shadow:0 0 4px ${t.gold};`}
  transition:all 0.3s ease;
`
const ZoningLabel = styled.div`
  display:flex;align-items:center;justify-content:space-between;margin-top:3px;
  font-size:9px;color:${t.textDim};
`

/* ── Load More Button ── */
const LoadMoreBtn = styled.button`
  display:flex;align-items:center;justify-content:center;gap:8px;width:100%;
  padding:14px;margin:8px 0 16px;background:${t.surfaceLight};border:1px solid ${t.border};
  border-radius:${t.r.md};color:${t.textSec};font-size:13px;font-weight:600;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};color:${t.gold};background:${t.goldDim};transform:translateY(-1px);}
`
const LoadMoreCount = styled.span`
  font-size:11px;font-weight:700;color:${t.gold};
  background:${t.goldDim};padding:2px 8px;border-radius:${t.r.full};
`

/* ── Scroll-to-Top Button ── */
const ScrollTopBtn = styled.button<{ $visible: boolean }>`
  position:absolute;bottom:12px;right:12px;z-index:5;
  width:36px;height:36px;border-radius:${t.r.full};
  background:${t.gold};color:${t.bg};border:none;
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;transition:all ${t.tr};
  opacity:${pr => pr.$visible ? 1 : 0};
  pointer-events:${pr => pr.$visible ? 'auto' : 'none'};
  transform:translateY(${pr => pr.$visible ? '0' : '8px'});
  box-shadow:${t.sh.md};
  &:hover{transform:translateY(-2px);box-shadow:${t.sh.lg};}
`

const GRADE_TIERS = [
  { min: 9, label: 'A/A+', color: '#10B981' },
  { min: 7, label: 'A-/B+', color: '#84CC16' },
  { min: 5, label: 'B/B-', color: '#F59E0B' },
  { min: 0, label: 'C', color: '#EF4444' },
] as const

function GradeDistribution({ plots }: { plots: Plot[] }) {
  const data = useMemo(() => {
    if (plots.length < 2) return null
    const counts = GRADE_TIERS.map(tier => ({
      ...tier,
      count: plots.filter(pl => {
        const s = calcScore(pl)
        const tierIdx = GRADE_TIERS.findIndex(t => t.min === tier.min)
        const nextMin = tierIdx > 0 ? GRADE_TIERS[tierIdx - 1].min : Infinity
        return s >= tier.min && s < nextMin
      }).length,
    }))
    const total = plots.length
    return counts.map(c => ({ ...c, pct: total > 0 ? (c.count / total) * 100 : 0 }))
  }, [plots])

  if (!data) return null

  return (
    <GradeDistWrap>
      <GradeDistTitle>📊 התפלגות ציוני השקעה</GradeDistTitle>
      <GradeDistBar>
        {data.map(d => (
          <GradeDistSegment key={d.label} $w={d.pct} $c={d.color} title={`${d.label}: ${d.count} (${Math.round(d.pct)}%)`} />
        ))}
      </GradeDistBar>
      <GradeDistLegend>
        {data.filter(d => d.count > 0).map(d => (
          <GradeDistItem key={d.label}>
            <GradeDistDot $c={d.color} />
            {d.label} ({d.count})
          </GradeDistItem>
        ))}
      </GradeDistLegend>
    </GradeDistWrap>
  )
}

function PriceDistribution({ plots, selectedPlot }: { plots: Plot[]; selectedPlot: Plot | null }) {
  const data = useMemo(() => {
    const prices = plots.map(pl => p(pl).price).filter(v => v > 0)
    if (prices.length < 3) return null

    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const range = max - min
    if (range <= 0) return null

    const BUCKETS = 10
    const bucketSize = range / BUCKETS
    const buckets = Array.from({ length: BUCKETS }, (_, i) => ({
      min: min + i * bucketSize,
      max: min + (i + 1) * bucketSize,
      count: 0,
      hasSelected: false,
    }))

    const selectedPrice = selectedPlot ? p(selectedPlot).price : 0

    for (const price of prices) {
      const idx = Math.min(Math.floor((price - min) / bucketSize), BUCKETS - 1)
      buckets[idx].count++
      if (selectedPrice > 0 && price === selectedPrice) {
        buckets[idx].hasSelected = true
      }
    }

    // Also mark the bucket the selected plot falls into
    if (selectedPrice > 0) {
      const selIdx = Math.min(Math.floor((selectedPrice - min) / bucketSize), BUCKETS - 1)
      buckets[selIdx].hasSelected = true
    }

    const maxCount = Math.max(...buckets.map(b => b.count))
    return { buckets, maxCount, min, max }
  }, [plots, selectedPlot])

  if (!data) return null

  return (
    <DistWrap>
      <DistTitle><Activity size={12} color={t.gold} /> התפלגות מחירים</DistTitle>
      <DistChart>
        {data.buckets.map((bucket, i) => (
          <DistBar
            key={i}
            $h={data.maxCount > 0 ? (bucket.count / data.maxCount) * 100 : 0}
            $highlight={bucket.count > 0}
            $color={bucket.hasSelected ? t.gold : t.info}
            title={`${fmt.compact(bucket.min)} – ${fmt.compact(bucket.max)}: ${bucket.count} חלקות`}
          />
        ))}
      </DistChart>
      <DistLabels>
        <DistLabel>{fmt.compact(data.min)}</DistLabel>
        <DistLabel>{fmt.compact(data.max)}</DistLabel>
      </DistLabels>
    </DistWrap>
  )
}

/* ── Component ── */
interface Props {
  plots: Plot[]
  selected: Plot | null
  onSelect: (plot: Plot) => void
  open: boolean
  onToggle: () => void
  isLoading?: boolean
  userLocation?: { lat: number; lng: number } | null
}

function PlotItem({ plot, active, index, onClick, allPlots, onDetailClick, userLocation }: {
  plot: Plot; active: boolean; index: number; onClick: () => void; allPlots: Plot[]; onDetailClick: (id: string) => void
  userLocation?: { lat: number; lng: number } | null
}) {
  const d = p(plot), r = roi(plot), score = calcScore(plot), grade = getGrade(score)
  const status = (plot.status || 'AVAILABLE') as string
  const sColor = statusColors[status] || t.gold
  const dom = daysOnMarket(d.created)
  const pos = pricePosition(plot, allPlots)
  const distance = userLocation ? plotDistanceFromUser(plot, userLocation.lat, userLocation.lng) : null
  const pps = pricePerSqm(plot)
  const ppd = pricePerDunam(plot)
  const isNew = dom && dom.days <= 7
  const isHot = score >= 9

  // Zoning pipeline stage
  const zoningIdx = zoningPipeline.findIndex(z => z.key === d.zoning)
  const currentZoning = zoningIdx >= 0 ? zoningPipeline[zoningIdx] : null

  return (
    <ItemWrap $active={active} $i={index} $gradeColor={grade.color} onClick={onClick} aria-label={`חלקה ${plot.number} גוש ${d.block}`}>
      <ItemTop>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ItemCity>{plot.city}</ItemCity>
          <ItemBadge $c={sColor}>{statusLabels[status] || status}</ItemBadge>
          {isNew && <NewBadge>✨ חדש</NewBadge>}
          {isHot && <HotBadge>🔥 HOT</HotBadge>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {distance != null && <DistanceBadge>📍 {fmtDistance(distance)}</DistanceBadge>}
          {pos && (
            <PricePosTag $c={pos.color}>
              {pos.direction === 'below' ? <ArrowDown size={9} /> : pos.direction === 'above' ? <ArrowUp size={9} /> : <Minus size={9} />}
              {pos.label}
            </PricePosTag>
          )}
          <ItemGrade $c={grade.color}>{grade.grade}</ItemGrade>
        </div>
      </ItemTop>
      <ItemBlock>גוש {d.block} · חלקה {plot.number}</ItemBlock>
      <Metrics>
        <Metric>
          <MapPin size={12} />
          <MetricVal $gold>{d.price > 0 ? fmt.compact(d.price) : '—'}</MetricVal>
        </Metric>
        <Metric>
          <Ruler size={12} />
          <MetricVal>{d.size > 0 ? `${fmt.num(d.size)} מ״ר` : '—'}</MetricVal>
        </Metric>
        {ppd > 0 && (
          <Metric title="מחיר לדונם">
            <MetricVal style={{ fontSize: 10, color: t.textDim }}>{fmt.compact(ppd)}/דונם</MetricVal>
          </Metric>
        )}
        {r > 0 && (
          <Metric>
            <TrendingUp size={12} />
            <MetricVal style={{ color: t.ok }}>{Math.round(r)}%</MetricVal>
          </Metric>
        )}
        {dom && <ItemDom $c={dom.color}>{dom.label}</ItemDom>}
        <DetailLink
          onClick={(e) => {
            e.stopPropagation()
            const url = `${window.location.origin}/plot/${plot.id}`
            const title = `חלקה ${plot.number} · גוש ${d.block} - ${plot.city}`
            const text = `${title} | ${fmt.compact(d.price)} | ${fmt.num(d.size)} מ״ר`
            if (navigator.share) {
              navigator.share({ title, text, url }).catch(() => {
                navigator.clipboard?.writeText(url)
              })
            } else {
              navigator.clipboard?.writeText(url)
            }
          }}
          title="שתף חלקה"
          aria-label={`שתף חלקה ${plot.number}`}
        >
          <Share2 size={12} />
        </DetailLink>
        <DetailLink
          onClick={(e) => { e.stopPropagation(); onDetailClick(plot.id) }}
          title="עמוד מלא"
          aria-label={`פתח עמוד מלא עבור חלקה ${plot.number}`}
        >
          <ExternalLink size={13} />
        </DetailLink>
      </Metrics>
      {/* Zoning pipeline progress mini-bar */}
      {currentZoning && (
        <>
          <ZoningBar title={`שלב תכנוני: ${currentZoning.label}`}>
            {zoningPipeline.map((step, i) => (
              <ZoningStep key={step.key} $done={i < zoningIdx} $current={i === zoningIdx} />
            ))}
          </ZoningBar>
          <ZoningLabel>
            <span>{currentZoning.icon} {currentZoning.label}</span>
            <span>{Math.round(((zoningIdx) / (zoningPipeline.length - 1)) * 100)}%</span>
          </ZoningLabel>
        </>
      )}
    </ItemWrap>
  )
}

function PlotListPanel({ plots, selected, onSelect, open, onToggle, isLoading, userLocation }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [cityFilter, setCityFilter] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const stats = useMemo(() => calcAggregateStats(plots), [plots])
  const goToDetail = useCallback((id: string) => navigate(`/plot/${id}`), [navigate])

  // City counts for chips
  const cityCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const pl of plots) {
      if (pl.city) map.set(pl.city, (map.get(pl.city) || 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [plots])

  // Filtered plots by city
  const allVisiblePlots = useMemo(() =>
    cityFilter ? plots.filter(pl => pl.city === cityFilter) : plots
  , [plots, cityFilter])

  // Paginated visible plots
  const visiblePlots = useMemo(() =>
    allVisiblePlots.slice(0, visibleCount)
  , [allVisiblePlots, visibleCount])

  const hasMore = allVisiblePlots.length > visibleCount
  const remainingCount = allVisiblePlots.length - visibleCount

  const loadMore = useCallback(() => {
    setVisibleCount(prev => prev + PAGE_SIZE)
  }, [])

  // Reset pagination when filters/city change
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [cityFilter, plots])

  // Reset city filter when plots change substantially
  useEffect(() => {
    if (cityFilter && !plots.some(pl => pl.city === cityFilter)) setCityFilter(null)
  }, [plots, cityFilter])

  // Scroll tracking for scroll-to-top button
  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const handler = () => setShowScrollTop(body.scrollTop > 300)
    body.addEventListener('scroll', handler, { passive: true })
    return () => body.removeEventListener('scroll', handler)
  }, [])

  const scrollToTop = useCallback(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Scroll to active item — also expand pagination if needed
  useEffect(() => {
    if (!selected || !open || !bodyRef.current) return
    const idx = allVisiblePlots.findIndex(pl => pl.id === selected.id)
    if (idx < 0) return
    // Expand pagination to include selected item
    if (idx >= visibleCount) setVisibleCount(idx + PAGE_SIZE)
    requestAnimationFrame(() => {
      if (!bodyRef.current) return
      const item = bodyRef.current.children[idx] as HTMLElement
      if (item) item.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }, [selected, open, allVisiblePlots])

  return (
    <>
      <Overlay $open={open} onClick={onToggle} />
      <ToggleBtn $open={open} onClick={onToggle} aria-label={open ? 'סגור רשימה' : 'פתח רשימה'}>
        {open ? <ChevronLeft size={16} /> : <List size={18} />}
      </ToggleBtn>
      <Panel $open={open}>
        <GoldBar />
        <Header>
          <Title>
            <List size={16} color={t.gold} />
            חלקות
            <Count>{cityFilter ? allVisiblePlots.length : plots.length}</Count>
          </Title>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {allVisiblePlots.length > 0 && (
              <ExportBtn onClick={() => exportPlotsCsv(allVisiblePlots, `landmap-${cityFilter || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`)} title="ייצוא לאקסל">
                <Download size={13} /> CSV
              </ExportBtn>
            )}
            <CloseBtn onClick={onToggle} aria-label="סגור"><X size={16} /></CloseBtn>
          </div>
        </Header>
        {/* Summary stats bar */}
        {stats && plots.length > 0 && (
          <SummaryBar>
            <SummaryStat>
              <SummaryStatVal>{fmt.compact(stats.avgPrice)}</SummaryStatVal>
              <SummaryStatLabel>מחיר ממוצע</SummaryStatLabel>
            </SummaryStat>
            <SummaryStat>
              <SummaryStatVal>{fmt.num(stats.avgPps)}</SummaryStatVal>
              <SummaryStatLabel>₪/מ״ר ממוצע</SummaryStatLabel>
            </SummaryStat>
            <SummaryStat>
              <SummaryStatVal style={{ color: stats.avgRoi > 0 ? t.ok : t.textSec }}>{stats.avgRoi}%</SummaryStatVal>
              <SummaryStatLabel>תשואה ממוצעת</SummaryStatLabel>
            </SummaryStat>
          </SummaryBar>
        )}
        {/* City quick-filter chips */}
        {cityCounts.length > 1 && (
          <CityChipRow>
            <CityChip $active={!cityFilter} onClick={() => setCityFilter(null)}>
              הכל <CityChipCount>{plots.length}</CityChipCount>
            </CityChip>
            {cityCounts.map(([city, count]) => (
              <CityChip key={city} $active={cityFilter === city} onClick={() => setCityFilter(prev => prev === city ? null : city)}>
                {city} <CityChipCount>{count}</CityChipCount>
              </CityChip>
            ))}
          </CityChipRow>
        )}
        {/* Grade distribution bar */}
        <GradeDistribution plots={allVisiblePlots} />
        {/* Price distribution histogram */}
        <PriceDistribution plots={visiblePlots} selectedPlot={selected} />
        <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
          <Body ref={bodyRef}>
            {isLoading ? (
              /* Skeleton loading cards */
              Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} $i={i}>
                  <SkeletonRow>
                    <Skeleton $w="80px" $h="12px" />
                    <div style={{ flex: 1 }} />
                    <Skeleton $w="36px" $h="20px" $r={t.r.sm} />
                  </SkeletonRow>
                  <Skeleton $w="140px" $h="10px" />
                  <SkeletonRow>
                    <Skeleton $w="60px" $h="14px" />
                    <Skeleton $w="60px" $h="14px" />
                    <Skeleton $w="40px" $h="14px" />
                  </SkeletonRow>
                </SkeletonCard>
              ))
            ) : allVisiblePlots.length === 0 ? (
              <EmptyState>
                <MapPin size={32} />
                <span style={{ fontSize: 14 }}>{cityFilter ? `לא נמצאו חלקות ב${cityFilter}` : 'לא נמצאו חלקות'}</span>
                <span style={{ fontSize: 12 }}>נסו לשנות את הסינון</span>
                {cityFilter && (
                  <button onClick={() => setCityFilter(null)} style={{
                    marginTop: 8, padding: '6px 16px', background: t.goldDim, border: `1px solid ${t.goldBorder}`,
                    borderRadius: t.r.full, color: t.gold, fontSize: 12, fontWeight: 600, fontFamily: t.font, cursor: 'pointer',
                  }}>הצג את כל הערים</button>
                )}
              </EmptyState>
            ) : (
              <>
                {visiblePlots.map((plot, i) => (
                  <PlotItem
                    key={plot.id}
                    plot={plot}
                    active={selected?.id === plot.id}
                    index={i}
                    onClick={() => onSelect(plot)}
                    allPlots={plots}
                    onDetailClick={goToDetail}
                    userLocation={userLocation}
                  />
                ))}
                {hasMore && (
                  <LoadMoreBtn onClick={loadMore}>
                    <LoadMoreIcon size={16} />
                    טען עוד חלקות
                    <LoadMoreCount>{remainingCount > 0 ? `+${remainingCount}` : ''}</LoadMoreCount>
                  </LoadMoreBtn>
                )}
              </>
            )}
          </Body>
          <ScrollTopBtn $visible={showScrollTop} onClick={scrollToTop} aria-label="גלול למעלה">
            <ArrowUp size={16} />
          </ScrollTopBtn>
        </div>
      </Panel>
    </>
  )
}

export default memo(PlotListPanel)
