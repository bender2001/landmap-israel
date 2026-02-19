import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  MapPin, TrendingUp, Ruler, DollarSign, ArrowLeft, BarChart3,
  Building2, Users, ChevronDown, ChevronUp, Activity, ArrowUpDown,
  Zap, Shield, Award, Target,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import styled, { css } from 'styled-components'
import { media } from '../../styles/theme'
import {
  PageWrapper,
  GlassPanel,
  GlassPanelPadded,
  SectionTitle,
  Label,
  SmallLabel,
  Muted,
  BrandText,
  FlexRow,
  FlexBetween,
  FlexCenter,
  FlexCol,
  ProgressTrack,
  ProgressFill,
  Badge,
} from '../../styles/shared'
import { useMarketOverview, useMarketTrends } from '../../hooks/useMarket'
import { useMetaTags } from '../../hooks/useSEO'
import PublicNav from '../../components/PublicNav'
import PublicFooter from '../../components/PublicFooter'
import Spinner from '../../components/ui/Spinner'
import BackToTopButton from '../../components/ui/BackToTopButton'
import Breadcrumb from '../../components/ui/Breadcrumb'
import { formatCurrency, formatDunam } from '../../utils/format'
import { statusColors, statusLabels, zoningLabels } from '../../utils/constants'

/* ── Types ────────────────────────────────────────────── */

interface CityStats {
  city: string
  count: number
  available: number
  avgRoi: number
  avgPricePerDunam: number
  medianPrice?: number
  medianPricePerDunam?: number
  totalArea: number
  totalValue?: number
  priceRange?: { min: number; max: number }
  priceSqmRange?: { min: number; max: number }
  byZoning?: Record<string, number>
}

interface TrendCity {
  change12m: number
  dataQuality: 'high' | 'medium' | 'low'
  trend: { avgPriceSqm: number }[]
}

interface TrendData {
  cities?: Record<string, TrendCity>
  monthLabels?: string[]
}

interface OverviewData {
  total: number
  available: number
  totalArea: number
  totalValue: number
  avgRoi: number
  medianPrice?: number
  medianPricePerSqm?: number
  cities: CityStats[]
}

interface InsightItem {
  emoji: string
  label: string
  city: string
  detail: string
  color: string
  bg: string // kept for data; styled via InsightLink
}

interface HealthBreakdownDim {
  score: number
  max: number
  label: string
}

interface HealthScore {
  total: number
  grade: string
  color: string
  emoji: string
  breakdown: Record<string, HealthBreakdownDim>
}

interface ScoredCity extends CityStats {
  health: HealthScore | null
}

interface SortColumn {
  key: string
  label: string
  align: 'right' | 'center' | 'left'
  getValue: (c: CityStats) => string | number
}

/* ── File-specific styled components ─────────────────── */

const MainContent = styled.main`
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 16px;
  ${media.sm} { padding: 48px 24px; }
`

const HeroSection = styled.div`
  text-align: center;
  margin-bottom: 40px;
`

const HeroTitle = styled.h1`
  font-size: 30px;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.slate[100]};
  margin-bottom: 12px;
  ${media.sm} { font-size: 36px; }
`

const HeroSubtitle = styled.p`
  color: ${({ theme }) => theme.colors.slate[400]};
  max-width: 512px;
  margin: 0 auto;
  font-size: 14px;
  line-height: 1.7;
`

const LoadingWrap = styled(FlexCenter)`
  padding: 80px 0;
`

/* ── Stats grid ── */
const StatsGrid = styled.div<{ $cols?: number }>`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 32px;
  ${media.sm} { grid-template-columns: repeat(3, 1fr); }
  ${media.lg} { grid-template-columns: repeat(${({ $cols = 6 }) => $cols}, 1fr); }
`

/* ── StatCard ── */

interface StatCardColorConfig {
  bg: string
  text: string
  border: string
}

const STAT_COLOR_MAP: Record<string, StatCardColorConfig> = {
  gold: {
    bg: 'rgba(200,148,42,0.15)',
    text: '#C8942A',
    border: 'rgba(200,148,42,0.2)',
  },
  green: {
    bg: 'rgba(16,185,129,0.15)',
    text: '#34D399',
    border: 'rgba(16,185,129,0.2)',
  },
  blue: {
    bg: 'rgba(59,130,246,0.15)',
    text: '#60A5FA',
    border: 'rgba(59,130,246,0.2)',
  },
  purple: {
    bg: 'rgba(139,92,246,0.15)',
    text: '#A78BFA',
    border: 'rgba(139,92,246,0.2)',
  },
}

const StatCardPanel = styled(GlassPanel)`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const StatCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const StatIconWrap = styled.div<{ $bg: string; $border: string }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ $border }) => $border};
  background: ${({ $bg }) => $bg};
`

const StatValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
`

const StatSubValue = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.slate[500]};
`

/* ── CityCard ── */

const CityCardWrap = styled(GlassPanel)`
  overflow: hidden;
`

const CityCardHeader = styled.div`
  padding: 20px;
  cursor: pointer;
  transition: background ${({ theme }) => theme.transitions.normal};
  &:hover { background: rgba(255, 255, 255, 0.02); }
`

const CityCardHeaderTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
`

const CityIconWrap = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(to bottom right, rgba(200,148,42,0.2), rgba(200,148,42,0.05));
  border: 1px solid rgba(200,148,42,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
`

const CityName = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
`

const PlotCount = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.slate[400]};
`

const TrendBadge = styled.span<{ $variant: 'up' | 'down' | 'neutral' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 6px;
  ${({ $variant, theme }) => {
    if ($variant === 'up') return css`
      color: ${theme.colors.emerald[400]};
      background: rgba(16,185,129,0.1);
      border: 1px solid rgba(16,185,129,0.2);
    `
    if ($variant === 'down') return css`
      color: ${theme.colors.red[400]};
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.2);
    `
    return css`
      color: ${theme.colors.slate[400]};
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
    `
  }}
`

const QualityDot = styled.span<{ $quality: 'high' | 'medium' | 'low' }>`
  width: 4px;
  height: 4px;
  border-radius: 9999px;
  display: inline-block;
  background: ${({ $quality, theme }) =>
    $quality === 'high' ? theme.colors.emerald[400]
    : $quality === 'medium' ? theme.colors.amber[400]
    : theme.colors.slate[500]};
`

const RoiBadge = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.emerald[400]};
  background: rgba(16,185,129,0.1);
  border: 1px solid rgba(16,185,129,0.2);
  padding: 4px 8px;
  border-radius: 8px;
`

const QuickStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  ${media.sm} { grid-template-columns: repeat(4, 1fr); }
`

const QuickStatCell = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
`

const QuickStatLabel = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[500]};
  margin-bottom: 4px;
`

const QuickStatValueGold = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.gold};
`

const QuickStatValueLight = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[300]};
`

const QuickStatValue200 = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[200]};
`

const QuickStatValueGreen = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.emerald[400]};
`

const QuickStatSub = styled.div`
  font-size: 9px;
  color: ${({ theme }) => theme.colors.slate[500]};
  margin-top: 2px;
`

/* ── Expanded section ── */

const ExpandedBody = styled.div`
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const SubsectionTitle = styled.h4`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.slate[400]};
  margin-bottom: 8px;
`

const ZoningBarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const ZoningBarRowStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const ZoningLabel = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.slate[400]};
  width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ZoningTrack = styled.div`
  flex: 1;
  height: 8px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

const ZoningFill = styled.div<{ $width: number }>`
  height: 100%;
  border-radius: 9999px;
  background: rgba(200,148,42,0.4);
  width: ${({ $width }) => $width}%;
`

const ZoningCount = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[500]};
  width: 32px;
  text-align: left;
`

const PriceRangeBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
`

const PriceRangeLabel = styled.span`
  color: ${({ theme }) => theme.colors.slate[400]};
`

const PriceGradient = styled.div<{ $variant: 'price' | 'sqm' }>`
  flex: 1;
  height: 4px;
  border-radius: 9999px;
  background: ${({ $variant }) =>
    $variant === 'price'
      ? 'linear-gradient(to right, rgba(16,185,129,0.4), rgba(200,148,42,0.4), rgba(239,68,68,0.4))'
      : 'linear-gradient(to right, rgba(59,130,246,0.4), rgba(139,92,246,0.4), rgba(236,72,153,0.4))'
  };
`

const CtaRow = styled.div`
  display: flex;
  gap: 8px;
`

const CtaOutline = styled(Link)`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: ${({ theme }) => theme.colors.slate[200]};
  font-weight: 700;
  font-size: 14px;
  text-decoration: none;
  transition: all ${({ theme }) => theme.transitions.normal};
  &:hover {
    border-color: rgba(200,148,42,0.3);
    color: ${({ theme }) => theme.colors.gold};
  }
`

const CtaGold = styled(Link)`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: linear-gradient(to right, ${({ theme }) => theme.colors.gold}, ${({ theme }) => theme.colors.goldBright});
  color: ${({ theme }) => theme.colors.navy};
  font-weight: 700;
  font-size: 14px;
  text-decoration: none;
  transition: all ${({ theme }) => theme.transitions.normal};
  &:hover {
    box-shadow: 0 4px 20px rgba(200,148,42,0.2);
  }
`

/* ── BestCityInsights ── */

const InsightsPanel = styled(GlassPanelPadded)`
  margin-bottom: 24px;
`

const InsightsHeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`

const InsightsTitle = styled.h3`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
`

const RealtimeBadge = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.colors.slate[500]};
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 8px;
  border-radius: 8px;
  margin-inline-start: auto;
`

const InsightsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  ${media.sm} { grid-template-columns: repeat(3, 1fr); }
  ${media.lg} { grid-template-columns: repeat(5, 1fr); }
`

const InsightLink = styled(Link)<{ $bgColor: string; $borderColor: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid ${({ $borderColor }) => $borderColor};
  background: ${({ $bgColor }) => $bgColor};
  text-decoration: none;
  text-align: center;
  transition: all ${({ theme }) => theme.transitions.normal};
  &:hover { transform: scale(1.05); }
`

const InsightEmoji = styled.span`
  font-size: 24px;
`

const InsightLabel = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[400]};
  font-weight: 500;
`

const InsightCity = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
  margin-top: 2px;
  transition: color ${({ theme }) => theme.transitions.normal};
  ${InsightLink}:hover & { color: ${({ theme }) => theme.colors.gold}; }
`

const InsightDetail = styled.div`
  font-size: 10px;
  font-weight: 500;
  margin-top: 2px;
`

/* ── MarketHealthScores ── */

const HealthPanel = styled(GlassPanelPadded)`
  margin-bottom: 24px;
`

const HealthGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  ${media.sm} { grid-template-columns: repeat(2, 1fr); }
  ${media.lg} { grid-template-columns: repeat(3, 1fr); }
`

const HealthCityLink = styled(Link)`
  position: relative;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  text-decoration: none;
  transition: all ${({ theme }) => theme.transitions.normal};
  &:hover {
    border-color: rgba(200,148,42,0.2);
    background: rgba(255, 255, 255, 0.04);
  }
`

const HealthCityName = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
  transition: color ${({ theme }) => theme.transitions.normal};
  ${HealthCityLink}:hover & { color: ${({ theme }) => theme.colors.gold}; }
`

const HealthCityCount = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[500]};
`

const ScoreNumber = styled.div<{ $color: string }>`
  font-size: 24px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  color: ${({ $color }) => $color};
`

const GradeBadge = styled.div<{ $color: string }>`
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  background: ${({ $color }) => `${$color}15`};
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $color }) => `${$color}30`};
`

const BreakdownStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const BreakdownRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const BreakdownLabel = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.colors.slate[500]};
  width: 80px;
  text-align: right;
`

const BreakdownTrack = styled.div`
  flex: 1;
  height: 6px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

const BreakdownFill = styled.div<{ $width: number; $color: string }>`
  height: 100%;
  border-radius: 9999px;
  transition: all 0.7s ease;
  width: ${({ $width }) => $width}%;
  background: ${({ $color }) => $color};
  opacity: 0.7;
`

const BreakdownScore = styled.span`
  font-size: 8px;
  color: ${({ theme }) => theme.colors.slate[600]};
  font-variant-numeric: tabular-nums;
  width: 24px;
  text-align: left;
`

const HealthTotalRow = styled.div`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  gap: 8px;
`

const HealthTotalTrack = styled.div`
  flex: 1;
  height: 8px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

const HealthTotalFill = styled.div<{ $width: number; $color: string }>`
  height: 100%;
  border-radius: 9999px;
  transition: all 1s ease;
  width: ${({ $width }) => $width}%;
  background: ${({ $color }) => `linear-gradient(90deg, ${$color}80, ${$color})`};
`

const HealthTotalLabel = styled.span<{ $color: string }>`
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ $color }) => $color};
`

const FootnoteCenter = styled.p`
  font-size: 9px;
  color: ${({ theme }) => theme.colors.slate[600]};
  margin-top: 12px;
  text-align: center;
`

/* ── PriceTrendMiniChart ── */

const ChartPanel = styled(GlassPanelPadded)``

const ChartLegendRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const LegendDot = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  background: ${({ $color }) => $color};
`

const LegendCity = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[400]};
`

const LegendChange = styled.span<{ $positive: boolean }>`
  font-size: 10px;
  font-weight: 700;
  color: ${({ $positive, theme }) => $positive ? theme.colors.emerald[400] : theme.colors.red[400]};
`

const ChartSvg = styled.svg`
  width: 100%;
  height: auto;
`

/* ── SortableComparisonTable ── */

const TablePanel = styled(GlassPanelPadded)`
  margin-top: 24px;
`

const ResetSortBtn = styled.button`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[500]};
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  transition: color ${({ theme }) => theme.transitions.normal};
  &:hover { color: ${({ theme }) => theme.colors.gold}; }
`

const TableScroll = styled.div`
  overflow-x: auto;
`

const Table = styled.table`
  width: 100%;
  font-size: 14px;
  border-collapse: collapse;
`

const Thead = styled.thead``

const TheadRow = styled.tr`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[500]};
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`

const Th = styled.th<{ $align: 'right' | 'center' | 'left'; $isCity?: boolean }>`
  text-align: ${({ $align }) => $align};
  padding: 10px 0;
  font-weight: 500;
  ${({ $isCity }) => $isCity ? 'padding-right: 8px;' : ''}
  cursor: pointer;
  user-select: none;
  transition: color 0.2s ease;
  &:hover { color: ${({ theme }) => theme.colors.gold}; }
`

const ThContent = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const HoverIcon = styled.span`
  opacity: 0;
  transition: opacity 0.2s ease;
  ${Th}:hover & { opacity: 0.4; }
`

const Tbody = styled.tbody``

const Tr = styled.tr<{ $highlight?: boolean }>`
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background ${({ theme }) => theme.transitions.normal};
  background: ${({ $highlight }) => $highlight ? 'rgba(200,148,42,0.03)' : 'transparent'};
  &:hover { background: rgba(255, 255, 255, 0.02); }
`

const Td = styled.td<{ $align?: 'right' | 'center' | 'left' }>`
  padding: 12px 0;
  text-align: ${({ $align = 'right' }) => $align};
`

const TdCity = styled(Td)`
  padding-right: 8px;
`

const CityLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.slate[200]};
  font-weight: 500;
  text-decoration: none;
  transition: color ${({ theme }) => theme.transitions.normal};
  &:hover { color: ${({ theme }) => theme.colors.gold}; }
`

const CityDot = styled.span<{ $color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  flex-shrink: 0;
  background: ${({ $color }) => $color};
`

const WinnerBadge = styled.span`
  font-size: 8px;
  color: ${({ theme }) => theme.colors.gold};
  background: rgba(200,148,42,0.1);
  padding: 2px 6px;
  border-radius: 9999px;
`

const TdSlate300 = styled(Td)`
  color: ${({ theme }) => theme.colors.slate[300]};
`

const TdGold = styled(Td)`
  color: ${({ theme }) => theme.colors.gold};
  font-weight: 500;
`

const TdRoi = styled(Td)<{ $color: string }>`
  font-weight: 700;
  color: ${({ $color }) => $color};
`

const TdSlate400 = styled(Td)`
  color: ${({ theme }) => theme.colors.slate[400]};
`

const AvailBar = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const AvailTrack = styled.div`
  width: 48px;
  height: 6px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

const AvailFill = styled.div<{ $width: number }>`
  height: 100%;
  border-radius: 9999px;
  background: rgba(52,211,153,0.6);
  width: ${({ $width }) => $width}%;
`

const AvailPct = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[500]};
`

/* ── City card stack ── */
const CardStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 24px;
`

/* ── Empty state ── */
const EmptyState = styled.div`
  text-align: center;
  padding: 80px 0;
`

const EmptyEmoji = styled.div`
  font-size: 36px;
  margin-bottom: 16px;
`

const EmptyText = styled.div`
  color: ${({ theme }) => theme.colors.slate[400]};
`

/* ═══════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════ */

/* ── StatCard ── */

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  subValue?: string | null
  color?: 'gold' | 'green' | 'blue' | 'purple'
}

function StatCard({ icon: Icon, label, value, subValue, color = 'gold' }: StatCardProps) {
  const cfg = STAT_COLOR_MAP[color]
  return (
    <StatCardPanel>
      <StatCardHeader>
        <StatIconWrap $bg={cfg.bg} $border={cfg.border}>
          <Icon style={{ width: 16, height: 16, color: cfg.text }} />
        </StatIconWrap>
        <Label>{label}</Label>
      </StatCardHeader>
      <StatValue>{value}</StatValue>
      {subValue && <StatSubValue>{subValue}</StatSubValue>}
    </StatCardPanel>
  )
}

/* ── CityCard ── */

interface CityCardProps {
  city: string
  stats: CityStats
  trendData?: TrendData | null
}

function CityCard({ city, stats, trendData }: CityCardProps) {
  const [expanded, setExpanded] = useState(false)

  // Extract 12-month price trend from trends API data — shows direction & magnitude.
  // Like Madlan's area trend arrows but with data quality transparency.
  const trend = trendData?.cities?.[city]
  const trendChange = trend?.change12m ?? null
  const trendQuality = trend?.dataQuality ?? 'low'

  const trendVariant: 'up' | 'down' | 'neutral' =
    trendChange !== null && trendChange > 2 ? 'up'
    : trendChange !== null && trendChange < -2 ? 'down'
    : 'neutral'

  return (
    <CityCardWrap>
      {/* Header */}
      <CityCardHeader onClick={() => setExpanded(prev => !prev)}>
        <CityCardHeaderTop>
          <FlexRow $gap={12}>
            <CityIconWrap>
              <MapPin style={{ width: 20, height: 20, color: '#C8942A' }} />
            </CityIconWrap>
            <div>
              <CityName>{city}</CityName>
              <FlexRow $gap={8}>
                <PlotCount>{stats.count} חלקות</PlotCount>
                {/* 12-month price trend badge — instant market direction signal per city.
                    Shows up/down/right with % change and data quality indicator.
                    Investors scan this to spot which areas are heating up vs cooling down. */}
                {trendChange !== null && (
                  <TrendBadge
                    $variant={trendVariant}
                    title={`שינוי מחיר 12 חודשים: ${trendChange >= 0 ? '+' : ''}${trendChange}% | איכות נתונים: ${trendQuality === 'high' ? 'גבוהה' : trendQuality === 'medium' ? 'בינונית' : 'נמוכה'}`}
                  >
                    <span>{trendChange > 2 ? '📈' : trendChange < -2 ? '📉' : '➡️'}</span>
                    <span>{trendChange >= 0 ? '+' : ''}{trendChange}%</span>
                    <QualityDot $quality={trendQuality} title={`איכות נתונים: ${trendQuality}`} />
                  </TrendBadge>
                )}
              </FlexRow>
            </div>
          </FlexRow>
          <FlexRow $gap={8}>
            <RoiBadge>
              +{stats.avgRoi}% ROI ממוצע
            </RoiBadge>
            {expanded
              ? <ChevronUp style={{ width: 16, height: 16, color: '#94A3B8' }} />
              : <ChevronDown style={{ width: 16, height: 16, color: '#94A3B8' }} />
            }
          </FlexRow>
        </CityCardHeaderTop>

        {/* Quick stats row — shows median alongside average for professional investors.
            Median is more meaningful in RE: one ₪5M plot doesn't skew it like it does the average.
            Like Madlan/Yad2 which show both average and median for area pricing. */}
        <QuickStatsGrid>
          <QuickStatCell>
            <QuickStatLabel>מחיר חציוני</QuickStatLabel>
            <QuickStatValueGold>{stats.medianPrice ? formatCurrency(stats.medianPrice) : '—'}</QuickStatValueGold>
            {(stats.medianPricePerDunam ?? 0) > 0 && (
              <QuickStatSub>{formatCurrency(stats.medianPricePerDunam!)}/דונם</QuickStatSub>
            )}
          </QuickStatCell>
          <QuickStatCell>
            <QuickStatLabel>ממוצע/דונם</QuickStatLabel>
            <QuickStatValueLight>{formatCurrency(stats.avgPricePerDunam)}</QuickStatValueLight>
          </QuickStatCell>
          <QuickStatCell>
            <QuickStatLabel>שטח כולל</QuickStatLabel>
            <QuickStatValue200>{formatDunam(stats.totalArea)} דונם</QuickStatValue200>
          </QuickStatCell>
          <QuickStatCell>
            <QuickStatLabel>זמינות</QuickStatLabel>
            <QuickStatValueGreen>
              {stats.available}/{stats.count}
            </QuickStatValueGreen>
          </QuickStatCell>
        </QuickStatsGrid>
      </CityCardHeader>

      {/* Expanded details */}
      {expanded && (
        <ExpandedBody>
          {/* Zoning breakdown */}
          {stats.byZoning && Object.keys(stats.byZoning).length > 0 && (
            <div>
              <SubsectionTitle>שלבי תכנון</SubsectionTitle>
              <ZoningBarRowStack>
                {Object.entries(stats.byZoning)
                  .sort(([, a], [, b]) => b - a)
                  .map(([zoning, count]) => {
                    const pct = Math.round((count / stats.count) * 100)
                    return (
                      <ZoningBarRow key={zoning}>
                        <ZoningLabel>{zoningLabels[zoning as keyof typeof zoningLabels] || zoning}</ZoningLabel>
                        <ZoningTrack>
                          <ZoningFill $width={pct} />
                        </ZoningTrack>
                        <ZoningCount>{count}</ZoningCount>
                      </ZoningBarRow>
                    )
                  })}
              </ZoningBarRowStack>
            </div>
          )}

          {/* Price range */}
          {stats.priceRange && (stats.priceRange.min > 0 || stats.priceRange.max > 0) && (
            <div>
              <SubsectionTitle>טווח מחירים</SubsectionTitle>
              <PriceRangeBar>
                <PriceRangeLabel>{formatCurrency(stats.priceRange.min)}</PriceRangeLabel>
                <PriceGradient $variant="price" />
                <PriceRangeLabel>{formatCurrency(stats.priceRange.max)}</PriceRangeLabel>
              </PriceRangeBar>
            </div>
          )}

          {/* Price per sqm range */}
          {stats.priceSqmRange && stats.priceSqmRange.max > 0 && (
            <div>
              <SubsectionTitle>מחיר למ״ר</SubsectionTitle>
              <PriceRangeBar>
                <PriceRangeLabel>₪{stats.priceSqmRange.min.toLocaleString()}</PriceRangeLabel>
                <PriceGradient $variant="sqm" />
                <PriceRangeLabel>₪{stats.priceSqmRange.max.toLocaleString()}</PriceRangeLabel>
              </PriceRangeBar>
            </div>
          )}

          {/* CTAs */}
          <CtaRow>
            <CtaOutline to={`/areas/${encodeURIComponent(city)}`}>
              <span>פרופיל {city}</span>
            </CtaOutline>
            <CtaGold to={`/?city=${encodeURIComponent(city)}`}>
              <span>צפה במפה</span>
              <ArrowLeft style={{ width: 16, height: 16 }} />
            </CtaGold>
          </CtaRow>
        </ExpandedBody>
      )}
    </CityCardWrap>
  )
}

/**
 * BestCityInsights — "Best City For..." recommendation badges.
 * Highlights which city wins in each investor-relevant category.
 * Like Madlan's "המלצות" but data-driven and auto-computed from real metrics.
 *
 * Categories:
 * - Best for Budget — lowest median price per dunam
 * - Highest ROI — highest average ROI
 * - Largest Plots — highest avg plot size
 * - Most Available — highest availability ratio
 * - Most Advanced — highest % of advanced zoning stages
 *
 * Only shown when 2+ cities exist (comparison needs multiple options).
 * Memoized to avoid recalculating on every render.
 */

interface BestCityInsightsProps {
  cities: CityStats[]
}

// Maps insight.bg Tailwind classes to actual color values for styled-components
const INSIGHT_BG_MAP: Record<string, { bg: string; border: string }> = {
  'bg-emerald-500/10 border-emerald-500/20': { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
  'bg-amber-500/10 border-amber-500/20': { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
  'bg-blue-500/10 border-blue-500/20': { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)' },
  'bg-teal-500/10 border-teal-500/20': { bg: 'rgba(20,184,166,0.1)', border: 'rgba(20,184,166,0.2)' },
  'bg-purple-500/10 border-purple-500/20': { bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.2)' },
}

function BestCityInsights({ cities }: BestCityInsightsProps) {
  const insights = useMemo(() => {
    if (!cities || cities.length < 2) return []

    const result: InsightItem[] = []

    // Best for Budget — lowest avg price per dunam
    const withPrice = cities.filter(c => c.avgPricePerDunam > 0)
    if (withPrice.length >= 2) {
      const cheapest = withPrice.reduce((a, b) => a.avgPricePerDunam < b.avgPricePerDunam ? a : b)
      result.push({
        emoji: '💰',
        label: 'הכי משתלם',
        city: cheapest.city,
        detail: `${formatCurrency(cheapest.avgPricePerDunam)}/דונם`,
        color: '#22C55E',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
      })
    }

    // Highest ROI
    const withRoi = cities.filter(c => c.avgRoi > 0)
    if (withRoi.length >= 2) {
      const bestRoi = withRoi.reduce((a, b) => a.avgRoi > b.avgRoi ? a : b)
      result.push({
        emoji: '📈',
        label: 'תשואה מובילה',
        city: bestRoi.city,
        detail: `+${bestRoi.avgRoi}% ROI`,
        color: '#F59E0B',
        bg: 'bg-amber-500/10 border-amber-500/20',
      })
    }

    // Largest average plots
    const withArea = cities.filter(c => c.totalArea > 0 && c.count > 0)
    if (withArea.length >= 2) {
      const largestAvg = withArea.reduce((a, b) => (a.totalArea / a.count) > (b.totalArea / b.count) ? a : b)
      const avgDunam = ((largestAvg.totalArea / largestAvg.count) / 1000).toFixed(1)
      result.push({
        emoji: '📐',
        label: 'חלקות גדולות',
        city: largestAvg.city,
        detail: `ממוצע ${avgDunam} דונם`,
        color: '#3B82F6',
        bg: 'bg-blue-500/10 border-blue-500/20',
      })
    }

    // Most available (highest availability %)
    const withAvail = cities.filter(c => c.count > 0)
    if (withAvail.length >= 2) {
      const mostAvail = withAvail.reduce((a, b) =>
        (a.available / a.count) > (b.available / b.count) ? a : b
      )
      const pct = Math.round((mostAvail.available / mostAvail.count) * 100)
      result.push({
        emoji: '🟢',
        label: 'הכי זמינות',
        city: mostAvail.city,
        detail: `${pct}% זמינות`,
        color: '#10B981',
        bg: 'bg-teal-500/10 border-teal-500/20',
      })
    }

    // Most advanced zoning — highest % of plots in advanced planning stages
    const advancedStages = new Set(['DETAILED_PLAN_APPROVED', 'DEVELOPER_TENDER', 'BUILDING_PERMIT', 'MASTER_PLAN_APPROVED', 'DETAILED_PLAN_DEPOSIT'])
    const withZoning = cities.filter(c => c.byZoning && c.count > 0)
    if (withZoning.length >= 2) {
      const mostAdvanced = withZoning.reduce((best, c) => {
        const advCount = Object.entries(c.byZoning!)
          .filter(([k]) => advancedStages.has(k))
          .reduce((s, [, v]) => s + v, 0)
        const advPct = c.count > 0 ? advCount / c.count : 0
        const bestAdvCount = Object.entries(best.byZoning!)
          .filter(([k]) => advancedStages.has(k))
          .reduce((s, [, v]) => s + v, 0)
        const bestAdvPct = best.count > 0 ? bestAdvCount / best.count : 0
        return advPct > bestAdvPct ? c : best
      })
      const advCount = Object.entries(mostAdvanced.byZoning!)
        .filter(([k]) => advancedStages.has(k))
        .reduce((s, [, v]) => s + v, 0)
      const advPct = Math.round((advCount / mostAdvanced.count) * 100)
      if (advPct > 0) {
        result.push({
          emoji: '🏗️',
          label: 'תכנון מתקדם',
          city: mostAdvanced.city,
          detail: `${advPct}% בשלבים מתקדמים`,
          color: '#A855F7',
          bg: 'bg-purple-500/10 border-purple-500/20',
        })
      }
    }

    return result
  }, [cities])

  if (insights.length === 0) return null

  return (
    <InsightsPanel>
      <InsightsHeaderRow>
        <Award style={{ width: 16, height: 16, color: '#C8942A' }} />
        <InsightsTitle>העיר הטובה ביותר עבור...</InsightsTitle>
        <RealtimeBadge>
          מבוסס על נתוני שוק בזמן אמת
        </RealtimeBadge>
      </InsightsHeaderRow>
      <InsightsGrid>
        {insights.map((insight, i) => {
          const colors = INSIGHT_BG_MAP[insight.bg] || { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' }
          return (
            <InsightLink
              key={i}
              to={`/areas/${encodeURIComponent(insight.city)}`}
              $bgColor={colors.bg}
              $borderColor={colors.border}
            >
              <InsightEmoji>{insight.emoji}</InsightEmoji>
              <div>
                <InsightLabel>{insight.label}</InsightLabel>
                <InsightCity>
                  {insight.city}
                </InsightCity>
                <InsightDetail style={{ color: insight.color }}>
                  {insight.detail}
                </InsightDetail>
              </div>
            </InsightLink>
          )
        })}
      </InsightsGrid>
    </InsightsPanel>
  )
}

/**
 * Market Health Score — composite score (0-100) per city evaluating investment attractiveness.
 * Factors: availability ratio, average ROI, zoning diversity (advancement), price accessibility.
 * This is a key differentiator vs Madlan/Yad2 — they don't offer aggregate investment scoring for areas.
 */
function calcMarketHealthScore(cityStats: CityStats): HealthScore | null {
  if (!cityStats) return null
  const { count, available, avgRoi, byZoning, priceRange, avgPricePerDunam, totalArea } = cityStats

  // 1. Availability Score (0-25): Higher availability = better investor choice
  const availRatio = count > 0 ? available / count : 0
  const availScore = Math.min(25, Math.round(availRatio * 30)) // 83%+ = max

  // 2. ROI Score (0-25): Higher ROI = better returns
  const roiScore = Math.min(25, Math.round((Math.min(avgRoi, 250) / 250) * 25))

  // 3. Zoning Diversity / Advancement Score (0-25): More advanced zoning stages = closer to realization
  const zoningKeys = Object.keys(byZoning || {})
  const advancedStages = ['DETAILED_PLAN_APPROVED', 'DEVELOPER_TENDER', 'BUILDING_PERMIT', 'MASTER_PLAN_APPROVED', 'DETAILED_PLAN_DEPOSIT']
  const advancedCount = zoningKeys.reduce((s, k) => s + (advancedStages.includes(k) ? ((byZoning || {})[k] || 0) : 0), 0)
  const advancedRatio = count > 0 ? advancedCount / count : 0
  const diversityBonus = Math.min(5, zoningKeys.length) // up to 5 points for variety
  const zoningScore = Math.min(25, Math.round(advancedRatio * 20) + diversityBonus)

  // 4. Market Depth Score (0-25): More plots, wider price range = healthier market
  const depthCount = Math.min(10, Math.round((count / 20) * 10)) // up to 10 for >20 plots
  const priceSpread = priceRange && priceRange.max > 0 && priceRange.min > 0
    ? Math.min(10, Math.round(((priceRange.max - priceRange.min) / priceRange.max) * 15))
    : 0
  const areaBonus = totalArea > 10000 ? 5 : totalArea > 5000 ? 3 : totalArea > 1000 ? 1 : 0
  const depthScore = Math.min(25, depthCount + priceSpread + areaBonus)

  const total = availScore + roiScore + zoningScore + depthScore

  // Grade & color
  let grade: string, color: string, emoji: string
  if (total >= 80) { grade = 'A+'; color = '#22C55E'; emoji = '🔥' }
  else if (total >= 65) { grade = 'A'; color = '#4ADE80'; emoji = '🟢' }
  else if (total >= 50) { grade = 'B+'; color = '#FBBF24'; emoji = '🟡' }
  else if (total >= 35) { grade = 'B'; color = '#F59E0B'; emoji = '🟠' }
  else { grade = 'C'; color = '#EF4444'; emoji = '🔴' }

  return {
    total,
    grade,
    color,
    emoji,
    breakdown: {
      availability: { score: availScore, max: 25, label: 'זמינות' },
      roi: { score: roiScore, max: 25, label: 'תשואה' },
      zoning: { score: zoningScore, max: 25, label: 'בשלות תכנונית' },
      depth: { score: depthScore, max: 25, label: 'עומק שוק' },
    },
  }
}

interface MarketHealthScoresProps {
  cities: CityStats[]
}

function MarketHealthScores({ cities }: MarketHealthScoresProps) {
  if (!cities || cities.length === 0) return null

  const scored = useMemo(() => {
    return cities
      .map(city => ({ ...city, health: calcMarketHealthScore(city) }))
      .filter((c): c is ScoredCity & { health: HealthScore } => c.health !== null)
      .sort((a, b) => b.health.total - a.health.total)
  }, [cities])

  if (scored.length === 0) return null

  return (
    <HealthPanel>
      <FlexBetween style={{ marginBottom: 16 }}>
        <SectionTitle style={{ marginBottom: 0 }}>
          <Shield style={{ width: 16, height: 16, color: '#C8942A' }} />
          ציון בריאות שוק
        </SectionTitle>
        <RealtimeBadge>
          מבוסס על: זמינות, תשואה, תכנון, עומק שוק
        </RealtimeBadge>
      </FlexBetween>

      <HealthGrid>
        {scored.map(city => {
          const h = city.health
          return (
            <HealthCityLink
              key={city.city}
              to={`/areas/${encodeURIComponent(city.city)}`}
            >
              {/* Score badge */}
              <FlexBetween style={{ marginBottom: 12 }}>
                <FlexRow $gap={8}>
                  <span style={{ fontSize: 18 }}>{h.emoji}</span>
                  <div>
                    <HealthCityName>{city.city}</HealthCityName>
                    <HealthCityCount>{city.count} חלקות</HealthCityCount>
                  </div>
                </FlexRow>
                <FlexCol $gap={4} style={{ alignItems: 'center' }}>
                  <ScoreNumber $color={h.color}>
                    {h.total}
                  </ScoreNumber>
                  <GradeBadge $color={h.color}>
                    {h.grade}
                  </GradeBadge>
                </FlexCol>
              </FlexBetween>

              {/* Breakdown bars */}
              <BreakdownStack>
                {Object.entries(h.breakdown).map(([key, dim]) => (
                  <BreakdownRow key={key}>
                    <BreakdownLabel>{dim.label}</BreakdownLabel>
                    <BreakdownTrack>
                      <BreakdownFill
                        $width={(dim.score / dim.max) * 100}
                        $color={h.color}
                      />
                    </BreakdownTrack>
                    <BreakdownScore>{dim.score}/{dim.max}</BreakdownScore>
                  </BreakdownRow>
                ))}
              </BreakdownStack>

              {/* Total progress ring (simplified as bar) */}
              <HealthTotalRow>
                <HealthTotalTrack>
                  <HealthTotalFill $width={h.total} $color={h.color} />
                </HealthTotalTrack>
                <HealthTotalLabel $color={h.color}>{h.total}/100</HealthTotalLabel>
              </HealthTotalRow>
            </HealthCityLink>
          )
        })}
      </HealthGrid>

      <FootnoteCenter>
        💡 הציון משקלל זמינות חלקות, תשואה ממוצעת, בשלות שלבי תכנון ועומק שוק. ציון גבוה = שוק אטרקטיבי יותר למשקיעים.
      </FootnoteCenter>
    </HealthPanel>
  )
}

const CITY_COLORS: Record<string, string> = {
  'חדרה': '#3B82F6',
  'נתניה': '#22C55E',
  'קיסריה': '#E5B94E',
}

/**
 * Mini SVG line chart for price trends per city — like Madlan's area price history.
 * Pure SVG, no chart library dependency.
 */

interface PriceTrendMiniChartProps {
  trends: TrendData | null
}

function PriceTrendMiniChart({ trends }: PriceTrendMiniChartProps) {
  if (!trends || !trends.cities || Object.keys(trends.cities).length === 0) return null

  const cities = Object.entries(trends.cities)
  const allValues = cities.flatMap(([, d]) => d.trend.map(t => t.avgPriceSqm))
  const min = Math.min(...allValues) * 0.95
  const max = Math.max(...allValues) * 1.05
  const range = max - min || 1

  const W = 500
  const H = 180
  const padX = 40
  const padY = 20
  const chartW = W - padX * 2
  const chartH = H - padY * 2

  return (
    <ChartPanel>
      <FlexBetween style={{ marginBottom: 16 }}>
        <SectionTitle style={{ marginBottom: 0 }}>
          <Activity style={{ width: 16, height: 16, color: '#C8942A' }} />
          מגמת מחירים — 12 חודשים אחרונים
        </SectionTitle>
        <ChartLegendRow>
          {cities.map(([city, data]) => (
            <FlexRow key={city} $gap={6}>
              <LegendDot $color={CITY_COLORS[city] || '#94A3B8'} />
              <LegendCity>{city}</LegendCity>
              <LegendChange $positive={data.change12m >= 0}>
                {data.change12m >= 0 ? '+' : ''}{data.change12m}%
              </LegendChange>
            </FlexRow>
          ))}
        </ChartLegendRow>
      </FlexBetween>

      <ChartSvg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="תרשים מגמות מחירים לפי עיר">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = padY + chartH * (1 - pct)
          const val = Math.round(min + range * pct)
          return (
            <g key={pct}>
              <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <text x={padX - 4} y={y + 3} fill="rgba(148,163,184,0.5)" fontSize="8" textAnchor="end" fontFamily="sans-serif">
                ₪{val.toLocaleString()}
              </text>
            </g>
          )
        })}

        {/* Month labels */}
        {trends.monthLabels && trends.monthLabels.map((label, i) => {
          if (i % 2 !== 0) return null
          const x = padX + (i / (trends.monthLabels!.length - 1)) * chartW
          return (
            <text key={i} x={x} y={H - 4} fill="rgba(148,163,184,0.4)" fontSize="7" textAnchor="middle" fontFamily="sans-serif">
              {label}
            </text>
          )
        })}

        {/* Lines */}
        {cities.map(([city, data]) => {
          const points = data.trend.map((t, i) => {
            const x = padX + (i / (data.trend.length - 1)) * chartW
            const y = padY + chartH * (1 - (t.avgPriceSqm - min) / range)
            return `${x},${y}`
          })
          const color = CITY_COLORS[city] || '#94A3B8'
          return (
            <g key={city}>
              <polyline
                points={points.join(' ')}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* End dot */}
              {data.trend.length > 0 && (() => {
                const last = data.trend[data.trend.length - 1]
                const x = padX + ((data.trend.length - 1) / (data.trend.length - 1)) * chartW
                const y = padY + chartH * (1 - (last.avgPriceSqm - min) / range)
                return <circle cx={x} cy={y} r="3" fill={color} />
              })()}
            </g>
          )
        })}
      </ChartSvg>

      <FootnoteCenter style={{ marginTop: 8 }}>
        מחיר ממוצע למ״ר לפי עיר. הנתונים מבוססים על חלקות פעילות במערכת.
      </FootnoteCenter>
    </ChartPanel>
  )
}

/**
 * JSON-LD structured data for the Areas page — helps Google understand and index
 * our area comparison content. Uses ItemList schema for city listings and
 * FAQPage schema for common investor questions. Like Madlan's SEO strategy.
 */

interface AreasJsonLdProps {
  overview: OverviewData | undefined
  cities: CityStats[]
}

function AreasJsonLd({ overview, cities }: AreasJsonLdProps) {
  if (!overview || !cities || cities.length === 0) return null

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'אזורי השקעה בקרקעות — ישראל',
    description: 'רשימת אזורים להשקעה בקרקעות בישראל עם נתוני שוק מעודכנים',
    numberOfItems: cities.length,
    itemListElement: cities.map((city, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: city.city,
      url: `${window.location.origin}/areas/${encodeURIComponent(city.city)}`,
      description: `${city.count} חלקות להשקעה ב${city.city}. מחיר ממוצע לדונם: ₪${city.avgPricePerDunam?.toLocaleString()}. תשואה ממוצעת: +${city.avgRoi}%.`,
    })),
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'באיזה אזור כדאי להשקיע בקרקע בישראל?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `האזורים המובילים להשקעה כוללים ${cities.map(c => c.city).join(', ')}. תשואה ממוצעת באזורים אלו: +${overview.avgRoi}%. סה״כ ${overview.total} חלקות זמינות.`,
        },
      },
      {
        '@type': 'Question',
        name: 'מה מחיר ממוצע לדונם קרקע להשקעה?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: cities.map(c => `${c.city}: ₪${c.avgPricePerDunam?.toLocaleString()} לדונם`).join('. ') + '.',
        },
      },
      {
        '@type': 'Question',
        name: 'כמה חלקות קרקע זמינות כרגע להשקעה?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `כרגע זמינות ${overview.available} חלקות מתוך ${overview.total} במערכת. שטח כולל: ${formatDunam(overview.totalArea)} דונם.`,
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </>
  )
}

/**
 * Sortable comparison table — click any column header to sort ascending/descending.
 * Like Madlan's area comparison but interactive. Helps investors quickly find
 * the cheapest area, highest ROI, or most available plots.
 */
const SORT_COLUMNS: SortColumn[] = [
  { key: 'city', label: 'עיר', align: 'right', getValue: (c) => c.city },
  { key: 'count', label: 'חלקות', align: 'center', getValue: (c) => c.count },
  { key: 'avgPricePerDunam', label: 'מחיר/דונם', align: 'center', getValue: (c) => c.avgPricePerDunam || 0 },
  { key: 'avgRoi', label: 'ROI ממוצע', align: 'center', getValue: (c) => c.avgRoi || 0 },
  { key: 'totalArea', label: 'שטח כולל', align: 'center', getValue: (c) => c.totalArea || 0 },
  { key: 'availability', label: 'זמינות', align: 'center', getValue: (c) => c.count > 0 ? c.available / c.count : 0 },
]

interface SortableComparisonTableProps {
  cities: CityStats[]
}

function SortableComparisonTable({ cities }: SortableComparisonTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const handleSort = useCallback((key: string) => {
    if (sortKey === key) {
      // Toggle direction, then reset
      if (sortDir === 'desc') setSortDir('asc')
      else { setSortKey(null); setSortDir('desc') }
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }, [sortKey, sortDir])

  const sortedCities = useMemo(() => {
    if (!sortKey) return cities
    const col = SORT_COLUMNS.find(c => c.key === sortKey)
    if (!col) return cities
    const sorted = [...cities].sort((a, b) => {
      const va = col.getValue(a)
      const vb = col.getValue(b)
      if (typeof va === 'string' && typeof vb === 'string') return sortDir === 'asc' ? va.localeCompare(vb, 'he') : vb.localeCompare(va, 'he')
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number)
    })
    return sorted
  }, [cities, sortKey, sortDir])

  const roiColor = (roi: number): string => {
    if (roi >= 150) return '#34D399'
    if (roi >= 100) return '#10B981'
    if (roi >= 50) return '#FBBF24'
    return '#94A3B8'
  }

  return (
    <TablePanel>
      <FlexBetween style={{ marginBottom: 16 }}>
        <SectionTitle style={{ marginBottom: 0 }}>
          <BarChart3 style={{ width: 16, height: 16, color: '#C8942A' }} />
          השוואת אזורים
        </SectionTitle>
        {sortKey && (
          <ResetSortBtn onClick={() => { setSortKey(null); setSortDir('desc') }}>
            <ArrowUpDown style={{ width: 12, height: 12 }} />
            איפוס מיון
          </ResetSortBtn>
        )}
      </FlexBetween>
      <TableScroll>
        <Table role="grid" aria-label="טבלת השוואת אזורים — לחץ על כותרת עמודה למיון">
          <Thead>
            <TheadRow>
              {SORT_COLUMNS.map((col) => {
                const isActive = sortKey === col.key
                return (
                  <Th
                    key={col.key}
                    $align={col.align}
                    $isCity={col.key === 'city'}
                    onClick={() => handleSort(col.key)}
                    aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    title={`מיין לפי ${col.label}`}
                    role="columnheader"
                  >
                    <ThContent>
                      {col.label}
                      {isActive ? (
                        sortDir === 'asc' ? (
                          <ChevronUp style={{ width: 12, height: 12, color: '#C8942A' }} />
                        ) : (
                          <ChevronDown style={{ width: 12, height: 12, color: '#C8942A' }} />
                        )
                      ) : (
                        <HoverIcon>
                          <ArrowUpDown style={{ width: 10, height: 10 }} />
                        </HoverIcon>
                      )}
                    </ThContent>
                  </Th>
                )
              })}
            </TheadRow>
          </Thead>
          <Tbody>
            {sortedCities.map((city, rowIdx) => {
              const availPct = city.count > 0 ? Math.round((city.available / city.count) * 100) : 0
              // Highlight the "winner" row for each sorted column
              const isTopRow = !!sortKey && rowIdx === 0
              return (
                <Tr
                  key={city.city}
                  $highlight={isTopRow}
                >
                  <TdCity>
                    <CityLink to={`/areas/${encodeURIComponent(city.city)}`}>
                      <CityDot $color={CITY_COLORS[city.city] || '#94A3B8'} />
                      {city.city}
                      {isTopRow && <WinnerBadge>🏆</WinnerBadge>}
                    </CityLink>
                  </TdCity>
                  <TdSlate300 $align="center">{city.count}</TdSlate300>
                  <TdGold $align="center">{formatCurrency(city.avgPricePerDunam)}</TdGold>
                  <TdRoi $align="center" $color={roiColor(city.avgRoi)}>+{city.avgRoi}%</TdRoi>
                  <TdSlate400 $align="center">{formatDunam(city.totalArea)} דונם</TdSlate400>
                  <Td $align="center">
                    <AvailBar>
                      <AvailTrack>
                        <AvailFill $width={availPct} />
                      </AvailTrack>
                      <AvailPct>{availPct}%</AvailPct>
                    </AvailBar>
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
      </TableScroll>
      <FootnoteCenter style={{ marginTop: 12 }}>
        💡 לחצו על כותרת עמודה כדי למיין. לחיצה חוזרת משנה כיוון.
      </FootnoteCenter>
    </TablePanel>
  )
}

/* ═══════════════════════════════════════════════════════
   Main Areas page
   ═══════════════════════════════════════════════════════ */

export default function Areas() {
  const { data: overview, isLoading } = useMarketOverview()
  const { data: trends } = useMarketTrends()

  // SEO meta tags
  useMetaTags({
    title: 'סקירת אזורים — השוואת ערים וקרקעות להשקעה | LandMap Israel',
    description: 'השוואת מחירי קרקעות, תשואות ושלבי תכנון בין ערים בישראל — חדרה, נתניה, קיסריה. נתוני שוק מעודכנים למשקיעים.',
    url: `${window.location.origin}/areas`,
  })

  // Cast the overview data to our local types (API may return a superset)
  const typedOverview = overview as OverviewData | undefined
  const cities: CityStats[] = (typedOverview?.cities || []) as CityStats[]

  return (
    <PageWrapper>
      <PublicNav />
      {/* Structured data for SEO — helps Google index area comparisons and answer investor FAQs */}
      <AreasJsonLd overview={typedOverview} cities={cities} />

      <MainContent>
        <Breadcrumb
          items={[
            { label: 'מפה', to: '/' },
            { label: 'סקירת אזורים' },
          ]}
        />
        {/* Hero */}
        <HeroSection>
          <HeroTitle>
            <BrandText>סקירת אזורים</BrandText>
          </HeroTitle>
          <HeroSubtitle>
            השוואת נתוני נדל"ן בין ערים — מחירים, תשואות, שלבי תכנון וזמינות.
            כמו מדל"ן, רק עבור קרקעות להשקעה.
          </HeroSubtitle>
        </HeroSection>

        {isLoading ? (
          <LoadingWrap>
            <Spinner />
          </LoadingWrap>
        ) : (
          <>
            {/* Global stats — shows median alongside average because median is more
                representative for real estate pricing (not skewed by outlier plots).
                Professional investors always look at medians — like Madlan/Yad2. */}
            {typedOverview && (
              <StatsGrid>
                <StatCard icon={Building2} label="סה״כ חלקות" value={typedOverview.total} color="gold" />
                <StatCard icon={Ruler} label="שטח כולל" value={`${formatDunam(typedOverview.totalArea)} דונם`} color="blue" />
                <StatCard icon={TrendingUp} label="ROI ממוצע" value={`+${typedOverview.avgRoi}%`} color="green" />
                <StatCard
                  icon={DollarSign}
                  label="מחיר חציוני"
                  value={typedOverview.medianPrice ? formatCurrency(typedOverview.medianPrice) : '—'}
                  subValue={typedOverview.medianPricePerSqm ? `₪${Math.round(typedOverview.medianPricePerSqm).toLocaleString()}/מ״ר` : null}
                  color="gold"
                />
                <StatCard icon={DollarSign} label="שווי כולל" value={formatCurrency(typedOverview.totalValue)} subValue={`${typedOverview.available} זמינות`} color="purple" />
                <StatCard
                  icon={Users}
                  label="זמינות"
                  value={`${typedOverview.available}/${typedOverview.total}`}
                  subValue={typedOverview.total > 0 ? `${Math.round((typedOverview.available / typedOverview.total) * 100)}% פתוחות` : null}
                  color="green"
                />
              </StatsGrid>
            )}

            {/* Best City For... — quick recommendation badges for investor decision aid.
                Highlights which city wins in each category (budget, ROI, size, availability, zoning).
                Data-driven, auto-computed from real metrics — not editorial opinion.
                Neither Madlan nor Yad2 surfaces this kind of comparative insight. */}
            {cities.length > 1 && <BestCityInsights cities={cities} />}

            {/* Market Health Scores — composite investment score per city */}
            {cities.length > 0 && <MarketHealthScores cities={cities} />}

            {/* Price trends chart */}
            {trends && <PriceTrendMiniChart trends={trends as TrendData} />}

            {/* City comparison table — sortable like Madlan's area comparison */}
            {cities.length > 1 && <SortableComparisonTable cities={cities} />}

            {/* City cards — now with 12-month price trend badges from the trends API.
                Trend data is passed to each card so investors can instantly see
                which areas are appreciating vs declining without expanding. */}
            <CardStack>
              {cities.map((city) => (
                <CityCard key={city.city} city={city.city} stats={city} trendData={trends as TrendData} />
              ))}
            </CardStack>

            {cities.length === 0 && !isLoading && (
              <EmptyState>
                <EmptyEmoji>🏜️</EmptyEmoji>
                <EmptyText>אין נתונים להצגה</EmptyText>
              </EmptyState>
            )}
          </>
        )}
      </MainContent>

      <BackToTopButton />
      <PublicFooter />
    </PageWrapper>
  )
}
