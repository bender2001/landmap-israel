import { useState, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import {
  Heart,
  Map,
  MapPin,
  TrendingUp,
  Trash2,
  Clock,
  GitCompareArrows,
  Share2,
  Printer,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  FileSpreadsheet,
  Eye,
  Calculator as CalcIcon,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from 'lucide-react'
import { usePlotsBatch, useRecommendations } from '../../hooks/usePlots'
import { useFavorites } from '../../hooks/useUserData'
import { statusColors, statusLabels, zoningLabels } from '../../utils/constants'
import { formatCurrency, formatPriceShort, formatRelativeTime } from '../../utils/format'
import { calcInvestmentScore, getScoreLabel, getInvestmentGrade, calcCAGR } from '../../utils/investment'
import { useMetaTags } from '../../hooks/useSEO'
import PublicNav from '../../components/PublicNav'
import PublicFooter from '../../components/PublicFooter'
import BackToTopButton from '../../components/ui/BackToTopButton'
import Breadcrumb from '../../components/ui/Breadcrumb'
import Spinner from '../../components/ui/Spinner'
import { theme, media } from '../../styles/theme'
import type { Plot } from '../../types'

/* ── Types ────────────────────────────────────────────── */

interface RecommendedPlot extends Plot {
  _roi?: number
  _recReasons?: string[]
  _distanceKm?: number
}

interface PortfolioAnalyticsProps {
  plots: Plot[]
}

interface RecommendedForYouProps {
  favoriteIds: string[]
  toggle: (id: string) => void
}

interface RecentlyViewedSectionProps {
  favorites: string[]
  toggle: (id: string) => void
}

interface SortOption {
  value: string
  label: string
  icon: LucideIcon
}

/* ── Sort options (static) ────────────────────────────── */

const sortOptions: SortOption[] = [
  { value: 'added', label: 'סדר הוספה', icon: ArrowUpDown },
  { value: 'price-asc', label: 'מחיר ↑', icon: ArrowUp },
  { value: 'price-desc', label: 'מחיר ↓', icon: ArrowDown },
  { value: 'roi-desc', label: 'תשואה ↓', icon: ArrowDown },
  { value: 'size-desc', label: 'שטח ↓', icon: ArrowDown },
  { value: 'score-desc', label: 'ציון ↓', icon: ArrowDown },
]

/* ═══════════════════════════════════════════════════════════
   Styled Components — Page-level
   ═══════════════════════════════════════════════════════════ */

const Page = styled.div`
  min-height: 100vh;
  background: ${theme.colors.bg};
  direction: rtl;
`

const PageInner = styled.div`
  padding: 112px 16px 64px;
`

const Container = styled.div`
  max-width: 80rem;
  margin: 0 auto;
`

const BreadcrumbWrap = styled.div`
  margin-bottom: 16px;
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
`

const PageIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: ${theme.radii.xl};
  background: ${theme.colors.red[50]};
  border: 1px solid ${theme.colors.red[100]};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.red[400]};
`

const PageTitleH1 = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: ${theme.colors.text};
`

const PageSubtitle = styled.p`
  font-size: 14px;
  color: ${theme.colors.textSecondary};
`

/* ─── Toolbar ─── */

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
`

const ActionBtn = styled.button<{ $bg: string; $border: string; $color: string; $hoverBg: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: ${({ $bg }) => $bg};
  border: 1px solid ${({ $border }) => $border};
  border-radius: ${theme.radii.lg};
  font-size: 14px;
  color: ${({ $color }) => $color};
  font-weight: 500;
  cursor: pointer;
  transition: all ${theme.transitions.normal};

  &:hover {
    background: ${({ $hoverBg }) => $hoverBg};
  }
`

const GhostActionBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: ${theme.colors.bgTertiary};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.lg};
  font-size: 14px;
  color: ${theme.colors.text};
  cursor: pointer;
  transition: all ${theme.transitions.normal};

  &:hover {
    border-color: ${theme.colors.primary}4D;
    color: ${theme.colors.primary};
  }
`

const SortWrap = styled.div`
  position: relative;
  margin-right: 8px;
`

const SortSelectEl = styled.select`
  appearance: none;
  background: ${theme.colors.bgTertiary};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.lg};
  font-size: 14px;
  color: ${theme.colors.text};
  padding: 10px 12px 10px 32px;
  cursor: pointer;
  transition: all ${theme.transitions.normal};

  &:hover {
    border-color: ${theme.colors.primary}4D;
  }

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary}66;
  }
`

const SortIcon = styled.div`
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: ${theme.colors.textTertiary};
  display: flex;
`

const QuickStats = styled.div`
  margin-right: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  color: ${theme.colors.textSecondary};
`

const StatDivider = styled.span`
  width: 1px;
  height: 12px;
  background: ${theme.colors.border};
`

/* ─── Grids ─── */

const PlotGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  ${media.sm} {
    grid-template-columns: repeat(2, 1fr);
  }

  ${media.lg} {
    grid-template-columns: repeat(3, 1fr);
  }
`

const RecGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;

  ${media.sm} {
    grid-template-columns: repeat(2, 1fr);
  }

  ${media.lg} {
    grid-template-columns: repeat(3, 1fr);
  }
`

/* ─── Centered loading ─── */

const CenteredPy = styled.div<{ $py?: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ $py }) => $py ?? 80}px 0;
`

const LoadingWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 0;
`

const LoadingInner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`

const LoadingText = styled.span`
  font-size: 11px;
  color: ${theme.colors.textSecondary};
`

/* ─── Empty state ─── */

const EmptyPanel = styled.div`
  background: ${theme.colors.bg};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.xl};
  padding: 48px;
  text-align: center;
  box-shadow: ${theme.shadows.card};
`

const EmptyTitle = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: ${theme.colors.text};
  margin-bottom: 8px;
`

const EmptyText = styled.p`
  color: ${theme.colors.textSecondary};
  margin-bottom: 24px;
`

const DiscoverLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: ${theme.gradients.primary};
  border-radius: ${theme.radii.lg};
  color: ${theme.colors.white};
  font-weight: 700;
  text-decoration: none;
  transition: box-shadow ${theme.transitions.normal};

  &:hover {
    box-shadow: ${theme.shadows.elevated};
  }
`

/* ═══════════════════════════════════════════════════════════
   Portfolio Analytics Styled Components
   ═══════════════════════════════════════════════════════════ */

const PortfolioWrap = styled.div`
  background: ${theme.colors.bg};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.xl};
  overflow: hidden;
  margin-bottom: 24px;
  box-shadow: ${theme.shadows.card};
`

const AccentBar = styled.div`
  height: 4px;
  background: ${theme.gradients.primary};
`

const PortfolioInner = styled.div`
  padding: 20px;
`

const PortfolioHeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
`

const IconBox = styled.div<{ $bg: string; $border: string }>`
  width: 36px;
  height: 36px;
  border-radius: ${theme.radii.lg};
  background: ${({ $bg }) => $bg};
  border: 1px solid ${({ $border }) => $border};
  display: flex;
  align-items: center;
  justify-content: center;
`

const PortfolioTitle = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: ${theme.colors.text};
`

const PortfolioSubtitle = styled.p`
  font-size: 10px;
  color: ${theme.colors.textSecondary};
`

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;

  ${media.sm} {
    grid-template-columns: repeat(4, 1fr);
  }
`

const KpiCard = styled.div<{ $accent: string }>`
  background: ${({ $accent }) => `${$accent}0A`};
  border: 1px solid ${({ $accent }) => `${$accent}26`};
  border-radius: ${theme.radii.lg};
  padding: 12px;
  text-align: center;
`

const KpiLabel = styled.div`
  font-size: 10px;
  color: ${theme.colors.textSecondary};
  margin-bottom: 2px;
`

const KpiValue = styled.div<{ $color: string }>`
  font-size: 14px;
  font-weight: 900;
  color: ${({ $color }) => $color};
`

const CagrLabel = styled.span`
  font-size: 9px;
  font-weight: 400;
  color: ${theme.colors.textSecondary};
`

const BreakdownGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  ${media.sm} {
    grid-template-columns: repeat(2, 1fr);
  }
`

const BreakdownCard = styled.div`
  background: ${theme.colors.bgSecondary};
  border: 1px solid ${theme.colors.borderLight};
  border-radius: ${theme.radii.lg};
  padding: 12px;
`

const BreakdownHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`

const BreakdownTitle = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${theme.colors.text};
  display: flex;
  align-items: center;
  gap: 6px;
`

const RiskPill = styled.span<{ $color: string }>`
  font-size: 9px;
  padding: 2px 8px;
  border-radius: ${theme.radii.full};
  font-weight: 500;
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}15`};
  border: 1px solid ${({ $color }) => `${$color}25`};
`

const BarStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const BarRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  margin-bottom: 2px;
`

const BarLabel = styled.span`
  color: ${theme.colors.textSecondary};
`

const BarValue = styled.span`
  color: ${theme.colors.text};
  font-weight: 500;
`

const ThinTrack = styled.div`
  height: 6px;
  border-radius: ${theme.radii.full};
  background: ${theme.colors.bgTertiary};
  overflow: hidden;
`

const ThinFill = styled.div<{ $width: number; $bg?: string }>`
  height: 100%;
  border-radius: ${theme.radii.full};
  width: ${({ $width }) => $width}%;
  background: ${({ $bg }) => $bg || theme.gradients.primary};
  transition: all 500ms;
`

const GradeLabel = styled.span<{ $color: string }>`
  font-weight: 700;
  color: ${({ $color }) => $color};
`

const NoDataMsg = styled.div`
  font-size: 12px;
  color: ${theme.colors.textSecondary};
  text-align: center;
  padding: 16px 0;
`

const ZoningRow = styled.div`
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const ZoningLabelEl = styled.span`
  font-size: 10px;
  color: ${theme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: 4px;
`

const ZoningPill = styled.span`
  font-size: 9px;
  color: ${theme.colors.textSecondary};
  background: ${theme.colors.bgTertiary};
  border: 1px solid ${theme.colors.borderLight};
  padding: 2px 8px;
  border-radius: ${theme.radii.md};
`

const ZoningCount = styled.span`
  font-weight: 700;
  color: ${theme.colors.text};
`

/* ═══════════════════════════════════════════════════════════
   Section Toggle Styled Components
   ═══════════════════════════════════════════════════════════ */

const SectionToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  width: 100%;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;

  &:hover h2 {
    color: ${theme.colors.primaryDark};
  }
`

const SectionToggleRecent = styled(SectionToggle)`
  margin-bottom: 20px;
`

const ToggleIconBox = styled.div<{ $bg: string; $border: string }>`
  width: 40px;
  height: 40px;
  border-radius: ${theme.radii.lg};
  background: ${({ $bg }) => $bg};
  border: 1px solid ${({ $border }) => $border};
  display: flex;
  align-items: center;
  justify-content: center;
`

const ToggleEmoji = styled.span`
  font-size: 18px;
`

const ToggleTextWrap = styled.div`
  text-align: right;
  flex: 1;
`

const ToggleTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: ${theme.colors.text};
  transition: color ${theme.transitions.normal};
`

const ToggleSubtitle = styled.p`
  font-size: 11px;
  color: ${theme.colors.textSecondary};
`

/* ═══════════════════════════════════════════════════════════
   Recommendation Card Styled Components
   ═══════════════════════════════════════════════════════════ */

const RecommendationWrap = styled.div`
  margin-bottom: 32px;
`

const RecCard = styled.div`
  background: ${theme.colors.bg};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.xl};
  overflow: hidden;
  cursor: pointer;
  transition: all ${theme.transitions.normal};
  box-shadow: ${theme.shadows.card};

  &:hover {
    border-color: ${theme.colors.purple[400]}4D;
    box-shadow: ${theme.shadows.lg};
  }
`

const PurpleBar = styled.div`
  height: 4px;
  background: linear-gradient(to right, ${theme.colors.purple[400]}99, ${theme.colors.purple[400]}66, ${theme.colors.blue[400]}4D);
`

const CardBody = styled.div`
  padding: 16px;
`

const ReasonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 10px;
`

const ReasonPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 8px;
  font-size: 9px;
  font-weight: 500;
  color: ${theme.colors.purple[600]};
  background: ${theme.colors.purple[50]};
  border: 1px solid ${theme.colors.purple[100]};
  border-radius: ${theme.radii.md};
`

const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 10px;
`

const PlotTitle = styled.h3<{ $size?: string }>`
  font-size: ${({ $size }) => $size || '14px'};
  font-weight: 700;
  color: ${theme.colors.text};
`

const PlotTitleLarge = styled(PlotTitle)`
  font-size: 16px;
`

const CityLine = styled.div<{ $size?: string }>`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: ${({ $size }) => $size || '11px'};
  color: ${theme.colors.textSecondary};
  margin-top: 2px;
`

const CityLineLg = styled(CityLine)`
  font-size: 12px;
  margin-top: 4px;
`

const DistanceNote = styled.span`
  color: ${theme.colors.purple[500]};
  opacity: 0.7;
  margin-right: 4px;
`

const FavBtn = styled.button<{ $bg: string; $border: string; $hoverBg: string; $size?: number }>`
  width: ${({ $size }) => $size || 32}px;
  height: ${({ $size }) => $size || 32}px;
  border-radius: ${theme.radii.md};
  background: ${({ $bg }) => $bg};
  border: 1px solid ${({ $border }) => $border};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background ${theme.transitions.normal};

  &:hover {
    background: ${({ $hoverBg }) => $hoverBg};
  }
`

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
`

const StatusBadge = styled.span<{ $bg: string; $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: ${theme.radii.full};
  font-size: 10px;
  font-weight: 500;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
`

const StatusDot = styled.span<{ $bg: string }>`
  width: 6px;
  height: 6px;
  border-radius: ${theme.radii.full};
  background: ${({ $bg }) => $bg};
`

const ReadinessLabelEl = styled.span`
  font-size: 10px;
  color: ${theme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: 2px;
`

const PriceRoiRow = styled.div<{ $mb?: number }>`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: ${({ $mb }) => $mb ?? 8}px;
`

const PriceLabel = styled.div<{ $size?: string }>`
  font-size: ${({ $size }) => $size || '10px'};
  color: ${theme.colors.textSecondary};
`

const PriceValue = styled.div<{ $size?: string }>`
  font-size: ${({ $size }) => $size || '16px'};
  font-weight: 700;
  color: ${theme.colors.primary};
`

const PriceValueLg = styled(PriceValue)`
  font-size: 18px;
`

const RoiWrap = styled.div`
  text-align: left;
`

const RoiInline = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

const RoiText = styled.span<{ $size?: string }>`
  font-size: ${({ $size }) => $size || '14px'};
  font-weight: 700;
  color: ${theme.colors.emerald[500]};
`

const MiniLabel = styled.div`
  font-size: 9px;
  color: ${theme.colors.textSecondary};
`

const CardFooter = styled.div<{ $pt?: number }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: ${({ $pt }) => $pt ?? 8}px;
  border-top: 1px solid ${theme.colors.borderLight};
`

const FooterMeta = styled.span<{ $size?: string }>`
  font-size: ${({ $size }) => $size || '10px'};
  color: ${theme.colors.textSecondary};
`

const FooterLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const StyledLink = styled(Link)<{ $color: string; $size?: string }>`
  font-size: ${({ $size }) => $size || '10px'};
  color: ${({ $color }) => $color};
  font-weight: 500;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 2px;

  &:hover {
    text-decoration: underline;
  }
`

const LinkSeparator = styled.span`
  color: ${theme.colors.border};
`

/* ═══════════════════════════════════════════════════════════
   Favorite Card Styled Components
   ═══════════════════════════════════════════════════════════ */

const FavCard = styled.div`
  background: ${theme.colors.bg};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.xl};
  overflow: hidden;
  transition: all ${theme.transitions.normal};
  box-shadow: ${theme.shadows.card};

  &:hover {
    border-color: ${theme.colors.primary}4D;
    box-shadow: ${theme.shadows.lg};
    transform: translateY(-2px);
  }
`

const ColorBar = styled.div<{ $color: string }>`
  height: 4px;
  background: ${({ $color }) => $color};
`

const FavCardBody = styled.div`
  padding: 16px;
`

const FavCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
`

const StatusZoningRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`

const ZoningBadge = styled.span`
  font-size: 10px;
  color: ${theme.colors.textSecondary};
  background: ${theme.colors.bgTertiary};
  padding: 2px 8px;
  border-radius: ${theme.radii.full};
`

const FavPriceRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 12px;
`

const FavFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid ${theme.colors.borderLight};
`

const FooterMetaLg = styled.span`
  font-size: 12px;
  color: ${theme.colors.textSecondary};
`

const InlineClockWrap = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-right: 8px;
`

const PriceLabelLg = styled.div`
  font-size: 12px;
  color: ${theme.colors.textSecondary};
`

const RoiLabelLg = styled.div`
  font-size: 12px;
  color: ${theme.colors.textSecondary};
`

/* ═══════════════════════════════════════════════════════════
   Recently Viewed Styled Components
   ═══════════════════════════════════════════════════════════ */

const RecentWrap = styled.div`
  margin-top: 40px;
`

const RecentCard = styled.div`
  background: ${theme.colors.bg};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.xl};
  overflow: hidden;
  opacity: 0.9;
  transition: all ${theme.transitions.normal};
  box-shadow: ${theme.shadows.sm};

  &:hover {
    border-color: ${theme.colors.blue[400]}33;
    opacity: 1;
    box-shadow: ${theme.shadows.md};
  }
`

const BlueBar = styled.div`
  height: 2px;
  background: linear-gradient(to right, ${theme.colors.blue[400]}80, ${theme.colors.blue[400]}4D);
`

const RecentCardBody = styled.div`
  padding: 14px;
`

const RecentHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 8px;
`

const ViewedAgo = styled.span`
  color: ${theme.colors.blue[400]};
  opacity: 0.7;
  margin-right: 6px;
`

const RecentPriceRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 8px;
`

const RecentFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid ${theme.colors.borderLight};
`

const RecentMeta = styled.span`
  font-size: 10px;
  color: ${theme.colors.textSecondary};
`

const RecentEmptyPanel = styled.div`
  background: ${theme.colors.bg};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.xl};
  padding: 24px;
  text-align: center;
  font-size: 14px;
  color: ${theme.colors.textSecondary};
`

/* ══════════════════════════════════════════════════════════
 * Portfolio Analytics Component
 * ════════════════════════════════════════════════════════ */
function PortfolioAnalytics({ plots }: PortfolioAnalyticsProps) {
  const analytics = useMemo(() => {
    if (!plots || plots.length < 2) return null

    let totalValue = 0
    let totalProjected = 0
    const cityBreakdown: Record<string, number> = {}
    const gradeBreakdown: Record<string, number> = { 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0 }
    const zoningBreakdownMap: Record<string, number> = {}
    let cagrSum = 0
    let cagrCount = 0

    for (const p of plots) {
      const price = p.total_price ?? p.totalPrice ?? 0
      const proj = p.projected_value ?? p.projectedValue ?? 0
      const readiness = p.readiness_estimate ?? p.readinessEstimate ?? ''
      const zoning = p.zoning_stage ?? p.zoningStage ?? 'UNKNOWN'
      const roi = price > 0 ? Math.round(((proj - price) / price) * 100) : 0

      totalValue += price
      totalProjected += proj

      const city = p.city || 'לא ידוע'
      cityBreakdown[city] = (cityBreakdown[city] || 0) + price

      const score = calcInvestmentScore(p)
      const { grade } = getInvestmentGrade(score)
      if (gradeBreakdown[grade] !== undefined) gradeBreakdown[grade]++

      const zoningLabel = zoningLabels[zoning] || zoning
      zoningBreakdownMap[zoningLabel] = (zoningBreakdownMap[zoningLabel] || 0) + 1

      const cagrData = calcCAGR(roi, readiness)
      if (cagrData) {
        cagrSum += cagrData.cagr
        cagrCount++
      }
    }

    const totalProfit = totalProjected - totalValue
    const avgRoi = totalValue > 0 ? Math.round(((totalProjected - totalValue) / totalValue) * 100) : 0
    const avgCagr = cagrCount > 0 ? Math.round((cagrSum / cagrCount) * 10) / 10 : null

    const cities = Object.entries(cityBreakdown).sort((a, b) => b[1] - a[1])
    const topCityPct = totalValue > 0 ? Math.round((cities[0][1] / totalValue) * 100) : 0
    const diversificationRisk = cities.length === 1 ? 'high' : topCityPct > 70 ? 'medium' : 'low'

    return {
      totalValue,
      totalProjected,
      totalProfit,
      avgRoi,
      avgCagr,
      cityBreakdown: cities,
      gradeBreakdown: Object.entries(gradeBreakdown).filter(([, v]) => v > 0),
      zoningBreakdown: Object.entries(zoningBreakdownMap).sort((a, b) => b[1] - a[1]),
      diversificationRisk,
      topCityPct,
      plotCount: plots.length,
    }
  }, [plots])

  if (!analytics) return null

  const gradeColors: Record<string, string> = {
    'A+': '#22C55E', 'A': '#4ADE80', 'B+': '#C8942A', 'B': '#F59E0B', 'C+': '#F97316', 'C': '#EF4444',
  }

  const riskConfig: Record<string, { label: string; color: string; emoji: string }> = {
    low: { label: 'מפוזר', color: '#22C55E', emoji: '🟢' },
    medium: { label: 'ריכוזי', color: '#F59E0B', emoji: '🟡' },
    high: { label: 'מרוכז', color: '#EF4444', emoji: '🔴' },
  }

  const risk = riskConfig[analytics.diversificationRisk]

  return (
    <PortfolioWrap>
      <AccentBar />
      <PortfolioInner>
        <PortfolioHeaderRow>
          <IconBox $bg={theme.colors.primaryLight} $border={`${theme.colors.primary}33`}>
            <TrendingUp style={{ width: 16, height: 16, color: theme.colors.primary }} />
          </IconBox>
          <div>
            <PortfolioTitle>ניתוח תיק השקעות</PortfolioTitle>
            <PortfolioSubtitle>{analytics.plotCount} חלקות · סיכום אגרגטי</PortfolioSubtitle>
          </div>
        </PortfolioHeaderRow>

        {/* KPI Cards */}
        <KpiGrid>
          <KpiCard $accent={theme.colors.blue[500]}>
            <KpiLabel>שווי תיק</KpiLabel>
            <KpiValue $color={theme.colors.blue[500]}>{formatPriceShort(analytics.totalValue)}</KpiValue>
          </KpiCard>
          <KpiCard $accent={theme.colors.emerald[500]}>
            <KpiLabel>רווח צפוי</KpiLabel>
            <KpiValue $color={theme.colors.emerald[500]}>+{formatPriceShort(analytics.totalProfit)}</KpiValue>
          </KpiCard>
          <KpiCard $accent={theme.colors.amber[500]}>
            <KpiLabel>ROI ממוצע</KpiLabel>
            <KpiValue $color={theme.colors.amber[600]}>+{analytics.avgRoi}%</KpiValue>
          </KpiCard>
          <KpiCard $accent={theme.colors.purple[500]}>
            <KpiLabel>CAGR ממוצע</KpiLabel>
            <KpiValue $color={theme.colors.purple[500]}>{analytics.avgCagr ? `${analytics.avgCagr}%` : '—'}<CagrLabel>/שנה</CagrLabel></KpiValue>
          </KpiCard>
        </KpiGrid>

        {/* City Diversification + Grade Distribution */}
        <BreakdownGrid>
          {/* City breakdown */}
          <BreakdownCard>
            <BreakdownHeader>
              <BreakdownTitle>
                <MapPin style={{ width: 12, height: 12, color: theme.colors.primary }} /> פיזור גיאוגרפי
              </BreakdownTitle>
              <RiskPill $color={risk.color}>
                {risk.emoji} {risk.label}
              </RiskPill>
            </BreakdownHeader>
            <BarStack>
              {analytics.cityBreakdown.map(([city, value]) => {
                const pct = Math.round((value / analytics.totalValue) * 100)
                return (
                  <div key={city}>
                    <BarRow>
                      <BarLabel>{city}</BarLabel>
                      <BarValue>{pct}% · {formatPriceShort(value)}</BarValue>
                    </BarRow>
                    <ThinTrack>
                      <ThinFill $width={pct} />
                    </ThinTrack>
                  </div>
                )
              })}
            </BarStack>
          </BreakdownCard>

          {/* Grade distribution */}
          <BreakdownCard>
            <BreakdownTitle style={{ marginBottom: 12 }}>
              <Heart style={{ width: 12, height: 12, color: theme.colors.primary }} /> דירוגי השקעה
            </BreakdownTitle>
            {analytics.gradeBreakdown.length > 0 ? (
              <BarStack>
                {analytics.gradeBreakdown.map(([grade, count]) => {
                  const pct = Math.round((count / analytics.plotCount) * 100)
                  const color = gradeColors[grade] || theme.colors.textTertiary
                  return (
                    <div key={grade}>
                      <BarRow>
                        <GradeLabel $color={color}>{grade}</GradeLabel>
                        <BarLabel>{count} חלקות ({pct}%)</BarLabel>
                      </BarRow>
                      <ThinTrack>
                        <ThinFill $width={pct} $bg={color} />
                      </ThinTrack>
                    </div>
                  )
                })}
              </BarStack>
            ) : (
              <NoDataMsg>אין נתונים</NoDataMsg>
            )}
          </BreakdownCard>
        </BreakdownGrid>

        {/* Zoning stage distribution */}
        {analytics.zoningBreakdown.length > 0 && (
          <ZoningRow>
            <ZoningLabelEl>📋 שלבים:</ZoningLabelEl>
            {analytics.zoningBreakdown.map(([label, count]) => (
              <ZoningPill key={label}>
                {label} <ZoningCount>({count})</ZoningCount>
              </ZoningPill>
            ))}
          </ZoningRow>
        )}
      </PortfolioInner>
    </PortfolioWrap>
  )
}

/* ══════════════════════════════════════════════════════════
 * RecommendedForYou Component
 * ════════════════════════════════════════════════════════ */
function RecommendedForYou({ favoriteIds, toggle }: RecommendedForYouProps) {
  const { data: recommendations = [], isLoading } = useRecommendations(favoriteIds) as { data: RecommendedPlot[]; isLoading: boolean }
  const [isExpanded, setIsExpanded] = useState<boolean>(true)
  const navigate = useNavigate()

  if (favoriteIds.length < 2) return null
  if (!isLoading && recommendations.length === 0) return null

  return (
    <RecommendationWrap>
      <SectionToggle onClick={() => setIsExpanded(prev => !prev)}>
        <ToggleIconBox $bg={theme.colors.purple[50]} $border={theme.colors.purple[100]}>
          <ToggleEmoji>✨</ToggleEmoji>
        </ToggleIconBox>
        <ToggleTextWrap>
          <ToggleTitle>מומלץ עבורך</ToggleTitle>
          <ToggleSubtitle>חלקות דומות למועדפים שלך שאולי פספסת</ToggleSubtitle>
        </ToggleTextWrap>
        {isExpanded
          ? <ChevronUp style={{ width: 16, height: 16, color: theme.colors.textTertiary }} />
          : <ChevronDown style={{ width: 16, height: 16, color: theme.colors.textTertiary }} />}
      </SectionToggle>

      {isExpanded && (
        isLoading ? (
          <LoadingWrap>
            <LoadingInner>
              <Spinner />
              <LoadingText>מנתח את המועדפים שלך...</LoadingText>
            </LoadingInner>
          </LoadingWrap>
        ) : (
          <RecGrid>
            {recommendations.map((plot: RecommendedPlot) => {
              const price = plot.total_price ?? plot.totalPrice ?? 0
              const projValue = plot.projected_value ?? plot.projectedValue ?? 0
              const roi = plot._roi ?? (price > 0 ? Math.round(((projValue - price) / price) * 100) : 0)
              const blockNum = plot.block_number ?? plot.blockNumber
              const sizeSqM = plot.size_sqm ?? plot.sizeSqM ?? 0
              const color = statusColors[plot.status as string]
              const readiness = plot.readiness_estimate ?? plot.readinessEstimate
              const reasons = plot._recReasons || []

              return (
                <RecCard
                  key={plot.id}
                  onClick={() => navigate(`/plot/${plot.id}`)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') navigate(`/plot/${plot.id}`) }}
                >
                  <PurpleBar />
                  <CardBody>
                    {reasons.length > 0 && (
                      <ReasonRow>
                        {reasons.map((reason: string, i: number) => (
                          <ReasonPill key={i}>{reason}</ReasonPill>
                        ))}
                      </ReasonRow>
                    )}

                    <CardHeader>
                      <div>
                        <PlotTitle>גוש {blockNum} | חלקה {plot.number}</PlotTitle>
                        <CityLine>
                          <MapPin style={{ width: 10, height: 10 }} />
                          {plot.city}
                          {plot._distanceKm != null && (
                            <DistanceNote>
                              · 📍 {plot._distanceKm < 1 ? `${Math.round(plot._distanceKm * 1000)}מ׳` : `${plot._distanceKm}ק״מ`}
                            </DistanceNote>
                          )}
                        </CityLine>
                      </div>
                      <FavBtn
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); toggle(plot.id) }}
                        $bg={theme.colors.primaryLight}
                        $border={`${theme.colors.primary}33`}
                        $hoverBg={`${theme.colors.primary}1A`}
                        title="שמור למועדפים"
                        aria-label="שמור למועדפים"
                      >
                        <Heart style={{ width: 14, height: 14, color: theme.colors.primary }} />
                      </FavBtn>
                    </CardHeader>

                    <StatusRow>
                      <StatusBadge $bg={`${color}20`} $color={color}>
                        <StatusDot $bg={color} />
                        {statusLabels[plot.status as string]}
                      </StatusBadge>
                      {readiness && (
                        <ReadinessLabelEl>
                          <Clock style={{ width: 10, height: 10 }} />
                          {readiness}
                        </ReadinessLabelEl>
                      )}
                    </StatusRow>

                    <PriceRoiRow>
                      <div>
                        <PriceLabel>מחיר</PriceLabel>
                        <PriceValue>{formatPriceShort(price)}</PriceValue>
                        {sizeSqM > 0 && (
                          <MiniLabel>
                            {formatPriceShort(Math.round(price / sizeSqM * 1000))}/דונם
                          </MiniLabel>
                        )}
                      </div>
                      <RoiWrap>
                        <PriceLabel>תשואה צפויה</PriceLabel>
                        <RoiInline>
                          <TrendingUp style={{ width: 14, height: 14, color: theme.colors.emerald[400] }} />
                          <RoiText>+{roi}%</RoiText>
                        </RoiInline>
                        {(() => {
                          const cagrData = calcCAGR(roi, readiness as string)
                          if (!cagrData) return null
                          return (
                            <MiniLabel>{cagrData.cagr}%/שנה CAGR</MiniLabel>
                          )
                        })()}
                      </RoiWrap>
                    </PriceRoiRow>

                    <CardFooter>
                      <FooterMeta>
                        {sizeSqM > 0 ? `${(sizeSqM / 1000).toFixed(1)} דונם` : ''}
                      </FooterMeta>
                      <FooterLinks>
                        <StyledLink
                          to={`/plot/${plot.id}`}
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          $color={theme.colors.purple[500]}
                        >
                          פרטים מלאים →
                        </StyledLink>
                      </FooterLinks>
                    </CardFooter>
                  </CardBody>
                </RecCard>
              )
            })}
          </RecGrid>
        )
      )}
    </RecommendationWrap>
  )
}

/* ══════════════════════════════════════════════════════════
 * Main Favorites Component
 * ════════════════════════════════════════════════════════ */
export default function Favorites() {
  useMetaTags({
    title: 'חלקות מועדפות — LandMap Israel',
    description: 'רשימת החלקות שסימנת כמועדפות. השווה, שתף והדפס את ההשקעות שמעניינות אותך.',
    url: `${window.location.origin}/favorites`,
  })
  const { favorites, toggle } = useFavorites()
  const { data: batchPlots = [], isLoading } = usePlotsBatch(favorites)
  const navigate = useNavigate()
  const [linkCopied, setLinkCopied] = useState<boolean>(false)
  const [sortBy, setSortBy] = useState<string>('added')

  const favoritePlotsUnsorted = useMemo(() => {
    if (!batchPlots.length) return []
    const plotMap = new Map(batchPlots.map((p: Plot) => [p.id, p]))
    return favorites.map((id: string) => plotMap.get(id)).filter(Boolean) as Plot[]
  }, [batchPlots, favorites])

  const favoritePlots = useMemo(() => {
    if (sortBy === 'added') return favoritePlotsUnsorted
    const sorted = [...favoritePlotsUnsorted]
    const getPrice = (p: Plot): number => p.total_price ?? p.totalPrice ?? 0
    const getSize = (p: Plot): number => p.size_sqm ?? p.sizeSqM ?? 0
    const getRoi = (p: Plot): number => {
      const price = getPrice(p)
      const proj = p.projected_value ?? p.projectedValue ?? 0
      return price > 0 ? ((proj - price) / price) * 100 : 0
    }
    switch (sortBy) {
      case 'price-asc': sorted.sort((a, b) => getPrice(a) - getPrice(b)); break
      case 'price-desc': sorted.sort((a, b) => getPrice(b) - getPrice(a)); break
      case 'roi-desc': sorted.sort((a, b) => getRoi(b) - getRoi(a)); break
      case 'size-desc': sorted.sort((a, b) => getSize(b) - getSize(a)); break
      case 'score-desc': sorted.sort((a, b) => calcInvestmentScore(b) - calcInvestmentScore(a)); break
    }
    return sorted
  }, [favoritePlotsUnsorted, sortBy])

  const handleCompare = useCallback(() => {
    const ids = favoritePlots.slice(0, 3).map((p: Plot) => p.id).join(',')
    if (ids) navigate(`/compare?plots=${ids}`)
  }, [favoritePlots, navigate])

  const handleShare = useCallback(() => {
    const lines = ['❤️ חלקות מועדפות — LandMap Israel\n']
    favoritePlots.forEach((p: Plot, i: number) => {
      const bn = p.block_number ?? p.blockNumber
      const price = p.total_price ?? p.totalPrice
      const proj = p.projected_value ?? p.projectedValue
      const roi = price && price > 0 ? Math.round(((proj ?? 0) - price) / price * 100) : 0
      lines.push(`${i + 1}. גוש ${bn} חלקה ${p.number} (${p.city})`)
      lines.push(`   ${formatPriceShort(price ?? 0)} · +${roi}% ROI`)
    })
    lines.push(`\n🔗 ${window.location.origin}`)
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank')
  }, [favoritePlots])

  const handlePrint = useCallback(() => {
    const pw = window.open('', '_blank')
    if (!pw) return
    const rows = favoritePlots.map((p: Plot) => {
      const bn = p.block_number ?? p.blockNumber
      const price = p.total_price ?? p.totalPrice ?? 0
      const proj = p.projected_value ?? p.projectedValue ?? 0
      const size = p.size_sqm ?? p.sizeSqM ?? 0
      const roi = price > 0 ? Math.round((proj - price) / price * 100) : 0
      const score = calcInvestmentScore(p)
      return { bn, number: p.number, city: p.city, price, proj, size, roi, score, status: statusLabels[p.status as string] || p.status }
    })
    pw.document.write(`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8">
      <title>חלקות מועדפות — LandMap Israel</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.5; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        .subtitle { color: #666; font-size: 13px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f0f0f0; padding: 8px 10px; text-align: right; font-size: 12px; border: 1px solid #ddd; }
        td { padding: 8px 10px; text-align: right; font-size: 13px; border: 1px solid #eee; }
        tr:nth-child(even) { background: #fafafa; }
        .footer { margin-top: 30px; text-align: center; color: #aaa; font-size: 10px; border-top: 1px solid #eee; padding-top: 12px; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <h1>❤️ חלקות מועדפות</h1>
      <div class="subtitle">${rows.length} חלקות • ${new Date().toLocaleDateString('he-IL')}</div>
      <table><thead><tr><th>#</th><th>חלקה</th><th>עיר</th><th>מחיר</th><th>שטח</th><th>תשואה</th><th>ציון</th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr>
        <td>${i + 1}</td><td>גוש ${r.bn} / ${r.number}</td><td>${r.city}</td>
        <td>${formatCurrency(r.price)}</td><td>${(r.size / 1000).toFixed(1)} דונם</td>
        <td>+${r.roi}%</td><td>${r.score}/10</td>
      </tr>`).join('')}</tbody></table>
      <div class="footer">LandMap Israel — מפת קרקעות להשקעה • ${new Date().toLocaleDateString('he-IL')}</div>
    </body></html>`)
    pw.document.close()
    setTimeout(() => pw.print(), 300)
  }, [favoritePlots])

  const handleExportCsv = useCallback(() => {
    const BOM = '\uFEFF'
    const headers = ['גוש', 'חלקה', 'עיר', 'מחיר (₪)', 'שווי צפוי (₪)', 'תשואה (%)', 'שטח (מ"ר)', 'מחיר/מ"ר (₪)', 'ציון השקעה', 'סטטוס', 'ייעוד', 'מוכנות']
    const csvRows = favoritePlots.map((p: Plot) => {
      const price = p.total_price ?? p.totalPrice ?? 0
      const proj = p.projected_value ?? p.projectedValue ?? 0
      const size = p.size_sqm ?? p.sizeSqM ?? 0
      const roi = price > 0 ? Math.round(((proj - price) / price) * 100) : 0
      const ppsqm = size > 0 ? Math.round(price / size) : 0
      return [
        p.block_number ?? p.blockNumber,
        p.number,
        p.city,
        price,
        proj,
        roi,
        size,
        ppsqm,
        calcInvestmentScore(p),
        statusLabels[p.status as string] || p.status,
        zoningLabels[p.zoning_stage ?? p.zoningStage as string] || '',
        p.readiness_estimate ?? p.readinessEstimate ?? '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    })
    const csv = BOM + headers.join(',') + '\n' + csvRows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `landmap-favorites-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [favoritePlots])

  return (
    <Page>
      <PublicNav />

      <PageInner>
        <Container>
          <BreadcrumbWrap>
            <Breadcrumb
              items={[
                { label: 'מפה', to: '/' },
                { label: 'מועדפים' },
              ]}
            />
          </BreadcrumbWrap>
          <HeaderRow>
            <PageIcon>
              <Heart style={{ width: 24, height: 24 }} />
            </PageIcon>
            <div>
              <PageTitleH1>מועדפים</PageTitleH1>
              <PageSubtitle>
                {favoritePlots.length > 0
                  ? `${favoritePlots.length} חלקות שמורות`
                  : 'לא שמרת חלקות עדיין'
                }
              </PageSubtitle>
            </div>
          </HeaderRow>

          {/* Action toolbar */}
          {!isLoading && favoritePlots.length > 0 && (
            <Toolbar>
              {favoritePlots.length >= 2 && (
                <ActionBtn
                  onClick={handleCompare}
                  $bg={theme.colors.primaryLight}
                  $border={`${theme.colors.primary}33`}
                  $color={theme.colors.primary}
                  $hoverBg={`${theme.colors.primary}1A`}
                >
                  <GitCompareArrows style={{ width: 16, height: 16 }} />
                  השווה {Math.min(favoritePlots.length, 3)} חלקות
                </ActionBtn>
              )}
              <ActionBtn
                onClick={handleShare}
                $bg="#25D3661A"
                $border="#25D36633"
                $color="#25D366"
                $hoverBg="#25D36633"
              >
                <Share2 style={{ width: 16, height: 16 }} />
                שתף ב-WhatsApp
              </ActionBtn>
              <GhostActionBtn onClick={handlePrint}>
                <Printer style={{ width: 16, height: 16 }} />
                הדפס
              </GhostActionBtn>
              <GhostActionBtn onClick={handleExportCsv}>
                <FileSpreadsheet style={{ width: 16, height: 16 }} />
                CSV
              </GhostActionBtn>
              <SortWrap>
                <SortSelectEl
                  value={sortBy}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value)}
                >
                  {sortOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </SortSelectEl>
                <SortIcon>
                  <ArrowUpDown style={{ width: 14, height: 14 }} />
                </SortIcon>
              </SortWrap>
              <QuickStats>
                <span>💰 סה״כ {formatPriceShort(favoritePlots.reduce((s: number, p: Plot) => s + (p.total_price ?? p.totalPrice ?? 0), 0))}</span>
                <StatDivider />
                <span>📈 ממוצע +{favoritePlots.length > 0 ? Math.round(favoritePlots.reduce((s: number, p: Plot) => {
                  const pr = p.total_price ?? p.totalPrice ?? 0
                  const pj = p.projected_value ?? p.projectedValue ?? 0
                  return s + (pr > 0 ? ((pj - pr) / pr) * 100 : 0)
                }, 0) / favoritePlots.length) : 0}% ROI</span>
              </QuickStats>
            </Toolbar>
          )}

          {/* Portfolio Analytics */}
          {!isLoading && favoritePlots.length >= 2 && (
            <PortfolioAnalytics plots={favoritePlots} />
          )}

          {isLoading ? (
            <CenteredPy>
              <Spinner />
            </CenteredPy>
          ) : favoritePlots.length === 0 ? (
            <EmptyPanel>
              <Heart style={{ width: 64, height: 64, color: theme.colors.textTertiary, display: 'block', margin: '0 auto 16px' }} />
              <EmptyTitle>אין חלקות מועדפות</EmptyTitle>
              <EmptyText>לחצו על לב ליד חלקה כדי לשמור אותה כאן</EmptyText>
              <DiscoverLink to="/">
                <Map style={{ width: 20, height: 20 }} />
                גלו חלקות במפה
              </DiscoverLink>
            </EmptyPanel>
          ) : (
            <PlotGrid>
              {favoritePlots.map((plot: Plot) => {
                const price = plot.total_price ?? plot.totalPrice
                const projValue = plot.projected_value ?? plot.projectedValue
                const roi = Math.round(((projValue ?? 0) - (price ?? 0)) / (price ?? 1) * 100)
                const blockNum = plot.block_number ?? plot.blockNumber
                const sizeSqm = plot.size_sqm ?? plot.sizeSqM
                const color = statusColors[plot.status as string]
                const readiness = plot.readiness_estimate ?? plot.readinessEstimate

                return (
                  <FavCard key={plot.id}>
                    <ColorBar $color={color} />
                    <FavCardBody>
                      <FavCardHeader>
                        <div>
                          <PlotTitleLarge>גוש {blockNum} | חלקה {plot.number}</PlotTitleLarge>
                          <CityLineLg>
                            <MapPin style={{ width: 12, height: 12 }} />
                            {plot.city}
                          </CityLineLg>
                        </div>
                        <FavBtn
                          onClick={() => toggle(plot.id)}
                          $bg={theme.colors.red[50]}
                          $border={theme.colors.red[100]}
                          $hoverBg={theme.colors.red[100]}
                          title="הסר מהמועדפים"
                        >
                          <Trash2 style={{ width: 14, height: 14, color: theme.colors.red[400] }} />
                        </FavBtn>
                      </FavCardHeader>

                      <StatusZoningRow>
                        <StatusBadge $bg={`${color}20`} $color={color}>
                          <StatusDot $bg={color} />
                          {statusLabels[plot.status as string]}
                        </StatusBadge>
                        <ZoningBadge>
                          {zoningLabels[plot.zoning_stage ?? plot.zoningStage as string]}
                        </ZoningBadge>
                      </StatusZoningRow>

                      <FavPriceRow>
                        <div>
                          <PriceLabelLg>מחיר</PriceLabelLg>
                          <PriceValueLg>{formatCurrency(price ?? 0)}</PriceValueLg>
                        </div>
                        <RoiWrap>
                          <RoiLabelLg>תשואה</RoiLabelLg>
                          <RoiInline>
                            <TrendingUp style={{ width: 14, height: 14, color: theme.colors.emerald[400] }} />
                            <RoiText>+{roi}%</RoiText>
                          </RoiInline>
                        </RoiWrap>
                      </FavPriceRow>

                      <FavFooter>
                        <FooterMetaLg>
                          {sizeSqm?.toLocaleString()} מ"ר
                          {readiness && (
                            <InlineClockWrap>
                              <Clock style={{ width: 12, height: 12 }} />
                              {readiness}
                            </InlineClockWrap>
                          )}
                        </FooterMetaLg>
                        <FooterLinks>
                          <StyledLink
                            to={`/plot/${plot.id}`}
                            $color={theme.colors.primary}
                            $size="12px"
                          >
                            פרטים מלאים
                          </StyledLink>
                          <LinkSeparator>|</LinkSeparator>
                          <StyledLink
                            to={`/?plot=${plot.id}`}
                            $color={theme.colors.blue[400]}
                            $size="12px"
                          >
                            במפה
                          </StyledLink>
                          <LinkSeparator>|</LinkSeparator>
                          <StyledLink
                            to={`/calculator?price=${price}&size=${sizeSqm || ''}&zoning=${plot.zoning_stage ?? plot.zoningStage ?? ''}`}
                            $color={theme.colors.purple[500]}
                            $size="12px"
                            title="חשב תשואה במחשבון"
                          >
                            <CalcIcon style={{ width: 12, height: 12 }} />
                            חשב
                          </StyledLink>
                        </FooterLinks>
                      </FavFooter>
                    </FavCardBody>
                  </FavCard>
                )
              })}
            </PlotGrid>
          )}

          {!isLoading && favorites.length >= 2 && (
            <RecommendedForYou favoriteIds={favorites} toggle={toggle} />
          )}

          <RecentlyViewedSection favorites={favorites} toggle={toggle} />
        </Container>
      </PageInner>

      <BackToTopButton />
      <PublicFooter />
    </Page>
  )
}

/* ══════════════════════════════════════════════════════════
 * RecentlyViewedSection Component
 * ════════════════════════════════════════════════════════ */
function RecentlyViewedSection({ favorites, toggle }: RecentlyViewedSectionProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true)

  const recentIds = useMemo(() => {
    try {
      const ids: string[] = JSON.parse(localStorage.getItem('landmap_recently_viewed') || '[]')
      const favSet = new Set(favorites)
      return ids.filter((id: string) => !favSet.has(id)).slice(0, 6)
    } catch { return [] }
  }, [favorites])

  const viewTimestamps = useMemo(() => {
    try {
      const store: Record<string, { lastViewed?: number }> = JSON.parse(localStorage.getItem('landmap_view_counts') || '{}')
      const map = new Map<string, number>()
      for (const [id, entry] of Object.entries(store)) {
        if (entry.lastViewed) map.set(id, entry.lastViewed)
      }
      return map
    } catch { return new Map<string, number>() }
  }, [])

  const { data: recentPlots = [], isLoading } = usePlotsBatch(recentIds)

  const sortedPlots = useMemo(() => {
    if (!recentPlots.length) return []
    return [...recentPlots].sort((a: Plot, b: Plot) => {
      const tsA = viewTimestamps.get(a.id) || 0
      const tsB = viewTimestamps.get(b.id) || 0
      return tsB - tsA
    })
  }, [recentPlots, viewTimestamps])

  if (recentIds.length === 0) return null

  return (
    <RecentWrap>
      <SectionToggleRecent onClick={() => setIsExpanded(prev => !prev)}>
        <ToggleIconBox $bg={theme.colors.blue[50]} $border={theme.colors.blue[100]}>
          <Eye style={{ width: 20, height: 20, color: theme.colors.blue[400] }} />
        </ToggleIconBox>
        <ToggleTextWrap>
          <ToggleTitle>נצפו לאחרונה</ToggleTitle>
          <ToggleSubtitle>חלקות שצפית בהן אך לא שמרת</ToggleSubtitle>
        </ToggleTextWrap>
        {isExpanded
          ? <ChevronUp style={{ width: 16, height: 16, color: theme.colors.textTertiary }} />
          : <ChevronDown style={{ width: 16, height: 16, color: theme.colors.textTertiary }} />}
      </SectionToggleRecent>

      {isExpanded && (
        isLoading ? (
          <LoadingWrap>
            <Spinner />
          </LoadingWrap>
        ) : sortedPlots.length === 0 ? (
          <RecentEmptyPanel>
            <Eye style={{ width: 32, height: 32, color: theme.colors.textTertiary, display: 'block', margin: '0 auto 8px' }} />
            הנתונים נטענים...
          </RecentEmptyPanel>
        ) : (
          <RecGrid>
            {sortedPlots.map((plot: Plot) => {
              const price = plot.total_price ?? plot.totalPrice
              const projValue = plot.projected_value ?? plot.projectedValue
              const roi = (price ?? 0) > 0 ? Math.round(((projValue ?? 0) - (price ?? 0)) / (price ?? 1) * 100) : 0
              const blockNum = plot.block_number ?? plot.blockNumber
              const sizeSqM = plot.size_sqm ?? plot.sizeSqM
              const color = statusColors[plot.status as string]
              const lastViewed = viewTimestamps.get(plot.id)
              const viewedAgo = lastViewed ? formatRelativeTime(new Date(lastViewed).toISOString()) : null
              const zoning = plot.zoning_stage ?? plot.zoningStage

              return (
                <RecentCard key={plot.id}>
                  <BlueBar />
                  <RecentCardBody>
                    <RecentHeader>
                      <div>
                        <PlotTitle>גוש {blockNum} | חלקה {plot.number}</PlotTitle>
                        <CityLine>
                          <MapPin style={{ width: 10, height: 10 }} />
                          {plot.city}
                          {viewedAgo && (
                            <ViewedAgo>· 👁 {viewedAgo}</ViewedAgo>
                          )}
                        </CityLine>
                      </div>
                      <FavBtn
                        onClick={() => toggle(plot.id)}
                        $bg={theme.colors.primaryLight}
                        $border={`${theme.colors.primary}33`}
                        $hoverBg={`${theme.colors.primary}1A`}
                        $size={28}
                        title="שמור למועדפים"
                      >
                        <Heart style={{ width: 12, height: 12, color: theme.colors.primary }} />
                      </FavBtn>
                    </RecentHeader>

                    <RecentPriceRow>
                      <div>
                        <PriceLabel>מחיר</PriceLabel>
                        <PriceValue $size="14px">{formatPriceShort(price ?? 0)}</PriceValue>
                      </div>
                      <RoiWrap>
                        <RoiInline>
                          <TrendingUp style={{ width: 12, height: 12, color: theme.colors.emerald[400] }} />
                          <RoiText $size="12px">+{roi}%</RoiText>
                        </RoiInline>
                      </RoiWrap>
                    </RecentPriceRow>

                    <RecentFooter>
                      <RecentMeta>
                        {sizeSqM ? `${(sizeSqM / 1000).toFixed(1)} דונם` : ''}
                        {zoning && <span style={{ marginRight: 6 }}>· {zoningLabels[zoning as string]?.split(' ')[0] || ''}</span>}
                      </RecentMeta>
                      <FooterLinks>
                        <StyledLink
                          to={`/plot/${plot.id}`}
                          $color={theme.colors.blue[400]}
                        >
                          פרטים
                        </StyledLink>
                        <StyledLink
                          to={`/calculator?price=${price}&size=${sizeSqM || ''}&zoning=${zoning || ''}`}
                          $color={theme.colors.primary}
                          title="חשב תשואה במחשבון"
                        >
                          <CalcIcon style={{ width: 10, height: 10 }} />
                          חשב
                        </StyledLink>
                      </FooterLinks>
                    </RecentFooter>
                  </RecentCardBody>
                </RecentCard>
              )
            })}
          </RecGrid>
        )
      )}
    </RecentWrap>
  )
}
