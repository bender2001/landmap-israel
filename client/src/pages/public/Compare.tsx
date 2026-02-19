import { useMemo, useState, useCallback, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import styled, { css } from 'styled-components'
import {
  BarChart3,
  X,
  Map,
  MapPin,
  Waves,
  TreePine,
  Hospital,
  TrendingUp,
  Award,
  Clock,
  Trophy,
  Crown,
  Share2,
  Printer,
  Check,
  Copy,
  Download,
  DollarSign,
  FileText,
} from 'lucide-react'
import { usePlotsBatch } from '../../hooks/usePlots'
import { statusColors, statusLabels, zoningLabels } from '../../utils/constants'
import { formatCurrency, formatMonthlyPayment } from '../../utils/format'
import { calcInvestmentScore, calcMonthlyPayment, calcCAGR } from '../../utils/investment'
import { getPlotPrice, getPlotProjectedValue, getPlotSize, getPlotReadiness, calcTransactionCosts, calcExitCosts } from '../../utils/plot'
import { useMetaTags } from '../../hooks/useSEO'
import PublicNav from '../../components/PublicNav'
import PublicFooter from '../../components/PublicFooter'
import BackToTopButton from '../../components/ui/BackToTopButton'
import Breadcrumb from '../../components/ui/Breadcrumb'
import Spinner from '../../components/ui/Spinner'
import { media } from '../../styles/theme'
import { PageWrapper } from '../../styles/shared'
import type { Plot, CAGRResult } from '../../types'

/* ─── Interfaces / Types ────────────────────────────────────────── */

interface PlotFinancials {
  price: number
  projected: number
  sizeSqM: number
  roi: number
  readiness: string
  purchaseTax: number
  attorneyFees: number
  totalInvestment: number
  grossProfit: number
  bettermentLevy: number
  capitalGains: number
  netProfit: number
  netRoi: number
  cagr: CAGRResult | null
}

interface NetProfitAnalysisProps {
  plots: Plot[]
}

interface CompareBarChartProps {
  plots: Plot[]
  label: string
  getter: (plot: Plot) => number | null | undefined
  formatter?: (val: number) => string
  unit?: string
  mode?: 'higher-better' | 'lower-better'
}

interface CompareRadarProps {
  plots: Plot[]
}

interface WinnerSummaryProps {
  plots: Plot[]
}

interface RiskReturnScatterProps {
  plots: Plot[]
}

interface CompareCellProps {
  value?: string | number | null
  highlight?: boolean
}

/* ─── Constants ─────────────────────────────────────────────────── */

const PLOT_COLORS = ['#3B82F6', '#22C55E', '#F59E0B']

/* ─── Styled Components ─────────────────────────────────────────── */

/* -- Layout -- */

const ComparePageWrapper = styled(PageWrapper)`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.bg};
  direction: rtl;
`

const ContentArea = styled.div`
  padding: 112px 16px 64px;
`

const ContentContainer = styled.div`
  max-width: 960px;
  margin: 0 auto;
`

/* -- Header -- */

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
`

const HeaderIconBox = styled.div`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.radii.xxl};
  background: ${({ theme }) => theme.colors.primaryLight};
  border: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
`

const HeaderTextBlock = styled.div`
  flex: 1;
`

const HeaderTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`

const HeaderSubtitle = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
`

/* -- Action bar -- */

const ActionsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const ActionButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: ${({ theme }) => theme.radii.lg};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.normal};

  ${({ $active, theme }) =>
    $active
      ? css`
          background: ${theme.colors.emerald[50]};
          border: 1px solid ${theme.colors.emerald[200]};
          color: ${theme.colors.emerald[600]};
        `
      : css`
          background: ${theme.colors.bgSecondary};
          border: 1px solid ${theme.colors.border};
          color: ${theme.colors.textSecondary};
          &:hover {
            background: ${theme.colors.bgTertiary};
            border-color: ${theme.colors.primary};
            color: ${theme.colors.primary};
          }
        `}
`

const ActionButtonLabel = styled.span`
  display: none;
  ${media.sm} {
    display: inline;
  }
`

const WhatsAppLink = styled.a`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(37, 211, 102, 0.08);
  border: 1px solid rgba(37, 211, 102, 0.2);
  border-radius: ${({ theme }) => theme.radii.lg};
  transition: all ${({ theme }) => theme.transitions.normal};
  &:hover {
    background: rgba(37, 211, 102, 0.16);
  }
`

/* -- Loading & empty states -- */

const LoadingWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
`

const EmptyPanel = styled.div`
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 48px;
  text-align: center;
`

const EmptyIcon = styled(BarChart3)`
  width: 64px;
  height: 64px;
  color: ${({ theme }) => theme.colors.slate[300]};
  margin: 0 auto 16px;
`

const EmptyTitle = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 8px;
`

const EmptyDesc = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 24px;
`

const BackToMapLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: ${({ theme }) => theme.gradients.primary};
  border-radius: ${({ theme }) => theme.radii.lg};
  color: ${({ theme }) => theme.colors.white};
  font-weight: 700;
  text-decoration: none;
  transition: box-shadow ${({ theme }) => theme.transitions.normal};
  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.lg};
  }
`

/* -- Card panel -- */

const CardPanel = styled.div`
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  margin-bottom: 24px;
`

const CardPanelPadded = styled(CardPanel)`
  padding: 24px;
`

/* -- Section header with icon -- */

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
`

const SectionIconBox = styled.div<{ $bg: string; $border: string }>`
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ $bg }) => $bg};
  border: 1px solid ${({ $border }) => $border};
  display: flex;
  align-items: center;
  justify-content: center;
`

const SectionTitleText = styled.h3`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`

const SectionSubtitle = styled.p`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.textTertiary};
`

/* -- Net Profit Analysis -- */

const ProfitGrid = styled.div<{ $count: number }>`
  display: grid;
  gap: 16px;
  grid-template-columns: ${({ $count }) =>
    $count === 3 ? 'repeat(3, 1fr)' : $count === 2 ? 'repeat(2, 1fr)' : '1fr'};

  ${media.mobile} {
    grid-template-columns: 1fr;
  }
`

const ProfitCard = styled.div<{ $isBest: boolean }>`
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 16px;
  border: 1px solid
    ${({ $isBest, theme }) =>
      $isBest ? theme.colors.emerald[200] : theme.colors.borderLight};
  background: ${({ $isBest, theme }) =>
    $isBest ? theme.colors.emerald[50] : theme.colors.bgSecondary};
  transition: all ${({ theme }) => theme.transitions.normal};
`

const ProfitCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderLight};
`

const PlotDot = styled.span<{ $color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  flex-shrink: 0;
  background: ${({ $color }) => $color};
`

const PlotLabel = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const BestBadge = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.colors.emerald[600]};
  background: ${({ theme }) => theme.colors.emerald[100]};
  padding: 2px 6px;
  border-radius: 9999px;
  margin-right: auto;
`

const LineItemRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11px;
`

const LineItemStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
`

const LineItemLabel = styled.span`
  color: ${({ theme }) => theme.colors.textTertiary};
`

const LineItemValue = styled.span<{ $color?: string }>`
  color: ${({ $color, theme }) => $color || theme.colors.text};
`

const TotalRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 500;
  padding-top: 4px;
  border-top: 1px solid ${({ theme }) => theme.colors.borderLight};
`

const TotalLabel = styled.span`
  color: ${({ theme }) => theme.colors.primary};
`

const TotalValue = styled.span`
  color: ${({ theme }) => theme.colors.primary};
`

const BottomLineBox = styled.div<{ $positive: boolean }>`
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 12px;
  background: ${({ $positive, theme }) =>
    $positive ? theme.colors.emerald[50] : theme.colors.red[50]};
`

const BottomLineHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
`

const BottomLineLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`

const BottomLineAmount = styled.span<{ $positive: boolean }>`
  font-size: 18px;
  font-weight: 900;
  color: ${({ $positive, theme }) =>
    $positive ? theme.colors.emerald[600] : theme.colors.red[600]};
`

const BottomLineDetail = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 10px;
`

const BottomLineDetailLabel = styled.span`
  color: ${({ theme }) => theme.colors.textTertiary};
`

const BottomLineDetailValue = styled.span<{ $highlight?: boolean }>`
  font-weight: 700;
  color: ${({ $highlight, theme }) =>
    $highlight ? theme.colors.primary : theme.colors.textSecondary};
`

const Disclaimer = styled.p`
  font-size: 9px;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin-top: 12px;
  text-align: center;
`

/* -- Bar Chart -- */

const BarChartWrap = styled.div`
  margin-bottom: 24px;
`

const BarChartLabel = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 8px;
`

const BarChartStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const BarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const BarPlotId = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.textTertiary};
  width: 64px;
  text-align: left;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const BarTrack = styled.div`
  flex: 1;
  height: 24px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bgTertiary};
  overflow: hidden;
  position: relative;
`

const BarFill = styled.div<{ $width: number; $color: string; $isBest: boolean }>`
  height: 100%;
  border-radius: ${({ theme }) => theme.radii.md};
  transition: all 0.7s ease-out;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 8px;
  width: ${({ $width }) => Math.max($width, 8)}%;
  background: ${({ $color }) => `linear-gradient(90deg, ${$color}30, ${$color}90)`};
  border-right: ${({ $isBest, $color }) => ($isBest ? `3px solid ${$color}` : 'none')};
`

const BarValueText = styled.span<{ $isBest: boolean }>`
  font-size: 10px;
  font-weight: 700;
  color: ${({ $isBest, theme }) =>
    $isBest ? theme.colors.text : theme.colors.textSecondary};
`

const BestCrown = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 700;
  flex-shrink: 0;
`

/* -- Radar Chart -- */

const RadarSvg = styled.svg`
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
  display: block;
`

const RadarLabel = styled.text`
  font-size: 9px;
  fill: ${({ theme }) => theme.colors.textSecondary};
`

const LegendRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 12px;
`

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const LegendDot = styled.span<{ $color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  background: ${({ $color }) => $color};
`

const LegendText = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.textSecondary};
`

/* -- Winner Summary -- */

const WinnerPanel = styled(CardPanelPadded)`
  border-color: ${({ theme }) => theme.colors.primary};
  border-width: 1px;
  padding: 20px;
`

const WinnerHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
`

const WinnerIconBox = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.primaryLight};
  border: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
`

const WinnerTitle = styled.h3`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`

const WinnerSubtitle = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textSecondary};
`

const WinnerChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const WinnerChip = styled.div<{ $isWinner: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radii.lg};
  font-size: 12px;

  ${({ $isWinner, theme }) =>
    $isWinner
      ? css`
          background: ${theme.colors.primaryLight};
          border: 1px solid ${theme.colors.primary}30;
          color: ${theme.colors.primary};
        `
      : css`
          background: ${theme.colors.bgSecondary};
          border: 1px solid ${theme.colors.borderLight};
          color: ${theme.colors.textSecondary};
        `}
`

const ChipName = styled.span`
  font-weight: 500;
`

const ChipCount = styled.span`
  font-size: 10px;
  opacity: 0.7;
`

const ChipCategories = styled.span`
  font-size: 9px;
  opacity: 0.5;
`

/* -- Risk/Return Scatter -- */

const ScatterSvg = styled.svg`
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  display: block;
`

const ScatterAxisLabel = styled.text`
  font-size: 9px;
  fill: ${({ theme }) => theme.colors.textSecondary};
`

const ScatterTick = styled.text`
  font-size: 8px;
  fill: ${({ theme }) => theme.colors.textTertiary};
`

const ScatterQuadLabel = styled.text`
  font-size: 7px;
`

const ScatterPointLabel = styled.text`
  font-size: 8px;
  font-weight: 700;
`

const ScatterLegendRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 8px;
`

const ScatterLegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: ${({ theme }) => theme.colors.textSecondary};
`

const ScatterLegendDot = styled.span<{ $color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  flex-shrink: 0;
  background: ${({ $color }) => $color};
`

const ScatterLegendMeta = styled.span`
  color: ${({ theme }) => theme.colors.textTertiary};
`

/* -- Comparison table -- */

const TablePanel = styled.div`
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  overflow: hidden;
  margin-bottom: 24px;
`

const TopBar = styled.div`
  height: 3px;
  background: ${({ theme }) => theme.gradients.primary};
`

const TableScroll = styled.div`
  overflow-x: auto;
`

const Table = styled.table`
  width: 100%;
  font-size: 14px;
`

const TableHead = styled.thead``

const TableHeadRow = styled.tr`
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

const TableHeadLabel = styled.th`
  padding: 16px;
  text-align: right;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: 500;
  width: 140px;
`

const TableHeadPlot = styled.th`
  padding: 16px;
  text-align: right;
  min-width: 180px;
`

const PlotHeaderWrap = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
`

const PlotHeaderName = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`

const PlotHeaderCity = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 4px;
`

const StatusBadge = styled.span<{ $bg: string; $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 500;
  margin-top: 8px;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
`

const RemoveButton = styled.button`
  width: 24px;
  height: 24px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bgTertiary};
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background ${({ theme }) => theme.transitions.normal};
  &:hover {
    background: ${({ theme }) => theme.colors.red[100]};
  }
`

const TableBody = styled.tbody``

const TableRow = styled.tr<{ $highlight?: boolean }>`
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderLight};
  transition: background ${({ theme }) => theme.transitions.fast};
  background: ${({ $highlight, theme }) =>
    $highlight ? theme.colors.emerald[50] : 'transparent'};
  &:hover {
    background: ${({ $highlight, theme }) =>
      $highlight ? theme.colors.emerald[50] : theme.colors.bgSecondary};
  }
`

const RowLabel = styled.td<{ $color?: string; $bold?: boolean }>`
  padding: 12px 16px;
  font-size: 14px;
  color: ${({ $color, theme }) => $color || theme.colors.textSecondary};
  font-weight: ${({ $bold }) => ($bold ? 700 : 500)};
`

const CellTd = styled.td<{ $highlight?: boolean }>`
  padding: 12px 16px;
  font-size: 14px;
  color: ${({ $highlight, theme }) =>
    $highlight ? theme.colors.primary : theme.colors.text};
  font-weight: ${({ $highlight }) => ($highlight ? 700 : 400)};
`

const NetProfitCell = styled.td<{ $best: boolean; $positive: boolean }>`
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 700;
  color: ${({ $best, $positive, theme }) => {
    if ($best) return theme.colors.emerald[600]
    if ($positive) return theme.colors.emerald[500]
    return theme.colors.red[500]
  }};
`

const SeparatorRow = styled.tr`
  & > td {
    padding: 4px 0;
    background: ${({ theme }) => theme.colors.bgSecondary};
  }
`

const ScoreBarWrap = styled.td`
  padding: 12px 16px;
  font-size: 14px;
`

const ScoreBarInner = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const ScoreTrack = styled.div`
  flex: 1;
  height: 8px;
  border-radius: 9999px;
  background: ${({ theme }) => theme.colors.bgTertiary};
  overflow: hidden;
  max-width: 80px;
`

const ScoreFill = styled.div<{ $width: number; $color: string }>`
  height: 100%;
  border-radius: 9999px;
  transition: all ${({ theme }) => theme.transitions.smooth};
  width: ${({ $width }) => $width}%;
  background: ${({ $color }) => $color};
`

const ScoreNumber = styled.span<{ $highlight: boolean }>`
  font-weight: 700;
  color: ${({ $highlight, theme }) =>
    $highlight ? theme.colors.primary : theme.colors.text};
`

/* -- Table footer -- */

const TableFootnote = styled.div`
  padding: 8px 16px 0;
`

const FootnoteText = styled.p`
  font-size: 9px;
  color: ${({ theme }) => theme.colors.textTertiary};
`

const TableActions = styled.div`
  padding: 16px;
  border-top: 1px solid ${({ theme }) => theme.colors.borderLight};
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const AddPlotLink = styled(Link)`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-decoration: none;
  transition: color ${({ theme }) => theme.transitions.normal};
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`

const ClearAllButton = styled.button`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.red[500]};
  background: none;
  border: none;
  cursor: pointer;
  transition: color ${({ theme }) => theme.transitions.normal};
  &:hover {
    color: ${({ theme }) => theme.colors.red[400]};
  }
`

/* -- Bottom toolbar -- */

const BottomToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
`

const ToolbarButton = styled.button<{ $active?: boolean; $whatsapp?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: ${({ theme }) => theme.radii.lg};
  font-size: 14px;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.normal};

  ${({ $active, $whatsapp, theme }) => {
    if ($active) {
      return css`
        background: ${theme.colors.emerald[50]};
        border: 1px solid ${theme.colors.emerald[200]};
        color: ${theme.colors.emerald[600]};
      `
    }
    if ($whatsapp) {
      return css`
        background: rgba(37, 211, 102, 0.06);
        border: 1px solid rgba(37, 211, 102, 0.15);
        color: #25d366;
        &:hover {
          background: rgba(37, 211, 102, 0.14);
        }
      `
    }
    return css`
      background: ${theme.colors.bgSecondary};
      border: 1px solid ${theme.colors.border};
      color: ${theme.colors.text};
      &:hover {
        border-color: ${theme.colors.primary};
        color: ${theme.colors.primary};
      }
    `
  }}
`

/* ─── Helper Functions ──────────────────────────────────────────── */

/**
 * Calculate full investment financials for a plot -- used in the Net Profit Analysis section.
 * Uses centralized cost calculators from utils/plot for consistency across the app.
 */
function calcPlotFinancials(plot: Plot): PlotFinancials {
  const price = getPlotPrice(plot)
  const projected = getPlotProjectedValue(plot)
  const sizeSqM = getPlotSize(plot)
  const readiness = getPlotReadiness(plot)
  const roi = price > 0 ? Math.round(((projected - price) / price) * 100) : 0

  const txn = calcTransactionCosts(price)
  const exit = calcExitCosts(price, projected)
  const totalInvestment = txn.totalWithPurchase

  const cagrData = calcCAGR(roi, readiness)

  return {
    price,
    projected,
    sizeSqM,
    roi,
    readiness,
    purchaseTax: txn.purchaseTax,
    attorneyFees: txn.attorneyFees,
    totalInvestment,
    grossProfit: projected - price,
    bettermentLevy: exit.bettermentLevy,
    capitalGains: exit.capitalGains,
    netProfit: exit.netProfit,
    netRoi: totalInvestment > 0 ? Math.round((exit.netProfit / totalInvestment) * 100) : 0,
    cagr: cagrData,
  }
}

/* ─── Sub-components ────────────────────────────────────────────── */

/**
 * Net Profit Analysis Card -- side-by-side financial summary showing the numbers
 * that actually matter to investors: total cost in, net profit out, and net ROI.
 */
function NetProfitAnalysis({ plots }: NetProfitAnalysisProps) {
  const financials = useMemo(() => plots.map(calcPlotFinancials), [plots])

  const bestNetProfit = Math.max(...financials.map((f) => f.netProfit))
  const bestNetRoi = Math.max(...financials.map((f) => f.netRoi))

  return (
    <CardPanelPadded>
      <SectionHeader>
        <SectionIconBox $bg="rgba(16,185,129,0.08)" $border="rgba(16,185,129,0.15)">
          <DollarSign style={{ width: 18, height: 18, color: '#10B981' }} />
        </SectionIconBox>
        <div>
          <SectionTitleText>ניתוח רווחיות נטו</SectionTitleText>
          <SectionSubtitle>אחרי כל המיסים, היטלים ועלויות נלוות</SectionSubtitle>
        </div>
      </SectionHeader>

      <ProfitGrid $count={plots.length}>
        {plots.map((plot, i) => {
          const f = financials[i]
          const bn = plot.block_number ?? plot.blockNumber
          const isBestProfit = f.netProfit === bestNetProfit && plots.length > 1
          const isBestRoi = f.netRoi === bestNetRoi && plots.length > 1

          return (
            <ProfitCard key={plot.id} $isBest={isBestProfit}>
              {/* Header */}
              <ProfitCardHeader>
                <PlotDot $color={PLOT_COLORS[i]} />
                <PlotLabel>גוש {bn}/{plot.number}</PlotLabel>
                {isBestProfit && <BestBadge>הכי רווחי</BestBadge>}
              </ProfitCardHeader>

              {/* Investment In */}
              <LineItemStack>
                <LineItemRow>
                  <LineItemLabel>מחיר רכישה</LineItemLabel>
                  <LineItemValue>{formatCurrency(f.price)}</LineItemValue>
                </LineItemRow>
                <LineItemRow>
                  <LineItemLabel>מס רכישה (6%)</LineItemLabel>
                  <LineItemValue $color="#94A3B8">{formatCurrency(f.purchaseTax)}</LineItemValue>
                </LineItemRow>
                <LineItemRow>
                  <LineItemLabel>שכ״ט עו״ד</LineItemLabel>
                  <LineItemValue $color="#94A3B8">{formatCurrency(f.attorneyFees)}</LineItemValue>
                </LineItemRow>
                <TotalRow>
                  <TotalLabel>סה״כ השקעה</TotalLabel>
                  <TotalValue>{formatCurrency(f.totalInvestment)}</TotalValue>
                </TotalRow>
              </LineItemStack>

              {/* Deductions */}
              <LineItemStack>
                <LineItemRow>
                  <LineItemLabel>רווח גולמי</LineItemLabel>
                  <LineItemValue $color="#10B981">{formatCurrency(f.grossProfit)}</LineItemValue>
                </LineItemRow>
                <LineItemRow>
                  <LineItemLabel>היטל השבחה (50%)</LineItemLabel>
                  <LineItemValue $color="#EF4444">-{formatCurrency(f.bettermentLevy)}</LineItemValue>
                </LineItemRow>
                <LineItemRow>
                  <LineItemLabel>מס שבח (25%)</LineItemLabel>
                  <LineItemValue $color="#EF4444">-{formatCurrency(f.capitalGains)}</LineItemValue>
                </LineItemRow>
              </LineItemStack>

              {/* Bottom Line */}
              <BottomLineBox $positive={f.netProfit >= 0}>
                <BottomLineHeader>
                  <BottomLineLabel>רווח נקי</BottomLineLabel>
                  <BottomLineAmount $positive={f.netProfit >= 0}>
                    {formatCurrency(f.netProfit)}
                  </BottomLineAmount>
                </BottomLineHeader>
                <BottomLineDetail>
                  <BottomLineDetailLabel>ROI נטו</BottomLineDetailLabel>
                  <BottomLineDetailValue $highlight={isBestRoi}>
                    {f.netRoi}%
                    {isBestRoi && plots.length > 1 ? ' \uD83D\uDC51' : ''}
                  </BottomLineDetailValue>
                </BottomLineDetail>
                {f.cagr && (
                  <BottomLineDetail>
                    <BottomLineDetailLabel>CAGR ({f.cagr.years} שנים)</BottomLineDetailLabel>
                    <BottomLineDetailValue>{f.cagr.cagr}%/שנה</BottomLineDetailValue>
                  </BottomLineDetail>
                )}
              </BottomLineBox>
            </ProfitCard>
          )
        })}
      </ProfitGrid>

      <Disclaimer>
        חישוב משוער -- אינו מהווה ייעוץ מס. מומלץ להתייעץ עם רו״ח לפני החלטת השקעה.
      </Disclaimer>
    </CardPanelPadded>
  )
}

/**
 * Visual bar chart comparing a single metric across plots.
 */
function CompareBarChart({ plots, label, getter, formatter, unit = '', mode = 'higher-better' }: CompareBarChartProps) {
  const values = plots.map(getter).filter((v): v is number => v != null)
  if (values.length === 0) return null
  const maxVal = Math.max(...values, 1)

  return (
    <BarChartWrap>
      <BarChartLabel>{label}</BarChartLabel>
      <BarChartStack>
        {plots.map((plot, i) => {
          const val = getter(plot)
          if (val == null) return null
          const pct = (val / maxVal) * 100
          const blockNum = plot.block_number ?? plot.blockNumber
          const isBest =
            mode === 'higher-better'
              ? val === Math.max(...values)
              : val === Math.min(...values)
          return (
            <BarRow key={plot.id}>
              <BarPlotId>
                {blockNum}/{plot.number}
              </BarPlotId>
              <BarTrack>
                <BarFill $width={pct} $color={PLOT_COLORS[i]} $isBest={isBest}>
                  <BarValueText $isBest={isBest}>
                    {formatter ? formatter(val) : val.toLocaleString()}
                    {unit}
                  </BarValueText>
                </BarFill>
              </BarTrack>
              {isBest && <BestCrown>{'\uD83D\uDC51'}</BestCrown>}
            </BarRow>
          )
        })}
      </BarChartStack>
    </BarChartWrap>
  )
}

/**
 * Radar chart comparing investment dimensions across plots.
 */
function CompareRadar({ plots }: CompareRadarProps) {
  const dimensions = ['ROI', 'שטח', 'מיקום', 'תכנון', 'ציון']

  const getScores = (plot: Plot): number[] => {
    const price = (plot.total_price ?? plot.totalPrice ?? 0) as number
    const proj = (plot.projected_value ?? plot.projectedValue ?? 0) as number
    const roi = price > 0 ? ((proj - price) / price) * 100 : 0
    const size = (plot.size_sqm ?? plot.sizeSqM ?? 0) as number
    const distSea = (plot.distance_to_sea ?? plot.distanceToSea) as number | undefined
    const investScore = calcInvestmentScore(plot)

    const zoningOrder = [
      'AGRICULTURAL',
      'MASTER_PLAN_DEPOSIT',
      'MASTER_PLAN_APPROVED',
      'DETAILED_PLAN_PREP',
      'DETAILED_PLAN_DEPOSIT',
      'DETAILED_PLAN_APPROVED',
      'DEVELOPER_TENDER',
      'BUILDING_PERMIT',
    ]
    const zoning = (plot.zoning_stage ?? plot.zoningStage ?? 'AGRICULTURAL') as string
    const zoningIdx = zoningOrder.indexOf(zoning)

    return [
      Math.min(10, roi / 25),
      Math.min(10, (size / 3000) * 10),
      distSea != null ? Math.max(0, 10 - distSea / 500) : 5,
      zoningIdx >= 0 ? (zoningIdx / 7) * 10 : 0,
      investScore,
    ]
  }

  const cx = 100,
    cy = 100,
    r = 70
  const n = dimensions.length
  const angleStep = (2 * Math.PI) / n
  const startAngle = -Math.PI / 2

  const getPoint = (i: number, val: number) => {
    const angle = startAngle + i * angleStep
    const dist = (val / 10) * r
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) }
  }

  return (
    <CardPanelPadded>
      <SectionTitleText style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Award style={{ width: 16, height: 16, color: '#1A73E8' }} />
        השוואה חזותית
      </SectionTitleText>
      <RadarSvg viewBox="0 0 200 200">
        {/* Grid */}
        {[2, 4, 6, 8, 10].map((level) => {
          const points = Array.from({ length: n }, (_, i) => {
            const p = getPoint(i, level)
            return `${p.x},${p.y}`
          }).join(' ')
          return (
            <polygon
              key={level}
              points={points}
              fill="none"
              stroke="rgba(0,0,0,0.06)"
              strokeWidth="0.5"
            />
          )
        })}
        {/* Axes */}
        {dimensions.map((_, i) => {
          const p = getPoint(i, 10)
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke="rgba(0,0,0,0.08)"
              strokeWidth="0.5"
            />
          )
        })}
        {/* Data polygons */}
        {plots.map((plot, pi) => {
          const scores = getScores(plot)
          const points = scores
            .map((s, i) => {
              const p = getPoint(i, s)
              return `${p.x},${p.y}`
            })
            .join(' ')
          return (
            <polygon
              key={plot.id}
              points={points}
              fill={`${PLOT_COLORS[pi]}15`}
              stroke={PLOT_COLORS[pi]}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          )
        })}
        {/* Data points */}
        {plots.map((plot, pi) => {
          const scores = getScores(plot)
          return scores.map((s, i) => {
            const p = getPoint(i, s)
            return (
              <circle
                key={`${plot.id}-${i}`}
                cx={p.x}
                cy={p.y}
                r="3"
                fill={PLOT_COLORS[pi]}
                stroke="#ffffff"
                strokeWidth="1"
              />
            )
          })
        })}
        {/* Labels */}
        {dimensions.map((d, i) => {
          const p = getPoint(i, 12.5)
          return (
            <RadarLabel key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle">
              {d}
            </RadarLabel>
          )
        })}
      </RadarSvg>
      {/* Legend */}
      <LegendRow>
        {plots.map((plot, i) => {
          const blockNum = plot.block_number ?? plot.blockNumber
          return (
            <LegendItem key={plot.id}>
              <LegendDot $color={PLOT_COLORS[i]} />
              <LegendText>גוש {blockNum}/{plot.number}</LegendText>
            </LegendItem>
          )
        })}
      </LegendRow>
    </CardPanelPadded>
  )
}

/**
 * Winner Summary Card -- shows which plot "wins" across the most comparison dimensions.
 */
function WinnerSummary({ plots }: WinnerSummaryProps) {
  const criteria: Array<{
    label: string
    getter: (p: Plot) => number
    mode: 'min' | 'max'
  }> = [
    {
      label: 'מחיר נמוך',
      getter: (p) => (p.total_price ?? p.totalPrice ?? Infinity) as number,
      mode: 'min',
    },
    {
      label: 'שטח גדול',
      getter: (p) => (p.size_sqm ?? p.sizeSqM ?? 0) as number,
      mode: 'max',
    },
    {
      label: 'תשואה גבוהה',
      getter: (p) => {
        const pr = (p.total_price ?? p.totalPrice ?? 0) as number
        const pj = (p.projected_value ?? p.projectedValue ?? 0) as number
        return pr > 0 ? (pj - pr) / pr : 0
      },
      mode: 'max',
    },
    {
      label: 'מחיר/מ״ר',
      getter: (p) => {
        const pr = (p.total_price ?? p.totalPrice ?? 0) as number
        const sz = (p.size_sqm ?? p.sizeSqM ?? 1) as number
        return sz > 0 ? pr / sz : Infinity
      },
      mode: 'min',
    },
    {
      label: 'ציון השקעה',
      getter: (p) => calcInvestmentScore(p),
      mode: 'max',
    },
    {
      label: 'קרבה לים',
      getter: (p) => (p.distance_to_sea ?? p.distanceToSea ?? Infinity) as number,
      mode: 'min',
    },
  ]

  // Count wins per plot
  const wins: Record<string, { count: number; categories: string[] }> = {}
  plots.forEach((p) => {
    wins[p.id] = { count: 0, categories: [] }
  })

  criteria.forEach(({ label, getter, mode }) => {
    const values = plots.map((p) => ({ id: p.id, val: getter(p) }))
    const best =
      mode === 'max'
        ? Math.max(...values.map((v) => v.val))
        : Math.min(...values.map((v) => v.val))
    values.forEach((v) => {
      if (v.val === best && isFinite(best)) {
        wins[v.id].count++
        wins[v.id].categories.push(label)
      }
    })
  })

  const sorted = plots
    .map((p) => ({ plot: p, ...wins[p.id] }))
    .sort((a, b) => b.count - a.count)
  const winner = sorted[0]
  if (!winner || winner.count === 0) return null

  const blockNum = winner.plot.block_number ?? winner.plot.blockNumber
  const isTie = sorted.length > 1 && sorted[1].count === winner.count

  return (
    <WinnerPanel>
      <WinnerHeader>
        <WinnerIconBox>
          <Trophy style={{ width: 20, height: 20, color: '#1A73E8' }} />
        </WinnerIconBox>
        <div>
          <WinnerTitle>
            {isTie ? 'תיקו!' : `\uD83C\uDFC6 המנצח: גוש ${blockNum} חלקה ${winner.plot.number}`}
          </WinnerTitle>
          <WinnerSubtitle>
            {isTie
              ? `שתי חלקות מובילות ב-${winner.count} קטגוריות כל אחת`
              : `מוביל ב-${winner.count} מתוך ${criteria.length} קטגוריות`}
          </WinnerSubtitle>
        </div>
      </WinnerHeader>
      <WinnerChips>
        {sorted.map(({ plot, count, categories }, i) => {
          const bn = plot.block_number ?? plot.blockNumber
          return (
            <WinnerChip key={plot.id} $isWinner={i === 0}>
              {i === 0 && <Crown style={{ width: 14, height: 14 }} />}
              <ChipName>
                {bn}/{plot.number}
              </ChipName>
              <ChipCount>{count} ניצחונות</ChipCount>
              {categories.length > 0 && (
                <ChipCategories>({categories.slice(0, 3).join(', ')})</ChipCategories>
              )}
            </WinnerChip>
          )
        })}
      </WinnerChips>
    </WinnerPanel>
  )
}

/**
 * RiskReturnScatter -- the foundational investment analysis chart.
 * Plots each compared plot on a 2D risk/return scatter:
 *   X-axis: Risk (higher = riskier) -- based on zoning stage, days on market, price volatility
 *   Y-axis: Return (higher = better) -- ROI percentage
 *
 * The ideal investment sits in the TOP-LEFT quadrant (high return, low risk).
 */
function RiskReturnScatter({ plots }: RiskReturnScatterProps) {
  if (!plots || plots.length < 2) return null

  const ZONING_RISK: Record<string, number> = {
    AGRICULTURAL: 9,
    MASTER_PLAN_DEPOSIT: 7.5,
    MASTER_PLAN_APPROVED: 6,
    DETAILED_PLAN_PREP: 5,
    DETAILED_PLAN_DEPOSIT: 4,
    DETAILED_PLAN_APPROVED: 3,
    DEVELOPER_TENDER: 2,
    BUILDING_PERMIT: 1,
  }

  const READINESS_RISK: Record<string, number> = {
    '1-3': 2,
    '3-5': 4,
    '5-7': 6,
    '5+': 7,
    '7-10': 8,
    '10+': 9,
  }

  const dataPoints = plots.map((p, i) => {
    const price = (p.total_price ?? p.totalPrice ?? 0) as number
    const proj = (p.projected_value ?? p.projectedValue ?? 0) as number
    const roi = price > 0 ? Math.round(((proj - price) / price) * 100) : 0
    const zoning = (p.zoning_stage ?? p.zoningStage ?? 'AGRICULTURAL') as string
    const readiness = (p.readiness_estimate ?? p.readinessEstimate ?? '5+') as string

    const zoningRisk = ZONING_RISK[zoning] ?? 5
    const timeRisk = READINESS_RISK[readiness] ?? 5
    const risk =
      (p as Record<string, unknown>)._riskScore != null
        ? ((p as Record<string, unknown>)._riskScore as number)
        : Math.round((zoningRisk * 0.6 + timeRisk * 0.4) * 10) / 10

    return { plot: p, roi, risk, color: PLOT_COLORS[i], index: i }
  })

  // Chart dimensions
  const W = 320,
    H = 220
  const pad = { top: 25, right: 25, bottom: 35, left: 45 }
  const chartW = W - pad.left - pad.right
  const chartH = H - pad.top - pad.bottom

  // Scales
  const minRoi = Math.min(0, ...dataPoints.map((d) => d.roi))
  const maxRoi = Math.max(100, ...dataPoints.map((d) => d.roi)) * 1.1
  const maxRisk = 10

  const scaleX = (risk: number) => pad.left + (risk / maxRisk) * chartW
  const scaleY = (roi: number) =>
    pad.top + chartH - ((roi - minRoi) / (maxRoi - minRoi)) * chartH

  // Quadrant boundaries (risk=5, roi=median)
  const medianRoi =
    dataPoints.length > 0
      ? [...dataPoints].sort((a, b) => a.roi - b.roi)[Math.floor(dataPoints.length / 2)].roi
      : 100
  const quadX = scaleX(5)
  const quadY = scaleY(medianRoi)

  return (
    <CardPanelPadded>
      <SectionHeader>
        <SectionIconBox $bg="rgba(139,92,246,0.08)" $border="rgba(139,92,246,0.15)">
          <TrendingUp style={{ width: 18, height: 18, color: '#8B5CF6' }} />
        </SectionIconBox>
        <div>
          <SectionTitleText>סיכון מול תשואה</SectionTitleText>
          <SectionSubtitle>
            הפינה השמאלית-עליונה = ההשקעה האידיאלית (תשואה גבוהה, סיכון נמוך)
          </SectionSubtitle>
        </div>
      </SectionHeader>

      <ScatterSvg viewBox={`0 0 ${W} ${H}`} dir="ltr">
        {/* Background quadrants */}
        <rect
          x={pad.left}
          y={pad.top}
          width={quadX - pad.left}
          height={quadY - pad.top}
          fill="rgba(34,197,94,0.04)"
        />
        <rect
          x={quadX}
          y={pad.top}
          width={pad.left + chartW - quadX}
          height={quadY - pad.top}
          fill="rgba(245,158,11,0.04)"
        />
        <rect
          x={pad.left}
          y={quadY}
          width={quadX - pad.left}
          height={pad.top + chartH - quadY}
          fill="rgba(148,163,184,0.04)"
        />
        <rect
          x={quadX}
          y={quadY}
          width={pad.left + chartW - quadX}
          height={pad.top + chartH - quadY}
          fill="rgba(239,68,68,0.04)"
        />

        {/* Quadrant dividers */}
        <line
          x1={quadX}
          y1={pad.top}
          x2={quadX}
          y2={pad.top + chartH}
          stroke="rgba(0,0,0,0.06)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        <line
          x1={pad.left}
          y1={quadY}
          x2={pad.left + chartW}
          y2={quadY}
          stroke="rgba(0,0,0,0.06)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Quadrant labels */}
        <ScatterQuadLabel x={pad.left + 4} y={pad.top + 12} fill="#10B981">
          אידיאלי
        </ScatterQuadLabel>
        <ScatterQuadLabel
          x={pad.left + chartW - 4}
          y={pad.top + chartH - 4}
          textAnchor="end"
          fill="#EF4444"
        >
          מסוכן
        </ScatterQuadLabel>

        {/* Axes */}
        <line
          x1={pad.left}
          y1={pad.top + chartH}
          x2={pad.left + chartW}
          y2={pad.top + chartH}
          stroke="rgba(0,0,0,0.1)"
          strokeWidth="1"
        />
        <line
          x1={pad.left}
          y1={pad.top}
          x2={pad.left}
          y2={pad.top + chartH}
          stroke="rgba(0,0,0,0.1)"
          strokeWidth="1"
        />

        {/* X-axis ticks */}
        {[0, 2.5, 5, 7.5, 10].map((v) => (
          <g key={`x-${v}`}>
            <line
              x1={scaleX(v)}
              y1={pad.top + chartH}
              x2={scaleX(v)}
              y2={pad.top + chartH + 4}
              stroke="rgba(0,0,0,0.1)"
            />
            <ScatterTick x={scaleX(v)} y={pad.top + chartH + 14} textAnchor="middle">
              {v}
            </ScatterTick>
          </g>
        ))}

        {/* Y-axis ticks */}
        {[0, 50, 100, 150, 200, 250]
          .filter((v) => v >= minRoi && v <= maxRoi)
          .map((v) => (
            <g key={`y-${v}`}>
              <line
                x1={pad.left - 4}
                y1={scaleY(v)}
                x2={pad.left}
                y2={scaleY(v)}
                stroke="rgba(0,0,0,0.1)"
              />
              <ScatterTick x={pad.left - 8} y={scaleY(v) + 3} textAnchor="end">
                {v}%
              </ScatterTick>
              <line
                x1={pad.left}
                y1={scaleY(v)}
                x2={pad.left + chartW}
                y2={scaleY(v)}
                stroke="rgba(0,0,0,0.03)"
              />
            </g>
          ))}

        {/* Axis labels */}
        <ScatterAxisLabel x={pad.left + chartW / 2} y={H - 2} textAnchor="middle">
          {'סיכון \u2192'}
        </ScatterAxisLabel>
        <ScatterAxisLabel
          x={8}
          y={pad.top + chartH / 2}
          textAnchor="middle"
          transform={`rotate(-90, 8, ${pad.top + chartH / 2})`}
        >
          {'תשואה % \u2192'}
        </ScatterAxisLabel>

        {/* Data points with labels */}
        {dataPoints.map(({ plot, roi, risk, color }) => {
          const cxVal = scaleX(risk)
          const cyVal = scaleY(roi)
          const bn = plot.block_number ?? plot.blockNumber
          return (
            <g key={plot.id}>
              <circle cx={cxVal} cy={cyVal} r="12" fill={`${color}15`} />
              <circle cx={cxVal} cy={cyVal} r="6" fill={color} stroke="#ffffff" strokeWidth="2" />
              <ScatterPointLabel x={cxVal} y={cyVal - 10} textAnchor="middle" fill={color}>
                {bn}/{plot.number}
              </ScatterPointLabel>
            </g>
          )
        })}
      </ScatterSvg>

      {/* Legend */}
      <ScatterLegendRow>
        {dataPoints.map(({ plot, roi, risk, color }) => {
          const bn = plot.block_number ?? plot.blockNumber
          return (
            <ScatterLegendItem key={plot.id}>
              <ScatterLegendDot $color={color} />
              <span>
                {bn}/{plot.number}
              </span>
              <ScatterLegendMeta>
                ({roi}% / {risk})
              </ScatterLegendMeta>
            </ScatterLegendItem>
          )
        })}
      </ScatterLegendRow>
    </CardPanelPadded>
  )
}

function CompareCell({ value, highlight = false }: CompareCellProps) {
  return <CellTd $highlight={highlight}>{value ?? '\u2014'}</CellTd>
}

/* ─── Main Component ────────────────────────────────────────────── */

export default function Compare() {
  useMetaTags({
    title: 'השוואת חלקות \u2014 LandMap Israel',
    description: 'השוואה מפורטת בין חלקות קרקע: מחירים, תשואות, מיקום, שלבי תכנון ואיכות השקעה.',
    url: `${window.location.origin}/compare`,
  })

  const [searchParams, setSearchParams] = useSearchParams()

  const plotIds = useMemo(() => {
    const fromUrl = (searchParams.get('plots') || '').split(',').filter(Boolean)
    if (fromUrl.length > 0) return fromUrl
    try {
      const stored = JSON.parse(localStorage.getItem('landmap_compare') || '[]')
      return Array.isArray(stored) ? stored.filter(Boolean) : []
    } catch {
      return []
    }
  }, [searchParams])

  useEffect(() => {
    if (plotIds.length > 0 && !searchParams.get('plots')) {
      setSearchParams({ plots: plotIds.join(',') }, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: plots = [], isLoading } = usePlotsBatch(plotIds)
  const [linkCopied, setLinkCopied] = useState(false)

  const handleShareComparison = useCallback(() => {
    const url = `${window.location.origin}/compare?plots=${plotIds.join(',')}`
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setLinkCopied(true)
        setTimeout(() => setLinkCopied(false), 2500)
      })
      .catch(() => {
        const textarea = document.createElement('textarea')
        textarea.value = url
        textarea.style.cssText = 'position:fixed;left:-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        setLinkCopied(true)
        setTimeout(() => setLinkCopied(false), 2500)
      })
  }, [plotIds])

  const removeFromCompare = useCallback(
    (plotId: string) => {
      const next = plotIds.filter((id) => id !== plotId)
      try {
        localStorage.setItem('landmap_compare', JSON.stringify(next))
      } catch {}
      if (next.length > 0) {
        setSearchParams({ plots: next.join(',') }, { replace: true })
      } else {
        setSearchParams({}, { replace: true })
      }
    },
    [plotIds, setSearchParams],
  )

  const bestValue = (getter: (p: Plot) => number | null | undefined, mode: 'max' | 'min' = 'max') => {
    const values = plots.map(getter).filter((v): v is number => v != null)
    if (values.length === 0) return null
    return mode === 'max' ? Math.max(...values) : Math.min(...values)
  }

  return (
    <ComparePageWrapper>
      <PublicNav />

      <ContentArea>
        <ContentContainer>
          <Breadcrumb
            items={[{ label: 'מפה', to: '/' }, { label: 'השוואת חלקות' }]}
            style={{ marginBottom: 16 }}
          />
          <PageHeader>
            <HeaderIconBox>
              <BarChart3 style={{ width: 24, height: 24, color: '#1A73E8' }} />
            </HeaderIconBox>
            <HeaderTextBlock>
              <HeaderTitle>השוואת חלקות</HeaderTitle>
              <HeaderSubtitle>
                {plots.length > 0 ? `${plots.length} חלקות להשוואה` : 'בחרו חלקות להשוואה'}
              </HeaderSubtitle>
            </HeaderTextBlock>
            {plots.length >= 2 && (
              <ActionsRow data-print-hide>
                <ActionButton onClick={() => window.print()} title="הדפס השוואה">
                  <Printer style={{ width: 16, height: 16 }} />
                  <ActionButtonLabel>הדפס</ActionButtonLabel>
                </ActionButton>
                <ActionButton $active={linkCopied} onClick={handleShareComparison}>
                  {linkCopied ? (
                    <Check style={{ width: 16, height: 16 }} />
                  ) : (
                    <Share2 style={{ width: 16, height: 16 }} />
                  )}
                  <ActionButtonLabel>{linkCopied ? 'הועתק!' : 'שתף השוואה'}</ActionButtonLabel>
                </ActionButton>
                <WhatsAppLink
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `\uD83D\uDCCA השוואת חלקות להשקעה\n${plots
                      .map((p) => {
                        const bn = p.block_number ?? p.blockNumber
                        const price = (p.total_price ?? p.totalPrice ?? 0) as number
                        const proj = (p.projected_value ?? p.projectedValue ?? 0) as number
                        const roi = price > 0 ? Math.round(((proj - price) / price) * 100) : 0
                        return `\u2022 גוש ${bn}/${p.number} (${p.city}) \u2014 \u20AA${Math.round(price / 1000)}K \u00B7 +${roi}%`
                      })
                      .join('\n')}\n\n${window.location.origin}/compare?plots=${plotIds.join(',')}`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="שתף בוואטסאפ"
                >
                  <svg
                    style={{ width: 16, height: 16, color: '#25D366' }}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </WhatsAppLink>
              </ActionsRow>
            )}
          </PageHeader>

          {isLoading ? (
            <LoadingWrap>
              <Spinner style={{ width: 40, height: 40, color: '#1A73E8' }} />
            </LoadingWrap>
          ) : plots.length === 0 ? (
            <EmptyPanel>
              <EmptyIcon />
              <EmptyTitle>אין חלקות להשוואה</EmptyTitle>
              <EmptyDesc>בחרו עד 3 חלקות מהמפה להשוואה מקיפה</EmptyDesc>
              <BackToMapLink to="/">
                <Map style={{ width: 20, height: 20 }} />
                חזרה למפה
              </BackToMapLink>
            </EmptyPanel>
          ) : (
            <>
              {/* Winner summary */}
              {plots.length >= 2 && <WinnerSummary plots={plots} />}

              {/* Net Profit Analysis */}
              {plots.length >= 1 && <NetProfitAnalysis plots={plots} />}

              {/* Visual comparison charts */}
              {plots.length >= 2 && (
                <>
                  <CompareRadar plots={plots} />
                  <RiskReturnScatter plots={plots} />

                  <CardPanelPadded>
                    <SectionTitleText
                      style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}
                    >
                      <TrendingUp style={{ width: 16, height: 16, color: '#1A73E8' }} />
                      השוואה מספרית
                    </SectionTitleText>
                    <CompareBarChart
                      plots={plots}
                      label="מחיר (נמוך יותר = טוב יותר)"
                      getter={(p) => (p.total_price ?? p.totalPrice) as number | undefined}
                      formatter={formatCurrency}
                      mode="lower-better"
                    />
                    <CompareBarChart
                      plots={plots}
                      label="תשואה צפויה (%)"
                      getter={(p) => {
                        const price = (p.total_price ?? p.totalPrice ?? 0) as number
                        const proj = (p.projected_value ?? p.projectedValue ?? 0) as number
                        return price > 0 ? Math.round(((proj - price) / price) * 100) : 0
                      }}
                      unit="%"
                      mode="higher-better"
                    />
                    <CompareBarChart
                      plots={plots}
                      label="שטח (מ״ר)"
                      getter={(p) => (p.size_sqm ?? p.sizeSqM) as number | undefined}
                      unit=" מ״ר"
                      mode="higher-better"
                    />
                    <CompareBarChart
                      plots={plots}
                      label="מחיר למ״ר (נמוך = טוב)"
                      getter={(p) => {
                        const price = (p.total_price ?? p.totalPrice ?? 0) as number
                        const size = (p.size_sqm ?? p.sizeSqM ?? 1) as number
                        return Math.round(price / size)
                      }}
                      formatter={(v: number) => `\u20AA${v.toLocaleString()}`}
                      mode="lower-better"
                    />
                    <CompareBarChart
                      plots={plots}
                      label="ציון השקעה"
                      getter={(p) => calcInvestmentScore(p)}
                      unit="/10"
                      mode="higher-better"
                    />
                  </CardPanelPadded>
                </>
              )}

              <TablePanel>
                <TopBar />
                <TableScroll>
                  <Table>
                    {/* Header: plot cards */}
                    <TableHead>
                      <TableHeadRow>
                        <TableHeadLabel>חלקה</TableHeadLabel>
                        {plots.map((plot) => {
                          const blockNum = plot.block_number ?? plot.blockNumber
                          const color = statusColors[plot.status as keyof typeof statusColors]
                          return (
                            <TableHeadPlot key={plot.id}>
                              <PlotHeaderWrap>
                                <div>
                                  <PlotHeaderName>
                                    גוש {blockNum} / {plot.number}
                                  </PlotHeaderName>
                                  <PlotHeaderCity>
                                    <MapPin style={{ width: 12, height: 12 }} />
                                    {plot.city}
                                  </PlotHeaderCity>
                                  <StatusBadge $bg={`${color}20`} $color={color}>
                                    {statusLabels[plot.status as keyof typeof statusLabels]}
                                  </StatusBadge>
                                </div>
                                <RemoveButton onClick={() => removeFromCompare(plot.id)}>
                                  <X style={{ width: 14, height: 14, color: '#94A3B8' }} />
                                </RemoveButton>
                              </PlotHeaderWrap>
                            </TableHeadPlot>
                          )
                        })}
                      </TableHeadRow>
                    </TableHead>
                    <TableBody>
                      {/* Price */}
                      <TableRow>
                        <RowLabel>מחיר</RowLabel>
                        {plots.map((p) => {
                          const price = (p.total_price ?? p.totalPrice) as number | undefined
                          const best = bestValue(
                            (pl) => (pl.total_price ?? pl.totalPrice) as number | undefined,
                            'min',
                          )
                          return (
                            <CompareCell
                              key={p.id}
                              value={formatCurrency(price as number)}
                              highlight={price === best}
                            />
                          )
                        })}
                      </TableRow>
                      {/* Monthly Payment */}
                      <TableRow>
                        <RowLabel>תשלום חודשי*</RowLabel>
                        {plots.map((p) => {
                          const price = (p.total_price ?? p.totalPrice) as number
                          const payment = calcMonthlyPayment(price)
                          const best = bestValue((pl) => {
                            const pm = calcMonthlyPayment(
                              (pl.total_price ?? pl.totalPrice) as number,
                            )
                            return pm ? pm.monthly : null
                          }, 'min')
                          return (
                            <CompareCell
                              key={p.id}
                              value={payment ? formatMonthlyPayment(payment.monthly) : null}
                              highlight={!!(payment && payment.monthly === best)}
                            />
                          )
                        })}
                      </TableRow>
                      {/* Size */}
                      <TableRow>
                        <RowLabel>שטח</RowLabel>
                        {plots.map((p) => {
                          const size = (p.size_sqm ?? p.sizeSqM) as number | undefined
                          const best = bestValue(
                            (pl) => (pl.size_sqm ?? pl.sizeSqM) as number | undefined,
                            'max',
                          )
                          return (
                            <CompareCell
                              key={p.id}
                              value={size ? `${size.toLocaleString()} מ"ר` : null}
                              highlight={size === best}
                            />
                          )
                        })}
                      </TableRow>
                      {/* Price/sqm */}
                      <TableRow>
                        <RowLabel>מחיר/מ"ר</RowLabel>
                        {plots.map((p) => {
                          const price = (p.total_price ?? p.totalPrice) as number
                          const size = (p.size_sqm ?? p.sizeSqM) as number | undefined
                          const ppsm = size ? Math.round(price / size) : null
                          const best = bestValue((pl) => {
                            const pr = (pl.total_price ?? pl.totalPrice) as number
                            const sz = (pl.size_sqm ?? pl.sizeSqM) as number | undefined
                            return sz ? Math.round(pr / sz) : null
                          }, 'min')
                          return (
                            <CompareCell
                              key={p.id}
                              value={ppsm ? `${ppsm.toLocaleString()} \u20AA` : null}
                              highlight={ppsm === best}
                            />
                          )
                        })}
                      </TableRow>
                      {/* Zoning */}
                      <TableRow>
                        <RowLabel>שלב ייעוד</RowLabel>
                        {plots.map((p) => (
                          <CompareCell
                            key={p.id}
                            value={
                              zoningLabels[
                                (p.zoning_stage ?? p.zoningStage) as keyof typeof zoningLabels
                              ]
                            }
                          />
                        ))}
                      </TableRow>
                      {/* Projected Value */}
                      <TableRow>
                        <RowLabel>שווי צפוי</RowLabel>
                        {plots.map((p) => {
                          const val = (p.projected_value ?? p.projectedValue) as number | undefined
                          const best = bestValue(
                            (pl) =>
                              (pl.projected_value ?? pl.projectedValue) as number | undefined,
                            'max',
                          )
                          return (
                            <CompareCell
                              key={p.id}
                              value={val ? formatCurrency(val) : null}
                              highlight={val === best}
                            />
                          )
                        })}
                      </TableRow>
                      {/* ROI */}
                      <TableRow>
                        <RowLabel>תשואה צפויה</RowLabel>
                        {plots.map((p) => {
                          const price = (p.total_price ?? p.totalPrice) as number | undefined
                          const proj = (p.projected_value ?? p.projectedValue) as
                            | number
                            | undefined
                          const roi =
                            price && proj ? Math.round(((proj - price) / price) * 100) : null
                          const best = bestValue((pl) => {
                            const pr = (pl.total_price ?? pl.totalPrice) as number | undefined
                            const pj = (pl.projected_value ?? pl.projectedValue) as
                              | number
                              | undefined
                            return pr && pj ? Math.round(((pj - pr) / pr) * 100) : null
                          }, 'max')
                          return (
                            <CompareCell
                              key={p.id}
                              value={roi != null ? `+${roi}%` : null}
                              highlight={roi === best}
                            />
                          )
                        })}
                      </TableRow>
                      {/* CAGR */}
                      <TableRow>
                        <RowLabel>CAGR שנתי</RowLabel>
                        {plots.map((p) => {
                          const f = calcPlotFinancials(p)
                          const bestCagr = Math.max(
                            ...plots.map((pl) => {
                              const pf = calcPlotFinancials(pl)
                              return pf.cagr ? pf.cagr.cagr : 0
                            }),
                          )
                          return (
                            <CompareCell
                              key={p.id}
                              value={
                                f.cagr
                                  ? `${f.cagr.cagr}%/שנה (${f.cagr.years}ש\u05F3)`
                                  : null
                              }
                              highlight={!!(f.cagr && f.cagr.cagr === bestCagr)}
                            />
                          )
                        })}
                      </TableRow>
                      {/* Net Profit */}
                      <TableRow $highlight>
                        <RowLabel $color="#059669" $bold>
                          רווח נקי
                        </RowLabel>
                        {plots.map((p) => {
                          const f = calcPlotFinancials(p)
                          const bestNet = Math.max(
                            ...plots.map((pl) => calcPlotFinancials(pl).netProfit),
                          )
                          return (
                            <NetProfitCell
                              key={p.id}
                              $best={f.netProfit === bestNet && plots.length > 1}
                              $positive={f.netProfit >= 0}
                            >
                              {formatCurrency(f.netProfit)}
                            </NetProfitCell>
                          )
                        })}
                      </TableRow>
                      {/* Net ROI */}
                      <TableRow $highlight>
                        <RowLabel $color="#10B981">ROI נטו</RowLabel>
                        {plots.map((p) => {
                          const f = calcPlotFinancials(p)
                          const bestNetRoi = Math.max(
                            ...plots.map((pl) => calcPlotFinancials(pl).netRoi),
                          )
                          return (
                            <CompareCell
                              key={p.id}
                              value={`${f.netRoi}%`}
                              highlight={f.netRoi === bestNetRoi && plots.length > 1}
                            />
                          )
                        })}
                      </TableRow>
                      {/* Section separator */}
                      <SeparatorRow>
                        <td colSpan={plots.length + 1} />
                      </SeparatorRow>
                      {/* Readiness */}
                      <TableRow>
                        <RowLabel>מוכנות לבנייה</RowLabel>
                        {plots.map((p) => (
                          <CompareCell
                            key={p.id}
                            value={
                              (p.readiness_estimate ?? p.readinessEstimate) as string | undefined
                            }
                          />
                        ))}
                      </TableRow>
                      {/* Committees - national */}
                      <TableRow>
                        <RowLabel>ועדה ארצית</RowLabel>
                        {plots.map((p) => {
                          const committees = (p as Record<string, unknown>).committees as
                            | { national?: { status?: string } }
                            | undefined
                          const status = committees?.national?.status
                          return (
                            <CompareCell
                              key={p.id}
                              value={
                                status === 'approved'
                                  ? 'אושר'
                                  : status === 'pending'
                                    ? 'ממתין'
                                    : '\u2014'
                              }
                            />
                          )
                        })}
                      </TableRow>
                      {/* Distance to sea */}
                      <TableRow>
                        <RowLabel>מרחק מהים</RowLabel>
                        {plots.map((p) => {
                          const dist = (p.distance_to_sea ?? p.distanceToSea) as
                            | number
                            | undefined
                          const best = bestValue(
                            (pl) =>
                              (pl.distance_to_sea ?? pl.distanceToSea) as number | undefined,
                            'min',
                          )
                          return (
                            <CompareCell
                              key={p.id}
                              value={dist != null ? `${dist} מ'` : null}
                              highlight={dist === best}
                            />
                          )
                        })}
                      </TableRow>
                      {/* Distance to park */}
                      <TableRow>
                        <RowLabel>מרחק מפארק</RowLabel>
                        {plots.map((p) => {
                          const dist = (p.distance_to_park ?? p.distanceToPark) as
                            | number
                            | undefined
                          const best = bestValue(
                            (pl) =>
                              (pl.distance_to_park ?? pl.distanceToPark) as number | undefined,
                            'min',
                          )
                          return (
                            <CompareCell
                              key={p.id}
                              value={dist != null ? `${dist} מ'` : null}
                              highlight={dist === best}
                            />
                          )
                        })}
                      </TableRow>
                      {/* Distance to hospital */}
                      <TableRow>
                        <RowLabel>מרחק מביה"ח</RowLabel>
                        {plots.map((p) => {
                          const dist = (p as Record<string, unknown>).distance_to_hospital ??
                            (p as Record<string, unknown>).distanceToHospital
                          const distNum = dist as number | undefined
                          const best = bestValue(
                            (pl) =>
                              ((pl as Record<string, unknown>).distance_to_hospital ??
                                (pl as Record<string, unknown>).distanceToHospital) as
                                | number
                                | undefined,
                            'min',
                          )
                          return (
                            <CompareCell
                              key={p.id}
                              value={distNum != null ? `${distNum} מ'` : null}
                              highlight={distNum === best}
                            />
                          )
                        })}
                      </TableRow>
                      {/* Investment Score */}
                      <TableRow>
                        <RowLabel>ציון השקעה</RowLabel>
                        {plots.map((p) => {
                          const score = calcInvestmentScore(p)
                          const bestScore = Math.max(
                            ...plots.map((pl) => calcInvestmentScore(pl)),
                          )
                          const isBest = score === bestScore && plots.length > 1
                          return (
                            <ScoreBarWrap key={p.id}>
                              <ScoreBarInner>
                                <ScoreTrack>
                                  <ScoreFill
                                    $width={score * 10}
                                    $color={
                                      score >= 8
                                        ? '#22C55E'
                                        : score >= 6
                                          ? '#84CC16'
                                          : score >= 4
                                            ? '#F59E0B'
                                            : '#EF4444'
                                    }
                                  />
                                </ScoreTrack>
                                <ScoreNumber $highlight={isBest}>
                                  {score}/10 {isBest ? '\uD83D\uDC51' : ''}
                                </ScoreNumber>
                              </ScoreBarInner>
                            </ScoreBarWrap>
                          )
                        })}
                      </TableRow>
                      {/* Standard 22 */}
                      <TableRow>
                        <RowLabel>הערכת תקן 22</RowLabel>
                        {plots.map((p) => {
                          const s22 =
                            (p as Record<string, unknown>).standard22 ??
                            (p as Record<string, unknown>).standard_22
                          const val = (s22 as { value?: number } | undefined)?.value
                          return (
                            <CompareCell key={p.id} value={val ? formatCurrency(val) : null} />
                          )
                        })}
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableScroll>

                {/* Footnote */}
                <TableFootnote>
                  <FootnoteText>
                    * תשלום חודשי משוער: 50% הון עצמי, ריבית 6%, תקופה 15 שנה. לסימולציה מלאה ראה
                    מחשבון המימון בעמוד החלקה.
                  </FootnoteText>
                </TableFootnote>

                {/* Actions */}
                <TableActions>
                  <AddPlotLink to="/">+ הוסף חלקה להשוואה</AddPlotLink>
                  <ClearAllButton
                    onClick={() => {
                      try {
                        localStorage.setItem('landmap_compare', '[]')
                      } catch {}
                      setSearchParams({}, { replace: true })
                    }}
                  >
                    נקה הכל
                  </ClearAllButton>
                </TableActions>
              </TablePanel>

              {/* Share, Print, Export toolbar */}
              <BottomToolbar>
                <ToolbarButton
                  $active={linkCopied}
                  onClick={() => {
                    navigator.clipboard
                      .writeText(window.location.href)
                      .then(() => {
                        setLinkCopied(true)
                        setTimeout(() => setLinkCopied(false), 2000)
                      })
                      .catch(() => {})
                  }}
                >
                  {linkCopied ? (
                    <Check style={{ width: 16, height: 16 }} />
                  ) : (
                    <Copy style={{ width: 16, height: 16 }} />
                  )}
                  {linkCopied ? 'הועתק!' : 'שתף השוואה'}
                </ToolbarButton>
                <ToolbarButton
                  $whatsapp
                  onClick={() => {
                    const lines = ['\uD83D\uDCCA השוואת חלקות \u2014 LandMap Israel\n']
                    plots.forEach((p, i) => {
                      const bn = p.block_number ?? p.blockNumber
                      const price = (p.total_price ?? p.totalPrice) as number
                      const proj = (p.projected_value ?? p.projectedValue) as number
                      const size = (p.size_sqm ?? p.sizeSqM) as number
                      const roi = price > 0 ? Math.round(((proj - price) / price) * 100) : 0
                      lines.push(`${i + 1}. גוש ${bn} חלקה ${p.number} (${p.city})`)
                      lines.push(
                        `   \uD83D\uDCB0 ${formatCurrency(price)} | \uD83D\uDCD0 ${(size / 1000).toFixed(1)} דונם | \uD83D\uDCC8 +${roi}%`,
                      )
                    })
                    lines.push(`\n\uD83D\uDD17 ${window.location.href}`)
                    const text = encodeURIComponent(lines.join('\n'))
                    window.open(`https://wa.me/?text=${text}`, '_blank')
                  }}
                >
                  <Share2 style={{ width: 16, height: 16 }} />
                  WhatsApp
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => {
                    const pw = window.open('', '_blank')
                    if (!pw) return
                    const rows = plots.map((p) => {
                      const bn = p.block_number ?? p.blockNumber
                      const price = (p.total_price ?? p.totalPrice ?? 0) as number
                      const proj = (p.projected_value ?? p.projectedValue ?? 0) as number
                      const size = (p.size_sqm ?? p.sizeSqM ?? 0) as number
                      const roi = price > 0 ? Math.round(((proj - price) / price) * 100) : 0
                      const score = calcInvestmentScore(p)
                      return {
                        bn,
                        number: p.number,
                        city: p.city,
                        price,
                        proj,
                        size,
                        roi,
                        score,
                        status:
                          statusLabels[p.status as keyof typeof statusLabels] || p.status,
                        zoning:
                          zoningLabels[
                            (p.zoning_stage ?? p.zoningStage) as keyof typeof zoningLabels
                          ] || '',
                      }
                    })
                    const winner =
                      rows.length >= 2
                        ? rows.reduce((best, r) => (r.score > best.score ? r : best), rows[0])
                        : null
                    pw.document.write(`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8">
                    <title>השוואת חלקות \u2014 LandMap Israel</title>
                    <style>
                      * { margin: 0; padding: 0; box-sizing: border-box; }
                      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; padding: 40px; max-width: 900px; margin: 0 auto; line-height: 1.5; }
                      h1 { font-size: 22px; margin-bottom: 4px; }
                      .subtitle { color: #666; font-size: 13px; margin-bottom: 24px; }
                      table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
                      th { background: #f0f0f0; padding: 10px 12px; text-align: right; font-size: 12px; border: 1px solid #ddd; }
                      td { padding: 10px 12px; text-align: right; font-size: 13px; border: 1px solid #eee; }
                      tr:nth-child(even) { background: #fafafa; }
                      .highlight { background: #FFFBEB !important; font-weight: 700; }
                      .winner { background: #F0FDF4; border: 2px solid #22C55E; border-radius: 8px; padding: 12px; margin-bottom: 20px; }
                      .footer { margin-top: 30px; text-align: center; color: #aaa; font-size: 10px; border-top: 1px solid #eee; padding-top: 12px; }
                      @media print { body { padding: 20px; } }
                    </style></head><body>
                    <h1>\uD83D\uDCCA השוואת חלקות \u2014 LandMap Israel</h1>
                    <div class="subtitle">${rows.length} חלקות להשוואה \u2022 ${new Date().toLocaleDateString('he-IL')}</div>
                    ${
                      winner
                        ? `<div class="winner">\uD83C\uDFC6 <strong>המנצחת:</strong> גוש ${winner.bn} חלקה ${winner.number} (${winner.city}) \u2014 ציון השקעה ${winner.score}/10, תשואה +${winner.roi}%</div>`
                        : ''
                    }
                    <table>
                      <thead><tr>
                        <th>חלקה</th><th>עיר</th><th>מחיר</th><th>שטח</th><th>שווי צפוי</th><th>תשואה</th><th>ציון</th><th>ייעוד</th><th>סטטוס</th>
                      </tr></thead>
                      <tbody>${rows
                        .map(
                          (r) => `<tr${winner && r.score === winner.score ? ' class="highlight"' : ''}>
                        <td>גוש ${r.bn} / ${r.number}</td>
                        <td>${r.city}</td>
                        <td>${formatCurrency(r.price)}</td>
                        <td>${(r.size / 1000).toFixed(1)} דונם</td>
                        <td>${formatCurrency(r.proj)}</td>
                        <td>+${r.roi}%</td>
                        <td>${r.score}/10</td>
                        <td>${r.zoning}</td>
                        <td>${r.status}</td>
                      </tr>`,
                        )
                        .join('')}</tbody>
                    </table>
                    <div class="footer">
                      <div>LandMap Israel \u2014 מפת קרקעות להשקעה</div>
                      <div>${window.location.href}</div>
                      <div style="margin-top:6px">חישוב משוער בלבד \u2014 אינו מהווה ייעוץ השקעות</div>
                    </div>
                  </body></html>`)
                    pw.document.close()
                    setTimeout(() => pw.print(), 300)
                  }}
                >
                  <Printer style={{ width: 16, height: 16 }} />
                  הדפס דוח
                </ToolbarButton>
              </BottomToolbar>
            </>
          )}
        </ContentContainer>
      </ContentArea>

      <BackToTopButton />
      <PublicFooter />
    </ComparePageWrapper>
  )
}
