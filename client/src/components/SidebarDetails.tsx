import { useState, useRef, useEffect, useMemo, useCallback, lazy, Suspense, type ReactNode } from 'react'
import styled, { css, keyframes } from 'styled-components'
import { X, MapPin, TrendingUp, Waves, TreePine, Hospital, Shield, CheckCircle2, BarChart3, FileText, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Award, DollarSign, AlertTriangle, Building2, Hourglass, Phone, MessageCircle, Share2, Copy, Check, Heart, BarChart, Image as ImageIcon, Download, File, FileImage, FileSpreadsheet, Printer, ExternalLink, Eye, Navigation, Clipboard, Maximize2, Ruler, StickyNote, Trash2 } from 'lucide-react'
import { useLazyVisible, useFocusTrap } from '../hooks/useUI'
import ShareMenu from './ui/ShareMenu'
import PriceTrendChart from './ui/PriceTrendChart'
import ProfitWaterfall from './ui/ProfitWaterfall'
import { statusColors, statusLabels, zoningLabels, zoningPipelineStages, roiStages } from '../utils/constants'
import { formatCurrency, formatDunam, formatMonthlyPayment } from '../utils/format'
import { calcInvestmentScore, getScoreLabel, calcCAGR, calcDaysOnMarket, calcMonthlyPayment, calcInvestmentVerdict, calcRiskLevel, generatePlotSummary, calcDemandVelocity, calcBuildableValue, calcInvestmentTimeline, calcAlternativeReturns, calcPlotPercentiles } from '../utils/investment'
import { plotCenter, calcPlotPerimeter, calcCommuteTimes } from '../utils/geo'
import DataCompletenessBar from './ui/DataCompletenessBar'
import { calcInvestmentPnL } from '../utils/plot'
import { usePlot, useNearbyPlots, useSimilarPlots, usePrefetchPlot, useNearbyPois } from '../hooks/usePlots'
import MiniMap from './ui/MiniMap'
import ZoningProgressBar from './ui/ZoningProgressBar'
import { plotInquiryLink, govMapUrl, tabuCheckUrl } from '../utils/config'
import { NOTE_TAGS } from '../hooks/useUserData'
import { theme as themeTokens, media } from '../styles/theme'
import { FlexRow, FlexBetween, FlexCenter, Badge, Divider, SmallLabel, Muted, spin, CardLift } from '../styles/shared'

// ─── TypeScript types ────────────────────────────────────────────────────
interface SectionIconProps {
  icon: React.ComponentType<any>
}

interface CollapsibleSectionProps {
  number: string
  icon: React.ComponentType<any>
  title: string
  children: React.ReactNode
  animClass?: string
  sectionId?: string
  defaultOpen?: boolean
}

interface QuickNavBarProps {
  scrollRef: React.RefObject<HTMLElement>
}

interface SimilarPlotsProps {
  currentPlot: any
  allPlots: any[]
  onSelectPlot: (plot: any) => void
}

interface CommuteTimesSectionProps {
  coordinates: any[]
}

interface MiniMortgageCalcProps {
  totalPrice: number
}

interface PlotNavigationProps {
  currentPlot: any
  allPlots: any[]
  onSelectPlot: (plot: any) => void
}

interface NearbyPoisSectionProps {
  plotId: string
}

interface SidebarDetailsProps {
  plot: any
  onClose: () => void
  onOpenLeadModal: () => void
  favorites?: any
  compareIds?: string[]
  onToggleCompare?: (id: string) => void
  allPlots?: any[]
  onSelectPlot?: (plot: any) => void
  priceChange?: any
  personalNotes?: any
}

// ─── Keyframes ──────────────────────────────────────────────────────────
const spinAnim = keyframes`
  to { transform: rotate(360deg); }
`
const pulseAnim = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`
const pulseGoldAnim = keyframes`
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(200,148,42,0.4); }
  50% { opacity: 0.8; box-shadow: 0 0 8px 4px rgba(200,148,42,0); }
`

const staggerFadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`

// ─── Reusable styled-components ─────────────────────────────────────────

/** Staggered fade-in animation wrapper */
const StaggerIn = styled.div<{ $delay?: number }>`
  animation: ${staggerFadeIn} 0.4s ease both;
  animation-delay: ${({ $delay = 0 }) => $delay * 0.06}s;
`

/** Scroll shadow indicators at top/bottom of scroll area */
const ScrollShadowTop = styled.div<{ $visible?: boolean }>`
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  height: 12px;
  pointer-events: none;
  z-index: 10;
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  background: linear-gradient(to bottom, rgba(10,22,40,0.8), transparent);
  transition: opacity 0.2s ease;
`

const ScrollShadowBottom = styled.div<{ $visible?: boolean }>`
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  height: 12px;
  pointer-events: none;
  z-index: 10;
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  background: linear-gradient(to top, rgba(10,22,40,0.8), transparent);
  transition: opacity 0.2s ease;
`

/** Glass-style section container */
const SectionWrap = styled.div`
  background: rgba(10, 22, 40, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 12px;
`

/** Metric stat card with gradient and top accent */
const MetricCard = styled.div<{ $accentFrom: string; $accentTo: string; $borderColor: string }>`
  border-radius: 16px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
  background: linear-gradient(to bottom, ${({ $accentFrom }) => $accentFrom}24, ${({ $accentFrom }) => $accentFrom}14);
  border: 1px solid ${({ $borderColor }) => $borderColor}33;
  position: relative;
  overflow: hidden;
  ${CardLift}

  ${media.sm} {
    padding: 16px;
    gap: 8px;
  }
`

const MetricAccentBar = styled.div<{ $from: string; $to: string }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, ${({ $from }) => $from}, ${({ $to }) => $to});
`

const MetricLabel = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[400]};
`

const MetricValue = styled.div<{ $color: string }>`
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
  color: ${({ $color }) => $color};

  ${media.sm} {
    font-size: 18px;
  }
`

const MetricSub = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[500]};
  display: none;
  ${media.sm} { display: block; }
`

/** Row with flex-between for label/value pairs */
const DataRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
`

const DataRowLabel = styled.span`
  color: ${({ theme }) => theme.colors.slate[400]};
`

const DataRowValue = styled.span<{ $color?: string }>`
  color: ${({ $color, theme }) => $color || theme.colors.slate[300]};
  font-weight: ${({ $color }) => $color ? '500' : 'normal'};
`

/** Colored inline badge */
const TagBadge = styled.span<{ $bg: string; $border?: string; $color: string; $size?: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ $size }) => $size === 'sm' ? '4px' : '6px'};
  padding: ${({ $size }) => $size === 'sm' ? '2px 8px' : '2px 10px'};
  border-radius: 9999px;
  font-size: ${({ $size }) => $size === 'sm' ? '10px' : '11px'};
  font-weight: 500;
  background: ${({ $bg }) => $bg};
  border: 1px solid ${({ $border, $bg }) => $border || $bg};
  color: ${({ $color }) => $color};
`

/** Section header button (collapsible) */
const SectionHeaderBtn = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  border: none;
  background: none;
  cursor: pointer;
  text-align: right;
`

const SectionNumber = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.gold};
  opacity: 0.5;
  width: 20px;
  flex-shrink: 0;
`

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
  flex: 1;
  text-align: right;
`

const SectionChevron = styled(ChevronDown)<{ $collapsed?: boolean }>`
  width: 16px;
  height: 16px;
  color: ${({ theme }) => theme.colors.slate[400]};
  transition: transform 0.2s ease;
  ${({ $collapsed }) => $collapsed && css`transform: rotate(-90deg);`}
`

const CollapseContent = styled.div<{ $open: boolean; $maxH: string }>`
  max-height: ${({ $open, $maxH }) => $open ? $maxH : '0px'};
  opacity: ${({ $open }) => $open ? 1 : 0};
  overflow: hidden;
  transition: max-height 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.25s ease;
`

/** Icon inside a colored rounded square */
const IconBox = styled.div<{ $bg: string; $size?: number }>`
  width: ${({ $size }) => $size || 32}px;
  height: ${({ $size }) => $size || 32}px;
  border-radius: ${({ theme }) => theme.radii.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $bg }) => $bg};
  flex-shrink: 0;
`

/** Distance/feature chip */
const DistanceChip = styled.div<{ $borderColor: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(to right, rgba(10,22,40,0.5), rgba(10,22,40,0.6));
  border: 1px solid ${({ $borderColor }) => $borderColor};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 8px 16px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.slate[300]};
  ${CardLift}
`

/** External link chip (Street View, Maps, etc.) */
const ExternalLinkChip = styled.a<{ $borderColor: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(to right, rgba(10,22,40,0.5), rgba(10,22,40,0.6));
  border: 1px solid ${({ $borderColor }) => $borderColor};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 8px 16px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.slate[300]};
  text-decoration: none;
  transition: border-color 0.2s ease;
  ${CardLift}

  &:hover {
    border-color: rgba(200, 148, 42, 0.3);
  }
`

/** Sidebar backdrop */
const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 50;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`

/** Main sidebar panel */
const Panel = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  height: 100%;
  width: 100%;
  max-width: 100%;
  z-index: 60;
  background: ${({ theme }) => theme.colors.navy};
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  direction: rtl;

  ${media.sm} {
    width: 420px;
    animation: slideInRight 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  }
  @media (min-width: 768px) { width: 480px; }
  @media (min-width: 1024px) { width: 520px; }
  @media (min-width: 1280px) { width: 560px; }

  @keyframes slideInRight {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
`

/** Gold accent top bar */
const GoldAccentBar = styled.div`
  height: 3px;
  flex-shrink: 0;
  background: linear-gradient(90deg, #C8942A, #E5B94E, #F0D078, #E5B94E, #C8942A);
`

/** Drag handle for mobile bottom sheet */
const DragHandle = styled.div`
  display: flex;
  justify-content: center;
  padding: 8px 0 4px;
  flex-shrink: 0;

  ${media.sm} { display: none; }
`

const DragHandleBar = styled.div`
  width: 36px;
  height: 4px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.15);
`

/** Map preview area */
const MapPreview = styled.div`
  height: 144px;
  position: relative;
  overflow: hidden;
`

const MapFallback = styled.div`
  height: 144px;
  background: rgba(10, 22, 40, 0.6);
  position: relative;
  overflow: hidden;
`

const MapFallbackCenter = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`

const MapFallbackDot = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  background: ${({ theme }) => theme.colors.gold};
  animation: ${pulseGoldAnim} 2s ease infinite;
`

const MapFallbackLabel = styled.span`
  font-size: 12px;
  color: rgba(200, 148, 42, 0.8);
  margin-top: 8px;
`

const MapGradientBottom = styled.div`
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 48px;
  background: linear-gradient(to top, ${({ theme }) => theme.colors.navy}, transparent);
`

/** Navigation overlay on map */
const NavOverlay = styled.div`
  position: absolute;
  bottom: 8px;
  left: 8px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0.8;
  transition: opacity 0.2s;

  ${media.sm} {
    opacity: 0;
  }
`

const NavBtn = styled.a<{ $bg: string }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 700;
  color: white;
  background: ${({ $bg }) => $bg};
  backdrop-filter: blur(4px);
  border-radius: ${({ theme }) => theme.radii.lg};
  text-decoration: none;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  transition: background 0.2s;

  &:hover {
    filter: brightness(1.1);
  }
`

/** Header area */
const HeaderWrap = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 20px 12px;
  gap: 12px;
`

const HeaderLeft = styled.div`
  min-width: 0;
  flex: 1;
`

const PlotTitle = styled.h2`
  font-size: 24px;
  font-weight: 900;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.slate[100]};
`

const GoldGradientText = styled.span`
  background: linear-gradient(to right, ${({ theme }) => theme.colors.gold}, ${({ theme }) => theme.colors.goldBright});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

/** Copy gush button */
const CopyBtn = styled.button<{ $copied?: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: ${({ theme }) => theme.radii.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ $copied }) => $copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'};
  background: ${({ $copied }) => $copied ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)'};
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: ${({ $copied }) => $copied ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)'};
    border-color: ${({ $copied }) => $copied ? 'rgba(34,197,94,0.3)' : 'rgba(200,148,42,0.2)'};
  }
`

/** Action buttons (close, fullscreen, fav) */
const ActionBtn = styled.button<{ $active?: boolean; $activeColor?: string }>`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radii.xl};
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ $active, $activeColor }) => $active ? ($activeColor || 'rgba(255,255,255,0.1)') + '4D' : 'rgba(255,255,255,0.1)'};
  background: ${({ $active, $activeColor }) => $active ? ($activeColor || 'rgba(255,255,255,0.05)') + '26' : 'rgba(255,255,255,0.05)'};
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(200, 148, 42, 0.2);
  }
`

const ActionLink = styled.a`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radii.xl};
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(200, 148, 42, 0.2);
  }
`

const CloseBtn = styled(ActionBtn)`
  &:hover {
    transform: rotate(90deg);
  }
`

/** Badge chips container */
const BadgeRow = styled.div<{ $mobile?: boolean }>`
  display: ${({ $mobile }) => $mobile ? 'flex' : 'none'};
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ $mobile }) => $mobile ? '6px' : '8px'};
  margin-top: ${({ $mobile }) => $mobile ? '6px' : '8px'};

  ${media.sm} {
    display: ${({ $mobile }) => $mobile ? 'none' : 'flex'};
  }
`

const InfoBadge = styled.span<{ $bg?: string; $color?: string; $border?: string; $size?: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ $size }) => $size === 'sm' ? '4px' : '6px'};
  padding: ${({ $size }) => $size === 'sm' ? '2px 8px' : '4px 10px'};
  border-radius: ${({ $size }) => $size === 'sm' ? '8px' : '12px'};
  font-size: ${({ $size }) => $size === 'sm' ? '11px' : '12px'};
  color: ${({ $color, theme }) => $color || theme.colors.slate[400]};
  background: ${({ $bg }) => $bg || 'rgba(255,255,255,0.05)'};
  border: ${({ $border }) => $border ? `1px solid ${$border}` : 'none'};
  font-weight: ${({ $border }) => $border ? '500' : 'normal'};
`

const StatusDot = styled.span<{ $color: string; $size?: number }>`
  width: ${({ $size }) => $size || 8}px;
  height: ${({ $size }) => $size || 8}px;
  border-radius: 9999px;
  background: ${({ $color }) => $color};
  animation: ${pulseAnim} 2s ease infinite;
`

/** Plot navigation bar */
const NavBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(10, 22, 40, 0.2);
`

const NavArrow = styled.button`
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(200, 148, 42, 0.2);
  }

  &:hover svg {
    color: ${({ theme }) => theme.colors.gold};
  }

  svg {
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.colors.slate[400]};
    transition: color 0.2s;
  }
`

const NavCounter = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.slate[500]};
  flex: 1;
  text-align: center;
  font-variant-numeric: tabular-nums;
`

/** Official sources bar */
const OfficialBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
  direction: rtl;
`

const OfficialLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.slate[400]};
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${({ theme }) => theme.radii.lg};
  text-decoration: none;
  transition: all 0.2s;

  &:hover {
    background: rgba(200, 148, 42, 0.1);
    color: ${({ theme }) => theme.colors.gold};
    border-color: rgba(200, 148, 42, 0.2);
  }

  svg {
    width: 10px;
    height: 10px;
  }
`

/** Scrollable content area */
const ScrollArea = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
`

/** Content padding wrapper */
const ContentPad = styled.div`
  padding: 0 24px 24px;
`

/** Quick nav pill bar */
const QuickNavWrap = styled.div`
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(10, 22, 40, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding: 6px 16px;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  direction: rtl;

  &::-webkit-scrollbar { display: none; }
  -ms-overflow-style: none;
  scrollbar-width: none;
`

const QuickNavPill = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.lg};
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
  border: 1px solid ${({ $active }) => $active ? 'rgba(200,148,42,0.2)' : 'transparent'};
  background: ${({ $active }) => $active ? 'rgba(200,148,42,0.15)' : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.colors.gold : theme.colors.slate[500]};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: ${({ theme }) => theme.colors.slate[300]};
    background: rgba(255, 255, 255, 0.05);
  }
`

const QuickNavLabel = styled.span`
  display: none;
  ${media.sm} { display: inline; }
`

/** Spinner for lazy sections */
const SpinnerWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
`

const SpinnerCircle = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 9999px;
  border: 2px solid rgba(200, 148, 42, 0.3);
  border-top-color: ${({ theme }) => theme.colors.gold};
  animation: ${spinAnim} 0.6s linear infinite;
`

/** Alert-style card (verdict, risk, below market, price change) */
const AlertCard = styled.div<{ $bg: string; $border: string }>`
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 16px;
  padding: 12px;
  border: 1px solid ${({ $border }) => $border};
  background: ${({ $bg }) => $bg};
`

const AlertIconBox = styled.div<{ $bg: string }>`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radii.xl};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 18px;
  background: ${({ $bg }) => $bg};
`

const SmallAlertIconBox = styled(AlertIconBox)`
  width: 36px;
  height: 36px;
  font-size: 16px;
`

/** Investment summary hero card */
const SummaryCard = styled.div`
  background: linear-gradient(to right, rgba(10,22,40,0.6), rgba(10,22,40,0.4));
  border: 1px solid rgba(200, 148, 42, 0.15);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
`

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`

/** Gold divider line */
const GoldDivider = styled.div`
  height: 1px;
  margin: 24px 0;
  background: linear-gradient(90deg, transparent, rgba(200,148,42,0.2) 20%, rgba(200,148,42,0.35) 50%, rgba(200,148,42,0.2) 80%, transparent);
`

/** Thin divider */
const ThinDivider = styled.div`
  height: 1px;
  background: rgba(255, 255, 255, 0.05);
  margin: 4px 0;
`

/** Area context panel */
const ContextPanel = styled.div`
  background: linear-gradient(to right, rgba(10,22,40,0.5), rgba(10,22,40,0.6));
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 16px;
  margin-top: 12px;
`

/** Gold highlighted panel (Standard 22, full ROI summary) */
const GoldPanel = styled.div`
  background: linear-gradient(to right, rgba(200,148,42,0.05), rgba(200,148,42,0.1));
  border: 1px solid rgba(200, 148, 42, 0.2);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 8px;
`

const GoldPanelSm = styled(GoldPanel)`
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 12px;
  margin-bottom: 12px;
`

/** Grid helpers */
const Grid2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`

const Grid3 = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 12px;
`

const Grid2Gap2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`

/** Similar plot row button */
const PlotRowBtn = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(10, 22, 40, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 10px 12px;
  text-align: right;
  cursor: pointer;
  transition: all 0.2s;
  ${CardLift}

  &:hover {
    border-color: rgba(200, 148, 42, 0.2);
  }
`

const PlotRowIndicator = styled.div<{ $color: string }>`
  width: 4px;
  height: 32px;
  border-radius: 9999px;
  flex-shrink: 0;
  background: ${({ $color }) => $color};
`

/** Commute link card */
const CommuteLink = styled.a`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${({ theme }) => theme.radii.lg};
  text-decoration: none;
  transition: all 0.2s;

  &:hover {
    border-color: rgba(200, 148, 42, 0.2);
    background: rgba(255, 255, 255, 0.04);
  }

  &:hover ${() => CommuteExtIcon} {
    color: ${({ theme }) => theme.colors.gold};
    opacity: 1;
  }
`

const CommuteExtIcon = styled(ExternalLink)`
  width: 10px;
  height: 10px;
  color: ${({ theme }) => theme.colors.slate[600]};
  flex-shrink: 0;
  opacity: 0;
  transition: all 0.2s;
`

/** Slider input */
const RangeInput = styled.input`
  width: 100%;
  height: 6px;
  border-radius: 9999px;
  appearance: none;
  background: rgba(255, 255, 255, 0.1);
  accent-color: ${({ theme }) => theme.colors.gold};
  cursor: pointer;
`

/** Full-detail CTA link */
const FullDetailCta = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  padding: 10px;
  background: linear-gradient(to right, rgba(200,148,42,0.1), rgba(200,148,42,0.05));
  border: 1px solid rgba(200, 148, 42, 0.2);
  border-radius: ${({ theme }) => theme.radii.xl};
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.gold};
  text-decoration: none;
  transition: all 0.2s;

  &:hover {
    background: linear-gradient(to right, rgba(200,148,42,0.15), rgba(200,148,42,0.1));
    border-color: rgba(200, 148, 42, 0.3);
  }

  &:hover svg {
    transform: scale(1.1);
  }

  svg {
    transition: transform 0.2s;
  }
`

/** Scroll-to-top button */
const ScrollTopBtn = styled.button`
  position: absolute;
  left: 16px;
  bottom: 144px;
  z-index: 10;
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radii.xl};
  background: rgba(10, 22, 40, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  backdrop-filter: blur(4px);
  transition: all 0.2s;

  &:hover {
    border-color: rgba(200, 148, 42, 0.3);
    background: rgba(10, 22, 40, 1);
  }
`

/** Quick inquiry wrapper */
const InquiryWrap = styled.div`
  flex-shrink: 0;
  padding: 8px 16px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(10, 22, 40, 0.8);
  backdrop-filter: blur(4px);
`

/** CTA footer */
const CtaFooter = styled.div`
  flex-shrink: 0;
  padding: 10px 16px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(10, 22, 40, 0.9);
  backdrop-filter: blur(12px);
`

const CtaButton = styled.button`
  flex: 1;
  padding: 14px 24px;
  background: linear-gradient(to right, ${({ theme }) => theme.colors.gold}, ${({ theme }) => theme.colors.goldBright}, ${({ theme }) => theme.colors.gold});
  border-radius: 16px;
  border: none;
  color: ${({ theme }) => theme.colors.navy};
  font-weight: 800;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(200, 148, 42, 0.3);
  transition: all 0.3s;
  position: relative;
  overflow: hidden;

  &:hover {
    box-shadow: 0 10px 15px rgba(200, 148, 42, 0.4);
    transform: translateY(-1px);
  }
`

const ShareBtn = styled.a<{ $bg: string; $shadow: string }>`
  flex-shrink: 0;
  width: 48px;
  padding: 14px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $bg }) => $bg};
  border-radius: 16px;
  text-decoration: none;
  box-shadow: 0 4px 6px ${({ $shadow }) => $shadow};
  transition: all 0.3s;

  &:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }
`

const SmallActionBtn = styled.button<{ $active?: boolean }>`
  flex-shrink: 0;
  width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $active }) => $active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)'};
  border: 1px solid ${({ $active }) => $active ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'};
  border-radius: ${({ theme }) => theme.radii.xl};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(200, 148, 42, 0.2);
  }
`

const CompareBtn = styled.button<{ $active?: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid ${({ $active }) => $active ? 'rgba(139,92,246,0.5)' : 'rgba(139,92,246,0.3)'};
  background: ${({ $active }) => $active ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.2)'};
  color: ${({ $active }) => $active ? '#D8B4FE' : '#A78BFA'};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(139, 92, 246, 0.3);
  }
`

/** Mobile-only block (hidden on sm+) */
const MobileOnlyBlock = styled.div`
  display: block;
  padding: 8px 16px 4px;
  ${media.sm} { display: none; }
`

/** Skeleton pulse */
const SkeletonPulse = styled.div<{ $w?: string; $h?: string; $rounded?: string }>`
  width: ${({ $w }) => $w || '100%'};
  height: ${({ $h }) => $h || '12px'};
  border-radius: ${({ $rounded }) => $rounded || '8px'};
  background: rgba(51, 65, 85, 0.3);
  animation: ${pulseAnim} 2s ease infinite;
`

/** Progress bar */
const ProgressBar = styled.div`
  height: 10px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

const ProgressFill = styled.div<{ $width: string; $bg: string }>`
  height: 100%;
  border-radius: 9999px;
  width: ${({ $width }) => $width};
  background: ${({ $bg }) => $bg};
  transition: all 0.7s ease;
`

/** Mini bar for percentile */
const MiniBar = styled.div`
  flex: 1;
  max-width: 50px;
  margin-right: auto;
`

const MiniBarTrack = styled.div`
  position: relative;
  width: 100%;
  height: 4px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

const MiniBarFill = styled.div<{ $width: string; $bg: string }>`
  position: absolute;
  inset: 0;
  left: 0;
  border-radius: 9999px;
  width: ${({ $width }) => $width};
  background: ${({ $bg }) => $bg};
  transition: all 0.5s;
`

/** Image grid */
const ImageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 8px;
`

const ImageThumb = styled.button`
  aspect-ratio: 1;
  border-radius: ${({ theme }) => theme.radii.xl};
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  background: none;
  padding: 0;

  &:hover {
    border-color: rgba(200, 148, 42, 0.4);
  }

  &:hover img {
    transform: scale(1.05);
  }

  &:hover .overlay {
    background: rgba(0, 0, 0, 0.2);
  }

  &:hover .zoom-icon {
    opacity: 0.7;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s;
  }
`

const ImageOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  transition: background 0.2s;
`

const ImageZoomIcon = styled(Maximize2)`
  width: 20px;
  height: 20px;
  color: white;
  opacity: 0;
  transition: opacity 0.2s;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
`

const ImageFirstLabel = styled.span`
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 8px;
  font-weight: 700;
  color: white;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  padding: 2px 6px;
  border-radius: 4px;
`

/** View all images button */
const ViewAllImagesBtn = styled.button`
  width: 100%;
  padding: 8px;
  text-align: center;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.gold};
  font-weight: 500;
  background: rgba(200, 148, 42, 0.05);
  border: 1px solid rgba(200, 148, 42, 0.15);
  border-radius: ${({ theme }) => theme.radii.xl};
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(200, 148, 42, 0.1);
  }
`

/** Document row */
const DocRow = styled.a`
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(10, 22, 40, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 10px 16px;
  text-decoration: none;
  cursor: pointer;
  transition: border-color 0.2s;
  ${CardLift}

  &:hover {
    border-color: rgba(200, 148, 42, 0.2);
  }

  &:hover .doc-icon {
    color: ${({ theme }) => theme.colors.gold};
  }

  &:hover .doc-name {
    color: ${({ theme }) => theme.colors.slate[200]};
  }

  &:hover .doc-dl {
    color: ${({ theme }) => theme.colors.gold};
  }
`

const DocLegacyRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(10, 22, 40, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 10px 16px;
  cursor: pointer;
  transition: border-color 0.2s;
  ${CardLift}

  &:hover {
    border-color: rgba(200, 148, 42, 0.2);
  }
`

/** Report/footer row */
const FooterRow = styled.div`
  margin-top: 24px;
  margin-bottom: 8px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
`

/** Committee timeline */
const CommitteeRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  position: relative;
`

const CommitteeLine = styled.div`
  position: absolute;
  right: 15px;
  top: 32px;
  width: 2px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
`

const CommitteeCircle = styled.div<{ $bg: string; $border: string }>`
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ $bg }) => $bg};
  border: 1px solid ${({ $border }) => $border};
`

/** ROI stage row */
const RoiStageRow = styled.div<{ $isCurrent?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px;
  border-radius: ${({ theme }) => theme.radii.lg};
  ${({ $isCurrent }) => $isCurrent && css`
    background: rgba(200, 148, 42, 0.05);
    margin: 0 -4px;
    padding: 4px 8px;
  `}
`

/** Zoning pipeline stage row */
const ZoningStageRow = styled.div<{ $isCurrent?: boolean; $opacity?: number }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  opacity: ${({ $opacity }) => $opacity ?? 1};
  transition: opacity 0.2s;
  ${({ $isCurrent }) => $isCurrent && css`
    background: rgba(200, 148, 42, 0.05);
    margin: 0 -8px;
    padding: 8px;
    border-radius: ${({ theme }) => theme.radii.xl};
  `}
`

/** Area market context bar */
const MarketContextBar = styled.div`
  margin: 8px 16px 4px;

  ${media.sm} { margin: 8px 20px 4px; }
`

const MarketContextInner = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 8px 12px;
  direction: rtl;
`

/** Sensitivity scenario row */
const ScenarioRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
`

/** Section icon component styled version */
const SIconWrap = styled.div`
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radii.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(200, 148, 42, 0.15);
`

/** Alternative investment bar */
const AltBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

/** POI section */
const PoiCategoryCard = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 12px;
`

/** Buildable value cell */
const BuildableCell = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 8px;
  text-align: center;
`

/** Risk gauge segment */
const RiskSegment = styled.div<{ $active?: boolean; $level?: number }>`
  height: 6px;
  flex: 1;
  border-radius: 9999px;
  transition: background 0.2s;
  background: ${({ $active, $level }) => {
    if (!$active) return 'rgba(255,255,255,0.06)'
    if ($level && $level <= 2) return '#22C55E'
    if ($level && $level <= 3) return '#F59E0B'
    return '#EF4444'
  }};
`

/** Comparison bar */
const CompBarTrack = styled.div`
  position: relative;
  height: 10px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

const CompBarFill = styled.div<{ $width: string; $bg: string; $dir?: string }>`
  position: absolute;
  top: 0;
  ${({ $dir }) => $dir === 'left' ? 'left: 0;' : 'right: 0;'}
  height: 100%;
  border-radius: 9999px;
  width: ${({ $width }) => $width};
  background: ${({ $bg }) => $bg};
  transition: all 0.7s;
`

const CompBarMarker = styled.div<{ $right: string }>`
  position: absolute;
  top: 0;
  height: 100%;
  width: 2px;
  background: rgba(255, 255, 255, 0.4);
  right: ${({ $right }) => $right};
`

/** Timeline stage dot */
const StageDot = styled.div<{ $status: string }>`
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  transition: all 0.2s;
  ${({ $status }) => {
    if ($status === 'completed') return css`
      background: #4ADE80;
      box-shadow: 0 1px 2px rgba(74, 222, 128, 0.4);
    `
    if ($status === 'current') return css`
      background: ${({ theme }) => theme.colors.gold};
      box-shadow: 0 1px 2px rgba(200, 148, 42, 0.4);
      outline: 2px solid rgba(200, 148, 42, 0.2);
      outline-offset: 1px;
    `
    return css`background: ${({ theme }) => theme.colors.slate[700]};`
  }}
`

// ─── Lazy-loaded sub-components ──────────────────────────────────────────
const ImageLightbox = lazy(() => import('./ui/ImageLightbox'))
const NeighborhoodRadar = lazy(() => import('./ui/NeighborhoodRadar'))
const InvestmentBenchmark = lazy(() => import('./ui/InvestmentBenchmark'))
const StreetViewPanel = lazy(() => import('./ui/StreetViewPanel'))
const DueDiligenceChecklist = lazy(() => import('./ui/DueDiligenceChecklist'))
const InvestmentProjection = lazy(() => import('./ui/InvestmentProjection'))
const LocationScore = lazy(() => import('./ui/LocationScore'))
const QuickInquiryTemplates = lazy(() => import('./ui/QuickInquiryTemplates'))
const InvestmentScoreBreakdown = lazy(() => import('./ui/InvestmentScoreBreakdown'))
const AreaComparisonWidget = lazy(() => import('./ui/AreaComparisonWidget'))
const RealTransactions = lazy(() => import('./RealTransactions'))
const PlanningInfo = lazy(() => import('./PlanningInfo'))

/** Lightweight spinner for lazy-loaded section content */
function SectionSpinner() {
  return (
    <SpinnerWrap>
      <SpinnerCircle />
    </SpinnerWrap>
  )
}

function getDocIcon(mimeType: string | undefined) {
  if (!mimeType) return File
  if (mimeType.startsWith('image/')) return FileImage
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return FileSpreadsheet
  return FileText
}

function SectionIcon({ icon: Icon }: SectionIconProps) {
  return (
    <SIconWrap>
      <Icon style={{ width: 16, height: 16, color: themeTokens.colors.gold }} />
    </SIconWrap>
  )
}

function CollapsibleSection({ number, icon, title, children, animClass = '', sectionId, defaultOpen = true }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [hasBeenOpened, setHasBeenOpened] = useState(defaultOpen)
  const contentRef = useRef<HTMLDivElement>(null)
  const [maxHeight, setMaxHeight] = useState('2000px')

  const [lazyRef, isNearViewport] = useLazyVisible({ rootMargin: '300px', skip: defaultOpen })

  useEffect(() => {
    if (isOpen && !hasBeenOpened) setHasBeenOpened(true)
  }, [isOpen, hasBeenOpened])

  useEffect(() => {
    if (!contentRef.current) return
    const target = isOpen ? `${contentRef.current.scrollHeight + 20}px` : '0px'
    if (target !== maxHeight) setMaxHeight(target)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const shouldRenderContent = hasBeenOpened && isNearViewport

  return (
    <StaggerIn $delay={animClass ? parseInt(animClass.replace(/\D/g, '') || '0', 10) : 0} id={sectionId} ref={lazyRef}>
      <SectionHeaderBtn
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls={sectionId ? `${sectionId}-content` : undefined}
      >
        <SectionNumber>{number}</SectionNumber>
        <SectionIcon icon={icon} />
        <SectionTitle>{title}</SectionTitle>
        <SectionChevron $collapsed={!isOpen} />
      </SectionHeaderBtn>
      <CollapseContent
        ref={contentRef}
        $open={isOpen}
        $maxH={isOpen ? maxHeight : '0px'}
        id={sectionId ? `${sectionId}-content` : undefined}
        role="region"
        aria-labelledby={sectionId ? `${sectionId}-heading` : undefined}
      >
        <div style={{ paddingBottom: 8 }}>
          {shouldRenderContent ? children : (
            isOpen && !isNearViewport ? (
              <SpinnerWrap>
                <SpinnerCircle />
              </SpinnerWrap>
            ) : null
          )}
        </div>
      </CollapseContent>
    </StaggerIn>
  )
}

/** Quick-nav pill bar */
function QuickNavBar({ scrollRef }: QuickNavBarProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const sections = [
    { id: 'section-financial', label: '💰', title: 'פיננסי' },
    { id: 'section-area-comparison', label: '📊', title: 'ביחס לאזור' },
    { id: 'section-roi-stages', label: '📈', title: 'השבחה' },
    { id: 'section-transactions', label: '🏠', title: 'עסקאות' },
    { id: 'section-planning', label: '📐', title: 'תב"עות' },
    { id: 'section-zoning', label: '🗺️', title: 'תכנון' },
    { id: 'section-images', label: '📷', title: 'תמונות' },
    { id: 'section-quality', label: '🛡️', title: 'איכות' },
    { id: 'section-nearby-pois', label: '📍', title: 'סביבה' },
    { id: 'section-streetview', label: '🛣️', title: 'Street View' },
    { id: 'section-dd', label: '✅', title: 'בדיקות' },
  ]

  useEffect(() => {
    const container = scrollRef?.current
    if (!container) return
    const handleScroll = () => {
      const containerTop = container.scrollTop + 80
      let found: string | null = null
      for (const s of sections) {
        const el = container.querySelector(`#${s.id}`) as HTMLElement | null
        if (el && el.offsetTop <= containerTop) found = s.id
      }
      setActiveSection(found)
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [scrollRef])

  const scrollTo = (id: string) => {
    const container = scrollRef?.current
    if (!container) return
    const el = container.querySelector(`#${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <QuickNavWrap>
      {sections.map(s => (
        <QuickNavPill
          key={s.id}
          $active={activeSection === s.id}
          onClick={() => scrollTo(s.id)}
          title={s.title}
        >
          <span>{s.label}</span>
          <QuickNavLabel>{s.title}</QuickNavLabel>
        </QuickNavPill>
      ))}
    </QuickNavWrap>
  )
}

const committeeStatusConfig: Record<string, any> = {
  approved: {
    icon: CheckCircle2,
    bg: 'rgba(34,197,94,0.2)',
    border: 'rgba(34,197,94,0.5)',
    color: '#4ADE80',
    label: 'אושר',
  },
  pending: {
    icon: Clock,
    bg: 'rgba(234,179,8,0.2)',
    border: 'rgba(234,179,8,0.5)',
    color: '#FACC15',
    label: 'ממתין',
  },
  in_preparation: {
    icon: Clock,
    bg: 'rgba(59,130,246,0.2)',
    border: 'rgba(59,130,246,0.5)',
    color: '#60A5FA',
    label: 'בהכנה',
  },
  in_discussion: {
    icon: Clock,
    bg: 'rgba(139,92,246,0.2)',
    border: 'rgba(139,92,246,0.5)',
    color: '#A78BFA',
    label: 'בדיון',
  },
  not_started: {
    icon: null,
    bg: 'rgba(100,116,139,0.2)',
    border: 'rgba(100,116,139,0.5)',
    color: '#94A3B8',
    label: 'טרם החל',
  },
}

const committeeLevels = [
  { key: 'national', label: 'ארצית' },
  { key: 'district', label: 'מחוזית' },
  { key: 'local', label: 'מקומית' },
]

function SimilarPlots({ currentPlot, allPlots, onSelectPlot }: SimilarPlotsProps) {
  const { data: similarPlots } = useSimilarPlots(currentPlot?.id)
  const { data: nearbyPlots } = useNearbyPlots(currentPlot?.id)

  const nearbyFiltered = useMemo(() => {
    if (!nearbyPlots || nearbyPlots.length === 0) return []
    const similarIds = new Set((similarPlots || []).map((p: any) => p.id))
    return nearbyPlots.filter((p: any) => !similarIds.has(p.id)).slice(0, 3)
  }, [nearbyPlots, similarPlots])

  const fallbackSimilar = useMemo(() => {
    if ((similarPlots && similarPlots.length > 0) || (nearbyPlots && nearbyPlots.length > 0)) return []
    if (!currentPlot || !allPlots || allPlots.length < 2) return []
    const price = currentPlot.total_price ?? currentPlot.totalPrice ?? 0
    const size = currentPlot.size_sqm ?? currentPlot.sizeSqM ?? 0
    return allPlots
      .filter((p: any) => p.id !== currentPlot.id)
      .map((p: any) => {
        const pPrice = p.total_price ?? p.totalPrice ?? 0
        const pSize = p.size_sqm ?? p.sizeSqM ?? 0
        const priceDiff = price > 0 ? Math.abs(pPrice - price) / price : 1
        const sizeDiff = size > 0 ? Math.abs(pSize - size) / size : 1
        const cityBonus = p.city === currentPlot.city ? 0 : 0.3
        return { ...p, _similarityScore: 10 - (priceDiff + sizeDiff + cityBonus) * 3 }
      })
      .sort((a: any, b: any) => b._similarityScore - a._similarityScore)
      .slice(0, 3)
  }, [currentPlot?.id, allPlots, similarPlots, nearbyPlots])

  const crossCityAlternatives = useMemo(() => {
    if (!currentPlot || !allPlots || allPlots.length < 4) return []
    const currentCity = currentPlot.city
    const currentRoi = (() => {
      const price = currentPlot.total_price ?? currentPlot.totalPrice ?? 0
      const proj = currentPlot.projected_value ?? currentPlot.projectedValue ?? 0
      return price > 0 ? ((proj - price) / price) * 100 : 0
    })()

    return allPlots
      .filter((p: any) => {
        if (p.id === currentPlot.id || p.city === currentCity) return false
        if (p.status !== 'AVAILABLE') return false
        const price = p.total_price ?? p.totalPrice ?? 0
        const proj = p.projected_value ?? p.projectedValue ?? 0
        if (price <= 0) return false
        const roi = ((proj - price) / price) * 100
        return Math.abs(roi - currentRoi) <= 30
      })
      .map((p: any) => {
        const price = p.total_price ?? p.totalPrice ?? 0
        const proj = p.projected_value ?? p.projectedValue ?? 0
        const roi = price > 0 ? ((proj - price) / price) * 100 : 0
        const roiMatch = 1 - Math.abs(roi - currentRoi) / 100
        return { ...p, _matchReasons: [`ROI דומה +${Math.round(roi)}%`, p.city], _crossScore: roiMatch }
      })
      .sort((a: any, b: any) => b._crossScore - a._crossScore)
      .slice(0, 3)
  }, [currentPlot?.id, allPlots])

  const hasSimilar = (similarPlots && similarPlots.length > 0) || fallbackSimilar.length > 0
  const hasNearby = nearbyFiltered.length > 0
  const hasCrossCity = crossCityAlternatives.length > 0
  if (!hasSimilar && !hasNearby && !hasCrossCity) return null

  const renderPlotRow = (p: any, showDistance = false, showReasons = false) => {
    const bn = p.block_number ?? p.blockNumber
    const price = p.total_price ?? p.totalPrice
    const projValue = p.projected_value ?? p.projectedValue
    const roi = price > 0 ? Math.round((projValue - price) / price * 100) : 0
    const color = statusColors[p.status]
    return (
      <PlotRowBtn key={p.id} onClick={() => onSelectPlot(p)}>
        <PlotRowIndicator $color={color} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.slate[200], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>גוש {bn} | חלקה {p.number}</div>
          <div style={{ fontSize: 10, color: themeTokens.colors.slate[500], display: 'flex', alignItems: 'center', gap: 4 }}>
            {p.city}
            {showDistance && p.distance_km != null && (
              <span style={{ color: '#60A5FA' }}>· {p.distance_km < 1 ? `${Math.round(p.distance_km * 1000)}מ׳` : `${p.distance_km} ק״מ`}</span>
            )}
            {!showDistance && p._distanceKm != null && (
              <span style={{ color: 'rgba(96,165,250,0.7)' }}>· {p._distanceKm < 1 ? `${Math.round(p._distanceKm * 1000)}מ׳` : `${p._distanceKm} ק״מ`}</span>
            )}
          </div>
          {showReasons && p._matchReasons && p._matchReasons.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              {p._matchReasons.slice(0, 2).map((reason: string, i: number) => (
                <span key={i} style={{ fontSize: 8, color: 'rgba(200,148,42,0.7)', background: 'rgba(200,148,42,0.08)', padding: '2px 6px', borderRadius: 4 }}>{reason}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'left', flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: themeTokens.colors.gold }}>{formatCurrency(price)}</div>
          <div style={{ fontSize: 10, color: '#34D399' }}>+{roi}%</div>
        </div>
      </PlotRowBtn>
    )
  }

  return (
    <div style={{ marginTop: 16, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {hasSimilar && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: themeTokens.colors.slate[400], marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 20, height: 20, borderRadius: 4, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>🎯</span>
            חלקות דומות
            <span style={{ fontSize: 9, color: themeTokens.colors.slate[600], fontWeight: 400 }}>מחיר, תכנון ותשואה</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(similarPlots && similarPlots.length > 0 ? similarPlots : fallbackSimilar).map((p: any) => renderPlotRow(p, false, true))}
          </div>
        </div>
      )}

      {hasNearby && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: themeTokens.colors.slate[400], marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 20, height: 20, borderRadius: 4, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>📍</span>
            חלקות בסביבה
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {nearbyFiltered.map((p: any) => renderPlotRow(p, true, false))}
          </div>
        </div>
      )}

      {hasCrossCity && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: themeTokens.colors.slate[400], marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 20, height: 20, borderRadius: 4, background: 'rgba(200,148,42,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>🌍</span>
            חלופות בערים אחרות
            <span style={{ fontSize: 9, color: themeTokens.colors.slate[600], fontWeight: 400 }}>ROI דומה, עיר שונה</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {crossCityAlternatives.map((p: any) => renderPlotRow(p, false, true))}
          </div>
        </div>
      )}
    </div>
  )
}

function CommuteTimesSection({ coordinates }: CommuteTimesSectionProps) {
  const commutes = useMemo(() => {
    const center = plotCenter(coordinates)
    if (!center) return []
    return calcCommuteTimes(center.lat, center.lng)
  }, [coordinates])

  if (commutes.length === 0) return null

  const getTimeColor = (min: number) => {
    if (min <= 30) return '#22C55E'
    if (min <= 60) return '#EAB308'
    if (min <= 90) return '#F97316'
    return '#EF4444'
  }

  const formatTime = (min: number) => {
    if (min < 60) return `${min} דק׳`
    const h = Math.floor(min / 60)
    const m = min % 60
    return m > 0 ? `${h} שע׳ ${m} דק׳` : `${h} שע׳`
  }

  return (
    <SectionWrap style={{ marginTop: 12, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Navigation style={{ width: 14, height: 14, color: themeTokens.colors.gold }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.slate[200] }}>זמני נסיעה משוערים</span>
        <span style={{ fontSize: 9, color: themeTokens.colors.slate[600], marginRight: 'auto' }}>🚗 ממוצע</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {commutes.slice(0, 6).map((c: any) => (
          <CommuteLink
            key={c.city}
            href={c.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`~${c.distanceKm} ק״מ — לחץ לניווט ב-Google Maps`}
          >
            <span style={{ fontSize: 14, flexShrink: 0 }}>{c.emoji}</span>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: 10, color: themeTokens.colors.slate[400], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.city}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: getTimeColor(c.drivingMinutes) }}>
                  {formatTime(c.drivingMinutes)}
                </span>
                <span style={{ fontSize: 8, color: themeTokens.colors.slate[600] }}>{c.distanceKm} ק״מ</span>
              </div>
            </div>
            <CommuteExtIcon />
          </CommuteLink>
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: 8, color: themeTokens.colors.slate[600], textAlign: 'center' }}>
        * הערכה בלבד — זמני נסיעה משתנים לפי תנועה ומסלול
      </div>
    </SectionWrap>
  )
}

function MiniMortgageCalc({ totalPrice }: MiniMortgageCalcProps) {
  const [equity, setEquity] = useState(50)
  const [years, setYears] = useState(15)
  const [rate, setRate] = useState(4.5)

  const loanAmount = totalPrice * (1 - equity / 100)
  const monthlyRate = rate / 100 / 12
  const numPayments = years * 12
  const monthlyPayment = monthlyRate > 0
    ? Math.round(loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1))
    : Math.round(loanAmount / numPayments)
  const totalPayment = monthlyPayment * numPayments
  const totalInterest = totalPayment - loanAmount

  return (
    <SectionWrap style={{ marginTop: 12, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <DollarSign style={{ width: 14, height: 14, color: themeTokens.colors.gold }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.slate[200] }}>מחשבון מימון</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: themeTokens.colors.slate[400], marginBottom: 4 }}>
            <span>הון עצמי</span>
            <span style={{ color: themeTokens.colors.gold, fontWeight: 500 }}>{equity}% ({formatCurrency(Math.round(totalPrice * equity / 100))})</span>
          </div>
          <RangeInput type="range" min="20" max="100" step="5" value={equity} onChange={(e) => setEquity(Number(e.target.value))} />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: themeTokens.colors.slate[400], marginBottom: 4 }}>
            <span>תקופה</span>
            <span style={{ color: themeTokens.colors.slate[300], fontWeight: 500 }}>{years} שנים</span>
          </div>
          <RangeInput type="range" min="5" max="30" step="1" value={years} onChange={(e) => setYears(Number(e.target.value))} />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: themeTokens.colors.slate[400], marginBottom: 4 }}>
            <span>ריבית</span>
            <span style={{ color: themeTokens.colors.slate[300], fontWeight: 500 }}>{rate}%</span>
          </div>
          <RangeInput type="range" min="2" max="8" step="0.25" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
        </div>
        {equity < 100 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: themeTokens.colors.slate[500] }}>החזר חודשי</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: themeTokens.colors.gold }}>{formatCurrency(monthlyPayment)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: themeTokens.colors.slate[500] }}>סה״כ ריבית</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#FB923C' }}>{formatCurrency(totalInterest)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: themeTokens.colors.slate[500] }}>סה״כ תשלום</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: themeTokens.colors.slate[300] }}>{formatCurrency(totalPayment)}</div>
            </div>
          </div>
        )}
      </div>
    </SectionWrap>
  )
}

function PlotNavigation({ currentPlot, allPlots, onSelectPlot }: PlotNavigationProps) {
  const prefetchPlot = usePrefetchPlot()

  const { currentIndex, total, prevPlot, nextPlot } = useMemo(() => {
    if (!currentPlot || !allPlots || allPlots.length < 2) return { currentIndex: -1, total: 0, prevPlot: null, nextPlot: null }
    const idx = allPlots.findIndex((p: any) => p.id === currentPlot.id)
    if (idx < 0) return { currentIndex: -1, total: 0, prevPlot: null, nextPlot: null }
    const prevIdx = idx > 0 ? idx - 1 : allPlots.length - 1
    const nextIdx = idx < allPlots.length - 1 ? idx + 1 : 0
    return {
      currentIndex: idx,
      total: allPlots.length,
      prevPlot: allPlots[prevIdx],
      nextPlot: allPlots[nextIdx],
    }
  }, [currentPlot?.id, allPlots])

  useEffect(() => {
    if (prevPlot?.id) prefetchPlot(prevPlot.id)
    if (nextPlot?.id) prefetchPlot(nextPlot.id)
  }, [prevPlot?.id, nextPlot?.id, prefetchPlot])

  if (total < 2 || currentIndex < 0) return null

  const goPrev = () => { if (prevPlot) onSelectPlot(prevPlot) }
  const goNext = () => { if (nextPlot) onSelectPlot(nextPlot) }

  const prevBn = prevPlot ? (prevPlot.block_number ?? prevPlot.blockNumber) : ''
  const nextBn = nextPlot ? (nextPlot.block_number ?? nextPlot.blockNumber) : ''

  return (
    <NavBar>
      <NavArrow
        onClick={goNext}
        onMouseEnter={() => nextPlot && prefetchPlot(nextPlot.id)}
        title={nextPlot ? `הבא: גוש ${nextBn} חלקה ${nextPlot.number}` : 'חלקה הבאה'}
      >
        <ChevronRight />
      </NavArrow>
      <NavCounter>{currentIndex + 1} / {total}</NavCounter>
      <NavArrow
        onClick={goPrev}
        onMouseEnter={() => prevPlot && prefetchPlot(prevPlot.id)}
        title={prevPlot ? `הקודם: גוש ${prevBn} חלקה ${prevPlot.number}` : 'חלקה קודמת'}
      >
        <ChevronLeft />
      </NavArrow>
    </NavBar>
  )
}

const POI_CATEGORY_CONFIG: Record<string, any> = {
  'school': { emoji: '🏫', label: 'חינוך', color: '#3B82F6' },
  'education': { emoji: '🏫', label: 'חינוך', color: '#3B82F6' },
  'transit': { emoji: '🚌', label: 'תחבורה', color: '#8B5CF6' },
  'bus': { emoji: '🚌', label: 'תחבורה', color: '#8B5CF6' },
  'train': { emoji: '🚆', label: 'רכבת', color: '#8B5CF6' },
  'park': { emoji: '🌳', label: 'פארקים', color: '#22C55E' },
  'hospital': { emoji: '🏥', label: 'בריאות', color: '#EF4444' },
  'health': { emoji: '🏥', label: 'בריאות', color: '#EF4444' },
  'shopping': { emoji: '🛒', label: 'קניות', color: '#F59E0B' },
  'commercial': { emoji: '🏬', label: 'מסחרי', color: '#F59E0B' },
  'synagogue': { emoji: '🕍', label: 'בתי כנסת', color: '#C8942A' },
  'restaurant': { emoji: '🍽️', label: 'מסעדות', color: '#F97316' },
  'sport': { emoji: '⚽', label: 'ספורט', color: '#06B6D4' },
  'government': { emoji: '🏛️', label: 'ממשלתי', color: '#64748B' },
}

function NearbyPoisSection({ plotId }: NearbyPoisSectionProps) {
  const { data, isLoading } = useNearbyPois(plotId)
  const pois = data?.pois || []
  const categories = data?.categories || {}

  if (isLoading) {
    return (
      <div style={{ marginTop: 16, padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <SkeletonPulse $w="16px" $h="16px" $rounded="9999px" />
          <SkeletonPulse $w="96px" $h="12px" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map(i => <SkeletonPulse key={i} $h="32px" $rounded="8px" />)}
        </div>
      </div>
    )
  }

  if (!pois || pois.length === 0) return null

  const groupedEntries = Object.entries(categories)
    .map(([cat, items]: [string, any]) => {
      const config = POI_CATEGORY_CONFIG[cat.toLowerCase()] || { emoji: '📍', label: cat, color: '#94A3B8' }
      return { key: cat, config, items: items.slice(0, 3) }
    })
    .sort((a: any, b: any) => b.items.length - a.items.length)
    .slice(0, 6)

  return (
    <div style={{ marginTop: 16 }} dir="rtl">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <IconBox $bg="rgba(59,130,246,0.15)" $size={28}>
          <MapPin style={{ width: 14, height: 14, color: '#60A5FA' }} />
        </IconBox>
        <h4 style={{ fontSize: 14, fontWeight: 700, color: themeTokens.colors.slate[200], margin: 0 }}>מה בסביבה</h4>
        <span style={{ fontSize: 10, color: themeTokens.colors.slate[500], marginRight: 'auto' }}>{pois.length} נקודות עניין</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {groupedEntries.map(({ key, config, items }: any) => (
          <PoiCategoryCard key={key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 14 }}>{config.emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: config.color }}>{config.label}</span>
              <span style={{ fontSize: 9, color: themeTokens.colors.slate[600] }}>({items.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map((poi: any, i: number) => (
                <div key={poi.id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, gap: 8 }}>
                  <span style={{ color: themeTokens.colors.slate[400], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{poi.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {poi.walk_min && poi.walk_min <= 30 && (
                      <span style={{ fontSize: 9, color: 'rgba(52,211,153,0.8)', whiteSpace: 'nowrap' }} title={`🚶 ${poi.walk_label} הליכה`}>
                        🚶{poi.walk_label}
                      </span>
                    )}
                    {poi.walk_min && poi.walk_min > 30 && poi.drive_min && (
                      <span style={{ fontSize: 9, color: 'rgba(96,165,250,0.8)', whiteSpace: 'nowrap' }} title={`🚗 ${poi.drive_label} נסיעה`}>
                        🚗{poi.drive_label}
                      </span>
                    )}
                    <span style={{ color: themeTokens.colors.slate[600], fontWeight: 500, whiteSpace: 'nowrap', fontSize: 10 }}>
                      {poi.distance_m < 1000 ? `${poi.distance_m}מ׳` : `${poi.distance_km}ק״מ`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </PoiCategoryCard>
        ))}
      </div>

      {pois.length > 0 && data?.plotCenter && (
        <a
          href={`https://www.google.com/maps/search/nearby+amenities/@${data.plotCenter.lat},${data.plotCenter.lng},15z`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, padding: '8px 0', fontSize: 10, color: themeTokens.colors.slate[500], textDecoration: 'none', transition: 'color 0.2s' }}
        >
          <ExternalLink style={{ width: 12, height: 12 }} />
          <span>הצג ב-Google Maps</span>
        </a>
      )}
    </div>
  )
}

// ─── Inlined: AnimatedNumber ────────────────────────────────────────────
const AN_Value = styled.span`
  font-family: ${themeTokens.fonts.primary};
  font-variant-numeric: tabular-nums;
`

interface AnimatedNumberProps {
  value: number
  formatter?: (value: number) => ReactNode
  duration?: number
  className?: string
}

function AnimatedNumber({ value, formatter, duration = 800, className }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const from = prevRef.current
    const to = value
    prevRef.current = value

    if (from === to) return

    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(from + (to - from) * eased)
      setDisplay(current)
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }
    frameRef.current = requestAnimationFrame(tick)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [value, duration])

  return <AN_Value className={className}>{formatter ? formatter(display) : display}</AN_Value>
}

// ─── Inlined: PlotPercentileBadges ──────────────────────────────────────
const PPB_Wrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const PPB_Badge = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: ${themeTokens.radii.md};
  font-size: 10px;
  font-weight: 600;
  border: 1px solid ${({ $color }) => `${$color}40`};
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}1a`};
  transition: transform ${themeTokens.transitions.normal};

  &:hover {
    transform: scale(1.02);
  }

  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }
`

interface PlotPercentileBadgesProps {
  plot: { id: string | number }
  allPlots: Array<Record<string, unknown>>
  className?: string
}

function PlotPercentileBadges({ plot, allPlots, className }: PlotPercentileBadgesProps) {
  const percentiles = useMemo(() => calcPlotPercentiles(plot, allPlots), [plot?.id, allPlots?.length])
  if (!percentiles) return null

  const badges = [
    percentiles.price?.cheaperThan >= 30 && {
      icon: DollarSign,
      text: `זול מ-${percentiles.price.cheaperThan}% מהחלקות`,
      color: percentiles.price.cheaperThan >= 70 ? themeTokens.colors.emerald : percentiles.price.cheaperThan >= 50 ? '#84CC16' : themeTokens.colors.amber,
      priority: percentiles.price.cheaperThan,
    },
    percentiles.roi?.betterThan >= 40 && {
      icon: TrendingUp,
      text: `תשואה גבוהה מ-${percentiles.roi.betterThan}%`,
      color: percentiles.roi.betterThan >= 70 ? themeTokens.colors.emerald : percentiles.roi.betterThan >= 50 ? '#84CC16' : themeTokens.colors.amber,
      priority: percentiles.roi.betterThan,
    },
    percentiles.size?.biggerThan >= 50 && {
      icon: Ruler,
      text: `גדול מ-${percentiles.size.biggerThan}% מהחלקות`,
      color: percentiles.size.biggerThan >= 70 ? themeTokens.colors.blue : '#60A5FA',
      priority: percentiles.size.biggerThan - 10,
    },
    percentiles.priceSqm?.cheaperThan >= 40 && {
      icon: BarChart3,
      text: `מחיר/מ״ר נמוך מ-${percentiles.priceSqm.cheaperThan}%`,
      color: percentiles.priceSqm.cheaperThan >= 70 ? themeTokens.colors.emerald : '#84CC16',
      priority: percentiles.priceSqm.cheaperThan - 5,
    },
  ]
    .filter(Boolean)
    .sort((a, b) => (b?.priority || 0) - (a?.priority || 0))
    .slice(0, 3)

  if (badges.length === 0) return null

  return (
    <PPB_Wrap className={className}>
      {badges.map((badge, i) => {
        const Icon = badge.icon
        return (
          <PPB_Badge key={i} $color={badge.color}>
            <Icon />
            <span>{badge.text}</span>
          </PPB_Badge>
        )
      })}
    </PPB_Wrap>
  )
}

// ─── Inlined: PlotNotes ─────────────────────────────────────────────────
const PN_Wrapper = styled.div`
  background: rgba(22, 42, 74, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${themeTokens.radii.lg};
  padding: 12px;
  transition: border ${themeTokens.transitions.normal};
  direction: rtl;

  &:hover {
    border-color: rgba(255, 255, 255, 0.1);
  }
`

const PN_Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`

const PN_Title = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${themeTokens.colors.slate[400]};
`

const PN_DeleteButton = styled.button`
  margin-right: auto;
  color: ${themeTokens.colors.slate[600]};
  background: transparent;
  border: none;
  padding: 2px;
  cursor: pointer;
  transition: color ${themeTokens.transitions.normal};

  &:hover {
    color: ${themeTokens.colors.red};
  }
`

const PN_Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
`

const PN_TagButton = styled.button<{ $active: boolean; $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: ${themeTokens.radii.md};
  font-size: 9px;
  font-weight: 600;
  border: 1px solid ${({ $active, $color }) => ($active && $color ? `${$color}40` : 'rgba(255,255,255,0.05)')};
  color: ${({ $active, $color }) => ($active && $color ? $color : themeTokens.colors.slate[500])};
  background: ${({ $active, $color }) => ($active && $color ? `${$color}15` : 'rgba(255,255,255,0.02)')};
  transition: background ${themeTokens.transitions.normal}, color ${themeTokens.transitions.normal};

  &:hover {
    background: ${({ $active, $color }) => ($active && $color ? `${$color}25` : 'rgba(255,255,255,0.05)')};
    color: ${({ $active, $color }) => ($active && $color ? $color : themeTokens.colors.slate[300])};
  }
`

const PN_Editor = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const PN_Textarea = styled.textarea`
  width: 100%;
  background: rgba(10, 22, 40, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${themeTokens.radii.md};
  padding: 8px 12px;
  font-size: 12px;
  color: ${themeTokens.colors.slate[200]};
  resize: none;
  outline: none;
  transition: border ${themeTokens.transitions.normal};

  &::placeholder {
    color: ${themeTokens.colors.slate[600]};
  }

  &:focus {
    border-color: ${themeTokens.colors.gold}4d;
  }
`

const PN_Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const PN_Counter = styled.span`
  font-size: 9px;
  color: ${themeTokens.colors.slate[600]};
`

const PN_Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const PN_Cancel = styled.button`
  padding: 4px 10px;
  font-size: 10px;
  color: ${themeTokens.colors.slate[400]};
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color ${themeTokens.transitions.normal};

  &:hover {
    color: ${themeTokens.colors.slate[200]};
  }
`

const PN_Save = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 10px;
  font-weight: 700;
  color: ${themeTokens.colors.gold};
  background: ${themeTokens.colors.gold}26;
  border: 1px solid ${themeTokens.colors.gold}40;
  border-radius: ${themeTokens.radii.md};
  cursor: pointer;
  transition: background ${themeTokens.transitions.normal};

  &:hover {
    background: ${themeTokens.colors.gold}40;
  }
`

const PN_Prompt = styled.button<{ $hasText: boolean }>`
  width: 100%;
  text-align: right;
  padding: 8px 12px;
  border-radius: ${themeTokens.radii.md};
  border: 1px dashed ${({ $hasText }) => ($hasText ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)')};
  background: ${({ $hasText }) => ($hasText ? 'rgba(255,255,255,0.02)' : 'transparent')};
  color: ${({ $hasText }) => ($hasText ? themeTokens.colors.slate[300] : themeTokens.colors.slate[600])};
  font-size: 12px;
  cursor: pointer;
  transition: border ${themeTokens.transitions.normal}, color ${themeTokens.transitions.normal}, background ${themeTokens.transitions.normal};

  &:hover {
    border-color: ${themeTokens.colors.gold}33;
    color: ${themeTokens.colors.slate[400]};
    background: rgba(255, 255, 255, 0.04);
  }
`

const PN_Timestamp = styled.div`
  font-size: 8px;
  color: ${themeTokens.colors.slate[700]};
  margin-top: 4px;
  text-align: left;
  direction: ltr;
`

interface PN_NoteApi {
  getNote: (plotId: string | number) => { text?: string; tags?: string[]; updatedAt?: string | number } | null
  setNote: (plotId: string | number, text: string) => void
  removeNote: (plotId: string | number) => void
  toggleTag: (plotId: string | number, tagId: string) => void
}

interface PlotNotesProps {
  plotId: string | number
  notes: PN_NoteApi
}

function PlotNotes({ plotId, notes }: PlotNotesProps) {
  const note = notes.getNote(plotId)
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(note?.text || '')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const hasContent = !!(note && (note.text || note.tags?.length))

  useEffect(() => {
    const current = notes.getNote(plotId)
    setText(current?.text || '')
    setIsEditing(false)
  }, [plotId, notes])

  const handleStartEdit = useCallback(() => {
    setIsEditing(true)
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
    })
  }, [])

  const handleSave = useCallback(() => {
    notes.setNote(plotId, text.trim())
    setIsEditing(false)
  }, [plotId, text, notes])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      setText(note?.text || '')
      setIsEditing(false)
    }
  }, [handleSave, note?.text])

  const handleDelete = useCallback(() => {
    notes.removeNote(plotId)
    setText('')
    setIsEditing(false)
  }, [plotId, notes])

  const activeTags = note?.tags || []

  return (
    <PN_Wrapper>
      <PN_Header>
        <StickyNote size={14} color={`${themeTokens.colors.amber}b3`} />
        <PN_Title>הערות אישיות</PN_Title>
        {hasContent && (
          <PN_DeleteButton onClick={handleDelete} title="מחק הערה">
            <Trash2 size={12} />
          </PN_DeleteButton>
        )}
      </PN_Header>

      <PN_Tags>
        {NOTE_TAGS.map(tag => {
          const isActive = activeTags.includes(tag.id)
          return (
            <PN_TagButton key={tag.id} onClick={() => notes.toggleTag(plotId, tag.id)} $active={isActive} $color={tag.color}>
              {tag.label}
            </PN_TagButton>
          )
        })}
      </PN_Tags>

      {isEditing ? (
        <PN_Editor>
          <PN_Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={'רשום הערה... (למשל: דיברתי עם עו"ד, נסח נקי)'}
            rows={3}
            maxLength={500}
          />
          <PN_Footer>
            <PN_Counter>{text.length}/500 · Ctrl+Enter לשמירה</PN_Counter>
            <PN_Actions>
              <PN_Cancel onClick={() => { setText(note?.text || ''); setIsEditing(false) }}>ביטול</PN_Cancel>
              <PN_Save onClick={handleSave}>
                <Check size={12} />
                שמור
              </PN_Save>
            </PN_Actions>
          </PN_Footer>
        </PN_Editor>
      ) : (
        <PN_Prompt onClick={handleStartEdit} $hasText={!!note?.text}>
          {note?.text || '\u270f\ufe0f הוסף הערה אישית...'}
        </PN_Prompt>
      )}

      {note?.updatedAt && (
        <PN_Timestamp>
          {new Date(note.updatedAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </PN_Timestamp>
      )}
    </PN_Wrapper>
  )
}

export default function SidebarDetails({ plot: rawPlot, onClose, onOpenLeadModal, favorites, compareIds = [], onToggleCompare, allPlots = [], onSelectPlot, priceChange, personalNotes }: SidebarDetailsProps) {
  const needsEnrich = rawPlot && !rawPlot.plot_images && !rawPlot.plot_documents
  const { data: enrichedPlot, isLoading: isEnriching } = usePlot(needsEnrich ? rawPlot.id : null)
  const plot = useMemo(() => {
    return needsEnrich && enrichedPlot ? { ...rawPlot, ...enrichedPlot } : rawPlot
  }, [needsEnrich, enrichedPlot, rawPlot])

  const scrollRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const { returnFocus } = useFocusTrap(!!plot, panelRef)

  const handleClose = useCallback(() => {
    returnFocus()
    onClose()
  }, [returnFocus, onClose])
  const [scrollShadow, setScrollShadow] = useState<{ top: boolean; bottom: boolean }>({ top: false, bottom: false })
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false)
  const [linkCopied, setLinkCopied] = useState<boolean>(false)
  const [gushCopied, setGushCopied] = useState<boolean>(false)
  const [summaryCopied, setSummaryCopied] = useState<boolean>(false)
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false)
  const [lightboxIndex, setLightboxIndex] = useState<number>(0)

  const SNAP_PEEK = 40
  const SNAP_MID = 75
  const SNAP_FULL = 95
  const snapPoints = [SNAP_PEEK, SNAP_MID, SNAP_FULL]

  const [sheetHeight, setSheetHeight] = useState(SNAP_MID)
  const [isDragging, setIsDragging] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)

  const dragRef = useRef({
    startY: 0,
    startX: 0,
    startHeight: SNAP_MID,
    direction: null as string | null,
    active: false,
  })

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640

  const handleTouchStart = useCallback((e: any) => {
    const touch = e.touches[0]
    dragRef.current = {
      startY: touch.clientY,
      startX: touch.clientX,
      startHeight: sheetHeight,
      direction: null,
      active: false,
    }
  }, [sheetHeight])

  const handleTouchMove = useCallback((e: any) => {
    const touch = e.touches[0]
    const state = dragRef.current
    const dx = touch.clientX - state.startX
    const dy = touch.clientY - state.startY

    if (!state.direction && (Math.abs(dx) > 15 || Math.abs(dy) > 15)) {
      state.direction = Math.abs(dy) >= Math.abs(dx) ? 'vertical' : 'horizontal'
      state.active = true
      setIsDragging(true)
    }

    if (!state.active) return

    if (state.direction === 'vertical' && isMobile) {
      const vhPerPx = 100 / window.innerHeight
      const deltaVh = -dy * vhPerPx
      const newHeight = Math.max(10, Math.min(95, state.startHeight + deltaVh))
      setSheetHeight(newHeight)
      e.preventDefault()
    } else if (state.direction === 'horizontal') {
      const offset = Math.max(0, dx)
      setSwipeOffset(offset)
    }
  }, [isMobile])

  const handleTouchEnd = useCallback(() => {
    const state = dragRef.current
    setIsDragging(false)

    if (state.direction === 'vertical' && isMobile) {
      let closest = snapPoints[0]
      let minDist = Infinity
      for (const sp of snapPoints) {
        const dist = Math.abs(sheetHeight - sp)
        if (dist < minDist) { minDist = dist; closest = sp }
      }

      if (sheetHeight < SNAP_PEEK - 10) {
        handleClose()
        return
      }

      setSheetHeight(closest)
    } else if (state.direction === 'horizontal') {
      if (swipeOffset > 100) {
        setSwipeOffset(0)
        handleClose()
      } else {
        setSwipeOffset(0)
      }
    }

    dragRef.current = { startY: 0, startX: 0, startHeight: sheetHeight, direction: null, active: false }
  }, [sheetHeight, swipeOffset, handleClose, isMobile])

  useEffect(() => {
    if (plot) setSheetHeight(SNAP_MID)
  }, [plot?.id])

  const handlePrintReport = useCallback(() => {
    if (!plot) return
    const bn = plot.block_number ?? plot.blockNumber
    const price = plot.total_price ?? plot.totalPrice
    const proj = plot.projected_value ?? plot.projectedValue
    const size = plot.size_sqm ?? plot.sizeSqM
    const roi = price > 0 ? Math.round((proj - price) / price * 100) : 0
    const zoning = plot.zoning_stage ?? plot.zoningStage
    const readiness = plot.readiness_estimate ?? plot.readinessEstimate
    const ctx = plot.area_context ?? plot.areaContext ?? ''
    const nearby = plot.nearby_development ?? plot.nearbyDevelopment ?? ''

    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8">
      <title>דו״ח השקעה - גוש ${bn} חלקה ${plot.number}</title>
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
        .footer { margin-top: 40px; text-align: center; color: #aaa; font-size: 11px; border-top: 1px solid #eee; padding-top: 16px; }
        .desc { font-size: 13px; color: #444; margin-bottom: 16px; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <h1>🏗️ דו״ח השקעה — גוש ${bn} | חלקה ${plot.number}</h1>
      <div class="subtitle">${plot.city} • ${new Date().toLocaleDateString('he-IL')}</div>
      ${plot.description ? `<p class="desc">${plot.description}</p>` : ''}
      ${ctx ? `<p class="desc">📍 ${ctx}</p>` : ''}
      ${nearby ? `<p class="desc">🏗️ ${nearby}</p>` : ''}
      <div class="section">
        <h2>נתונים פיננסיים</h2>
        <div class="grid3">
          <div class="card"><div class="label">מחיר מבוקש</div><div class="value blue">${formatCurrency(price)}</div></div>
          <div class="card"><div class="label">שווי צפוי</div><div class="value green">${formatCurrency(proj)}</div></div>
          <div class="card"><div class="label">תשואה צפויה</div><div class="value gold">+${roi}%</div></div>
        </div>
        ${(() => {
          const cagrData = calcCAGR(roi, readiness)
          return cagrData ? `<div class="row" style="margin-top:8px"><span class="label">תשואה שנתית (CAGR)</span><span class="val" style="color:#C8942A">${cagrData.cagr}% לשנה (${cagrData.years} שנים)</span></div>` : ''
        })()}
      </div>
      <div class="section">
        <h2>פרטי חלקה</h2>
        <div class="row"><span class="label">שטח</span><span class="val">${(size / 1000).toFixed(1)} דונם (${size.toLocaleString()} מ״ר)</span></div>
        <div class="row"><span class="label">מחיר למ״ר</span><span class="val">${formatCurrency(Math.round(price / size))}</span></div>
        <div class="row"><span class="label">מחיר לדונם</span><span class="val">${formatCurrency(Math.round(price / size * 1000))}</span></div>
        <div class="row"><span class="label">סטטוס</span><span class="val">${statusLabels[plot.status] || plot.status}</span></div>
        <div class="row"><span class="label">ייעוד קרקע</span><span class="val">${zoningLabels[zoning] || zoning}</span></div>
        ${readiness ? `<div class="row"><span class="label">מוכנות לבנייה</span><span class="val">${readiness}</span></div>` : ''}
      </div>
      ${(() => {
        const pnl = calcInvestmentPnL(plot, readiness && readiness.startsWith('1-3') ? 2 : readiness && readiness.startsWith('3-5') ? 4 : readiness && readiness.startsWith('5') ? 7 : 5)
        const yrs = pnl.holdingYears
        return `<div class="section">
        <h2>עלויות נלוות (הערכה)</h2>
        <div class="row"><span class="label">מס רכישה (6%)</span><span class="val">${formatCurrency(pnl.transaction.purchaseTax)}</span></div>
        <div class="row"><span class="label">שכ״ט עו״ד (~1.75%)</span><span class="val">${formatCurrency(pnl.transaction.attorneyFees)}</span></div>
        <div class="row"><span class="label">שמאי</span><span class="val">${formatCurrency(pnl.transaction.appraiserFee)}</span></div>
        <div class="row"><span class="label">סה״כ עלות כניסה</span><span class="val" style="color:#C8942A">${formatCurrency(pnl.transaction.totalWithPurchase)}</span></div>
        <div class="row"><span class="label">ארנונה + ניהול (${yrs} שנים)</span><span class="val" style="color:#F97316">${formatCurrency(pnl.totalHoldingCosts)}</span></div>
        <div class="row"><span class="label">היטל השבחה (50%)</span><span class="val" style="color:#EF4444">-${formatCurrency(pnl.exit.bettermentLevy)}</span></div>
        <div class="row"><span class="label">מס שבח (25%)</span><span class="val" style="color:#EF4444">-${formatCurrency(pnl.exit.capitalGains)}</span></div>
        <div class="row"><span class="label">עמלת מתווך (~1%)</span><span class="val" style="color:#EF4444">-${formatCurrency(pnl.exit.agentCommission)}</span></div>
        <div class="row"><span class="label">רווח נקי (אחרי הכל)</span><span class="val" style="color:#22C55E;font-size:15px;font-weight:800">${formatCurrency(pnl.netProfit)}</span></div>
        <div class="row"><span class="label">ROI נטו (אחרי הכל)</span><span class="val" style="color:#C8942A;font-weight:700">${pnl.trueRoi}%</span></div>
      </div>`
      })()}
      ${(() => {
        const center = plotCenter(plot.coordinates)
        if (!center) return ''
        const commutes = calcCommuteTimes(center.lat, center.lng)
        if (commutes.length === 0) return ''
        const formatMin = (m: number) => m < 60 ? `${m} דק׳` : `${Math.floor(m / 60)} שע׳ ${m % 60 > 0 ? m % 60 + ' דק׳' : ''}`
        return `<div class="section">
          <h2>זמני נסיעה משוערים 🚗</h2>
          <div class="grid3">
            ${commutes.slice(0, 6).map((c: any) => `<div class="card"><div class="label">${c.emoji} ${c.city}</div><div class="value">${formatMin(c.drivingMinutes)}</div><div style="font-size:10px;color:#999">${c.distanceKm} ק״מ</div></div>`).join('')}
          </div>
          <div style="font-size:10px;color:#aaa;text-align:center;margin-top:8px">* הערכה בלבד — זמני נסיעה משתנים לפי תנועה ומסלול</div>
        </div>`
      })()}
      ${(() => {
        const altReturns = calcAlternativeReturns(price, roi, readiness)
        if (!altReturns || altReturns.length === 0) return ''
        return `<div class="section">
          <h2>השוואת חלופות השקעה 📊</h2>
          <div style="font-size:11px;color:#666;margin-bottom:12px">
            מה היית מרוויח אם היית משקיע ${formatCurrency(price)} באפיק אחר?
          </div>
          <div class="grid" style="grid-template-columns: repeat(2, 1fr);">
            ${altReturns.map((alt: any) => {
              const isPlot = alt.name === 'קרקע זו' || alt.isPlot
              const valColor = isPlot ? '#C8942A' : alt.finalValue > price ? '#22C55E' : '#94A3B8'
              return `<div class="card" style="${isPlot ? 'border:2px solid #C8942A;background:#FFF8E7' : ''}">
                <div class="label">${alt.emoji || '💼'} ${alt.name}</div>
                <div class="value" style="font-size:15px;color:${valColor}">${formatCurrency(Math.round(alt.finalValue))}</div>
                <div style="font-size:10px;color:${alt.totalReturn > 0 ? '#22C55E' : '#EF4444'};margin-top:2px;">
                  ${alt.totalReturn > 0 ? '+' : ''}${Math.round(alt.totalReturn)}% (${alt.cagr || alt.annualReturn || '—'}%/שנה)
                </div>
              </div>`
            }).join('')}
          </div>
          <div style="font-size:10px;color:#aaa;text-align:center;margin-top:8px">* תשואות היסטוריות — אינן מבטיחות תשואה עתידית</div>
        </div>`
      })()}
      <div class="footer">
        <div>LandMap Israel — מפת קרקעות להשקעה</div>
        <div>הופק ב-${new Date().toLocaleDateString('he-IL')} ${new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</div>
        <div style="margin-top:8px;font-size:10px">⚠️ מסמך זה הינו לצרכי מידע בלבד ואינו מהווה ייעוץ השקעות</div>
      </div>
    </body></html>`)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 300)
  }, [plot])

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const top = scrollTop > 10
    const bottom = scrollTop + clientHeight < scrollHeight - 10
    setShowScrollTop(scrollTop > 400)
    setScrollShadow(prev => {
      if (prev.top === top && prev.bottom === bottom) return prev
      return { top, bottom }
    })
  }, [])

  useEffect(() => {
    handleScroll()
  }, [plot, handleScroll])

  if (!plot) return null

  const isLoadingExtra = isEnriching && !enrichedPlot

  const totalPrice = plot.total_price ?? plot.totalPrice
  const projectedValue = plot.projected_value ?? plot.projectedValue
  const sizeSqM = plot.size_sqm ?? plot.sizeSqM
  const blockNumber = plot.block_number ?? plot.blockNumber
  const zoningStage = plot.zoning_stage ?? plot.zoningStage
  const readinessEstimate = plot.readiness_estimate ?? plot.readinessEstimate
  const distanceToSea = plot.distance_to_sea ?? plot.distanceToSea
  const distanceToPark = plot.distance_to_park ?? plot.distanceToPark
  const distanceToHospital = plot.distance_to_hospital ?? plot.distanceToHospital
  const densityUnitsPerDunam = plot.density_units_per_dunam ?? plot.densityUnitsPerDunam
  const areaContext = plot.area_context ?? plot.areaContext
  const nearbyDevelopment = plot.nearby_development ?? plot.nearbyDevelopment
  const taxAuthorityValue = plot.tax_authority_value ?? plot.taxAuthorityValue
  const standard22 = plot.standard22 ?? plot.standard_22

  const statusColor = statusColors[plot.status]
  const roi = Math.round((projectedValue - totalPrice) / totalPrice * 100)
  const pricePerDunam = formatCurrency(Math.round(totalPrice / sizeSqM * 1000))
  const bettermentLevy = formatCurrency(Math.round((projectedValue - totalPrice) * 0.5))

  const currentStageIndex = zoningPipelineStages.findIndex((s: any) => s.key === zoningStage)

  let sectionNum = 0

  return (
    <>
      <Backdrop onClick={handleClose} aria-hidden="true" />

      <Panel
        ref={panelRef}
        role="dialog"
        aria-label={`פרטי חלקה — גוש ${plot?.block_number ?? plot?.blockNumber} חלקה ${plot?.number}`}
        aria-modal="true"
        style={{
          ...(isMobile ? { height: `${sheetHeight}vh`, transition: isDragging ? 'none' : 'height 0.35s cubic-bezier(0.32, 0.72, 0, 1)' } : {}),
          ...(swipeOffset > 0 ? { transform: `translateX(${swipeOffset}px)`, transition: 'none' } : {}),
        }}
      >
        <GoldAccentBar />

        <DragHandle
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <DragHandleBar />
        </DragHandle>

        {/* Draggable header zone */}
        <div
          style={{ flexShrink: 0 }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Map preview */}
          {plot.coordinates && plot.coordinates.length >= 3 ? (
            <MapPreview>
              <MiniMap
                coordinates={plot.coordinates}
                status={plot.status}
                city={plot.city}
                height="144px"
                style={{ borderRadius: 0, border: 0 }}
                showStreetViewToggle
              />
              {(() => {
                const center = plotCenter(plot.coordinates)
                if (!center) return null
                return (
                  <NavOverlay>
                    <NavBtn
                      $bg="rgba(51,204,255,0.9)"
                      href={`https://www.waze.com/ul?ll=${center.lat},${center.lng}&navigate=yes&zoom=17`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="נווט ב-Waze"
                      onClick={(e: any) => e.stopPropagation()}
                    >
                      <svg style={{ width: 12, height: 12 }} viewBox="0 0 24 24" fill="currentColor"><path d="M20.54 6.63c.23.7.38 1.43.43 2.19.05.84-.01 1.63-.19 2.39-.18.76-.47 1.47-.85 2.11a7.88 7.88 0 01-1.47 1.8c.1.13.19.26.27.4.36.66.55 1.38.55 2.17 0 .83-.21 1.6-.63 2.3a4.54 4.54 0 01-1.7 1.7 4.54 4.54 0 01-2.3.63c-.75 0-1.44-.17-2.08-.51a4.32 4.32 0 01-1.28-.99 8.2 8.2 0 01-2.37.35c-1.39 0-2.69-.33-3.89-.99a7.8 7.8 0 01-2.92-2.77A7.47 7.47 0 011 13.39c0-1.39.33-2.69.99-3.89A7.8 7.8 0 014.76 6.58a7.47 7.47 0 013.83-1.08h.2c.37-1.07 1.02-1.93 1.95-2.58A5.34 5.34 0 0113.85 2c1.07 0 2.06.3 2.96.89.9.6 1.55 1.38 1.96 2.35a7.6 7.6 0 011.77 1.39zm-5.85-2.3a2.89 2.89 0 00-2.13.86 2.92 2.92 0 00-.86 2.14c0 .17.01.34.04.5a7.7 7.7 0 012.14-.61c.34-.06.68-.1 1.03-.11a3.02 3.02 0 00-.09-1.65 2.93 2.93 0 00-2.13-1.13zm-3.96 5.72c-.48 0-.89.17-1.23.51-.34.34-.51.75-.51 1.23s.17.89.51 1.23c.34.34.75.51 1.23.51s.89-.17 1.23-.51c.34-.34.51-.75.51-1.23s-.17-.89-.51-1.23a1.68 1.68 0 00-1.23-.51zm5.07 0c-.48 0-.89.17-1.23.51-.34.34-.51.75-.51 1.23s.17.89.51 1.23c.34.34.75.51 1.23.51s.89-.17 1.23-.51c.34-.34.51-.75.51-1.23s-.17-.89-.51-1.23a1.68 1.68 0 00-1.23-.51z"/></svg>
                      Waze
                    </NavBtn>
                    <NavBtn
                      $bg="rgba(66,133,244,0.9)"
                      href={`https://www.google.com/maps/dir/?api=1&destination=${center.lat},${center.lng}&travelmode=driving`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="נווט ב-Google Maps"
                      onClick={(e: any) => e.stopPropagation()}
                    >
                      <Navigation style={{ width: 12, height: 12 }} />
                      Maps
                    </NavBtn>
                  </NavOverlay>
                )
              })()}
            </MapPreview>
          ) : (
            <MapFallback>
              <MapFallbackCenter>
                <MapFallbackDot />
                <MapFallbackLabel>גוש {blockNumber} | {plot.city}</MapFallbackLabel>
              </MapFallbackCenter>
              <MapGradientBottom />
            </MapFallback>
          )}

          {/* Header */}
          <HeaderWrap>
            <HeaderLeft>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PlotTitle>
                  <GoldGradientText>גוש</GoldGradientText>
                  {' '}{blockNumber}{' | '}
                  <GoldGradientText>חלקה</GoldGradientText>
                  {' '}{plot.number}
                </PlotTitle>
                <CopyBtn
                  $copied={gushCopied}
                  onClick={() => {
                    navigator.clipboard.writeText(`גוש ${blockNumber} חלקה ${plot.number}`).then(() => {
                      setGushCopied(true)
                      setTimeout(() => setGushCopied(false), 2000)
                    })
                  }}
                  title="העתק גוש/חלקה (לחיפוש בטאבו, מנהל מקרקעין)"
                >
                  {gushCopied
                    ? <Check style={{ width: 12, height: 12, color: '#4ADE80' }} />
                    : <Copy style={{ width: 12, height: 12, color: themeTokens.colors.slate[400] }} />
                  }
                </CopyBtn>
              </div>
              {/* Mobile compact summary */}
              <BadgeRow $mobile>
                <span style={{ fontSize: 12, color: themeTokens.colors.slate[400] }}>{formatDunam(sizeSqM)} דונם</span>
                <span style={{ fontSize: 10, color: themeTokens.colors.slate[500] }}>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, color: statusColor }}>
                  <span style={{ width: 6, height: 6, borderRadius: 9999, background: statusColor }} />
                  {statusLabels[plot.status]}
                </span>
                <span style={{ fontSize: 10, color: themeTokens.colors.slate[500] }}>•</span>
                {(() => {
                  const score = calcInvestmentScore(plot)
                  const { color } = getScoreLabel(score)
                  return <span style={{ fontSize: 12, fontWeight: 700, color }}>⭐ {score}/10</span>
                })()}
              </BadgeRow>
              {/* Desktop full badges */}
              <BadgeRow>
                <InfoBadge>{formatDunam(sizeSqM)} דונם ({sizeSqM.toLocaleString()} מ&quot;ר)</InfoBadge>
                {(() => {
                  const perimeter = calcPlotPerimeter(plot.coordinates)
                  if (!perimeter || perimeter < 10) return null
                  const formatted = perimeter >= 1000 ? `${(perimeter / 1000).toFixed(1)} ק״מ` : `${Math.round(perimeter)} מ׳`
                  return (
                    <InfoBadge $color="rgba(96,165,250,0.8)" $bg="rgba(59,130,246,0.08)" title={`היקף החלקה: ${Math.round(perimeter)} מטר — שימושי להערכת עלויות גידור ותשתיות`}>
                      📏 היקף: {formatted}
                    </InfoBadge>
                  )
                })()}
                <InfoBadge $color={themeTokens.colors.slate[300]}>{zoningLabels[zoningStage]}</InfoBadge>
                {densityUnitsPerDunam && (
                  <InfoBadge $color={themeTokens.colors.gold} $bg="rgba(200,148,42,0.1)">{densityUnitsPerDunam} יח&quot;ד/דונם</InfoBadge>
                )}
                <InfoBadge
                  $bg={statusColor + '14'}
                  $border={statusColor + '35'}
                  $color={statusColor}
                  style={{ borderRadius: 9999, fontWeight: 500 }}
                >
                  <StatusDot $color={statusColor} $size={8} />
                  {statusLabels[plot.status]}
                </InfoBadge>
                {(() => {
                  const score = calcInvestmentScore(plot)
                  const { label, color } = getScoreLabel(score)
                  return (
                    <InfoBadge
                      $bg={`${color}14`}
                      $border={`${color}35`}
                      $color={color}
                      style={{ borderRadius: 9999, fontWeight: 700 }}
                      title={`ציון השקעה: ${score}/10 — ${label}`}
                    >
                      ⭐ {score}/10
                    </InfoBadge>
                  )
                })()}
                {plot._buySignal && (
                  <InfoBadge
                    $bg={plot._buySignal.signal === 'BUY' ? 'rgba(16,185,129,0.12)' : plot._buySignal.signal === 'HOLD' ? 'rgba(245,158,11,0.12)' : 'rgba(100,116,139,0.12)'}
                    $border={plot._buySignal.signal === 'BUY' ? 'rgba(16,185,129,0.3)' : plot._buySignal.signal === 'HOLD' ? 'rgba(245,158,11,0.3)' : 'rgba(100,116,139,0.3)'}
                    $color={plot._buySignal.signal === 'BUY' ? '#34D399' : plot._buySignal.signal === 'HOLD' ? '#FBBF24' : '#94A3B8'}
                    style={{ borderRadius: 9999, fontWeight: 700 }}
                    title={`אות השקעה: ${plot._buySignal.label} (ציון ${plot._buySignal.strength}/10)${plot._paybackYears ? ` · החזר השקעה: ~${plot._paybackYears} שנים` : ''}`}
                  >
                    {plot._buySignal.label}
                    {plot._paybackYears != null && plot._paybackYears > 0 && (
                      <span style={{ fontSize: 9, opacity: 0.7 }}>· {plot._paybackYears}שנ׳</span>
                    )}
                  </InfoBadge>
                )}
                {plot._investmentRank && plot._totalRanked && plot._investmentRank <= 5 && (
                  <InfoBadge
                    $bg={plot._investmentRank === 1 ? 'rgba(200,148,42,0.15)' : 'rgba(99,102,241,0.12)'}
                    $border={plot._investmentRank === 1 ? 'rgba(200,148,42,0.35)' : 'rgba(99,102,241,0.25)'}
                    $color={plot._investmentRank === 1 ? '#E5B84B' : '#A5B4FC'}
                    $size="sm"
                    style={{ borderRadius: 9999, fontWeight: 700 }}
                    title={`דירוג ${plot._investmentRank} מתוך ${plot._totalRanked} חלקות זמינות`}
                  >
                    {plot._investmentRank === 1 ? '🥇' : plot._investmentRank === 2 ? '🥈' : plot._investmentRank === 3 ? '🥉' : '🏅'}
                    #{plot._investmentRank}/{plot._totalRanked}
                  </InfoBadge>
                )}
                {plot.views > 0 && (
                  <InfoBadge $bg="rgba(99,102,241,0.12)" $border="rgba(99,102,241,0.25)" $color="#A5B4FC" $size="sm" style={{ borderRadius: 9999 }} title={`${plot.views} צפיות`}>
                    <Eye style={{ width: 10, height: 10 }} />
                    {plot.views} צפו
                  </InfoBadge>
                )}
                {(() => {
                  const dom = calcDaysOnMarket(plot.created_at ?? plot.createdAt)
                  if (!dom) return null
                  return (
                    <InfoBadge $bg={`${dom.color}14`} $border={`${dom.color}35`} $color={dom.color} $size="sm" style={{ borderRadius: 9999 }} title={`${dom.days} ימים מאז פרסום`}>
                      <Hourglass style={{ width: 10, height: 10 }} />
                      {dom.label}
                    </InfoBadge>
                  )
                })()}
                {(() => {
                  const dv = calcDemandVelocity(plot)
                  if (!dv || dv.tier === 'low') return null
                  return (
                    <InfoBadge $bg={`${dv.color}14`} $border={`${dv.color}35`} $color={dv.color} $size="sm" style={{ borderRadius: 9999 }} title={`${dv.velocity} צפיות/יום — ${dv.label}`}>
                      {dv.emoji} {dv.label}
                    </InfoBadge>
                  )
                })()}
                {plot._marketTrend && plot._marketTrend.direction !== 'stable' && (
                  <InfoBadge
                    $bg={plot._marketTrend.direction === 'up' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}
                    $border={plot._marketTrend.direction === 'up' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}
                    $color={plot._marketTrend.direction === 'up' ? '#34D399' : '#F87171'}
                    $size="sm"
                    style={{ borderRadius: 9999, fontWeight: 700 }}
                    title={`מגמת אזור ${plot.city}: ${plot._marketTrend.direction === 'up' ? 'עלייה' : 'ירידה'} של ${Math.abs(plot._marketTrend.changePct)}% ב-30 יום אחרונים`}
                  >
                    {plot._marketTrend.direction === 'up' ? '📈' : '📉'} {plot.city} {plot._marketTrend.changePct > 0 ? '+' : ''}{plot._marketTrend.changePct}%
                  </InfoBadge>
                )}
              </BadgeRow>
            </HeaderLeft>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {favorites && (
                <ActionBtn
                  $active={favorites.isFavorite(plot.id)}
                  $activeColor="rgba(239,68,68,1)"
                  onClick={() => favorites.toggle(plot.id)}
                >
                  <Heart
                    style={{
                      width: 16, height: 16,
                      color: favorites.isFavorite(plot.id) ? '#F87171' : themeTokens.colors.slate[400],
                      fill: favorites.isFavorite(plot.id) ? '#F87171' : 'none',
                      transform: favorites.isFavorite(plot.id) ? 'scale(1.1)' : 'scale(1)',
                      transition: 'all 0.2s',
                    }}
                  />
                </ActionBtn>
              )}
              <ActionLink
                href={`/plot/${plot.id}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="פתח בדף מלא"
                title="פתח בדף מלא"
              >
                <Maximize2 style={{ width: 16, height: 16, color: themeTokens.colors.slate[400] }} />
              </ActionLink>
              <CloseBtn onClick={handleClose} aria-label="סגור פרטי חלקה">
                <X style={{ width: 16, height: 16, color: themeTokens.colors.slate[400] }} />
              </CloseBtn>
            </div>
          </HeaderWrap>
        </div>{/* end header drag zone */}

        <PlotNavigation currentPlot={plot} allPlots={allPlots} onSelectPlot={onSelectPlot} />

        {/* Official sources quick-links */}
        <OfficialBar dir="rtl">
          <span style={{ fontSize: 10, color: themeTokens.colors.slate[500], fontWeight: 500 }}>🏛️ מקורות רשמיים:</span>
          {govMapUrl(plot) && (
            <OfficialLink href={govMapUrl(plot)} target="_blank" rel="noopener noreferrer" title={`פתח גוש ${blockNumber} חלקה ${plot.number} ב-GovMap (מפת ממשלת ישראל)`}>
              <ExternalLink />
              GovMap
            </OfficialLink>
          )}
          {tabuCheckUrl(plot) && (
            <OfficialLink href={tabuCheckUrl(plot)} target="_blank" rel="noopener noreferrer" title="בדיקת נסח טאבו — רשות המקרקעין">
              <FileText style={{ width: 10, height: 10 }} />
              נסח טאבו
            </OfficialLink>
          )}
          <OfficialLink href={`https://www.nadlan.gov.il/?search=${encodeURIComponent(plot.city)}`} target="_blank" rel="noopener noreferrer" title="עסקאות נדל״ן באזור — אתר הממשלה">
            <BarChart style={{ width: 10, height: 10 }} />
            נדל״ן ממשלתי
          </OfficialLink>
        </OfficialBar>

        {/* Scrollable content */}
        <ScrollArea ref={scrollRef} onScroll={handleScroll}>
          <ScrollShadowTop $visible={scrollShadow.top} />
          <ScrollShadowBottom $visible={scrollShadow.bottom} />

          <QuickNavBar scrollRef={scrollRef} />

          {/* Mobile badges full set */}
          <MobileOnlyBlock>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
              <InfoBadge $size="sm">{formatDunam(sizeSqM)} דונם ({sizeSqM.toLocaleString()} מ&quot;ר)</InfoBadge>
              <InfoBadge $size="sm" $color={themeTokens.colors.slate[300]}>{zoningLabels[zoningStage]}</InfoBadge>
              {densityUnitsPerDunam && (
                <InfoBadge $size="sm" $color={themeTokens.colors.gold} $bg="rgba(200,148,42,0.1)">{densityUnitsPerDunam} יח&quot;ד/דונם</InfoBadge>
              )}
              <InfoBadge $bg={statusColor + '14'} $border={statusColor + '35'} $color={statusColor} $size="sm" style={{ borderRadius: 9999 }}>
                <span style={{ width: 6, height: 6, borderRadius: 9999, display: 'inline-block', background: statusColor, animation: `${pulseAnim} 2s ease infinite` }} />
                {statusLabels[plot.status]}
              </InfoBadge>
              {(() => {
                const score = calcInvestmentScore(plot)
                const { label, color } = getScoreLabel(score)
                return (
                  <InfoBadge $bg={`${color}14`} $border={`${color}35`} $color={color} $size="sm" style={{ borderRadius: 9999, fontWeight: 700 }} title={`ציון השקעה: ${score}/10 — ${label}`}>
                    ⭐ {score}/10
                  </InfoBadge>
                )
              })()}
              {plot.views > 0 && (
                <InfoBadge $bg="rgba(99,102,241,0.12)" $border="rgba(99,102,241,0.25)" $color="#A5B4FC" $size="sm" style={{ borderRadius: 9999 }}>
                  <Eye style={{ width: 10, height: 10 }} /> {plot.views} צפו
                </InfoBadge>
              )}
              {(() => {
                const dom = calcDaysOnMarket(plot.created_at ?? plot.createdAt)
                if (!dom) return null
                return (
                  <InfoBadge $bg={`${dom.color}14`} $border={`${dom.color}35`} $color={dom.color} $size="sm" style={{ borderRadius: 9999 }}>
                    <Hourglass style={{ width: 10, height: 10 }} /> {dom.label}
                  </InfoBadge>
                )
              })()}
              {(() => {
                const dv = calcDemandVelocity(plot)
                if (!dv || dv.tier === 'low') return null
                return (
                  <InfoBadge $bg={`${dv.color}14`} $border={`${dv.color}35`} $color={dv.color} $size="sm" style={{ borderRadius: 9999 }}>
                    {dv.emoji} {dv.label}
                  </InfoBadge>
                )
              })()}
            </div>
          </MobileOnlyBlock>

          {/* Area Market Context Bar */}
          {(() => {
            if (!allPlots || allPlots.length < 3 || sizeSqM <= 0) return null
            const cityPlots = allPlots.filter((p: any) => (p.city === plot.city) && (p.total_price ?? p.totalPrice ?? 0) > 0)
            if (cityPlots.length < 2) return null

            const plotPsm = totalPrice / sizeSqM
            let totalRoi = 0, totalPsm = 0
            const psmValues: number[] = []
            for (const p of cityPlots) {
              const pp = p.total_price ?? p.totalPrice ?? 0
              const ps = p.size_sqm ?? p.sizeSqM ?? 1
              const pj = p.projected_value ?? p.projectedValue ?? 0
              if (pp > 0 && ps > 0) { totalPsm += pp / ps; psmValues.push(pp / ps) }
              if (pp > 0) totalRoi += ((pj - pp) / pp) * 100
            }
            const avgRoi = Math.round(totalRoi / cityPlots.length)
            const sorted = [...psmValues].sort((a, b) => a - b)
            const rank = sorted.filter(v => v <= plotPsm).length
            const percentile = Math.round((rank / sorted.length) * 100)
            const rankLabel = percentile <= 25 ? 'הזולה ביותר' : percentile <= 50 ? 'מתחת לממוצע' : percentile <= 75 ? 'מעל הממוצע' : 'היקרה ביותר'
            const rankColor = percentile <= 25 ? '#22C55E' : percentile <= 50 ? '#4ADE80' : percentile <= 75 ? '#FBBF24' : '#EF4444'

            return (
              <MarketContextBar>
                <MarketContextInner>
                  <span style={{ fontSize: 10 }}>🏘️</span>
                  <span style={{ fontSize: 10, color: themeTokens.colors.slate[500] }}>{cityPlots.length} חלקות ב{plot.city}</span>
                  <span style={{ fontSize: 10, color: themeTokens.colors.slate[700] }}>•</span>
                  <span style={{ fontSize: 10, color: 'rgba(52,211,153,0.8)' }}>∅ +{avgRoi}% ROI</span>
                  <span style={{ fontSize: 10, color: themeTokens.colors.slate[700] }}>•</span>
                  <span style={{ fontSize: 10, fontWeight: 500, color: rankColor }}>{rankLabel}</span>
                  {(() => {
                    const withDates = cityPlots.filter((p: any) => (p.created_at ?? p.createdAt) && (p.size_sqm ?? p.sizeSqM ?? 0) > 0)
                    if (withDates.length < 4) return null
                    const sorted = [...withDates].sort((a: any, b: any) => new Date(a.created_at ?? a.createdAt).getTime() - new Date(b.created_at ?? b.createdAt).getTime())
                    const half = Math.floor(sorted.length / 2)
                    const olderHalf = sorted.slice(0, half)
                    const newerHalf = sorted.slice(half)
                    const avgPsmFn = (arr: any[]) => {
                      let sum = 0, cnt = 0
                      for (const p of arr) {
                        const pp = p.total_price ?? p.totalPrice ?? 0
                        const ps = p.size_sqm ?? p.sizeSqM ?? 1
                        if (pp > 0 && ps > 0) { sum += pp / ps; cnt++ }
                      }
                      return cnt > 0 ? sum / cnt : 0
                    }
                    const olderAvg = avgPsmFn(olderHalf)
                    const newerAvg = avgPsmFn(newerHalf)
                    if (olderAvg <= 0) return null
                    const trendPct = Math.round(((newerAvg - olderAvg) / olderAvg) * 100)
                    if (Math.abs(trendPct) < 2) return null
                    const isUp = trendPct > 0
                    return (
                      <>
                        <span style={{ fontSize: 10, color: themeTokens.colors.slate[700] }}>•</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: isUp ? '#F59E0B' : '#22C55E' }} title={`מגמת מחירים: חלקות חדשות ${isUp ? 'יקרות' : 'זולות'} ב-${Math.abs(trendPct)}% מחלקות ישנות יותר`}>
                          {isUp ? '↗' : '↘'} {isUp ? '+' : ''}{trendPct}%
                        </span>
                      </>
                    )
                  })()}
                  <MiniBar>
                    <MiniBarTrack>
                      <MiniBarFill $width={`${percentile}%`} $bg={rankColor} />
                    </MiniBarTrack>
                  </MiniBar>
                </MarketContextInner>
              </MarketContextBar>
            )
          })()}

          <ContentPad>
            {/* Total Investment Summary */}
            {(() => {
              const readiness = readinessEstimate || ''
              const holdingYears = readiness.startsWith('1-3') ? 2 : readiness.startsWith('3-5') ? 4 : readiness.startsWith('5') ? 7 : 5
              const pnl = calcInvestmentPnL(plot, holdingYears)
              return (
                <StaggerIn $delay={1}><SummaryCard>
                  <SummaryGrid>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: themeTokens.colors.slate[500], marginBottom: 2 }}>💰 סה״כ השקעה נדרשת</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#60A5FA' }}>{formatCurrency(pnl.totalInvestment)}</div>
                      <div style={{ fontSize: 9, color: themeTokens.colors.slate[600] }}>כולל מיסים, שכ״ט + {holdingYears}ש׳ החזקה</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: themeTokens.colors.slate[500], marginBottom: 2 }}>✨ רווח נקי צפוי</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: pnl.netProfit >= 0 ? '#34D399' : '#F87171' }}>{formatCurrency(pnl.netProfit)}</div>
                      <div style={{ fontSize: 9, color: themeTokens.colors.slate[600] }}>אחרי הכל · {pnl.trueRoi}% ROI נטו</div>
                    </div>
                  </SummaryGrid>
                  {pnl.totalHoldingCosts > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 9 }}>
                      <span style={{ color: themeTokens.colors.slate[600] }}>ארנונה + ניהול: {formatCurrency(pnl.annual.totalAnnual)}/שנה</span>
                      <span style={{ color: themeTokens.colors.slate[700] }}>·</span>
                      <span style={{ color: 'rgba(249,115,22,0.6)' }}>סה״כ {holdingYears} שנים: {formatCurrency(pnl.totalHoldingCosts)}</span>
                    </div>
                  )}
                </SummaryCard></StaggerIn>
              )
            })()}

            {/* Personal Notes */}
            {personalNotes && (
              <StaggerIn $delay={1} style={{ marginBottom: 12 }}>
                <PlotNotes plotId={plot.id} notes={personalNotes} />
              </StaggerIn>
            )}

            {/* Below Market Price Indicator */}
            {(() => {
              if (!allPlots || allPlots.length < 3 || sizeSqM <= 0) return null
              const cityPlots = allPlots.filter((p: any) => p.city === plot.city && p.id !== plot.id)
              if (cityPlots.length < 2) return null
              let totalPsm = 0, count = 0
              for (const p of cityPlots) {
                const pp = p.total_price ?? p.totalPrice ?? 0
                const ps = p.size_sqm ?? p.sizeSqM ?? 0
                if (pp > 0 && ps > 0) { totalPsm += pp / ps; count++ }
              }
              if (count < 2) return null
              const avgPsm = totalPsm / count
              const plotPsm = totalPrice / sizeSqM
              const diffPct = Math.round(((plotPsm - avgPsm) / avgPsm) * 100)
              if (Math.abs(diffPct) < 5) return null
              const isBelow = diffPct < 0
              return (
                <StaggerIn $delay={1}><AlertCard
                  $bg={isBelow ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)'}
                  $border={isBelow ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'}
                  style={{ marginBottom: 12 }}
                >
                  <SmallAlertIconBox $bg={isBelow ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'}>
                    {isBelow ? '📉' : '📈'}
                  </SmallAlertIconBox>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: isBelow ? '#34D399' : '#FBBF24' }}>
                      {isBelow ? `${Math.abs(diffPct)}% מתחת לממוצע ב${plot.city}` : `${diffPct}% מעל הממוצע ב${plot.city}`}
                    </div>
                    <div style={{ fontSize: 10, color: themeTokens.colors.slate[500] }}>
                      ממוצע אזורי: {formatCurrency(Math.round(avgPsm))}/מ״ר · חלקה זו: {formatCurrency(Math.round(plotPsm))}/מ״ר
                    </div>
                  </div>
                </AlertCard></StaggerIn>
              )
            })()}

            {/* Investment Verdict */}
            {(() => {
              const verdict = calcInvestmentVerdict(plot, allPlots)
              if (!verdict) return null
              return (
                <StaggerIn $delay={1}><AlertCard
                  $bg={`${verdict.color}18`}
                  $border={`${verdict.color}33`}
                  style={{ marginBottom: 16 }}
                >
                  <AlertIconBox $bg={`${verdict.color}18`}>{verdict.emoji}</AlertIconBox>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: verdict.color }}>{verdict.label}</div>
                    <div style={{ fontSize: 11, color: themeTokens.colors.slate[400], lineHeight: 1.4 }}>{verdict.description}</div>
                  </div>
                </AlertCard></StaggerIn>
              )
            })()}

            {/* Investment Risk Level */}
            {(() => {
              const risk = calcRiskLevel(plot, allPlots)
              if (!risk) return null
              const segments = [1, 2, 3, 4, 5]
              return (
                <StaggerIn $delay={1}><AlertCard $bg="rgba(10,22,40,0.3)" $border="rgba(255,255,255,0.05)" style={{ marginBottom: 12 }}>
                  <SmallAlertIconBox $bg={`${risk.color}15`}>{risk.emoji}</SmallAlertIconBox>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: risk.color }}>{risk.label}</span>
                      <span style={{ fontSize: 9, color: themeTokens.colors.slate[500] }}>{risk.level}/5</span>
                    </div>
                    <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
                      {segments.map(s => (
                        <RiskSegment key={s} $active={s <= risk.level} $level={s} />
                      ))}
                    </div>
                    {risk.factors.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {risk.factors.map((factor: string, i: number) => (
                          <span key={i} style={{ fontSize: 8, color: themeTokens.colors.slate[500], background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: 4 }}>{factor}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </AlertCard></StaggerIn>
              )
            })()}

            {/* Description */}
            {plot.description && (
              <StaggerIn $delay={1}><p style={{ fontSize: 14, color: themeTokens.colors.slate[300], lineHeight: 1.6, marginBottom: 4 }}>{plot.description}</p></StaggerIn>
            )}

            {/* Area Context */}
            {(areaContext || nearbyDevelopment) && (
              <StaggerIn $delay={2}><ContextPanel>
                {areaContext && (
                  <div style={{ display: 'flex', gap: 12, marginBottom: nearbyDevelopment ? 12 : 0 }}>
                    <IconBox $bg="rgba(200,148,42,0.15)" $size={28} style={{ marginTop: 2 }}>
                      <MapPin style={{ width: 14, height: 14, color: themeTokens.colors.gold }} />
                    </IconBox>
                    <p style={{ fontSize: 14, color: themeTokens.colors.slate[300], lineHeight: 1.6, margin: 0 }}>{areaContext}</p>
                  </div>
                )}
                {nearbyDevelopment && (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <IconBox $bg="rgba(16,185,129,0.15)" $size={28} style={{ marginTop: 2 }}>
                      <Building2 style={{ width: 14, height: 14, color: '#34D399' }} />
                    </IconBox>
                    <p style={{ fontSize: 12, color: themeTokens.colors.slate[400], lineHeight: 1.6, margin: 0 }}>{nearbyDevelopment}</p>
                  </div>
                )}
              </ContextPanel></StaggerIn>
            )}

            {/* Distance chips */}
            <StaggerIn $delay={3} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
              {(() => {
                const perimeter = calcPlotPerimeter(plot.coordinates)
                if (!perimeter) return null
                return (
                  <DistanceChip $borderColor="rgba(200,148,42,0.15)" title={`היקף החלקה: ${perimeter.toLocaleString()} מטר — שימושי להערכת עלויות גידור`}>
                    <IconBox $bg="rgba(200,148,42,0.15)" $size={24}>
                      <span style={{ color: themeTokens.colors.gold, fontSize: 11 }}>📐</span>
                    </IconBox>
                    היקף: {perimeter >= 1000 ? `${(perimeter / 1000).toFixed(1)} ק״מ` : `${perimeter} מ׳`}
                  </DistanceChip>
                )
              })()}
              {distanceToSea != null && (
                <DistanceChip $borderColor="rgba(59,130,246,0.15)">
                  <IconBox $bg="rgba(59,130,246,0.15)" $size={24}>
                    <Waves style={{ width: 14, height: 14, color: '#60A5FA' }} />
                  </IconBox>
                  {distanceToSea} מ׳ מהים
                </DistanceChip>
              )}
              {distanceToPark != null && (
                <DistanceChip $borderColor="rgba(34,197,94,0.15)">
                  <IconBox $bg="rgba(34,197,94,0.15)" $size={24}>
                    <TreePine style={{ width: 14, height: 14, color: '#4ADE80' }} />
                  </IconBox>
                  {distanceToPark} מ׳ מפארק
                </DistanceChip>
              )}
              {distanceToHospital != null && (
                <DistanceChip $borderColor="rgba(239,68,68,0.15)">
                  <IconBox $bg="rgba(239,68,68,0.15)" $size={24}>
                    <Hospital style={{ width: 14, height: 14, color: '#F87171' }} />
                  </IconBox>
                  {distanceToHospital} מ׳ מבי&quot;ח
                </DistanceChip>
              )}
            </div>

            {/* External Map Links */}
            {(() => {
              const center = plotCenter(plot.coordinates)
              if (!center) return null
              return (
                <StaggerIn $delay={3} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  <ExternalLinkChip $borderColor="rgba(234,179,8,0.15)" href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${center.lat},${center.lng}`} target="_blank" rel="noopener noreferrer">
                    <IconBox $bg="rgba(234,179,8,0.15)" $size={24}><Eye style={{ width: 14, height: 14, color: '#FACC15' }} /></IconBox>
                    Street View
                    <ExternalLink style={{ width: 10, height: 10, color: themeTokens.colors.slate[500] }} />
                  </ExternalLinkChip>
                  <ExternalLinkChip $borderColor="rgba(59,130,246,0.15)" href={`https://www.google.com/maps/search/?api=1&query=${center.lat},${center.lng}`} target="_blank" rel="noopener noreferrer">
                    <IconBox $bg="rgba(59,130,246,0.15)" $size={24}><MapPin style={{ width: 14, height: 14, color: '#60A5FA' }} /></IconBox>
                    Google Maps
                    <ExternalLink style={{ width: 10, height: 10, color: themeTokens.colors.slate[500] }} />
                  </ExternalLinkChip>
                  <ExternalLinkChip $borderColor="rgba(6,182,212,0.15)" href={`https://www.waze.com/ul?ll=${center.lat},${center.lng}&navigate=yes`} target="_blank" rel="noopener noreferrer">
                    <IconBox $bg="rgba(6,182,212,0.15)" $size={24}><Navigation style={{ width: 14, height: 14, color: '#22D3EE' }} /></IconBox>
                    Waze
                    <ExternalLink style={{ width: 10, height: 10, color: themeTokens.colors.slate[500] }} />
                  </ExternalLinkChip>
                </div>
              )
            })()}

            {/* Government Registry Links */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }} className="animate-stagger-3">
              <ExternalLinkChip $borderColor="rgba(99,102,241,0.15)" href="https://www.gov.il/he/departments/topics/tabu-online" target="_blank" rel="noopener noreferrer">
                <IconBox $bg="rgba(99,102,241,0.15)" $size={24}><FileText style={{ width: 14, height: 14, color: '#818CF8' }} /></IconBox>
                טאבו (גוש {blockNumber})
                <ExternalLink style={{ width: 10, height: 10, color: themeTokens.colors.slate[500] }} />
              </ExternalLinkChip>
              <ExternalLinkChip $borderColor="rgba(20,184,166,0.15)" href="https://ims.gov.il/he/LandRegistration" target="_blank" rel="noopener noreferrer">
                <IconBox $bg="rgba(20,184,166,0.15)" $size={24}><MapPin style={{ width: 14, height: 14, color: '#2DD4BF' }} /></IconBox>
                מנהל מקרקעין
                <ExternalLink style={{ width: 10, height: 10, color: themeTokens.colors.slate[500] }} />
              </ExternalLinkChip>
              <ExternalLinkChip $borderColor="rgba(245,158,11,0.15)" href={`https://www.govmap.gov.il/?lat=${(plotCenter(plot.coordinates)?.lat ?? 32.45).toFixed(5)}&lon=${(plotCenter(plot.coordinates)?.lng ?? 34.87).toFixed(5)}&z=15`} target="_blank" rel="noopener noreferrer">
                <IconBox $bg="rgba(245,158,11,0.15)" $size={24}><MapPin style={{ width: 14, height: 14, color: '#FBBF24' }} /></IconBox>
                GovMap
                <ExternalLink style={{ width: 10, height: 10, color: themeTokens.colors.slate[500] }} />
              </ExternalLinkChip>
            </div>

            {/* Price Change Alert */}
            {priceChange && (
              <AlertCard
                $bg={priceChange.direction === 'down' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}
                $border={priceChange.direction === 'down' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}
                className="animate-stagger-3"
                style={{ marginTop: 12 }}
              >
                <IconBox $bg={priceChange.direction === 'down' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'} $size={32}>
                  <span style={{ fontSize: 16 }}>{priceChange.direction === 'down' ? '📉' : '📈'}</span>
                </IconBox>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: priceChange.direction === 'down' ? '#4ADE80' : '#F87171' }}>
                    {priceChange.direction === 'down' ? 'המחיר ירד!' : 'המחיר עלה'} {priceChange.pctChange}%
                  </div>
                  <div style={{ fontSize: 10, color: themeTokens.colors.slate[500] }}>מחיר קודם: {formatCurrency(priceChange.previousPrice)}</div>
                </div>
              </AlertCard>
            )}

            {/* Percentile badges */}
            {allPlots.length >= 2 && (
              <div style={{ marginTop: 16 }} className="animate-stagger-3">
                <PlotPercentileBadges plot={plot} allPlots={allPlots} />
              </div>
            )}

            {/* Data Completeness */}
            <div style={{ marginTop: 12 }} className="animate-stagger-3">
              <DataCompletenessBar plot={plot} variant="compact" />
            </div>

            {/* View Full Details CTA */}
            <FullDetailCta href={`/plot/${plot.id}`} target="_blank" rel="noopener noreferrer">
              <Maximize2 style={{ width: 14, height: 14 }} />
              <span>צפה בדף המלא — מחשבון מימון, בדיקת נאותות ועוד</span>
            </FullDetailCta>

            <GoldDivider />

            {/* Committee Status Timeline */}
            {plot.committees && (
              <CollapsibleSection number={`0${++sectionNum}`} icon={Award} title="סטטוס ועדות" animClass="animate-stagger-4" sectionId="section-committees">
                <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 8 }}>
                  {committeeLevels.map((level, i) => {
                    const committee = plot.committees[level.key]
                    const status = committee?.status || 'not_started'
                    const config = committeeStatusConfig[status] || committeeStatusConfig.not_started
                    const StatusIcon = config.icon
                    return (
                      <CommitteeRow key={level.key}>
                        {i < committeeLevels.length - 1 && <CommitteeLine />}
                        <CommitteeCircle $bg={config.bg} $border={config.border}>
                          {StatusIcon ? (
                            <StatusIcon style={{ width: 16, height: 16, color: config.color }} />
                          ) : (
                            <span style={{ fontSize: 14, color: config.color }}>—</span>
                          )}
                        </CommitteeCircle>
                        <div style={{ paddingBottom: 16 }}>
                          <div style={{ fontWeight: 500, color: themeTokens.colors.slate[200], fontSize: 14 }}>{level.label}</div>
                          <div style={{ fontSize: 12, color: config.color }}>{config.label}</div>
                          {committee?.date && (
                            <div style={{ fontSize: 12, color: themeTokens.colors.slate[500], marginTop: 2 }}>{committee.date}</div>
                          )}
                        </div>
                      </CommitteeRow>
                    )
                  })}
                </div>
              </CollapsibleSection>
            )}

            {/* Standard 22 */}
            {standard22 && (
              <CollapsibleSection number={`0${++sectionNum}`} icon={Award} title="הערכת שמאי - תקן 22" animClass="animate-stagger-5">
                <GoldPanel>
                  <Grid2>
                    <div>
                      <div style={{ fontSize: 12, color: themeTokens.colors.slate[400] }}>שמאי</div>
                      <div style={{ fontSize: 14, color: themeTokens.colors.slate[200], fontWeight: 500 }}>{standard22.appraiser}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: themeTokens.colors.slate[400] }}>תאריך</div>
                      <div style={{ fontSize: 14, color: themeTokens.colors.slate[200], fontWeight: 500 }}>{standard22.date}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: themeTokens.colors.slate[400] }}>שווי מוערך</div>
                      <div style={{ fontSize: 14, color: themeTokens.colors.slate[200], fontWeight: 500 }}>{formatCurrency(standard22.value)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: themeTokens.colors.slate[400] }}>מתודולוגיה</div>
                      <div style={{ fontSize: 14, color: themeTokens.colors.slate[200], fontWeight: 500 }}>{standard22.methodology}</div>
                    </div>
                  </Grid2>
                </GoldPanel>
              </CollapsibleSection>
            )}

            {/* Financial Valuation Engine */}
            <CollapsibleSection number={`0${++sectionNum}`} icon={TrendingUp} title="נתונים פיננסיים" animClass="animate-stagger-6" sectionId="section-financial">
              <Grid3>
                <MetricCard $accentFrom="#3B82F6" $accentTo="#2563EB" $borderColor="#3B82F6">
                  <MetricAccentBar $from="#60A5FA" $to="#2563EB" />
                  <MetricLabel>מחיר מבוקש</MetricLabel>
                  <MetricValue $color="#60A5FA"><AnimatedNumber value={totalPrice} formatter={formatCurrency} /></MetricValue>
                  <MetricSub>{pricePerDunam} / דונם</MetricSub>
                </MetricCard>
                <MetricCard $accentFrom="#10B981" $accentTo="#059669" $borderColor="#10B981">
                  <MetricAccentBar $from="#34D399" $to="#059669" />
                  <MetricLabel>שווי צפוי</MetricLabel>
                  <MetricValue $color="#6EE7A0"><AnimatedNumber value={projectedValue} formatter={formatCurrency} /></MetricValue>
                  <MetricSub>בסיום תהליך</MetricSub>
                </MetricCard>
                <MetricCard $accentFrom="#C8942A" $accentTo="#E5B94E" $borderColor="#C8942A">
                  <MetricAccentBar $from={themeTokens.colors.gold} $to={themeTokens.colors.goldBright} />
                  <MetricLabel>תשואה צפויה</MetricLabel>
                  <MetricValue $color="#E5B94E"><AnimatedNumber value={roi} />%</MetricValue>
                  <MetricSub>ROI</MetricSub>
                </MetricCard>
              </Grid3>

              {/* CAGR */}
              {(() => {
                const cagrData = calcCAGR(roi, readinessEstimate)
                if (!cagrData) return null
                const { cagr, years } = cagrData
                const cagrColor = cagr >= 20 ? '#22C55E' : cagr >= 12 ? '#84CC16' : cagr >= 6 ? '#EAB308' : '#EF4444'
                return (
                  <SectionWrap style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <IconBox $bg={`${cagrColor}15`} $size={28}>
                        <TrendingUp style={{ width: 14, height: 14, color: cagrColor }} />
                      </IconBox>
                      <div>
                        <div style={{ fontSize: 12, color: themeTokens.colors.slate[300] }}>תשואה שנתית (CAGR)</div>
                        <div style={{ fontSize: 10, color: themeTokens.colors.slate[500] }}>על בסיס {years} שנות החזקה</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: cagrColor }}>{cagr}%</div>
                  </SectionWrap>
                )
              })()}

              {/* Buildable Value Analysis */}
              {(() => {
                const buildable = calcBuildableValue(plot)
                if (!buildable) return null
                return (
                  <div style={{ background: 'linear-gradient(to right, rgba(139,92,246,0.08), rgba(99,102,241,0.08))', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <IconBox $bg="rgba(139,92,246,0.15)" $size={24}><Building2 style={{ width: 14, height: 14, color: '#A78BFA' }} /></IconBox>
                      <span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.slate[200] }}>ניתוח שווי בנייה</span>
                      <span style={{ fontSize: 9, color: 'rgba(167,139,250,0.6)', background: 'rgba(139,92,246,0.1)', padding: '2px 6px', borderRadius: 4, marginRight: 'auto' }}>PRO</span>
                    </div>
                    <Grid2Gap2>
                      <BuildableCell>
                        <div style={{ fontSize: 9, color: themeTokens.colors.slate[500], marginBottom: 2 }}>מחיר/מ״ר בנוי</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#A78BFA' }}>{formatCurrency(buildable.pricePerBuildableSqm)}</div>
                      </BuildableCell>
                      <BuildableCell>
                        <div style={{ fontSize: 9, color: themeTokens.colors.slate[500], marginBottom: 2 }}>מחיר ליח׳ דיור</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#818CF8' }}>{formatCurrency(buildable.pricePerUnit)}</div>
                      </BuildableCell>
                      <BuildableCell>
                        <div style={{ fontSize: 9, color: themeTokens.colors.slate[500], marginBottom: 2 }}>יח׳ דיור משוערות</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: themeTokens.colors.slate[300] }}>{buildable.estimatedUnits}</div>
                      </BuildableCell>
                      <BuildableCell>
                        <div style={{ fontSize: 9, color: themeTokens.colors.slate[500], marginBottom: 2 }}>שטח בנוי כולל</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: themeTokens.colors.slate[300] }}>{buildable.totalBuildableArea.toLocaleString()} מ״ר</div>
                      </BuildableCell>
                    </Grid2Gap2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 9, color: themeTokens.colors.slate[500] }}>
                      <span>יחס ניצול: x{buildable.efficiencyRatio}</span>
                      <span style={{ color: themeTokens.colors.slate[700] }}>·</span>
                      <span>על בסיס {buildable.density} יח״ד/דונם, 100 מ״ר ליח׳</span>
                    </div>
                  </div>
                )
              })()}

              {/* Tax Authority Value Comparison */}
              {taxAuthorityValue > 0 && (
                <SectionWrap style={{ marginTop: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <IconBox $bg="rgba(139,92,246,0.15)" $size={28}><Shield style={{ width: 14, height: 14, color: '#A78BFA' }} /></IconBox>
                    <span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.slate[200] }}>שווי רשות המיסים</span>
                    {(() => {
                      const diffPct = Math.round(((totalPrice - taxAuthorityValue) / taxAuthorityValue) * 100)
                      const isBelow = diffPct < 0
                      return (
                        <span style={{
                          fontSize: 10, fontWeight: 700, marginRight: 'auto', padding: '2px 8px', borderRadius: 9999,
                          background: isBelow ? 'rgba(16,185,129,0.1)' : diffPct <= 10 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                          color: isBelow ? '#34D399' : diffPct <= 10 ? '#FBBF24' : '#F87171',
                          border: `1px solid ${isBelow ? 'rgba(16,185,129,0.2)' : diffPct <= 10 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`,
                        }}>
                          {isBelow ? `${Math.abs(diffPct)}% מתחת` : `+${diffPct}% מעל`}
                        </span>
                      )
                    })()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
                        <span style={{ color: themeTokens.colors.slate[400] }}>מחיר מבוקש</span>
                        <span style={{ color: themeTokens.colors.slate[300], fontWeight: 500 }}>{formatCurrency(totalPrice)}</span>
                      </div>
                      <CompBarTrack>
                        <CompBarFill
                          $dir="right"
                          $width={`${Math.min(100, Math.max(10, (totalPrice / Math.max(totalPrice, taxAuthorityValue) * 100)))}%`}
                          $bg={totalPrice <= taxAuthorityValue ? 'linear-gradient(90deg, #22C55E, #4ADE80)' : 'linear-gradient(90deg, #F59E0B, #FB923C)'}
                        />
                      </CompBarTrack>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
                        <span style={{ color: themeTokens.colors.slate[400] }}>🏛️ הערכת רשות המיסים</span>
                        <span style={{ color: '#A78BFA', fontWeight: 500 }}>{formatCurrency(taxAuthorityValue)}</span>
                      </div>
                      <CompBarTrack>
                        <CompBarFill
                          $dir="right"
                          $width={`${Math.min(100, Math.max(10, (taxAuthorityValue / Math.max(totalPrice, taxAuthorityValue) * 100)))}%`}
                          $bg="rgba(139,92,246,0.4)"
                        />
                      </CompBarTrack>
                    </div>
                  </div>
                  {totalPrice < taxAuthorityValue && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: 8, borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                      <CheckCircle2 style={{ width: 14, height: 14, color: '#34D399', flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: '#34D399', fontWeight: 500 }}>מחיר אטרקטיבי! {formatCurrency(taxAuthorityValue - totalPrice)} מתחת לשומת רשות המיסים</span>
                    </div>
                  )}
                  {totalPrice > taxAuthorityValue * 1.1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: 8, borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                      <AlertTriangle style={{ width: 14, height: 14, color: '#FBBF24', flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: '#FBBF24' }}>המחיר מעל הערכת רשות המיסים — מומלץ לבדוק עם שמאי</span>
                    </div>
                  )}
                  <div style={{ fontSize: 9, color: themeTokens.colors.slate[600], marginTop: 8 }}>היטל השבחה משוער (50% מהשבחה): {bettermentLevy}</div>
                </SectionWrap>
              )}

              {/* Area Price Benchmark */}
              {(() => {
                const sameCityPlots = allPlots.filter((p: any) => p.city === plot.city && p.id !== plot.id)
                const benchmarkPlots = sameCityPlots.length >= 2 ? sameCityPlots : allPlots.filter((p: any) => p.id !== plot.id)
                const areaAvgPerSqm = benchmarkPlots.length > 0
                  ? Math.round(benchmarkPlots.reduce((sum: number, p: any) => {
                      const pp = p.total_price ?? p.totalPrice ?? 0
                      const ps = p.size_sqm ?? p.sizeSqM ?? 1
                      return sum + pp / ps
                    }, 0) / benchmarkPlots.length)
                  : 1500
                const plotPricePerSqm = Math.round(totalPrice / sizeSqM)
                const diffPct = Math.round(((plotPricePerSqm - areaAvgPerSqm) / areaAvgPerSqm) * 100)
                const isBelow = diffPct < 0
                const barPct = Math.min(100, Math.max(5, (plotPricePerSqm / (areaAvgPerSqm * 2)) * 100))
                const avgBarPct = Math.min(100, (areaAvgPerSqm / (areaAvgPerSqm * 2)) * 100)
                return (
                  <SectionWrap style={{ marginTop: 12, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <BarChart3 style={{ width: 14, height: 14, color: themeTokens.colors.gold }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.slate[200] }}>השוואה למחיר אזורי</span>
                      <span style={{ fontSize: 12, fontWeight: 700, marginRight: 'auto', color: isBelow ? '#4ADE80' : '#FB923C' }}>
                        {isBelow ? `${Math.abs(diffPct)}% מתחת` : `${diffPct}% מעל`} הממוצע
                      </span>
                    </div>
                    <div style={{ position: 'relative', height: 12, borderRadius: 9999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                      <div
                        style={{
                          position: 'absolute', top: 0, right: 0, height: '100%', borderRadius: 9999,
                          width: `${barPct}%`,
                          background: isBelow ? 'linear-gradient(90deg, #22C55E, #4ADE80)' : 'linear-gradient(90deg, #F59E0B, #FB923C)',
                          transition: 'all 0.5s',
                        }}
                      />
                      <div style={{ position: 'absolute', top: 0, height: '100%', width: 2, background: 'rgba(255,255,255,0.4)', right: `${avgBarPct}%` }} title={`ממוצע אזורי: ₪${areaAvgPerSqm.toLocaleString()}/מ״ר`} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 9, color: themeTokens.colors.slate[500] }}>₪{plotPricePerSqm.toLocaleString()}/מ״ר (חלקה זו)</span>
                      <span style={{ fontSize: 9, color: themeTokens.colors.slate[500] }}>₪{areaAvgPerSqm.toLocaleString()}/מ״ר (ממוצע)</span>
                    </div>
                  </SectionWrap>
                )
              })()}

              <PriceTrendChart totalPrice={totalPrice} sizeSqM={sizeSqM} city={plot.city} plotId={plot.id} />

              <Suspense fallback={<SectionSpinner />}>
                <InvestmentScoreBreakdown
                  plot={plot}
                  areaAvgPriceSqm={(() => {
                    if (!allPlots || allPlots.length < 2) return undefined
                    const sameCityPlots = allPlots.filter((p: any) => p.city === plot.city && p.id !== plot.id)
                    const benchPlots = sameCityPlots.length >= 2 ? sameCityPlots : allPlots.filter((p: any) => p.id !== plot.id)
                    if (benchPlots.length === 0) return undefined
                    let total = 0, count = 0
                    for (const p of benchPlots) {
                      const pp = p.total_price ?? p.totalPrice ?? 0
                      const ps = p.size_sqm ?? p.sizeSqM ?? 0
                      if (pp > 0 && ps > 0) { total += pp / ps; count++ }
                    }
                    return count > 0 ? Math.round(total / count) : undefined
                  })()}
                />
              </Suspense>

              <Suspense fallback={<SectionSpinner />}>
                <InvestmentProjection totalPrice={totalPrice} projectedValue={projectedValue} readinessEstimate={readinessEstimate} zoningStage={zoningStage} />
              </Suspense>

              {/* Alternative Investment Comparison */}
              {(() => {
                const purchaseTaxAlt = Math.round(totalPrice * 0.06)
                const attorneyFeesAlt = Math.round(totalPrice * 0.0175)
                const totalInvestmentAlt = totalPrice + purchaseTaxAlt + attorneyFeesAlt
                const grossProfitAlt = projectedValue - totalPrice
                const bettermentLevyAlt = Math.round(grossProfitAlt * 0.5)
                const costsAlt = purchaseTaxAlt + attorneyFeesAlt
                const taxableAlt = Math.max(0, grossProfitAlt - bettermentLevyAlt - costsAlt)
                const capGainsAlt = Math.round(taxableAlt * 0.25)
                const netProfitAlt = grossProfitAlt - costsAlt - bettermentLevyAlt - capGainsAlt
                const cagrDataAlt = calcCAGR(roi, readinessEstimate)
                const yearsAlt = cagrDataAlt?.years || 5
                const comparison = calcAlternativeReturns(totalInvestmentAlt, netProfitAlt, yearsAlt)
                if (!comparison) return null

                const options = [comparison.land, comparison.stock, comparison.bank]
                const maxProfit = Math.max(...options.map((o: any) => o.profit))

                return (
                  <div style={{ background: 'linear-gradient(to right, rgba(10,22,40,0.5), rgba(10,22,40,0.4))', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <IconBox $bg="rgba(200,148,42,0.15)" $size={24}><BarChart3 style={{ width: 14, height: 14, color: themeTokens.colors.gold }} /></IconBox>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.slate[200] }}>השוואת אלטרנטיבות השקעה</span>
                        <span style={{ fontSize: 9, color: themeTokens.colors.slate[500], display: 'block' }}>מה אם היית משקיע {formatCurrency(totalInvestmentAlt)} אחרת? ({yearsAlt} שנים)</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {options.map((opt: any, i: number) => {
                        const barWidth = maxProfit > 0 ? Math.max(5, (opt.profit / maxProfit) * 100) : 5
                        const isWinner = opt.profit === maxProfit && options.filter((o: any) => o.profit === maxProfit).length === 1
                        return (
                          <AltBar key={i}>
                            <span style={{ fontSize: 10, width: 70, flexShrink: 0, textAlign: 'right', color: opt.color }}>{opt.emoji} {opt.label}</span>
                            <div style={{ flex: 1, position: 'relative', height: 16, borderRadius: 8, background: 'rgba(255,255,255,0.03)', overflow: 'hidden' }}>
                              <div style={{ position: 'absolute', top: 0, right: 0, height: '100%', borderRadius: 8, width: `${barWidth}%`, background: `linear-gradient(90deg, ${opt.color}40, ${opt.color}20)`, borderRight: `2px solid ${opt.color}`, transition: 'all 0.7s' }} />
                              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, fontSize: 9, fontWeight: 700, color: opt.color }}>
                                {opt.profit >= 0 ? '+' : ''}{formatCurrency(opt.profit)}
                              </span>
                            </div>
                            {isWinner && <span style={{ fontSize: 10, flexShrink: 0 }} title="תשואה הגבוהה ביותר">🏆</span>}
                          </AltBar>
                        )
                      })}
                    </div>
                    {comparison.realReturns && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 9, color: themeTokens.colors.slate[500] }}>
                        <span>תשואה ריאלית (אחרי אינפלציה {(comparison.inflationRate * 100).toFixed(0)}%):</span>
                        <span style={{ color: comparison.land.color }}>{comparison.realReturns.land}%/שנה</span>
                        <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.1)' }} />
                        <span style={{ color: comparison.stock.color }}>{comparison.realReturns.stock}%/שנה</span>
                        <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.1)' }} />
                        <span style={{ color: comparison.bank.color }}>{comparison.realReturns.bank}%/שנה</span>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Associated Costs */}
              <SectionWrap style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <DollarSign style={{ width: 14, height: 14, color: themeTokens.colors.gold }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.slate[200] }}>עלויות נלוות משוערות</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <DataRow><DataRowLabel>מס רכישה (6%)</DataRowLabel><DataRowValue>{formatCurrency(Math.round(totalPrice * 0.06))}</DataRowValue></DataRow>
                  <DataRow><DataRowLabel>שכ&quot;ט עו&quot;ד (~1.5%+מע&quot;מ)</DataRowLabel><DataRowValue>{formatCurrency(Math.round(totalPrice * 0.0175))}</DataRowValue></DataRow>
                  <DataRow><DataRowLabel>היטל השבחה משוער</DataRowLabel><DataRowValue>{bettermentLevy}</DataRowValue></DataRow>
                  <ThinDivider />
                  <DataRow><span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.slate[300] }}>סה&quot;כ עלות כוללת (ללא היטל)</span><span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.gold }}>{formatCurrency(Math.round(totalPrice * 1.0775))}</span></DataRow>
                </div>
              </SectionWrap>

              {/* Quick Investment Summary */}
              {(() => {
                const grossProfit = projectedValue - totalPrice
                const purchaseTax = Math.round(totalPrice * 0.06)
                const attorneyFees = Math.round(totalPrice * 0.0175)
                const bettermentLevyAmount = Math.round(grossProfit * 0.5)
                const totalCosts = purchaseTax + attorneyFees
                const profitAfterBetterment = grossProfit - bettermentLevyAmount
                const taxableProfit = Math.max(0, profitAfterBetterment - totalCosts)
                const capitalGainsTax = Math.round(taxableProfit * 0.25)
                const netProfit = grossProfit - totalCosts - bettermentLevyAmount - capitalGainsTax
                const netRoi = totalPrice > 0 ? Math.round((netProfit / totalPrice) * 100) : 0
                const years = readinessEstimate?.includes('1-3') ? 2 : readinessEstimate?.includes('3-5') ? 4 : readinessEstimate?.includes('5+') ? 7 : 4
                const netCagr = years > 0 && netRoi > 0 ? Math.round((Math.pow(1 + netRoi / 100, 1 / years) - 1) * 100 * 10) / 10 : 0

                return (
                  <GoldPanelSm>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <TrendingUp style={{ width: 14, height: 14, color: themeTokens.colors.gold }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.slate[200] }}>סיכום השקעה מלא</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <DataRow><DataRowLabel>רווח צפוי (ברוטו)</DataRowLabel><DataRowValue $color="#34D399">{formatCurrency(grossProfit)}</DataRowValue></DataRow>
                      <DataRow><DataRowLabel>עלויות רכישה</DataRowLabel><DataRowValue $color="rgba(248,113,113,0.7)">-{formatCurrency(totalCosts)}</DataRowValue></DataRow>
                      <DataRow><DataRowLabel>היטל השבחה (50%)</DataRowLabel><DataRowValue $color="rgba(248,113,113,0.7)">-{formatCurrency(bettermentLevyAmount)}</DataRowValue></DataRow>
                      <DataRow><DataRowLabel>מס שבח (25%)</DataRowLabel><DataRowValue $color="rgba(248,113,113,0.7)">-{formatCurrency(capitalGainsTax)}</DataRowValue></DataRow>
                      <ThinDivider />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                        <span style={{ color: themeTokens.colors.slate[200] }}>רווח נקי</span>
                        <span style={{ color: netProfit >= 0 ? '#34D399' : '#F87171' }}>{formatCurrency(netProfit)}</span>
                      </div>
                      <DataRow><DataRowLabel>תשואה נטו</DataRowLabel><span style={{ fontSize: 12, fontWeight: 500, color: netRoi >= 0 ? themeTokens.colors.gold : '#F87171' }}>{netRoi}%</span></DataRow>
                      {netCagr > 0 && (
                        <DataRow><DataRowLabel>CAGR נטו ({years} שנים)</DataRowLabel><span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.gold }}>{netCagr}%/שנה</span></DataRow>
                      )}
                      {readinessEstimate && (
                        <DataRow><DataRowLabel>זמן החזר משוער</DataRowLabel><span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.gold }}>{readinessEstimate}</span></DataRow>
                      )}
                    </div>

                    {/* Sensitivity Analysis */}
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(200,148,42,0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <AlertTriangle style={{ width: 12, height: 12, color: themeTokens.colors.slate[400] }} />
                        <span style={{ fontSize: 10, fontWeight: 500, color: themeTokens.colors.slate[400] }}>ניתוח רגישות</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {[
                          { label: 'אופטימי (+10%)', factor: 1.1, color: '#34D399' },
                          { label: 'בסיס', factor: 1.0, color: themeTokens.colors.gold },
                          { label: 'שמרני (-10%)', factor: 0.9, color: '#FB923C' },
                          { label: 'פסימי (-20%)', factor: 0.8, color: '#F87171' },
                        ].map(scenario => {
                          const adjProjected = Math.round(projectedValue * scenario.factor)
                          const adjGross = adjProjected - totalPrice
                          const adjBetterment = Math.round(Math.max(0, adjGross) * 0.5)
                          const adjTaxable = Math.max(0, adjGross - adjBetterment - totalCosts)
                          const adjCapGains = Math.round(adjTaxable * 0.25)
                          const adjNet = adjGross - totalCosts - adjBetterment - adjCapGains
                          const adjNetRoi = totalPrice > 0 ? Math.round((adjNet / totalPrice) * 100) : 0
                          return (
                            <ScenarioRow key={scenario.label}>
                              <span style={{ color: themeTokens.colors.slate[500], width: 96 }}>{scenario.label}</span>
                              <div style={{ flex: 1, height: 6, borderRadius: 9999, background: 'rgba(255,255,255,0.05)', margin: '0 8px', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%', borderRadius: 9999, transition: 'all 0.3s',
                                  width: `${Math.max(3, Math.min(100, (adjNetRoi / (netRoi * 1.3 || 100)) * 100))}%`,
                                  background: adjNet >= 0 ? 'linear-gradient(90deg, rgba(34,197,94,0.3), rgba(34,197,94,0.6))' : 'linear-gradient(90deg, rgba(239,68,68,0.3), rgba(239,68,68,0.6))',
                                }} />
                              </div>
                              <span style={{ width: 80, textAlign: 'left', fontWeight: 500, color: scenario.color }}>
                                {formatCurrency(adjNet)} ({adjNetRoi >= 0 ? '+' : ''}{adjNetRoi}%)
                              </span>
                            </ScenarioRow>
                          )
                        })}
                      </div>
                      <p style={{ fontSize: 8, color: themeTokens.colors.slate[600], marginTop: 6 }}>* הערכות בלבד. מס שבח 25% על רווח לאחר ניכוי עלויות והיטל השבחה.</p>
                    </div>
                  </GoldPanelSm>
                )
              })()}

              <ProfitWaterfall totalPrice={totalPrice} projectedValue={projectedValue} sizeSqM={sizeSqM} />
              <MiniMortgageCalc totalPrice={totalPrice} />
              <Suspense fallback={<SectionSpinner />}>
                <InvestmentBenchmark totalPrice={totalPrice} projectedValue={projectedValue} readinessEstimate={readinessEstimate} />
              </Suspense>
            </CollapsibleSection>

            {/* Area Comparison */}
            <CollapsibleSection number={`0${++sectionNum}`} icon={BarChart} title="ביחס לאזור" animClass="animate-stagger-7" sectionId="section-area-comparison" defaultOpen={false}>
              <Suspense fallback={<SectionSpinner />}><AreaComparisonWidget plot={plot} allPlots={allPlots} /></Suspense>
            </CollapsibleSection>

            {/* ROI Stages */}
            <CollapsibleSection number={`0${++sectionNum}`} icon={BarChart3} title="צפי השבחה לפי שלבי תכנון" animClass="animate-stagger-7" sectionId="section-roi-stages">
              <SectionWrap style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {roiStages.map((stage: any, i: number) => {
                    const isCurrentStage = i === currentStageIndex
                    const isPast = i < currentStageIndex
                    const maxPrice = roiStages[roiStages.length - 1].pricePerSqM
                    const barWidth = (stage.pricePerSqM / maxPrice) * 100
                    return (
                      <RoiStageRow key={i} $isCurrent={isCurrentStage}>
                        <div style={{ width: 90, flexShrink: 0 }}>
                          <span style={{ fontSize: 10, lineHeight: 1.2, color: isCurrentStage ? themeTokens.colors.gold : isPast ? 'rgba(74,222,128,0.7)' : themeTokens.colors.slate[500], fontWeight: isCurrentStage ? 700 : 400 }}>
                            {stage.label}
                          </span>
                        </div>
                        <div style={{ flex: 1, height: 10, borderRadius: 9999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 9999, transition: 'all 0.5s',
                            width: `${barWidth}%`,
                            background: isCurrentStage ? 'linear-gradient(90deg, #C8942A, #E5B94E)' : isPast ? 'rgba(34,197,94,0.4)' : 'rgba(148,163,184,0.15)',
                          }} />
                        </div>
                        <span style={{ fontSize: 10, width: 56, textAlign: 'left', flexShrink: 0, color: isCurrentStage ? themeTokens.colors.gold : isPast ? 'rgba(74,222,128,0.7)' : themeTokens.colors.slate[500], fontWeight: isCurrentStage ? 700 : 400 }}>
                          {stage.pricePerSqM.toLocaleString()}
                        </span>
                      </RoiStageRow>
                    )
                  })}
                  <div style={{ fontSize: 9, color: themeTokens.colors.slate[500], textAlign: 'left', marginTop: 4 }}>* ש&quot;ח למ&quot;ר (הערכה ממוצעת)</div>
                </div>
              </SectionWrap>
            </CollapsibleSection>

            {/* Real Transactions */}
            <CollapsibleSection number={`0${++sectionNum}`} icon={BarChart3} title="עסקאות באזור" animClass="animate-stagger-7" sectionId="section-transactions" defaultOpen={false}>
              <Suspense fallback={<SectionSpinner />}><RealTransactions plotId={plot.id} city={plot.city} /></Suspense>
            </CollapsibleSection>

            {/* Planning Info */}
            <CollapsibleSection number={`0${++sectionNum}`} icon={FileText} title="תכנון ותב&quot;עות" animClass="animate-stagger-7" sectionId="section-planning" defaultOpen={false}>
              <Suspense fallback={<SectionSpinner />}><PlanningInfo plotId={plot.id} city={plot.city} /></Suspense>
            </CollapsibleSection>

            <GoldDivider />

            {/* Zoning Pipeline */}
            <CollapsibleSection number={`0${++sectionNum}`} icon={MapPin} title="צינור תכנוני" animClass="animate-stagger-8" sectionId="section-zoning">
              {readinessEstimate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, background: 'linear-gradient(to right, rgba(200,148,42,0.05), rgba(200,148,42,0.1))', border: '1px solid rgba(200,148,42,0.2)', borderRadius: 12, padding: '10px 16px' }}>
                  <Hourglass style={{ width: 16, height: 16, color: themeTokens.colors.gold, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: themeTokens.colors.slate[300] }}>מוכנות לבנייה:</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: themeTokens.colors.gold }}>{readinessEstimate}</span>
                </div>
              )}

              {zoningStage && (
                <SectionWrap style={{ padding: 16, marginBottom: 16 }}>
                  <ZoningProgressBar currentStage={zoningStage} variant="detailed" />
                </SectionWrap>
              )}

              {/* Investment Timeline */}
              {(() => {
                const timeline = calcInvestmentTimeline(plot)
                if (!timeline || timeline.stages.length === 0) return null
                return (
                  <SectionWrap style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock style={{ width: 14, height: 14, color: themeTokens.colors.gold }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.slate[200] }}>ציר זמן השקעה</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {timeline.remainingMonths > 0 && (
                          <span style={{ fontSize: 9, color: themeTokens.colors.slate[500] }}>~{timeline.remainingMonths} חודשים נותרו</span>
                        )}
                        <span style={{ fontSize: 10, fontWeight: 700, color: themeTokens.colors.gold }}>{timeline.progressPct}%</span>
                      </div>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <div style={{ height: 8, borderRadius: 9999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 9999, transition: 'all 0.7s',
                          width: `${Math.max(3, timeline.progressPct)}%`,
                          background: timeline.progressPct >= 75 ? 'linear-gradient(90deg, #22C55E, #4ADE80)' : timeline.progressPct >= 40 ? 'linear-gradient(90deg, #C8942A, #E5B94E)' : 'linear-gradient(90deg, #3B82F6, #60A5FA)',
                        }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                        {timeline.stages.map((stage: any, i: number) => (
                          <div
                            key={stage.key}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: `${100 / timeline.stages.length}%` }}
                            title={`${stage.label}${stage.status === 'completed' ? ' ✓' : stage.status === 'current' ? ' (נוכחי)' : ''}`}
                          >
                            <StageDot $status={stage.status} />
                            {(i === 0 || stage.status === 'current' || i === timeline.stages.length - 1) && (
                              <span style={{ fontSize: 7, marginTop: 4, textAlign: 'center', lineHeight: 1.2, color: stage.status === 'current' ? themeTokens.colors.gold : themeTokens.colors.slate[600], fontWeight: stage.status === 'current' ? 700 : 400 }}>
                                {stage.icon}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {timeline.estimatedYear && timeline.remainingMonths > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: 9, color: themeTokens.colors.slate[500] }}>סיום משוער</span>
                        <span style={{ fontSize: 10, fontWeight: 500, color: themeTokens.colors.gold }}>{timeline.estimatedYear}</span>
                      </div>
                    )}
                  </SectionWrap>
                )
              })()}

              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 8 }}>
                {zoningPipelineStages.map((stage: any, i: number) => {
                  const isCompleted = i < currentStageIndex
                  const isCurrent = i === currentStageIndex
                  const isFuture = i > currentStageIndex
                  return (
                    <ZoningStageRow key={stage.key} $isCurrent={isCurrent} $opacity={isFuture ? 0.5 : 1}>
                      <span style={{ fontSize: 18, width: 28, textAlign: 'center', flexShrink: 0 }}>{stage.icon}</span>
                      <span style={{ fontSize: 14, color: isCompleted ? '#4ADE80' : isCurrent ? themeTokens.colors.gold : themeTokens.colors.slate[500], fontWeight: isCurrent ? 700 : 400 }}>
                        {stage.label}
                      </span>
                      {isCompleted && <CheckCircle2 style={{ width: 14, height: 14, color: '#4ADE80', marginRight: 'auto' }} />}
                      {isCurrent && (
                        <span style={{ marginRight: 'auto', fontSize: 10, color: themeTokens.colors.gold, background: 'rgba(200,148,42,0.1)', padding: '2px 8px', borderRadius: 9999 }}>נוכחי</span>
                      )}
                    </ZoningStageRow>
                  )
                })}
              </div>
            </CollapsibleSection>

            {/* Images */}
            {plot.plot_images && plot.plot_images.length > 0 && (
              <CollapsibleSection number={`0${++sectionNum}`} icon={ImageIcon} title={`תמונות (${plot.plot_images.length})`} sectionId="section-images">
                <ImageGrid>
                  {plot.plot_images.map((img: any, i: number) => (
                    <ImageThumb
                      key={img.id || i}
                      onClick={() => { setLightboxIndex(i); setLightboxOpen(true) }}
                      onMouseEnter={() => {
                        const link = document.createElement('link')
                        link.rel = 'preload'
                        link.as = 'image'
                        link.href = img.url
                        document.head.appendChild(link)
                      }}
                    >
                      <img src={img.url} alt={img.alt || `תמונה ${i + 1}`} loading="lazy" decoding="async" />
                      <ImageOverlay className="overlay">
                        <ImageZoomIcon className="zoom-icon" />
                      </ImageOverlay>
                      {i === 0 && plot.plot_images.length > 1 && (
                        <ImageFirstLabel>ראשית</ImageFirstLabel>
                      )}
                    </ImageThumb>
                  ))}
                </ImageGrid>
                {plot.plot_images.length > 6 && (
                  <ViewAllImagesBtn onClick={() => { setLightboxIndex(0); setLightboxOpen(true) }}>
                    צפה בכל {plot.plot_images.length} התמונות →
                  </ViewAllImagesBtn>
                )}
              </CollapsibleSection>
            )}

            {/* Documents */}
            {(() => {
              const docs = plot.plot_documents?.length ? plot.plot_documents : plot.documents?.length ? plot.documents : null
              if (!docs) return null
              return (
                <CollapsibleSection number={`0${++sectionNum}`} icon={FileText} title="מסמכים ותוכניות">
                  {isEnriching && !plot.plot_documents && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <SkeletonPulse $w="12px" $h="12px" $rounded="9999px" />
                      <span style={{ fontSize: 12, color: themeTokens.colors.slate[500] }}>טוען מסמכים...</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                    {docs.map((doc: any, i: number) => {
                      if (typeof doc === 'object' && doc.url) {
                        const DocIcon = getDocIcon(doc.mime_type)
                        return (
                          <DocRow key={doc.id || i} href={doc.url} target="_blank" rel="noopener noreferrer">
                            <DocIcon className="doc-icon" style={{ width: 16, height: 16, color: 'rgba(200,148,42,0.6)', flexShrink: 0, transition: 'color 0.2s' }} />
                            <span className="doc-name" style={{ fontSize: 14, color: themeTokens.colors.slate[300], flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 0.2s' }}>
                              {doc.name || 'מסמך'}
                            </span>
                            <Download className="doc-dl" style={{ width: 14, height: 14, color: themeTokens.colors.slate[500], flexShrink: 0, transition: 'color 0.2s' }} />
                          </DocRow>
                        )
                      }
                      return (
                        <DocLegacyRow key={i}>
                          <FileText style={{ width: 16, height: 16, color: 'rgba(200,148,42,0.6)', flexShrink: 0 }} />
                          <span style={{ fontSize: 14, color: themeTokens.colors.slate[300] }}>{doc}</span>
                        </DocLegacyRow>
                      )
                    })}
                  </div>
                </CollapsibleSection>
              )
            })()}

            {/* Neighborhood Quality + Location Score */}
            {(distanceToSea != null || distanceToPark != null || distanceToHospital != null) && (
              <CollapsibleSection number={`0${++sectionNum}`} icon={Shield} title="מיקום, סביבה וסיכון" sectionId="section-quality">
                <Suspense fallback={<SectionSpinner />}><LocationScore plot={plot} allPlots={allPlots} /></Suspense>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '16px 0' }} />
                <Suspense fallback={<SectionSpinner />}>
                  <NeighborhoodRadar distanceToSea={distanceToSea} distanceToPark={distanceToPark} distanceToHospital={distanceToHospital} roi={roi} investmentScore={calcInvestmentScore(plot)} />
                </Suspense>
              </CollapsibleSection>
            )}
            {distanceToSea == null && distanceToPark == null && distanceToHospital == null && allPlots.length >= 2 && (
              <CollapsibleSection number={`0${++sectionNum}`} icon={Shield} title="הערכת סיכון" sectionId="section-quality">
                <Suspense fallback={<SectionSpinner />}><LocationScore plot={plot} allPlots={allPlots} /></Suspense>
              </CollapsibleSection>
            )}

            <div id="section-nearby-pois">
              <NearbyPoisSection plotId={plot.id} />
            </div>

            {plot.coordinates && plot.coordinates.length >= 3 && (
              <CommuteTimesSection coordinates={plot.coordinates} />
            )}

            {plot.coordinates && plot.coordinates.length >= 3 && (() => {
              const center = plotCenter(plot.coordinates)
              if (!center) return null
              return (
                <CollapsibleSection number="🛣️" icon={Eye} title="Street View — מבט מהקרקע" sectionId="section-streetview" defaultOpen={false}>
                  <Suspense fallback={<SectionSpinner />}><StreetViewPanel lat={center.lat} lng={center.lng} /></Suspense>
                </CollapsibleSection>
              )
            })()}

            <SimilarPlots currentPlot={plot} allPlots={allPlots} onSelectPlot={onSelectPlot} />

            <div id="section-dd">
              <Suspense fallback={<SectionSpinner />}><DueDiligenceChecklist plotId={plot.id} /></Suspense>
            </div>

            <FooterRow>
              <a
                href={`mailto:info@landmapisrael.com?subject=${encodeURIComponent(`דיווח על אי-דיוק — גוש ${blockNumber} חלקה ${plot.number}`)}&body=${encodeURIComponent(`שלום,\n\nמצאתי אי-דיוק בנתוני חלקה:\nגוש ${blockNumber} | חלקה ${plot.number} | ${plot.city}\n\nהפרט השגוי:\n\nהנתון הנכון:\n\nתודה`)}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: themeTokens.colors.slate[500], textDecoration: 'none', transition: 'color 0.2s' }}
                title="דווח על מידע שגוי בחלקה זו"
              >
                <AlertTriangle style={{ width: 12, height: 12 }} />
                <span>דיווח על אי-דיוק</span>
              </a>
              <span style={{ fontSize: 9, color: themeTokens.colors.slate[600] }}>
                עודכן {(() => {
                  const d = plot.updated_at ?? plot.updatedAt ?? plot.created_at ?? plot.createdAt
                  if (!d) return '—'
                  return new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })
                })()}
              </span>
            </FooterRow>
          </ContentPad>
        </ScrollArea>

        {showScrollTop && (
          <ScrollTopBtn onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} title="חזור למעלה" aria-label="חזור למעלה">
            <ChevronUp style={{ width: 16, height: 16, color: themeTokens.colors.gold }} />
          </ScrollTopBtn>
        )}

        <InquiryWrap>
          <Suspense fallback={null}><QuickInquiryTemplates plot={plot} /></Suspense>
        </InquiryWrap>

        {/* Sticky CTA footer */}
        <CtaFooter>
          <div style={{ display: 'flex', gap: 8 }}>
            <CtaButton onClick={onOpenLeadModal} aria-label="צור קשר לפרטים מלאים על החלקה">
              צור קשר לפרטים מלאים
            </CtaButton>
            <ShareBtn $bg="#25D366" $shadow="rgba(37,211,102,0.2)" href={plotInquiryLink(plot)} target="_blank" rel="noopener noreferrer" title="WhatsApp">
              <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </ShareBtn>
            <ShareBtn $bg="#0088cc" $shadow="rgba(0,136,204,0.2)" href={`https://t.me/share/url?url=${encodeURIComponent(`${window.location.origin}/plot/${plot.id}`)}&text=${encodeURIComponent(`🏗️ גוש ${blockNumber} חלקה ${plot.number} | ${plot.city}\n💰 ${formatCurrency(totalPrice)} · תשואה +${roi}%\n📐 ${formatDunam(sizeSqM)} דונם`)}`} target="_blank" rel="noopener noreferrer" title="שתף בטלגרם">
              <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24" fill="white">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </ShareBtn>
            <ShareBtn $bg="rgba(100,116,139,0.8)" $shadow="rgba(100,116,139,0.2)" href={`mailto:?subject=${encodeURIComponent(`🏗️ הזדמנות השקעה — גוש ${blockNumber} חלקה ${plot.number} | ${plot.city}`)}&body=${encodeURIComponent(`שלום,\n\nמצאתי חלקה מעניינת להשקעה:\n\n📍 גוש ${blockNumber} | חלקה ${plot.number} | ${plot.city}\n💰 מחיר: ${formatCurrency(totalPrice)}\n📐 שטח: ${formatDunam(sizeSqM)} דונם\n📈 תשואה צפויה: +${roi}%\n\n🔗 צפה בפרטים מלאים:\n${window.location.origin}/plot/${plot.id}\n\n— LandMap Israel`)}`} title="שלח במייל לשותף/עו״ד">
              <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </ShareBtn>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <SmallActionBtn onClick={handlePrintReport} data-action="print-report" title="הדפס דו״ח השקעה (P)">
              <Printer style={{ width: 16, height: 16, color: themeTokens.colors.slate[400] }} />
            </SmallActionBtn>
            <SmallActionBtn
              $active={summaryCopied}
              onClick={() => {
                const summary = generatePlotSummary(plot)
                navigator.clipboard.writeText(summary).then(() => {
                  setSummaryCopied(true)
                  setTimeout(() => setSummaryCopied(false), 2500)
                }).catch(() => {})
              }}
              title="העתק סיכום השקעה (לשיתוף בוואטסאפ)"
            >
              {summaryCopied
                ? <Check style={{ width: 16, height: 16, color: '#34D399' }} />
                : <Clipboard style={{ width: 16, height: 16, color: themeTokens.colors.slate[400] }} />
              }
            </SmallActionBtn>
            <ShareMenu
              plotTitle={`גוש ${blockNumber} חלקה ${plot.number} - ${plot.city}`}
              plotPrice={formatCurrency(totalPrice)}
              plotUrl={`${window.location.origin}/?plot=${plot.id}`}
              style={{ flex: 1 }}
            />
            {onToggleCompare && (
              <CompareBtn $active={compareIds.includes(plot.id)} onClick={() => onToggleCompare(plot.id)}>
                <BarChart style={{ width: 16, height: 16 }} />
                {compareIds.includes(plot.id) ? 'בהשוואה ✓' : 'השווה'}
              </CompareBtn>
            )}
          </div>
        </CtaFooter>
      </Panel>

      {/* Image Lightbox */}
      {plot.plot_images && plot.plot_images.length > 0 && lightboxOpen && (
        <Suspense fallback={null}>
          <ImageLightbox images={plot.plot_images} initialIndex={lightboxIndex} isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} />
        </Suspense>
      )}
    </>
  )
}
