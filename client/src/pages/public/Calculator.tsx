import { useState, useMemo, useRef, useCallback, useEffect, type ChangeEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Calculator as CalcIcon, TrendingUp, DollarSign, Percent, ArrowDown, Landmark, Table2, PiggyBank, Printer, Share2, Check, AlertTriangle, Target, Clock, BarChart3, ShieldAlert, Link2, Copy } from 'lucide-react'
import { roiStages, zoningLabels, ZoningStage, type ZoningStageKey } from '../../utils/constants'
import { formatCurrency } from '../../utils/format'
import { calcAlternativeReturns } from '../../utils/investment'
import { calcTransactionCosts, calcExitCosts, calcAnnualHoldingCosts } from '../../utils/plot'
import PublicNav from '../../components/PublicNav'
import PublicFooter from '../../components/PublicFooter'
import BackToTopButton from '../../components/ui/BackToTopButton'
import Breadcrumb from '../../components/ui/Breadcrumb'
import { useMetaTags } from '../../hooks/useSEO'
import styled from 'styled-components'
import { theme, media } from '../../styles/theme'
import {
  PageWrapper,
  GlassPanel,
  GlassPanelPadded,
  Input,
  Select,
  SectionTitle,
  Label,
  SmallLabel,
  Muted,
  FlexRow,
  FlexCenter,
  FlexBetween,
  Divider,
  Grid2,
  fadeIn,
} from '../../styles/shared'

/* ═══════════════════════════════════════════════════════════
   Styled components — page-specific
   ═══════════════════════════════════════════════════════════ */

const PagePadding = styled.div`
  padding: 112px 16px 64px;
`

const Container = styled.div`
  max-width: 896px;
  margin: 0 auto;
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
`

const HeaderIconBox = styled.div`
  width: 48px;
  height: 48px;
  border-radius: ${theme.radii.xxl};
  background: rgba(200, 148, 42, 0.1);
  border: 1px solid rgba(200, 148, 42, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
`

const HeaderTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
`

const HeaderSubtitle = styled.p`
  font-size: 14px;
  color: ${theme.colors.slate[400]};
`

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  ${media.lg} {
    grid-template-columns: 2fr 3fr;
  }
`

const StickyPanel = styled(GlassPanel)`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: sticky;
  top: 96px;
`

const FormTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
  margin-bottom: 4px;
`

const PrefillBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(200, 148, 42, 0.08);
  border: 1px solid rgba(200, 148, 42, 0.15);
  border-radius: ${theme.radii.lg};
  font-size: 11px;
  color: ${theme.colors.gold};
`

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
`

const FieldLabel = styled.label`
  font-size: 12px;
  color: ${theme.colors.slate[400]};
  margin-bottom: 6px;
  display: block;
`

const FieldHint = styled.p`
  font-size: 10px;
  color: ${theme.colors.slate[600]};
  margin-top: 4px;
`

const FinancingToggle = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(10, 22, 40, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radii.xl};
  font-size: 14px;
  color: ${theme.colors.slate[300]};
  cursor: pointer;
  transition: all ${theme.transitions.normal};
  &:hover {
    border-color: rgba(200, 148, 42, 0.3);
  }
`

const FinancingToggleLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
`

const ArrowIcon = styled(ArrowDown)<{ $open: boolean }>`
  width: 14px;
  height: 14px;
  color: ${theme.colors.slate[500]};
  transition: transform ${theme.transitions.normal};
  ${({ $open }) => $open && 'transform: rotate(180deg);'}
`

const FinancingFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 4px;
  animation: ${fadeIn} 0.3s ease;
`

const ResultsCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

/* ── Empty state ── */
const EmptyPanel = styled(GlassPanel)`
  padding: 48px;
  text-align: center;
`

const EmptyText = styled.p`
  color: ${theme.colors.slate[500]};
`

const EmptyHint = styled.p`
  font-size: 12px;
  color: ${theme.colors.slate[600]};
  margin-top: 8px;
`

/* ── KPI grid ── */
const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  ${media.sm} {
    grid-template-columns: repeat(4, 1fr);
  }
`

const KpiCard = styled(GlassPanel)`
  padding: 16px;
  text-align: center;
  position: relative;
`

const KpiCardWide = styled(KpiCard)`
  grid-column: span 2;
  ${media.sm} {
    grid-column: span 1;
  }
`

const KpiLabel = styled.div`
  font-size: 10px;
  color: ${theme.colors.slate[400]};
  margin-bottom: 4px;
`

const KpiValue = styled.div<{ $color: string }>`
  font-size: 18px;
  font-weight: 700;
  color: ${({ $color }) => $color};
`

const KpiSub = styled.div`
  font-size: 9px;
  color: ${theme.colors.slate[500]};
  margin-top: 2px;
`

/* ── Stage progression ── */
interface StageRowProps {
  $isTarget?: boolean
  $isCurrent?: boolean
}

const StageRow = styled.div<StageRowProps>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  border-radius: ${theme.radii.lg};
  ${({ $isTarget }) => $isTarget && `
    background: rgba(200, 148, 42, 0.05);
    margin: 0 -8px;
    padding: 6px 8px;
  `}
  ${({ $isCurrent, $isTarget }) => $isCurrent && !$isTarget && `
    background: rgba(59, 130, 246, 0.05);
    margin: 0 -8px;
    padding: 6px 8px;
  `}
`

const StageLabel = styled.div`
  width: 100px;
  flex-shrink: 0;
  font-size: 10px;
  line-height: 1.3;
  color: ${theme.colors.slate[400]};
`

const StageBarTrack = styled.div`
  flex: 1;
  height: 12px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

const StageBarFill = styled.div`
  height: 100%;
  border-radius: 9999px;
  transition: all 0.5s ease;
`

const StageValue = styled.span<{ $color: string; $bold?: boolean }>`
  font-size: 10px;
  width: 80px;
  text-align: left;
  flex-shrink: 0;
  color: ${({ $color }) => $color};
  ${({ $bold }) => $bold && 'font-weight: 700;'}
`

/* ── Costs section ── */
const CostsSpace = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const CostCategoryLabel = styled.div`
  font-size: 10px;
  color: rgba(200, 148, 42, 0.7);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
`

const CostRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 14px;
`

const CostLabel = styled.span<{ $italic?: boolean; $color?: string }>`
  color: ${({ $color }) => $color || theme.colors.slate[400]};
  ${({ $italic }) => $italic && 'font-style: italic;'}
`

const CostValue = styled.span<{ $color?: string; $italic?: boolean }>`
  color: ${({ $color }) => $color || theme.colors.slate[300]};
  ${({ $italic }) => $italic && 'font-style: italic;'}
`

const CostSubtotal = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 500;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 8px;
`

const CostDivider = styled.div`
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 8px 0;
`

const CostDividerWide = styled.div`
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 12px 0;
`

const NetProfitBox = styled.div<{ $positive: boolean }>`
  border-radius: ${theme.radii.xl};
  padding: 12px;
  background: ${({ $positive }) => $positive
    ? 'rgba(16, 185, 129, 0.08)'
    : 'rgba(239, 68, 68, 0.08)'};
`

const NetProfitRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  margin-bottom: 4px;
`

const NetProfitLabel = styled.span`
  color: ${theme.colors.slate[200]};
  font-weight: 700;
`

const NetProfitValue = styled.span<{ $positive: boolean }>`
  font-weight: 700;
  font-size: 18px;
  color: ${({ $positive }) => $positive ? theme.colors.emerald[400] : theme.colors.red[400]};
`

const NetCagrRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11px;
`

const NetCagrLabel = styled.span`
  color: ${theme.colors.slate[500]};
`

const NetCagrValue = styled.span<{ $positive: boolean }>`
  font-weight: 700;
  color: ${({ $positive }) => $positive ? theme.colors.emerald[400] : theme.colors.red[400]};
`

/* ── Break-even section ── */
const BreakEvenPanel = styled(GlassPanelPadded)`
  border-color: rgba(245, 158, 11, 0.1);
`

const BreakEvenGrid = styled(Grid2)`
  margin-bottom: 12px;
`

const BreakEvenCard = styled.div`
  background: rgba(10, 22, 40, 0.4);
  border-radius: ${theme.radii.xl};
  padding: 12px;
  text-align: center;
`

const BreakEvenBarWrap = styled.div`
  position: relative;
  height: 12px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

const BreakEvenRedZone = styled.div<{ $width: number }>`
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  border-radius: 9999px;
  background: linear-gradient(to left, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.05));
  width: ${({ $width }) => Math.min(100, $width)}%;
`

const BreakEvenDot = styled.div<{ $right: string; $color: string }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  background: ${({ $color }) => $color};
  border: 2px solid ${theme.colors.navy};
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
  z-index: 10;
  right: ${({ $right }) => $right};
`

const BreakEvenLegend = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 9px;
  color: ${theme.colors.slate[500]};
`

const SafetyMarginNote = styled.div`
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: rgba(52, 211, 153, 0.8);
`

/* ── Financing section ── */
const FinanceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
`

const FinanceCard = styled.div`
  background: rgba(10, 22, 40, 0.4);
  border-radius: ${theme.radii.xl};
  padding: 12px;
  text-align: center;
`

const FinanceCardLabel = styled.div`
  font-size: 10px;
  color: ${theme.colors.slate[400]};
  margin-bottom: 4px;
`

const FinanceCardValue = styled.div<{ $color: string; $size?: string; $weight?: number }>`
  font-size: ${({ $size }) => $size || '16px'};
  font-weight: ${({ $weight }) => $weight || 700};
  color: ${({ $color }) => $color};
`

const FinanceTotalRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 12px;
`

/* ── Sensitivity table ── */
const TableWrap = styled.div`
  overflow-x: auto;
`

const SensTable = styled.table`
  width: 100%;
  font-size: 14px;
`

const SensTheadRow = styled.tr`
  font-size: 10px;
  color: ${theme.colors.slate[500]};
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`

const Th = styled.th<{ $align?: string }>`
  text-align: ${({ $align }) => $align || 'center'};
  padding: 8px 0;
  font-weight: 500;
`

const ThFlex = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
`

const SensRow = styled.tr<{ $selected?: boolean }>`
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  ${({ $selected }) => $selected && `background: rgba(200, 148, 42, 0.05);`}
`

const Td = styled.td<{ $color?: string; $align?: string; $bold?: boolean; $size?: string }>`
  padding: 10px 0;
  text-align: ${({ $align }) => $align || 'center'};
  color: ${({ $color }) => $color || 'inherit'};
  ${({ $bold }) => $bold && 'font-weight: 700;'}
  ${({ $size }) => $size && `font-size: ${$size};`}
`

const SensFootnote = styled.p`
  font-size: 9px;
  color: ${theme.colors.slate[600]};
  margin-top: 12px;
`

/* ── Alternatives section ── */
const AltSubtitle = styled.p`
  font-size: 10px;
  color: ${theme.colors.slate[500]};
  margin-bottom: 16px;
`

const AltItemsWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
`

const AltCard = styled.div<{ $isLand: boolean }>`
  border-radius: ${theme.radii.xl};
  padding: 12px;
  border: 1px solid ${({ $isLand }) => $isLand
    ? 'rgba(200, 148, 42, 0.15)'
    : 'rgba(255, 255, 255, 0.05)'};
  background: ${({ $isLand }) => $isLand
    ? 'rgba(200, 148, 42, 0.05)'
    : 'rgba(255, 255, 255, 0.02)'};
`

const AltCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`

const AltCardLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const AltEmoji = styled.span`
  font-size: 16px;
`

const AltName = styled.span<{ $isLand: boolean }>`
  font-size: 12px;
  font-weight: 500;
  color: ${({ $isLand }) => $isLand ? theme.colors.gold : theme.colors.slate[300]};
`

const AltHereBadge = styled.span`
  font-size: 8px;
  font-weight: 900;
  color: rgba(200, 148, 42, 0.6);
  background: rgba(200, 148, 42, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
`

const AltFutureValue = styled.div<{ $isLand: boolean }>`
  font-size: 14px;
  font-weight: 700;
  color: ${({ $isLand }) => $isLand ? theme.colors.gold : theme.colors.slate[200]};
`

const AltBarTrack = styled.div`
  height: 10px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
  margin-bottom: 6px;
`

const AltBarFill = styled.div`
  height: 100%;
  border-radius: 9999px;
  transition: all 0.7s ease;
`

const AltFooterRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
`

const AltRate = styled.span`
  color: ${theme.colors.slate[500]};
`

const AltProfit = styled.span<{ $positive: boolean }>`
  font-weight: 500;
  color: ${({ $positive }) => $positive
    ? 'rgba(52, 211, 153, 0.8)'
    : 'rgba(248, 113, 113, 0.8)'};
`

/* ── Real returns panel ── */
const RealReturnsPanel = styled.div`
  background: rgba(10, 22, 40, 0.4);
  border-radius: ${theme.radii.xl};
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`

const RealReturnsHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
`

const RealReturnsTitle = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${theme.colors.slate[300]};
`

const RealReturnsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
`

const RealReturnCell = styled.div<{ $isMain?: boolean }>`
  text-align: center;
  padding: 8px 0;
  border-radius: ${theme.radii.lg};
  background: ${({ $isMain }) => $isMain ? 'rgba(200, 148, 42, 0.08)' : 'rgba(255, 255, 255, 0.02)'};
`

const RealReturnLabel = styled.div`
  font-size: 10px;
  color: ${theme.colors.slate[500]};
  margin-bottom: 2px;
`

const RealReturnValue = styled.div<{ $color: string }>`
  font-size: 14px;
  font-weight: 700;
  color: ${({ $color }) => $color};
`

const RealReturnUnit = styled.div`
  font-size: 8px;
  color: ${theme.colors.slate[600]};
`

/* ── Verdict ── */
const VerdictRow = styled.div<{ $color: string }>`
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: ${({ $color }) => $color};
`

/* ── Share buttons ── */
const ShareRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px;
`

const ShareBtn = styled.button<{ $bg: string; $border: string; $color: string; $hoverBg: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: ${theme.radii.xl};
  font-size: 14px;
  font-weight: 500;
  background: ${({ $bg }) => $bg};
  border: 1px solid ${({ $border }) => $border};
  color: ${({ $color }) => $color};
  cursor: pointer;
  transition: all ${theme.transitions.normal};
  &:hover {
    background: ${({ $hoverBg }) => $hoverBg};
  }
`

/* ── Disclaimer ── */
const Disclaimer = styled.p`
  font-size: 10px;
  color: ${theme.colors.slate[600]};
  text-align: center;
`

/* ═══════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════ */

interface ShareAnalysisProps {
  result: CalculatorResult | null
  purchasePrice: string
  plotSize: string
  currentZoning: string
  targetZoning: string
}

interface SensitivityRow {
  years: number
  cagr: number
  netCagr: number
  realCagr: number
  netWithFinancing: number
  holdCosts: number
  isSelected: boolean
}

interface HoldingCosts {
  arnona: number
  management: number
  opportunityCost: number
  totalAnnual: number
  totalWithOpportunity: number
  arnonaPerSqm: number
}

interface StageData {
  label: string
  pricePerSqM: number
  isCurrent: boolean
  value: number
  isTarget: boolean
}

interface CalculatorResult {
  currentPricePerSqm: number
  targetPricePerSqm: number
  projectedValue: number
  roiPercent: number
  purchaseTax: number
  lawyerFee: number
  bettermentLevy: number
  capitalGainsTax: number
  agentCommission: number
  totalCosts: number
  netProfit: number
  stages: StageData[]
  annualizedRoi: number
  netAnnualizedRoi: number
  holdingYears: number
  holding: HoldingCosts
  totalHoldingCosts: number
  breakEvenPrice: number
  breakEvenPerSqm: number
  appraiserFee: number
  registrationFee: number
  downPayment: number
  loanAmount: number
  monthlyPayment: number
  totalInterest: number
  totalLoanPayments: number
  sensitivity: SensitivityRow[]
}

interface SavedInputs {
  purchasePrice?: string
  plotSize?: string
  currentZoning?: string
  targetZoning?: string
  holdingYears?: string
  downPaymentPct?: string
  interestRate?: string
  loanYears?: string
}

// ─── Auto-save calculator inputs to localStorage ─────────────────────
// Investors spend time configuring scenarios — losing inputs on refresh is frustrating.
// Like Madlan's "remembered" calculator state, this persists all fields so users can
// close the tab and return later to the exact same analysis. URL params take priority
// over saved state (enables sharing + pre-fill from PlotDetail).
const CALC_STORAGE_KEY = 'landmap_calculator_inputs'

function loadSavedInputs(): SavedInputs | null {
  try {
    const raw = localStorage.getItem(CALC_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveInputs(inputs: SavedInputs): void {
  try {
    localStorage.setItem(CALC_STORAGE_KEY, JSON.stringify(inputs))
  } catch { /* quota exceeded — non-critical */ }
}

const zoningOptions = Object.entries(zoningLabels) as [ZoningStageKey, string][]

/**
 * ShareAnalysis — action bar with Copy Link, WhatsApp share, and Print.
 * The Copy Link button copies the current URL (which includes all calculator params
 * via the bidirectional URL sync above). Recipients get the exact same analysis.
 * Like Madlan's "שתף ניתוח" but with the full calculator configuration embedded in URL.
 */
function ShareAnalysis({ result, purchasePrice, plotSize, currentZoning, targetZoning }: ShareAnalysisProps) {
  const [linkCopied, setLinkCopied] = useState(false)

  const handleCopyLink = useCallback(() => {
    // URL already contains all params via the bidirectional sync effect
    navigator.clipboard.writeText(window.location.href).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    }).catch(() => {})
  }, [])

  const handleWhatsApp = useCallback(() => {
    if (!result) return
    const price = parseFloat(purchasePrice)
    const alternatives = price > 0 ? calcAlternativeReturns(price, result.netProfit, result.holdingYears) : null
    const text = [
      `📊 דוח השקעה — LandMap Israel`,
      ``,
      `💰 מחיר רכישה: ${formatCurrency(price)}`,
      `📐 שטח: ${parseFloat(plotSize).toLocaleString()} מ״ר`,
      `🏗️ ייעוד: ${zoningLabels[currentZoning as ZoningStageKey]} → ${zoningLabels[targetZoning as ZoningStageKey]}`,
      `📈 תשואה כוללת: +${result.roiPercent}%`,
      `📅 CAGR (${result.holdingYears} שנים): +${result.annualizedRoi}%`,
      `💵 רווח נקי: ${formatCurrency(result.netProfit)}`,
      `🎯 נקודת איזון: ${formatCurrency(result.breakEvenPrice)}`,
      ...(alternatives ? [
        ``,
        `📊 השוואת אלטרנטיבות:`,
        `🏗️ קרקע: ${formatCurrency(alternatives.land.futureValue)} (${Math.round(alternatives.land.rate * 100)}%/שנה)`,
        `📊 מניות: ${formatCurrency(alternatives.stock.futureValue)} (9%/שנה)`,
        `🏦 פיקדון: ${formatCurrency(alternatives.bank.futureValue)} (4.5%/שנה)`,
      ] : []),
      ``,
      `🔗 ראה ניתוח מלא:`,
      window.location.href,
    ].join('\n')
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }, [result, purchasePrice, plotSize, currentZoning, targetZoning])

  return (
    <ShareRow>
      <ShareBtn
        onClick={handleCopyLink}
        $bg={linkCopied ? 'rgba(16,185,129,0.15)' : 'rgba(200,148,42,0.1)'}
        $border={linkCopied ? 'rgba(16,185,129,0.25)' : 'rgba(200,148,42,0.2)'}
        $color={linkCopied ? theme.colors.emerald[400] : theme.colors.gold}
        $hoverBg={linkCopied ? 'rgba(16,185,129,0.15)' : 'rgba(200,148,42,0.2)'}
      >
        {linkCopied
          ? <Check style={{ width: 16, height: 16 }} />
          : <Link2 style={{ width: 16, height: 16 }} />
        }
        {linkCopied ? 'הקישור הועתק!' : 'העתק קישור'}
      </ShareBtn>
      <ShareBtn
        onClick={handleWhatsApp}
        $bg="rgba(37,211,102,0.1)"
        $border="rgba(37,211,102,0.2)"
        $color="#25D366"
        $hoverBg="rgba(37,211,102,0.2)"
      >
        <Share2 style={{ width: 16, height: 16 }} />
        שתף ב-WhatsApp
      </ShareBtn>
      <ShareBtn
        onClick={() => window.print()}
        $bg="rgba(255,255,255,0.05)"
        $border="rgba(255,255,255,0.1)"
        $color={theme.colors.slate[300]}
        $hoverBg="rgba(255,255,255,0.05)"
      >
        <Printer style={{ width: 16, height: 16 }} />
        הדפס דוח
      </ShareBtn>
    </ShareRow>
  )
}

/**
 * Calculator JSON-LD — helps Google surface the calculator in search results.
 * Implements WebApplication schema with "FinanceApplication" applicationCategory.
 * Like financial calculator rich snippets on NerdWallet, Bankrate, etc.
 */
function CalculatorJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'מחשבון השקעה בקרקע — LandMap Israel',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'All',
    url: window.location.origin + '/calculator',
    description: 'מחשבון תשואה מלא להשקעה בקרקע בישראל — חישוב CAGR, מסים, היטל השבחה, עלויות מימון והשוואת אלטרנטיבות.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'ILS',
    },
    provider: {
      '@type': 'Organization',
      name: 'LandMap Israel',
      url: window.location.origin,
    },
    featureList: 'חישוב ROI, CAGR, מס רכישה, היטל השבחה, מס שבח, סימולציית מימון, ניתוח רגישות, השוואת אלטרנטיבות',
    inLanguage: 'he',
  }
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  )
}

/** Calculate monthly mortgage payment using standard amortization formula */
function calcMonthlyPayment(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || annualRate <= 0 || years <= 0) return 0
  const r = annualRate / 100 / 12
  const n = years * 12
  return Math.round(principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))
}

export default function Calculator() {
  const [searchParams] = useSearchParams()

  useMetaTags({
    title: 'מחשבון השקעה בקרקע — חישוב תשואה, מסים ועלויות | LandMap Israel',
    description: 'חשבו תשואה צפויה, היטל השבחה, מס רכישה, CAGR ועלויות מימון להשקעה בקרקע בישראל. סימולציית מימון מלאה.',
    url: `${window.location.origin}/calculator`,
  })

  const [, setSearchParams] = useSearchParams()

  // Support URL pre-fill from PlotDetail (e.g., /calculator?price=500000&size=2000&zoning=AGRICULTURAL&years=5)
  // This creates a seamless Plot → Calculator flow like Madlan's "חשב תשואה" button.
  // Fallback order: URL params → localStorage saved state → defaults
  const saved = useMemo(() => loadSavedInputs(), [])
  const [purchasePrice, setPurchasePrice] = useState(() => searchParams.get('price') || saved?.purchasePrice || '')
  const [plotSize, setPlotSize] = useState(() => searchParams.get('size') || saved?.plotSize || '')
  const [currentZoning, setCurrentZoning] = useState(() => {
    const z = searchParams.get('zoning') || saved?.currentZoning
    return z && zoningOptions.some(([k]) => k === z) ? z : 'AGRICULTURAL'
  })
  const [targetZoning, setTargetZoning] = useState(() => {
    const z = searchParams.get('target') || saved?.targetZoning
    return z && zoningOptions.some(([k]) => k === z) ? z : 'BUILDING_PERMIT'
  })
  const [holdingYears, setHoldingYears] = useState(() => searchParams.get('years') || saved?.holdingYears || '5')
  const prefilled = searchParams.get('price') && searchParams.get('size')
  // Financing inputs — restored from URL params → localStorage → defaults
  const [downPaymentPct, setDownPaymentPct] = useState(() => searchParams.get('dp') || saved?.downPaymentPct || '30')
  const [interestRate, setInterestRate] = useState(() => searchParams.get('rate') || saved?.interestRate || '4.5')
  const [loanYears, setLoanYears] = useState(() => searchParams.get('loan') || saved?.loanYears || '15')
  // Auto-open financing section if URL contains financing params
  const [showFinancing, setShowFinancing] = useState(() => !!(searchParams.get('dp') || searchParams.get('rate') || searchParams.get('loan')))

  // Auto-save all calculator inputs to localStorage on every change.
  // Debounce isn't needed here — JSON.stringify is fast for 8 fields (~50μs).
  useEffect(() => {
    saveInputs({
      purchasePrice, plotSize, currentZoning, targetZoning,
      holdingYears, downPaymentPct, interestRate, loanYears,
    })
  }, [purchasePrice, plotSize, currentZoning, targetZoning, holdingYears, downPaymentPct, interestRate, loanYears])

  // ── Bidirectional URL sync — shareable calculator links ─────────────
  // Writes all inputs back to URL params as the user changes them.
  // This means copy-pasting the URL gives the exact same analysis —
  // like Madlan's shareable property analysis. Combined with the existing
  // URL-read on mount, this creates a fully bidirectional URL ↔ state sync.
  // Uses replaceState (replace: true) to avoid polluting browser history.
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    // Debounce URL writes by 400ms — rapid typing shouldn't thrash the URL bar.
    // Shorter than localStorage save (instant) because URL changes are more visible.
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => {
      const params = new URLSearchParams()
      if (purchasePrice) params.set('price', purchasePrice)
      if (plotSize) params.set('size', plotSize)
      if (currentZoning !== 'AGRICULTURAL') params.set('zoning', currentZoning)
      if (targetZoning !== 'BUILDING_PERMIT') params.set('target', targetZoning)
      if (holdingYears && holdingYears !== '5') params.set('years', holdingYears)
      if (showFinancing) {
        if (downPaymentPct && downPaymentPct !== '30') params.set('dp', downPaymentPct)
        if (interestRate && interestRate !== '4.5') params.set('rate', interestRate)
        if (loanYears && loanYears !== '15') params.set('loan', loanYears)
      }
      setSearchParams(params, { replace: true })
    }, 400)
    return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current) }
  }, [purchasePrice, plotSize, currentZoning, targetZoning, holdingYears, downPaymentPct, interestRate, loanYears, showFinancing])

  const result = useMemo((): CalculatorResult | null => {
    const price = parseFloat(purchasePrice)
    const size = parseFloat(plotSize)
    if (!price || !size || price <= 0 || size <= 0) return null

    const currentIdx = roiStages.findIndex(
      (s) => s.label === zoningLabels[currentZoning as ZoningStageKey] || zoningOptions.findIndex(([k]) => k === currentZoning) === roiStages.indexOf(s)
    )
    const targetIdx = roiStages.findIndex(
      (s) => s.label === zoningLabels[targetZoning as ZoningStageKey] || zoningOptions.findIndex(([k]) => k === targetZoning) === roiStages.indexOf(s)
    )

    // Fallback: use index-based mapping (zoning options and roiStages are same order/length)
    const cIdx = zoningOptions.findIndex(([k]) => k === currentZoning)
    const tIdx = zoningOptions.findIndex(([k]) => k === targetZoning)

    if (cIdx < 0 || tIdx < 0 || tIdx <= cIdx) return null

    const currentPricePerSqm = Math.round(price / size)
    const targetPricePerSqm = roiStages[tIdx]?.pricePerSqM || 0
    const projectedValue = Math.round(targetPricePerSqm * size)
    const roiPercent = Math.round((projectedValue - price) / price * 100)

    // Use centralized cost utilities (consistent with Compare page and sidebar)
    const transaction = calcTransactionCosts(price)
    const exit = calcExitCosts(price, projectedValue)
    const years = parseFloat(holdingYears) || 5
    const holding = calcAnnualHoldingCosts(price, size, currentZoning)
    const totalHoldingCosts = holding.totalAnnual * years

    // Legacy aliases for backward compatibility with existing UI
    const purchaseTax = transaction.purchaseTax
    const lawyerFee = transaction.attorneyFees
    const bettermentLevy = exit.bettermentLevy
    const capitalGainsTax = exit.capitalGains
    const agentCommission = exit.agentCommission
    const totalCosts = transaction.total
    const netProfit = exit.netProfit - totalHoldingCosts

    // Progress stages
    const stages = roiStages.slice(cIdx, tIdx + 1).map((s, i) => ({
      ...s,
      value: Math.round(s.pricePerSqM * size),
      isCurrent: i === 0,
      isTarget: i === tIdx - cIdx,
    }))

    // Annualized ROI (CAGR) based on holding period
    const annualizedRoi = years > 0
      ? Math.round((Math.pow((projectedValue / price), 1 / years) - 1) * 100)
      : 0
    const netAnnualizedRoi = years > 0 && price > 0
      ? Math.round((Math.pow(((price + netProfit) / price), 1 / years) - 1) * 100)
      : 0

    // Break-even analysis — what's the minimum selling price to not lose money?
    // Includes all entry costs, holding costs, and exit cost structure.
    // Investors use this to decide their minimum acceptable offer.
    const breakEvenPrice = (() => {
      // Total sunk costs: purchase + transaction + holding
      const sunk = transaction.totalWithPurchase + totalHoldingCosts
      // At break-even: sale_price - exit_costs(sale_price) = sunk
      // exit_costs = betterment(50% of gain) + capital_gains(25% of taxable) + agent(1%)
      // Simplify: iterate to find break-even (Newton's method approximation)
      let guess = sunk * 1.1 // start slightly above sunk cost
      for (let i = 0; i < 20; i++) {
        const exitAtGuess = calcExitCosts(price, guess)
        const net = guess - price - transaction.total - totalHoldingCosts - exitAtGuess.totalExit
        const target = 0 // break-even = net profit of 0
        const error = net - target
        if (Math.abs(error) < 100) break // close enough (within ₪100)
        // Adjust: if net > 0, guess is too high; if net < 0, guess is too low
        guess -= error * 0.6 // damped correction
      }
      return Math.round(guess)
    })()
    const breakEvenPerSqm = size > 0 ? Math.round(breakEvenPrice / size) : 0

    // Financing calculations
    const dpPct = parseFloat(downPaymentPct) || 30
    const downPayment = Math.round(price * dpPct / 100)
    const loanAmount = price - downPayment
    const rate = parseFloat(interestRate) || 4.5
    const loanDuration = parseInt(loanYears) || 15
    const monthlyPayment = calcMonthlyPayment(loanAmount, rate, loanDuration)
    const totalLoanPayments = monthlyPayment * loanDuration * 12
    const totalInterest = totalLoanPayments - loanAmount

    // Sensitivity analysis: ROI across different holding periods
    const sensitivityYears = [3, 5, 7, 10, 15]
    const INFLATION_RATE = 0.03 // Israel avg CPI ~3%/yr
    const sensitivity: SensitivityRow[] = sensitivityYears.map(y => {
      const cagr = y > 0 ? Math.round((Math.pow(projectedValue / price, 1 / y) - 1) * 100) : 0
      const holdCosts = holding.totalAnnual * y
      const netAfterAll = exit.netProfit - holdCosts
      const netCagr = y > 0 && price > 0 ? Math.round((Math.pow(Math.max(0, (price + netAfterAll)) / price, 1 / y) - 1) * 100) : 0
      const totalFinancingCost = calcMonthlyPayment(loanAmount, rate, Math.min(loanDuration, y)) * Math.min(loanDuration, y) * 12
      const netWithFinancing = netAfterAll - (totalFinancingCost - loanAmount)
      // Real CAGR (inflation-adjusted) — what the investor actually earns in purchasing power
      const nominalRate = netCagr / 100
      const realRate = ((1 + nominalRate) / (1 + INFLATION_RATE)) - 1
      const realCagr = Math.round(realRate * 100)
      return { years: y, cagr, netCagr, realCagr, netWithFinancing, holdCosts, isSelected: y === years }
    })

    return {
      currentPricePerSqm,
      targetPricePerSqm,
      projectedValue,
      roiPercent,
      purchaseTax,
      lawyerFee,
      bettermentLevy,
      capitalGainsTax,
      agentCommission,
      totalCosts,
      netProfit,
      stages,
      annualizedRoi,
      netAnnualizedRoi,
      holdingYears: years,
      // Holding costs
      holding,
      totalHoldingCosts,
      // Break-even
      breakEvenPrice,
      breakEvenPerSqm,
      // Transaction detail
      appraiserFee: transaction.appraiserFee,
      registrationFee: transaction.registrationFee,
      // Financing
      downPayment,
      loanAmount,
      monthlyPayment,
      totalInterest,
      totalLoanPayments,
      // Sensitivity
      sensitivity,
    }
  }, [purchasePrice, plotSize, currentZoning, targetZoning, holdingYears, downPaymentPct, interestRate, loanYears])

  return (
    <PageWrapper>
      <PublicNav />
      <CalculatorJsonLd />

      <PagePadding>
        <Container>
          <Breadcrumb
            items={[
              { label: 'מפה', to: '/' },
              { label: 'מחשבון השקעה' },
            ]}
          />
          <HeaderRow>
            <HeaderIconBox>
              <CalcIcon style={{ width: 24, height: 24, color: theme.colors.gold }} />
            </HeaderIconBox>
            <div>
              <HeaderTitle>מחשבון השקעה</HeaderTitle>
              <HeaderSubtitle>חשבו תשואה צפויה והוצאות נלוות</HeaderSubtitle>
            </div>
          </HeaderRow>

          <MainGrid>
            {/* Input form */}
            <div>
              <StickyPanel>
                <FormTitle>פרטי העסקה</FormTitle>
                {/* Prefill indicator — shows when calculator was opened from PlotDetail */}
                {prefilled && (
                  <PrefillBanner>
                    <span>✨</span>
                    <span>הנתונים מולאו אוטומטית מפרטי החלקה</span>
                  </PrefillBanner>
                )}

                {/* Purchase price */}
                <FieldGroup>
                  <FieldLabel>מחיר רכישה (₪)</FieldLabel>
                  <Input
                    type="number"
                    placeholder="2,500,000"
                    value={purchasePrice}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPurchasePrice(e.target.value)}
                    dir="ltr"
                  />
                </FieldGroup>

                {/* Plot size */}
                <FieldGroup>
                  <FieldLabel>שטח (מ"ר)</FieldLabel>
                  <Input
                    type="number"
                    placeholder="1,000"
                    value={plotSize}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPlotSize(e.target.value)}
                    dir="ltr"
                  />
                </FieldGroup>

                {/* Current zoning */}
                <FieldGroup>
                  <FieldLabel>ייעוד נוכחי</FieldLabel>
                  <Select
                    value={currentZoning}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setCurrentZoning(e.target.value)}
                  >
                    {zoningOptions.map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </Select>
                </FieldGroup>

                {/* Target zoning */}
                <FieldGroup>
                  <FieldLabel>ייעוד יעד</FieldLabel>
                  <Select
                    value={targetZoning}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setTargetZoning(e.target.value)}
                  >
                    {zoningOptions.map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </Select>
                </FieldGroup>

                {/* Holding period */}
                <FieldGroup>
                  <FieldLabel>תקופת החזקה (שנים)</FieldLabel>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    placeholder="5"
                    value={holdingYears}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setHoldingYears(e.target.value)}
                    dir="ltr"
                  />
                  <FieldHint>משפיע על חישוב תשואה שנתית (CAGR)</FieldHint>
                </FieldGroup>

                {/* Financing toggle */}
                <FinancingToggle onClick={() => setShowFinancing(prev => !prev)}>
                  <FinancingToggleLabel>
                    <Landmark style={{ width: 16, height: 16, color: theme.colors.gold }} />
                    סימולציית מימון
                  </FinancingToggleLabel>
                  <ArrowIcon $open={showFinancing} />
                </FinancingToggle>

                {showFinancing && (
                  <FinancingFields>
                    <FieldGroup>
                      <FieldLabel>הון עצמי (%)</FieldLabel>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={downPaymentPct}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setDownPaymentPct(e.target.value)}
                        dir="ltr"
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <FieldLabel>ריבית שנתית (%)</FieldLabel>
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        step="0.1"
                        value={interestRate}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setInterestRate(e.target.value)}
                        dir="ltr"
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <FieldLabel>תקופת הלוואה (שנים)</FieldLabel>
                      <Input
                        type="number"
                        min="1"
                        max="30"
                        value={loanYears}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setLoanYears(e.target.value)}
                        dir="ltr"
                      />
                    </FieldGroup>
                  </FinancingFields>
                )}
              </StickyPanel>
            </div>

            {/* Results */}
            <ResultsCol>
              {!result ? (
                <EmptyPanel>
                  <CalcIcon style={{ width: 48, height: 48, color: theme.colors.slate[600], margin: '0 auto 16px' }} />
                  <EmptyText>הזינו פרטי עסקה כדי לראות את התוצאות</EmptyText>
                  <EmptyHint>ודאו שייעוד היעד מתקדם יותר מהייעוד הנוכחי</EmptyHint>
                </EmptyPanel>
              ) : (
                <>
                  {/* KPI cards — key metrics at a glance (like a Bloomberg terminal summary) */}
                  <KpiGrid>
                    <KpiCard>
                      <KpiLabel>מחיר/מ"ר נוכחי</KpiLabel>
                      <KpiValue $color={theme.colors.blue[400]}>{result.currentPricePerSqm.toLocaleString()} ₪</KpiValue>
                    </KpiCard>
                    <KpiCard>
                      <KpiLabel>מחיר/מ"ר ביעד</KpiLabel>
                      <KpiValue $color={theme.colors.emerald[400]}>{result.targetPricePerSqm.toLocaleString()} ₪</KpiValue>
                    </KpiCard>
                    <KpiCard>
                      <KpiLabel>שווי צפוי</KpiLabel>
                      <KpiValue $color={theme.colors.gold}>{formatCurrency(result.projectedValue)}</KpiValue>
                    </KpiCard>
                    <KpiCard>
                      <KpiLabel>תשואה כוללת</KpiLabel>
                      <KpiValue $color={theme.colors.emerald[400]}>+{result.roiPercent}%</KpiValue>
                    </KpiCard>
                    <KpiCard>
                      <KpiLabel>תשואה שנתית (CAGR)</KpiLabel>
                      <KpiValue $color={theme.colors.amber[400]}>+{result.annualizedRoi}%</KpiValue>
                      <KpiSub>על פני {result.holdingYears} שנים</KpiSub>
                    </KpiCard>
                    <KpiCard>
                      <KpiLabel>נקודת איזון</KpiLabel>
                      <KpiValue $color={theme.colors.amber[400]}>{formatCurrency(result.breakEvenPrice)}</KpiValue>
                      <KpiSub>מינימום למכירה</KpiSub>
                    </KpiCard>
                    <KpiCardWide>
                      <KpiLabel>תשואה ריאלית נטו</KpiLabel>
                      <KpiValue $color={result.netAnnualizedRoi - 3 >= 0 ? theme.colors.purple[400] : theme.colors.red[400]}>
                        {result.netAnnualizedRoi - 3 >= 0 ? '+' : ''}{result.netAnnualizedRoi - 3}%
                      </KpiValue>
                      <KpiSub>בניכוי אינפלציה (~3%)</KpiSub>
                    </KpiCardWide>
                  </KpiGrid>

                  {/* Value progression */}
                  <GlassPanelPadded>
                    <SectionTitle>
                      <TrendingUp style={{ width: 16, height: 16, color: theme.colors.gold }} />
                      התקדמות ערך לפי שלבי תכנון
                    </SectionTitle>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {result.stages.map((stage, i) => {
                        const maxVal = result.stages[result.stages.length - 1].value
                        const barW = maxVal > 0 ? (stage.value / maxVal) * 100 : 0
                        return (
                          <StageRow key={i} $isTarget={stage.isTarget} $isCurrent={stage.isCurrent}>
                            <StageLabel>{stage.label}</StageLabel>
                            <StageBarTrack>
                              <StageBarFill
                                style={{
                                  width: `${barW}%`,
                                  background: stage.isTarget
                                    ? 'linear-gradient(90deg, #C8942A, #E5B94E)'
                                    : stage.isCurrent
                                      ? 'linear-gradient(90deg, #3B82F6, #60A5FA)'
                                      : 'rgba(148,163,184,0.2)',
                                }}
                              />
                            </StageBarTrack>
                            <StageValue
                              $color={
                                stage.isTarget ? theme.colors.gold
                                  : stage.isCurrent ? theme.colors.blue[400]
                                  : theme.colors.slate[500]
                              }
                              $bold={stage.isTarget || stage.isCurrent}
                            >
                              {formatCurrency(stage.value)}
                            </StageValue>
                          </StageRow>
                        )
                      })}
                    </div>
                  </GlassPanelPadded>

                  {/* Costs breakdown — comprehensive P&L like Madlan's investment analysis */}
                  <GlassPanelPadded>
                    <SectionTitle>
                      <DollarSign style={{ width: 16, height: 16, color: theme.colors.gold }} />
                      פירוט עלויות מלא
                    </SectionTitle>
                    <CostsSpace>
                      {/* Entry costs */}
                      <CostCategoryLabel>עלויות כניסה</CostCategoryLabel>
                      <CostRow>
                        <CostLabel>מס רכישה (6%)</CostLabel>
                        <CostValue>{formatCurrency(result.purchaseTax)}</CostValue>
                      </CostRow>
                      <CostRow>
                        <CostLabel>שכ"ט עו"ד (~1.75%)</CostLabel>
                        <CostValue>{formatCurrency(result.lawyerFee)}</CostValue>
                      </CostRow>
                      <CostRow>
                        <CostLabel>שמאי</CostLabel>
                        <CostValue>{formatCurrency(result.appraiserFee)}</CostValue>
                      </CostRow>
                      <CostRow>
                        <CostLabel>אגרת רישום (טאבו)</CostLabel>
                        <CostValue>{formatCurrency(result.registrationFee)}</CostValue>
                      </CostRow>
                      <CostSubtotal>
                        <span style={{ color: theme.colors.blue[400] }}>סה״כ עלויות כניסה</span>
                        <span style={{ color: theme.colors.blue[400] }}>{formatCurrency(result.totalCosts)}</span>
                      </CostSubtotal>

                      {/* Holding costs — often overlooked by novice investors */}
                      <CostDivider />
                      <CostCategoryLabel>עלויות החזקה שנתיות</CostCategoryLabel>
                      <CostRow>
                        <CostLabel>ארנונה ({result.holding.arnonaPerSqm} ₪/מ״ר)</CostLabel>
                        <CostValue>{formatCurrency(result.holding.arnona)}/שנה</CostValue>
                      </CostRow>
                      <CostRow>
                        <CostLabel>ניהול וגידור</CostLabel>
                        <CostValue>{formatCurrency(result.holding.management)}/שנה</CostValue>
                      </CostRow>
                      <CostRow>
                        <CostLabel $color={theme.colors.slate[500]} $italic>עלות הזדמנות (8% שנתי)</CostLabel>
                        <CostValue $color={theme.colors.slate[500]} $italic>{formatCurrency(result.holding.opportunityCost)}/שנה</CostValue>
                      </CostRow>
                      <CostSubtotal>
                        <span style={{ color: theme.colors.orange[400] }}>סה״כ {result.holdingYears} שנים (ללא הזדמנות)</span>
                        <span style={{ color: theme.colors.orange[400] }}>{formatCurrency(result.totalHoldingCosts)}</span>
                      </CostSubtotal>

                      {/* Exit costs */}
                      <CostDivider />
                      <CostCategoryLabel>עלויות יציאה</CostCategoryLabel>
                      <CostRow>
                        <CostLabel>היטל השבחה (50% מהרווח)</CostLabel>
                        <CostValue $color="rgba(248,113,113,0.8)">-{formatCurrency(result.bettermentLevy)}</CostValue>
                      </CostRow>
                      <CostRow>
                        <CostLabel>מס שבח (25% מהחייב)</CostLabel>
                        <CostValue $color="rgba(248,113,113,0.8)">-{formatCurrency(result.capitalGainsTax)}</CostValue>
                      </CostRow>
                      <CostRow>
                        <CostLabel>עמלת מתווך (~1%)</CostLabel>
                        <CostValue $color="rgba(248,113,113,0.8)">-{formatCurrency(result.agentCommission)}</CostValue>
                      </CostRow>

                      {/* Bottom line */}
                      <CostDividerWide />
                      <NetProfitBox $positive={result.netProfit >= 0}>
                        <NetProfitRow>
                          <NetProfitLabel>✨ רווח נקי (אחרי הכל)</NetProfitLabel>
                          <NetProfitValue $positive={result.netProfit >= 0}>
                            {formatCurrency(result.netProfit)}
                          </NetProfitValue>
                        </NetProfitRow>
                        <NetCagrRow>
                          <NetCagrLabel>תשואה נקי שנתית (CAGR)</NetCagrLabel>
                          <NetCagrValue $positive={result.netAnnualizedRoi >= 0}>
                            {result.netAnnualizedRoi >= 0 ? '+' : ''}{result.netAnnualizedRoi}%
                          </NetCagrValue>
                        </NetCagrRow>
                      </NetProfitBox>
                    </CostsSpace>
                  </GlassPanelPadded>

                  {/* Break-even analysis — shows minimum selling price to avoid loss.
                      Key negotiation tool: investors know their floor price. */}
                  <BreakEvenPanel>
                    <SectionTitle>
                      <Target style={{ width: 16, height: 16, color: theme.colors.amber[400] }} />
                      ניתוח נקודת איזון
                    </SectionTitle>
                    <BreakEvenGrid>
                      <BreakEvenCard>
                        <KpiLabel>מחיר מכירה מינימלי</KpiLabel>
                        <KpiValue $color={theme.colors.amber[400]}>{formatCurrency(result.breakEvenPrice)}</KpiValue>
                        <KpiSub>לא להפסיד כסף</KpiSub>
                      </BreakEvenCard>
                      <BreakEvenCard>
                        <KpiLabel>מחיר/מ״ר מינימלי</KpiLabel>
                        <KpiValue $color={theme.colors.amber[400]}>{result.breakEvenPerSqm.toLocaleString()} ₪</KpiValue>
                        <KpiSub>vs {result.targetPricePerSqm.toLocaleString()} ₪ צפי</KpiSub>
                      </BreakEvenCard>
                    </BreakEvenGrid>
                    <BreakEvenBarWrap>
                      <BreakEvenRedZone
                        $width={(result.breakEvenPrice / result.projectedValue) * 100}
                      />
                      <BreakEvenDot
                        $color={theme.colors.amber[400]}
                        $right={`calc(${Math.min(96, (result.breakEvenPrice / result.projectedValue) * 100)}% - 5px)`}
                        title={`נקודת איזון: ${formatCurrency(result.breakEvenPrice)}`}
                      />
                      <BreakEvenDot
                        $color={theme.colors.emerald[400]}
                        $right="calc(100% - 10px)"
                        title={`שווי צפוי: ${formatCurrency(result.projectedValue)}`}
                      />
                    </BreakEvenBarWrap>
                    <BreakEvenLegend>
                      <span>מחיר רכישה</span>
                      <span style={{ color: theme.colors.amber[400] }}>איזון</span>
                      <span style={{ color: theme.colors.emerald[400] }}>שווי צפוי</span>
                    </BreakEvenLegend>
                    {result.breakEvenPrice < result.projectedValue && (
                      <SafetyMarginNote>
                        <span>✅</span>
                        <span>מרווח ביטחון: {formatCurrency(result.projectedValue - result.breakEvenPrice)} ({Math.round((1 - result.breakEvenPrice / result.projectedValue) * 100)}% מתחת לצפי)</span>
                      </SafetyMarginNote>
                    )}
                  </BreakEvenPanel>

                  {/* Financing breakdown */}
                  {showFinancing && result.loanAmount > 0 && (
                    <GlassPanelPadded>
                      <SectionTitle>
                        <Landmark style={{ width: 16, height: 16, color: theme.colors.gold }} />
                        סימולציית מימון
                      </SectionTitle>
                      <FinanceGrid>
                        <FinanceCard>
                          <FinanceCardLabel>הון עצמי</FinanceCardLabel>
                          <FinanceCardValue $color={theme.colors.blue[400]}>{formatCurrency(result.downPayment)}</FinanceCardValue>
                        </FinanceCard>
                        <FinanceCard>
                          <FinanceCardLabel>סכום הלוואה</FinanceCardLabel>
                          <FinanceCardValue $color={theme.colors.slate[200]}>{formatCurrency(result.loanAmount)}</FinanceCardValue>
                        </FinanceCard>
                        <FinanceCard>
                          <FinanceCardLabel>החזר חודשי</FinanceCardLabel>
                          <FinanceCardValue $color={theme.colors.gold} $size="18px" $weight={900}>{formatCurrency(result.monthlyPayment)}</FinanceCardValue>
                        </FinanceCard>
                        <FinanceCard>
                          <FinanceCardLabel>סה"כ ריבית</FinanceCardLabel>
                          <FinanceCardValue $color={theme.colors.red[400]}>{formatCurrency(result.totalInterest)}</FinanceCardValue>
                        </FinanceCard>
                      </FinanceGrid>
                      <FinanceTotalRow>
                        <span style={{ color: theme.colors.slate[400] }}>סה"כ החזרים</span>
                        <span style={{ color: theme.colors.slate[200], fontWeight: 700 }}>{formatCurrency(result.totalLoanPayments)}</span>
                      </FinanceTotalRow>
                    </GlassPanelPadded>
                  )}

                  {/* Sensitivity analysis */}
                  <GlassPanelPadded>
                    <SectionTitle>
                      <Table2 style={{ width: 16, height: 16, color: theme.colors.gold }} />
                      ניתוח רגישות — תשואה לפי תקופת החזקה
                    </SectionTitle>
                    <TableWrap>
                      <SensTable>
                        <thead>
                          <SensTheadRow>
                            <Th $align="right">שנים</Th>
                            <Th>CAGR ברוטו</Th>
                            <Th>CAGR נטו</Th>
                            <Th>
                              <ThFlex title="תשואה ריאלית (בניכוי אינפלציה 3%)">
                                📊 ריאלי
                              </ThFlex>
                            </Th>
                            <Th>
                              <ThFlex>
                                <Clock style={{ width: 10, height: 10 }} />
                                עלות החזקה
                              </ThFlex>
                            </Th>
                            {showFinancing && result.loanAmount > 0 && (
                              <Th>רווח אחרי מימון</Th>
                            )}
                          </SensTheadRow>
                        </thead>
                        <tbody>
                          {result.sensitivity.map(row => (
                            <SensRow key={row.years} $selected={row.isSelected}>
                              <Td
                                $align="right"
                                $color={row.isSelected ? theme.colors.gold : theme.colors.slate[300]}
                                $bold={row.isSelected}
                              >
                                {row.years} שנים {row.isSelected && '←'}
                              </Td>
                              <Td $color={theme.colors.emerald[400]} $bold>+{row.cagr}%</Td>
                              <Td
                                $color={row.netCagr >= 0 ? theme.colors.emerald[400] : theme.colors.red[400]}
                                $bold
                              >
                                {row.netCagr >= 0 ? '+' : ''}{row.netCagr}%
                              </Td>
                              <Td
                                $color={row.realCagr >= 0 ? theme.colors.amber[400] : theme.colors.red[400]}
                                $bold
                                $size="11px"
                                title="תשואה ריאלית (אחרי אינפלציה 3%)"
                              >
                                {row.realCagr >= 0 ? '+' : ''}{row.realCagr}%
                              </Td>
                              <Td $color="rgba(251,146,60,0.7)" $size="11px">
                                {formatCurrency(row.holdCosts)}
                              </Td>
                              {showFinancing && result.loanAmount > 0 && (
                                <Td
                                  $color={row.netWithFinancing >= 0 ? theme.colors.blue[400] : theme.colors.red[400]}
                                  $bold
                                >
                                  {formatCurrency(row.netWithFinancing)}
                                </Td>
                              )}
                            </SensRow>
                          ))}
                        </tbody>
                      </SensTable>
                    </TableWrap>
                    <SensFootnote>
                      CAGR ברוטו = תשואה שנתית לפני עלויות. CAGR נטו = אחרי כל המסים, עלויות כניסה/יציאה + החזקה שנתית.
                      ריאלי = CAGR נטו בניכוי אינפלציה (~3% שנתי) — כוח הקנייה שנותר בפועל.
                      {showFinancing && result.loanAmount > 0 && ' רווח אחרי מימון = רווח נקי בניכוי עלויות ריבית.'}
                    </SensFootnote>
                  </GlassPanelPadded>

                  {/* Alternative Investment Comparison — like a financial advisor's comparison table.
                      Shows how this land investment stacks up against bank deposits and stock market.
                      Uses calcAlternativeReturns utility for consistent calculations.
                      Neither Madlan nor Yad2 offer this — major competitive differentiator. */}
                  {(() => {
                    const price = parseFloat(purchasePrice)
                    if (!result || !price || price <= 0) return null
                    const alternatives = calcAlternativeReturns(price, result.netProfit, result.holdingYears)
                    if (!alternatives) return null

                    const maxValue = Math.max(
                      alternatives.bank.futureValue,
                      alternatives.stock.futureValue,
                      alternatives.land.futureValue
                    )

                    const items = [alternatives.land, alternatives.stock, alternatives.bank]

                    return (
                      <GlassPanelPadded>
                        <SectionTitle style={{ marginBottom: 4 }}>
                          <BarChart3 style={{ width: 16, height: 16, color: theme.colors.gold }} />
                          השוואת אלטרנטיבות השקעה
                        </SectionTitle>
                        <AltSubtitle>
                          מה היה קורה אם השקעת {formatCurrency(price)} במסלולים אחרים ל-{result.holdingYears} שנים?
                        </AltSubtitle>

                        {/* Visual bar comparison */}
                        <AltItemsWrap>
                          {items.map((item) => {
                            const barW = maxValue > 0 ? (item.futureValue / maxValue) * 100 : 0
                            const cagr = Math.round(item.rate * 1000) / 10
                            const isLand = item.label === 'קרקע זו'
                            return (
                              <AltCard key={item.label} $isLand={isLand}>
                                <AltCardHeader>
                                  <AltCardLeft>
                                    <AltEmoji>{item.emoji}</AltEmoji>
                                    <AltName $isLand={isLand}>{item.label}</AltName>
                                    {isLand && <AltHereBadge>אתה כאן</AltHereBadge>}
                                  </AltCardLeft>
                                  <div style={{ textAlign: 'left' }}>
                                    <AltFutureValue $isLand={isLand}>
                                      {formatCurrency(item.futureValue)}
                                    </AltFutureValue>
                                  </div>
                                </AltCardHeader>
                                <AltBarTrack>
                                  <AltBarFill
                                    style={{
                                      width: `${barW}%`,
                                      background: isLand
                                        ? 'linear-gradient(90deg, #C8942A, #E5B94E)'
                                        : `linear-gradient(90deg, ${item.color}80, ${item.color})`,
                                    }}
                                  />
                                </AltBarTrack>
                                <AltFooterRow>
                                  <AltRate>
                                    {cagr >= 0 ? '+' : ''}{cagr}% שנתי
                                  </AltRate>
                                  <AltProfit $positive={item.profit >= 0}>
                                    {item.profit >= 0 ? '+' : ''}{formatCurrency(item.profit)} רווח
                                  </AltProfit>
                                </AltFooterRow>
                              </AltCard>
                            )
                          })}
                        </AltItemsWrap>

                        {/* Real returns (inflation-adjusted) */}
                        <RealReturnsPanel>
                          <RealReturnsHeader>
                            <ShieldAlert style={{ width: 14, height: 14, color: theme.colors.amber[400] }} />
                            <RealReturnsTitle>תשואה ריאלית (בניכוי אינפלציה {Math.round(alternatives.inflationRate * 100)}%)</RealReturnsTitle>
                          </RealReturnsHeader>
                          <RealReturnsGrid>
                            {[
                              { label: 'קרקע', value: alternatives.realReturns.land, emoji: '🏗️', isMain: true },
                              { label: 'מניות', value: alternatives.realReturns.stock, emoji: '📊', isMain: false },
                              { label: 'פיקדון', value: alternatives.realReturns.bank, emoji: '🏦', isMain: false },
                            ].map((r) => (
                              <RealReturnCell key={r.label} $isMain={r.isMain}>
                                <RealReturnLabel>{r.emoji} {r.label}</RealReturnLabel>
                                <RealReturnValue $color={r.value >= 0
                                  ? (r.isMain ? theme.colors.gold : theme.colors.emerald[400])
                                  : theme.colors.red[400]
                                }>
                                  {r.value >= 0 ? '+' : ''}{r.value}%
                                </RealReturnValue>
                                <RealReturnUnit>לשנה</RealReturnUnit>
                              </RealReturnCell>
                            ))}
                          </RealReturnsGrid>
                        </RealReturnsPanel>

                        {/* Verdict */}
                        {(() => {
                          const landReturn = alternatives.land.futureValue
                          const stockReturn = alternatives.stock.futureValue
                          const bankReturn = alternatives.bank.futureValue
                          const beatsStock = landReturn > stockReturn
                          const beatsBank = landReturn > bankReturn
                          const landAdvantage = beatsStock
                            ? Math.round(((landReturn - stockReturn) / stockReturn) * 100)
                            : Math.round(((stockReturn - landReturn) / landReturn) * 100)

                          return (
                            <VerdictRow $color={beatsStock ? theme.colors.emerald[400] : theme.colors.amber[400]}>
                              <span>{beatsStock ? '🏆' : '⚠️'}</span>
                              <span>
                                {beatsStock
                                  ? `הקרקע עוקפת את TA-125 ב-${landAdvantage}% — השקעה מצוינת!`
                                  : beatsBank
                                    ? `הקרקע עוקפת פיקדון בנקאי אך נופלת מ-TA-125 ב-${landAdvantage}%`
                                    : `הקרקע מניבה פחות מפיקדון בנקאי — שקול אלטרנטיבות`
                                }
                              </span>
                            </VerdictRow>
                          )
                        })()}
                      </GlassPanelPadded>
                    )
                  })()}

                  {/* Action buttons: Print, Copy Link, Share WhatsApp ─────────────
                      Three sharing modes for different investor workflows:
                      1. Print — formal PDF for advisors/partners
                      2. Copy Link — shareable URL with all params (bidirectional sync!)
                      3. WhatsApp — rich text summary with link for quick sharing
                      Like Madlan's "שתף ניתוח" but with full calculator state in URL. */}
                  <ShareAnalysis
                    result={result}
                    purchasePrice={purchasePrice}
                    plotSize={plotSize}
                    currentZoning={currentZoning}
                    targetZoning={targetZoning}
                  />

                  {/* Disclaimer */}
                  <Disclaimer>
                    * הנתונים הם הערכות בלבד ואינם מהווים ייעוץ השקעות. יש להתייעץ עם אנשי מקצוע לפני קבלת החלטות.
                  </Disclaimer>
                </>
              )}
            </ResultsCol>
          </MainGrid>
        </Container>
      </PagePadding>

      <BackToTopButton />
      <PublicFooter />
    </PageWrapper>
  )
}
