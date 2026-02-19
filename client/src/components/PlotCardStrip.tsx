import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react'
import styled, { css, keyframes } from 'styled-components'
import { MapPin, Clock, ChevronLeft, ChevronRight, TrendingUp, BarChart3, Ruler, GitCompareArrows, Share2, Heart, Clipboard, Check } from 'lucide-react'
import ZoningProgressBar from './ui/ZoningProgressBar'
import CardImageCarousel from './ui/CardImageCarousel'
import { statusColors, statusLabels } from '../utils/constants'
import { formatPriceShort, formatCurrency, formatRelativeTime, getFreshnessColor, formatMonthlyPayment, formatDistanceKm } from '../utils/format'
import { calcInvestmentScore, getScoreLabel, getInvestmentGrade, calcCAGR, calcMonthlyPayment, calcDemandVelocity, calcBestInCategory, calcBuildableValue } from '../utils/investment'
import { plotCenter, plotNavigateUrl, haversineKm } from '../utils/geo'
import { calcTransactionCosts } from '../utils/plot'
import { usePrefetchPlot } from '../hooks/usePlots'
import { useAreaAverages } from '../hooks/useMarket'
import { whatsappShareLink, useNativeShare, buildPlotShareData } from '../utils/config'
import { useDragScroll } from '../hooks/useUI'
import { useViewportPrefetch } from '../hooks/useInfra'
import { useImpressionTracker } from '../hooks/useTracking'
import SmartInsights from './SmartInsights'
import { useRecentlyViewed } from '../hooks/useUserData'
import { theme, media } from '../styles/theme'

// ─── Inline: PriceSparkline (was ui/PriceSparkline.tsx) ──────────────────
const Spark = styled.svg`
  display: inline-block;
`

interface PriceSparklineProps {
  currentPrice: number
  projectedValue?: number
  className?: string
}

function PriceSparkline({ currentPrice, projectedValue, className }: PriceSparklineProps) {
  const points = useMemo(() => {
    if (!currentPrice || currentPrice <= 0) return null
    const proj = projectedValue || currentPrice
    const trend = (proj - currentPrice) / currentPrice

    const steps = 5
    const values: number[] = []
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1)
      const progress = t * t * (3 - 2 * t)
      const noise = Math.sin(i * 2.1) * 0.03
      values.push(currentPrice * (1 + trend * progress + noise))
    }

    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1

    const w = 48
    const h = 16
    const padding = 1

    return values.map((v, i) => ({
      x: padding + (i / (steps - 1)) * (w - padding * 2),
      y: padding + (1 - (v - min) / range) * (h - padding * 2),
    }))
  }, [currentPrice, projectedValue])

  if (!points) return null

  const isUp = (projectedValue || 0) >= (currentPrice || 0)
  const color = isUp ? theme.colors.emerald : theme.colors.red
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <Spark width="48" height="16" viewBox="0 0 48 16" className={className} aria-label={isUp ? 'מגמת עלייה' : 'מגמת ירידה'}>
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2" fill={color} />
    </Spark>
  )
}

// ─── TypeScript types ────────────────────────────────────────────────────
interface MarketPositionDotProps {
  percentile: number | null | undefined
}

interface PlotShareButtonsProps {
  plot: any
  blockNum: string | number
  price: number
  roi: number
}

interface QuickCopyButtonProps {
  plot: any
}

interface PlotCardItemProps {
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

// ─── Styled Components — Strip wrapper & layout ──────────────────────────
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
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 32px;
  background: linear-gradient(to left, ${({ theme }) => theme.colors.bg}, transparent);
  pointer-events: none;
  z-index: 5;
`

const StripFadeLeft = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 32px;
  background: linear-gradient(to right, ${({ theme }) => theme.colors.bg}, transparent);
  pointer-events: none;
  z-index: 5;
`

const StripArrow = styled.button`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.md};
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textSecondary};
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.bgSecondary};
    color: ${({ theme }) => theme.colors.text};
  }

  ${media.sm} {
    display: flex;
  }
`

const StripArrowRight = styled(StripArrow)`
  left: 8px;
`

const StripArrowLeft = styled(StripArrow)`
  right: 8px;
`

// ─── Stats bar ───────────────────────────────────────────────────────────
const StatsBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  overflow-x: auto;
  scrollbar-width: none;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textSecondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderLight};
  white-space: nowrap;
  &::-webkit-scrollbar { display: none; }
`

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`

const StatDivider = styled.div`
  width: 1px;
  height: 12px;
  background: ${({ theme }) => theme.colors.border};
  flex-shrink: 0;
`

const MarketTempBadge = styled.div<{ $bg: string; $borderColor: string }>`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ $borderColor }) => $borderColor};
  background: ${({ $bg }) => $bg};
`

// ─── Scroll position indicator ───────────────────────────────────────────
const ScrollIndicator = styled.div`
  position: absolute;
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: none;
`

const ScrollIndicatorInner = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`

const ScrollIndicatorText = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-weight: 500;
  font-variant-numeric: tabular-nums;
`

const ScrollProgressTrack = styled.div`
  width: 48px;
  height: 4px;
  border-radius: 9999px;
  background: ${({ theme }) => theme.colors.bgTertiary};
  overflow: hidden;
`

const ScrollProgressFill = styled.div<{ $width: number }>`
  height: 100%;
  border-radius: 9999px;
  background: ${({ theme }) => theme.colors.primary};
  opacity: 0.4;
  transition: width 0.2s ease;
  width: ${({ $width }) => Math.max(8, $width)}%;
`

// ─── Card ────────────────────────────────────────────────────────────────
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

  ${({ $isSelected, theme }) => $isSelected && css`
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 2px ${theme.colors.primary}33;
  `}

  ${({ $isCompared, theme }) => $isCompared && css`
    border-color: ${theme.colors.amber[500]};
    box-shadow: 0 0 0 2px ${theme.colors.amber[500]}33;
  `}

  ${({ $isSold }) => $isSold && css`
    opacity: 0.65;
    filter: grayscale(0.2);
  `}
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
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  flex-shrink: 0;
  opacity: 0.5;
`

const StatusBadge = styled.span<{ $bg: string; $color: string }>`
  font-size: 8px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 9999px;
  white-space: nowrap;
  flex-shrink: 0;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
`

const CityRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: ${({ theme }) => theme.colors.textSecondary};
  flex-wrap: wrap;
`

const ScoreBadge = styled.span<{ $color: string }>`
  font-size: 8px;
  font-weight: 800;
  padding: 0 4px;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ $color }) => $color}30;
  background: ${({ $color }) => $color}15;
  color: ${({ $color }) => $color};
`

const MarketTrendText = styled.span<{ $direction: string }>`
  font-size: 7px;
  font-weight: 700;
  color: ${({ $direction, theme }) =>
    $direction === 'up' ? theme.colors.emerald[400] : theme.colors.red[400]};
  opacity: 0.8;
`

const ViewCountText = styled.span`
  font-size: 8px;
  color: ${({ theme }) => theme.colors.purple[400]};
  opacity: 0.6;
  margin-right: auto;
`

const FreshnessText = styled.span<{ $colorClass?: string }>`
  font-size: 8px;
  margin-right: auto;
  opacity: 0.7;
  color: ${({ theme }) => theme.colors.textTertiary};
`

// ─── ROI bar ─────────────────────────────────────────────────────────────
const RoiBar = styled.div`
  position: relative;
  height: 16px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bgTertiary};
  overflow: hidden;
  margin-top: 2px;
`

const RoiBarFill = styled.div`
  position: absolute;
  inset: 0;
  border-radius: ${({ theme }) => theme.radii.sm};
`

const RoiBarProj = styled.div`
  position: absolute;
  inset: 0;
  border-radius: ${({ theme }) => theme.radii.sm};
`

const RoiBarLabel = styled.span`
  position: absolute;
  left: 6px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 8px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  z-index: 1;
`

const RoiBarTarget = styled.span`
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 8px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.emerald[600]};
  opacity: 0.8;
  z-index: 1;
`

// ─── Deal badge ──────────────────────────────────────────────────────────
const DealBadge = styled.div`
  font-size: 9px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.orange[600]};
  background: ${({ theme }) => theme.colors.orange[50]};
  border: 1px solid ${({ theme }) => theme.colors.orange[100]};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 1px 6px;
  margin-top: 2px;
`

// ─── Category badges ─────────────────────────────────────────────────────
const CategoryBadgesRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
  margin-bottom: 2px;
`

const CategoryBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 6px;
  font-size: 7px;
  font-weight: 900;
  border-radius: ${({ theme }) => theme.radii.md};
  line-height: 1;
  background: ${({ $color }) => $color}15;
  border: 1px solid ${({ $color }) => $color}30;
  color: ${({ $color }) => $color};
`

// ─── Signal & risk rows ──────────────────────────────────────────────────
const SignalRow = styled.div<{ $color?: string }>`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  font-size: 8px;
  font-weight: 700;
  color: ${({ $color }) => $color || 'inherit'};
`

const PaybackText = styled.span`
  font-size: 7px;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-weight: 500;
`

const RiskRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  font-size: 8px;
  font-weight: 500;
`

const DemandRow = styled.div<{ $color?: string }>`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  font-size: 8px;
  font-weight: 500;
  color: ${({ $color }) => $color || 'inherit'};
`

const DemandRate = styled.span`
  font-size: 7px;
  opacity: 0.6;
`

// ─── Footer ──────────────────────────────────────────────────────────────
const CardFooter = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid ${({ theme }) => theme.colors.borderLight};
`

const PriceCol = styled.div`
  display: flex;
  flex-direction: column;
`

const PriceRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

const PriceText = styled.span`
  font-size: 13px;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.primary};
`

const PricePerDunam = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.colors.textTertiary};
`

const MonthlyPayment = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.colors.blue[500]};
  opacity: 0.7;
`

const EntryCost = styled.span`
  font-size: 8px;
  color: ${({ theme }) => theme.colors.amber[500]};
  opacity: 0.6;
`

const BuildableValue = styled.span`
  font-size: 8px;
  color: ${({ theme }) => theme.colors.purple[500]};
  opacity: 0.7;
`

const DataCompleteness = styled.span`
  font-size: 8px;
  color: ${({ theme }) => theme.colors.textTertiary};
`

const TagsCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
`

const RoiTag = styled.span`
  font-size: 11px;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.emerald[600]};
`

const NetRoiTag = styled.span<{ $color: string }>`
  font-size: 8px;
  font-weight: 700;
  color: ${({ $color }) => $color};
`

const CagrTag = styled.span`
  font-size: 8px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.blue[500]};
  opacity: 0.8;
`

const TimeTag = styled.span`
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 9px;
  color: ${({ theme }) => theme.colors.textTertiary};
`

// ─── Freshness / popularity badges (top-right overlay) ───────────────────
const BadgeOverlay = styled.div`
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 10;
  display: flex;
  gap: 4px;
`

const FreshBadge = styled.span<{ $bg: string; $shadow: string }>`
  padding: 2px 6px;
  font-size: 8px;
  font-weight: 900;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $bg }) => $bg};
  color: #fff;
  box-shadow: 0 1px 2px ${({ $shadow }) => $shadow};
  line-height: 1;
`

// ─── Sold overlay ────────────────────────────────────────────────────────
const SoldOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
`

const SoldBackdrop = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(10, 22, 40, 0.4);
`

const SoldLabel = styled.span`
  position: relative;
  padding: 4px 12px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.red[400]};
  background: ${({ theme }) => theme.colors.red[500]}25;
  border: 1px solid ${({ theme }) => theme.colors.red[500]}30;
  border-radius: ${({ theme }) => theme.radii.lg};
  backdrop-filter: blur(4px);
  transform: rotate(-12deg);
  box-shadow: ${({ theme }) => theme.shadows.lg};
`

// ─── Action buttons (share, copy, navigate, favorite, compare) ───────────
const ShareGroup = styled.div`
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 10;
  display: flex;
  gap: 4px;
`

const ActionBtn = styled.button`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  box-shadow: ${({ theme }) => theme.shadows.sm};

  &:hover {
    background: ${({ theme }) => theme.colors.bgSecondary};
    color: ${({ theme }) => theme.colors.text};
  }

  svg {
    width: 12px;
    height: 12px;
  }
`

const CopyBtn = styled(ActionBtn)<{ $copied?: boolean }>`
  position: absolute;
  top: 32px;
  left: 6px;
  z-index: 10;

  ${({ $copied, theme }) => $copied && css`
    background: ${theme.colors.emerald[500]};
    border-color: ${theme.colors.emerald[500]};
    color: #fff;
  `}
`

const NavigateBtn = styled.a`
  position: absolute;
  bottom: 6px;
  left: 6px;
  z-index: 10;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  text-decoration: none;

  &:hover {
    background: ${({ theme }) => theme.colors.bgSecondary};
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
  }

  svg {
    width: 12px;
    height: 12px;
  }
`

const FavoriteBtn = styled.button<{ $active?: boolean }>`
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 10;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textTertiary};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  box-shadow: ${({ theme }) => theme.shadows.sm};

  &:hover {
    color: ${({ theme }) => theme.colors.red[500]};
  }

  ${({ $active, theme }) => $active && css`
    color: ${theme.colors.red[500]};
    background: ${theme.colors.red[50]};
    border-color: ${theme.colors.red[200]};
  `}
`

const FavoriteIcon = styled(Heart)<{ $active?: boolean }>`
  width: 14px;
  height: 14px;
  transition: transform ${({ theme }) => theme.transitions.fast};
  ${({ $active }) => $active && css`
    fill: currentColor;
    transform: scale(1.1);
  `}
`

const CompareBtn = styled.button<{ $active?: boolean }>`
  position: absolute;
  top: 38px;
  right: 6px;
  z-index: 10;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  box-shadow: ${({ theme }) => theme.shadows.sm};

  &:hover {
    color: ${({ theme }) => theme.colors.amber[500]};
  }

  ${({ $active, theme }) => $active && css`
    color: ${theme.colors.amber[600]};
    background: ${theme.colors.amber[50]};
    border-color: ${theme.colors.amber[200]};
  `}

  svg {
    width: 12px;
    height: 12px;
  }
`

// ─── Market position dot ─────────────────────────────────────────────────
const MarketPositionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
`

const MarketPositionLabel = styled.span`
  font-size: 7px;
  color: ${({ theme }) => theme.colors.textTertiary};
`

const MarketPositionTrack = styled.div`
  position: relative;
  width: 56px;
  height: 6px;
  border-radius: 9999px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.bgTertiary};
`

const MarketPositionGradient = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  background: linear-gradient(90deg, rgba(34,197,94,0.25), rgba(245,158,11,0.25), rgba(239,68,68,0.25));
`

const MarketPositionDotEl = styled.div<{ $left: number; $bg: string }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.4);
  box-shadow: ${({ theme }) => theme.shadows.sm};
  transition: all 0.5s ease;
  left: ${({ $left }) => `calc(${$left}% - 4px)`};
  background: ${({ $bg }) => $bg};
`

// ─── Skeleton ────────────────────────────────────────────────────────────
const SkeletonCard = styled.div`
  flex-shrink: 0;
  width: 200px;
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
  opacity: 0.6;
  pointer-events: none;
`

const SkeletonAccent = styled.div`
  height: 80px;
  background: ${({ theme }) => theme.colors.bgTertiary};
  animation: ${pulseAnim} 1.5s ease-in-out infinite;
`

const SkeletonBody = styled.div`
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const SkeletonLine = styled.div<{ $width?: string; $height?: string }>`
  height: ${({ $height }) => $height || '12px'};
  width: ${({ $width }) => $width || '100%'};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bgTertiary};
  animation: ${pulseAnim} 1.5s ease-in-out infinite;
`

const SkeletonFooter = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
`

// ─── Empty state ─────────────────────────────────────────────────────────
const EmptyRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 24px;
`

const EmptyBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  background: ${({ theme }) => theme.colors.bgSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 16px 20px;
  max-width: 480px;

  ${media.sm} {
    flex-direction: row;
    gap: 16px;
  }
`

const EmptyIcon = styled.span`
  font-size: 30px;
`

const EmptyContent = styled.div`
  text-align: center;
  ${media.sm} { text-align: right; }
`

const EmptyTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`

const EmptyDesc = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin-top: 4px;
  line-height: 1.6;
`

const EmptyActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 10px;

  ${media.sm} {
    justify-content: flex-start;
  }
`

const ClearBtn = styled.button`
  padding: 6px 14px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: ${({ theme }) => theme.colors.primary};
  border: none;
  border-radius: ${({ theme }) => theme.radii.lg};
  cursor: pointer;
  transition: box-shadow ${({ theme }) => theme.transitions.normal};

  &:hover {
    box-shadow: 0 4px 12px ${({ theme }) => theme.colors.primary}33;
  }
`

const BrowseLink = styled.a`
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textSecondary};
  background: ${({ theme }) => theme.colors.bgTertiary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  text-decoration: none;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.bgSecondary};
    color: ${({ theme }) => theme.colors.text};
    text-decoration: none;
  }
`

// ─── Distance text ───────────────────────────────────────────────────────
const DistanceText = styled.span`
  font-size: 8px;
  color: ${({ theme }) => theme.colors.blue[400]};
  opacity: 0.8;
  font-weight: 500;
  white-space: nowrap;
`

/**
 * Compute price-per-sqm percentile for each plot relative to all plots.
 * Returns a Map<plotId, number> where number is 0-100 percentile.
 * Used by the MarketPositionDot to show where each plot sits in the price distribution.
 */
function usePricePercentiles(plots: any[]) {
  return useMemo(() => {
    if (!plots || plots.length < 3) return new Map()
    // Collect price/sqm for all plots with valid data
    const entries = []
    for (const p of plots) {
      const price = p.total_price ?? p.totalPrice ?? 0
      const size = p.size_sqm ?? p.sizeSqM ?? 0
      if (price > 0 && size > 0) {
        entries.push({ id: p.id, ppsqm: price / size })
      }
    }
    if (entries.length < 3) return new Map()
    // Sort by price/sqm ascending
    entries.sort((a, b) => a.ppsqm - b.ppsqm)
    const result = new Map()
    for (let i = 0; i < entries.length; i++) {
      result.set(entries[i].id, Math.round((i / (entries.length - 1)) * 100))
    }
    return result
  }, [plots])
}

/**
 * MarketPositionDot — tiny gradient bar with a dot showing where a plot's price/sqm
 * sits relative to all plots. Green = cheap, Gold = mid, Red = expensive.
 * Gives instant market context without opening the sidebar.
 */
function MarketPositionDot({ percentile }: MarketPositionDotProps) {
  if (percentile == null) return null
  const label = percentile <= 25 ? 'זול' : percentile <= 50 ? 'מתחת לממוצע' : percentile <= 75 ? 'מעל הממוצע' : 'יקר'
  return (
    <MarketPositionRow title={`מיקום בשוק: ${label} (${percentile}% מהחלקות זולות יותר)`}>
      <MarketPositionLabel>זול</MarketPositionLabel>
      <MarketPositionTrack>
        <MarketPositionGradient />
        <MarketPositionDotEl
          $left={percentile}
          $bg={percentile <= 30 ? '#22C55E' : percentile <= 70 ? '#F59E0B' : '#EF4444'}
        />
      </MarketPositionTrack>
      <MarketPositionLabel>יקר</MarketPositionLabel>
    </MarketPositionRow>
  )
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

/**
 * PlotShareButtons — uses native Web Share API on mobile (opens system share sheet
 * with WhatsApp, Telegram, Messages, etc. — like Madlan/Airbnb). Falls back to
 * individual WhatsApp + Telegram buttons on desktop where Web Share isn't supported.
 */
const PlotShareButtons = memo(function PlotShareButtons({ plot, blockNum, price, roi }: PlotShareButtonsProps) {
  const { isSupported, share } = useNativeShare()

  if (isSupported) {
    return (
      <ShareGroup>
        <ActionBtn
          onClick={async (e) => {
            e.stopPropagation()
            const data = buildPlotShareData(plot)
            const shared = await share(data)
            if (!shared) {
              // Fallback: copy link to clipboard
              try {
                await navigator.clipboard.writeText(data.url)
              } catch {}
            }
          }}
          title="שתף חלקה"
        >
          <Share2 />
        </ActionBtn>
      </ShareGroup>
    )
  }

  // Desktop fallback: separate WhatsApp + Telegram buttons
  return (
    <ShareGroup>
      <ActionBtn
        onClick={(e) => {
          e.stopPropagation()
          const data = buildPlotShareData(plot)
          window.open(whatsappShareLink(data.text), '_blank')
        }}
        title="שתף ב-WhatsApp"
      >
        <Share2 />
      </ActionBtn>
      <ActionBtn
        onClick={(e) => {
          e.stopPropagation()
          const data = buildPlotShareData(plot)
          window.open(`https://t.me/share/url?url=${encodeURIComponent(data.url)}&text=${encodeURIComponent(data.text)}`, '_blank')
        }}
        title="שתף בטלגרם"
      >
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
      </ActionBtn>
    </ShareGroup>
  )
})

/**
 * QuickCopyButton — one-click clipboard copy of a formatted investment summary.
 * Copies a rich multi-line summary like a mini investment report.
 */
const QuickCopyButton = memo(function QuickCopyButton({ plot }: QuickCopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback((e) => {
    e.stopPropagation()
    const blockNum = plot.block_number ?? plot.blockNumber
    const price = plot.total_price ?? plot.totalPrice ?? 0
    const proj = plot.projected_value ?? plot.projectedValue ?? 0
    const roi = price > 0 ? Math.round(((proj - price) / price) * 100) : 0
    const sizeSqM = plot.size_sqm ?? plot.sizeSqM ?? 0
    const dunam = sizeSqM > 0 ? (sizeSqM / 1000).toFixed(1) : '?'

    // Build rich multi-line summary
    const lines = [`📍 גוש ${blockNum} חלקה ${plot.number} · ${plot.city}`]
    lines.push(`💰 ${formatPriceShort(price)} · ${dunam} דונם · +${roi}% ROI`)

    // Add enrichment data when available
    const extras = []
    if (plot._netRoi != null) extras.push(`נטו +${plot._netRoi}%`)
    if (plot._paybackYears != null) extras.push(`החזר ${plot._paybackYears} שנ׳`)
    if (plot._grade) extras.push(`דירוג ${plot._grade}`)
    if (extras.length > 0) lines.push(`📊 ${extras.join(' · ')}`)

    const signals = []
    if (plot._buySignal) signals.push(plot._buySignal.label)
    if (plot._cagr) signals.push(`${plot._cagr}%/שנה`)
    if (plot._monthlyPayment) signals.push(`~₪${plot._monthlyPayment.toLocaleString()}/חודש`)
    if (signals.length > 0) lines.push(signals.join(' · '))

    // Add link
    lines.push(`🔗 ${window.location.origin}/plot/${plot.id}`)

    const text = lines.join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }, [plot])

  return (
    <CopyBtn
      onClick={handleCopy}
      $copied={copied}
      title={copied ? 'הועתק!' : 'העתק סיכום השקעה'}
      aria-label={copied ? 'הועתק ללוח' : 'העתק סיכום השקעה ללוח'}
    >
      {copied ? <Check /> : <Clipboard />}
    </CopyBtn>
  )
})

const PlotCardItem = memo(function PlotCardItem({ plot, isSelected, isCompared, isFavorite, wasViewed, areaAvgPsm, onSelectPlot, onToggleCompare, onToggleFavorite, prefetchPlot, priceChange, pricePercentile, categoryBadges, distanceKm, imagePriority = false, observeImpression }: PlotCardItemProps) {
  // Viewport-based prefetching — loads plot detail into React Query cache when the card
  // scrolls into (or near) the visible area. On mobile, users scroll and tap without
  // hovering, so this ensures data is ready before the click. Skips if already selected
  // (data already loaded). Uses 200px rootMargin to prefetch slightly ahead of the viewport.
  const viewportRef = useViewportPrefetch(
    () => prefetchPlot(plot.id),
    { rootMargin: '200px', skip: isSelected }
  )
  const color = statusColors[plot.status]
  const price = plot.total_price ?? plot.totalPrice
  const projValue = plot.projected_value ?? plot.projectedValue
  // Prefer server-computed ROI when available (saves client Math on every card render)
  const roi = plot._roi ?? (price ? Math.round((projValue - price) / price * 100) : 0)
  const blockNum = plot.block_number ?? plot.blockNumber
  const sizeSqM = plot.size_sqm ?? plot.sizeSqM ?? 0
  const readiness = plot.readiness_estimate ?? plot.readinessEstimate
  const pricePerDunam = sizeSqM > 0 ? formatPriceShort(Math.round(price / sizeSqM * 1000)) : null

  // Demand velocity — views/day metric for urgency signaling
  const demandVelocity = useMemo(() => calcDemandVelocity(plot), [plot])

  // Freshness & popularity badges (like Madlan/Yad2 "חדש!" and "פופולרי")
  // Prefer server-computed _daysOnMarket when available to avoid redundant Date math
  const createdAt = plot.created_at ?? plot.createdAt
  const daysSinceCreated = plot._daysOnMarket ?? (createdAt ? Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)) : Infinity)
  const isNew = daysSinceCreated <= 7
  const viewCount = plot.views ?? 0
  const isHot = viewCount >= 10
  const isTrending = viewCount >= 5 && viewCount < 10

  return (
    <Card
      ref={(el) => {
        // Combine viewport prefetch ref and impression tracking ref on the same element.
        // Both use IntersectionObserver internally but with different thresholds/callbacks.
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
      aria-label={`${plot.status === 'SOLD' ? 'נמכר — ' : ''}גוש ${blockNum} חלקה ${plot.number}, ${plot.city}, ${formatPriceShort(price)}, תשואה +${roi}%`}
    >
      {/* Freshness / popularity / trending badges */}
      {(isNew || isHot || isTrending || priceChange) && (
        <BadgeOverlay>
          {isNew && (
            <FreshBadge $bg="#22C55E" $shadow="rgba(34,197,94,0.4)">
              חדש!
            </FreshBadge>
          )}
          {isHot && !isNew && (
            <FreshBadge $bg="#F97316" $shadow="rgba(249,115,22,0.4)">
              🔥 פופולרי
            </FreshBadge>
          )}
          {isTrending && !isHot && !isNew && (
            <FreshBadge $bg="#8B5CF6" $shadow="rgba(139,92,246,0.4)">
              📈 במגמה
            </FreshBadge>
          )}
          {priceChange && priceChange.direction === 'down' && (
            <FreshBadge $bg="#16A34A" $shadow="rgba(22,163,74,0.4)">
              ↓ ירד {priceChange.pctChange}%
            </FreshBadge>
          )}
          {priceChange && priceChange.direction === 'up' && (
            <FreshBadge $bg="rgba(239,68,68,0.8)" $shadow="rgba(239,68,68,0.4)">
              ↑ עלה {priceChange.pctChange}%
            </FreshBadge>
          )}
        </BadgeOverlay>
      )}
      {/* Sold overlay — like Madlan's distinctive "נמכר" diagonal banner */}
      {plot.status === 'SOLD' && (
        <SoldOverlay>
          <SoldBackdrop />
          <SoldLabel>נמכר</SoldLabel>
        </SoldOverlay>
      )}
      {/* Image carousel — swipeable multi-image thumbnail like Madlan/Airbnb */}
      <CardImageCarousel
        images={plot.plot_images}
        blockNum={blockNum}
        color={color}
        isCompared={isCompared}
        priority={imagePriority}
      />

      {/* Quick share — native share sheet (mobile) or WhatsApp/Telegram fallback (desktop) */}
      <PlotShareButtons plot={plot} blockNum={blockNum} price={price} roi={roi} />

      {/* Quick copy — one-click clipboard copy of plot essentials. */}
      <QuickCopyButton plot={plot} />

      {/* Navigate to plot — opens Google Maps/Waze directions. */}
      {(() => {
        const navUrl = plotNavigateUrl(plot.coordinates)
        if (!navUrl) return null
        return (
          <NavigateBtn
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="נווט לחלקה (Google Maps)"
            aria-label="נווט לחלקה"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
          </NavigateBtn>
        )
      })()}

      {/* Favorite toggle */}
      {onToggleFavorite && (
        <FavoriteBtn
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(plot.id) }}
          $active={isFavorite}
          title={isFavorite ? 'הסר ממועדפים' : 'הוסף למועדפים'}
          aria-label={isFavorite ? 'הסר ממועדפים' : 'הוסף למועדפים'}
          aria-pressed={isFavorite}
        >
          <FavoriteIcon $active={isFavorite} />
        </FavoriteBtn>
      )}

      {/* Compare toggle */}
      {onToggleCompare && (
        <CompareBtn
          onClick={(e) => { e.stopPropagation(); onToggleCompare(plot.id) }}
          $active={isCompared}
          title={isCompared ? 'הסר מהשוואה' : 'הוסף להשוואה'}
        >
          <GitCompareArrows />
        </CompareBtn>
      )}

      <CardBody>
        <CardHeader>
          <CardTitle>
            {wasViewed && !isSelected && <ViewedDot title="נצפה לאחרונה" />}
            גוש {blockNum} | חלקה {plot.number}
          </CardTitle>
          <StatusBadge $bg={`${color}20`} $color={color}>
            {statusLabels[plot.status]}
          </StatusBadge>
        </CardHeader>

        <CityRow>
          <MapPin style={{ width: 10, height: 10, flexShrink: 0 }} />
          <span>{plot.city}</span>
          {/* Distance from user */}
          {distanceKm != null && (
            <DistanceText title={`${distanceKm.toFixed(1)} ק״מ ממיקומך`}>
              📍 {formatDistanceKm(distanceKm)}
            </DistanceText>
          )}
          {(() => {
            // Prefer server-computed score when available (reduces client CPU)
            const score = plot._investmentScore ?? calcInvestmentScore(plot)
            const { grade, color } = getInvestmentGrade(score)
            return (
              <ScoreBadge
                $color={color}
                title={`דירוג השקעה: ${grade} (${score}/10)`}
              >
                {plot._grade || grade}
              </ScoreBadge>
            )
          })()}
          {/* Area market trend */}
          {plot._marketTrend && plot._marketTrend.direction !== 'stable' && (
            <MarketTrendText
              $direction={plot._marketTrend.direction}
              title={`מגמת אזור ${plot.city}: ${plot._marketTrend.direction === 'up' ? 'עלייה' : 'ירידה'} ${Math.abs(plot._marketTrend.changePct)}% ב-30 יום`}
            >
              {plot._marketTrend.direction === 'up' ? '📈' : '📉'} {plot._marketTrend.changePct > 0 ? '+' : ''}{plot._marketTrend.changePct}%
            </MarketTrendText>
          )}
          {viewCount > 0 ? (
            <ViewCountText title={`${viewCount} צפיות`}>
              👁 {viewCount}
            </ViewCountText>
          ) : (() => {
            const updatedAt = plot.updated_at ?? plot.updatedAt
            const freshness = formatRelativeTime(updatedAt)
            if (!freshness) return null
            return (
              <FreshnessText title={`עודכן ${freshness}`}>
                {freshness}
              </FreshnessText>
            )
          })()}
        </CityRow>

        <RoiBar>
          <RoiBarFill
            style={{
              width: `${Math.min(100, Math.max(8, (price / (projValue || 1)) * 100))}%`,
              background: 'linear-gradient(90deg, #3B82F6, #60A5FA)',
            }}
          />
          <RoiBarProj
            style={{
              width: '100%',
              background: 'linear-gradient(90deg, rgba(34,197,94,0.15), rgba(34,197,94,0.08))',
            }}
          />
          <RoiBarLabel>{formatPriceShort(price)}</RoiBarLabel>
          <RoiBarTarget>→ {formatPriceShort(projValue)}</RoiBarTarget>
        </RoiBar>

        {/* Deal badge */}
        {(() => {
          if (!areaAvgPsm || sizeSqM <= 0) return null
          const plotPsm = price / sizeSqM
          const diffPct = Math.round(((plotPsm - areaAvgPsm) / areaAvgPsm) * 100)
          if (diffPct >= -3) return null
          return (
            <DealBadge>
              🔥 {Math.abs(diffPct)}% מתחת לממוצע
            </DealBadge>
          )
        })()}

        {/* "Best in category" badges */}
        {categoryBadges && categoryBadges.length > 0 && (
          <CategoryBadgesRow>
            {categoryBadges.map((badge, i) => (
              <CategoryBadge
                key={i}
                $color={badge.color}
                title={badge.label}
              >
                <span>{badge.emoji}</span>
                <span>{badge.label}</span>
              </CategoryBadge>
            ))}
          </CategoryBadgesRow>
        )}

        {/* Zoning pipeline progress */}
        {(() => {
          const zoningStage = plot.zoning_stage ?? plot.zoningStage
          if (!zoningStage) return null
          return <ZoningProgressBar currentStage={zoningStage} variant="compact" style={{ marginTop: 2 }} />
        })()}

        {/* Buy Signal */}
        {plot._buySignal && (
          <SignalRow
            $color={
              plot._buySignal.signal === 'BUY' ? '#10B981'
              : plot._buySignal.signal === 'HOLD' ? '#F59E0B'
              : '#64748B'
            }
            title={`אות השקעה: ${plot._buySignal.label} (ציון ${plot._buySignal.strength}/10) — מבוסס על מחיר מול ממוצע, תשואה נטו, סיכון, מגמת אזור ודירוג`}
          >
            <span>{plot._buySignal.label}</span>
            {plot._paybackYears != null && plot._paybackYears > 0 && (
              <PaybackText title={`החזר השקעה מלא תוך ~${plot._paybackYears} שנים (כולל כל העלויות)`}>
                · החזר {plot._paybackYears}שנ׳
              </PaybackText>
            )}
          </SignalRow>
        )}

        {/* Risk level badge */}
        {plot._riskLevel && plot._riskLevel !== 'low' && !plot._buySignal && (
          <RiskRow
            title={plot._riskFactors?.length > 0 ? `גורמי סיכון: ${plot._riskFactors.join(', ')}` : `סיכון: ${plot._riskScore}/100`}
          >
            {plot._riskLevel === 'medium' && (
              <span style={{ color: '#F59E0B', opacity: 0.8 }}>⚠️ סיכון בינוני</span>
            )}
            {plot._riskLevel === 'high' && (
              <span style={{ color: '#FB923C', opacity: 0.8 }}>🔶 סיכון גבוה</span>
            )}
            {plot._riskLevel === 'very_high' && (
              <span style={{ color: '#F87171', opacity: 0.8 }}>🔴 סיכון גבוה מאוד</span>
            )}
          </RiskRow>
        )}

        {/* Demand velocity indicator */}
        {demandVelocity && demandVelocity.tier !== 'low' && (
          <DemandRow
            $color={demandVelocity.color}
            title={`${demandVelocity.velocity} צפיות/יום`}
          >
            <span>{demandVelocity.emoji}</span>
            <span>{demandVelocity.label}</span>
            <DemandRate>({demandVelocity.velocity}/יום)</DemandRate>
          </DemandRow>
        )}

        <CardFooter>
          <PriceCol>
            <PriceRow>
              <PriceText>{formatPriceShort(price)}</PriceText>
              <PriceSparkline currentPrice={price} projectedValue={projValue} />
            </PriceRow>
            {pricePerDunam && <PricePerDunam>{pricePerDunam}/דונם</PricePerDunam>}
            {(() => {
              const payment = calcMonthlyPayment(price)
              if (!payment) return null
              return <MonthlyPayment title={`הון עצמי: ${formatPriceShort(payment.downPayment)} | הלוואה: ${formatPriceShort(payment.loanAmount)}`}>~{formatMonthlyPayment(payment.monthly)}</MonthlyPayment>
            })()}
            {/* Total entry cost */}
            {(() => {
              if (price <= 0) return null
              // Prefer server-enriched value (includes same costs, pre-computed)
              if (plot._totalEntryCost) {
                return (
                  <EntryCost
                    title={`סה״כ עלות כניסה: ${formatPriceShort(plot._totalEntryCost)}\nכולל: מס רכישה 6%, שכ״ט עו״ד 1.75%, שמאי, רישום`}
                  >
                    🔑 כניסה: {formatPriceShort(plot._totalEntryCost)}
                  </EntryCost>
                )
              }
              // Fallback: client-side computation (mock data, offline, etc.)
              const txn = calcTransactionCosts(price)
              return (
                <EntryCost
                  title={`סה״כ עלות כניסה: ${formatPriceShort(txn.totalWithPurchase)}\nמס רכישה: ${formatPriceShort(txn.purchaseTax)} (6%)\nשכ״ט עו״ד: ${formatPriceShort(txn.attorneyFees)}\nשמאי: ${formatPriceShort(txn.appraiserFee)}`}
                >
                  🔑 כניסה: {formatPriceShort(txn.totalWithPurchase)}
                </EntryCost>
              )
            })()}
            {/* Buildable value */}
            {(() => {
              const bv = calcBuildableValue(plot)
              if (!bv) return null
              return (
                <BuildableValue
                  title={`${bv.estimatedUnits} יח׳ דיור · ${formatPriceShort(bv.pricePerUnit)}/יח׳ · ${bv.totalBuildableArea.toLocaleString()} מ״ר בנוי`}
                >
                  🏢 {formatPriceShort(bv.pricePerBuildableSqm)}/מ״ר בנוי
                </BuildableValue>
              )
            })()}
            <MarketPositionDot percentile={pricePercentile} />
            {/* Data completeness micro-indicator */}
            {plot._dataCompleteness != null && plot._dataCompleteness < 70 && (
              <DataCompleteness
                title={`שלמות נתונים: ${plot._dataCompleteness}% — ${plot._dataCompleteness < 40 ? 'נתונים חלקיים' : 'נתונים סבירים'}`}
              >
                {plot._dataCompleteness < 40 ? '🔴' : '🟡'} נתונים {plot._dataCompleteness}%
              </DataCompleteness>
            )}
          </PriceCol>
          <TagsCol>
            <RoiTag title={plot._netRoi != null ? `ברוטו +${roi}% · נטו +${plot._netRoi}% (אחרי מס, היטל השבחה, עלויות)` : `תשואה ברוטו`}>+{roi}%</RoiTag>
            {/* Net ROI */}
            {plot._netRoi != null && plot._netRoi !== roi && (
              <NetRoiTag
                $color={plot._netRoi >= 50 ? '#10B981' : plot._netRoi >= 20 ? '#F59E0B' : plot._netRoi >= 0 ? '#FB923C' : '#F87171'}
                title={`תשואה נטו: +${plot._netRoi}% אחרי כל העלויות (מס רכישה, היטל השבחה, מס שבח, שכ״ט, אחזקה)`}
              >
                נטו {plot._netRoi > 0 ? '+' : ''}{plot._netRoi}%
              </NetRoiTag>
            )}
            {(() => {
              // Prefer server-computed _cagr when available (avoids recalculating per card)
              const serverCagr = plot._cagr
              const serverYears = plot._holdingYears
              if (serverCagr != null && serverCagr > 0) {
                return (
                  <CagrTag title={`תשואה שנתית על בסיס ${serverYears || '?'} שנים`}>
                    {serverCagr}%/שנה
                  </CagrTag>
                )
              }
              // Fallback to client-side calculation (mock data, offline, etc.)
              const cagrData = calcCAGR(roi, readiness)
              if (!cagrData) return null
              return (
                <CagrTag title={`תשואה שנתית על בסיס ${cagrData.years} שנים`}>
                  {cagrData.cagr}%/שנה
                </CagrTag>
              )
            })()}
            {readiness && (
              <TimeTag>
                <Clock style={{ width: 10, height: 10 }} />
                {readiness}
              </TimeTag>
            )}
          </TagsCol>
        </CardFooter>
      </CardBody>
    </Card>
  )
})

export default function PlotCardStrip({ plots, selectedPlot, onSelectPlot, compareIds = [], onToggleCompare, isLoading = false, onClearFilters, getPriceChange, favorites, userLocation }: PlotCardStripProps) {
  const prefetchPlot = usePrefetchPlot()
  // Shared recently-viewed store — O(1) lookups via Set, no localStorage re-parsing
  const { wasViewed: isRecentlyViewed } = useRecentlyViewed()
  // Impression tracking
  const { observeRef: observeImpression } = useImpressionTracker({
    threshold: 0.5,
    cooldownMs: 60_000,
    batchFlushMs: 8_000,
  })
  const areaAverages = useAreaAverages(plots)
  const pricePercentiles = usePricePercentiles(plots)
  // "Best in category" badges
  const bestInCategory = useMemo(() => calcBestInCategory(plots), [plots])

  // Precompute distances from user
  const plotDistances = useMemo(() => {
    if (!userLocation) return new Map()
    const result = new Map()
    for (const p of plots) {
      const center = plotCenter(p.coordinates)
      if (center) {
        result.set(p.id, haversineKm(userLocation.lat, userLocation.lng, center.lat, center.lng))
      }
    }
    return result
  }, [plots, userLocation])
  const scrollRef = useRef<HTMLDivElement>(null)

  // Desktop drag-to-scroll
  useDragScroll(scrollRef)

  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false)
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false)
  const [scrollProgress, setScrollProgress] = useState<number>(0)
  const [visibleIndex, setVisibleIndex] = useState<number>(0)

  // Throttled scroll handler using requestAnimationFrame
  const rafRef = useRef(null)
  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollRight(Math.abs(scrollLeft) > 1)
    setCanScrollLeft(Math.abs(scrollLeft) + clientWidth < scrollWidth - 1)

    const maxScroll = scrollWidth - clientWidth
    const progress = maxScroll > 0 ? Math.round((Math.abs(scrollLeft) / maxScroll) * 100) : 0
    setScrollProgress(progress)

    const avgCardWidth = 200
    const approxIdx = Math.round(Math.abs(scrollLeft) / avgCardWidth)
    setVisibleIndex(Math.min(approxIdx, (plots?.length ?? 1) - 1))
  }, [plots?.length])

  const throttledCheckScroll = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      checkScroll()
    })
  }, [checkScroll])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', throttledCheckScroll, { passive: true })
    window.addEventListener('resize', throttledCheckScroll)
    return () => {
      el.removeEventListener('scroll', throttledCheckScroll)
      window.removeEventListener('resize', throttledCheckScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [plots, checkScroll, throttledCheckScroll])

  // Reset scroll to start when filtered results change
  const prevPlotsRef = useRef(plots)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const prev = prevPlotsRef.current
    if (prev !== plots && plots?.length > 0) {
      const prevFirst = prev?.[0]?.id
      const currFirst = plots[0]?.id
      if (prevFirst !== currFirst) {
        el.scrollTo({ left: 0, behavior: 'smooth' })
      }
    }
    prevPlotsRef.current = plots
  }, [plots])

  // Scroll to selected card
  useEffect(() => {
    if (!selectedPlot || !scrollRef.current) return
    const card = scrollRef.current.querySelector(`[data-plot-id="${selectedPlot.id}"]`)
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [selectedPlot?.id])

  // Aggregate stats
  const stats = useMemo(() => {
    if (!plots || plots.length === 0) return null
    const available = plots.filter(p => p.status === 'AVAILABLE')
    const sold = plots.filter(p => p.status === 'SOLD')
    let totalValue = 0
    let totalProjected = 0
    let roiSum = 0
    let totalArea = 0
    let freshCount = 0
    const now = Date.now()

    for (const p of plots) {
      const price = p.total_price ?? p.totalPrice ?? 0
      const proj = p.projected_value ?? p.projectedValue ?? 0
      totalValue += price
      totalProjected += proj
      totalArea += p.size_sqm ?? p.sizeSqM ?? 0
      if (price > 0) roiSum += ((proj - price) / price) * 100
      const created = p.created_at ?? p.createdAt
      if (created && (now - new Date(created).getTime()) < 7 * 86400000) freshCount++
    }

    const avgRoi = Math.round(roiSum / plots.length)
    const totalProfit = totalProjected - totalValue

    // Net portfolio return
    let totalNetProfit = 0
    let netProfitCount = 0
    for (const p of plots) {
      if (p._netProfit != null) {
        totalNetProfit += p._netProfit
        netProfitCount++
      }
    }

    // Average data completeness
    let totalCompleteness = 0
    let completenessCount = 0
    for (const p of plots) {
      if (p._dataCompleteness != null) {
        totalCompleteness += p._dataCompleteness
        completenessCount++
      }
    }
    const avgCompleteness = completenessCount > 0 ? Math.round(totalCompleteness / completenessCount) : null

    // Market temperature
    const availRatio = plots.length > 0 ? available.length / plots.length : 0
    const freshRatio = plots.length > 0 ? freshCount / plots.length : 0
    const heatScore = (availRatio * 40) + (freshRatio * 30) + (Math.min(avgRoi, 200) / 200 * 30)
    let marketTemp
    if (heatScore >= 55) {
      marketTemp = { emoji: '🔥', label: 'חם', color: '#FB923C', bg: 'rgba(251,146,60,0.1)', borderColor: 'rgba(251,146,60,0.2)' }
    } else if (heatScore >= 30) {
      marketTemp = { emoji: '🟡', label: 'פעיל', color: '#FBBF24', bg: 'rgba(251,191,36,0.1)', borderColor: 'rgba(251,191,36,0.2)' }
    } else {
      marketTemp = { emoji: '❄️', label: 'שקט', color: '#60A5FA', bg: 'rgba(96,165,250,0.1)', borderColor: 'rgba(96,165,250,0.2)' }
    }

    return { available: available.length, totalValue, totalProjected, totalProfit, avgRoi, totalArea, marketTemp, freshCount, totalNetProfit: netProfitCount > 0 ? totalNetProfit : null, avgCompleteness }
  }, [plots])

  if (isLoading) return (
    <StripWrapper dir="rtl">
      <StripScroll>
        {Array.from({ length: 6 }, (_, i) => <PlotCardSkeleton key={i} />)}
      </StripScroll>
    </StripWrapper>
  )

  if (!plots || plots.length === 0) return (
    <StripWrapper dir="rtl">
      <EmptyRow>
        <EmptyBox>
          <EmptyIcon>🔍</EmptyIcon>
          <EmptyContent>
            <EmptyTitle>לא נמצאו חלקות מתאימות</EmptyTitle>
            <EmptyDesc>
              נסה להרחיב את הסינון — שנה עיר, הרחב טווח מחיר או הסר חלק מהפילטרים
            </EmptyDesc>
            <EmptyActions>
              {onClearFilters && (
                <ClearBtn onClick={onClearFilters}>
                  נקה הכל וצפה בכל החלקות
                </ClearBtn>
              )}
              <BrowseLink href="/areas">
                עיין באזורים
              </BrowseLink>
            </EmptyActions>
          </EmptyContent>
        </EmptyBox>
      </EmptyRow>
    </StripWrapper>
  )

  // RTL scroll: positive = scroll left visually (show more to the left)
  const scroll = (dir: number) => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir * 280, behavior: 'smooth' })
  }

  return (
    <StripWrapper dir="rtl">
      {/* Aggregate stats bar */}
      {stats && (
        <StatsBar>
          <StatItem>
            <BarChart3 style={{ width: 12, height: 12, color: '#C8942A' }} />
            <span>{stats.available} זמינות</span>
          </StatItem>
          <StatDivider />
          <StatItem>
            <TrendingUp style={{ width: 12, height: 12, color: '#10B981' }} />
            <span>ממוצע +{stats.avgRoi}% ROI</span>
          </StatItem>
          <StatDivider />
          <StatItem>
            <Ruler style={{ width: 12, height: 12, color: '#3B82F6' }} />
            <span>{(stats.totalArea / 1000).toFixed(1)} דונם סה״כ</span>
          </StatItem>
          {stats.totalProfit > 0 && (
            <>
              <StatDivider />
              <StatItem title={`שווי נוכחי: ₪${stats.totalValue.toLocaleString()} → צפי: ₪${stats.totalProjected.toLocaleString()}`}>
                <span style={{ color: '#10B981' }}>💎</span>
                <span>רווח פוטנציאלי ₪{formatPriceShort(stats.totalProfit)}</span>
              </StatItem>
            </>
          )}
          {/* Net Portfolio Return */}
          {stats.totalNetProfit != null && (
            <>
              <StatDivider />
              <StatItem title={`רווח נטו: ₪${stats.totalNetProfit.toLocaleString()} (אחרי מס רכישה, היטל השבחה, מס שבח, עלויות אחזקה, שכ״ט)`}>
                <span style={{ color: stats.totalNetProfit > 0 ? '#10B981' : '#EF4444' }}>💵</span>
                <span style={{ color: stats.totalNetProfit > 0 ? '#10B981' : '#EF4444' }}>
                  נטו {formatPriceShort(Math.abs(stats.totalNetProfit))}
                </span>
              </StatItem>
            </>
          )}
          {/* Data Quality indicator */}
          {stats.avgCompleteness != null && (
            <>
              <StatDivider />
              <StatItem
                title={`איכות נתונים ממוצעת: ${stats.avgCompleteness}% — חלקות עם נתונים מלאים יותר נותנות תמונה מהימנה יותר`}
              >
                <span>{stats.avgCompleteness >= 70 ? '🟢' : stats.avgCompleteness >= 40 ? '🟡' : '🔴'}</span>
                <span style={{ color: '#94A3B8' }}>נתונים {stats.avgCompleteness}%</span>
              </StatItem>
            </>
          )}
          {/* Market Temperature */}
          {stats.marketTemp && (
            <>
              <StatDivider />
              <MarketTempBadge
                $bg={stats.marketTemp.bg}
                $borderColor={stats.marketTemp.borderColor}
                title={`שוק ${stats.marketTemp.label} — ${stats.available} זמינות, ${stats.freshCount} חדשות השבוע, ממוצע +${stats.avgRoi}% ROI`}
              >
                <span>{stats.marketTemp.emoji}</span>
                <span style={{ fontWeight: 700, color: stats.marketTemp.color }}>{stats.marketTemp.label}</span>
              </MarketTempBadge>
            </>
          )}
        </StatsBar>
      )}

      {/* Smart Investment Insights */}
      <SmartInsights plots={plots} />

      {/* Scroll position indicator */}
      {plots.length > 3 && (
        <ScrollIndicator>
          <ScrollIndicatorInner>
            <ScrollIndicatorText>
              {visibleIndex + 1}/{plots.length}
            </ScrollIndicatorText>
            <ScrollProgressTrack>
              <ScrollProgressFill $width={scrollProgress} />
            </ScrollProgressTrack>
          </ScrollIndicatorInner>
        </ScrollIndicator>
      )}

      {/* Fade edges */}
      <StripFadeRight />
      <StripFadeLeft />

      {/* Scroll arrows (desktop) */}
      {canScrollLeft && (
        <StripArrowRight
          onClick={() => scroll(-1)}
          aria-label="הבא"
        >
          <ChevronLeft style={{ width: 16, height: 16 }} />
        </StripArrowRight>
      )}
      {canScrollRight && (
        <StripArrowLeft
          onClick={() => scroll(1)}
          aria-label="הקודם"
        >
          <ChevronRight style={{ width: 16, height: 16 }} />
        </StripArrowLeft>
      )}

      {/* Cards */}
      <StripScroll
        ref={scrollRef}
        role="listbox"
        aria-label="רשימת חלקות"
        onKeyDown={(e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
          const focused = document.activeElement
          if (!focused || !focused.hasAttribute('data-plot-id')) return
          e.preventDefault()
          const sibling = e.key === 'ArrowLeft'
            ? focused.nextElementSibling
            : focused.previousElementSibling
          if (sibling && sibling.hasAttribute('data-plot-id')) {
            (sibling as HTMLElement).focus()
            sibling.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
          }
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
