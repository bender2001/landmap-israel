import { useMemo, memo } from 'react'
import styled, { css } from 'styled-components'
import { MapPin, Clock, GitCompareArrows, Heart } from 'lucide-react'
import ZoningProgressBar from '../ui/ZoningProgressBar'
import CardImageCarousel from '../ui/CardImageCarousel'
import { statusColors, statusLabels } from '../../utils/constants'
import { formatPriceShort, formatRelativeTime, formatMonthlyPayment, formatDistanceKm } from '../../utils/format'
import { calcInvestmentScore, getInvestmentGrade, calcCAGR, calcMonthlyPayment, calcDemandVelocity, calcBuildableValue } from '../../utils/investment'
import { plotNavigateUrl } from '../../utils/geo'
import { calcTransactionCosts } from '../../utils/plot'
import { useViewportPrefetch } from '../../hooks/useInfra'
import { PriceSparkline } from './PriceSparkline'
import { PlotShareButtons, QuickCopyButton } from './PlotShareButtons'
import { theme, media } from '../../styles/theme'

// ─── Types ───────────────────────────────────────────────────────────────

interface MarketPositionDotProps {
  percentile: number | null | undefined
}

export interface PlotCardItemProps {
  plot: any
  isSelected: boolean
  isCompared: boolean
  isFavorite: boolean
  wasViewed: boolean
  areaAvgPsm: number | undefined
  onSelectPlot: (plot: any) => void
  onToggleCompare?: (id: string) => void
  onToggleFavorite?: (id: string) => void
  prefetchPlot: (id: string) => void
  priceChange: any
  pricePercentile: number | null
  categoryBadges: any[] | null
  distanceKm: number | null
  imagePriority?: boolean
  observeImpression?: (el: HTMLElement, plotId: string) => void
}

// ─── Styled Components ───────────────────────────────────────────────────

const Card = styled.div<{ $isSelected?: boolean; $isCompared?: boolean; $isSold?: boolean }>`
  position: relative;
  flex-shrink: 0;
  width: 200px;
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
  cursor: pointer;
  scroll-snap-align: start;
  transition: all ${({ theme }) => theme.transitions.normal};
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.elevated};
    border-color: ${({ theme }) => theme.colors.slate[300]};
  }
  ${({ $isSelected, theme }) => $isSelected && css`border-color: ${theme.colors.primary}; box-shadow: 0 0 0 2px ${theme.colors.primary}33;`}
  ${({ $isCompared, theme }) => $isCompared && css`border-color: ${theme.colors.amber[500]}; box-shadow: 0 0 0 2px ${theme.colors.amber[500]}33;`}
  ${({ $isSold }) => $isSold && css`opacity: 0.65; filter: grayscale(0.2);`}
`

const CardBody = styled.div`
  padding: 8px 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
`

const CardTitle = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ViewedDot = styled.span`
  width: 5px; height: 5px; border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  flex-shrink: 0; opacity: 0.5;
`

const StatusBadgeEl = styled.span<{ $bg: string; $color: string }>`
  font-size: 8px; font-weight: 700; padding: 1px 6px;
  border-radius: 9999px; white-space: nowrap; flex-shrink: 0;
  background: ${({ $bg }) => $bg}; color: ${({ $color }) => $color};
`

const CityRow = styled.div`
  display: flex; align-items: center; gap: 4px;
  font-size: 10px; color: ${({ theme }) => theme.colors.textSecondary};
  flex-wrap: wrap;
`

const ScoreBadge = styled.span<{ $color: string }>`
  font-size: 8px; font-weight: 800; padding: 0 4px;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ $color }) => $color}30;
  background: ${({ $color }) => $color}15;
  color: ${({ $color }) => $color};
`

const MarketTrendText = styled.span<{ $direction: string }>`
  font-size: 7px; font-weight: 700;
  color: ${({ $direction, theme }) => $direction === 'up' ? theme.colors.emerald[400] : theme.colors.red[400]};
  opacity: 0.8;
`

const ViewCountText = styled.span`
  font-size: 8px; color: ${({ theme }) => theme.colors.purple[400]};
  opacity: 0.6; margin-right: auto;
`

const FreshnessText = styled.span`
  font-size: 8px; margin-right: auto; opacity: 0.7;
  color: ${({ theme }) => theme.colors.textTertiary};
`

const DistanceText = styled.span`
  font-size: 8px; color: ${({ theme }) => theme.colors.blue[400]};
  opacity: 0.8; font-weight: 500; white-space: nowrap;
`

const RoiBar = styled.div`
  position: relative; height: 16px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bgTertiary};
  overflow: hidden; margin-top: 2px;
`

const RoiBarFill = styled.div`
  position: absolute; inset: 0;
  border-radius: ${({ theme }) => theme.radii.sm};
`

const RoiBarProj = styled.div`
  position: absolute; inset: 0;
  border-radius: ${({ theme }) => theme.radii.sm};
`

const RoiBarLabel = styled.span`
  position: absolute; left: 6px; top: 50%; transform: translateY(-50%);
  font-size: 8px; font-weight: 700;
  color: ${({ theme }) => theme.colors.text}; z-index: 1;
`

const RoiBarTarget = styled.span`
  position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
  font-size: 8px; font-weight: 600;
  color: ${({ theme }) => theme.colors.emerald[600]};
  opacity: 0.8; z-index: 1;
`

const DealBadge = styled.div`
  font-size: 9px; font-weight: 700;
  color: ${({ theme }) => theme.colors.orange[600]};
  background: ${({ theme }) => theme.colors.orange[50]};
  border: 1px solid ${({ theme }) => theme.colors.orange[100]};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 1px 6px; margin-top: 2px;
`

const CategoryBadgesRow = styled.div`
  display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; margin-bottom: 2px;
`

const CategoryBadge = styled.span<{ $color: string }>`
  display: inline-flex; align-items: center; gap: 2px;
  padding: 1px 6px; font-size: 7px; font-weight: 900;
  border-radius: ${({ theme }) => theme.radii.md}; line-height: 1;
  background: ${({ $color }) => $color}15;
  border: 1px solid ${({ $color }) => $color}30;
  color: ${({ $color }) => $color};
`

const SignalRow = styled.div<{ $color?: string }>`
  display: flex; align-items: center; gap: 4px; margin-top: 2px;
  font-size: 8px; font-weight: 700;
  color: ${({ $color }) => $color || 'inherit'};
`

const PaybackText = styled.span`
  font-size: 7px; color: ${({ theme }) => theme.colors.textTertiary}; font-weight: 500;
`

const RiskRow = styled.div`
  display: flex; align-items: center; gap: 4px; margin-top: 2px;
  font-size: 8px; font-weight: 500;
`

const DemandRow = styled.div<{ $color?: string }>`
  display: flex; align-items: center; gap: 4px; margin-top: 2px;
  font-size: 8px; font-weight: 500;
  color: ${({ $color }) => $color || 'inherit'};
`

const DemandRate = styled.span`
  font-size: 7px; opacity: 0.6;
`

const CardFooter = styled.div`
  display: flex; align-items: flex-end; justify-content: space-between;
  margin-top: 4px; padding-top: 4px;
  border-top: 1px solid ${({ theme }) => theme.colors.borderLight};
`

const PriceCol = styled.div`
  display: flex; flex-direction: column;
`

const PriceRow = styled.div`
  display: flex; align-items: center; gap: 4px;
`

const PriceText = styled.span`
  font-size: 13px; font-weight: 900;
  color: ${({ theme }) => theme.colors.primary};
`

const PricePerDunam = styled.span`
  font-size: 9px; color: ${({ theme }) => theme.colors.textTertiary};
`

const MonthlyPayment = styled.span`
  font-size: 9px; color: ${({ theme }) => theme.colors.blue[500]}; opacity: 0.7;
`

const EntryCost = styled.span`
  font-size: 8px; color: ${({ theme }) => theme.colors.amber[500]}; opacity: 0.6;
`

const BuildableValue = styled.span`
  font-size: 8px; color: ${({ theme }) => theme.colors.purple[500]}; opacity: 0.7;
`

const DataCompleteness = styled.span`
  font-size: 8px; color: ${({ theme }) => theme.colors.textTertiary};
`

const TagsCol = styled.div`
  display: flex; flex-direction: column; align-items: flex-end; gap: 2px;
`

const RoiTag = styled.span`
  font-size: 11px; font-weight: 900;
  color: ${({ theme }) => theme.colors.emerald[600]};
`

const NetRoiTag = styled.span<{ $color: string }>`
  font-size: 8px; font-weight: 700; color: ${({ $color }) => $color};
`

const CagrTag = styled.span`
  font-size: 8px; font-weight: 600;
  color: ${({ theme }) => theme.colors.blue[500]}; opacity: 0.8;
`

const TimeTag = styled.span`
  display: flex; align-items: center; gap: 2px;
  font-size: 9px; color: ${({ theme }) => theme.colors.textTertiary};
`

const BadgeOverlay = styled.div`
  position: absolute; top: 6px; right: 6px; z-index: 10;
  display: flex; gap: 4px;
`

const FreshBadge = styled.span<{ $bg: string; $shadow: string }>`
  padding: 2px 6px; font-size: 8px; font-weight: 900;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $bg }) => $bg}; color: #fff;
  box-shadow: 0 1px 2px ${({ $shadow }) => $shadow}; line-height: 1;
`

const SoldOverlay = styled.div`
  position: absolute; inset: 0; z-index: 5; pointer-events: none;
  display: flex; align-items: center; justify-content: center;
`

const SoldBackdrop = styled.div`
  position: absolute; inset: 0; background: rgba(10, 22, 40, 0.4);
`

const SoldLabel = styled.span`
  position: relative; padding: 4px 12px;
  font-size: 10px; font-weight: 900; letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.red[400]};
  background: ${({ theme }) => theme.colors.red[500]}25;
  border: 1px solid ${({ theme }) => theme.colors.red[500]}30;
  border-radius: ${({ theme }) => theme.radii.lg};
  backdrop-filter: blur(4px); transform: rotate(-12deg);
  box-shadow: ${({ theme }) => theme.shadows.lg};
`

const NavigateBtn = styled.a`
  position: absolute; bottom: 6px; left: 6px; z-index: 10;
  width: 24px; height: 24px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer; transition: all ${({ theme }) => theme.transitions.fast};
  box-shadow: ${({ theme }) => theme.shadows.sm}; text-decoration: none;
  &:hover { background: ${({ theme }) => theme.colors.bgSecondary}; color: ${({ theme }) => theme.colors.primary}; text-decoration: none; }
  svg { width: 12px; height: 12px; }
`

const FavoriteBtn = styled.button<{ $active?: boolean }>`
  position: absolute; top: 6px; right: 6px; z-index: 10;
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textTertiary};
  cursor: pointer; transition: all ${({ theme }) => theme.transitions.fast};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  &:hover { color: ${({ theme }) => theme.colors.red[500]}; }
  ${({ $active, theme }) => $active && css`
    color: ${theme.colors.red[500]};
    background: ${theme.colors.red[50]};
    border-color: ${theme.colors.red[200]};
  `}
`

const FavoriteIcon = styled(Heart)<{ $active?: boolean }>`
  width: 14px; height: 14px;
  transition: transform ${({ theme }) => theme.transitions.fast};
  ${({ $active }) => $active && css`fill: currentColor; transform: scale(1.1);`}
`

const CompareBtn = styled.button<{ $active?: boolean }>`
  position: absolute; top: 38px; right: 6px; z-index: 10;
  width: 24px; height: 24px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer; transition: all ${({ theme }) => theme.transitions.fast};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  &:hover { color: ${({ theme }) => theme.colors.amber[500]}; }
  ${({ $active, theme }) => $active && css`
    color: ${theme.colors.amber[600]};
    background: ${theme.colors.amber[50]};
    border-color: ${theme.colors.amber[200]};
  `}
  svg { width: 12px; height: 12px; }
`

const MarketPositionRow = styled.div`
  display: flex; align-items: center; gap: 4px; margin-top: 2px;
`

const MarketPositionLabel = styled.span`
  font-size: 7px; color: ${({ theme }) => theme.colors.textTertiary};
`

const MarketPositionTrack = styled.div`
  position: relative; width: 56px; height: 6px; border-radius: 9999px;
  overflow: hidden; background: ${({ theme }) => theme.colors.bgTertiary};
`

const MarketPositionGradient = styled.div`
  position: absolute; inset: 0; border-radius: 9999px;
  background: linear-gradient(90deg, rgba(34,197,94,0.25), rgba(245,158,11,0.25), rgba(239,68,68,0.25));
`

const MarketPositionDotEl = styled.div<{ $left: number; $bg: string }>`
  position: absolute; top: 50%; transform: translateY(-50%);
  width: 8px; height: 8px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.4);
  box-shadow: ${({ theme }) => theme.shadows.sm};
  transition: all 0.5s ease;
  left: ${({ $left }) => `calc(${$left}% - 4px)`};
  background: ${({ $bg }) => $bg};
`

// ─── MarketPositionDot sub-component ─────────────────────────────────────

function MarketPositionDot({ percentile }: MarketPositionDotProps) {
  if (percentile == null) return null
  const label = percentile <= 25 ? '\u05D6\u05D5\u05DC' : percentile <= 50 ? '\u05DE\u05EA\u05D7\u05EA \u05DC\u05DE\u05DE\u05D5\u05E6\u05E2' : percentile <= 75 ? '\u05DE\u05E2\u05DC \u05D4\u05DE\u05DE\u05D5\u05E6\u05E2' : '\u05D9\u05E7\u05E8'
  return (
    <MarketPositionRow title={`\u05DE\u05D9\u05E7\u05D5\u05DD \u05D1\u05E9\u05D5\u05E7: ${label} (${percentile}% \u05DE\u05D4\u05D7\u05DC\u05E7\u05D5\u05EA \u05D6\u05D5\u05DC\u05D5\u05EA \u05D9\u05D5\u05EA\u05E8)`}>
      <MarketPositionLabel>\u05D6\u05D5\u05DC</MarketPositionLabel>
      <MarketPositionTrack>
        <MarketPositionGradient />
        <MarketPositionDotEl
          $left={percentile}
          $bg={percentile <= 30 ? '#22C55E' : percentile <= 70 ? '#F59E0B' : '#EF4444'}
        />
      </MarketPositionTrack>
      <MarketPositionLabel>\u05D9\u05E7\u05E8</MarketPositionLabel>
    </MarketPositionRow>
  )
}

// ─── PlotCardItem ────────────────────────────────────────────────────────

export const PlotCardItem = memo(function PlotCardItem({ plot, isSelected, isCompared, isFavorite, wasViewed, areaAvgPsm, onSelectPlot, onToggleCompare, onToggleFavorite, prefetchPlot, priceChange, pricePercentile, categoryBadges, distanceKm, imagePriority = false, observeImpression }: PlotCardItemProps) {
  const viewportRef = useViewportPrefetch(
    () => prefetchPlot(plot.id),
    { rootMargin: '200px', skip: isSelected }
  )
  const color = statusColors[plot.status]
  const price = plot.total_price ?? plot.totalPrice
  const projValue = plot.projected_value ?? plot.projectedValue
  const roi = plot._roi ?? (price ? Math.round((projValue - price) / price * 100) : 0)
  const blockNum = plot.block_number ?? plot.blockNumber
  const sizeSqM = plot.size_sqm ?? plot.sizeSqM ?? 0
  const readiness = plot.readiness_estimate ?? plot.readinessEstimate
  const pricePerDunam = sizeSqM > 0 ? formatPriceShort(Math.round(price / sizeSqM * 1000)) : null

  const demandVelocity = useMemo(() => calcDemandVelocity(plot), [plot])

  const createdAt = plot.created_at ?? plot.createdAt
  const daysSinceCreated = plot._daysOnMarket ?? (createdAt ? Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)) : Infinity)
  const isNew = daysSinceCreated <= 7
  const viewCount = plot.views ?? 0
  const isHot = viewCount >= 10
  const isTrending = viewCount >= 5 && viewCount < 10

  return (
    <Card
      ref={(el) => {
        if (typeof viewportRef === 'function') viewportRef(el)
        else if (viewportRef) viewportRef.current = el
        if (observeImpression && el) observeImpression(el, plot.id)
      }}
      data-plot-id={plot.id}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={() => onSelectPlot(plot)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectPlot(plot) } }}
      onMouseEnter={() => prefetchPlot(plot.id)}
      onFocus={() => prefetchPlot(plot.id)}
      $isSelected={isSelected}
      $isCompared={isCompared}
      $isSold={plot.status === 'SOLD'}
      style={{ '--card-color': color } as React.CSSProperties}
      aria-label={`${plot.status === 'SOLD' ? '\u05E0\u05DE\u05DB\u05E8 \u2014 ' : ''}\u05D2\u05D5\u05E9 ${blockNum} \u05D7\u05DC\u05E7\u05D4 ${plot.number}, ${plot.city}, ${formatPriceShort(price)}, \u05EA\u05E9\u05D5\u05D0\u05D4 +${roi}%`}
    >
      {(isNew || isHot || isTrending || priceChange) && (
        <BadgeOverlay>
          {isNew && <FreshBadge $bg="#22C55E" $shadow="rgba(34,197,94,0.4)">\u05D7\u05D3\u05E9!</FreshBadge>}
          {isHot && !isNew && <FreshBadge $bg="#F97316" $shadow="rgba(249,115,22,0.4)">{'\uD83D\uDD25'} \u05E4\u05D5\u05E4\u05D5\u05DC\u05E8\u05D9</FreshBadge>}
          {isTrending && !isHot && !isNew && <FreshBadge $bg="#8B5CF6" $shadow="rgba(139,92,246,0.4)">{'\uD83D\uDCC8'} \u05D1\u05DE\u05D2\u05DE\u05D4</FreshBadge>}
          {priceChange && priceChange.direction === 'down' && <FreshBadge $bg="#16A34A" $shadow="rgba(22,163,74,0.4)">{'\u2193'} \u05D9\u05E8\u05D3 {priceChange.pctChange}%</FreshBadge>}
          {priceChange && priceChange.direction === 'up' && <FreshBadge $bg="rgba(239,68,68,0.8)" $shadow="rgba(239,68,68,0.4)">{'\u2191'} \u05E2\u05DC\u05D4 {priceChange.pctChange}%</FreshBadge>}
        </BadgeOverlay>
      )}

      {plot.status === 'SOLD' && <SoldOverlay><SoldBackdrop /><SoldLabel>\u05E0\u05DE\u05DB\u05E8</SoldLabel></SoldOverlay>}

      <CardImageCarousel images={plot.plot_images} blockNum={blockNum} color={color} isCompared={isCompared} priority={imagePriority} />
      <PlotShareButtons plot={plot} blockNum={blockNum} price={price} roi={roi} />
      <QuickCopyButton plot={plot} />

      {(() => {
        const navUrl = plotNavigateUrl(plot.coordinates)
        if (!navUrl) return null
        return (
          <NavigateBtn href={navUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title="\u05E0\u05D5\u05D5\u05D8 \u05DC\u05D7\u05DC\u05E7\u05D4 (Google Maps)" aria-label="\u05E0\u05D5\u05D5\u05D8 \u05DC\u05D7\u05DC\u05E7\u05D4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>
          </NavigateBtn>
        )
      })()}

      {onToggleFavorite && (
        <FavoriteBtn onClick={(e) => { e.stopPropagation(); onToggleFavorite(plot.id) }} $active={isFavorite} title={isFavorite ? '\u05D4\u05E1\u05E8 \u05DE\u05DE\u05D5\u05E2\u05D3\u05E4\u05D9\u05DD' : '\u05D4\u05D5\u05E1\u05E3 \u05DC\u05DE\u05D5\u05E2\u05D3\u05E4\u05D9\u05DD'} aria-label={isFavorite ? '\u05D4\u05E1\u05E8 \u05DE\u05DE\u05D5\u05E2\u05D3\u05E4\u05D9\u05DD' : '\u05D4\u05D5\u05E1\u05E3 \u05DC\u05DE\u05D5\u05E2\u05D3\u05E4\u05D9\u05DD'} aria-pressed={isFavorite}>
          <FavoriteIcon $active={isFavorite} />
        </FavoriteBtn>
      )}

      {onToggleCompare && (
        <CompareBtn onClick={(e) => { e.stopPropagation(); onToggleCompare(plot.id) }} $active={isCompared} title={isCompared ? '\u05D4\u05E1\u05E8 \u05DE\u05D4\u05E9\u05D5\u05D5\u05D0\u05D4' : '\u05D4\u05D5\u05E1\u05E3 \u05DC\u05D4\u05E9\u05D5\u05D5\u05D0\u05D4'}>
          <GitCompareArrows />
        </CompareBtn>
      )}

      <CardBody>
        <CardHeader>
          <CardTitle>
            {wasViewed && !isSelected && <ViewedDot title="\u05E0\u05E6\u05E4\u05D4 \u05DC\u05D0\u05D7\u05E8\u05D5\u05E0\u05D4" />}
            \u05D2\u05D5\u05E9 {blockNum} | \u05D7\u05DC\u05E7\u05D4 {plot.number}
          </CardTitle>
          <StatusBadgeEl $bg={`${color}20`} $color={color}>{statusLabels[plot.status]}</StatusBadgeEl>
        </CardHeader>

        <CityRow>
          <MapPin style={{ width: 10, height: 10, flexShrink: 0 }} />
          <span>{plot.city}</span>
          {distanceKm != null && <DistanceText title={`${distanceKm.toFixed(1)} \u05E7\u05F4\u05DD \u05DE\u05DE\u05D9\u05E7\u05D5\u05DE\u05DA`}>{'\uD83D\uDCCD'} {formatDistanceKm(distanceKm)}</DistanceText>}
          {(() => {
            const score = plot._investmentScore ?? calcInvestmentScore(plot)
            const { grade, color } = getInvestmentGrade(score)
            return <ScoreBadge $color={color} title={`\u05D3\u05D9\u05E8\u05D5\u05D2 \u05D4\u05E9\u05E7\u05E2\u05D4: ${grade} (${score}/10)`}>{plot._grade || grade}</ScoreBadge>
          })()}
          {plot._marketTrend && plot._marketTrend.direction !== 'stable' && (
            <MarketTrendText $direction={plot._marketTrend.direction} title={`\u05DE\u05D2\u05DE\u05EA \u05D0\u05D6\u05D5\u05E8 ${plot.city}: ${plot._marketTrend.direction === 'up' ? '\u05E2\u05DC\u05D9\u05D9\u05D4' : '\u05D9\u05E8\u05D9\u05D3\u05D4'} ${Math.abs(plot._marketTrend.changePct)}% \u05D1-30 \u05D9\u05D5\u05DD`}>
              {plot._marketTrend.direction === 'up' ? '\uD83D\uDCC8' : '\uD83D\uDCC9'} {plot._marketTrend.changePct > 0 ? '+' : ''}{plot._marketTrend.changePct}%
            </MarketTrendText>
          )}
          {viewCount > 0 ? (
            <ViewCountText title={`${viewCount} \u05E6\u05E4\u05D9\u05D5\u05EA`}>{'\uD83D\uDC41'} {viewCount}</ViewCountText>
          ) : (() => {
            const updatedAt = plot.updated_at ?? plot.updatedAt
            const freshness = formatRelativeTime(updatedAt)
            if (!freshness) return null
            return <FreshnessText title={`\u05E2\u05D5\u05D3\u05DB\u05DF ${freshness}`}>{freshness}</FreshnessText>
          })()}
        </CityRow>

        <RoiBar>
          <RoiBarFill style={{ width: `${Math.min(100, Math.max(8, (price / (projValue || 1)) * 100))}%`, background: 'linear-gradient(90deg, #3B82F6, #60A5FA)' }} />
          <RoiBarProj style={{ width: '100%', background: 'linear-gradient(90deg, rgba(34,197,94,0.15), rgba(34,197,94,0.08))' }} />
          <RoiBarLabel>{formatPriceShort(price)}</RoiBarLabel>
          <RoiBarTarget>{'\u2192'} {formatPriceShort(projValue)}</RoiBarTarget>
        </RoiBar>

        {(() => { if (!areaAvgPsm || sizeSqM <= 0) return null; const plotPsm = price / sizeSqM; const diffPct = Math.round(((plotPsm - areaAvgPsm) / areaAvgPsm) * 100); if (diffPct >= -3) return null; return <DealBadge>{'\uD83D\uDD25'} {Math.abs(diffPct)}% \u05DE\u05EA\u05D7\u05EA \u05DC\u05DE\u05DE\u05D5\u05E6\u05E2</DealBadge> })()}

        {categoryBadges && categoryBadges.length > 0 && (
          <CategoryBadgesRow>
            {categoryBadges.map((badge, i) => <CategoryBadge key={i} $color={badge.color} title={badge.label}><span>{badge.emoji}</span><span>{badge.label}</span></CategoryBadge>)}
          </CategoryBadgesRow>
        )}

        {(() => { const zoningStage = plot.zoning_stage ?? plot.zoningStage; if (!zoningStage) return null; return <ZoningProgressBar currentStage={zoningStage} variant="compact" style={{ marginTop: 2 }} /> })()}

        {plot._buySignal && (
          <SignalRow $color={plot._buySignal.signal === 'BUY' ? '#10B981' : plot._buySignal.signal === 'HOLD' ? '#F59E0B' : '#64748B'} title={`\u05D0\u05D5\u05EA \u05D4\u05E9\u05E7\u05E2\u05D4: ${plot._buySignal.label} (\u05E6\u05D9\u05D5\u05DF ${plot._buySignal.strength}/10) \u2014 \u05DE\u05D1\u05D5\u05E1\u05E1 \u05E2\u05DC \u05DE\u05D7\u05D9\u05E8 \u05DE\u05D5\u05DC \u05DE\u05DE\u05D5\u05E6\u05E2, \u05EA\u05E9\u05D5\u05D0\u05D4 \u05E0\u05D8\u05D5, \u05E1\u05D9\u05DB\u05D5\u05DF, \u05DE\u05D2\u05DE\u05EA \u05D0\u05D6\u05D5\u05E8 \u05D5\u05D3\u05D9\u05E8\u05D5\u05D2`}>
            <span>{plot._buySignal.label}</span>
            {plot._paybackYears != null && plot._paybackYears > 0 && <PaybackText title={`\u05D4\u05D7\u05D6\u05E8 \u05D4\u05E9\u05E7\u05E2\u05D4 \u05DE\u05DC\u05D0 \u05EA\u05D5\u05DA ~${plot._paybackYears} \u05E9\u05E0\u05D9\u05DD (\u05DB\u05D5\u05DC\u05DC \u05DB\u05DC \u05D4\u05E2\u05DC\u05D5\u05D9\u05D5\u05EA)`}>{'\u00B7'} \u05D4\u05D7\u05D6\u05E8 {plot._paybackYears}\u05E9\u05E0\u05F3</PaybackText>}
          </SignalRow>
        )}

        {plot._riskLevel && plot._riskLevel !== 'low' && !plot._buySignal && (
          <RiskRow title={plot._riskFactors?.length > 0 ? `\u05D2\u05D5\u05E8\u05DE\u05D9 \u05E1\u05D9\u05DB\u05D5\u05DF: ${plot._riskFactors.join(', ')}` : `\u05E1\u05D9\u05DB\u05D5\u05DF: ${plot._riskScore}/100`}>
            {plot._riskLevel === 'medium' && <span style={{ color: '#F59E0B', opacity: 0.8 }}>{'\u26A0\uFE0F'} \u05E1\u05D9\u05DB\u05D5\u05DF \u05D1\u05D9\u05E0\u05D5\u05E0\u05D9</span>}
            {plot._riskLevel === 'high' && <span style={{ color: '#FB923C', opacity: 0.8 }}>{'\uD83D\uDD36'} \u05E1\u05D9\u05DB\u05D5\u05DF \u05D2\u05D1\u05D5\u05D4</span>}
            {plot._riskLevel === 'very_high' && <span style={{ color: '#F87171', opacity: 0.8 }}>{'\uD83D\uDD34'} \u05E1\u05D9\u05DB\u05D5\u05DF \u05D2\u05D1\u05D5\u05D4 \u05DE\u05D0\u05D5\u05D3</span>}
          </RiskRow>
        )}

        {demandVelocity && demandVelocity.tier !== 'low' && (
          <DemandRow $color={demandVelocity.color} title={`${demandVelocity.velocity} \u05E6\u05E4\u05D9\u05D5\u05EA/\u05D9\u05D5\u05DD`}>
            <span>{demandVelocity.emoji}</span>
            <span>{demandVelocity.label}</span>
            <DemandRate>({demandVelocity.velocity}/\u05D9\u05D5\u05DD)</DemandRate>
          </DemandRow>
        )}

        <CardFooter>
          <PriceCol>
            <PriceRow>
              <PriceText>{formatPriceShort(price)}</PriceText>
              <PriceSparkline currentPrice={price} projectedValue={projValue} />
            </PriceRow>
            {pricePerDunam && <PricePerDunam>{pricePerDunam}/\u05D3\u05D5\u05E0\u05DD</PricePerDunam>}
            {(() => { const payment = calcMonthlyPayment(price); if (!payment) return null; return <MonthlyPayment title={`\u05D4\u05D5\u05DF \u05E2\u05E6\u05DE\u05D9: ${formatPriceShort(payment.downPayment)} | \u05D4\u05DC\u05D5\u05D5\u05D0\u05D4: ${formatPriceShort(payment.loanAmount)}`}>~{formatMonthlyPayment(payment.monthly)}</MonthlyPayment> })()}
            {(() => {
              if (price <= 0) return null
              if (plot._totalEntryCost) { return <EntryCost title={`\u05E1\u05D4\u05F4\u05DB \u05E2\u05DC\u05D5\u05EA \u05DB\u05E0\u05D9\u05E1\u05D4: ${formatPriceShort(plot._totalEntryCost)}\n\u05DB\u05D5\u05DC\u05DC: \u05DE\u05E1 \u05E8\u05DB\u05D9\u05E9\u05D4 6%, \u05E9\u05DB\u05F4\u05D8 \u05E2\u05D5\u05F4\u05D3 1.75%, \u05E9\u05DE\u05D0\u05D9, \u05E8\u05D9\u05E9\u05D5\u05DD`}>{'\uD83D\uDD11'} \u05DB\u05E0\u05D9\u05E1\u05D4: {formatPriceShort(plot._totalEntryCost)}</EntryCost> }
              const txn = calcTransactionCosts(price)
              return <EntryCost title={`\u05E1\u05D4\u05F4\u05DB \u05E2\u05DC\u05D5\u05EA \u05DB\u05E0\u05D9\u05E1\u05D4: ${formatPriceShort(txn.totalWithPurchase)}\n\u05DE\u05E1 \u05E8\u05DB\u05D9\u05E9\u05D4: ${formatPriceShort(txn.purchaseTax)} (6%)\n\u05E9\u05DB\u05F4\u05D8 \u05E2\u05D5\u05F4\u05D3: ${formatPriceShort(txn.attorneyFees)}\n\u05E9\u05DE\u05D0\u05D9: ${formatPriceShort(txn.appraiserFee)}`}>{'\uD83D\uDD11'} \u05DB\u05E0\u05D9\u05E1\u05D4: {formatPriceShort(txn.totalWithPurchase)}</EntryCost>
            })()}
            {(() => { const bv = calcBuildableValue(plot); if (!bv) return null; return <BuildableValue title={`${bv.estimatedUnits} \u05D9\u05D7\u05F3 \u05D3\u05D9\u05D5\u05E8 \u00B7 ${formatPriceShort(bv.pricePerUnit)}/\u05D9\u05D7\u05F3 \u00B7 ${bv.totalBuildableArea.toLocaleString()} \u05DE\u05F4\u05E8 \u05D1\u05E0\u05D5\u05D9`}>{'\uD83C\uDFE2'} {formatPriceShort(bv.pricePerBuildableSqm)}/\u05DE\u05F4\u05E8 \u05D1\u05E0\u05D5\u05D9</BuildableValue> })()}
            <MarketPositionDot percentile={pricePercentile} />
            {plot._dataCompleteness != null && plot._dataCompleteness < 70 && (
              <DataCompleteness title={`\u05E9\u05DC\u05DE\u05D5\u05EA \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD: ${plot._dataCompleteness}% \u2014 ${plot._dataCompleteness < 40 ? '\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D7\u05DC\u05E7\u05D9\u05D9\u05DD' : '\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05E1\u05D1\u05D9\u05E8\u05D9\u05DD'}`}>
                {plot._dataCompleteness < 40 ? '\uD83D\uDD34' : '\uD83D\uDFE1'} \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD {plot._dataCompleteness}%
              </DataCompleteness>
            )}
          </PriceCol>
          <TagsCol>
            <RoiTag title={plot._netRoi != null ? `\u05D1\u05E8\u05D5\u05D8\u05D5 +${roi}% \u00B7 \u05E0\u05D8\u05D5 +${plot._netRoi}% (\u05D0\u05D7\u05E8\u05D9 \u05DE\u05E1, \u05D4\u05D9\u05D8\u05DC \u05D4\u05E9\u05D1\u05D7\u05D4, \u05E2\u05DC\u05D5\u05D9\u05D5\u05EA)` : `\u05EA\u05E9\u05D5\u05D0\u05D4 \u05D1\u05E8\u05D5\u05D8\u05D5`}>+{roi}%</RoiTag>
            {plot._netRoi != null && plot._netRoi !== roi && (
              <NetRoiTag $color={plot._netRoi >= 50 ? '#10B981' : plot._netRoi >= 20 ? '#F59E0B' : plot._netRoi >= 0 ? '#FB923C' : '#F87171'} title={`\u05EA\u05E9\u05D5\u05D0\u05D4 \u05E0\u05D8\u05D5: +${plot._netRoi}% \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05D4\u05E2\u05DC\u05D5\u05D9\u05D5\u05EA (\u05DE\u05E1 \u05E8\u05DB\u05D9\u05E9\u05D4, \u05D4\u05D9\u05D8\u05DC \u05D4\u05E9\u05D1\u05D7\u05D4, \u05DE\u05E1 \u05E9\u05D1\u05D7, \u05E9\u05DB\u05F4\u05D8, \u05D0\u05D7\u05D6\u05E7\u05D4)`}>
                \u05E0\u05D8\u05D5 {plot._netRoi > 0 ? '+' : ''}{plot._netRoi}%
              </NetRoiTag>
            )}
            {(() => {
              const serverCagr = plot._cagr; const serverYears = plot._holdingYears
              if (serverCagr != null && serverCagr > 0) return <CagrTag title={`\u05EA\u05E9\u05D5\u05D0\u05D4 \u05E9\u05E0\u05EA\u05D9\u05EA \u05E2\u05DC \u05D1\u05E1\u05D9\u05E1 ${serverYears || '?'} \u05E9\u05E0\u05D9\u05DD`}>{serverCagr}%/\u05E9\u05E0\u05D4</CagrTag>
              const cagrData = calcCAGR(roi, readiness); if (!cagrData) return null
              return <CagrTag title={`\u05EA\u05E9\u05D5\u05D0\u05D4 \u05E9\u05E0\u05EA\u05D9\u05EA \u05E2\u05DC \u05D1\u05E1\u05D9\u05E1 ${cagrData.years} \u05E9\u05E0\u05D9\u05DD`}>{cagrData.cagr}%/\u05E9\u05E0\u05D4</CagrTag>
            })()}
            {readiness && <TimeTag><Clock style={{ width: 10, height: 10 }} />{readiness}</TimeTag>}
          </TagsCol>
        </CardFooter>
      </CardBody>
    </Card>
  )
})
