import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react'
import type { ReactNode, SyntheticEvent } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { media } from '../../styles/theme'
import {
  ArrowRight,
  ArrowUp,
  MapPin,
  TrendingUp,
  Clock,
  Waves,
  TreePine,
  Hospital,
  CheckCircle2,
  DollarSign,
  Hourglass,
  Heart,
  Share2,
  MessageCircle,
  Printer,
  Copy,
  Check,
  GitCompareArrows,
  BarChart,
  ExternalLink,
  Calculator as CalcIcon,
  FileText,
  Download,
  File,
  FileImage,
  FileSpreadsheet,
  Map as MapIcon,
  Flag,
  Navigation,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { usePlot, useNearbyPlots, useSimilarPlots } from '../../hooks/usePlots'
import { useMarketOverview } from '../../hooks/useMarket'
import { useLastVisitPrice } from '../../hooks/useTracking'
import { calcAnnualHoldingCosts, calcExitCosts, calcTransactionCosts } from '../../utils/plot'
import { useFavorites } from '../../hooks/useUserData'
import { useViewTracker } from '../../hooks/useTracking'
import { useLocalStorage } from '../../hooks/useInfra'
import PublicNav from '../../components/PublicNav'
import PublicFooter from '../../components/PublicFooter'
import Spinner from '../../components/ui/Spinner'
import { statusColors, statusLabels, zoningLabels, zoningPipelineStages, roiStages } from '../../utils/constants'
import { formatCurrency, formatDunam, formatPriceShort, formatRelativeTime, getFreshnessColor } from '../../utils/format'
import { calcInvestmentScore, getScoreLabel, calcCAGR, calcInvestmentVerdict, calcDaysOnMarket, calcInvestmentTimeline } from '../../utils/investment'
import { calcCommuteTimes, plotCenter } from '../../utils/geo'
import MiniMap from '../../components/ui/MiniMap'
import Breadcrumb from '../../components/ui/Breadcrumb'
import { plotInquiryLink, plotReportIssueLink, plotTelegramLink } from '../../utils/config'
import ZoningProgressBar from '../../components/ui/ZoningProgressBar'
import { WidgetErrorBoundary } from '../../components/ui/ErrorBoundaries'
import type { Plot, InvestmentTimeline as InvestmentTimelineType, TimelineStage, CommuteTime, InvestmentVerdict as InvestmentVerdictType, TransactionCosts, ExitCosts as ExitCostsType, AnnualHoldingCosts, CAGRResult } from '../../types'

// ─── Lazy-loaded below-fold components ────────────────────────────────
const LeadModal = lazy(() => import('../../components/LeadModal'))
const ShareMenu = lazy(() => import('../../components/ui/ShareMenu'))
const ImageLightbox = lazy(() => import('../../components/ui/ImageLightbox'))
const NeighborhoodRadar = lazy(() => import('../../components/ui/NeighborhoodRadar'))
const PriceTrendChart = lazy(() => import('../../components/ui/PriceTrendChart'))
const InvestmentBenchmark = lazy(() => import('../../components/ui/InvestmentBenchmark'))
const InvestmentProjection = lazy(() => import('../../components/ui/InvestmentProjection'))
const DueDiligenceChecklist = lazy(() => import('../../components/ui/DueDiligenceChecklist'))
const MobilePlotActionBar = lazy(() => import('../../components/ui/MobilePlotActionBar'))
const QuickInquiryTemplates = lazy(() => import('../../components/ui/QuickInquiryTemplates'))
const BackToTopButton = lazy(() => import('../../components/ui/BackToTopButton'))
const DataDisclaimer = lazy(() => import('../../components/DataDisclaimer'))

// Eagerly imported — tiny component, used in the header area above the fold
import DataCompletenessBar from '../../components/ui/DataCompletenessBar'
import { useThemeColor, themeColors } from '../../hooks/useSEO'

// ─── Eager preloading of below-fold chunks ────────────────────────────
const chunkPreloaders = [
  () => import('../../components/ui/PriceTrendChart'),
  () => import('../../components/ui/InvestmentProjection'),
  () => import('../../components/ui/NeighborhoodRadar'),
  () => import('../../components/ui/InvestmentBenchmark'),
  () => import('../../components/ui/DueDiligenceChecklist'),
  () => import('../../components/ui/ShareMenu'),
  () => import('../../components/LeadModal'),
]
let _chunksPreloaded = false
function preloadPlotDetailChunks(): void {
  if (_chunksPreloaded) return
  _chunksPreloaded = true
  const schedule = typeof requestIdleCallback === 'function'
    ? requestIdleCallback
    : (fn: () => void) => setTimeout(fn, 200)
  schedule(() => {
    chunkPreloaders.forEach(loader => loader().catch(() => {}))
  })
}

// ─── Keyframes ────────────────────────────────────────────────────────
const pulseAnim = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`

const spinAnim = keyframes`
  to { transform: rotate(360deg); }
`

const fadeInAnim = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`

const bounceInAnim = keyframes`
  0%   { transform: scale(0.9); opacity: 0; }
  60%  { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
`

// ─── Styled Components ────────────────────────────────────────────────

// ── Page wrappers ──
const PageWrap = styled.div`
  min-height: 100vh;
  width: 100%;
  background: ${({ theme }) => theme.colors.navy};
  direction: rtl;
`

const BackgroundGrid = styled.div`
  position: fixed;
  inset: 0;
  opacity: 0.05;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(200,148,42,0.3) 1px, transparent 1px),
    linear-gradient(90deg, rgba(200,148,42,0.3) 1px, transparent 1px);
  background-size: 40px 40px;
`

const ContentZone = styled.div`
  position: relative;
  z-index: 10;
  padding-top: 80px;
  padding-bottom: 112px;
`

const MaxWidth = styled.div`
  max-width: 896px;
  margin: 0 auto;
  padding-left: 16px;
  padding-right: 16px;
  ${media.sm} {
    padding-left: 24px;
    padding-right: 24px;
  }
`

// ── Section skeleton ──
const SkeletonWrap = styled.div<{ $height?: string }>`
  height: ${({ $height }) => $height || '128px'};
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  animation: ${pulseAnim} 2s ease-in-out infinite;
  position: relative;
  overflow: hidden;
`

const SkeletonSpinner = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`

const SpinnerCircle = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid rgba(200, 148, 42, 0.3);
  border-top-color: ${({ theme }) => theme.colors.gold};
  animation: ${spinAnim} 0.8s linear infinite;
`

// ── PlotCard styles ──
const PlotCardLink = styled(Link)`
  display: block;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 16px;
  transition: all 0.2s ease;
  text-decoration: none;

  &:hover {
    border-color: rgba(200, 148, 42, 0.2);
  }
`

const PlotCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`

const StatusBar = styled.div<{ $color: string }>`
  width: 6px;
  height: 32px;
  border-radius: 9999px;
  flex-shrink: 0;
  background: ${({ $color }) => $color};
`

const PlotCardTitle = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.slate[200]};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const PlotCardSubtitle = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.slate[500]};
`

const DistanceSpan = styled.span`
  color: ${({ theme }) => theme.colors.blue[400]};
`

const MatchReasonTag = styled.span`
  font-size: 9px;
  color: rgba(200, 148, 42, 0.7);
  background: rgba(200, 148, 42, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
`

const PlotCardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
`

const PlotCardPrice = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.gold};
`

const PlotCardRoi = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.emerald[400]};
`

const MiniProgressTrack = styled.div`
  margin-top: 8px;
  height: 4px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

// ── Similar/Nearby section ──
const SimilarWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
  margin-bottom: 32px;
`

const SimilarHeading = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`

const SimilarGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  ${media.sm} { grid-template-columns: repeat(2, 1fr); }
  ${media.lg} { grid-template-columns: repeat(4, 1fr); }
`

const IconBadge = styled.span<{ $bg: string }>`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: ${({ $bg }) => $bg};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
`

const SubLabel = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.slate[500]};
  font-weight: 400;
`

// ── SectionNav ──
const SectionNavFixed = styled.div<{ $visible: boolean }>`
  position: fixed;
  top: 68px;
  left: 0;
  right: 0;
  z-index: 54;
  transition: all 0.3s ease;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transform: translateY(${({ $visible }) => ($visible ? '0' : '-8px')});
  will-change: transform, opacity;
`

const SectionNavBar = styled.div`
  background: rgba(10, 22, 40, 0.85);
  backdrop-filter: blur(24px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`

const SectionNavInner = styled.div`
  max-width: 896px;
  margin: 0 auto;
  padding: 0 16px;
  ${media.sm} { padding: 0 24px; }
`

const SectionNavScroll = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 0;
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`

const SectionNavBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.2s ease;
  cursor: pointer;

  ${({ $active, theme }) =>
    $active
      ? css`
          background: rgba(200, 148, 42, 0.15);
          color: ${theme.colors.gold};
          border: 1px solid rgba(200, 148, 42, 0.25);
          box-shadow: 0 1px 2px rgba(200, 148, 42, 0.1);
        `
      : css`
          background: rgba(255, 255, 255, 0.02);
          color: ${theme.colors.slate[500]};
          border: 1px solid transparent;
          &:hover {
            background: rgba(255, 255, 255, 0.05);
            color: ${theme.colors.slate[300]};
          }
        `}
`

// ── StickyPlotInfoBar ──
const StickyBarOuter = styled.div<{ $visible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 56;
  transition: all 0.3s ease;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transform: translateY(${({ $visible }) => ($visible ? '0' : '-100%')});
  pointer-events: ${({ $visible }) => ($visible ? 'auto' : 'none')};
  will-change: transform, opacity;
  direction: rtl;
`

const StickyBarInner = styled.div`
  background: rgba(10, 22, 40, 0.92);
  backdrop-filter: blur(24px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
`

const StickyBarContent = styled.div`
  max-width: 896px;
  margin: 0 auto;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  ${media.sm} { padding: 8px 24px; }
`

const StickyBarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`

const StickyBarCenter = styled.div`
  display: none;
  align-items: center;
  gap: 12px;
  ${media.sm} { display: flex; }
`

const StickyBarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`

const StickyBarTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const StickyBarCity = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[500]};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const StickyPrice = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.gold};
`

const RoiBadge = styled.span<{ $tier: 'high' | 'mid' | 'low' }>`
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  ${({ $tier, theme }) =>
    $tier === 'high'
      ? css`
          background: rgba(16, 185, 129, 0.15);
          color: ${theme.colors.emerald[400]};
          border: 1px solid rgba(16, 185, 129, 0.2);
        `
      : $tier === 'mid'
        ? css`
            background: rgba(200, 148, 42, 0.15);
            color: ${theme.colors.gold};
            border: 1px solid rgba(200, 148, 42, 0.2);
          `
        : css`
            background: rgba(255, 255, 255, 0.05);
            color: ${theme.colors.slate[400]};
            border: 1px solid rgba(255, 255, 255, 0.1);
          `}
`

const StatusPill = styled.span<{ $color: string }>`
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 500;
  background: ${({ $color }) => `${$color}12`};
  border: 1px solid ${({ $color }) => `${$color}25`};
  color: ${({ $color }) => $color};
`

const MapLinkBtn = styled(Link)`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(200, 148, 42, 0.15);
  border: 1px solid rgba(200, 148, 42, 0.25);
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.gold};
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.2s ease;
  &:hover { background: rgba(200, 148, 42, 0.25); }
`

const WhatsAppBtn = styled.a`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #25D366;
  border-radius: 8px;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.2s ease;
  &:hover { background: #20BD5A; }
`

const HiddenSmInline = styled.span`
  display: none;
  ${media.sm} { display: inline; }
`

// ── Reading progress bar ──
const ProgressBarTrack = styled.div`
  position: fixed;
  top: 64px;
  left: 0;
  right: 0;
  z-index: 55;
  height: 2px;
  background: rgba(255, 255, 255, 0.05);
`

const ProgressBarFill = styled.div<{ $progress: number }>`
  height: 100%;
  transform-origin: left;
  will-change: transform;
  transform: scaleX(${({ $progress }) => $progress});
  background: linear-gradient(90deg, #C8942A, #E5B84B, #C8942A);
  box-shadow: ${({ $progress }) => ($progress > 0.5 ? '0 0 6px rgba(200, 148, 42, 0.35)' : 'none')};
  transition: box-shadow 0.3s ease;
`

// ── Mortgage calculator ──
const CalcPanel = styled.div`
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
`

const CalcHeadingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`

const CalcHeading = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
`

const CalcStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const SliderLabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.slate[400]};
  margin-bottom: 4px;
`

const GoldVal = styled.span`
  color: ${({ theme }) => theme.colors.gold};
  font-weight: 500;
`

const SlateVal = styled.span`
  color: ${({ theme }) => theme.colors.slate[300]};
  font-weight: 500;
`

const RangeInput = styled.input`
  width: 100%;
  height: 6px;
  border-radius: 9999px;
  appearance: none;
  background: rgba(255, 255, 255, 0.1);
  accent-color: ${({ theme }) => theme.colors.gold};
  cursor: pointer;
`

const CalcResults = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`

const CalcResultCell = styled.div`
  text-align: center;
`

const CalcResultLabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.slate[500]};
`

const CalcResultValue = styled.div<{ $color?: string }>`
  font-size: 14px;
  font-weight: 700;
  color: ${({ $color, theme }) => $color || theme.colors.gold};
`

// ── Loading skeleton page ──
const SkeletonBar = styled.div<{ $w?: string; $h?: string; $delay?: string }>`
  height: ${({ $h }) => $h || '12px'};
  width: ${({ $w }) => $w || '100%'};
  border-radius: 4px;
  background: rgba(51, 65, 85, 0.5);
  animation: ${pulseAnim} 2s ease-in-out infinite;
  ${({ $delay }) => $delay && `animation-delay: ${$delay};`}
`

const SkeletonBox = styled.div<{ $h?: string; $delay?: string }>`
  height: ${({ $h }) => $h || '128px'};
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  animation: ${pulseAnim} 2s ease-in-out infinite;
  ${({ $delay }) => $delay && `animation-delay: ${$delay};`}
`

const SkeletonGrid3 = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 32px;
`

const SkeletonCardWrap = styled.div<{ $bgColor: string; $delay?: string }>`
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: ${({ $bgColor }) => $bgColor};
  border: 1px solid rgba(255, 255, 255, 0.05);
  animation: ${pulseAnim} 2s ease-in-out infinite;
  ${({ $delay }) => $delay && `animation-delay: ${$delay};`}
`

const SkeletonTwoCols = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-bottom: 32px;
  ${media.lg} { grid-template-columns: repeat(2, 1fr); }
`

// ── Error page ──
const ErrorWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  padding: 0 16px;
`

const ErrorContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  max-width: 448px;
  text-align: center;
`

const ErrorIconBox = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
`

const ErrorTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
`

const ErrorDesc = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.slate[400]};
  line-height: 1.6;
  max-width: 320px;
`

const ErrorActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px;
`

const RetryBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: linear-gradient(to right, ${({ theme }) => theme.colors.gold}, ${({ theme }) => theme.colors.goldBright});
  color: ${({ theme }) => theme.colors.navy};
  font-weight: 700;
  font-size: 14px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    box-shadow: 0 4px 20px rgba(200, 148, 42, 0.3);
  }
`

const GhostBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: ${({ theme }) => theme.colors.slate[300]};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
`

const SearchMapLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(200, 148, 42, 0.1);
  border: 1px solid rgba(200, 148, 42, 0.2);
  border-radius: 12px;
  color: ${({ theme }) => theme.colors.gold};
  font-size: 14px;
  text-decoration: none;
  transition: all 0.2s ease;
  &:hover { background: rgba(200, 148, 42, 0.15); }
`

const PlotIdHint = styled.p`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[600]};
  margin-top: 8px;
`

// ── Hero header ──
const HeroRow = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 32px;
  ${media.sm} { flex-direction: row; }
`

const HeroTitle = styled.h1`
  font-size: 30px;
  font-weight: 900;
  margin-bottom: 12px;
  color: ${({ theme }) => theme.colors.slate[100]};
  ${media.sm} { font-size: 36px; }
`

const GoldGradient = styled.span`
  background: linear-gradient(to right, ${({ theme }) => theme.colors.gold}, ${({ theme }) => theme.colors.goldBright});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

const BadgesRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const CityLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.slate[400]};
`

const InfoChip = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.slate[400]};
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 10px;
  border-radius: 8px;
`

const InfoChipLight = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.slate[300]};
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 10px;
  border-radius: 8px;
`

const ZoningChip = styled.span`
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 10px;
  border-radius: 8px;
`

const StatusBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  background: ${({ $color }) => `${$color}14`};
  border: 1px solid ${({ $color }) => `${$color}35`};
  color: ${({ $color }) => $color};
`

const StatusDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  animation: ${pulseAnim} 2s ease-in-out infinite;
`

const FreshnessBadge = styled.span<{ $colorClass: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.05);
  /* Color is set inline via style prop due to dynamic class mapping */
`

const ViewsBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  color: #a5b4fc;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
`

const RankBadge = styled.span<{ $tier: 'top' | 'upper' | 'normal' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  ${({ $tier, theme }) =>
    $tier === 'top'
      ? css`
          color: ${theme.colors.gold};
          background: rgba(200, 148, 42, 0.1);
          border: 1px solid rgba(200, 148, 42, 0.25);
        `
      : $tier === 'upper'
        ? css`
            color: ${theme.colors.emerald[400]};
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
          `
        : css`
            color: ${theme.colors.slate[400]};
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
          `}
`

const NetRoiBadge = styled.span<{ $tier: 'excellent' | 'good' | 'ok' | 'negative' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 700;
  ${({ $tier, theme }) =>
    $tier === 'excellent'
      ? css`
          color: ${theme.colors.emerald[400]};
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
        `
      : $tier === 'good'
        ? css`
            color: ${theme.colors.gold};
            background: rgba(200, 148, 42, 0.1);
            border: 1px solid rgba(200, 148, 42, 0.2);
          `
        : $tier === 'ok'
          ? css`
              color: ${theme.colors.amber[400]};
              background: rgba(245, 158, 11, 0.1);
              border: 1px solid rgba(245, 158, 11, 0.2);
            `
          : css`
              color: ${theme.colors.red[400]};
              background: rgba(239, 68, 68, 0.1);
              border: 1px solid rgba(239, 68, 68, 0.2);
            `}
`

const DomBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  background: ${({ $color }) => `${$color}10`};
  border: 1px solid ${({ $color }) => `${$color}20`};
  color: ${({ $color }) => $color};
`

const PriceChangeBadge = styled.span<{ $direction: 'down' | 'up' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  animation: ${bounceInAnim} 0.4s ease;
  ${({ $direction, theme }) =>
    $direction === 'down'
      ? css`
          color: ${theme.colors.emerald[400]};
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
        `
      : css`
          color: ${theme.colors.orange[400]};
          background: rgba(249, 115, 22, 0.1);
          border: 1px solid rgba(249, 115, 22, 0.2);
        `}
`

const StickyRankBadge = styled.span`
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  background: rgba(200, 148, 42, 0.1);
  color: ${({ theme }) => theme.colors.gold};
  border: 1px solid rgba(200, 148, 42, 0.2);
`

// ── Hero actions ──
const HeroActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`

const ShowOnMapBtn = styled(Link)`
  height: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  border-radius: 12px;
  background: rgba(200, 148, 42, 0.1);
  border: 1px solid rgba(200, 148, 42, 0.25);
  color: ${({ theme }) => theme.colors.gold};
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.2s ease;
  &:hover {
    background: rgba(200, 148, 42, 0.2);
    border-color: rgba(200, 148, 42, 0.35);
  }
`

const SmHiddenSpan = styled.span`
  display: none;
  ${media.sm} { display: inline; }
`

const SmVisibleSpan = styled.span`
  ${media.sm} { display: none; }
`

const FavBtn = styled.button<{ $active: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  cursor: pointer;
  ${({ $active }) =>
    $active
      ? css`
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.3);
        `
      : css`
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
          &:hover { background: rgba(255, 255, 255, 0.1); }
        `}
`

const ShareSkeleton = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: ${pulseAnim} 2s ease-in-out infinite;
`

// ── Image gallery ──
const ImageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 32px;
  ${media.sm} { grid-template-columns: repeat(3, 1fr); }
`

const ImageBtn = styled.button<{ $isFirst: boolean }>`
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
  position: relative;
  cursor: pointer;
  background: none;
  padding: 0;
  ${({ $isFirst }) =>
    $isFirst &&
    css`
      grid-column: span 2;
      grid-row: span 2;
    `}
  &:hover {
    border-color: rgba(200, 148, 42, 0.4);
  }
`

const PlotImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.5s ease;
  &:hover { transform: scale(1.05); }
`

const ImagePlaceholder = styled.div`
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.6), rgba(200, 148, 42, 0.05));
`

const ImageCountOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 18px;
`

// ── Data completeness ──
const DataBarWrap = styled.div`
  margin-bottom: 24px;
`

const ReportRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 8px;
`

const ReportLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.slate[500]};
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.2s ease;
  &:hover {
    color: ${({ theme }) => theme.colors.orange[400]};
    border-color: rgba(251, 146, 60, 0.2);
    background: rgba(251, 146, 60, 0.05);
  }
`

// ── Location section ──
const LocationSection = styled.div`
  margin-bottom: 32px;
`

const LocationHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`

const LocationTitle = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
  display: flex;
  align-items: center;
  gap: 8px;
`

const ExternalLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const ExtLink = styled.a`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.slate[400]};
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.2s ease;
  &:hover {
    color: ${({ theme }) => theme.colors.gold};
    border-color: rgba(200, 148, 42, 0.2);
    background: rgba(200, 148, 42, 0.05);
  }
`

const WazeLink = styled(ExtLink)`
  &:hover {
    color: #33CCFF;
    border-color: rgba(51, 204, 255, 0.2);
    background: rgba(51, 204, 255, 0.05);
  }
`

// ── Verdict banner ──
const VerdictBanner = styled.div<{ $tier: string }>`
  display: flex;
  align-items: center;
  gap: 16px;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 24px;
  border: 1px solid;
  ${({ $tier }) =>
    $tier === 'hot'
      ? css`background: rgba(249, 115, 22, 0.1); border-color: rgba(249, 115, 22, 0.2);`
      : $tier === 'excellent'
        ? css`background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2);`
        : $tier === 'good'
          ? css`background: rgba(132, 204, 22, 0.1); border-color: rgba(132, 204, 22, 0.2);`
          : $tier === 'fair'
            ? css`background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.2);`
            : css`background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2);`}
`

const VerdictIcon = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 20px;
  background: ${({ $color }) => `${$color}18`};
`

const VerdictLabel = styled.div<{ $color: string }>`
  font-size: 16px;
  font-weight: 700;
  color: ${({ $color }) => $color};
`

const VerdictDesc = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.slate[400]};
`

// ── Price comparison (below/above market) ──
const PriceIndicatorBanner = styled.div<{ $isBelow: boolean }>`
  display: flex;
  align-items: center;
  gap: 16px;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 24px;
  border: 1px solid;
  ${({ $isBelow }) =>
    $isBelow
      ? css`background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.15);`
      : css`background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.15);`}
`

const PriceIndicatorIcon = styled.div<{ $isBelow: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 18px;
  ${({ $isBelow }) =>
    $isBelow
      ? css`background: rgba(16, 185, 129, 0.15);`
      : css`background: rgba(245, 158, 11, 0.15);`}
`

const PriceIndicatorTitle = styled.div<{ $isBelow: boolean }>`
  font-size: 14px;
  font-weight: 700;
  ${({ $isBelow, theme }) =>
    $isBelow
      ? css`color: ${theme.colors.emerald[400]};`
      : css`color: ${theme.colors.amber[400]};`}
`

const PriceIndicatorSub = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.slate[500]};
`

// ── Price per sqm comparison ──
const ComparePanel = styled.div`
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
`

const CompareHeading = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`

const CompareTitle = styled.h2`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[200]};
`

const CompareStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const CompareRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 4px;
`

const CompareLabel = styled.span`
  color: ${({ theme }) => theme.colors.slate[400]};
`

const CompareBarTrack = styled.div`
  height: 12px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

const CompareNote = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[600]};
  margin-top: 8px;
`

// ── Investment Narrative ──
const NarrativePanel = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
`

const NarrativeHeading = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`

const NarrativeIconBox = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(200, 148, 42, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
`

const NarrativeTitle = styled.h2`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[200]};
`

const NarrativeText = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.slate[300]};
  line-height: 1.6;
`

const NarrativeSecondary = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.slate[400]};
  line-height: 1.6;
  margin-top: 8px;
`

const NarrativeDesc = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.slate[400]};
  line-height: 1.6;
  margin-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 8px;
`

// ── Financial cards ──
const FinancialGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 32px;
  ${media.sm} { grid-template-columns: repeat(4, 1fr); }
`

const FinancialCard = styled.div<{ $gradientFrom: string; $gradientTo: string; $borderColor: string }>`
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(to bottom, ${({ $gradientFrom }) => $gradientFrom}, ${({ $gradientTo }) => $gradientTo});
  border: 1px solid ${({ $borderColor }) => $borderColor};
`

const CardTopBar = styled.div<{ $gradient: string }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: ${({ $gradient }) => $gradient};
`

const CardLabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.slate[400]};
`

const CardValue = styled.div<{ $color: string }>`
  font-size: 20px;
  font-weight: 700;
  color: ${({ $color }) => $color};
  ${media.sm} { font-size: 24px; }
`

const CardSub = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.slate[500]};
`

const NetRoiSub = styled.div`
  font-size: 12px;
`

const NetRoiLabel = styled.span`
  color: ${({ theme }) => theme.colors.slate[500]};
`

const NetRoiValue = styled.span<{ $tier: string }>`
  font-weight: 700;
  ${({ $tier, theme }) =>
    $tier === 'excellent'
      ? css`color: ${theme.colors.emerald[400]};`
      : $tier === 'good'
        ? css`color: rgba(200, 148, 42, 0.8);`
        : $tier === 'ok'
          ? css`color: ${theme.colors.amber[400]};`
          : css`color: ${theme.colors.red[400]};`}
`

// ── Calculator CTA ──
const CalcCTA = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
  padding: 12px 20px;
  background: linear-gradient(to right, rgba(124, 58, 237, 0.15), rgba(99, 102, 241, 0.15));
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
  color: #c4b5fd;
  text-decoration: none;
  transition: all 0.2s ease;
  &:hover {
    border-color: rgba(139, 92, 246, 0.4);
    background: linear-gradient(to right, rgba(124, 58, 237, 0.2), rgba(99, 102, 241, 0.2));
  }
`

// ── Plot detail section (replaces .plot-detail-section) ──
const DetailSection = styled.div`
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
`

// ── Timeline ──
const TimelineWrap = styled(DetailSection)`
  margin-bottom: 32px;
`

const TimelineHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`

const TimelineHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const TimelineIconBox = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
`

const TimelineTitle = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
`

const TimelineSubtitle = styled.p`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[500]};
`

const TimelineHeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const TimelineRemaining = styled.div`
  text-align: left;
`

const TimelineRemainingLabel = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[500]};
`

const TimelineRemainingValue = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #818CF8;
`

const TimelineProgressBig = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2));
  border: 1px solid rgba(99, 102, 241, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`

const TimelineProgressPct = styled.span`
  font-size: 18px;
  font-weight: 900;
  color: #818CF8;
`

const TimelineProgressLabel = styled.span`
  font-size: 8px;
  color: ${({ theme }) => theme.colors.slate[500]};
`

const TimelineBarTrack = styled.div`
  height: 10px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
  position: relative;
  margin-bottom: 24px;
`

const TimelineMilestones = styled.div`
  position: relative;
`

const TimelineConnector = styled.div`
  position: absolute;
  right: 15px;
  top: 16px;
  bottom: 16px;
  width: 1px;
  background: linear-gradient(to bottom, rgba(99, 102, 241, 0.3), rgba(200, 148, 42, 0.2), rgba(16, 185, 129, 0.3));
`

const TimelineStageRow = styled.div<{ $isCurrent: boolean; $isFuture: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 4px;
  transition: all 0.2s ease;
  ${({ $isCurrent }) => $isCurrent && css`
    background: rgba(200, 148, 42, 0.05);
    margin: 0 -8px;
    padding: 10px 12px;
    border-radius: 12px;
  `}
  ${({ $isFuture }) => $isFuture && css`opacity: 0.4;`}
`

const StageDot = styled.div<{ $status: 'completed' | 'current' | 'future' }>`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 10;
  border: 2px solid;
  transition: all 0.2s ease;
  ${({ $status, theme }) =>
    $status === 'completed'
      ? css`
          background: rgba(16, 185, 129, 0.2);
          border-color: rgba(16, 185, 129, 0.4);
        `
      : $status === 'current'
        ? css`
            background: rgba(200, 148, 42, 0.2);
            border-color: rgba(200, 148, 42, 0.5);
            box-shadow: 0 4px 6px rgba(200, 148, 42, 0.2);
            transform: scale(1.1);
          `
        : css`
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.1);
          `}
`

const StageLabel = styled.span<{ $status: 'completed' | 'current' | 'future' }>`
  font-size: 14px;
  font-weight: ${({ $status }) => ($status === 'current' ? 700 : 500)};
  ${({ $status, theme }) =>
    $status === 'completed'
      ? css`color: rgba(52, 211, 153, 0.8);`
      : $status === 'current'
        ? css`color: ${theme.colors.gold};`
        : css`color: ${theme.colors.slate[500]};`}
`

const CurrentPill = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.colors.gold};
  background: rgba(200, 148, 42, 0.1);
  padding: 2px 8px;
  border-radius: 9999px;
  font-weight: 700;
  animation: ${pulseAnim} 2s ease-in-out infinite;
`

const CompletedCheck = styled.span`
  font-size: 9px;
  color: rgba(52, 211, 153, 0.6);
`

const StageDuration = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[600]};
`

const TimelineEstimate = styled.div`
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 12px;
  padding: 12px 16px;
`

const TimelineEstimateIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(99, 102, 241, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
`

const TimelineEstimateLabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.slate[400]};
`

const TimelineEstimateValue = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #a5b4fc;
`

const Disclaimer = styled.p`
  font-size: 9px;
  color: ${({ theme }) => theme.colors.slate[600]};
  margin-top: 12px;
`

// ── Two-column layout ──
const TwoColGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-bottom: 32px;
  ${media.lg} { grid-template-columns: repeat(2, 1fr); }
`

const ColStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

// ── Generic panel ──
const Panel = styled.div`
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
`

const PanelTitle = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
  margin-bottom: 12px;
`

const PanelText = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.slate[300]};
  line-height: 1.6;
`

// ── Nearby development ──
const NearbyDevPanel = styled.div`
  background: linear-gradient(to right, rgba(16, 185, 129, 0.05), rgba(16, 185, 129, 0.1));
  border: 1px solid rgba(16, 185, 129, 0.15);
  border-radius: 16px;
  padding: 20px;
`

const NearbyDevHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`

const NearbyDevIconBox = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
`

// ── ROI Stages ──
const RoiStageRow = styled.div<{ $isCurrent: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-radius: 8px;
  ${({ $isCurrent }) =>
    $isCurrent &&
    css`
      background: rgba(200, 148, 42, 0.05);
      margin: 0 -4px;
      padding: 6px 4px;
    `}
`

const RoiStageLabel = styled.span<{ $status: 'current' | 'past' | 'future' }>`
  font-size: 12px;
  line-height: 1.2;
  width: 100px;
  flex-shrink: 0;
  ${({ $status, theme }) =>
    $status === 'current'
      ? css`color: ${theme.colors.gold}; font-weight: 700;`
      : $status === 'past'
        ? css`color: rgba(74, 222, 128, 0.7);`
        : css`color: ${theme.colors.slate[500]};`}
`

const RoiBarTrack = styled.div`
  flex: 1;
  height: 10px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

const RoiPriceLabel = styled.span<{ $status: 'current' | 'past' | 'future' }>`
  font-size: 10px;
  width: 64px;
  text-align: left;
  flex-shrink: 0;
  ${({ $status, theme }) =>
    $status === 'current'
      ? css`color: ${theme.colors.gold}; font-weight: 700;`
      : $status === 'past'
        ? css`color: rgba(74, 222, 128, 0.7);`
        : css`color: ${theme.colors.slate[500]};`}
`

// ── Documents ──
const DocRow = styled.a`
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px 16px;
  text-decoration: none;
  transition: all 0.2s ease;
  &:hover {
    border-color: rgba(200, 148, 42, 0.2);
    background: rgba(200, 148, 42, 0.05);
  }
`

const DocRowStatic = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px 16px;
`

const DocName = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.slate[300]};
  transition: color 0.2s ease;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const DocType = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[600]};
  margin-top: 2px;
`

const DocsCountPill = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[500]};
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 8px;
  border-radius: 9999px;
`

// ── Proximity chips ──
const ProximityChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`

const ProximityChip = styled.div<{ $borderColor: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid ${({ $borderColor }) => $borderColor};
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.slate[300]};
`

// ── Commute times ──
const CommutePanel = styled(Panel)``

const CommuteHeading = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`

const CommuteGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  ${media.sm} { grid-template-columns: repeat(3, 1fr); }
`

const CommuteCard = styled.a`
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 10px 12px;
  text-decoration: none;
  transition: all 0.2s ease;
  &:hover {
    border-color: rgba(99, 102, 241, 0.2);
    background: rgba(99, 102, 241, 0.05);
  }
`

const CommuteCityName = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.slate[300]};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CommuteDuration = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[500]};
`

// ── Zoning pipeline ──
const ZoningRow = styled.div<{ $isCurrent: boolean; $isFuture: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  ${({ $isFuture }) => $isFuture && css`opacity: 0.4;`}
  ${({ $isCurrent }) =>
    $isCurrent &&
    css`
      background: rgba(200, 148, 42, 0.05);
      margin: 0 -8px;
      padding: 8px;
      border-radius: 12px;
    `}
`

const ReadinessBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  background: rgba(200, 148, 42, 0.05);
  border: 1px solid rgba(200, 148, 42, 0.2);
  border-radius: 12px;
  padding: 10px 16px;
`

// ── Costs section ──
const CostCategoryLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[400]};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
`

const CostDot = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`

const CostRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 14px;
`

const CostLabel = styled.span`
  color: ${({ theme }) => theme.colors.slate[400]};
`

const CostValue = styled.span`
  color: ${({ theme }) => theme.colors.slate[300]};
`

const CostTotal = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 500;
  padding-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`

const CostTotalLabel = styled.span`
  color: ${({ theme }) => theme.colors.slate[300]};
`

const CostPerYear = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[500]};
`

const NetResultBox = styled.div<{ $positive: boolean }>`
  border-radius: 12px;
  padding: 16px;
  border: 1px solid;
  ${({ $positive }) =>
    $positive
      ? css`background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.15);`
      : css`background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.15);`}
`

const NetResultHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`

const NetResultLabel = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[200]};
`

const NetResultValue = styled.span<{ $positive: boolean }>`
  font-size: 18px;
  font-weight: 900;
  color: ${({ $positive, theme }) => ($positive ? theme.colors.emerald[400] : theme.colors.red[400])};
`

const NetResultSubRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
`

const CostBreakdownBar = styled.div`
  margin-top: 12px;
  height: 8px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
  display: flex;
`

const CostBreakdownLegend = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 9px;
  color: ${({ theme }) => theme.colors.slate[600]};
`

// ── Sticky CTA bar ──
const StickyCTA = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 40;
  background: rgba(10, 22, 40, 0.9);
  backdrop-filter: blur(24px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 12px 16px;
`

const StickyCtaInner = styled.div`
  max-width: 896px;
  margin: 0 auto;
  display: flex;
  gap: 8px;
`

const MainCtaBtn = styled.button`
  flex: 1;
  padding: 14px 0;
  background: linear-gradient(to right, ${({ theme }) => theme.colors.gold}, ${({ theme }) => theme.colors.goldBright}, ${({ theme }) => theme.colors.gold});
  border-radius: 16px;
  color: ${({ theme }) => theme.colors.navy};
  font-weight: 800;
  font-size: 16px;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(200, 148, 42, 0.3);
  transition: all 0.2s ease;
  &:hover { box-shadow: 0 10px 15px rgba(200, 148, 42, 0.3); }
`

const WACTABtn = styled.a`
  width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #25D366;
  border-radius: 16px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 6px rgba(37, 211, 102, 0.2);
  text-decoration: none;
  ${media.sm} { width: 56px; }
  &:hover { background: #20BD5A; }
`

const TelegramCTABtn = styled.a`
  display: none;
  width: 56px;
  align-items: center;
  justify-content: center;
  background: #229ED9;
  border-radius: 16px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 6px rgba(34, 158, 217, 0.2);
  text-decoration: none;
  ${media.sm} { display: flex; }
  &:hover { background: #1A8BC7; }
`

const IconCTABtn = styled.button<{ $active?: boolean; $activeColor?: string; $activeBorder?: string }>`
  width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  transition: all 0.2s ease;
  cursor: pointer;
  ${media.sm} { width: 56px; }
  ${({ $active, $activeColor, $activeBorder }) =>
    $active
      ? css`
          background: ${$activeColor || 'rgba(139, 92, 246, 0.3)'};
          border: 1px solid ${$activeBorder || 'rgba(139, 92, 246, 0.5)'};
        `
      : css`
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          &:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(200, 148, 42, 0.2);
          }
        `}
`

const HiddenSmFlex = styled(IconCTABtn)`
  display: none;
  ${media.sm} { display: flex; }
`

const CompareIndicator = styled.div`
  max-width: 896px;
  margin: 8px auto 0;
`

const CompareIndicatorLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  background: rgba(124, 58, 237, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 12px;
  color: #c4b5fd;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.2s ease;
  &:hover { background: rgba(124, 58, 237, 0.3); }
`

// ── Floating buttons ──
const FloatingBtns = styled.div`
  position: fixed;
  bottom: 80px;
  right: 16px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 8px;
  animation: ${fadeInAnim} 0.3s ease;
`

const FloatingBtn = styled.button<{ $bg: string; $borderColor: string }>`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: ${({ $bg }) => $bg};
  border: 1px solid ${({ $borderColor }) => $borderColor};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(4px);
  &:hover {
    opacity: 0.9;
  }
`

// ── Quick inquiry / disclaimer wraps ──
const QuickInquiryWrap = styled.div`
  max-width: 896px;
  margin: 24px auto 80px;
  padding: 0 16px;
  ${media.sm} { padding: 0 24px; }
`

const DisclaimerWrap = styled.div`
  max-width: 896px;
  margin: 0 auto;
  padding: 0 16px 32px;
`

// ── Map skeleton ──
const MapSkeleton = styled.div`
  height: 280px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  animation: ${pulseAnim} 2s ease-in-out infinite;
  position: relative;
  overflow: hidden;
  margin-bottom: 32px;
`

const MapGridOverlay = styled.div`
  position: absolute;
  inset: 0;
  opacity: 0.03;
  background-image:
    linear-gradient(rgba(200,148,42,0.3) 1px, transparent 1px),
    linear-gradient(90deg, rgba(200,148,42,0.3) 1px, transparent 1px);
  background-size: 40px 40px;
`

const MapCenter = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`

// ─── Interfaces ───────────────────────────────────────────────────────

interface SectionSkeletonProps {
  height?: string
}

interface PlotCardProps {
  p: Plot
}

interface SimilarPlotsSectionProps {
  plotId: string
  onNearbyLoaded?: (plots: Plot[]) => void
}

interface StickyPlotInfoBarProps {
  plot: Plot
  computed: ComputedPlot | null
}

interface MortgageCalcSectionProps {
  totalPrice: number
}

interface ComputedPlot {
  totalPrice: number
  projectedValue: number
  sizeSqM: number
  blockNumber: string
  roi: number
  pricePerDunam: string
  readiness: string | undefined
  zoningStage: string
  currentStageIndex: number
}

interface SectionAnchor {
  id: string
  label: string
  emoji: string
}

// ─── Helper Components ────────────────────────────────────────────────

function SectionSkeleton({ height }: SectionSkeletonProps) {
  return (
    <SkeletonWrap $height={height}>
      <SkeletonSpinner>
        <SpinnerCircle />
      </SkeletonSpinner>
    </SkeletonWrap>
  )
}

function JsonLdSchema({ plot }: { plot: Plot }) {
  const blockNum = plot.block_number ?? plot.blockNumber
  const price = plot.total_price ?? plot.totalPrice
  const sizeSqM = plot.size_sqm ?? plot.sizeSqM

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `גוש ${blockNum} חלקה ${plot.number} - ${plot.city}`,
    description: plot.description || `קרקע להשקעה ב${plot.city}, שטח ${formatDunam(sizeSqM as number)} דונם`,
    url: window.location.href,
    offers: {
      '@type': 'Offer',
      price: price,
      priceCurrency: 'ILS',
      availability: plot.status === 'AVAILABLE'
        ? 'https://schema.org/InStock'
        : plot.status === 'SOLD'
          ? 'https://schema.org/SoldOut'
          : 'https://schema.org/PreOrder',
    },
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'שטח (מ"ר)', value: sizeSqM },
      { '@type': 'PropertyValue', name: 'עיר', value: plot.city },
      { '@type': 'PropertyValue', name: 'גוש', value: blockNum },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

function BreadcrumbSchema({ plot }: { plot: Plot }) {
  const blockNum = plot.block_number ?? plot.blockNumber
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'מפת קרקעות', item: window.location.origin },
      { '@type': 'ListItem', position: 2, name: plot.city, item: `${window.location.origin}/?city=${plot.city}` },
      { '@type': 'ListItem', position: 3, name: `גוש ${blockNum} חלקה ${plot.number}` },
    ],
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

function PlotFaqSchema({ plot }: { plot: Plot }) {
  const blockNum = plot.block_number ?? plot.blockNumber
  const price = (plot.total_price ?? plot.totalPrice) as number
  const sizeSqM = (plot.size_sqm ?? plot.sizeSqM) as number
  const projected = (plot.projected_value ?? plot.projectedValue) as number
  const roi = price > 0 ? Math.round(((projected - price) / price) * 100) : 0
  const readiness = (plot.readiness_estimate ?? plot.readinessEstimate) as string | undefined
  const zoning = (plot.zoning_stage ?? plot.zoningStage) as string

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `מה המחיר של גוש ${blockNum} חלקה ${plot.number} ב${plot.city}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `המחיר המבוקש לחלקה הוא ₪${price.toLocaleString()} (₪${sizeSqM > 0 ? Math.round(price / sizeSqM).toLocaleString() : '—'} למ״ר). שטח החלקה: ${sizeSqM > 0 ? (sizeSqM / 1000).toFixed(1) : '—'} דונם.`,
        },
      },
      {
        '@type': 'Question',
        name: `מה התשואה הצפויה של גוש ${blockNum} חלקה ${plot.number}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `התשואה הצפויה היא +${roi}%. שווי צפוי לאחר השבחה: ₪${projected.toLocaleString()}.${readiness ? ` זמן משוער: ${readiness}.` : ''}`,
        },
      },
      {
        '@type': 'Question',
        name: `מה שלב התכנון של גוש ${blockNum} חלקה ${plot.number}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `החלקה נמצאת בשלב: ${zoningLabels[zoning] || zoning}.${readiness ? ` מוכנות משוערת לבנייה: ${readiness}.` : ''} סטטוס: ${statusLabels[plot.status as string] || plot.status}.`,
        },
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

function PlotCard({ p }: PlotCardProps) {
  const bn = p.block_number ?? p.blockNumber
  const price = (p.total_price ?? p.totalPrice) as number
  const projValue = (p.projected_value ?? p.projectedValue) as number
  const sizeSqM = (p.size_sqm ?? p.sizeSqM) as number
  const roi = price > 0 ? Math.round((projValue - price) / price * 100) : 0
  const color = statusColors[p.status as string] || '#94A3B8'
  const distLabel = (p as any).distance_km != null
    ? (p as any).distance_km < 1 ? `${Math.round((p as any).distance_km * 1000)}מ׳` : `${(p as any).distance_km} ק״מ`
    : null
  const matchReasons: string[] = (p as any)._matchReasons || []

  return (
    <PlotCardLink to={`/plot/${p.id}`}>
      <PlotCardHeader>
        <StatusBar $color={color} />
        <div style={{ minWidth: 0 }}>
          <PlotCardTitle>גוש {bn} | חלקה {p.number}</PlotCardTitle>
          <PlotCardSubtitle>
            {p.city} · {formatDunam(sizeSqM)} דונם
            {distLabel && <DistanceSpan> · {distLabel}</DistanceSpan>}
          </PlotCardSubtitle>
        </div>
      </PlotCardHeader>
      {matchReasons.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {matchReasons.slice(0, 2).map((reason, i) => (
            <MatchReasonTag key={i}>{reason}</MatchReasonTag>
          ))}
        </div>
      )}
      <PlotCardFooter>
        <PlotCardPrice>{formatPriceShort(price)}</PlotCardPrice>
        <PlotCardRoi>+{roi}%</PlotCardRoi>
      </PlotCardFooter>
      <MiniProgressTrack>
        <div
          style={{
            height: '100%',
            borderRadius: 9999,
            width: `${Math.min(100, Math.max(8, (price / (projValue || 1)) * 100))}%`,
            background: 'linear-gradient(90deg, #3B82F6, #60A5FA)',
          }}
        />
      </MiniProgressTrack>
    </PlotCardLink>
  )
}

function SimilarPlotsSection({ plotId, onNearbyLoaded }: SimilarPlotsSectionProps) {
  const { data: similar = [], isLoading: simLoading } = useSimilarPlots(plotId)
  const { data: nearby = [], isLoading: nearLoading } = useNearbyPlots(plotId)

  useEffect(() => {
    const combined = [...(nearby || []), ...(similar || [])]
    if (combined.length > 0 && onNearbyLoaded) onNearbyLoaded(combined)
  }, [nearby, similar, onNearbyLoaded])

  const nearbyFiltered = useMemo(() => {
    if (!nearby || nearby.length === 0) return []
    const simIds = new Set((similar || []).map((p: Plot) => p.id))
    return nearby.filter((p: Plot) => !simIds.has(p.id)).slice(0, 4)
  }, [nearby, similar])

  const hasSimilar = similar && similar.length > 0
  const hasNearby = nearbyFiltered.length > 0
  const isLoading = simLoading && nearLoading

  if (isLoading || (!hasSimilar && !hasNearby)) return null

  return (
    <SimilarWrap>
      {hasSimilar && (
        <div>
          <SimilarHeading>
            <IconBadge $bg="rgba(139, 92, 246, 0.15)">&#127919;</IconBadge>
            חלקות דומות
            <SubLabel>מחיר, שלב תכנוני ותשואה</SubLabel>
          </SimilarHeading>
          <SimilarGrid>
            {similar.map((p: Plot) => <PlotCard key={p.id} p={p} />)}
          </SimilarGrid>
        </div>
      )}
      {hasNearby && (
        <div>
          <SimilarHeading>
            <IconBadge $bg="rgba(59, 130, 246, 0.15)">&#128205;</IconBadge>
            חלקות בסביבה
          </SimilarHeading>
          <SimilarGrid>
            {nearbyFiltered.map((p: Plot) => <PlotCard key={p.id} p={p} />)}
          </SimilarGrid>
        </div>
      )}
    </SimilarWrap>
  )
}

function getDocIcon(mimeType?: string): LucideIcon {
  if (!mimeType) return File
  if (mimeType.startsWith('image/')) return FileImage
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return FileSpreadsheet
  return FileText
}

const SECTION_ANCHORS: SectionAnchor[] = [
  { id: 'section-financial', label: 'פיננסי', emoji: '💰' },
  { id: 'section-location', label: 'מיקום', emoji: '📍' },
  { id: 'section-projection', label: 'תחזית', emoji: '📈' },
  { id: 'section-timeline', label: 'ציר זמן', emoji: '⏳' },
  { id: 'section-planning', label: 'תכנון', emoji: '📋' },
  { id: 'section-costs', label: 'עלויות', emoji: '🧾' },
  { id: 'section-documents', label: 'מסמכים', emoji: '📄' },
  { id: 'section-similar', label: 'דומות', emoji: '🎯' },
]

function SectionNav() {
  const [activeId, setActiveId] = useState<string>('')
  const [visible, setVisible] = useState<boolean>(false)

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 300)
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    const elements = SECTION_ANCHORS
      .map(a => document.getElementById(a.id))
      .filter(Boolean) as HTMLElement[]
    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (vis.length > 0) {
          setActiveId(vis[0].target.id)
        }
      },
      { rootMargin: '-80px 0px -40% 0px', threshold: [0, 0.25, 0.5] }
    )

    elements.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const y = el.getBoundingClientRect().top + window.scrollY - 100
    window.scrollTo({ top: y, behavior: 'smooth' })
    const shortHash = id.replace('section-', '')
    window.history.replaceState(null, '', `#${shortHash}`)
  }, [])

  if (!visible) return null

  const existingAnchors = SECTION_ANCHORS.filter(a => document.getElementById(a.id))
  if (existingAnchors.length < 2) return null

  return (
    <SectionNavFixed $visible={visible}>
      <SectionNavBar>
        <SectionNavInner>
          <SectionNavScroll dir="rtl" role="navigation" aria-label="קפיצה לסעיף">
            {existingAnchors.map(anchor => (
              <SectionNavBtn
                key={anchor.id}
                $active={activeId === anchor.id}
                onClick={() => handleClick(anchor.id)}
                aria-current={activeId === anchor.id ? 'true' : undefined}
              >
                <span style={{ fontSize: 10 }}>{anchor.emoji}</span>
                <span>{anchor.label}</span>
              </SectionNavBtn>
            ))}
          </SectionNavScroll>
        </SectionNavInner>
      </SectionNavBar>
    </SectionNavFixed>
  )
}

function StickyPlotInfoBar({ plot, computed }: StickyPlotInfoBarProps) {
  const [visible, setVisible] = useState<boolean>(false)

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 280)
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [])

  if (!visible || !plot || !computed) return null

  const { blockNumber, totalPrice, roi } = computed
  const statusColor = statusColors[plot.status as string] || '#94A3B8'
  const roiTier: 'high' | 'mid' | 'low' = roi >= 100 ? 'high' : roi >= 50 ? 'mid' : 'low'
  const netRoi = (plot as any)._netRoi as number | undefined
  const investmentRank = (plot as any)._investmentRank as number | undefined

  return (
    <StickyBarOuter $visible={visible} dir="rtl">
      <StickyBarInner>
        <StickyBarContent>
          <StickyBarLeft>
            <StatusBar $color={statusColor} />
            <div style={{ minWidth: 0 }}>
              <StickyBarTitle>
                גוש {blockNumber} | חלקה {plot.number}
              </StickyBarTitle>
              <StickyBarCity>{plot.city}</StickyBarCity>
            </div>
          </StickyBarLeft>

          <StickyBarCenter>
            <StickyPrice>{formatPriceShort(totalPrice)}</StickyPrice>
            <RoiBadge $tier={roiTier}>
              +{roi}%{netRoi != null ? ` (נטו ${netRoi > 0 ? '+' : ''}${netRoi}%)` : ''}
            </RoiBadge>
            <StatusPill $color={statusColor}>
              {statusLabels[plot.status as string]}
            </StatusPill>
            {investmentRank != null && investmentRank <= 3 && (
              <StickyRankBadge>
                &#127941; #{investmentRank}
              </StickyRankBadge>
            )}
          </StickyBarCenter>

          <StickyBarRight>
            <MapLinkBtn
              to={`/?plot=${plot.id}&city=${encodeURIComponent(plot.city)}`}
              title="הצג במפה האינטראקטיבית"
            >
              <MapIcon style={{ width: 14, height: 14 }} />
              <HiddenSmInline>במפה</HiddenSmInline>
            </MapLinkBtn>
            <WhatsAppBtn
              href={plotInquiryLink(plot)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle style={{ width: 14, height: 14 }} />
              <HiddenSmInline>WhatsApp</HiddenSmInline>
            </WhatsAppBtn>
          </StickyBarRight>
        </StickyBarContent>
      </StickyBarInner>
    </StickyBarOuter>
  )
}

function ReadingProgressBar() {
  const [progress, setProgress] = useState<number>(0)

  useEffect(() => {
    let rafId: number | null = null
    const handler = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        const scrollTop = window.scrollY
        const docHeight = document.documentElement.scrollHeight - window.innerHeight
        if (docHeight <= 0) return
        setProgress(Math.min(1, Math.max(0, scrollTop / docHeight)))
      })
    }
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => {
      window.removeEventListener('scroll', handler)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  if (progress <= 0.01) return null

  return (
    <ProgressBarTrack
      role="progressbar"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="התקדמות קריאה בעמוד"
    >
      <ProgressBarFill $progress={progress} />
    </ProgressBarTrack>
  )
}

function MortgageCalcSection({ totalPrice }: MortgageCalcSectionProps) {
  const [equity, setEquity] = useState<number>(50)
  const [years, setYears] = useState<number>(15)
  const [rate, setRate] = useState<number>(4.5)

  const loanAmount = totalPrice * (1 - equity / 100)
  const monthlyRate = rate / 100 / 12
  const numPayments = years * 12
  const monthlyPayment = monthlyRate > 0
    ? Math.round(loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1))
    : Math.round(loanAmount / numPayments)
  const totalPayment = monthlyPayment * numPayments
  const totalInterest = totalPayment - loanAmount

  return (
    <CalcPanel role="group" aria-labelledby="mortgage-calc-heading">
      <CalcHeadingRow>
        <DollarSign style={{ width: 16, height: 16, color: '#C8942A' }} />
        <CalcHeading id="mortgage-calc-heading">מחשבון מימון</CalcHeading>
      </CalcHeadingRow>
      <CalcStack>
        <div>
          <SliderLabelRow>
            <label htmlFor="mortgage-equity">הון עצמי</label>
            <GoldVal>{equity}% ({formatCurrency(Math.round(totalPrice * equity / 100))})</GoldVal>
          </SliderLabelRow>
          <RangeInput
            type="range"
            id="mortgage-equity"
            min="20"
            max="100"
            step="5"
            value={equity}
            onChange={(e) => setEquity(Number(e.target.value))}
            aria-label="אחוז הון עצמי"
            aria-valuemin={20}
            aria-valuemax={100}
            aria-valuenow={equity}
            aria-valuetext={`${equity}% הון עצמי, ${formatCurrency(Math.round(totalPrice * equity / 100))}`}
          />
        </div>
        <div>
          <SliderLabelRow>
            <label htmlFor="mortgage-years">תקופה</label>
            <SlateVal>{years} שנים</SlateVal>
          </SliderLabelRow>
          <RangeInput
            type="range"
            id="mortgage-years"
            min="5"
            max="30"
            step="1"
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            aria-label="תקופת הלוואה בשנים"
            aria-valuemin={5}
            aria-valuemax={30}
            aria-valuenow={years}
            aria-valuetext={`${years} שנים`}
          />
        </div>
        <div>
          <SliderLabelRow>
            <label htmlFor="mortgage-rate">ריבית</label>
            <SlateVal>{rate}%</SlateVal>
          </SliderLabelRow>
          <RangeInput
            type="range"
            id="mortgage-rate"
            min="2"
            max="8"
            step="0.25"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            aria-label="אחוז ריבית שנתי"
            aria-valuemin={2}
            aria-valuemax={8}
            aria-valuenow={rate}
            aria-valuetext={`ריבית ${rate} אחוז`}
          />
        </div>
        {equity < 100 && (
          <CalcResults role="status" aria-live="polite" aria-atomic="true">
            <CalcResultCell>
              <CalcResultLabel>החזר חודשי</CalcResultLabel>
              <CalcResultValue>{formatCurrency(monthlyPayment)}</CalcResultValue>
            </CalcResultCell>
            <CalcResultCell>
              <CalcResultLabel>סה״כ ריבית</CalcResultLabel>
              <CalcResultValue $color="#FB923C">{formatCurrency(totalInterest)}</CalcResultValue>
            </CalcResultCell>
            <CalcResultCell>
              <CalcResultLabel>סה״כ תשלום</CalcResultLabel>
              <CalcResultValue $color="#CBD5E1">{formatCurrency(totalPayment)}</CalcResultValue>
            </CalcResultCell>
          </CalcResults>
        )}
      </CalcStack>
    </CalcPanel>
  )
}

// ─── Main Component ───────────────────────────────────────────────────

export default function PlotDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: plot, isLoading, error } = usePlot(id) as { data: Plot | undefined; isLoading: boolean; error: any }
  const [isLeadModalOpen, setIsLeadModalOpen] = useState<boolean>(false)
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false)
  const [lightboxIndex, setLightboxIndex] = useState<number>(0)
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false)
  const [linkCopied, setLinkCopied] = useState<boolean>(false)
  const favorites = useFavorites() as any
  const { trackView } = useViewTracker()

  const [compareIds, setCompareIds] = useLocalStorage<string[]>('landmap_compare', [])
  const toggleCompare = useCallback((plotId: string) => {
    setCompareIds((prev: string[]) =>
      prev.includes(plotId) ? prev.filter((cid: string) => cid !== plotId) : prev.length < 3 ? [...prev, plotId] : prev
    )
  }, [])

  const { data: marketData } = useMarketOverview() as { data: any }

  useThemeColor(themeColors.detail)

  const [nearbyPlots, setNearbyPlots] = useState<Plot[]>([])
  const handleNearbyLoaded = useCallback((plots: Plot[]) => setNearbyPlots(plots), [])

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash) {
      const sectionId = hash.startsWith('section-') ? hash : `section-${hash}`
      const timer = setTimeout(() => {
        const el = document.getElementById(sectionId)
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 100
          window.scrollTo({ top: y, behavior: 'smooth' })
        }
      }, 600)
      return () => clearTimeout(timer)
    } else {
      window.scrollTo(0, 0)
    }
    preloadPlotDetailChunks()
  }, [id])

  useEffect(() => {
    if (id) trackView(id)
  }, [id, trackView])

  useEffect(() => {
    const canonical = document.querySelector('link[rel="canonical"]') || (() => {
      const el = document.createElement('link')
      el.setAttribute('rel', 'canonical')
      document.head.appendChild(el)
      return el
    })()
    ;(canonical as HTMLLinkElement).href = `${window.location.origin}/plot/${id}`
    return () => (canonical as HTMLLinkElement).remove()
  }, [id])

  useEffect(() => {
    const handler = () => setShowScrollTop(window.scrollY > 400)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }).catch(() => {})
  }, [])

  const computed = useMemo<ComputedPlot | null>(() => {
    if (!plot) return null
    const totalPrice = (plot.total_price ?? plot.totalPrice) as number
    const projectedValue = (plot.projected_value ?? plot.projectedValue) as number
    const sizeSqM = (plot.size_sqm ?? plot.sizeSqM) as number
    const blockNumber = (plot.block_number ?? plot.blockNumber) as string
    const roi = Math.round((projectedValue - totalPrice) / totalPrice * 100)
    const pricePerDunam = formatCurrency(Math.round(totalPrice / sizeSqM * 1000))
    const readiness = (plot.readiness_estimate ?? plot.readinessEstimate) as string | undefined
    const zoningStage = (plot.zoning_stage ?? plot.zoningStage) as string
    const currentStageIndex = zoningPipelineStages.findIndex((s: any) => s.key === zoningStage)
    return { totalPrice, projectedValue, sizeSqM, blockNumber, roi, pricePerDunam, readiness, zoningStage, currentStageIndex }
  }, [plot])

  const handleCopyInvestmentCard = useCallback(() => {
    if (!plot || !computed) return
    const { totalPrice, projectedValue, sizeSqM, blockNumber, roi, readiness, zoningStage } = computed
    const score = calcInvestmentScore(plot)
    const { label: scoreLabel } = getScoreLabel(score)
    const cagrData = calcCAGR(roi, readiness) as CAGRResult | null
    const dunam = (sizeSqM / 1000).toFixed(1)
    const priceSqm = sizeSqM > 0 ? Math.round(totalPrice / sizeSqM) : 0

    const card = [
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `🏗️ *גוש ${blockNumber} | חלקה ${plot.number}*`,
      `📍 ${plot.city}`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `💰 מחיר: ${formatCurrency(totalPrice)}`,
      `📐 שטח: ${dunam} דונם (${sizeSqM.toLocaleString()} מ״ר)`,
      `💵 מחיר/מ״ר: ${formatCurrency(priceSqm)}`,
      ``,
      `📈 תשואה צפויה: *+${roi}%*`,
      `🎯 שווי צפוי: ${formatCurrency(projectedValue)}`,
      cagrData ? `📊 CAGR: ${cagrData.cagr}%/שנה (${cagrData.years} שנים)` : null,
      ``,
      `🏷️ סטטוס: ${statusLabels[plot.status as string] || plot.status}`,
      `📋 ייעוד: ${zoningLabels[zoningStage] || zoningStage}`,
      readiness ? `⏳ מוכנות: ${readiness}` : null,
      `⭐ ציון השקעה: ${score}/10 (${scoreLabel})`,
      ``,
      `🔗 ${window.location.href}`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `LandMap Israel 🗺️`,
    ].filter(Boolean).join('\n')

    navigator.clipboard.writeText(card).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    }).catch(() => {})
  }, [plot, computed])

  const handlePrintReport = useCallback(() => {
    if (!plot || !computed) return
    const { totalPrice, projectedValue, sizeSqM, blockNumber, roi, readiness, zoningStage } = computed
    const areaCtx = (plot as any).area_context ?? (plot as any).areaContext ?? ''
    const nearbyDev = (plot as any).nearby_development ?? (plot as any).nearbyDevelopment ?? ''
    const cagrData = calcCAGR(roi, readiness) as CAGRResult | null
    const score = calcInvestmentScore(plot)
    const { label: scoreLabel } = getScoreLabel(score)

    const purchaseTax = Math.round(totalPrice * 0.06)
    const attorneyFees = Math.round(totalPrice * 0.0175)
    const grossProfit = projectedValue - totalPrice
    const bettermentLevy = Math.round(grossProfit * 0.5)
    const costs = purchaseTax + attorneyFees
    const taxable = Math.max(0, grossProfit - bettermentLevy - costs)
    const capGains = Math.round(taxable * 0.25)
    const netProfit = grossProfit - costs - bettermentLevy - capGains

    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8">
      <title>דו״ח השקעה - גוש ${blockNumber} חלקה ${plot.number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
        h1 { font-size: 24px; margin-bottom: 4px; color: #1a1a2e; }
        .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
        .section { margin-bottom: 24px; }
        .section h2 { font-size: 16px; color: #C8942A; border-bottom: 2px solid #C8942A; padding-bottom: 6px; margin-bottom: 12px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .card { background: #f8f9fa; border-radius: 8px; padding: 12px; }
        .card .label { font-size: 11px; color: #888; margin-bottom: 4px; }
        .card .value { font-size: 18px; font-weight: 700; }
        .card .value.gold { color: #C8942A; }
        .card .value.green { color: #22C55E; }
        .card .value.blue { color: #3B82F6; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 13px; }
        .row:last-child { border-bottom: none; }
        .row .label { color: #666; }
        .row .val { font-weight: 600; }
        .score-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-weight: 700; font-size: 13px; }
        .footer { margin-top: 40px; text-align: center; color: #aaa; font-size: 11px; border-top: 1px solid #eee; padding-top: 16px; }
        .desc { font-size: 13px; color: #444; margin-bottom: 16px; }
        .highlight { background: #FFFBEB; border: 1px solid #F59E0B; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <h1>🏗️ דו״ח השקעה — גוש ${blockNumber} | חלקה ${plot.number}</h1>
      <div class="subtitle">${plot.city} • ${new Date().toLocaleDateString('he-IL')} • ציון השקעה: ${score}/10 (${scoreLabel})</div>
      ${plot.description ? `<p class="desc">${plot.description}</p>` : ''}
      ${areaCtx ? `<p class="desc">📍 ${areaCtx}</p>` : ''}
      ${nearbyDev ? `<p class="desc">🏗️ ${nearbyDev}</p>` : ''}
      <div class="section">
        <h2>נתונים פיננסיים</h2>
        <div class="grid3">
          <div class="card"><div class="label">מחיר מבוקש</div><div class="value blue">${formatCurrency(totalPrice)}</div></div>
          <div class="card"><div class="label">שווי צפוי</div><div class="value green">${formatCurrency(projectedValue)}</div></div>
          <div class="card"><div class="label">תשואה צפויה</div><div class="value gold">+${roi}%</div></div>
        </div>
        ${cagrData ? `<div class="row" style="margin-top:8px"><span class="label">תשואה שנתית (CAGR)</span><span class="val" style="color:#C8942A">${cagrData.cagr}% לשנה (${cagrData.years} שנים)</span></div>` : ''}
      </div>
      <div class="section">
        <h2>פרטי חלקה</h2>
        <div class="row"><span class="label">שטח</span><span class="val">${(sizeSqM / 1000).toFixed(1)} דונם (${sizeSqM.toLocaleString()} מ״ר)</span></div>
        <div class="row"><span class="label">מחיר למ״ר</span><span class="val">${formatCurrency(Math.round(totalPrice / sizeSqM))}</span></div>
        <div class="row"><span class="label">מחיר לדונם</span><span class="val">${formatCurrency(Math.round(totalPrice / sizeSqM * 1000))}</span></div>
        <div class="row"><span class="label">סטטוס</span><span class="val">${statusLabels[plot.status as string] || plot.status}</span></div>
        <div class="row"><span class="label">ייעוד קרקע</span><span class="val">${zoningLabels[zoningStage] || zoningStage}</span></div>
        ${readiness ? `<div class="row"><span class="label">מוכנות לבנייה</span><span class="val">${readiness}</span></div>` : ''}
      </div>
      <div class="section">
        <h2>ניתוח עלויות ורווחיות</h2>
        <div class="row"><span class="label">מס רכישה (6%)</span><span class="val">${formatCurrency(purchaseTax)}</span></div>
        <div class="row"><span class="label">שכ״ט עו״ד (~1.75%)</span><span class="val">${formatCurrency(attorneyFees)}</span></div>
        <div class="row"><span class="label">סה״כ עלות כוללת</span><span class="val" style="color:#3B82F6">${formatCurrency(Math.round(totalPrice * 1.0775))}</span></div>
        <div class="row"><span class="label">רווח גולמי</span><span class="val" style="color:#22C55E">${formatCurrency(grossProfit)}</span></div>
        <div class="row"><span class="label">היטל השבחה (50%)</span><span class="val" style="color:#EF4444">-${formatCurrency(bettermentLevy)}</span></div>
        <div class="row"><span class="label">מס שבח (25%)</span><span class="val" style="color:#EF4444">-${formatCurrency(capGains)}</span></div>
        <div class="highlight">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:600;font-size:15px">✨ רווח נקי (אחרי כל המיסים)</span>
            <span style="font-weight:800;font-size:20px;color:${netProfit >= 0 ? '#22C55E' : '#EF4444'}">${formatCurrency(netProfit)}</span>
          </div>
        </div>
      </div>
      <div class="footer">
        <div>LandMap Israel — מפת קרקעות להשקעה</div>
        <div>הופק ב-${new Date().toLocaleDateString('he-IL')} ${new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</div>
        <div style="margin-top:4px">${window.location.href}</div>
        <div style="margin-top:8px;font-size:10px">⚠️ מסמך זה הינו לצרכי מידע בלבד ואינו מהווה ייעוץ השקעות</div>
      </div>
    </body></html>`)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 300)
  }, [plot, computed])

  // Dynamic page title + OG meta for SEO
  useEffect(() => {
    if (plot) {
      const blockNum = plot.block_number ?? plot.blockNumber
      const price = (plot.total_price ?? plot.totalPrice) as number
      const sizeSqM = (plot.size_sqm ?? plot.sizeSqM) as number

      document.title = `גוש ${blockNum} חלקה ${plot.number} - ${plot.city} | LandMap Israel`

      const setMeta = (attr: string, key: string, content: string) => {
        let el = document.querySelector(`meta[${attr}="${key}"]`)
        if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
        ;(el as HTMLMetaElement).content = content
      }

      const desc = `קרקע להשקעה בגוש ${blockNum} חלקה ${plot.number}, ${plot.city}. מחיר: ₪${Math.round(price/1000)}K. שטח: ${sizeSqM?.toLocaleString()} מ"ר.`
      setMeta('name', 'description', desc)
      setMeta('property', 'og:title', `גוש ${blockNum} חלקה ${plot.number} - ${plot.city}`)
      setMeta('property', 'og:description', desc)
      setMeta('property', 'og:url', window.location.href)
      setMeta('property', 'og:type', 'product')
      const images = (plot as any).plot_images || []
      if (images.length > 0 && images[0].url) {
        setMeta('property', 'og:image', images[0].url)
      } else {
        const ogBase = (import.meta as any).env.VITE_API_URL || window.location.origin
        setMeta('property', 'og:image', `${ogBase}/api/og/${plot.id}`)
      }
      setMeta('name', 'twitter:card', 'summary_large_image')
      setMeta('name', 'twitter:title', `גוש ${blockNum} חלקה ${plot.number} - ${plot.city}`)
      setMeta('name', 'twitter:description', desc)
    }
    return () => { document.title = 'LandMap Israel - מפת קרקעות להשקעה' }
  }, [plot])

  const lastVisitPrice = useLastVisitPrice(id as string, computed?.totalPrice) as any

  // ─── Loading state ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <PageWrap>
        <PublicNav />
        <ContentZone>
          <MaxWidth>
            {/* Breadcrumb skeleton */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <SkeletonBar $w="64px" $h="12px" />
              <SkeletonBar $w="8px" $h="12px" style={{ opacity: 0.3 } as any} />
              <SkeletonBar $w="48px" $h="12px" $delay="0.1s" />
              <SkeletonBar $w="8px" $h="12px" style={{ opacity: 0.3 } as any} />
              <SkeletonBar $w="112px" $h="12px" $delay="0.2s" />
            </div>

            {/* Hero header skeleton */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 32 }}>
              <div>
                <SkeletonBar $w="288px" $h="36px" style={{ borderRadius: 8, marginBottom: 12 } as any} />
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                  <SkeletonBar $w="80px" $h="24px" style={{ borderRadius: 8 } as any} />
                  <SkeletonBar $w="96px" $h="24px" $delay="0.15s" style={{ borderRadius: 8 } as any} />
                  <SkeletonBar $w="112px" $h="24px" $delay="0.25s" style={{ borderRadius: 8 } as any} />
                  <SkeletonBar $w="64px" $h="24px" $delay="0.35s" style={{ borderRadius: 9999 } as any} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SkeletonBar $w="40px" $h="40px" style={{ borderRadius: 12 } as any} />
                <SkeletonBar $w="40px" $h="40px" style={{ borderRadius: 12 } as any} />
              </div>
            </div>

            {/* Map skeleton */}
            <MapSkeleton>
              <MapGridOverlay />
              <MapCenter>
                <Spinner style={{ width: 32, height: 32, color: 'rgba(200, 148, 42, 0.4)' } as any} />
              </MapCenter>
            </MapSkeleton>

            {/* Financial cards skeleton */}
            <SkeletonGrid3>
              {[
                { bg: 'rgba(59, 130, 246, 0.05)', delay: '0s' },
                { bg: 'rgba(16, 185, 129, 0.05)', delay: '0.1s' },
                { bg: 'rgba(200, 148, 42, 0.05)', delay: '0.2s' },
              ].map(({ bg, delay }, i) => (
                <SkeletonCardWrap key={i} $bgColor={bg} $delay={delay}>
                  <SkeletonBar $w="64px" $h="12px" />
                  <SkeletonBar $w="112px" $h="28px" />
                  <SkeletonBar $w="80px" $h="12px" />
                </SkeletonCardWrap>
              ))}
            </SkeletonGrid3>

            {/* Two-column skeleton */}
            <SkeletonTwoCols>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <SkeletonBox $h="128px" />
                <SkeletonBox $h="192px" $delay="0.15s" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <SkeletonBox $h="256px" $delay="0.1s" />
                <SkeletonBox $h="160px" $delay="0.25s" />
              </div>
            </SkeletonTwoCols>
          </MaxWidth>
        </ContentZone>
      </PageWrap>
    )
  }

  // ─── Error state ────────────────────────────────────────────────────
  if (error || !plot) {
    const is404 = error?.status === 404 || (!error && !plot && !isLoading)
    const isNetworkError = error && !error.status

    return (
      <PageWrap>
        <PublicNav />
        <meta name="robots" content="noindex, nofollow" />
        <ErrorWrap>
          <ErrorContent>
            <ErrorIconBox>
              {is404 ? '🔍' : '⚠️'}
            </ErrorIconBox>
            <ErrorTitle>
              {is404 ? 'חלקה לא נמצאה' : 'שגיאה בטעינת הנתונים'}
            </ErrorTitle>
            <ErrorDesc>
              {is404
                ? 'ייתכן שהחלקה הוסרה מהמערכת או שהקישור שגוי. נסה לחפש את החלקה ישירות.'
                : isNetworkError
                  ? 'בעיית חיבור לשרת — בדוק את חיבור האינטרנט ונסה שנית.'
                  : `השרת השיב עם שגיאה${error?.status ? ` (${error.status})` : ''}. נסה שוב בעוד רגע.`
              }
            </ErrorDesc>
            <ErrorActions>
              {!is404 && (
                <RetryBtn onClick={() => window.location.reload()}>
                  🔄 נסה שוב
                </RetryBtn>
              )}
              <GhostBtn onClick={() => window.history.length > 2 ? navigate(-1) : navigate('/')}>
                <ArrowRight style={{ width: 16, height: 16 }} />
                {window.history.length > 2 ? 'חזרה' : 'למפה'}
              </GhostBtn>
              <SearchMapLink to="/">
                🗺️ חפש במפה
              </SearchMapLink>
            </ErrorActions>
            {id && (
              <PlotIdHint>מזהה חלקה: {id}</PlotIdHint>
            )}
          </ErrorContent>
        </ErrorWrap>
      </PageWrap>
    )
  }

  // ─── Main content ───────────────────────────────────────────────────
  const { totalPrice, projectedValue, sizeSqM, blockNumber, roi, pricePerDunam, readiness, zoningStage, currentStageIndex } = computed!
  const statusColor = statusColors[plot.status as string] || '#94A3B8'
  const distanceToSea = (plot as any).distance_to_sea ?? (plot as any).distanceToSea
  const distanceToPark = (plot as any).distance_to_park ?? (plot as any).distanceToPark
  const distanceToHospital = (plot as any).distance_to_hospital ?? (plot as any).distanceToHospital
  const areaContext = (plot as any).area_context ?? (plot as any).areaContext
  const images: any[] = (plot as any).plot_images || []

  const netRoi = (plot as any)._netRoi as number | undefined
  const investmentRank = (plot as any)._investmentRank as number | undefined
  const totalRanked = (plot as any)._totalRanked as number | undefined
  const buySignal = (plot as any)._buySignal as any
  const paybackYears = (plot as any)._paybackYears as number | undefined
  const cityAvgPriceSqm = (plot as any)._cityAvgPriceSqm as number | undefined

  return (
    <PageWrap>
      <PublicNav />
      <ReadingProgressBar />
      <StickyPlotInfoBar plot={plot} computed={computed} />
      <SectionNav />
      <JsonLdSchema plot={plot} />
      <PlotFaqSchema plot={plot} />

      <BackgroundGrid />

      <ContentZone>
        <MaxWidth>
          <div style={{ marginBottom: 24 }}>
            <Breadcrumb
              items={[
                { label: 'מפה', to: '/' },
                { label: plot.city, to: `/?city=${encodeURIComponent(plot.city)}` },
                { label: `גוש ${blockNumber} חלקה ${plot.number}` },
              ]}
            />
          </div>

          {/* Hero header */}
          <HeroRow>
            <div>
              <HeroTitle>
                <GoldGradient>גוש</GoldGradient>
                {' '}{blockNumber}{' | '}
                <GoldGradient>חלקה</GoldGradient>
                {' '}{plot.number}
              </HeroTitle>
              <BadgesRow>
                <CityLabel>
                  <MapPin style={{ width: 16, height: 16 }} /> {plot.city}
                </CityLabel>
                <InfoChip>{formatDunam(sizeSqM)} דונם</InfoChip>
                <InfoChipLight>{zoningLabels[zoningStage]}</InfoChipLight>
                {zoningStage && (
                  <ZoningChip>
                    <ZoningProgressBar currentStage={zoningStage} variant="compact" />
                  </ZoningChip>
                )}
                <StatusBadge $color={statusColor}>
                  <StatusDot $color={statusColor} />
                  {statusLabels[plot.status as string]}
                </StatusBadge>
                {/* Freshness */}
                {(() => {
                  const updatedAt = plot.updated_at ?? plot.updatedAt
                  const freshness = formatRelativeTime(updatedAt as string)
                  if (!freshness) return null
                  const colorClass = getFreshnessColor(updatedAt as string)
                  return (
                    <FreshnessBadge $colorClass={colorClass} style={{ color: colorClass }}>
                      <Clock style={{ width: 12, height: 12 }} />
                      עודכן {freshness}
                    </FreshnessBadge>
                  )
                })()}
                {(plot.views as number) > 0 && (
                  <ViewsBadge>
                    👁 {plot.views} צפיות
                  </ViewsBadge>
                )}
                {/* Investment rank */}
                {investmentRank != null && totalRanked != null && totalRanked > 0 && (
                  <RankBadge
                    $tier={investmentRank <= 3 ? 'top' : investmentRank <= Math.ceil(totalRanked / 2) ? 'upper' : 'normal'}
                    title={`מדורג #${investmentRank} מתוך ${totalRanked} חלקות זמינות לפי ציון השקעה`}
                  >
                    {investmentRank <= 3 ? '🏅' : '📊'} #{investmentRank}/{totalRanked}
                  </RankBadge>
                )}
                {/* Net ROI badge */}
                {netRoi != null && (
                  <NetRoiBadge
                    $tier={netRoi >= 50 ? 'excellent' : netRoi >= 20 ? 'good' : netRoi >= 0 ? 'ok' : 'negative'}
                    title={`תשואה נטו אחרי כל המיסים, היטלים ועלויות: ${netRoi}%`}
                  >
                    💎 נטו {netRoi > 0 ? '+' : ''}{netRoi}%
                  </NetRoiBadge>
                )}
                {/* Days on Market */}
                {(() => {
                  const dom = calcDaysOnMarket(plot.created_at ?? plot.createdAt)
                  if (!dom) return null
                  return (
                    <DomBadge $color={(dom as any).color}>
                      📅 {(dom as any).label}
                    </DomBadge>
                  )
                })()}
                {/* Price changed since last visit */}
                {lastVisitPrice.hasChange && (
                  <PriceChangeBadge
                    $direction={lastVisitPrice.direction}
                    title={`מחיר קודם: ${formatCurrency(lastVisitPrice.previousPrice)} (${lastVisitPrice.lastVisit?.toLocaleDateString('he-IL')})`}
                  >
                    {lastVisitPrice.direction === 'down' ? '📉' : '📈'}
                    {lastVisitPrice.direction === 'down' ? 'המחיר ירד' : 'המחיר עלה'}
                    {' '}
                    {Math.abs(lastVisitPrice.changePct)}%
                    {' מאז ביקורך'}
                  </PriceChangeBadge>
                )}
              </BadgesRow>
            </div>
            <HeroActions>
              <ShowOnMapBtn
                to={`/?plot=${plot.id}&city=${encodeURIComponent(plot.city)}`}
                title="הצג על המפה האינטראקטיבית"
              >
                <MapIcon style={{ width: 16, height: 16 }} />
                <SmHiddenSpan>הצג במפה</SmHiddenSpan>
                <SmVisibleSpan>🗺️</SmVisibleSpan>
              </ShowOnMapBtn>
              <FavBtn
                $active={favorites.isFavorite(plot.id)}
                onClick={() => favorites.toggle(plot.id)}
              >
                <Heart
                  style={{
                    width: 16,
                    height: 16,
                    color: favorites.isFavorite(plot.id) ? '#F87171' : '#94A3B8',
                    fill: favorites.isFavorite(plot.id) ? '#F87171' : 'none',
                  }}
                />
              </FavBtn>
              <Suspense fallback={<ShareSkeleton />}>
                <ShareMenu
                  plotTitle={`גוש ${blockNumber} חלקה ${plot.number} - ${plot.city}`}
                  plotPrice={formatCurrency(totalPrice)}
                  plotUrl={window.location.href}
                />
              </Suspense>
            </HeroActions>
          </HeroRow>

          {/* Images gallery */}
          {images.length > 0 && (
            <ImageGrid>
              {images.map((img: any, i: number) => (
                <ImageBtn
                  key={img.id || i}
                  $isFirst={i === 0}
                  onClick={() => { setLightboxIndex(i); setLightboxOpen(true) }}
                >
                  <PlotImg
                    src={img.url}
                    alt={img.alt || `גוש ${blockNumber} חלקה ${plot.number} — תמונה ${i + 1}`}
                    style={{
                      aspectRatio: i === 0 ? '16/9' : '1/1',
                      opacity: 0,
                      filter: 'blur(8px)',
                      transition: 'opacity 0.5s ease, filter 0.5s ease, transform 0.3s ease',
                    }}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    fetchPriority={i === 0 ? 'high' : undefined}
                    decoding="async"
                    onLoad={(e: SyntheticEvent<HTMLImageElement>) => {
                      (e.target as HTMLImageElement).style.opacity = '1'
                      ;(e.target as HTMLImageElement).style.filter = 'blur(0)'
                    }}
                    onError={(e: SyntheticEvent<HTMLImageElement>) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                      const parent = (e.target as HTMLImageElement).parentElement
                      if (parent && !parent.querySelector('.img-fallback-placeholder')) {
                        const ph = document.createElement('div')
                        ph.className = 'img-fallback-placeholder'
                        ph.style.cssText = `position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:linear-gradient(135deg,rgba(200,148,42,0.08),rgba(200,148,42,0.02));`
                        ph.innerHTML = `<span style="font-size:${i === 0 ? '32' : '20'}px;opacity:0.3">🏗️</span><span style="font-size:10px;color:rgba(148,163,184,0.4)">תמונה לא זמינה</span>`
                        parent.appendChild(ph)
                      }
                    }}
                  />
                  <ImagePlaceholder />
                  {i === Math.min(images.length - 1, 5) && images.length > 6 && (
                    <ImageCountOverlay>+{images.length - 6}</ImageCountOverlay>
                  )}
                </ImageBtn>
              ))}
            </ImageGrid>
          )}

          {/* Data Completeness */}
          <DataBarWrap>
            <DataCompletenessBar plot={plot} variant="full" />
            <ReportRow>
              <ReportLink
                href={plotReportIssueLink(plot)}
                target="_blank"
                rel="noopener noreferrer"
                title="דווח על שגיאה בנתונים — מחיר, מיקום, ייעוד או מידע אחר"
              >
                <Flag style={{ width: 12, height: 12 }} />
                דווח על שגיאה בנתונים
              </ReportLink>
            </ReportRow>
          </DataBarWrap>

          {/* Location mini-map */}
          {plot.coordinates && plot.coordinates.length >= 3 && (
            <LocationSection id="section-location">
              <LocationHeader>
                <LocationTitle>
                  <MapPin style={{ width: 16, height: 16, color: '#C8942A' }} />
                  מיקום החלקה
                </LocationTitle>
                {(() => {
                  const valid = plot.coordinates!.filter((c: any) => Array.isArray(c) && c.length >= 2 && isFinite(c[0]) && isFinite(c[1]))
                  if (valid.length === 0) return null
                  const lat = (valid.reduce((s: number, c: any) => s + c[0], 0) / valid.length).toFixed(6)
                  const lng = (valid.reduce((s: number, c: any) => s + c[1], 0) / valid.length).toFixed(6)
                  return (
                    <ExternalLinks>
                      <ExtLink href={`https://www.google.com/maps/@${lat},${lng},3a,75y,0h,90t/data=!3m4!1e1!3m2!1s!2e0`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink style={{ width: 12, height: 12 }} />
                        Street View
                      </ExtLink>
                      <ExtLink href={`https://www.google.com/maps?q=${lat},${lng}&z=17`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink style={{ width: 12, height: 12 }} />
                        Google Maps
                      </ExtLink>
                      <WazeLink href={`https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes&zoom=17`} target="_blank" rel="noopener noreferrer">
                        <svg style={{ width: 12, height: 12 }} viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.54 6.63c-1.19-4.28-5.37-6.2-9.26-5.62C6.6 1.74 3.56 5.24 3.06 9.86c-.46 4.2 1.26 7.3 4.33 8.94.15.08.2.2.18.37-.04.47-.09.93-.14 1.4-.04.43.27.65.63.44.5-.29.98-.6 1.47-.9.16-.1.31-.12.49-.08.65.14 1.3.21 1.97.19 4.26-.12 8.24-3.19 9.12-7.49.3-1.47.28-2.9-.03-4.32zm-8.29 8.93c-.64.02-1.16-.5-1.16-1.13 0-.61.5-1.13 1.14-1.14.63 0 1.15.52 1.15 1.14 0 .62-.5 1.12-1.13 1.13zm3.98 0c-.63.02-1.15-.5-1.16-1.12 0-.63.51-1.14 1.14-1.15.64 0 1.15.52 1.15 1.14 0 .62-.5 1.12-1.13 1.13zm-7.96 0c-.63.02-1.15-.5-1.16-1.12-.01-.63.51-1.14 1.14-1.15.64 0 1.16.51 1.16 1.13 0 .63-.51 1.13-1.14 1.14z"/>
                        </svg>
                        Waze
                      </WazeLink>
                    </ExternalLinks>
                  )
                })()}
              </LocationHeader>
              <MiniMap
                coordinates={plot.coordinates}
                status={plot.status}
                city={plot.city}
                height="280px"
                interactive={true}
              />
            </LocationSection>
          )}

          {/* Investment Verdict */}
          {(() => {
            const verdict = calcInvestmentVerdict(plot, nearbyPlots.length > 0 ? [plot, ...nearbyPlots] : []) as InvestmentVerdictType | null
            if (!verdict) return null
            return (
              <VerdictBanner $tier={verdict.tier}>
                <VerdictIcon $color={verdict.color}>{verdict.emoji}</VerdictIcon>
                <div style={{ minWidth: 0 }}>
                  <VerdictLabel $color={verdict.color}>{verdict.label}</VerdictLabel>
                  <VerdictDesc>{verdict.description}</VerdictDesc>
                </div>
              </VerdictBanner>
            )
          })()}

          {/* Below Market Price Indicator */}
          {(() => {
            if (sizeSqM <= 0) return null
            const serverAvg = cityAvgPriceSqm
            const marketCityData = marketData?.cities?.find((c: any) => c.city === plot.city)
            const avgPsm = serverAvg || marketCityData?.avgPricePerSqm
            if (!avgPsm) return null
            if (!serverAvg && marketCityData && marketCityData.count < 3) return null
            const plotPsm = totalPrice / sizeSqM
            const diffPct = Math.round(((plotPsm - avgPsm) / avgPsm) * 100)
            if (Math.abs(diffPct) < 5) return null
            const isBelow = diffPct < 0
            return (
              <PriceIndicatorBanner $isBelow={isBelow}>
                <PriceIndicatorIcon $isBelow={isBelow}>
                  {isBelow ? '📉' : '📈'}
                </PriceIndicatorIcon>
                <div style={{ minWidth: 0 }}>
                  <PriceIndicatorTitle $isBelow={isBelow}>
                    {isBelow
                      ? `${Math.abs(diffPct)}% מתחת לממוצע ב${plot.city}`
                      : `${diffPct}% מעל הממוצע ב${plot.city}`
                    }
                  </PriceIndicatorTitle>
                  <PriceIndicatorSub>
                    ממוצע אזורי: {formatCurrency(avgPsm)}/מ״ר · חלקה זו: {formatCurrency(Math.round(plotPsm))}/מ״ר
                  </PriceIndicatorSub>
                </div>
              </PriceIndicatorBanner>
            )
          })()}

          {/* Price per sqm visual comparison */}
          {(() => {
            if (sizeSqM <= 0) return null
            const serverAvg = cityAvgPriceSqm
            const marketCityData = marketData?.cities?.find((c: any) => c.city === plot.city)
            const rawAvg = serverAvg || marketCityData?.avgPricePerSqm
            if (!rawAvg) return null
            if (!serverAvg && marketCityData && marketCityData.count < 3) return null
            const plotPsm = Math.round(totalPrice / sizeSqM)
            const avgPsm = Math.round(rawAvg)
            const maxPsm = Math.max(plotPsm, avgPsm) * 1.15
            const plotPct = (plotPsm / maxPsm) * 100
            const avgPct = (avgPsm / maxPsm) * 100
            const isBelow = plotPsm < avgPsm
            return (
              <ComparePanel>
                <CompareHeading>
                  <BarChart style={{ width: 16, height: 16, color: '#C8942A' }} />
                  <CompareTitle>מחיר למ״ר — השוואה אזורית</CompareTitle>
                </CompareHeading>
                <CompareStack>
                  <div>
                    <CompareRow>
                      <CompareLabel>חלקה זו</CompareLabel>
                      <span style={{ fontWeight: 700, color: isBelow ? '#34D399' : '#FBBF24' }}>
                        ₪{plotPsm.toLocaleString()}/מ״ר
                      </span>
                    </CompareRow>
                    <CompareBarTrack>
                      <div
                        style={{
                          height: '100%',
                          borderRadius: 9999,
                          transition: 'all 0.7s ease',
                          width: `${plotPct}%`,
                          background: isBelow
                            ? 'linear-gradient(90deg, #22C55E, #4ADE80)'
                            : 'linear-gradient(90deg, #F59E0B, #FBBF24)',
                        }}
                      />
                    </CompareBarTrack>
                  </div>
                  <div>
                    <CompareRow>
                      <CompareLabel>ממוצע {plot.city}{marketCityData?.count ? ` (${marketCityData.count} חלקות)` : ''}</CompareLabel>
                      <span style={{ fontWeight: 500, color: '#CBD5E1' }}>₪{avgPsm.toLocaleString()}/מ״ר</span>
                    </CompareRow>
                    <CompareBarTrack>
                      <div
                        style={{
                          height: '100%',
                          borderRadius: 9999,
                          transition: 'all 0.7s ease',
                          width: `${avgPct}%`,
                          background: 'rgba(100, 116, 139, 0.5)',
                        }}
                      />
                    </CompareBarTrack>
                  </div>
                </CompareStack>
                <CompareNote>
                  {isBelow
                    ? `💡 המחיר למ״ר נמוך ב-${Math.round(((avgPsm - plotPsm) / avgPsm) * 100)}% מהממוצע האזורי`
                    : `📊 המחיר למ״ר גבוה ב-${Math.round(((plotPsm - avgPsm) / avgPsm) * 100)}% מהממוצע האזורי`
                  }
                </CompareNote>
              </ComparePanel>
            )
          })()}

          {/* Auto-generated Investment Narrative */}
          {(() => {
            const score = calcInvestmentScore(plot)
            const { grade } = getScoreLabel(score) as any
            const cagrData = calcCAGR(roi, readiness) as CAGRResult | null
            const zoningName = zoningLabels[zoningStage] || zoningStage
            const dunam = formatDunam(sizeSqM)

            const introSentence = `חלקה ${plot.number} בגוש ${blockNumber} ממוקמת ב${plot.city} ומשתרעת על שטח של ${dunam} דונם (${sizeSqM.toLocaleString()} מ״ר).`
            const priceSentence = `המחיר המבוקש עומד על ${formatCurrency(totalPrice)}, שהם ${formatCurrency(Math.round(totalPrice / sizeSqM * 1000))} לדונם.`
            const roiSentence = roi > 0
              ? `השווי הצפוי לאחר השבחה: ${formatCurrency(projectedValue)} — תשואה ברוטו של +${roi}%${cagrData ? ` (כ-${cagrData.cagr}% שנתי על פני ${cagrData.years} שנים)` : ''}.`
              : null
            const zoningSentence = `החלקה נמצאת בשלב תכנוני: ${zoningName}.${readiness ? ` מוכנות משוערת לבנייה: ${readiness}.` : ''}`
            const scoreSentence = `ציון ההשקעה: ${score}/10 (${grade}).`
            const areaCtx = (plot as any).area_context ?? (plot as any).areaContext
            const nearbyDev = (plot as any).nearby_development ?? (plot as any).nearbyDevelopment

            return (
              <NarrativePanel id="section-narrative">
                <NarrativeHeading>
                  <NarrativeIconBox>
                    <FileText style={{ width: 14, height: 14, color: '#C8942A' }} />
                  </NarrativeIconBox>
                  <NarrativeTitle>סיכום השקעה</NarrativeTitle>
                </NarrativeHeading>
                <NarrativeText>
                  {introSentence} {priceSentence} {roiSentence} {zoningSentence} {scoreSentence}
                </NarrativeText>
                {(areaCtx || nearbyDev) && (
                  <NarrativeSecondary>
                    {areaCtx && <span>📍 {areaCtx} </span>}
                    {nearbyDev && <span>🏗️ {nearbyDev}</span>}
                  </NarrativeSecondary>
                )}
                {plot.description && (
                  <NarrativeDesc>{plot.description}</NarrativeDesc>
                )}
              </NarrativePanel>
            )
          })()}

          {/* Financial cards grid */}
          <FinancialGrid id="section-financial">
            <FinancialCard $gradientFrom="rgba(59, 130, 246, 0.15)" $gradientTo="rgba(59, 130, 246, 0.08)" $borderColor="rgba(59, 130, 246, 0.2)">
              <CardTopBar $gradient="linear-gradient(to right, #60A5FA, #2563EB)" />
              <CardLabel>מחיר מבוקש</CardLabel>
              <CardValue $color="#60A5FA">{formatCurrency(totalPrice)}</CardValue>
              <CardSub>{pricePerDunam} / דונם</CardSub>
            </FinancialCard>
            <FinancialCard $gradientFrom="rgba(16, 185, 129, 0.15)" $gradientTo="rgba(16, 185, 129, 0.08)" $borderColor="rgba(16, 185, 129, 0.2)">
              <CardTopBar $gradient="linear-gradient(to right, #34D399, #059669)" />
              <CardLabel>שווי צפוי</CardLabel>
              <CardValue $color="#34D399">{formatCurrency(projectedValue)}</CardValue>
              <CardSub>בסיום תהליך</CardSub>
            </FinancialCard>
            <FinancialCard $gradientFrom="rgba(200, 148, 42, 0.15)" $gradientTo="rgba(200, 148, 42, 0.08)" $borderColor="rgba(200, 148, 42, 0.2)">
              <CardTopBar $gradient="linear-gradient(to right, #C8942A, #E5B94E)" />
              <CardLabel>תשואה צפויה</CardLabel>
              <CardValue $color="#C8942A">+{roi}%</CardValue>
              {netRoi != null ? (
                <NetRoiSub title="תשואה נטו אחרי מס רכישה, היטל השבחה, מס שבח ועלויות נלוות">
                  <NetRoiLabel>נטו: </NetRoiLabel>
                  <NetRoiValue $tier={netRoi >= 50 ? 'excellent' : netRoi >= 20 ? 'good' : netRoi >= 0 ? 'ok' : 'negative'}>
                    {netRoi > 0 ? '+' : ''}{netRoi}%
                  </NetRoiValue>
                </NetRoiSub>
              ) : readiness ? (
                <CardSub>{readiness}</CardSub>
              ) : null}
            </FinancialCard>
            {/* Buy Signal / Investment Score card */}
            {buySignal ? (
              <FinancialCard
                $gradientFrom={
                  buySignal.signal === 'BUY' ? 'rgba(16, 185, 129, 0.15)'
                  : buySignal.signal === 'HOLD' ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(100, 116, 139, 0.15)'
                }
                $gradientTo={
                  buySignal.signal === 'BUY' ? 'rgba(16, 185, 129, 0.08)'
                  : buySignal.signal === 'HOLD' ? 'rgba(245, 158, 11, 0.08)'
                  : 'rgba(100, 116, 139, 0.08)'
                }
                $borderColor={
                  buySignal.signal === 'BUY' ? 'rgba(16, 185, 129, 0.2)'
                  : buySignal.signal === 'HOLD' ? 'rgba(245, 158, 11, 0.2)'
                  : 'rgba(100, 116, 139, 0.2)'
                }
              >
                <CardTopBar $gradient={
                  buySignal.signal === 'BUY' ? 'linear-gradient(to right, #34D399, #059669)'
                  : buySignal.signal === 'HOLD' ? 'linear-gradient(to right, #FBBF24, #D97706)'
                  : 'linear-gradient(to right, #94A3B8, #475569)'
                } />
                <CardLabel>אות השקעה</CardLabel>
                <CardValue $color={
                  buySignal.signal === 'BUY' ? '#34D399'
                  : buySignal.signal === 'HOLD' ? '#FBBF24'
                  : '#94A3B8'
                }>
                  {buySignal.label}
                </CardValue>
                {paybackYears != null && paybackYears > 0 ? (
                  <CardSub>החזר: ~{paybackYears} שנים</CardSub>
                ) : (
                  <CardSub>ציון {buySignal.strength}/10</CardSub>
                )}
              </FinancialCard>
            ) : (
              <FinancialCard $gradientFrom="rgba(139, 92, 246, 0.15)" $gradientTo="rgba(139, 92, 246, 0.08)" $borderColor="rgba(139, 92, 246, 0.2)">
                <CardTopBar $gradient="linear-gradient(to right, #A78BFA, #7C3AED)" />
                <CardLabel>ציון השקעה</CardLabel>
                <CardValue $color="#A78BFA">{calcInvestmentScore(plot)}/10</CardValue>
                {readiness && <CardSub>{readiness}</CardSub>}
              </FinancialCard>
            )}
          </FinancialGrid>

          {/* Calculator CTA */}
          <CalcCTA
            to={`/calculator?price=${totalPrice}&size=${sizeSqM}&zoning=${encodeURIComponent(zoningStage)}&years=${readiness?.includes('1-3') ? '2' : readiness?.includes('3-5') ? '4' : '7'}`}
          >
            <CalcIcon style={{ width: 16, height: 16, color: '#A78BFA' }} />
            <span>חשב תשואה מפורטת במחשבון ההשקעות</span>
            <ArrowRight style={{ width: 14, height: 14, color: 'rgba(167, 139, 250, 0.6)' }} />
          </CalcCTA>

          {/* Price trend chart */}
          <div style={{ marginBottom: 32 }}>
            <WidgetErrorBoundary name="מגמת מחירים">
              <Suspense fallback={<SectionSkeleton height="192px" />}>
                <PriceTrendChart totalPrice={totalPrice} sizeSqM={sizeSqM} city={plot.city} plotId={plot.id} />
              </Suspense>
            </WidgetErrorBoundary>
          </div>

          {/* Investment Projection */}
          <TimelineWrap id="section-projection">
            <WidgetErrorBoundary name="תחזית השקעה">
              <Suspense fallback={<SectionSkeleton height="224px" />}>
                <InvestmentProjection
                  totalPrice={totalPrice}
                  projectedValue={projectedValue}
                  readinessEstimate={readiness}
                  zoningStage={zoningStage}
                />
              </Suspense>
            </WidgetErrorBoundary>
          </TimelineWrap>

          {/* Investment Timeline */}
          {(() => {
            const timeline = calcInvestmentTimeline(plot) as InvestmentTimelineType | null
            if (!timeline || timeline.stages.length === 0) return null
            return (
              <TimelineWrap id="section-timeline">
                <TimelineHeader>
                  <TimelineHeaderLeft>
                    <TimelineIconBox>
                      <Clock style={{ width: 16, height: 16, color: '#818CF8' }} />
                    </TimelineIconBox>
                    <div>
                      <TimelineTitle>ציר זמן השקעה</TimelineTitle>
                      <TimelineSubtitle>מסלול תכנוני מ-{timeline.stages[0].label} עד {timeline.stages[timeline.stages.length - 1].label}</TimelineSubtitle>
                    </div>
                  </TimelineHeaderLeft>
                  <TimelineHeaderRight>
                    {timeline.remainingMonths > 0 && (
                      <TimelineRemaining>
                        <TimelineRemainingLabel>נותרו</TimelineRemainingLabel>
                        <TimelineRemainingValue>~{timeline.remainingMonths} חודשים</TimelineRemainingValue>
                      </TimelineRemaining>
                    )}
                    <TimelineProgressBig>
                      <TimelineProgressPct>{timeline.progressPct}%</TimelineProgressPct>
                      <TimelineProgressLabel>התקדמות</TimelineProgressLabel>
                    </TimelineProgressBig>
                  </TimelineHeaderRight>
                </TimelineHeader>

                <TimelineBarTrack>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: 9999,
                      transition: 'all 0.7s ease',
                      width: `${Math.max(3, timeline.progressPct)}%`,
                      background: timeline.progressPct >= 75
                        ? 'linear-gradient(90deg, #22C55E, #4ADE80)'
                        : timeline.progressPct >= 40
                          ? 'linear-gradient(90deg, #C8942A, #E5B94E)'
                          : 'linear-gradient(90deg, #6366F1, #818CF8)',
                    }}
                  />
                </TimelineBarTrack>

                <TimelineMilestones>
                  <TimelineConnector />
                  <div>
                    {timeline.stages.map((stage: TimelineStage) => {
                      const isCompleted = stage.status === 'completed'
                      const isCurrent = stage.status === 'current'
                      const isFuture = stage.status === 'future'
                      return (
                        <TimelineStageRow key={stage.key} $isCurrent={isCurrent} $isFuture={isFuture}>
                          <StageDot $status={stage.status}>
                            {isCompleted ? (
                              <CheckCircle2 style={{ width: 16, height: 16, color: '#34D399' }} />
                            ) : (
                              <span style={{ fontSize: 14 }}>{stage.icon}</span>
                            )}
                          </StageDot>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <StageLabel $status={stage.status}>{stage.label}</StageLabel>
                              {isCurrent && <CurrentPill>שלב נוכחי</CurrentPill>}
                              {isCompleted && <CompletedCheck>✓ הושלם</CompletedCheck>}
                            </div>
                            {stage.durationMonths > 0 && !isCompleted && (
                              <StageDuration>
                                ~{stage.durationMonths} חודשים {isCurrent ? '(בתהליך)' : ''}
                              </StageDuration>
                            )}
                          </div>
                        </TimelineStageRow>
                      )
                    })}
                  </div>
                </TimelineMilestones>

                {timeline.estimatedYear && timeline.remainingMonths > 0 && (
                  <TimelineEstimate>
                    <TimelineEstimateIcon>🎯</TimelineEstimateIcon>
                    <div>
                      <TimelineEstimateLabel>השלמה משוערת</TimelineEstimateLabel>
                      <TimelineEstimateValue>
                        שנת {timeline.estimatedYear} ({timeline.elapsedMonths > 0 ? `${timeline.elapsedMonths} חודשים עברו, ` : ''}{timeline.remainingMonths} נותרו)
                      </TimelineEstimateValue>
                    </div>
                  </TimelineEstimate>
                )}

                <Disclaimer>
                  * הערכות זמנים מבוססות על ממוצעי רשויות תכנון בישראל. הזמנים בפועל עשויים להשתנות.
                </Disclaimer>
              </TimelineWrap>
            )
          })()}

          {/* Two-column layout */}
          <TwoColGrid>
            <ColStack>
              {plot.description && (
                <Panel>
                  <PanelTitle>תיאור</PanelTitle>
                  <PanelText>{plot.description}</PanelText>
                </Panel>
              )}

              {areaContext && (
                <Panel>
                  <PanelTitle>הקשר אזורי</PanelTitle>
                  <PanelText>{areaContext}</PanelText>
                </Panel>
              )}

              {(() => {
                const nearbyDev = (plot as any).nearby_development ?? (plot as any).nearbyDevelopment
                if (!nearbyDev) return null
                return (
                  <NearbyDevPanel>
                    <NearbyDevHeader>
                      <NearbyDevIconBox>
                        <TrendingUp style={{ width: 14, height: 14, color: '#34D399' }} />
                      </NearbyDevIconBox>
                      <PanelTitle style={{ marginBottom: 0 }}>פיתוח בסביבה</PanelTitle>
                    </NearbyDevHeader>
                    <PanelText>{nearbyDev}</PanelText>
                  </NearbyDevPanel>
                )
              })()}

              {/* ROI Stages */}
              {roi > 0 && (
                <Panel>
                  <PanelTitle>צפי השבחה לפי שלבי תכנון</PanelTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {roiStages.map((stage: any, i: number) => {
                      const isPast = i < currentStageIndex
                      const isCurrent = i === currentStageIndex
                      const maxPrice = roiStages[roiStages.length - 1].pricePerSqM
                      const barWidth = (stage.pricePerSqM / maxPrice) * 100
                      return (
                        <RoiStageRow key={i} $isCurrent={isCurrent}>
                          <RoiStageLabel $status={isCurrent ? 'current' : isPast ? 'past' : 'future'}>
                            {stage.label}
                          </RoiStageLabel>
                          <RoiBarTrack>
                            <div
                              style={{
                                height: '100%',
                                borderRadius: 9999,
                                transition: 'all 0.3s ease',
                                width: `${barWidth}%`,
                                background: isCurrent
                                  ? 'linear-gradient(90deg, #C8942A, #E5B94E)'
                                  : isPast
                                    ? 'rgba(34,197,94,0.4)'
                                    : 'rgba(148,163,184,0.15)',
                              }}
                            />
                          </RoiBarTrack>
                          <RoiPriceLabel $status={isCurrent ? 'current' : isPast ? 'past' : 'future'}>
                            ₪{stage.pricePerSqM.toLocaleString()}/מ״ר
                          </RoiPriceLabel>
                        </RoiStageRow>
                      )
                    })}
                  </div>
                </Panel>
              )}

              {/* Documents */}
              {(() => {
                const docs: any[] | null = (plot as any).plot_documents?.length ? (plot as any).plot_documents : (plot as any).documents?.length ? (plot as any).documents : null
                if (!docs) return null
                return (
                  <DetailSection id="section-documents">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <NarrativeIconBox>
                        <FileText style={{ width: 14, height: 14, color: '#C8942A' }} />
                      </NarrativeIconBox>
                      <PanelTitle style={{ marginBottom: 0 }}>מסמכים ותוכניות</PanelTitle>
                      <DocsCountPill>{docs.length}</DocsCountPill>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {docs.map((doc: any, i: number) => {
                        if (typeof doc === 'object' && doc.url) {
                          const DocIcon = getDocIcon(doc.mime_type)
                          return (
                            <DocRow
                              key={doc.id || i}
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <DocIcon style={{ width: 20, height: 20, color: 'rgba(200, 148, 42, 0.6)', flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <DocName>{doc.name || 'מסמך'}</DocName>
                                {doc.mime_type && (
                                  <DocType>
                                    {doc.mime_type.includes('pdf') ? 'PDF' : doc.mime_type.includes('image') ? 'תמונה' : doc.mime_type.includes('spread') || doc.mime_type.includes('excel') ? 'גיליון' : 'מסמך'}
                                  </DocType>
                                )}
                              </div>
                              <Download style={{ width: 16, height: 16, color: '#64748B', flexShrink: 0 }} />
                            </DocRow>
                          )
                        }
                        return (
                          <DocRowStatic key={i}>
                            <FileText style={{ width: 20, height: 20, color: 'rgba(200, 148, 42, 0.6)', flexShrink: 0 }} />
                            <DocName>{doc}</DocName>
                          </DocRowStatic>
                        )
                      })}
                    </div>
                  </DetailSection>
                )
              })()}

              {/* Due Diligence Checklist */}
              <WidgetErrorBoundary name="רשימת בדיקת נאותות">
                <Suspense fallback={<SectionSkeleton height="160px" />}>
                  <DueDiligenceChecklist plotId={id as string} />
                </Suspense>
              </WidgetErrorBoundary>

              {/* Proximity chips */}
              <ProximityChips>
                {distanceToSea != null && (
                  <ProximityChip $borderColor="rgba(59, 130, 246, 0.15)">
                    <Waves style={{ width: 16, height: 16, color: '#60A5FA' }} /> {distanceToSea} מ׳ מהים
                  </ProximityChip>
                )}
                {distanceToPark != null && (
                  <ProximityChip $borderColor="rgba(34, 197, 94, 0.15)">
                    <TreePine style={{ width: 16, height: 16, color: '#4ADE80' }} /> {distanceToPark} מ׳ מפארק
                  </ProximityChip>
                )}
                {distanceToHospital != null && (
                  <ProximityChip $borderColor="rgba(239, 68, 68, 0.15)">
                    <Hospital style={{ width: 16, height: 16, color: '#F87171' }} /> {distanceToHospital} מ׳ מבי"ח
                  </ProximityChip>
                )}
              </ProximityChips>

              {/* Commute Times */}
              {(() => {
                const center = plotCenter(plot.coordinates)
                if (!center) return null
                const commutes = calcCommuteTimes(center.lat, center.lng) as CommuteTime[]
                if (!commutes || commutes.length === 0) return null
                return (
                  <CommutePanel>
                    <CommuteHeading>
                      <NearbyDevIconBox style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
                        <Navigation style={{ width: 14, height: 14, color: '#818CF8' }} />
                      </NearbyDevIconBox>
                      <CompareTitle>זמני נסיעה משוערים</CompareTitle>
                    </CommuteHeading>
                    <CommuteGrid>
                      {commutes.slice(0, 6).map((c: CommuteTime) => (
                        <CommuteCard key={c.city} href={c.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                          <span style={{ fontSize: 18, flexShrink: 0 }}>{c.emoji}</span>
                          <div style={{ minWidth: 0 }}>
                            <CommuteCityName>{c.city}</CommuteCityName>
                            <CommuteDuration>~{c.drivingMinutes} דק׳ · {c.distanceKm} ק״מ</CommuteDuration>
                          </div>
                        </CommuteCard>
                      ))}
                    </CommuteGrid>
                    <Disclaimer>
                      * הערכה על בסיס מרחק אווירי × 1.35. זמני נסיעה בפועל תלויים בתנועה ובנתיב.
                    </Disclaimer>
                  </CommutePanel>
                )
              })()}
            </ColStack>

            {/* Right column */}
            <ColStack>
              {/* Zoning pipeline */}
              <DetailSection id="section-planning">
                <PanelTitle>צינור תכנוני</PanelTitle>
                {readiness && (
                  <ReadinessBox>
                    <Hourglass style={{ width: 16, height: 16, color: '#C8942A' }} />
                    <span style={{ fontSize: 14, color: '#CBD5E1' }}>מוכנות:</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#C8942A' }}>{readiness}</span>
                  </ReadinessBox>
                )}
                <div>
                  {zoningPipelineStages.map((stage: any, i: number) => {
                    const isCompleted = i < currentStageIndex
                    const isCurrent = i === currentStageIndex
                    const isFuture = i > currentStageIndex
                    return (
                      <ZoningRow key={stage.key} $isCurrent={isCurrent} $isFuture={isFuture}>
                        <span style={{ fontSize: 18, width: 28, textAlign: 'center' as const }}>{stage.icon}</span>
                        <span style={{
                          fontSize: 14,
                          color: isCompleted ? '#4ADE80' : isCurrent ? '#C8942A' : '#64748B',
                          fontWeight: isCurrent ? 700 : 400,
                        }}>
                          {stage.label}
                        </span>
                        {isCompleted && <CheckCircle2 style={{ width: 14, height: 14, color: '#4ADE80', marginRight: 'auto' }} />}
                        {isCurrent && <CurrentPill style={{ marginRight: 'auto' }}>נוכחי</CurrentPill>}
                      </ZoningRow>
                    )
                  })}
                </div>
              </DetailSection>

              {/* Costs analysis */}
              {(() => {
                const txn = calcTransactionCosts(totalPrice) as TransactionCosts
                const exit = calcExitCosts(totalPrice, projectedValue) as ExitCostsType
                const holdYears = readiness?.includes('1-3') ? 2 : readiness?.includes('3-5') ? 4 : 7
                const annual = calcAnnualHoldingCosts(totalPrice, sizeSqM, zoningStage) as AnnualHoldingCosts
                const totalHolding = annual.totalAnnual * holdYears
                const totalAllCosts = txn.total + totalHolding + exit.totalExit
                const netAfterAll = (projectedValue - totalPrice) - totalAllCosts
                const trueRoi = txn.totalWithPurchase > 0 ? Math.round((netAfterAll / txn.totalWithPurchase) * 100) : 0

                return (
                  <DetailSection id="section-costs">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <DollarSign style={{ width: 16, height: 16, color: '#C8942A' }} />
                      <PanelTitle style={{ marginBottom: 0 }}>ניתוח עלויות מלא</PanelTitle>
                    </div>

                    {/* Entry costs */}
                    <div style={{ marginBottom: 16 }}>
                      <CostCategoryLabel>
                        <CostDot $color="#60A5FA" />
                        עלויות רכישה (חד-פעמי)
                      </CostCategoryLabel>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 12 }}>
                        <CostRow><CostLabel>מס רכישה (6%)</CostLabel><CostValue>{formatCurrency(txn.purchaseTax)}</CostValue></CostRow>
                        <CostRow><CostLabel>שכ״ט עו״ד (~1.75%)</CostLabel><CostValue>{formatCurrency(txn.attorneyFees)}</CostValue></CostRow>
                        <CostRow><CostLabel>שמאי מקרקעין</CostLabel><CostValue>{formatCurrency(txn.appraiserFee)}</CostValue></CostRow>
                        <CostTotal>
                          <CostTotalLabel>סה״כ כניסה</CostTotalLabel>
                          <span style={{ color: '#60A5FA' }}>{formatCurrency(txn.total)}</span>
                        </CostTotal>
                      </div>
                    </div>

                    {/* Annual holding costs */}
                    <div style={{ marginBottom: 16 }}>
                      <CostCategoryLabel>
                        <CostDot $color="#FBBF24" />
                        עלויות החזקה שנתיות
                      </CostCategoryLabel>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 12 }}>
                        <CostRow>
                          <CostLabel>ארנונה (~₪{annual.arnonaPerSqm}/מ״ר)</CostLabel>
                          <CostValue>{formatCurrency(annual.arnona)}<CostPerYear>/שנה</CostPerYear></CostValue>
                        </CostRow>
                        <CostRow>
                          <CostLabel>ניהול ותחזוקת קרקע</CostLabel>
                          <CostValue>{formatCurrency(annual.management)}<CostPerYear>/שנה</CostPerYear></CostValue>
                        </CostRow>
                        <CostTotal>
                          <CostTotalLabel>סה״כ שנתי</CostTotalLabel>
                          <span style={{ color: '#FBBF24' }}>{formatCurrency(annual.totalAnnual)}<CostPerYear>/שנה</CostPerYear></span>
                        </CostTotal>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748B' }}>
                          <span>סה״כ ל-{holdYears} שנות החזקה</span>
                          <span>{formatCurrency(totalHolding)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Exit costs */}
                    <div style={{ marginBottom: 16 }}>
                      <CostCategoryLabel>
                        <CostDot $color="#F87171" />
                        עלויות יציאה (מכירה)
                      </CostCategoryLabel>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 12 }}>
                        <CostRow><CostLabel>היטל השבחה (50%)</CostLabel><CostValue>{formatCurrency(exit.bettermentLevy)}</CostValue></CostRow>
                        <CostRow><CostLabel>מס שבח (25%)</CostLabel><CostValue>{formatCurrency(exit.capitalGains)}</CostValue></CostRow>
                        <CostRow><CostLabel>עמלת מתווך (1%)</CostLabel><CostValue>{formatCurrency(exit.agentCommission)}</CostValue></CostRow>
                        <CostTotal>
                          <CostTotalLabel>סה״כ יציאה</CostTotalLabel>
                          <span style={{ color: '#F87171' }}>{formatCurrency(exit.totalExit)}</span>
                        </CostTotal>
                      </div>
                    </div>

                    {/* Net result */}
                    <NetResultBox $positive={netAfterAll >= 0}>
                      <NetResultHeader>
                        <NetResultLabel>✨ רווח נקי (אחרי הכל)</NetResultLabel>
                        <NetResultValue $positive={netAfterAll >= 0}>{formatCurrency(netAfterAll)}</NetResultValue>
                      </NetResultHeader>
                      <NetResultSubRow>
                        <span style={{ color: '#64748B' }}>תשואה אמיתית (נטו)</span>
                        <span style={{ fontWeight: 700, color: trueRoi >= 0 ? '#34D399' : '#F87171' }}>{trueRoi > 0 ? '+' : ''}{trueRoi}%</span>
                      </NetResultSubRow>
                      <NetResultSubRow style={{ marginTop: 4 }}>
                        <span style={{ color: '#64748B' }}>סה״כ עלויות</span>
                        <span style={{ color: '#94A3B8' }}>{formatCurrency(totalAllCosts)}</span>
                      </NetResultSubRow>
                      <CostBreakdownBar>
                        <div
                          style={{ height: '100%', background: 'rgba(59, 130, 246, 0.6)', width: `${totalAllCosts > 0 ? Math.round((txn.total / totalAllCosts) * 100) : 0}%` }}
                          title={`רכישה: ${formatCurrency(txn.total)}`}
                        />
                        <div
                          style={{ height: '100%', background: 'rgba(245, 158, 11, 0.6)', width: `${totalAllCosts > 0 ? Math.round((totalHolding / totalAllCosts) * 100) : 0}%` }}
                          title={`החזקה: ${formatCurrency(totalHolding)}`}
                        />
                        <div
                          style={{ height: '100%', background: 'rgba(239, 68, 68, 0.6)', width: `${totalAllCosts > 0 ? Math.round((exit.totalExit / totalAllCosts) * 100) : 0}%` }}
                          title={`יציאה: ${formatCurrency(exit.totalExit)}`}
                        />
                      </CostBreakdownBar>
                      <CostBreakdownLegend>
                        <span>🔵 רכישה</span>
                        <span>🟡 החזקה</span>
                        <span>🔴 יציאה</span>
                      </CostBreakdownLegend>
                    </NetResultBox>

                    <Disclaimer>
                      * אומדנים בלבד. המחירים והמיסים בפועל תלויים בנסיבות ספציפיות. יש להתייעץ עם רו״ח ועו״ד.
                    </Disclaimer>
                  </DetailSection>
                )
              })()}

              {/* Neighborhood Radar */}
              <WidgetErrorBoundary name="רדאר שכונתי">
                <Suspense fallback={<SectionSkeleton height="192px" />}>
                  <NeighborhoodRadar
                    distanceToSea={distanceToSea}
                    distanceToPark={distanceToPark}
                    distanceToHospital={distanceToHospital}
                    roi={roi}
                    investmentScore={calcInvestmentScore(plot)}
                  />
                </Suspense>
              </WidgetErrorBoundary>

              {/* Mortgage Calculator */}
              <MortgageCalcSection totalPrice={totalPrice} />

              {/* Investment Benchmark */}
              <WidgetErrorBoundary name="השוואת השקעות">
                <Suspense fallback={<SectionSkeleton height="176px" />}>
                  <InvestmentBenchmark
                    totalPrice={totalPrice}
                    projectedValue={projectedValue}
                    readinessEstimate={readiness}
                  />
                </Suspense>
              </WidgetErrorBoundary>
            </ColStack>
          </TwoColGrid>

          {/* Similar Plots */}
          <div id="section-similar">
            <SimilarPlotsSection plotId={id as string} onNearbyLoaded={handleNearbyLoaded} />
          </div>

          {/* Quick Inquiry Templates */}
          <QuickInquiryWrap>
            <WidgetErrorBoundary name="תבניות פנייה">
              <Suspense fallback={<SectionSkeleton height="112px" />}>
                <QuickInquiryTemplates plot={plot} />
              </Suspense>
            </WidgetErrorBoundary>
          </QuickInquiryWrap>

          {/* Sticky CTA */}
          <StickyCTA>
            <StickyCtaInner>
              <MainCtaBtn onClick={() => setIsLeadModalOpen(true)}>
                צור קשר לפרטים מלאים
              </MainCtaBtn>
              <WACTABtn
                href={plotInquiryLink(plot)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="צור קשר ב-WhatsApp"
              >
                <MessageCircle style={{ width: 20, height: 20, color: '#fff' }} />
              </WACTABtn>
              <TelegramCTABtn
                href={plotTelegramLink(plot)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="צור קשר בטלגרם"
              >
                <svg style={{ width: 20, height: 20, color: '#fff' }} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </TelegramCTABtn>
              <IconCTABtn
                onClick={() => toggleCompare(id as string)}
                $active={compareIds.includes(id as string)}
                $activeColor="rgba(124, 58, 237, 0.3)"
                $activeBorder="rgba(139, 92, 246, 0.5)"
                aria-label={compareIds.includes(id as string) ? 'הסר מהשוואה' : 'הוסף להשוואה'}
                title={compareIds.includes(id as string) ? 'בהשוואה ✓' : 'הוסף להשוואה'}
              >
                <BarChart style={{ width: 20, height: 20, color: compareIds.includes(id as string) ? '#c4b5fd' : '#94A3B8' }} />
              </IconCTABtn>
              <IconCTABtn
                onClick={handlePrintReport}
                aria-label="הדפס דו״ח השקעה"
                title="הדפס דו״ח השקעה (PDF)"
              >
                <Printer style={{ width: 20, height: 20, color: '#94A3B8' }} />
              </IconCTABtn>
              <IconCTABtn
                onClick={handleCopyLink}
                $active={linkCopied}
                $activeColor="rgba(34, 197, 94, 0.15)"
                $activeBorder="rgba(34, 197, 94, 0.3)"
                aria-label="העתק קישור"
                title="העתק קישור לחלקה"
              >
                {linkCopied
                  ? <Check style={{ width: 20, height: 20, color: '#4ADE80' }} />
                  : <Copy style={{ width: 20, height: 20, color: '#94A3B8' }} />
                }
              </IconCTABtn>
              <HiddenSmFlex
                onClick={handleCopyInvestmentCard}
                aria-label="העתק כרטיס השקעה"
                title="העתק כרטיס השקעה (מפורט) לשיתוף"
              >
                <FileText style={{ width: 20, height: 20, color: '#94A3B8' }} />
              </HiddenSmFlex>
              <IconCTABtn
                onClick={() => navigate(`/?plot=${id}`)}
                aria-label="הצג במפה"
                title="הצג במפה (עם סימון החלקה)"
              >
                <MapPin style={{ width: 20, height: 20, color: '#C8942A' }} />
              </IconCTABtn>
            </StickyCtaInner>
            {compareIds.length > 0 && (
              <CompareIndicator>
                <CompareIndicatorLink to="/compare">
                  <GitCompareArrows style={{ width: 16, height: 16 }} />
                  השווה {compareIds.length} חלקות
                </CompareIndicatorLink>
              </CompareIndicator>
            )}
          </StickyCTA>
        </MaxWidth>
      </ContentZone>

      {/* Data Disclaimer */}
      <DisclaimerWrap>
        <Suspense fallback={null}>
          <WidgetErrorBoundary name="DataDisclaimer" silent>
            <DataDisclaimer variant="compact" lastUpdate={plot.updated_at ? new Date((plot.updated_at ?? plot.updatedAt) as string).toLocaleDateString('he-IL') : null} />
          </WidgetErrorBoundary>
        </Suspense>
      </DisclaimerWrap>

      <PublicFooter />

      {/* Floating navigation */}
      <FloatingBtns>
        <FloatingBtn
          $bg="rgba(59, 130, 246, 0.2)"
          $borderColor="rgba(59, 130, 246, 0.3)"
          onClick={() => window.history.length > 2 ? navigate(-1) : navigate(`/?plot=${id}`)}
          aria-label="חזרה למפה"
          title="חזרה למפה"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#60A5FA' }}>
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
          </svg>
        </FloatingBtn>
        {showScrollTop && (
          <FloatingBtn
            $bg="rgba(200, 148, 42, 0.2)"
            $borderColor="rgba(200, 148, 42, 0.3)"
            onClick={scrollToTop}
            aria-label="חזרה למעלה"
          >
            <ArrowUp style={{ width: 16, height: 16, color: '#C8942A' }} />
          </FloatingBtn>
        )}
      </FloatingBtns>

      {/* Mobile sticky CTA bar */}
      <Suspense fallback={null}>
        <MobilePlotActionBar
          plot={plot}
          isFavorite={favorites?.favorites?.includes(id)}
          onToggleFavorite={favorites?.toggle}
        />
      </Suspense>

      <Suspense fallback={null}>
        <LeadModal
          isOpen={isLeadModalOpen}
          onClose={() => setIsLeadModalOpen(false)}
          plot={plot}
        />
      </Suspense>

      {images.length > 0 && (
        <Suspense fallback={null}>
          <ImageLightbox
            images={images}
            initialIndex={lightboxIndex}
            isOpen={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <BackToTopButton />
      </Suspense>
    </PageWrap>
  )
}
