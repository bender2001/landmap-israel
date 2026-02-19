import { useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { MapPin, TrendingUp, Ruler, DollarSign, ArrowLeft, ArrowRight, BarChart3, Building2, Shield, Clock, Zap, Map } from 'lucide-react'
import styled from 'styled-components'
import { useMarketOverview } from '../../hooks/useMarket'
import { useAllPlots } from '../../hooks/usePlots'
import { useMetaTags } from '../../hooks/useSEO'
import PublicNav from '../../components/PublicNav'
import PublicFooter from '../../components/PublicFooter'
import Spinner from '../../components/ui/Spinner'
import BackToTopButton from '../../components/ui/BackToTopButton'
import Breadcrumb from '../../components/ui/Breadcrumb'
import { formatCurrency, formatDunam, formatPriceShort } from '../../utils/format'
import { calcInvestmentScore, getScoreLabel, calcCAGR } from '../../utils/investment'
import { statusColors, statusLabels, zoningLabels } from '../../utils/constants'
import { media } from '../../styles/theme'
import type { Plot } from '../../types'
import type { CAGRResult, ScoreLabel } from '../../types'
import {
  PageWrapper,
  GlassPanel,
  GlassPanelPadded,
  FlexRow,
  FlexBetween,
  FlexCenter,
  CardLift,
  SmallLabel,
  Muted,
  BrandText,
  Label,
} from '../../styles/shared'

/* ── City stats from market overview ─────────────── */
interface CityStatsData {
  city: string
  count: number
  available: number
  totalArea: number
  avgPricePerDunam: number
  avgRoi: number
  priceRange?: { min: number; max: number }
}

/* ── PriceStats computed locally ─────────────────── */
interface PriceStatsData {
  min: number
  max: number
  median: number
  avg: number
  count: number
}

/* ── ZoningBreakdown entry ───────────────────────── */
interface ZoningBreakdownEntry {
  key: string
  label: string
  count: number
  pct: number
}

/* ── Chart data ──────────────────────────────────── */
interface Bin {
  min: number
  max: number
  count: number
}

interface PriceChartData {
  bins: Bin[]
  maxCount: number
  min: number
  max: number
  median: number
  total: number
}

interface RoiChartData extends PriceChartData {
  avg: number
}

/* ══════════════════════════════════════════════════
   Styled Components — page-specific
   ══════════════════════════════════════════════════ */

const LoadingWrapper = styled(PageWrapper)`
  display: flex;
  flex-direction: column;
`

const LoadingCenter = styled(FlexCenter)`
  padding: 128px 0;
`

const StyledSpinner = styled(Spinner)`
  width: 40px;
  height: 40px;
  color: ${({ theme }) => theme.colors.gold};
`

const NotFoundContent = styled.div`
  max-width: 896px;
  margin: 0 auto;
  padding: 128px 16px;
  text-align: center;
`

const NotFoundEmoji = styled.div`
  font-size: 60px;
  margin-bottom: 16px;
`

const NotFoundTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[200]};
  margin-bottom: 12px;
`

const NotFoundText = styled.p`
  color: ${({ theme }) => theme.colors.slate[400]};
  margin-bottom: 24px;
`

const NotFoundActions = styled(FlexCenter)`
  gap: 12px;
`

const AreaLinkButton = styled(Link)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: rgba(200, 148, 42, 0.2);
  border: 1px solid rgba(200, 148, 42, 0.3);
  border-radius: ${({ theme }) => theme.radii.xl};
  color: ${({ theme }) => theme.colors.gold};
  font-size: 14px;
  text-decoration: none;
  transition: background ${({ theme }) => theme.transitions.normal};
  &:hover { background: rgba(200, 148, 42, 0.3); }
`

const MapLinkButton = styled(Link)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.gold}, ${({ theme }) => theme.colors.goldBright});
  border-radius: ${({ theme }) => theme.radii.xl};
  color: ${({ theme }) => theme.colors.navy};
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  transition: box-shadow ${({ theme }) => theme.transitions.normal};
  &:hover {
    box-shadow: 0 4px 20px rgba(200, 148, 42, 0.3);
  }
`

const BackgroundGrid = styled.div`
  position: fixed;
  inset: 0;
  opacity: 0.03;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(200, 148, 42, 0.3) 1px, transparent 1px),
    linear-gradient(90deg, rgba(200, 148, 42, 0.3) 1px, transparent 1px);
  background-size: 50px 50px;
`

const MainContent = styled.main`
  position: relative;
  z-index: 10;
  max-width: 960px;
  margin: 0 auto;
  padding: 80px 16px 64px;
  ${media.sm} { padding-left: 24px; padding-right: 24px; }
`

const BreadcrumbWrap = styled.div`
  margin-bottom: 24px;
`

const HeroSection = styled.div`
  margin-bottom: 32px;
`

const HeroRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
`

const HeroIconBox = styled.div`
  width: 56px;
  height: 56px;
  border-radius: ${({ theme }) => theme.radii.xxl};
  background: linear-gradient(to bottom right, rgba(200, 148, 42, 0.2), rgba(200, 148, 42, 0.05));
  border: 1px solid rgba(200, 148, 42, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
`

const HeroTitle = styled.h1`
  font-size: 30px;
  font-weight: 900;
  ${media.sm} { font-size: 36px; }
`

const HeroSub = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.slate[400]};
  margin-top: 4px;
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 32px;
  ${media.sm} { grid-template-columns: repeat(3, 1fr); }
  ${media.lg} { grid-template-columns: repeat(5, 1fr); }
`

/* ── StatCard styled parts ───────────────────────── */

const StatCardPanel = styled(GlassPanel)`
  padding: 16px;
`

const StatCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`

const StatIconBox = styled.div<{ $bg: string; $color: string; $border: string }>`
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radii.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ $border }) => $border};
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
`

const StatValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
`

const StatSub = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.slate[500]};
  margin-top: 4px;
`

/* ── PlotRow styled parts ────────────────────────── */

const PlotRowLink = styled(Link)`
  ${CardLift}
  display: block;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: ${({ theme }) => theme.radii.xl};
  backdrop-filter: blur(12px);
  padding: 16px;
  transition: all ${({ theme }) => theme.transitions.normal};
  &:hover { border-color: rgba(200, 148, 42, 0.2); }
`

const PlotRowHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
`

const PlotTitle = styled.h3`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
  transition: color ${({ theme }) => theme.transitions.normal};
  ${PlotRowLink}:hover & {
    color: ${({ theme }) => theme.colors.gold};
  }
`

const PlotStatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
`

const StatusBadge = styled.span<{ $statusColor: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 9px;
  font-weight: 500;
  background: ${({ $statusColor }) => `${$statusColor}20`};
  color: ${({ $statusColor }) => $statusColor};
`

const StatusDot = styled.span<{ $statusColor: string }>`
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: ${({ $statusColor }) => $statusColor};
`

const ZoningLabel = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[500]};
`

const ScoreBadge = styled.div<{ $scoreColor: string }>`
  font-size: 12px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ $scoreColor }) => `${$scoreColor}15`};
  color: ${({ $scoreColor }) => $scoreColor};
  border: 1px solid ${({ $scoreColor }) => `${$scoreColor}30`};
  text-align: left;
`

const PlotMetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`

const MetricLabel = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[500]};
`

const MetricValueGold = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.gold};
`

const MetricValueLight = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[200]};
`

const MetricValueGreen = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.emerald[400]};
`

const CagrText = styled.div`
  font-size: 9px;
  color: ${({ theme }) => theme.colors.slate[500]};
`

const ReadinessRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[500]};
`

/* ── Chart panels ────────────────────────────────── */

const ChartPanel = styled(GlassPanelPadded)`
  margin-bottom: 32px;
`

const ChartHeader = styled(FlexBetween)`
  margin-bottom: 12px;
`

const ChartTitle = styled.h2`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
  display: flex;
  align-items: center;
  gap: 8px;
`

const ChartMeta = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.colors.slate[500]};
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 8px;
  border-radius: ${({ theme }) => theme.radii.lg};
`

const SvgChart = styled.svg`
  width: 100%;
  height: auto;
`

const ChartHint = styled.p`
  font-size: 9px;
  color: ${({ theme }) => theme.colors.slate[600]};
  margin-top: 4px;
  text-align: center;
`

/* ── Zoning breakdown ────────────────────────────── */

const ZoningPanel = styled(GlassPanelPadded)`
  margin-bottom: 32px;
`

const ZoningTitle = styled.h2`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`

const ZoningGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  ${media.sm} { grid-template-columns: repeat(2, 1fr); }
`

const ZoningRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const ZoningRowLabel = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.slate[400]};
  width: 144px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ZoningTrack = styled.div`
  flex: 1;
  height: 10px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

const ZoningFill = styled.div<{ $pct: number }>`
  height: 100%;
  border-radius: 9999px;
  background: linear-gradient(90deg, rgba(200, 148, 42, 0.6), ${({ theme }) => theme.colors.gold});
  width: ${({ $pct }) => $pct}%;
  transition: width 0.7s ease;
`

const ZoningRowCount = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[500]};
  font-variant-numeric: tabular-nums;
  width: 48px;
  text-align: left;
`

/* ── CTA section ─────────────────────────────────── */

const CtaPanel = styled(GlassPanel)`
  padding: 24px;
  margin-bottom: 32px;
  border-color: rgba(200, 148, 42, 0.1);
  background: linear-gradient(90deg, rgba(200, 148, 42, 0.05), transparent),
              rgba(255, 255, 255, 0.03);
`

const CtaFlex = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  ${media.sm} { flex-direction: row; }
`

const CtaTextWrap = styled.div`
  flex: 1;
  text-align: center;
  ${media.sm} { text-align: right; }
`

const CtaTitle = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
  margin-bottom: 4px;
`

const CtaSub = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.slate[400]};
`

const CtaButton = styled(Link)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.gold}, ${({ theme }) => theme.colors.goldBright});
  border-radius: ${({ theme }) => theme.radii.xl};
  color: ${({ theme }) => theme.colors.navy};
  font-weight: 700;
  font-size: 14px;
  text-decoration: none;
  white-space: nowrap;
  transition: all ${({ theme }) => theme.transitions.normal};
  &:hover {
    box-shadow: 0 4px 20px rgba(200, 148, 42, 0.2);
  }
`

/* ── Plot listings section ───────────────────────── */

const PlotSection = styled.div`
  margin-bottom: 32px;
`

const PlotSectionHeader = styled(FlexBetween)`
  margin-bottom: 16px;
`

const PlotSectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
  display: flex;
  align-items: center;
  gap: 8px;
`

const PlotSectionSortNote = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.slate[500]};
`

const PlotGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  ${media.sm} { grid-template-columns: repeat(2, 1fr); }
  ${media.lg} { grid-template-columns: repeat(3, 1fr); }
`

const MorePlotsCenter = styled.div`
  text-align: center;
  margin-top: 24px;
`

const MorePlotsLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${({ theme }) => theme.radii.xl};
  font-size: 14px;
  color: ${({ theme }) => theme.colors.slate[300]};
  text-decoration: none;
  transition: all ${({ theme }) => theme.transitions.normal};
  &:hover {
    border-color: rgba(200, 148, 42, 0.3);
    color: ${({ theme }) => theme.colors.gold};
  }
`

/* ── Sold plots ──────────────────────────────────── */

const SoldSection = styled.div`
  margin-bottom: 32px;
`

const SoldTitle = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[400]};
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`

const SoldGrid = styled(PlotGrid)`
  opacity: 0.6;
`

/* ── Other cities ────────────────────────────────── */

const OtherCitiesPanel = styled(GlassPanelPadded)``

const OtherCitiesTitle = styled.h2`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
  margin-bottom: 16px;
`

const OtherCitiesGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  ${media.sm} { grid-template-columns: repeat(2, 1fr); }
  ${media.lg} { grid-template-columns: repeat(3, 1fr); }
`

const CityLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: ${({ theme }) => theme.radii.xl};
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  text-decoration: none;
  transition: all ${({ theme }) => theme.transitions.normal};
  &:hover {
    border-color: rgba(200, 148, 42, 0.2);
    background: rgba(255, 255, 255, 0.04);
  }
`

const CityLinkLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const CityName = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[200]};
`

const CityCount = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[500]};
`

const CityLinkRight = styled.div`
  text-align: left;
`

const CityRoi = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.emerald[400]};
`

const CityPrice = styled.div`
  font-size: 9px;
  color: ${({ theme }) => theme.colors.slate[500]};
`

/* ── Icon sizing helper ──────────────────────────── */
const iconSm = { width: 16, height: 16 } as const
const iconXs = { width: 12, height: 12 } as const
const iconMd = { width: 20, height: 20 } as const
const iconLg = { width: 24, height: 24 } as const

/* ══════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════ */

/* ── CityJsonLd ──────────────────────────────────── */

interface CityJsonLdProps {
  city: string
  stats: CityStatsData | null
  plots: Plot[]
}

/** JSON-LD structured data for city landing page */
function CityJsonLd({ city, stats, plots }: CityJsonLdProps) {
  if (!city || !stats) return null

  const baseUrl = window.location.origin

  // RealEstateAgent or WebPage schema for the city
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `קרקעות להשקעה ב${city} — LandMap Israel`,
    description: `${stats.count} חלקות קרקע להשקעה ב${city}. מחיר ממוצע: ₪${stats.avgPricePerDunam?.toLocaleString()} לדונם. תשואה ממוצעת: +${stats.avgRoi}%.`,
    url: `${baseUrl}/areas/${encodeURIComponent(city)}`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'LandMap Israel',
      url: baseUrl,
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'מפת קרקעות', item: baseUrl },
        { '@type': 'ListItem', position: 2, name: 'סקירת אזורים', item: `${baseUrl}/areas` },
        { '@type': 'ListItem', position: 3, name: city },
      ],
    },
  }

  // ItemList of plots in this city
  const plotListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `חלקות קרקע להשקעה ב${city}`,
    numberOfItems: plots?.length || 0,
    itemListElement: (plots || []).slice(0, 10).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `גוש ${p.block_number ?? p.blockNumber} חלקה ${p.number}`,
      url: `${baseUrl}/plot/${p.id}`,
    })),
  }

  // FAQ for this specific city
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `כמה עולה דונם קרקע ב${city}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `מחיר ממוצע לדונם ב${city}: ₪${stats.avgPricePerDunam?.toLocaleString()}. טווח מחירים: ${formatCurrency(stats.priceRange?.min || 0)} — ${formatCurrency(stats.priceRange?.max || 0)}.`,
        },
      },
      {
        '@type': 'Question',
        name: `כמה חלקות זמינות להשקעה ב${city}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `כרגע זמינות ${stats.available} חלקות מתוך ${stats.count} ב${city}. שטח כולל: ${formatDunam(stats.totalArea)} דונם.`,
        },
      },
      {
        '@type': 'Question',
        name: `מה התשואה הצפויה מקרקע ב${city}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `תשואה ממוצעת צפויה ב${city}: +${stats.avgRoi}%. התשואה תלויה בשלב התכנוני, מיקום החלקה ותנאי השוק.`,
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(plotListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </>
  )
}

/* ── StatCard ────────────────────────────────────── */

interface StatCardProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  value: string | number
  sub?: string
  color?: 'gold' | 'green' | 'blue' | 'purple' | 'orange'
}

const statColorMap: Record<string, { bg: string; color: string; border: string }> = {
  gold:   { bg: 'rgba(200,148,42,0.15)',  color: '#C8942A', border: 'rgba(200,148,42,0.2)' },
  green:  { bg: 'rgba(16,185,129,0.15)',   color: '#34D399', border: 'rgba(16,185,129,0.2)' },
  blue:   { bg: 'rgba(59,130,246,0.15)',   color: '#60A5FA', border: 'rgba(59,130,246,0.2)' },
  purple: { bg: 'rgba(139,92,246,0.15)',   color: '#A78BFA', border: 'rgba(139,92,246,0.2)' },
  orange: { bg: 'rgba(249,115,22,0.15)',   color: '#FB923C', border: 'rgba(249,115,22,0.2)' },
}

function StatCard({ icon: Icon, label, value, sub, color = 'gold' }: StatCardProps) {
  const c = statColorMap[color]
  return (
    <StatCardPanel>
      <StatCardHeader>
        <StatIconBox $bg={c.bg} $color={c.color} $border={c.border}>
          <Icon style={iconSm} />
        </StatIconBox>
        <Label>{label}</Label>
      </StatCardHeader>
      <StatValue>{value}</StatValue>
      {sub && <StatSub>{sub}</StatSub>}
    </StatCardPanel>
  )
}

/* ── PlotRow ─────────────────────────────────────── */

interface PlotRowProps {
  plot: Plot
}

function PlotRow({ plot }: PlotRowProps) {
  const price = plot.total_price ?? plot.totalPrice ?? 0
  const proj = plot.projected_value ?? plot.projectedValue ?? 0
  const size = plot.size_sqm ?? plot.sizeSqM ?? 0
  const bn = plot.block_number ?? plot.blockNumber
  const roi = price > 0 ? Math.round(((proj - price) / price) * 100) : 0
  const score = calcInvestmentScore(plot)
  const { label: scoreLabel, color: scoreColor } = getScoreLabel(score)
  const zoningStage = plot.zoning_stage ?? plot.zoningStage
  const readiness = plot.readiness_estimate ?? plot.readinessEstimate
  const sColor = statusColors[plot.status as keyof typeof statusColors]
  const cagrData = calcCAGR(roi, readiness)

  return (
    <PlotRowLink to={`/plot/${plot.id}`}>
      <PlotRowHeader>
        <div>
          <PlotTitle>
            גוש {bn} | חלקה {plot.number}
          </PlotTitle>
          <PlotStatusRow>
            <StatusBadge $statusColor={sColor}>
              <StatusDot $statusColor={sColor} />
              {statusLabels[plot.status as keyof typeof statusLabels]}
            </StatusBadge>
            <ZoningLabel>
              {zoningLabels[zoningStage as keyof typeof zoningLabels]}
            </ZoningLabel>
          </PlotStatusRow>
        </div>
        <CityLinkRight>
          <ScoreBadge $scoreColor={scoreColor}>
            ⭐ {score}/10
          </ScoreBadge>
        </CityLinkRight>
      </PlotRowHeader>

      <PlotMetricsGrid>
        <div>
          <MetricLabel>מחיר</MetricLabel>
          <MetricValueGold>{formatPriceShort(price)}</MetricValueGold>
        </div>
        <div>
          <MetricLabel>שטח</MetricLabel>
          <MetricValueLight>{formatDunam(size)} דונם</MetricValueLight>
        </div>
        <div>
          <MetricLabel>תשואה</MetricLabel>
          <MetricValueGreen>+{roi}%</MetricValueGreen>
          {cagrData && (
            <CagrText>{cagrData.cagr}%/שנה</CagrText>
          )}
        </div>
      </PlotMetricsGrid>

      {readiness && (
        <ReadinessRow>
          <Clock style={iconXs} />
          מוכנות: {readiness}
        </ReadinessRow>
      )}
    </PlotRowLink>
  )
}

/* ── PriceDistributionChart ──────────────────────── */

/**
 * PriceDistributionChart — SVG histogram showing how plot prices are distributed.
 * Like Madlan's price distribution for neighborhoods — gives investors instant visual
 * context about where most plots are priced and whether there are bargain outliers.
 * Pure SVG, no chart library dependency.
 */

interface PriceDistributionChartProps {
  plots: Plot[]
}

function PriceDistributionChart({ plots }: PriceDistributionChartProps) {
  const chartData = useMemo((): PriceChartData | null => {
    if (!plots || plots.length < 3) return null
    const prices = plots
      .map(p => p.total_price ?? p.totalPrice ?? 0)
      .filter(p => p > 0)
      .sort((a, b) => a - b)
    if (prices.length < 3) return null

    // Create 8 bins from min to max
    const min = prices[0]
    const max = prices[prices.length - 1]
    const range = max - min
    if (range <= 0) return null

    const binCount = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(prices.length))))
    const binWidth = range / binCount
    const bins: Bin[] = Array.from({ length: binCount }, (_, i) => ({
      min: min + i * binWidth,
      max: min + (i + 1) * binWidth,
      count: 0,
    }))

    for (const price of prices) {
      const idx = Math.min(binCount - 1, Math.floor((price - min) / binWidth))
      bins[idx].count++
    }

    const maxCount = Math.max(...bins.map(b => b.count))
    const median = prices[Math.floor(prices.length / 2)]

    return { bins, maxCount, min, max, median, total: prices.length }
  }, [plots])

  if (!chartData) return null

  const { bins, maxCount, min, max, median, total } = chartData
  const W = 400
  const H = 140
  const padX = 10
  const padY = 10
  const barGap = 4
  const chartW = W - padX * 2
  const chartH = H - padY * 2 - 20 // 20px for labels
  const barW = (chartW - barGap * (bins.length - 1)) / bins.length

  // Median line position
  const range = max - min
  const medianX = range > 0 ? padX + ((median - min) / range) * chartW : W / 2

  return (
    <ChartPanel>
      <ChartHeader>
        <ChartTitle>
          <BarChart3 style={{ ...iconSm, color: '#C8942A' }} />
          התפלגות מחירים
        </ChartTitle>
        <ChartMeta>
          {total} חלקות · חציון: ₪{Math.round(median).toLocaleString()}
        </ChartMeta>
      </ChartHeader>

      <SvgChart
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`התפלגות מחירי חלקות — חציון ₪${Math.round(median).toLocaleString()}`}
      >
        {/* Bars */}
        {bins.map((bin, i) => {
          const barH = maxCount > 0 ? (bin.count / maxCount) * chartH : 0
          const x = padX + i * (barW + barGap)
          const y = padY + chartH - barH
          const isMedianBin = median >= bin.min && median < bin.max
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(2, barH)}
                rx={3}
                fill={isMedianBin ? 'rgba(200,148,42,0.6)' : 'rgba(200,148,42,0.25)'}
                stroke={isMedianBin ? 'rgba(200,148,42,0.8)' : 'rgba(200,148,42,0.15)'}
                strokeWidth={1}
              />
              {/* Count label on bars with data */}
              {bin.count > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 4}
                  fill="rgba(148,163,184,0.7)"
                  fontSize="9"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  {bin.count}
                </text>
              )}
              {/* Price range label */}
              {i % 2 === 0 && (
                <text
                  x={x + barW / 2}
                  y={H - 4}
                  fill="rgba(148,163,184,0.4)"
                  fontSize="8"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  ₪{bin.min >= 1000000 ? `${(bin.min / 1000000).toFixed(1)}M` : `${Math.round(bin.min / 1000)}K`}
                </text>
              )}
            </g>
          )
        })}

        {/* Median line */}
        <line
          x1={medianX}
          y1={padY}
          x2={medianX}
          y2={padY + chartH}
          stroke="rgba(200,148,42,0.5)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
        <text
          x={medianX}
          y={padY - 2}
          fill="rgba(200,148,42,0.8)"
          fontSize="8"
          textAnchor="middle"
          fontFamily="sans-serif"
          fontWeight="bold"
        >
          חציון
        </text>
      </SvgChart>

      <ChartHint>
        💡 העמודה הבולטת מסמנת את הטווח שבו נמצא המחיר החציוני
      </ChartHint>
    </ChartPanel>
  )
}

/* ── RoiDistributionChart ────────────────────────── */

/**
 * RoiDistributionChart — SVG histogram showing how plot ROIs are distributed.
 * Complements PriceDistributionChart: price shows what you pay, ROI shows what you get.
 * Investors can instantly see if most plots in a city offer moderate returns (clustered
 * around 100-150%) or if there's a wide spread (some 50%, some 300%).
 * Neither Madlan nor Yad2 visualize ROI distribution — unique differentiator.
 */

interface RoiDistributionChartProps {
  plots: Plot[]
}

function RoiDistributionChart({ plots }: RoiDistributionChartProps) {
  const chartData = useMemo((): RoiChartData | null => {
    if (!plots || plots.length < 3) return null
    const rois = plots
      .map(p => {
        const price = p.total_price ?? p.totalPrice ?? 0
        const proj = p.projected_value ?? p.projectedValue ?? 0
        return price > 0 ? Math.round(((proj - price) / price) * 100) : null
      })
      .filter((r): r is number => r !== null && r >= 0)
      .sort((a, b) => a - b)
    if (rois.length < 3) return null

    const min = rois[0]
    const max = rois[rois.length - 1]
    const range = max - min
    if (range <= 0) return null

    const binCount = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(rois.length))))
    const binWidth = range / binCount
    const bins: Bin[] = Array.from({ length: binCount }, (_, i) => ({
      min: min + i * binWidth,
      max: min + (i + 1) * binWidth,
      count: 0,
    }))

    for (const roi of rois) {
      const idx = Math.min(binCount - 1, Math.floor((roi - min) / binWidth))
      bins[idx].count++
    }

    const maxCount = Math.max(...bins.map(b => b.count))
    const median = rois[Math.floor(rois.length / 2)]
    const avg = Math.round(rois.reduce((s, v) => s + v, 0) / rois.length)

    return { bins, maxCount, min, max, median, avg, total: rois.length }
  }, [plots])

  if (!chartData) return null

  const { bins, maxCount, min, max, median, avg, total } = chartData
  const W = 400
  const H = 140
  const padX = 10
  const padY = 10
  const barGap = 4
  const chartW = W - padX * 2
  const chartH = H - padY * 2 - 20
  const barW = (chartW - barGap * (bins.length - 1)) / bins.length

  const range = max - min
  const medianX = range > 0 ? padX + ((median - min) / range) * chartW : W / 2

  return (
    <ChartPanel>
      <ChartHeader>
        <ChartTitle>
          <TrendingUp style={{ ...iconSm, color: '#34D399' }} />
          התפלגות תשואות
        </ChartTitle>
        <ChartMeta>
          {total} חלקות · חציון: +{median}% · ממוצע: +{avg}%
        </ChartMeta>
      </ChartHeader>

      <SvgChart
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`התפלגות תשואות — חציון +${median}%, ממוצע +${avg}%`}
      >
        {bins.map((bin, i) => {
          const barH = maxCount > 0 ? (bin.count / maxCount) * chartH : 0
          const x = padX + i * (barW + barGap)
          const y = padY + chartH - barH
          const isMedianBin = median >= bin.min && median < bin.max
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(2, barH)}
                rx={3}
                fill={isMedianBin ? 'rgba(34,197,94,0.6)' : 'rgba(34,197,94,0.25)'}
                stroke={isMedianBin ? 'rgba(34,197,94,0.8)' : 'rgba(34,197,94,0.15)'}
                strokeWidth={1}
              />
              {bin.count > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 4}
                  fill="rgba(148,163,184,0.7)"
                  fontSize="9"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  {bin.count}
                </text>
              )}
              {i % 2 === 0 && (
                <text
                  x={x + barW / 2}
                  y={H - 4}
                  fill="rgba(148,163,184,0.4)"
                  fontSize="8"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  +{Math.round(bin.min)}%
                </text>
              )}
            </g>
          )
        })}

        {/* Median line */}
        <line
          x1={medianX}
          y1={padY}
          x2={medianX}
          y2={padY + chartH}
          stroke="rgba(34,197,94,0.5)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
        <text
          x={medianX}
          y={padY - 2}
          fill="rgba(34,197,94,0.8)"
          fontSize="8"
          textAnchor="middle"
          fontFamily="sans-serif"
          fontWeight="bold"
        >
          חציון
        </text>
      </SvgChart>

      <ChartHint>
        💡 תשואה חציונית +{median}% — רוב החלקות מציעות תשואה בטווח +{Math.round(chartData.bins[1]?.min || min)}% עד +{Math.round(chartData.bins[chartData.bins.length - 2]?.max || max)}%
      </ChartHint>
    </ChartPanel>
  )
}

/* ══════════════════════════════════════════════════
   Main Page Component
   ══════════════════════════════════════════════════ */

export default function AreaCity() {
  const { city } = useParams<{ city: string }>()
  const decodedCity = decodeURIComponent(city || '')
  const navigate = useNavigate()

  const { data: overview, isLoading: overviewLoading } = useMarketOverview()
  const { data: plots = [], isLoading: plotsLoading } = useAllPlots({ city: decodedCity })

  const isLoading = overviewLoading || plotsLoading

  // Find city-specific stats from overview
  const cityStats = useMemo((): CityStatsData | null => {
    if (!overview?.cities) return null
    return (overview.cities as unknown as CityStatsData[]).find((c: CityStatsData) => c.city === decodedCity) ?? null
  }, [overview, decodedCity])

  // Other cities for navigation
  const otherCities = useMemo((): CityStatsData[] => {
    if (!overview?.cities) return []
    return (overview.cities as unknown as CityStatsData[]).filter((c: CityStatsData) => c.city !== decodedCity)
  }, [overview, decodedCity])

  // Sort plots by investment score (best first)
  const sortedPlots = useMemo((): Plot[] => {
    if (!plots || plots.length === 0) return []
    return [...(plots as Plot[])]
      .filter((p: Plot) => p.status !== 'SOLD')
      .sort((a: Plot, b: Plot) => calcInvestmentScore(b) - calcInvestmentScore(a))
  }, [plots])

  // Zoning breakdown
  const zoningBreakdown = useMemo((): ZoningBreakdownEntry[] => {
    if (!plots || plots.length === 0) return []
    const counts: Record<string, number> = {}
    ;(plots as Plot[]).forEach((p: Plot) => {
      const z = p.zoning_stage ?? p.zoningStage
      if (z) counts[z] = (counts[z] || 0) + 1
    })
    return Object.entries(counts)
      .map(([key, count]) => ({
        key,
        label: zoningLabels[key as keyof typeof zoningLabels] || key,
        count,
        pct: Math.round((count / plots.length) * 100),
      }))
      .sort((a, b) => b.count - a.count)
  }, [plots])

  // Price distribution
  const priceStats = useMemo((): PriceStatsData | null => {
    if (!plots || plots.length === 0) return null
    const prices = (plots as Plot[]).map((p: Plot) => p.total_price ?? p.totalPrice ?? 0).filter((p: number) => p > 0)
    if (prices.length === 0) return null
    prices.sort((a, b) => a - b)
    const median = prices[Math.floor(prices.length / 2)]
    const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length)
    return { min: prices[0], max: prices[prices.length - 1], median, avg, count: prices.length }
  }, [plots])

  // Dynamic SEO meta
  useMetaTags({
    title: `קרקעות להשקעה ב${decodedCity} — מחירים, תשואות ונתוני שוק | LandMap Israel`,
    description: cityStats
      ? `${cityStats.count} חלקות קרקע להשקעה ב${decodedCity}. מחיר ממוצע: ₪${cityStats.avgPricePerDunam?.toLocaleString()}/דונם. תשואה: +${cityStats.avgRoi}%. נתונים מעודכנים.`
      : `חלקות קרקע להשקעה ב${decodedCity} — מחירים, תשואות ונתוני שוק מעודכנים.`,
    url: `${window.location.origin}/areas/${encodeURIComponent(decodedCity)}`,
  })

  if (isLoading) {
    return (
      <LoadingWrapper dir="rtl">
        <PublicNav />
        <LoadingCenter>
          <StyledSpinner />
        </LoadingCenter>
      </LoadingWrapper>
    )
  }

  // City not found
  if (!cityStats && !plotsLoading) {
    return (
      <LoadingWrapper dir="rtl">
        <PublicNav />
        <NotFoundContent>
          <NotFoundEmoji>🏜️</NotFoundEmoji>
          <NotFoundTitle>
            אזור &quot;{decodedCity}&quot; לא נמצא
          </NotFoundTitle>
          <NotFoundText>
            ייתכן שהאזור הוסר או שהקישור שגוי.
          </NotFoundText>
          <NotFoundActions>
            <AreaLinkButton to="/areas">
              <ArrowRight style={iconSm} />
              כל האזורים
            </AreaLinkButton>
            <MapLinkButton to="/">
              <Map style={iconSm} />
              למפה
            </MapLinkButton>
          </NotFoundActions>
        </NotFoundContent>
        <PublicFooter />
      </LoadingWrapper>
    )
  }

  return (
    <PageWrapper dir="rtl">
      <PublicNav />
      <CityJsonLd city={decodedCity} stats={cityStats} plots={sortedPlots} />

      {/* Background grid */}
      <BackgroundGrid />

      <MainContent>
        <BreadcrumbWrap>
          <Breadcrumb
            items={[
              { label: 'מפה', to: '/' },
              { label: 'סקירת אזורים', to: '/areas' },
              { label: decodedCity },
            ]}
          />
        </BreadcrumbWrap>

        {/* Hero */}
        <HeroSection>
          <HeroRow>
            <HeroIconBox>
              <MapPin style={{ ...iconLg, color: '#C8942A' }} />
            </HeroIconBox>
            <div>
              <HeroTitle>
                <BrandText>
                  קרקעות להשקעה ב{decodedCity}
                </BrandText>
              </HeroTitle>
              <HeroSub>
                {cityStats!.count} חלקות · {cityStats!.available} זמינות · שטח כולל {formatDunam(cityStats!.totalArea)} דונם
              </HeroSub>
            </div>
          </HeroRow>
        </HeroSection>

        {/* Key stats */}
        <StatsGrid>
          <StatCard
            icon={Building2}
            label="חלקות"
            value={cityStats!.count}
            sub={`${cityStats!.available} זמינות`}
            color="gold"
          />
          <StatCard
            icon={DollarSign}
            label="מחיר/דונם"
            value={formatCurrency(cityStats!.avgPricePerDunam)}
            sub="ממוצע"
            color="blue"
          />
          <StatCard
            icon={TrendingUp}
            label="תשואה ממוצעת"
            value={`+${cityStats!.avgRoi}%`}
            color="green"
          />
          <StatCard
            icon={Ruler}
            label="שטח כולל"
            value={`${formatDunam(cityStats!.totalArea)} דונם`}
            color="purple"
          />
          {priceStats && (
            <StatCard
              icon={BarChart3}
              label="מחיר חציוני"
              value={formatPriceShort(priceStats.median)}
              sub={`טווח: ${formatPriceShort(priceStats.min)} — ${formatPriceShort(priceStats.max)}`}
              color="orange"
            />
          )}
        </StatsGrid>

        {/* Zoning breakdown */}
        {zoningBreakdown.length > 0 && (
          <ZoningPanel>
            <ZoningTitle>
              <Shield style={{ ...iconSm, color: '#C8942A' }} />
              שלבי תכנון ב{decodedCity}
            </ZoningTitle>
            <ZoningGrid>
              {zoningBreakdown.map((z: ZoningBreakdownEntry) => (
                <ZoningRow key={z.key}>
                  <ZoningRowLabel>{z.label}</ZoningRowLabel>
                  <ZoningTrack>
                    <ZoningFill $pct={z.pct} />
                  </ZoningTrack>
                  <ZoningRowCount>{z.count} ({z.pct}%)</ZoningRowCount>
                </ZoningRow>
              ))}
            </ZoningGrid>
          </ZoningPanel>
        )}

        {/* Price distribution histogram — like Madlan's area price distribution */}
        <PriceDistributionChart plots={plots as Plot[]} />

        {/* ROI distribution histogram — shows how returns are spread across plots.
            Complements price distribution: price is what you pay, ROI is what you earn.
            Unique to LandMap — neither Madlan nor Yad2 visualize return distribution. */}
        <RoiDistributionChart plots={plots as Plot[]} />

        {/* CTA: View on map */}
        <CtaPanel>
          <CtaFlex>
            <CtaTextWrap>
              <CtaTitle>
                צפה בכל החלקות ב{decodedCity} על המפה
              </CtaTitle>
              <CtaSub>
                מפה אינטראקטיבית עם פילטרים, השוואות ו-AI יועץ
              </CtaSub>
            </CtaTextWrap>
            <CtaButton to={`/?city=${encodeURIComponent(decodedCity)}`}>
              <Map style={iconMd} />
              פתח במפה
              <ArrowLeft style={iconSm} />
            </CtaButton>
          </CtaFlex>
        </CtaPanel>

        {/* Plot listings */}
        {sortedPlots.length > 0 && (
          <PlotSection>
            <PlotSectionHeader>
              <PlotSectionTitle>
                <Zap style={{ ...iconMd, color: '#C8942A' }} />
                חלקות מובילות ב{decodedCity}
              </PlotSectionTitle>
              <PlotSectionSortNote>ממוינות לפי ציון השקעה</PlotSectionSortNote>
            </PlotSectionHeader>
            <PlotGrid>
              {sortedPlots.slice(0, 9).map((p: Plot) => (
                <PlotRow key={p.id} plot={p} />
              ))}
            </PlotGrid>
            {sortedPlots.length > 9 && (
              <MorePlotsCenter>
                <MorePlotsLink to={`/?city=${encodeURIComponent(decodedCity)}`}>
                  עוד {sortedPlots.length - 9} חלקות ב{decodedCity}
                  <ArrowLeft style={iconSm} />
                </MorePlotsLink>
              </MorePlotsCenter>
            )}
          </PlotSection>
        )}

        {/* Sold plots section */}
        {(() => {
          const soldPlots = (plots as Plot[]).filter((p: Plot) => p.status === 'SOLD')
          if (soldPlots.length === 0) return null
          return (
            <SoldSection>
              <SoldTitle>
                🔴 חלקות שנמכרו ({soldPlots.length})
              </SoldTitle>
              <SoldGrid>
                {soldPlots.slice(0, 3).map((p: Plot) => (
                  <PlotRow key={p.id} plot={p} />
                ))}
              </SoldGrid>
            </SoldSection>
          )
        })()}

        {/* Other cities navigation */}
        {otherCities.length > 0 && (
          <OtherCitiesPanel>
            <OtherCitiesTitle>
              אזורים נוספים להשקעה
            </OtherCitiesTitle>
            <OtherCitiesGrid>
              {otherCities.map((c: CityStatsData) => (
                <CityLink
                  key={c.city}
                  to={`/areas/${encodeURIComponent(c.city)}`}
                >
                  <CityLinkLeft>
                    <MapPin style={{ ...iconSm, color: '#C8942A' }} />
                    <div>
                      <CityName>{c.city}</CityName>
                      <CityCount>{c.count} חלקות</CityCount>
                    </div>
                  </CityLinkLeft>
                  <CityLinkRight>
                    <CityRoi>+{c.avgRoi}%</CityRoi>
                    <CityPrice>{formatCurrency(c.avgPricePerDunam)}/דונם</CityPrice>
                  </CityLinkRight>
                </CityLink>
              ))}
            </OtherCitiesGrid>
          </OtherCitiesPanel>
        )}
      </MainContent>

      <BackToTopButton />
      <PublicFooter />
    </PageWrapper>
  )
}
