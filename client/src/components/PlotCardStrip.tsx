import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import styled, { keyframes } from 'styled-components'
import { ChevronLeft, ChevronRight, TrendingUp, BarChart3, Ruler } from 'lucide-react'
import { statusColors } from '../utils/constants'
import { formatPriceShort } from '../utils/format'
import { plotCenter, haversineKm } from '../utils/geo'
import { calcBestInCategory } from '../utils/investment'
import { usePrefetchPlot } from '../hooks/usePlots'
import { useAreaAverages } from '../hooks/useMarket'
import { useDragScroll } from '../hooks/useUI'
import { useImpressionTracker } from '../hooks/useTracking'
import SmartInsights from './SmartInsights'
import { useRecentlyViewed } from '../hooks/useUserData'
import { media } from '../styles/theme'
import { PlotCardItem } from './plot-card/PlotCard'

// ─── Types ───────────────────────────────────────────────────────────────

interface PlotCardStripProps {
  plots: any[]
  selectedPlot: any
  onSelectPlot: (plot: any) => void
  compareIds?: string[]
  onToggleCompare?: (id: string) => void
  isLoading?: boolean
  onClearFilters?: () => void
  getPriceChange?: (id: string) => any
  favorites?: any
  userLocation?: { lat: number; lng: number } | null
}

// ─── Animations ──────────────────────────────────────────────────────────

const pulseAnim = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`

// ─── Strip wrapper styled components ─────────────────────────────────────

const StripWrapper = styled.div`
  position: relative;
  width: 100%;
  background: ${({ theme }) => theme.colors.bg};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`

const StripScroll = styled.div`
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`

const StripFadeRight = styled.div`
  position: absolute; top: 0; right: 0; bottom: 0; width: 32px;
  background: linear-gradient(to left, ${({ theme }) => theme.colors.bg}, transparent);
  pointer-events: none; z-index: 5;
`

const StripFadeLeft = styled.div`
  position: absolute; top: 0; left: 0; bottom: 0; width: 32px;
  background: linear-gradient(to right, ${({ theme }) => theme.colors.bg}, transparent);
  pointer-events: none; z-index: 5;
`

const StripArrow = styled.button`
  position: absolute; top: 50%; transform: translateY(-50%); z-index: 10;
  width: 28px; height: 28px; border-radius: 50%;
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.md};
  display: none; align-items: center; justify-content: center; cursor: pointer;
  color: ${({ theme }) => theme.colors.textSecondary};
  transition: all ${({ theme }) => theme.transitions.fast};
  &:hover { background: ${({ theme }) => theme.colors.bgSecondary}; color: ${({ theme }) => theme.colors.text}; }
  ${media.sm} { display: flex; }
`

const StripArrowRight = styled(StripArrow)`left: 8px;`
const StripArrowLeft = styled(StripArrow)`right: 8px;`

const StatsBar = styled.div`
  display: flex; align-items: center; gap: 8px; padding: 6px 16px;
  overflow-x: auto; scrollbar-width: none; font-size: 11px;
  color: ${({ theme }) => theme.colors.textSecondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderLight};
  white-space: nowrap;
  &::-webkit-scrollbar { display: none; }
`

const StatItem = styled.div`
  display: flex; align-items: center; gap: 4px; flex-shrink: 0;
`

const StatDivider = styled.div`
  width: 1px; height: 12px;
  background: ${({ theme }) => theme.colors.border}; flex-shrink: 0;
`

const MarketTempBadge = styled.div<{ $bg: string; $borderColor: string }>`
  display: flex; align-items: center; gap: 4px; flex-shrink: 0;
  padding: 2px 8px; border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ $borderColor }) => $borderColor};
  background: ${({ $bg }) => $bg};
`

const ScrollIndicator = styled.div`
  position: absolute; top: 2px; left: 50%; transform: translateX(-50%);
  z-index: 20; display: flex; align-items: center; gap: 8px; pointer-events: none;
`

const ScrollIndicatorInner = styled.div`
  display: flex; align-items: center; gap: 6px; padding: 4px 10px;
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`

const ScrollIndicatorText = styled.span`
  font-size: 9px; color: ${({ theme }) => theme.colors.textTertiary};
  font-weight: 500; font-variant-numeric: tabular-nums;
`

const ScrollProgressTrack = styled.div`
  width: 48px; height: 4px; border-radius: 9999px;
  background: ${({ theme }) => theme.colors.bgTertiary}; overflow: hidden;
`

const ScrollProgressFill = styled.div<{ $width: number }>`
  height: 100%; border-radius: 9999px;
  background: ${({ theme }) => theme.colors.primary};
  opacity: 0.4; transition: width 0.2s ease;
  width: ${({ $width }) => Math.max(8, $width)}%;
`

// ─── Skeleton ────────────────────────────────────────────────────────────

const SkeletonCard = styled.div`
  flex-shrink: 0; width: 200px;
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden; opacity: 0.6; pointer-events: none;
`

const SkeletonAccent = styled.div`
  height: 80px; background: ${({ theme }) => theme.colors.bgTertiary};
  animation: ${pulseAnim} 1.5s ease-in-out infinite;
`

const SkeletonBody = styled.div`
  padding: 8px 10px; display: flex; flex-direction: column; gap: 8px;
`

const SkeletonLine = styled.div<{ $width?: string; $height?: string }>`
  height: ${({ $height }) => $height || '12px'};
  width: ${({ $width }) => $width || '100%'};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bgTertiary};
  animation: ${pulseAnim} 1.5s ease-in-out infinite;
`

const SkeletonFooter = styled.div`
  display: flex; justify-content: space-between; margin-top: 4px;
`

// ─── Empty state ─────────────────────────────────────────────────────────

const EmptyRow = styled.div`
  display: flex; align-items: center; justify-content: center; padding: 16px 24px;
`

const EmptyBox = styled.div`
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  background: ${({ theme }) => theme.colors.bgSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 16px 20px; max-width: 480px;
  ${media.sm} { flex-direction: row; gap: 16px; }
`

const EmptyIcon = styled.span`font-size: 30px;`

const EmptyContent = styled.div`
  text-align: center;
  ${media.sm} { text-align: right; }
`

const EmptyTitle = styled.div`
  font-size: 14px; font-weight: 600; color: ${({ theme }) => theme.colors.text};
`

const EmptyDesc = styled.div`
  font-size: 11px; color: ${({ theme }) => theme.colors.textTertiary};
  margin-top: 4px; line-height: 1.6;
`

const EmptyActions = styled.div`
  display: flex; flex-wrap: wrap; align-items: center;
  justify-content: center; gap: 8px; margin-top: 10px;
  ${media.sm} { justify-content: flex-start; }
`

const ClearBtn = styled.button`
  padding: 6px 14px; font-size: 11px; font-weight: 600; color: #fff;
  background: ${({ theme }) => theme.colors.primary};
  border: none; border-radius: ${({ theme }) => theme.radii.lg};
  cursor: pointer; transition: box-shadow ${({ theme }) => theme.transitions.normal};
  &:hover { box-shadow: 0 4px 12px ${({ theme }) => theme.colors.primary}33; }
`

const BrowseLink = styled.a`
  padding: 6px 12px; font-size: 11px; font-weight: 500;
  color: ${({ theme }) => theme.colors.textSecondary};
  background: ${({ theme }) => theme.colors.bgTertiary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  text-decoration: none; transition: all ${({ theme }) => theme.transitions.fast};
  &:hover { background: ${({ theme }) => theme.colors.bgSecondary}; color: ${({ theme }) => theme.colors.text}; text-decoration: none; }
`

// ─── Helpers ─────────────────────────────────────────────────────────────

function usePricePercentiles(plots: any[]) {
  return useMemo(() => {
    if (!plots || plots.length < 3) return new Map()
    const entries: { id: any; ppsqm: number }[] = []
    for (const p of plots) {
      const price = p.total_price ?? p.totalPrice ?? 0
      const size = p.size_sqm ?? p.sizeSqM ?? 0
      if (price > 0 && size > 0) entries.push({ id: p.id, ppsqm: price / size })
    }
    if (entries.length < 3) return new Map()
    entries.sort((a, b) => a.ppsqm - b.ppsqm)
    const result = new Map()
    for (let i = 0; i < entries.length; i++) result.set(entries[i].id, Math.round((i / (entries.length - 1)) * 100))
    return result
  }, [plots])
}

function PlotCardSkeleton() {
  return (
    <SkeletonCard>
      <SkeletonAccent />
      <SkeletonBody>
        <SkeletonLine $width="75%" />
        <SkeletonLine $width="50%" $height="10px" />
        <SkeletonLine $height="16px" />
        <SkeletonFooter>
          <SkeletonLine $width="64px" />
          <SkeletonLine $width="40px" />
        </SkeletonFooter>
      </SkeletonBody>
    </SkeletonCard>
  )
}

// ─── Main component ──────────────────────────────────────────────────────

export default function PlotCardStrip({ plots, selectedPlot, onSelectPlot, compareIds = [], onToggleCompare, isLoading = false, onClearFilters, getPriceChange, favorites, userLocation }: PlotCardStripProps) {
  const prefetchPlot = usePrefetchPlot()
  const { wasViewed: isRecentlyViewed } = useRecentlyViewed()
  const { observeRef: observeImpression } = useImpressionTracker({ threshold: 0.5, cooldownMs: 60_000, batchFlushMs: 8_000 })
  const areaAverages = useAreaAverages(plots)
  const pricePercentiles = usePricePercentiles(plots)
  const bestInCategory = useMemo(() => calcBestInCategory(plots), [plots])

  const plotDistances = useMemo(() => {
    if (!userLocation) return new Map()
    const result = new Map()
    for (const p of plots) {
      const center = plotCenter(p.coordinates)
      if (center) result.set(p.id, haversineKm(userLocation.lat, userLocation.lng, center.lat, center.lng))
    }
    return result
  }, [plots, userLocation])

  const scrollRef = useRef<HTMLDivElement>(null)
  useDragScroll(scrollRef)

  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [visibleIndex, setVisibleIndex] = useState(0)

  const rafRef = useRef<any>(null)
  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollRight(Math.abs(scrollLeft) > 1)
    setCanScrollLeft(Math.abs(scrollLeft) + clientWidth < scrollWidth - 1)
    const maxScroll = scrollWidth - clientWidth
    setScrollProgress(maxScroll > 0 ? Math.round((Math.abs(scrollLeft) / maxScroll) * 100) : 0)
    setVisibleIndex(Math.min(Math.round(Math.abs(scrollLeft) / 200), (plots?.length ?? 1) - 1))
  }, [plots?.length])

  const throttledCheckScroll = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => { rafRef.current = null; checkScroll() })
  }, [checkScroll])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', throttledCheckScroll, { passive: true })
    window.addEventListener('resize', throttledCheckScroll)
    return () => { el.removeEventListener('scroll', throttledCheckScroll); window.removeEventListener('resize', throttledCheckScroll); if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [plots, checkScroll, throttledCheckScroll])

  const prevPlotsRef = useRef(plots)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const prev = prevPlotsRef.current
    if (prev !== plots && plots?.length > 0 && prev?.[0]?.id !== plots[0]?.id) el.scrollTo({ left: 0, behavior: 'smooth' })
    prevPlotsRef.current = plots
  }, [plots])

  useEffect(() => {
    if (!selectedPlot || !scrollRef.current) return
    const card = scrollRef.current.querySelector(`[data-plot-id="${selectedPlot.id}"]`)
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [selectedPlot?.id])

  const stats = useMemo(() => {
    if (!plots || plots.length === 0) return null
    const available = plots.filter(p => p.status === 'AVAILABLE')
    let totalValue = 0, totalProjected = 0, roiSum = 0, totalArea = 0, freshCount = 0
    const now = Date.now()
    for (const p of plots) {
      const price = p.total_price ?? p.totalPrice ?? 0
      const proj = p.projected_value ?? p.projectedValue ?? 0
      totalValue += price; totalProjected += proj; totalArea += p.size_sqm ?? p.sizeSqM ?? 0
      if (price > 0) roiSum += ((proj - price) / price) * 100
      const created = p.created_at ?? p.createdAt
      if (created && (now - new Date(created).getTime()) < 7 * 86400000) freshCount++
    }
    const avgRoi = Math.round(roiSum / plots.length)
    const totalProfit = totalProjected - totalValue

    let totalNetProfit = 0, netProfitCount = 0
    for (const p of plots) { if (p._netProfit != null) { totalNetProfit += p._netProfit; netProfitCount++ } }

    let totalCompleteness = 0, completenessCount = 0
    for (const p of plots) { if (p._dataCompleteness != null) { totalCompleteness += p._dataCompleteness; completenessCount++ } }
    const avgCompleteness = completenessCount > 0 ? Math.round(totalCompleteness / completenessCount) : null

    const availRatio = plots.length > 0 ? available.length / plots.length : 0
    const freshRatio = plots.length > 0 ? freshCount / plots.length : 0
    const heatScore = (availRatio * 40) + (freshRatio * 30) + (Math.min(avgRoi, 200) / 200 * 30)
    let marketTemp
    if (heatScore >= 55) marketTemp = { emoji: '\uD83D\uDD25', label: '\u05D7\u05DD', color: '#FB923C', bg: 'rgba(251,146,60,0.1)', borderColor: 'rgba(251,146,60,0.2)' }
    else if (heatScore >= 30) marketTemp = { emoji: '\uD83D\uDFE1', label: '\u05E4\u05E2\u05D9\u05DC', color: '#FBBF24', bg: 'rgba(251,191,36,0.1)', borderColor: 'rgba(251,191,36,0.2)' }
    else marketTemp = { emoji: '\u2744\uFE0F', label: '\u05E9\u05E7\u05D8', color: '#60A5FA', bg: 'rgba(96,165,250,0.1)', borderColor: 'rgba(96,165,250,0.2)' }

    return { available: available.length, totalValue, totalProjected, totalProfit, avgRoi, totalArea, marketTemp, freshCount, totalNetProfit: netProfitCount > 0 ? totalNetProfit : null, avgCompleteness }
  }, [plots])

  if (isLoading) return (
    <StripWrapper dir="rtl">
      <StripScroll>{Array.from({ length: 6 }, (_, i) => <PlotCardSkeleton key={i} />)}</StripScroll>
    </StripWrapper>
  )

  if (!plots || plots.length === 0) return (
    <StripWrapper dir="rtl">
      <EmptyRow>
        <EmptyBox>
          <EmptyIcon>{'\uD83D\uDD0D'}</EmptyIcon>
          <EmptyContent>
            <EmptyTitle>{'\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D5 \u05D7\u05DC\u05E7\u05D5\u05EA \u05DE\u05EA\u05D0\u05D9\u05DE\u05D5\u05EA'}</EmptyTitle>
            <EmptyDesc>{'\u05E0\u05E1\u05D4 \u05DC\u05D4\u05E8\u05D7\u05D9\u05D1 \u05D0\u05EA \u05D4\u05E1\u05D9\u05E0\u05D5\u05DF \u2014 \u05E9\u05E0\u05D4 \u05E2\u05D9\u05E8, \u05D4\u05E8\u05D7\u05D1 \u05D8\u05D5\u05D5\u05D7 \u05DE\u05D7\u05D9\u05E8 \u05D0\u05D5 \u05D4\u05E1\u05E8 \u05D7\u05DC\u05E7 \u05DE\u05D4\u05E4\u05D9\u05DC\u05D8\u05E8\u05D9\u05DD'}</EmptyDesc>
            <EmptyActions>
              {onClearFilters && <ClearBtn onClick={onClearFilters}>{'\u05E0\u05E7\u05D4 \u05D4\u05DB\u05DC \u05D5\u05E6\u05E4\u05D4 \u05D1\u05DB\u05DC \u05D4\u05D7\u05DC\u05E7\u05D5\u05EA'}</ClearBtn>}
              <BrowseLink href="/areas">{'\u05E2\u05D9\u05D9\u05DF \u05D1\u05D0\u05D6\u05D5\u05E8\u05D9\u05DD'}</BrowseLink>
            </EmptyActions>
          </EmptyContent>
        </EmptyBox>
      </EmptyRow>
    </StripWrapper>
  )

  const scroll = (dir: number) => { if (scrollRef.current) scrollRef.current.scrollBy({ left: dir * 280, behavior: 'smooth' }) }

  return (
    <StripWrapper dir="rtl">
      {stats && (
        <StatsBar>
          <StatItem><BarChart3 style={{ width: 12, height: 12, color: '#C8942A' }} /><span>{stats.available} \u05D6\u05DE\u05D9\u05E0\u05D5\u05EA</span></StatItem>
          <StatDivider />
          <StatItem><TrendingUp style={{ width: 12, height: 12, color: '#10B981' }} /><span>\u05DE\u05DE\u05D5\u05E6\u05E2 +{stats.avgRoi}% ROI</span></StatItem>
          <StatDivider />
          <StatItem><Ruler style={{ width: 12, height: 12, color: '#3B82F6' }} /><span>{(stats.totalArea / 1000).toFixed(1)} \u05D3\u05D5\u05E0\u05DD \u05E1\u05D4\u05F4\u05DB</span></StatItem>
          {stats.totalProfit > 0 && (<><StatDivider /><StatItem title={`\u05E9\u05D5\u05D5\u05D9 \u05E0\u05D5\u05DB\u05D7\u05D9: \u20AA${stats.totalValue.toLocaleString()} \u2192 \u05E6\u05E4\u05D9: \u20AA${stats.totalProjected.toLocaleString()}`}><span style={{ color: '#10B981' }}>{'\uD83D\uDC8E'}</span><span>\u05E8\u05D5\u05D5\u05D7 \u05E4\u05D5\u05D8\u05E0\u05E6\u05D9\u05D0\u05DC\u05D9 \u20AA{formatPriceShort(stats.totalProfit)}</span></StatItem></>)}
          {stats.totalNetProfit != null && (<><StatDivider /><StatItem title={`\u05E8\u05D5\u05D5\u05D7 \u05E0\u05D8\u05D5: \u20AA${stats.totalNetProfit.toLocaleString()} (\u05D0\u05D7\u05E8\u05D9 \u05DE\u05E1 \u05E8\u05DB\u05D9\u05E9\u05D4, \u05D4\u05D9\u05D8\u05DC \u05D4\u05E9\u05D1\u05D7\u05D4, \u05DE\u05E1 \u05E9\u05D1\u05D7, \u05E2\u05DC\u05D5\u05D9\u05D5\u05EA \u05D0\u05D7\u05D6\u05E7\u05D4, \u05E9\u05DB\u05F4\u05D8)`}><span style={{ color: stats.totalNetProfit > 0 ? '#10B981' : '#EF4444' }}>{'\uD83D\uDCB5'}</span><span style={{ color: stats.totalNetProfit > 0 ? '#10B981' : '#EF4444' }}>\u05E0\u05D8\u05D5 {formatPriceShort(Math.abs(stats.totalNetProfit))}</span></StatItem></>)}
          {stats.avgCompleteness != null && (<><StatDivider /><StatItem title={`\u05D0\u05D9\u05DB\u05D5\u05EA \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05DE\u05DE\u05D5\u05E6\u05E2\u05EA: ${stats.avgCompleteness}% \u2014 \u05D7\u05DC\u05E7\u05D5\u05EA \u05E2\u05DD \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05DE\u05DC\u05D0\u05D9\u05DD \u05D9\u05D5\u05EA\u05E8 \u05E0\u05D5\u05EA\u05E0\u05D5\u05EA \u05EA\u05DE\u05D5\u05E0\u05D4 \u05DE\u05D4\u05D9\u05DE\u05E0\u05D4 \u05D9\u05D5\u05EA\u05E8`}><span>{stats.avgCompleteness >= 70 ? '\uD83D\uDFE2' : stats.avgCompleteness >= 40 ? '\uD83D\uDFE1' : '\uD83D\uDD34'}</span><span style={{ color: '#94A3B8' }}>\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD {stats.avgCompleteness}%</span></StatItem></>)}
          {stats.marketTemp && (<><StatDivider /><MarketTempBadge $bg={stats.marketTemp.bg} $borderColor={stats.marketTemp.borderColor} title={`\u05E9\u05D5\u05E7 ${stats.marketTemp.label} \u2014 ${stats.available} \u05D6\u05DE\u05D9\u05E0\u05D5\u05EA, ${stats.freshCount} \u05D7\u05D3\u05E9\u05D5\u05EA \u05D4\u05E9\u05D1\u05D5\u05E2, \u05DE\u05DE\u05D5\u05E6\u05E2 +${stats.avgRoi}% ROI`}><span>{stats.marketTemp.emoji}</span><span style={{ fontWeight: 700, color: stats.marketTemp.color }}>{stats.marketTemp.label}</span></MarketTempBadge></>)}
        </StatsBar>
      )}

      <SmartInsights plots={plots} />

      {plots.length > 3 && (
        <ScrollIndicator>
          <ScrollIndicatorInner>
            <ScrollIndicatorText>{visibleIndex + 1}/{plots.length}</ScrollIndicatorText>
            <ScrollProgressTrack><ScrollProgressFill $width={scrollProgress} /></ScrollProgressTrack>
          </ScrollIndicatorInner>
        </ScrollIndicator>
      )}

      <StripFadeRight />
      <StripFadeLeft />

      {canScrollLeft && <StripArrowRight onClick={() => scroll(-1)} aria-label="\u05D4\u05D1\u05D0"><ChevronLeft style={{ width: 16, height: 16 }} /></StripArrowRight>}
      {canScrollRight && <StripArrowLeft onClick={() => scroll(1)} aria-label="\u05D4\u05E7\u05D5\u05D3\u05DD"><ChevronRight style={{ width: 16, height: 16 }} /></StripArrowLeft>}

      <StripScroll
        ref={scrollRef}
        role="listbox"
        aria-label="\u05E8\u05E9\u05D9\u05DE\u05EA \u05D7\u05DC\u05E7\u05D5\u05EA"
        onKeyDown={(e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
          const focused = document.activeElement
          if (!focused || !focused.hasAttribute('data-plot-id')) return
          e.preventDefault()
          const sibling = e.key === 'ArrowLeft' ? focused.nextElementSibling : focused.previousElementSibling
          if (sibling && sibling.hasAttribute('data-plot-id')) { (sibling as HTMLElement).focus(); sibling.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }) }
        }}
      >
        {plots.map((plot, index) => (
          <PlotCardItem
            key={plot.id}
            plot={plot}
            isSelected={selectedPlot?.id === plot.id}
            isCompared={compareIds.includes(plot.id)}
            isFavorite={favorites?.isFavorite(plot.id) ?? false}
            wasViewed={isRecentlyViewed(plot.id)}
            areaAvgPsm={areaAverages[plot.city]}
            onSelectPlot={onSelectPlot}
            onToggleCompare={onToggleCompare}
            onToggleFavorite={favorites?.toggle}
            prefetchPlot={prefetchPlot}
            priceChange={getPriceChange ? getPriceChange(plot.id) : null}
            pricePercentile={pricePercentiles.get(plot.id) ?? null}
            categoryBadges={bestInCategory.get(plot.id)?.badges ?? null}
            distanceKm={plotDistances.get(plot.id) ?? null}
            imagePriority={index < 3}
            observeImpression={observeImpression}
          />
        ))}
      </StripScroll>
    </StripWrapper>
  )
}
