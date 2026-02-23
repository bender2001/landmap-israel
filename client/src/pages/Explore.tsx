import { useState, useMemo, useEffect, useCallback, useRef, lazy, Suspense, memo, forwardRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { Map as MapIcon, Heart, Layers, ArrowUpDown, GitCompareArrows, X, Trash2, SearchX, RotateCcw, ChevronLeft, Keyboard, Eye, Share2, TrendingDown, TrendingUp, Minus, Home, BarChart3, Building2, MapPin, Clock } from 'lucide-react'
import { t, mobile } from '../theme'
import { useAllPlots, useFavorites, useCompare, useDebounce, useUserLocation, useOnlineStatus, useIsMobile, useSSE, useDocumentTitle, useMetaDescription, useRecentlyViewed, useDataFreshness } from '../hooks'
// Note: dataFreshness and dataSource are computed locally in this component (not via hooks)
import MapArea from '../components/Map'
import type { MapBounds } from '../components/Map'
import FilterBar from '../components/Filters'
import { ErrorBoundary, useToast, NetworkBanner, AnimatedValue, DemoModeBanner, StaleDataBanner, ExploreLoadingSkeleton, SidebarFallback, CompareDrawerFallback, InlineFallback } from '../components/UI'
import { p, roi, fmt, sortPlots, SORT_OPTIONS, pricePerSqm, pricePerDunam, calcScore, getGrade, calcQuickInsight, pricePosition, findBestValueIds, calcAggregateStats, generateMarketInsights, plotCenter, daysOnMarket, estimateDemand } from '../utils'
import type { SortKey } from '../utils'
import { pois } from '../data'
import type { Plot, Filters } from '../types'

const Sidebar = lazy(() => import('../components/Sidebar'))
const LeadModal = lazy(() => import('../components/LeadModal'))
const Chat = lazy(() => import('../components/Chat'))
const PlotListPanel = lazy(() => import('../components/PlotListPanel'))
const CompareDrawer = lazy(() => import('../components/CompareDrawer'))
const MortgageCalculator = lazy(() => import('../components/MortgageCalculator'))

const DEFAULTS: Filters = { city: '', priceMin: '', priceMax: '', sizeMin: '', sizeMax: '', ripeness: '', minRoi: '', zoning: '', search: '', belowAvg: '' }

/* ── animations ── */
const slideUp = keyframes`from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}`
const loadingSlide = keyframes`0%{left:-35%;width:35%}50%{left:20%;width:50%}100%{left:100%;width:15%}`

/* ── styled ── */
const Wrap = styled.div`position:relative;width:100vw;height:100vh;height:100dvh;overflow:hidden;background:${t.bg};`
const Stats = styled.div`
  position:absolute;bottom:0;left:0;right:0;z-index:${t.z.filter};
  display:flex;align-items:center;justify-content:center;gap:24px;padding:8px 16px;
  background:${t.glass};backdrop-filter:blur(12px);border-top:1px solid ${t.border};
  font-size:12px;color:${t.textSec};direction:rtl;
  ${mobile}{bottom:56px;gap:12px;font-size:11px;padding:6px 14px;
    justify-content:center;}
`
const Stat = styled.span`display:flex;align-items:center;gap:4px;`
const Val = styled.span`color:${t.goldBright};font-weight:700;`
const ValOk = styled(Val)`color:${t.ok};`
const Demo = styled.span`padding:2px 8px;border-radius:${t.r.full};background:${t.goldDim};color:${t.gold};font-size:10px;font-weight:600;`
const livePulse = keyframes`0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.3)}`
const LiveDot = styled.span<{$c:string}>`
  display:inline-block;width:6px;height:6px;border-radius:50%;background:${pr=>pr.$c};
  animation:${livePulse} 2s ease-in-out infinite;flex-shrink:0;
`
const LiveBadge = styled.span<{$connected:boolean}>`
  display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:${t.r.full};
  background:${pr=>pr.$connected?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.08)'};
  color:${pr=>pr.$connected?t.ok:t.err};font-size:10px;font-weight:600;
  border:1px solid ${pr=>pr.$connected?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.15)'};
  transition:all 0.3s;
`
const MobileNav = styled.nav`
  display:none;position:fixed;bottom:0;left:0;right:0;z-index:${t.z.nav};
  background:${t.surface};border-top:1px solid ${t.border};
  ${mobile}{display:flex;justify-content:space-around;align-items:center;height:56px;}
`
const NavIndicator = styled.div<{$idx:number;$total:number}>`
  position:absolute;top:-1px;height:3px;
  width:${pr => Math.round(100 / pr.$total)}%;
  right:${pr => Math.round((pr.$idx / pr.$total) * 100)}%;
  background:linear-gradient(90deg,${t.gold},${t.goldBright});
  border-radius:0 0 3px 3px;
  transition:right 0.35s cubic-bezier(0.32,0.72,0,1);
  box-shadow:0 2px 8px rgba(212,168,75,0.35);
`
const NavBtn = styled.button<{$active?:boolean}>`
  display:flex;flex-direction:column;align-items:center;gap:2px;background:none;border:none;
  color:${pr=>pr.$active?t.gold:t.textDim};font-size:10px;font-family:${t.font};cursor:pointer;
  padding:4px 12px;transition:color ${t.tr};transform:${pr=>pr.$active?'scale(1.05)':'scale(1)'};
  transition:color ${t.tr},transform 0.2s cubic-bezier(0.32,0.72,0,1);
`
const TopProgress = styled.div<{$show:boolean}>`
  position:absolute;top:0;left:0;right:0;height:3px;z-index:${t.z.filter + 2};overflow:hidden;
  opacity:${pr=>pr.$show?1:0};transition:opacity 0.4s;pointer-events:none;
  &::after{content:'';position:absolute;top:0;left:-35%;width:35%;height:100%;
    background:linear-gradient(90deg,transparent,${t.gold},${t.goldBright},${t.gold},transparent);
    border-radius:0 2px 2px 0;animation:${loadingSlide} 1.2s cubic-bezier(0.4,0,0.2,1) infinite;}
`
const NavBadge = styled.span`
  position:absolute;top:-2px;right:-4px;
  display:inline-flex;align-items:center;justify-content:center;
  min-width:16px;height:16px;padding:0 4px;
  background:${t.gold};color:${t.bg};
  border-radius:${t.r.full};font-size:9px;font-weight:800;line-height:1;
  box-shadow:0 1px 4px rgba(212,168,75,0.4);
`
const NavBtnWrap = styled.div`position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;`

/* ── Breadcrumb Navigation ── */
const BreadcrumbBar = styled.nav`
  position:absolute;top:72px;left:50%;transform:translateX(-50%);z-index:${t.z.filter - 1};
  display:flex;align-items:center;gap:6px;padding:6px 16px;direction:rtl;
  background:${t.glass};backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border:1px solid ${t.glassBorder};border-radius:${t.r.full};
  box-shadow:${t.sh.sm};font-size:12px;font-family:${t.font};
  animation:${slideUp} 0.25s ease-out;
  ${mobile}{top:52px;font-size:11px;padding:5px 12px;gap:4px;max-width:calc(100vw - 24px);}
`
const BreadcrumbLink = styled(Link)`
  color:${t.textDim};font-weight:500;transition:color ${t.tr};text-decoration:none;
  white-space:nowrap;
  &:hover{color:${t.gold};}
`
const BreadcrumbSep = styled.span`
  color:${t.textDim};opacity:0.4;font-size:10px;flex-shrink:0;
`
const BreadcrumbCurrent = styled.span`
  color:${t.gold};font-weight:700;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis;max-width:160px;
`

/* ── City Market Summary Card ── */
const citySummaryIn = keyframes`from{opacity:0;transform:translateY(-8px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}`
const CityMarketCard = styled.div`
  position:absolute;top:16px;left:16px;z-index:${t.z.filter};
  width:220px;padding:14px 16px;direction:rtl;
  background:${t.glass};backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border:1px solid ${t.glassBorder};border-radius:${t.r.lg};
  box-shadow:${t.sh.lg};animation:${citySummaryIn} 0.35s cubic-bezier(0.32,0.72,0,1);
  &::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;
    background:linear-gradient(90deg,transparent,${t.gold},${t.goldBright},${t.gold},transparent);
    border-radius:${t.r.lg} ${t.r.lg} 0 0;}
  ${mobile}{display:none;}
`

/* ── Mobile City Market Strip (compact horizontal summary for mobile) ── */
const mobileCitySlide = keyframes`from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}`
const MobileCityStrip = styled.div`
  display:none;
  ${mobile}{
    display:flex;align-items:center;gap:10px;
    position:absolute;top:100px;left:8px;right:8px;z-index:${t.z.filter - 1};
    padding:8px 14px;direction:rtl;overflow-x:auto;
    background:${t.glass};backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
    border:1px solid ${t.glassBorder};border-radius:${t.r.full};
    box-shadow:${t.sh.sm};
    animation:${mobileCitySlide} 0.3s cubic-bezier(0.32,0.72,0,1);
    scrollbar-width:none;-webkit-overflow-scrolling:touch;
    &::-webkit-scrollbar{display:none;}
    &::before{content:'';position:absolute;top:0;left:0;right:0;height:1.5px;
      background:linear-gradient(90deg,transparent,${t.gold},${t.goldBright},${t.gold},transparent);
      border-radius:${t.r.full} ${t.r.full} 0 0;}
  }
`
const MobileCityStat = styled.div`
  display:flex;align-items:center;gap:4px;white-space:nowrap;flex-shrink:0;
`
const MobileCityLabel = styled.span`font-size:10px;font-weight:600;color:${t.textDim};`
const MobileCityVal = styled.span<{$c?:string}>`font-size:11px;font-weight:800;color:${pr=>pr.$c||t.gold};`
const MobileCitySep = styled.span`width:1px;height:16px;background:${t.border};flex-shrink:0;`

const CityMarketTitle = styled.div`
  font-size:14px;font-weight:800;color:${t.text};margin-bottom:10px;
  display:flex;align-items:center;gap:6px;
`
const CityMarketGrid = styled.div`display:grid;grid-template-columns:1fr 1fr;gap:8px;`
const CityMarketStat = styled.div`
  display:flex;flex-direction:column;align-items:center;gap:2px;
  padding:8px 6px;background:${t.surfaceLight};border:1px solid ${t.border};
  border-radius:${t.r.sm};transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};}
`
const CityMarketStatVal = styled.div<{$c?:string}>`
  font-size:14px;font-weight:800;color:${pr=>pr.$c||t.gold};
`
const CityMarketStatLabel = styled.div`
  font-size:9px;font-weight:600;color:${t.textDim};text-align:center;
`

/* ── Sort ── */
const SortWrap = styled.div`
  position:absolute;top:16px;right:16px;z-index:${t.z.filter};direction:rtl;
  ${mobile}{top:8px;right:8px;}
`
const SortBtn = styled.button<{$active?:boolean}>`
  display:inline-flex;align-items:center;gap:6px;padding:8px 14px;
  background:${pr=>pr.$active?t.goldDim:t.glass};backdrop-filter:blur(16px);
  border:1px solid ${pr=>pr.$active?t.goldBorder:t.glassBorder};border-radius:${t.r.full};
  color:${pr=>pr.$active?t.gold:t.textSec};font-size:12px;font-weight:600;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};box-shadow:${t.sh.sm};
  &:hover{border-color:${t.goldBorder};color:${t.gold};}
`
const sortDropIn = keyframes`from{opacity:0;transform:translateY(-6px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}`
const SortDrop = styled.div`
  position:absolute;top:calc(100% + 6px);right:0;min-width:140px;
  background:${t.glass};backdrop-filter:blur(24px);border:1px solid ${t.glassBorder};
  border-radius:${t.r.md};box-shadow:${t.sh.lg};overflow:hidden;
  animation:${sortDropIn} 0.2s cubic-bezier(0.32,0.72,0,1);
`
const SortOption = styled.button<{$active?:boolean}>`
  display:block;width:100%;padding:8px 14px;text-align:right;
  background:${pr=>pr.$active?t.goldDim:'transparent'};border:none;
  color:${pr=>pr.$active?t.gold:t.textSec};font-size:12px;font-weight:${pr=>pr.$active?700:500};
  font-family:${t.font};cursor:pointer;transition:all ${t.tr};
  &:hover{background:${t.hover};color:${t.gold};}
`

/* ── City Comparison Button ── */
const CityCompBtn = styled.button<{$active?:boolean}>`
  display:inline-flex;align-items:center;gap:6px;padding:8px 14px;
  background:${pr=>pr.$active?t.goldDim:t.glass};backdrop-filter:blur(16px);
  border:1px solid ${pr=>pr.$active?t.goldBorder:t.glassBorder};border-radius:${t.r.full};
  color:${pr=>pr.$active?t.gold:t.textSec};font-size:12px;font-weight:600;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};box-shadow:${t.sh.sm};white-space:nowrap;
  &:hover{border-color:${t.goldBorder};color:${t.gold};}
  ${mobile}{padding:6px 10px;font-size:11px;}
`

/* ── City Comparison Overlay Panel ── */
const cityCompSlide = keyframes`from{opacity:0;transform:translateY(12px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}`
const CityCompPanel = styled.div`
  position:absolute;top:16px;right:100px;z-index:${t.z.filter};
  width:min(520px,calc(100vw - 32px));max-height:calc(100vh - 140px);overflow-y:auto;
  background:${t.glass};backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border:1px solid ${t.glassBorder};border-radius:${t.r.lg};box-shadow:${t.sh.xl};
  direction:rtl;animation:${cityCompSlide} 0.3s cubic-bezier(0.32,0.72,0,1);
  contain:layout style;
  &::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;
    background:linear-gradient(90deg,transparent,${t.gold},${t.goldBright},${t.gold},transparent);
    border-radius:${t.r.lg} ${t.r.lg} 0 0;}
  scrollbar-width:thin;
  &::-webkit-scrollbar{width:4px;}
  &::-webkit-scrollbar-thumb{background:${t.surfaceLight};border-radius:2px;}
  ${mobile}{right:8px;left:8px;width:auto;top:56px;max-height:calc(100vh - 180px);}
`
const CityCompHeader = styled.div`
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 18px;border-bottom:1px solid ${t.border};
  position:sticky;top:0;z-index:2;
  background:${t.glass};backdrop-filter:blur(24px);
`
const CityCompTitle = styled.h3`
  font-size:15px;font-weight:800;color:${t.text};margin:0;
  display:flex;align-items:center;gap:8px;font-family:${t.font};
`
const CityCompGrid = styled.div`
  display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;
  padding:14px 18px;
  ${mobile}{grid-template-columns:1fr;}
`
const cityCardHover = keyframes`from{transform:translateY(0)}to{transform:translateY(-2px)}`
const CityCompCard = styled.button<{$active?:boolean;$best?:boolean}>`
  display:flex;flex-direction:column;gap:8px;padding:14px 16px;
  background:${pr=>pr.$active?t.goldDim:t.surfaceLight};
  border:1px solid ${pr=>pr.$active?t.goldBorder:pr.$best?'rgba(16,185,129,0.3)':t.border};
  border-radius:${t.r.md};cursor:pointer;font-family:${t.font};
  text-align:right;transition:all ${t.tr};position:relative;overflow:hidden;
  ${pr=>pr.$best?`&::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#10B981,#4ADE80);}`:''};
  &:hover{border-color:${t.goldBorder};transform:translateY(-2px);box-shadow:${t.sh.sm};}
`
const CityCompCardName = styled.div`
  font-size:14px;font-weight:800;color:${t.text};
  display:flex;align-items:center;justify-content:space-between;gap:6px;
`
const CityCompCardMetrics = styled.div`display:grid;grid-template-columns:1fr 1fr;gap:6px;`
const CityCompMetric = styled.div`
  display:flex;flex-direction:column;gap:1px;
`
const CityCompMetricVal = styled.span<{$c?:string}>`font-size:13px;font-weight:800;color:${pr=>pr.$c||t.gold};`
const CityCompMetricLabel = styled.span`font-size:9px;font-weight:600;color:${t.textDim};`
const CityCompScoreBar = styled.div`
  display:flex;align-items:center;gap:6px;margin-top:2px;
`
const CityCompScoreTrack = styled.div`flex:1;height:4px;border-radius:2px;background:${t.bg};overflow:hidden;`
const CityCompScoreFill = styled.div<{$w:number;$c:string}>`
  height:100%;width:${pr=>pr.$w}%;background:${pr=>pr.$c};border-radius:2px;
  transition:width 0.6s cubic-bezier(0.32,0.72,0,1);
`

/* ── CityComp Close Button (extracted from inline) ── */
const CityCompClose = styled.button`
  width:28px;height:28px;border-radius:${t.r.sm};border:1px solid ${t.border};
  background:transparent;color:${t.textSec};cursor:pointer;
  display:flex;align-items:center;justify-content:center;transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};color:${t.gold};background:${t.goldDim};}
`

/* ── Histogram styles (extracted from CityMarketCard inline) ── */
const HistogramWrap = styled.div`
  margin-top:10px;padding-top:8px;border-top:1px solid ${t.border};
`
const HistogramTitle = styled.div`
  font-size:9px;font-weight:700;color:${t.textDim};margin-bottom:6px;letter-spacing:0.3px;
`
const HistogramBars = styled.div`
  display:flex;align-items:flex-end;gap:3px;height:32px;
`
const HistogramBarCol = styled.div`
  flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;
`
const HistogramBar = styled.div<{$h:number;$intensity:'high'|'mid'|'low'}>`
  width:100%;border-radius:2px;
  height:${pr=>Math.max(4, Math.round(pr.$h * 0.3))}px;
  background:${pr=>pr.$intensity === 'high' ? `linear-gradient(0deg,${t.gold},${t.goldBright})` :
    pr.$intensity === 'mid' ? `linear-gradient(0deg,${t.gold}80,${t.gold})` : `${t.gold}50`};
  transition:height 0.5s cubic-bezier(0.32,0.72,0,1);
`
const HistogramBarCount = styled.span`
  font-size:7px;font-weight:700;color:${t.textDim};line-height:1;
`
const HistogramLabels = styled.div`
  display:flex;justify-content:space-between;margin-top:2px;
`
const HistogramLabel = styled.span`
  font-size:7px;color:${t.textDim};
`

/* ── City Comp Best Value Badge (extracted from inline) ── */
const CityCompBestBadge = styled.span`
  display:inline-flex;align-items:center;gap:3px;
  font-size:9px;font-weight:800;color:#10B981;
  padding:2px 8px;border-radius:${t.r.full};
  background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);
  align-self:flex-start;
`

/* ── Inline insight chip in mobile preview (extracted) ── */
const PreviewInsightChip = styled.div<{$c:string}>`
  display:flex;align-items:center;gap:6px;padding:6px 12px;
  background:${pr=>`${pr.$c}10`};border:1px solid ${pr=>`${pr.$c}25`};
  border-radius:${t.r.full};font-size:11px;font-weight:700;color:${pr=>pr.$c};
  direction:rtl;
`

/* ── Sort + City Compare row wrapper ── */
const SortActionsRow = styled.div`
  display:flex;align-items:center;gap:8px;
`

/* ── Compare bar label ── */
const CompareLabel = styled.span`
  font-size:13px;font-weight:700;color:${t.text};white-space:nowrap;
`

/* ── InsightsTicker counter ── */
const InsightCounter = styled.span`
  font-size:9px;color:${t.textDim};font-weight:600;white-space:nowrap;
`

/* ── Stats bar quality label ── */
const QualityLabel = styled.span`
  font-size:10px;color:${t.textDim};font-weight:600;
`

/* ── SSE update count sub-text ── */
const SseUpdateCount = styled.span`
  opacity:0.6;font-size:9px;
`

/* ── Recently Viewed Floating Pill ── */
const recentPillIn = keyframes`from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}`
const RecentPill = styled.div`
  position:absolute;top:136px;left:16px;z-index:${t.z.filter - 1};
  display:flex;flex-direction:column;gap:0;
  background:${t.glass};backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border:1px solid ${t.glassBorder};border-radius:${t.r.lg};
  box-shadow:${t.sh.md};overflow:hidden;width:200px;
  animation:${recentPillIn} 0.3s cubic-bezier(0.32,0.72,0,1);
  ${mobile}{display:none;}
`
const RecentPillHeader = styled.div`
  display:flex;align-items:center;justify-content:space-between;
  padding:8px 12px;border-bottom:1px solid ${t.border};direction:rtl;
`
const RecentPillTitle = styled.span`
  font-size:11px;font-weight:700;color:${t.textDim};
  display:flex;align-items:center;gap:5px;
`
const RecentPillToggle = styled.button`
  background:none;border:none;color:${t.textDim};cursor:pointer;
  font-size:10px;font-weight:600;font-family:${t.font};
  padding:2px 6px;border-radius:${t.r.full};transition:all ${t.tr};
  &:hover{color:${t.gold};background:${t.goldDim};}
`
const RecentPillItem = styled.button`
  display:flex;align-items:center;gap:8px;padding:8px 12px;width:100%;
  background:transparent;border:none;border-bottom:1px solid ${t.border};
  cursor:pointer;direction:rtl;font-family:${t.font};text-align:right;
  transition:background ${t.tr};
  &:last-child{border-bottom:none;}
  &:hover{background:${t.hover};}
`
const RecentPillName = styled.span`
  font-size:11px;font-weight:700;color:${t.text};
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0;
`
const RecentPillPrice = styled.span`
  font-size:10px;font-weight:800;color:${t.gold};white-space:nowrap;flex-shrink:0;
`

/* ── Empty state suggestions container ── */
const SuggestionsCol = styled.div`
  display:flex;flex-direction:column;gap:6px;width:100%;
`

/* ── Portfolio Quality Gauge (for stats bar) ── */
const PortfolioGauge = styled.div`
  display:flex;align-items:center;gap:6px;
`
const GaugeTrack = styled.div`
  width:48px;height:5px;border-radius:3px;background:${t.surfaceLight};overflow:hidden;
  border:1px solid ${t.border};
`
const GaugeFill = styled.div<{$w:number;$c:string}>`
  height:100%;width:${pr=>pr.$w}%;
  background:linear-gradient(90deg,${pr=>pr.$c}80,${pr=>pr.$c});border-radius:3px;
  transition:width 0.5s cubic-bezier(0.32,0.72,0,1);
`
const GaugeLabel = styled.span<{$c:string}>`
  font-size:10px;font-weight:800;color:${pr=>pr.$c};
`

/* ── Total Portfolio Value in stats bar ── */
const TotalValueStat = styled.span`
  display:inline-flex;align-items:center;gap:4px;
  font-size:10px;font-weight:600;color:${t.textDim};
  padding:2px 8px;border-radius:${t.r.full};
  background:rgba(212,168,75,0.06);border:1px solid rgba(212,168,75,0.12);
  transition:all 0.3s;
  ${mobile}{display:none;}
`
const TotalValueAmount = styled.span`
  font-weight:800;color:${t.goldBright};
`

/* ── Market Momentum Badge in stats bar ── */
const MomentumBadge = styled.span<{$c:string}>`
  display:inline-flex;align-items:center;gap:3px;
  font-size:10px;font-weight:700;color:${pr=>pr.$c};
  padding:2px 8px;border-radius:${t.r.full};
  background:${pr=>`${pr.$c}08`};border:1px solid ${pr=>`${pr.$c}18`};
  white-space:nowrap;transition:all 0.3s;
  ${mobile}{display:none;}
`

/* ── Clickable LiveBadge variant (replaces inline style={{ cursor: 'pointer' }}) ── */
const ClickableLiveBadge = styled(LiveBadge)`cursor:pointer;`
const ClickableDemo = styled(Demo)`cursor:pointer;`

/* ── Active Filter Summary Strip (compact, always visible when filters applied) ── */
const filterStripIn = keyframes`from{opacity:0;transform:translateX(-50%) translateY(-4px) scale(0.96)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}`
const FilterSummaryStrip = styled.div`
  position:absolute;top:106px;left:50%;transform:translateX(-50%);z-index:${t.z.filter - 2};
  display:flex;align-items:center;gap:6px;padding:5px 14px;direction:rtl;
  background:${t.glass};backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border:1px solid ${t.goldBorder};border-radius:${t.r.full};
  box-shadow:${t.sh.sm};font-size:11px;font-family:${t.font};
  animation:${filterStripIn} 0.2s ease-out;max-width:calc(100vw - 32px);
  overflow:hidden;white-space:nowrap;
  ${mobile}{top:60px;font-size:10px;padding:4px 10px;gap:4px;}
`
const FilterStripLabel = styled.span`
  color:${t.textDim};font-weight:600;flex-shrink:0;
`
const FilterStripValue = styled.span`
  color:${t.gold};font-weight:700;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
`
const FilterStripClear = styled.button`
  display:flex;align-items:center;justify-content:center;width:18px;height:18px;
  border-radius:50%;background:transparent;border:1px solid ${t.border};
  color:${t.textDim};cursor:pointer;transition:all ${t.tr};flex-shrink:0;
  &:hover{border-color:${t.err};color:${t.err};background:rgba(239,68,68,0.08);}
`

/* ── Skip to content (WCAG 2.1 accessibility) ── */
const SkipLink = styled.a`
  position:absolute;top:-100%;left:50%;transform:translateX(-50%);
  z-index:${t.z.toast + 10};padding:12px 24px;
  background:${t.gold};color:${t.bg};font-weight:700;font-size:14px;font-family:${t.font};
  border-radius:0 0 ${t.r.md} ${t.r.md};text-decoration:none;
  transition:top 0.2s;
  &:focus{top:0;}
`

/* ── Compare Bar (floating bottom tray) ── */
const CompareBar = styled.div`
  position:absolute;bottom:42px;left:50%;transform:translateX(-50%);z-index:${t.z.filter};
  display:flex;align-items:center;gap:12px;padding:10px 18px;direction:rtl;
  background:${t.glass};backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border:1px solid ${t.goldBorder};border-radius:${t.r.xl};box-shadow:${t.sh.lg};
  animation:${slideUp} 0.3s cubic-bezier(0.32,0.72,0,1);
  ${mobile}{bottom:96px;left:8px;right:8px;transform:none;padding:8px 14px;gap:8px;}
`
const CompareAction = styled.button`
  display:inline-flex;align-items:center;gap:6px;padding:8px 18px;
  background:linear-gradient(135deg,${t.gold},${t.goldBright});color:${t.bg};
  border:none;border-radius:${t.r.full};font-weight:700;font-size:13px;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};white-space:nowrap;
  &:hover{box-shadow:${t.sh.glow};transform:translateY(-1px);}
`
const CompareClear = styled.button`
  display:flex;align-items:center;justify-content:center;width:32px;height:32px;
  background:transparent;border:1px solid ${t.border};border-radius:${t.r.sm};
  color:${t.textSec};cursor:pointer;transition:all ${t.tr};flex-shrink:0;
  &:hover{border-color:${t.err};color:${t.err};background:rgba(239,68,68,0.08);}
`

/* ── Empty State ── */
const emptyBounce = keyframes`0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}`
const EmptyWrap = styled.div`
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:${t.z.filter - 1};
  display:flex;flex-direction:column;align-items:center;gap:16px;padding:32px 40px;
  background:${t.glass};backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border:1px solid ${t.glassBorder};border-radius:${t.r.xl};box-shadow:${t.sh.xl};
  text-align:center;direction:rtl;max-width:380px;width:calc(100vw - 48px);
`
const EmptyIcon = styled.div`
  width:64px;height:64px;border-radius:${t.r.full};display:flex;align-items:center;justify-content:center;
  background:${t.goldDim};border:1px solid ${t.goldBorder};animation:${emptyBounce} 2.5s ease-in-out infinite;
`
const EmptyTitle = styled.h3`font-size:17px;font-weight:700;color:${t.text};margin:0;font-family:${t.font};`
const EmptyDesc = styled.p`font-size:13px;color:${t.textSec};margin:0;line-height:1.6;`
const EmptyResetBtn = styled.button`
  display:inline-flex;align-items:center;gap:6px;padding:10px 24px;
  background:linear-gradient(135deg,${t.gold},${t.goldBright});color:${t.bg};
  border:none;border-radius:${t.r.full};font-weight:700;font-size:14px;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};
  &:hover{box-shadow:${t.sh.glow};transform:translateY(-2px);}
`

/* ── Mobile Tab Overlay ── */
const mobileSlide = keyframes`from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}`
const MobileOverlay = styled.div<{$open:boolean}>`
  display:none;position:fixed;bottom:56px;left:0;right:0;top:0;z-index:${t.z.filter + 1};
  background:${t.bg};overflow-y:auto;direction:rtl;
  animation:${mobileSlide} 0.3s cubic-bezier(0.32,0.72,0,1);
  ${mobile}{display:${pr=>pr.$open?'block':'none'};}
`
const MobileOverlayHeader = styled.div`
  position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;
  padding:16px 20px;background:${t.surface};border-bottom:1px solid ${t.border};
`
const MobileOverlayTitle = styled.h3`font-size:17px;font-weight:700;color:${t.text};margin:0;display:flex;align-items:center;gap:8px;`
const MobileOverlayClose = styled.button`
  width:32px;height:32px;border-radius:${t.r.sm};border:1px solid ${t.border};
  background:transparent;color:${t.textSec};cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:all ${t.tr};&:hover{border-color:${t.goldBorder};color:${t.gold};}
`
const MobileFavList = styled.div`display:flex;flex-direction:column;gap:1px;`
const MobileFavItem = styled.div`
  display:flex;align-items:center;gap:12px;padding:14px 20px;
  background:${t.surface};border-bottom:1px solid ${t.border};cursor:pointer;
  transition:background ${t.tr};&:hover{background:${t.hover};}
`
const MobileFavInfo = styled.div`flex:1;min-width:0;`
const MobileFavTitle = styled.div`font-size:14px;font-weight:700;color:${t.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`
const MobileFavSub = styled.div`font-size:12px;color:${t.textSec};display:flex;align-items:center;gap:8px;margin-top:2px;`
const MobileFavPrice = styled.span`font-size:14px;font-weight:800;color:${t.gold};white-space:nowrap;`
const MobileFavRemove = styled.button`
  width:32px;height:32px;border-radius:${t.r.sm};border:1px solid ${t.border};
  background:transparent;color:${t.textDim};cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;
  transition:all ${t.tr};&:hover{border-color:${t.err};color:${t.err};background:rgba(239,68,68,0.08);}
`
const MobileEmptyState = styled.div`
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;
  padding:60px 24px;text-align:center;
`
const MobileEmptyIcon = styled.div`
  width:64px;height:64px;border-radius:${t.r.full};display:flex;align-items:center;justify-content:center;
  background:${t.goldDim};border:1px solid ${t.goldBorder};
`
const MobileEmptyTitle = styled.div`font-size:16px;font-weight:700;color:${t.text};`
const MobileEmptyDesc = styled.div`font-size:13px;color:${t.textSec};line-height:1.6;`

/* ── Mobile Plot Preview Bottom Card ── */
const previewSlide = keyframes`from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}`
const MobilePreview = styled.div<{$show:boolean}>`
  display:none;position:fixed;bottom:56px;left:0;right:0;z-index:${t.z.sidebar - 1};
  background:${t.surface};border-top:1px solid ${t.goldBorder};border-radius:${t.r.xl} ${t.r.xl} 0 0;
  box-shadow:0 -8px 32px rgba(0,0,0,0.35);direction:rtl;overflow:hidden;
  animation:${previewSlide} 0.3s cubic-bezier(0.32,0.72,0,1);
  will-change:transform,opacity;transform:translateZ(0);
  ${mobile}{display:${pr=>pr.$show?'block':'none'};}
`
const PreviewHandle = styled.div`
  width:36px;height:4px;border-radius:2px;background:${t.textDim};margin:8px auto 4px;opacity:0.4;
`
const PreviewBody = styled.div`
  padding:12px 20px 16px;display:flex;flex-direction:column;gap:10px;
`
const PreviewTopRow = styled.div`
  display:flex;align-items:flex-start;justify-content:space-between;gap:12px;
`
const PreviewInfo = styled.div`flex:1;min-width:0;`
const PreviewTitle = styled.div`font-size:16px;font-weight:800;color:${t.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`
const PreviewCity = styled.div`font-size:12px;color:${t.textSec};margin-top:2px;display:flex;align-items:center;gap:6px;`
const PreviewPrice = styled.div`font-size:22px;font-weight:900;color:${t.gold};white-space:nowrap;`
const PreviewScore = styled.div<{$c:string}>`
  display:flex;align-items:center;gap:8px;padding:8px 14px;
  background:${t.surfaceLight};border:1px solid ${t.border};border-radius:${t.r.md};
  font-size:14px;font-weight:700;color:${pr=>pr.$c};
`
const PreviewActions = styled.div`
  display:flex;align-items:center;gap:8px;
`
const PreviewDetailBtn = styled.button`
  flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:12px;
  background:linear-gradient(135deg,${t.gold},${t.goldBright});color:${t.bg};
  border:none;border-radius:${t.r.md};font-weight:700;font-size:14px;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};
  &:hover{box-shadow:${t.sh.glow};transform:translateY(-1px);}
`
const PreviewCloseBtn = styled.button`
  width:44px;height:44px;border-radius:${t.r.md};
  border:1px solid ${t.border};background:transparent;
  color:${t.textSec};cursor:pointer;
  display:flex;align-items:center;justify-content:center;transition:all ${t.tr};flex-shrink:0;
  &:hover{border-color:${t.goldBorder};color:${t.gold};}
`

/* ── Preview Score + Demand Row ── */
const PreviewMetaRow = styled.div`display:flex;align-items:center;gap:8px;flex-wrap:wrap;`
const DemandBadge = styled.span<{$c:string}>`
  display:inline-flex;align-items:center;gap:4px;
  font-size:10px;font-weight:700;color:${pr=>pr.$c};
  padding:4px 10px;border-radius:${t.r.full};
  background:${pr=>`${pr.$c}10`};border:1px solid ${pr=>`${pr.$c}22`};
`

/* ── Preview Quick Actions ── */
const PreviewQuickActions = styled.div`
  display:flex;align-items:center;gap:6px;
`
const PreviewQuickBtn = styled.button<{$active?:boolean;$color?:string}>`
  display:flex;align-items:center;justify-content:center;width:40px;height:40px;
  border-radius:${t.r.md};border:1px solid ${pr=>pr.$active?pr.$color||t.gold:t.border};
  background:${pr=>pr.$active?`${pr.$color||t.gold}15`:'transparent'};
  color:${pr=>pr.$active?pr.$color||t.gold:t.textSec};cursor:pointer;
  transition:all ${t.tr};flex-shrink:0;
  &:hover{border-color:${pr=>pr.$color||t.goldBorder};color:${pr=>pr.$color||t.gold};background:${pr=>`${pr.$color||t.gold}10`};}
`

/* ── Price Position Badge ── */
const PricePositionBadge = styled.div<{$color:string}>`
  display:inline-flex;align-items:center;gap:4px;padding:4px 10px;
  background:${pr=>`${pr.$color}10`};border:1px solid ${pr=>`${pr.$color}25`};
  border-radius:${t.r.full};font-size:11px;font-weight:700;color:${pr=>pr.$color};
  direction:rtl;white-space:nowrap;
`

/* ── Area Bounds Chip (extracted from inline styles for perf) ── */
const areaBoundsIn = keyframes`from{opacity:0;transform:translateX(-50%) translateY(-8px) scale(0.92)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}`
const AreaBoundsChip = styled.div`
  position:absolute;top:100px;left:50%;transform:translateX(-50%);z-index:${t.z.filter - 1};
  display:flex;align-items:center;gap:8px;padding:6px 14px;direction:rtl;
  background:${t.glass};backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border:1px solid ${t.goldBorder};border-radius:${t.r.full};
  box-shadow:${t.sh.sm};font-size:12px;font-family:${t.font};
  animation:${areaBoundsIn} 0.25s ease-out;
  ${mobile}{top:56px;font-size:11px;padding:5px 12px;gap:6px;}
`
const AreaBoundsLabel = styled.span`color:${t.gold};font-weight:700;`
const AreaBoundsCount = styled.span`color:${t.textDim};font-weight:600;`
const AreaBoundsClose = styled.button`
  display:flex;align-items:center;justify-content:center;width:20px;height:20px;
  border-radius:50%;background:transparent;border:1px solid ${t.border};
  color:${t.textDim};cursor:pointer;transition:all ${t.tr};flex-shrink:0;
  &:hover{border-color:${t.err};color:${t.err};background:rgba(239,68,68,0.08);}
`

/* ── Smart Suggestion Button (for empty state) ── */
const SuggestionBtn = styled.button`
  display:flex;align-items:center;gap:8px;padding:10px 14px;
  background:${t.surfaceLight};border:1px solid ${t.border};
  border-radius:${t.r.md};cursor:pointer;width:100%;
  color:${t.textSec};font-size:13px;font-weight:600;font-family:${t.font};
  direction:rtl;text-align:right;transition:all ${t.tr};
  &:hover{border-color:${t.gold};color:${t.gold};}
`

/* ── Mobile Preview: vs City Average comparison ── */
const PreviewCompareGrid = styled.div`
  display:grid;grid-template-columns:repeat(3,1fr);gap:6px;
`
const PreviewCompareStat = styled.div<{$positive?:boolean}>`
  display:flex;flex-direction:column;align-items:center;gap:2px;
  padding:6px 4px;background:${t.surfaceLight};border:1px solid ${t.border};
  border-radius:${t.r.sm};transition:all ${t.tr};
`
const PreviewCompareVal = styled.span<{$c?:string}>`
  font-size:12px;font-weight:800;color:${pr=>pr.$c||t.gold};line-height:1;
`
const PreviewCompareLabel = styled.span`
  font-size:8px;font-weight:600;color:${t.textDim};text-align:center;line-height:1.2;
`
const DaysOnMarketBadge = styled.span<{$c:string}>`
  display:inline-flex;align-items:center;gap:3px;padding:2px 8px;
  background:${pr=>`${pr.$c}12`};border:1px solid ${pr=>`${pr.$c}25`};
  border-radius:${t.r.full};font-size:10px;font-weight:700;color:${pr=>pr.$c};
  white-space:nowrap;
`

/* ── Keyboard Shortcuts Dialog ── */
const KbBackdrop = styled.div<{$open:boolean}>`
  position:fixed;inset:0;z-index:${t.z.modal};
  background:rgba(0,0,0,0.6);backdrop-filter:blur(6px);
  opacity:${pr=>pr.$open?1:0};pointer-events:${pr=>pr.$open?'auto':'none'};
  transition:opacity 0.25s;display:flex;align-items:center;justify-content:center;
`
const KbDialog = styled.div`
  background:${t.surface};border:1px solid ${t.goldBorder};border-radius:${t.r.xl};
  box-shadow:${t.sh.xl};padding:28px 32px;max-width:440px;width:calc(100vw - 32px);
  direction:rtl;position:relative;overflow:hidden;contain:layout style;
  &::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;
    background:linear-gradient(90deg,transparent,${t.gold},${t.goldBright},${t.gold},transparent);}
`
const KbTitle = styled.h3`
  font-size:17px;font-weight:800;color:${t.text};margin:0 0 20px;
  display:flex;align-items:center;gap:10px;font-family:${t.font};
`
const KbGroup = styled.div`margin-bottom:16px;&:last-child{margin-bottom:0;}`
const KbGroupLabel = styled.div`font-size:11px;font-weight:700;color:${t.textDim};letter-spacing:0.4px;margin-bottom:8px;`
const KbRow = styled.div`
  display:flex;align-items:center;justify-content:space-between;padding:6px 0;
`
const KbLabel = styled.span`font-size:13px;color:${t.textSec};`
const KbKey = styled.kbd`
  display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:26px;
  padding:0 8px;background:${t.bg};border:1px solid ${t.border};border-radius:${t.r.sm};
  font-size:12px;font-weight:700;color:${t.gold};font-family:${t.font};
  box-shadow:0 1px 2px rgba(0,0,0,0.15);
`
const KbClose = styled.button`
  position:absolute;top:16px;left:16px;width:28px;height:28px;border-radius:${t.r.sm};
  background:transparent;border:1px solid ${t.border};color:${t.textSec};cursor:pointer;
  display:flex;align-items:center;justify-content:center;transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};color:${t.gold};}
`
const KbHint = styled.div`
  margin-top:16px;padding-top:12px;border-top:1px solid ${t.border};
  font-size:11px;color:${t.textDim};text-align:center;
`

/* ── Keyboard Help Hint (desktop only) ── */
const KbHintBtn = styled.button`
  display:inline-flex;align-items:center;gap:4px;
  padding:3px 8px;border-radius:${t.r.full};
  background:rgba(255,255,255,0.04);border:1px solid ${t.border};
  color:${t.textDim};font-size:10px;font-weight:600;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};color:${t.gold};}
  ${mobile}{display:none;}
`

/* ── Viewport Visible Indicator ── */
const ViewportStat = styled.span`
  display:inline-flex;align-items:center;gap:4px;
  font-size:10px;font-weight:600;color:${t.textDim};
  padding:2px 8px;border-radius:${t.r.full};
  background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.12);
  transition:all 0.3s;
`

/* ── Market Insights Ticker ── */
const insightSlideIn = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}`
const insightSlideOut = keyframes`from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-8px)}`
const insightPulse = keyframes`0%,100%{box-shadow:0 0 0 0 rgba(212,168,75,0)}50%{box-shadow:0 0 0 4px rgba(212,168,75,0.08)}`
const InsightsTicker = styled.div<{$hasCompare?:boolean}>`
  position:absolute;bottom:36px;left:50%;transform:translateX(-50%);z-index:${t.z.filter - 1};
  display:flex;align-items:center;gap:10px;padding:6px 16px;direction:rtl;
  background:${t.glass};backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border:1px solid ${t.glassBorder};border-radius:${t.r.full};
  box-shadow:${t.sh.sm};font-size:12px;font-family:${t.font};
  animation:${insightPulse} 4s ease-in-out infinite;
  transition:all 0.3s;max-width:min(560px,calc(100vw - 120px));
  overflow:hidden;cursor:pointer;user-select:none;
  &:hover{border-color:${t.goldBorder};box-shadow:${t.sh.md};}
  ${mobile}{bottom:${pr=>pr.$hasCompare ? '148px' : '96px'};left:8px;right:8px;transform:none;max-width:none;
    font-size:11px;padding:5px 12px;gap:6px;}
`
const InsightEmoji = styled.span`
  font-size:16px;flex-shrink:0;line-height:1;
  ${mobile}{font-size:14px;}
`
const InsightText = styled.span<{$entering:boolean}>`
  color:${t.textSec};font-weight:600;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0;
  animation:${pr => pr.$entering ? insightSlideIn : insightSlideOut} 0.35s ease-out forwards;
`
const InsightCategory = styled.span<{$c:string}>`
  display:inline-flex;align-items:center;justify-content:center;
  width:6px;height:6px;border-radius:50%;background:${pr=>pr.$c};flex-shrink:0;
  ${mobile}{width:5px;height:5px;}
`
const InsightNav = styled.button`
  display:flex;align-items:center;justify-content:center;width:20px;height:20px;
  border-radius:50%;border:1px solid ${t.border};background:transparent;
  color:${t.textDim};cursor:pointer;flex-shrink:0;
  font-size:10px;font-family:${t.font};transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};color:${t.gold};background:${t.goldDim};}
  ${mobile}{width:18px;height:18px;font-size:9px;}
`

// ── URL ↔ Filters sync helpers ──
const FILTER_PARAMS: (keyof Filters)[] = ['city', 'priceMin', 'priceMax', 'sizeMin', 'sizeMax', 'ripeness', 'minRoi', 'zoning', 'search', 'belowAvg']

function filtersFromParams(sp: URLSearchParams): Filters {
  const f = { ...DEFAULTS }
  for (const key of FILTER_PARAMS) {
    const v = sp.get(key)
    if (v) f[key] = v
  }
  return f
}

function filtersToParams(f: Filters): URLSearchParams {
  const sp = new URLSearchParams()
  for (const key of FILTER_PARAMS) {
    if (f[key] && f[key] !== DEFAULTS[key]) sp.set(key, f[key])
  }
  return sp
}

/* ── Extracted: InsightsTickerWidget (memoized to prevent re-render cascades from parent state) ── */
interface InsightsTickerProps {
  insights: { emoji: string; text: string; color: string }[]
  hasCompare: boolean
}

const InsightsTickerWidget = memo(function InsightsTickerWidget({ insights, hasCompare }: InsightsTickerProps) {
  const [idx, setIdx] = useState(0)
  const [entering, setEntering] = useState(true)

  // Auto-rotate insights every 5s
  useEffect(() => {
    if (insights.length <= 1) return
    const interval = setInterval(() => {
      setEntering(false)
      setTimeout(() => {
        setIdx(prev => (prev + 1) % insights.length)
        setEntering(true)
      }, 300)
    }, 5000)
    return () => clearInterval(interval)
  }, [insights.length])

  // Reset index when insights change
  useEffect(() => {
    setIdx(0)
    setEntering(true)
  }, [insights.length])

  if (insights.length === 0) return null
  const current = insights[idx % insights.length]
  if (!current) return null

  const advance = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setEntering(false)
    setTimeout(() => {
      setIdx(prev => (prev + 1) % insights.length)
      setEntering(true)
    }, 200)
  }

  return (
    <InsightsTicker
      $hasCompare={hasCompare}
      role="marquee"
      aria-label="תובנות שוק"
      title={`${idx + 1}/${insights.length} — לחץ לתובנה הבאה`}
      onClick={() => advance()}
    >
      <InsightCategory $c={current.color} />
      <InsightEmoji>{current.emoji}</InsightEmoji>
      <InsightText $entering={entering}>{current.text}</InsightText>
      <InsightNav onClick={advance} aria-label="תובנה הבאה">›</InsightNav>
      <InsightCounter>{idx + 1}/{insights.length}</InsightCounter>
    </InsightsTicker>
  )
})

/* ── Extracted: MobilePreviewCard (memoized to avoid re-renders when parent state changes) ── */
interface MobilePreviewProps {
  plot: Plot
  allSorted: Plot[]
  onExpand: () => void
  onShare: (pl: Plot) => void
  onClose: () => void
  isFav: boolean
  onToggleFav: () => void
  isCompared: boolean
  onToggleCompare: () => void
  onNavigate?: (plot: Plot) => void
}

/* ── Mobile Preview Nav Arrows ── */
const PreviewNavRow = styled.div`
  display:flex;align-items:center;justify-content:space-between;gap:8px;
  padding-bottom:4px;
`
const PreviewNavBtn = styled.button<{$disabled?:boolean}>`
  display:flex;align-items:center;gap:4px;padding:6px 12px;
  background:${pr=>pr.$disabled?'transparent':t.surfaceLight};
  border:1px solid ${pr=>pr.$disabled?'transparent':t.border};
  border-radius:${t.r.full};color:${pr=>pr.$disabled?t.textDim:t.textSec};
  font-size:11px;font-weight:600;font-family:${t.font};cursor:${pr=>pr.$disabled?'default':'pointer'};
  transition:all ${t.tr};opacity:${pr=>pr.$disabled?0.3:1};
  &:hover{${pr=>!pr.$disabled&&`border-color:${t.goldBorder};color:${t.gold};background:${t.goldDim};`}}
`
const PreviewNavCounter = styled.span`
  font-size:10px;font-weight:700;color:${t.textDim};
`

const MobilePreviewCard = memo(forwardRef<HTMLDivElement, MobilePreviewProps>(
  function MobilePreviewCard({ plot, allSorted, onExpand, onShare, onClose, isFav, onToggleFav, isCompared, onToggleCompare, onNavigate }, ref) {
    const d = p(plot), score = calcScore(plot), grade = getGrade(score)
    const plotIdx = allSorted.findIndex(pl => pl.id === plot.id)
    const hasPrev = plotIdx > 0
    const hasNext = plotIdx >= 0 && plotIdx < allSorted.length - 1
    const goPrev = useCallback(() => { if (hasPrev && onNavigate) onNavigate(allSorted[plotIdx - 1]) }, [hasPrev, onNavigate, allSorted, plotIdx])
    const goNext = useCallback(() => { if (hasNext && onNavigate) onNavigate(allSorted[plotIdx + 1]) }, [hasNext, onNavigate, allSorted, plotIdx])
    const insight = calcQuickInsight(plot, allSorted)
    const pp = pricePosition(plot, allSorted)
    const dom = daysOnMarket(d.created)
    const demand = estimateDemand(plot, allSorted)

    // Calculate "vs city average" stats for quick comparison
    const cityPlots = allSorted.filter(pl => pl.city === plot.city && pl.id !== plot.id)
    const cityAvgPrice = cityPlots.length > 0 ? cityPlots.reduce((s, pl) => s + p(pl).price, 0) / cityPlots.length : 0
    const cityAvgScore = cityPlots.length > 0 ? cityPlots.reduce((s, pl) => s + calcScore(pl), 0) / cityPlots.length : 0
    const cityAvgPps = (() => {
      const ppsList = cityPlots.map(pricePerSqm).filter(v => v > 0)
      return ppsList.length > 0 ? ppsList.reduce((s, v) => s + v, 0) / ppsList.length : 0
    })()
    const plotPps = pricePerSqm(plot)
    const priceDiffPct = cityAvgPrice > 0 ? Math.round(((d.price - cityAvgPrice) / cityAvgPrice) * 100) : 0
    const ppsDiffPct = cityAvgPps > 0 && plotPps > 0 ? Math.round(((plotPps - cityAvgPps) / cityAvgPps) * 100) : 0
    const scoreDiff = cityAvgScore > 0 ? Math.round((score - cityAvgScore) * 10) / 10 : 0

    return (
      <MobilePreview $show ref={ref}>
        <PreviewHandle />
        <PreviewBody>
          {/* Prev / Next navigation */}
          {allSorted.length > 1 && (
            <PreviewNavRow>
              <PreviewNavBtn $disabled={!hasPrev} onClick={goPrev} aria-label="חלקה קודמת">
                <ChevronLeft size={14} style={{ transform: 'rotate(180deg)' }} /> הקודמת
              </PreviewNavBtn>
              <PreviewNavCounter>{plotIdx + 1} / {allSorted.length}</PreviewNavCounter>
              <PreviewNavBtn $disabled={!hasNext} onClick={goNext} aria-label="חלקה הבאה">
                הבאה <ChevronLeft size={14} />
              </PreviewNavBtn>
            </PreviewNavRow>
          )}
          <PreviewTopRow>
            <PreviewInfo>
              <PreviewTitle>גוש {d.block} · חלקה {plot.number}</PreviewTitle>
              <PreviewCity>
                <MapIcon size={12} /> {plot.city}
                {dom && <DaysOnMarketBadge $c={dom.color}>🕐 {dom.label}</DaysOnMarketBadge>}
                {pp && (
                  <PricePositionBadge $color={pp.color}>
                    {pp.direction === 'below' ? <TrendingDown size={10} /> : pp.direction === 'above' ? <TrendingUp size={10} /> : <Minus size={10} />}
                    {pp.label}
                  </PricePositionBadge>
                )}
              </PreviewCity>
            </PreviewInfo>
            <PreviewPrice>{fmt.compact(d.price)}</PreviewPrice>
          </PreviewTopRow>
          <PreviewMetaRow>
            <PreviewScore $c={grade.color}>
              ציון השקעה: {score}/10 — {grade.grade}
            </PreviewScore>
            {demand.viewers >= 15 && (
              <DemandBadge $c={demand.color}>
                👁 ~{demand.label}
                {demand.intensity === 'hot' && ' 🔥'}
              </DemandBadge>
            )}
          </PreviewMetaRow>
          {/* Vs City Average — compact comparison grid */}
          {cityPlots.length >= 2 && (
            <PreviewCompareGrid>
              <PreviewCompareStat>
                <PreviewCompareVal $c={priceDiffPct <= 0 ? t.ok : t.err}>
                  {priceDiffPct > 0 ? '+' : ''}{priceDiffPct}%
                </PreviewCompareVal>
                <PreviewCompareLabel>מחיר vs ממוצע</PreviewCompareLabel>
              </PreviewCompareStat>
              <PreviewCompareStat>
                <PreviewCompareVal $c={ppsDiffPct <= 0 ? t.ok : t.err}>
                  {ppsDiffPct > 0 ? '+' : ''}{ppsDiffPct}%
                </PreviewCompareVal>
                <PreviewCompareLabel>₪/מ״ר vs ממוצע</PreviewCompareLabel>
              </PreviewCompareStat>
              <PreviewCompareStat>
                <PreviewCompareVal $c={scoreDiff >= 0 ? t.ok : t.err}>
                  {scoreDiff > 0 ? '+' : ''}{scoreDiff}
                </PreviewCompareVal>
                <PreviewCompareLabel>ציון vs ממוצע</PreviewCompareLabel>
              </PreviewCompareStat>
            </PreviewCompareGrid>
          )}
          {/* Quick investment insight */}
          {insight.priority >= 4 && (
            <PreviewInsightChip $c={insight.color}>
              {insight.emoji} {insight.text}
            </PreviewInsightChip>
          )}
          <PreviewActions>
            <PreviewDetailBtn onClick={onExpand}>
              <ChevronLeft size={16} /> פרטים מלאים
            </PreviewDetailBtn>
            <PreviewQuickActions>
              <PreviewQuickBtn onClick={() => onShare(plot)} aria-label="שתף חלקה" title="שתף">
                <Share2 size={16} />
              </PreviewQuickBtn>
              <PreviewQuickBtn $active={isFav} $color="#EF4444" onClick={onToggleFav}
                aria-label={isFav ? 'הסר מהמועדפים' : 'הוסף למועדפים'} title="מועדפים">
                <Heart size={16} fill={isFav ? '#EF4444' : 'none'} />
              </PreviewQuickBtn>
              <PreviewQuickBtn $active={isCompared} $color={t.info} onClick={onToggleCompare}
                aria-label={isCompared ? 'הסר מהשוואה' : 'הוסף להשוואה'} title="השוואה">
                <GitCompareArrows size={16} />
              </PreviewQuickBtn>
            </PreviewQuickActions>
            <PreviewCloseBtn onClick={onClose} aria-label="סגור">
              <X size={18} />
            </PreviewCloseBtn>
          </PreviewActions>
        </PreviewBody>
      </MobilePreview>
    )
  }
))

/* ── Recently Viewed Widget (desktop only, shown below city market card) ── */
const RecentlyViewedWidget = memo(function RecentlyViewedWidget({
  recentIds, plots, onSelect,
}: { recentIds: string[]; plots: Plot[]; onSelect: (pl: Plot) => void }) {
  const [collapsed, setCollapsed] = useState(false)
  const recentPlots = useMemo(() => {
    if (recentIds.length === 0) return []
    return recentIds
      .map(id => plots.find(pl => pl.id === id))
      .filter((pl): pl is Plot => !!pl)
      .slice(0, 5)
  }, [recentIds, plots])

  if (recentPlots.length === 0) return null

  return (
    <RecentPill>
      <RecentPillHeader>
        <RecentPillTitle><Clock size={11} color={t.gold} /> נצפו לאחרונה</RecentPillTitle>
        <RecentPillToggle onClick={() => setCollapsed(c => !c)}>
          {collapsed ? 'הצג' : 'הסתר'}
        </RecentPillToggle>
      </RecentPillHeader>
      {!collapsed && recentPlots.map(pl => {
        const d = p(pl)
        return (
          <RecentPillItem key={pl.id} onClick={() => onSelect(pl)}>
            <RecentPillName>גוש {d.block} · {pl.number}</RecentPillName>
            <RecentPillPrice>{fmt.compact(d.price)}</RecentPillPrice>
          </RecentPillItem>
        )
      })}
    </RecentPill>
  )
})

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFiltersRaw] = useState<Filters>(() => filtersFromParams(searchParams))
  const [selected, setSelected] = useState<Plot | null>(null)
  const [leadPlot, setLeadPlot] = useState<Plot | null>(null)
  const [tab, setTab] = useState<'map'|'fav'|'areas'>('map')
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    const s = searchParams.get('sort')
    return (s && SORT_OPTIONS.some(o => o.key === s) ? s : 'recommended') as SortKey
  })
  const [sortOpen, setSortOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const { isFav, toggle: rawToggleFav, ids: favIds } = useFavorites()
  const { ids: compareIds, toggle: rawToggleCompare, clear: clearCompare, has: isCompared } = useCompare()
  const { toast } = useToast()
  const sortRef = useRef<HTMLDivElement>(null)
  const userGeo = useUserLocation()
  const { online, wasOffline } = useOnlineStatus()
  const sse = useSSE()
  const isMobile = useIsMobile()
  const recentlyViewed = useRecentlyViewed()
  const dataFreshness = useDataFreshness()
  const [mobileExpanded, setMobileExpanded] = useState(false)
  const [mapFullscreen, setMapFullscreen] = useState(false)
  const [cityCompOpen, setCityCompOpen] = useState(false)
  const toggleFullscreen = useCallback(() => setMapFullscreen(f => !f), [])
  const [visibleInViewport, setVisibleInViewport] = useState<number | null>(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [areaBounds, setAreaBounds] = useState<MapBounds | null>(null)

  // API filters + data fetch — MUST come before any useMemo that depends on `plots`
  const apiFilters = useMemo(() => {
    const f: Record<string, string> = {}
    if (filters.city && filters.city !== 'all') f.city = filters.city
    if (filters.priceMin) f.priceMin = filters.priceMin
    if (filters.priceMax) f.priceMax = filters.priceMax
    if (filters.zoning) f.zoning = filters.zoning
    return f
  }, [filters.city, filters.priceMin, filters.priceMax, filters.zoning])

  const { data: plots = [], isLoading } = useAllPlots(apiFilters)
  const dSearch = useDebounce(filters.search, 300)

  // SSE real-time update notifications
  const lastSseEvent = sse.lastEvent
  useEffect(() => {
    if (!lastSseEvent) return
    const eventType = lastSseEvent.type
    if (eventType === 'plot_created') {
      toast('🆕 חלקה חדשה נוספה למפה!', 'success')
    } else if (eventType === 'price_change') {
      toast('💰 עדכון מחיר — הנתונים מתעדכנים', 'info')
    } else if (eventType === 'plot_updated') {
      toast('🔄 נתוני חלקה עודכנו', 'info')
    }
  }, [lastSseEvent, toast])

  // Wrap favorites/compare toggles with toast feedback
  const toggle = useCallback((id: string) => {
    const wasFav = isFav(id)
    rawToggleFav(id)
    toast(wasFav ? 'הוסר מהמועדפים' : '❤️ נוסף למועדפים', wasFav ? 'info' : 'success')
  }, [rawToggleFav, isFav, toast])

  const toggleCompare = useCallback((id: string) => {
    const wasCompared = isCompared(id)
    rawToggleCompare(id)
    toast(wasCompared ? 'הוסר מההשוואה' : '⚖️ נוסף להשוואה', wasCompared ? 'info' : 'success')
  }, [rawToggleCompare, isCompared, toast])

  // Sync filters → URL params (debounced to avoid spam)
  const setFilters = useCallback((f: Filters) => {
    setFiltersRaw(f)
    const sp = filtersToParams(f)
    if (sortKey !== 'recommended') sp.set('sort', sortKey)
    setSearchParams(sp, { replace: true })
  }, [sortKey, setSearchParams])

  // Sync sort → URL params
  const setSortWithUrl = useCallback((key: SortKey) => {
    // Auto-request geolocation when switching to "nearest" sort
    if (key === 'nearest' && !userGeo.location && !userGeo.loading) {
      userGeo.request()
    }
    setSortKey(key)
    const sp = filtersToParams(filters)
    if (key !== 'recommended') sp.set('sort', key)
    setSearchParams(sp, { replace: true })
  }, [filters, setSearchParams, userGeo])

  // Auto-select plot from URL param (e.g. from PlotDetail "View on Map" button)
  useEffect(() => {
    const plotId = searchParams.get('plotId')
    if (plotId && plots.length > 0 && !selected) {
      const targetPlot = plots.find(pl => pl.id === plotId)
      if (targetPlot) {
        selectPlot(targetPlot)
        // Remove plotId from URL to avoid re-selecting on filter changes
        const sp = new URLSearchParams(searchParams)
        sp.delete('plotId')
        setSearchParams(sp, { replace: true })
      }
    }
  }, [plots, searchParams])

  const filtered = useMemo(() => {
    let list = plots
    const sMin = Number(filters.sizeMin), sMax = Number(filters.sizeMax)
    if (sMin > 0) list = list.filter(pl => p(pl).size >= sMin)
    if (sMax > 0) list = list.filter(pl => p(pl).size <= sMax)
    if (dSearch) {
      const q = dSearch.toLowerCase()
      list = list.filter(pl => pl.city?.toLowerCase().includes(q) || pl.number?.includes(q) || String(p(pl).block).includes(q))
    }
    // ROI minimum filter
    const minRoiVal = Number(filters.minRoi)
    if (minRoiVal > 0) {
      list = list.filter(pl => roi(pl) >= minRoiVal)
    }
    // Readiness / ripeness filter
    if (filters.ripeness === 'high') {
      list = list.filter(pl => calcScore(pl) >= 7)
    } else if (filters.ripeness === 'medium') {
      list = list.filter(pl => { const s = calcScore(pl); return s >= 4 && s <= 6 })
    } else if (filters.ripeness === 'low') {
      list = list.filter(pl => calcScore(pl) < 4)
    }
    // Below average price-per-sqm filter
    if (filters.belowAvg === 'true' && list.length > 1) {
      const ppsList = list.map(pricePerSqm).filter(v => v > 0)
      if (ppsList.length > 0) {
        const avgPps = ppsList.reduce((s, v) => s + v, 0) / ppsList.length
        list = list.filter(pl => { const pps = pricePerSqm(pl); return pps > 0 && pps < avgPps })
      }
    }
    // "Search in this area" — map bounds filter
    if (areaBounds) {
      list = list.filter(pl => {
        const c = plotCenter(pl.coordinates)
        if (!c) return false
        return c.lat >= areaBounds.south && c.lat <= areaBounds.north &&
               c.lng >= areaBounds.west && c.lng <= areaBounds.east
      })
    }
    return list
  }, [plots, filters.sizeMin, filters.sizeMax, filters.belowAvg, filters.minRoi, filters.ripeness, dSearch, areaBounds])

  const sorted = useMemo(() => sortPlots(filtered, sortKey, userGeo.location), [filtered, sortKey, userGeo.location])

  // ── Computed stats ──
  const avg = useMemo(() => filtered.length ? filtered.reduce((s, pl) => s + p(pl).price, 0) / filtered.length : 0, [filtered])

  // City market summary stats (shown when a city filter is active)
  const cityMarketStats = useMemo(() => {
    const city = filters.city && filters.city !== 'all' ? filters.city : null
    if (!city || filtered.length === 0) return null
    const prices = filtered.map(pl => p(pl).price).filter(v => v > 0)
    const sizes = filtered.map(pl => p(pl).size).filter(v => v > 0)
    const scores = filtered.map(pl => calcScore(pl))
    const avgScore = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0
    const minPrice = prices.length ? Math.min(...prices) : 0
    const maxPrice = prices.length ? Math.max(...prices) : 0
    const avgSize = sizes.length ? sizes.reduce((s, v) => s + v, 0) / sizes.length : 0

    // Price distribution histogram (5 buckets)
    let priceBuckets: { label: string; count: number; pct: number }[] = []
    if (prices.length >= 3 && maxPrice > minPrice) {
      const range = maxPrice - minPrice
      const bucketSize = range / 5
      const buckets = [0, 0, 0, 0, 0]
      for (const pr of prices) {
        const idx = Math.min(4, Math.floor((pr - minPrice) / bucketSize))
        buckets[idx]++
      }
      const maxBucket = Math.max(...buckets, 1)
      priceBuckets = buckets.map((count, i) => ({
        label: fmt.compact(Math.round(minPrice + bucketSize * i)),
        count,
        pct: Math.round((count / maxBucket) * 100),
      }))
    }

    return {
      city,
      count: filtered.length,
      avgPrice: avg,
      minPrice,
      maxPrice,
      avgScore: Math.round(avgScore * 10) / 10,
      avgSize: Math.round(avgSize),
      priceBuckets,
    }
  }, [filters.city, filtered, avg])

  // City comparison data — deferred: only compute when panel is open (expensive O(n) with findBestValueIds)
  const cityComparisonData = useMemo(() => {
    if (!cityCompOpen || plots.length < 2) return []
    const byCity = new Map<string, Plot[]>()
    for (const pl of plots) {
      if (!pl.city) continue
      const arr = byCity.get(pl.city) || []
      arr.push(pl)
      byCity.set(pl.city, arr)
    }
    const bestValueIds = findBestValueIds(plots)
    return [...byCity.entries()]
      .filter(([, pls]) => pls.length > 0)
      .map(([city, pls]) => {
        const prices = pls.map(pl => p(pl).price).filter(v => v > 0)
        const scores = pls.map(calcScore)
        const avgScore = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0
        const avgPrice = prices.length ? prices.reduce((s, v) => s + v, 0) / prices.length : 0
        const ppsList = pls.map(pricePerSqm).filter(v => v > 0)
        const avgPps = ppsList.length ? ppsList.reduce((s, v) => s + v, 0) / ppsList.length : 0
        const ppdList = pls.map(pricePerDunam).filter(v => v > 0)
        const avgPpd = ppdList.length ? ppdList.reduce((s, v) => s + v, 0) / ppdList.length : 0
        const bestCount = pls.filter(pl => bestValueIds.has(pl.id)).length
        return { city, count: pls.length, avgPrice, avgScore: Math.round(avgScore * 10) / 10, avgPps: Math.round(avgPps), avgPpd: Math.round(avgPpd), bestCount }
      })
      .sort((a, b) => b.avgScore - a.avgScore)
  }, [plots, cityCompOpen])
  // Quick city count for button visibility (cheap: just count unique cities)
  const hasMutipleCities = useMemo(() => {
    if (plots.length < 2) return false
    const first = plots[0]?.city
    return plots.some(pl => pl.city !== first)
  }, [plots])

  // Portfolio quality score (weighted avg of all visible plot scores)
  const portfolioQuality = useMemo(() => {
    if (filtered.length === 0) return null
    const scores = filtered.map(calcScore)
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length
    const grade = getGrade(avg)
    return { avg: Math.round(avg * 10) / 10, grade, pct: Math.round((avg / 10) * 100) }
  }, [filtered])

  // Stats bar aggregated values (memoized to avoid recomputing in render)
  const statsBarData = useMemo(() => {
    const prices = filtered.map(pl => p(pl).price).filter(v => v > 0)
    const minPrice = prices.length ? Math.min(...prices) : 0
    const maxPrice = prices.length ? Math.max(...prices) : 0
    const rois = filtered.map(pl => roi(pl)).filter(v => v > 0)
    const avgRoi = rois.length ? Math.round(rois.reduce((s, v) => s + v, 0) / rois.length) : 0
    return { prices, minPrice, maxPrice, avgRoi }
  }, [filtered])

  // Total portfolio value — aggregate of all visible plots
  const totalPortfolioValue = useMemo(() => {
    return filtered.reduce((s, pl) => s + p(pl).price, 0)
  }, [filtered])

  // Market momentum — ratio of below-average-priced plots to detect buyer's/seller's market
  const marketMomentum = useMemo(() => {
    if (filtered.length < 3) return null
    const ppsList = filtered.map(pricePerSqm).filter(v => v > 0)
    if (ppsList.length < 3) return null
    const avgPps = ppsList.reduce((s, v) => s + v, 0) / ppsList.length
    const belowCount = ppsList.filter(v => v < avgPps).length
    const ratio = belowCount / ppsList.length
    if (ratio >= 0.6) return { label: 'שוק קונים 🟢', color: t.ok, tip: `${Math.round(ratio * 100)}% מהחלקות מתחת לממוצע — הזדמנות לקונים` }
    if (ratio <= 0.35) return { label: 'שוק פרימיום 🔴', color: t.err, tip: `${Math.round((1 - ratio) * 100)}% מהחלקות מעל הממוצע — שוק יקר` }
    return { label: 'שוק מאוזן 🟡', color: t.warn, tip: 'פיזור מחירים מאוזן — שוק יציב' }
  }, [filtered])

  // Market Insights for the ticker
  const marketInsights = useMemo(() => {
    const cityName = filters.city && filters.city !== 'all' ? filters.city : undefined
    return generateMarketInsights(filtered, cityName)
  }, [filtered, filters.city])

  // InsightsTicker state is now managed inside InsightsTickerWidget (memoized)

  // Compact filter summary text (shown as a strip below breadcrumbs when filters are active)
  const filterSummaryText = useMemo(() => {
    const parts: string[] = []
    if (filters.priceMin && Number(filters.priceMin) > 0) parts.push(`מ-${fmt.short(Number(filters.priceMin))}`)
    if (filters.priceMax && Number(filters.priceMax) > 0) parts.push(`עד ${fmt.short(Number(filters.priceMax))}`)
    if (filters.sizeMin && Number(filters.sizeMin) > 0) parts.push(`${Number(filters.sizeMin).toLocaleString()}+ מ״ר`)
    if (filters.sizeMax && Number(filters.sizeMax) > 0) parts.push(`עד ${Number(filters.sizeMax).toLocaleString()} מ״ר`)
    if (filters.zoning) {
      const z = filters.zoning
      const label: Record<string, string> = { AGRICULTURAL: 'חקלאית', MASTER_PLAN_DEPOSIT: 'הפקדת מתאר', MASTER_PLAN_APPROVED: 'מתאר מאושרת', DETAILED_PLAN_PREP: 'הכנת מפורטת', DETAILED_PLAN_APPROVED: 'מפורטת מאושרת', BUILDING_PERMIT: 'היתר בנייה' }
      parts.push(label[z] || z)
    }
    if (filters.minRoi && Number(filters.minRoi) > 0) parts.push(`ROI ${filters.minRoi}%+`)
    if (filters.ripeness === 'high') parts.push('ציון גבוה')
    else if (filters.ripeness === 'medium') parts.push('ציון בינוני')
    else if (filters.ripeness === 'low') parts.push('ציון נמוך')
    if (filters.belowAvg === 'true') parts.push('מתחת לממוצע')
    return parts.length > 0 ? parts.join(' · ') : null
  }, [filters])

  // Dynamic document title + meta description based on active city filter
  const exploreTitle = useMemo(() => {
    const city = filters.city && filters.city !== 'all' ? filters.city : null
    const count = filtered.length
    if (city) return `${count} חלקות ב${city} — מפת קרקעות`
    return `${count} חלקות להשקעה — מפה אינטראקטיבית`
  }, [filters.city, filtered.length])
  useDocumentTitle(exploreTitle)
  const exploreDesc = useMemo(() => {
    const city = filters.city && filters.city !== 'all' ? filters.city : null
    const count = filtered.length
    if (city && avg > 0) return `${count} חלקות קרקע להשקעה ב${city}. מחיר ממוצע ${fmt.compact(Math.round(avg))}. מפה אינטראקטיבית עם ניתוח AI ותחזיות תשואה.`
    return `${count} חלקות קרקע להשקעה בישראל. מפה אינטראקטיבית, סינון מתקדם, ניתוח AI וציוני השקעה.`
  }, [filters.city, filtered.length, avg])
  useMetaDescription(exploreDesc)

  // Data source for badge
  const dataSource = useMemo(() => {
    try { return sessionStorage.getItem('data_source') || 'demo' } catch { return 'demo' }
  }, [plots])

  // "Search in this area" handler
  const handleSearchInArea = useCallback((bounds: MapBounds) => {
    setAreaBounds(bounds)
  }, [])

  const clearAreaBounds = useCallback(() => {
    setAreaBounds(null)
  }, [])

  const hasActiveFilters = useMemo(() =>
    Object.entries(filters).some(([, v]) => v && v !== 'all') || !!areaBounds, [filters, areaBounds])

  const resetFilters = useCallback(() => {
    setFilters(DEFAULTS)
    setAreaBounds(null)
  }, [setFilters])

  // Select plot + track recently viewed
  const selectPlot = useCallback((pl: Plot | null) => {
    setSelected(pl)
    setMobileExpanded(false) // Reset to preview mode on new selection
    if (pl) recentlyViewed.add(pl.id)
  }, [recentlyViewed])

  // Share plot via Web Share API with clipboard fallback
  const sharePlot = useCallback(async (plot: Plot) => {
    const d = p(plot)
    const url = `${window.location.origin}/plot/${plot.id}`
    const title = `חלקה ${plot.number} גוש ${d.block} — ${plot.city}`
    const text = `${title}\n${fmt.compact(d.price)} · ${fmt.dunam(d.size)} דונם · ציון ${calcScore(plot)}/10`

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        toast('🔗 שותף בהצלחה', 'success')
        return
      } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') return // user cancelled
      }
    }
    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      toast('📋 הקישור הועתק ללוח', 'success')
    } catch {
      toast('לא ניתן להעתיק', 'info')
    }
  }, [toast])

  // Mobile preview swipe-to-dismiss
  const previewRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!selected || mobileExpanded || !previewRef.current) return
    const el = previewRef.current
    let startY = 0, currentY = 0, isDragging = false
    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY; currentY = startY; isDragging = true
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging) return
      currentY = e.touches[0].clientY
      const dy = currentY - startY
      if (dy > 0) { // only allow downward swipe
        el.style.transform = `translateY(${Math.min(dy, 250)}px)`
        el.style.opacity = `${Math.max(0.3, 1 - dy / 300)}`
        el.style.transition = 'none'
      }
    }
    const onTouchEnd = () => {
      if (!isDragging) return
      isDragging = false
      const dy = currentY - startY
      el.style.transition = ''
      el.style.opacity = ''
      if (dy > 100) {
        el.style.transform = 'translateY(120%)'
        setTimeout(() => { setSelected(null); if (el) { el.style.transform = '' } }, 200)
      } else {
        el.style.transform = ''
      }
    }
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [selected, mobileExpanded])

  // OG + Twitter meta — updates on every title/desc change
  useEffect(() => {
    // Helper to upsert meta tag
    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
      el.content = content
    }

    // Open Graph tags for social sharing (title/desc managed by hooks above)
    setMeta('property', 'og:title', exploreTitle)
    setMeta('property', 'og:description', exploreDesc)
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:url', window.location.href)
    setMeta('property', 'og:site_name', 'LandMap Israel')
    setMeta('property', 'og:locale', 'he_IL')

    // Twitter Card meta
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', exploreTitle)
    setMeta('name', 'twitter:description', exploreDesc)
  }, [exploreTitle, exploreDesc])

  // Canonical URL — only depends on city filter, stable across result count changes
  useEffect(() => {
    const cityLabel = filters.city && filters.city !== 'all' ? filters.city : ''
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    const canonicalUrl = `${window.location.origin}/explore${cityLabel ? `?city=${encodeURIComponent(cityLabel)}` : ''}`
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical) }
    canonical.href = canonicalUrl

    return () => { canonical?.remove() }
  }, [filters.city])

  // JSON-LD structured data for SEO (RealEstateListing + ItemList)
  useEffect(() => {
    const scriptId = 'landmap-jsonld'
    let el = document.getElementById(scriptId) as HTMLScriptElement | null
    if (!el) {
      el = document.createElement('script')
      el.id = scriptId
      el.type = 'application/ld+json'
      document.head.appendChild(el)
    }
    const cityLabel = filters.city && filters.city !== 'all' ? filters.city : 'ישראל'
    const listings = filtered.slice(0, 10).map((pl, i) => {
      const d = p(pl)
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'RealEstateListing',
          name: `חלקה ${pl.number} גוש ${d.block} — ${pl.city}`,
          description: `קרקע להשקעה ב${pl.city}, ${fmt.dunam(d.size)} דונם, ציון השקעה ${calcScore(pl)}/10`,
          url: `${window.location.origin}/plot/${pl.id}`,
          ...(d.price > 0 ? { offers: { '@type': 'Offer', price: d.price, priceCurrency: 'ILS', availability: 'https://schema.org/InStock' } } : {}),
        },
      }
    })
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `חלקות קרקע להשקעה ב${cityLabel}`,
      description: `${filtered.length} חלקות קרקע להשקעה ב${cityLabel} — ניתוח AI, מפה אינטראקטיבית, נתוני שוק`,
      numberOfItems: filtered.length,
      itemListElement: listings,
    }
    el.textContent = JSON.stringify(jsonLd)
    return () => { el?.remove() }
  }, [filtered, filters.city])

  // Schema.org BreadcrumbList for SEO (like Madlan)
  useEffect(() => {
    const bcId = 'landmap-breadcrumb-ld'
    let el = document.getElementById(bcId) as HTMLScriptElement | null
    if (!el) {
      el = document.createElement('script')
      el.id = bcId
      el.type = 'application/ld+json'
      document.head.appendChild(el)
    }
    const cityLabel = filters.city && filters.city !== 'all' ? filters.city : ''
    const items: Record<string, unknown>[] = [
      { '@type': 'ListItem', position: 1, name: 'ראשי', item: window.location.origin },
      { '@type': 'ListItem', position: 2, name: 'חלקות להשקעה', item: `${window.location.origin}/explore` },
    ]
    if (cityLabel) {
      items.push({ '@type': 'ListItem', position: 3, name: cityLabel, item: `${window.location.origin}/explore?city=${encodeURIComponent(cityLabel)}` })
    }
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items,
    })
    return () => { el?.remove() }
  }, [filters.city])

  // Close sort dropdown on click outside
  useEffect(() => {
    if (!sortOpen) return
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [sortOpen])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Escape') {
        if (shortcutsOpen) { setShortcutsOpen(false); return }
        if (mapFullscreen) { setMapFullscreen(false); return }
        if (sortOpen) setSortOpen(false)
        else if (selected) setSelected(null)
        else if (listOpen) setListOpen(false)
      }
      // '?' key to show keyboard shortcuts help
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setShortcutsOpen(o => !o)
        return
      }
      // '/' key to focus search input
      if (e.key === '/') {
        e.preventDefault()
        const searchEl = document.getElementById('landmap-search-input') as HTMLInputElement | null
        if (searchEl) searchEl.focus()
        return
      }
      // 'F' key to toggle fullscreen map mode
      if (e.key === 'f' || e.key === 'F') {
        setMapFullscreen(f => !f)
      }
      // 'L' key to toggle list panel
      if (e.key === 'l' || e.key === 'L') {
        setListOpen(o => !o)
      }
      // 'S' key to share selected plot
      if ((e.key === 's' || e.key === 'S') && selected) {
        e.preventDefault()
        sharePlot(selected)
      }
      // Arrow keys to navigate between plots when sidebar is open
      if (selected && sorted.length > 1) {
        const idx = sorted.findIndex(pl => pl.id === selected.id)
        if (idx < 0) return
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          const next = (idx + 1) % sorted.length
          selectPlot(sorted[next])
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          const prev = (idx - 1 + sorted.length) % sorted.length
          selectPlot(sorted[prev])
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selected, sortOpen, listOpen, sorted, selectPlot, shortcutsOpen, mapFullscreen, sharePlot])

  return (
    <Wrap className="dark" aria-label="מפת חלקות להשקעה">
      <SkipLink href="#landmap-map-region">דלג לתוכן המפה</SkipLink>
      <ErrorBoundary>
        <NetworkBanner online={online} wasOffline={wasOffline} onRetry={() => window.location.reload()} />
        {dataSource === 'demo' && !isLoading && online && (
          <DemoModeBanner onRetry={() => window.location.reload()} />
        )}
        {/* Stale data banner — show when data is > 5 min old and not in demo mode */}
        {!isLoading && dataSource === 'api' && dataFreshness.lastFetched &&
         (Date.now() - dataFreshness.lastFetched > 5 * 60 * 1000) && (
          <StaleDataBanner
            age={dataFreshness.relativeTime}
            onRefresh={() => window.location.reload()}
          />
        )}
        <TopProgress $show={isLoading} />
        {isLoading && <ExploreLoadingSkeleton />}
        <div id="landmap-map-region" />
        <MapArea
          plots={sorted} pois={pois} selected={selected} darkMode
          onSelect={selectPlot} onLead={setLeadPlot}
          favorites={{ isFav, toggle }}
          compare={{ has: isCompared, toggle: toggleCompare }}
          filterCity={filters.city}
          fullscreen={mapFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onVisiblePlotsChange={setVisibleInViewport}
          onSearchInArea={handleSearchInArea}
          areaSearchActive={!!areaBounds}
        />
        {!mapFullscreen && <FilterBar filters={filters} onChange={setFilters} resultCount={filtered.length}
          plots={plots} onSelectPlot={(id) => { const pl = plots.find(pp => pp.id === id); if (pl) selectPlot(pl) }} />}

        {/* Visual Breadcrumb Navigation (like Madlan) */}
        {!mapFullscreen && !isLoading && filtered.length > 0 && (
          <BreadcrumbBar aria-label="ניווט מיקום">
            <BreadcrumbLink to="/"><Home size={12} /></BreadcrumbLink>
            <BreadcrumbSep>›</BreadcrumbSep>
            {filters.city && filters.city !== 'all' ? (
              <>
                <BreadcrumbLink to="/explore">חלקות להשקעה</BreadcrumbLink>
                <BreadcrumbSep>›</BreadcrumbSep>
                <BreadcrumbCurrent>{filters.city} ({filtered.length})</BreadcrumbCurrent>
              </>
            ) : (
              <BreadcrumbCurrent>חלקות להשקעה ({filtered.length})</BreadcrumbCurrent>
            )}
          </BreadcrumbBar>
        )}

        {/* Active Filter Summary Strip (compact at-a-glance view of non-city filters) */}
        {!mapFullscreen && !isLoading && filterSummaryText && (
          <FilterSummaryStrip>
            <FilterStripLabel>🔍 סינון:</FilterStripLabel>
            <FilterStripValue>{filterSummaryText}</FilterStripValue>
            <FilterStripClear onClick={resetFilters} aria-label="נקה סינון" title="נקה הכל">
              <X size={10} />
            </FilterStripClear>
          </FilterSummaryStrip>
        )}

        {/* Area bounds filter chip */}
        {!mapFullscreen && areaBounds && !isLoading && (
          <AreaBoundsChip>
            <MapPin size={12} color={t.gold} />
            <AreaBoundsLabel>חיפוש באזור המפה</AreaBoundsLabel>
            <AreaBoundsCount>({filtered.length})</AreaBoundsCount>
            <AreaBoundsClose onClick={clearAreaBounds} aria-label="נקה חיפוש אזורי">
              <X size={10} />
            </AreaBoundsClose>
          </AreaBoundsChip>
        )}

        {/* City Market Summary Card (shown when filtering by city) */}
        {!mapFullscreen && cityMarketStats && !isLoading && (
          <CityMarketCard>
            <CityMarketTitle>
              <BarChart3 size={16} color={t.gold} />
              שוק {cityMarketStats.city}
            </CityMarketTitle>
            <CityMarketGrid>
              <CityMarketStat>
                <CityMarketStatVal>{cityMarketStats.count}</CityMarketStatVal>
                <CityMarketStatLabel>חלקות</CityMarketStatLabel>
              </CityMarketStat>
              <CityMarketStat>
                <CityMarketStatVal>{fmt.compact(Math.round(cityMarketStats.avgPrice))}</CityMarketStatVal>
                <CityMarketStatLabel>מחיר ממוצע</CityMarketStatLabel>
              </CityMarketStat>
              <CityMarketStat>
                <CityMarketStatVal $c={cityMarketStats.avgScore >= 7 ? t.ok : cityMarketStats.avgScore >= 5 ? t.warn : t.err}>
                  {cityMarketStats.avgScore}
                </CityMarketStatVal>
                <CityMarketStatLabel>ציון ממוצע</CityMarketStatLabel>
              </CityMarketStat>
              <CityMarketStat>
                <CityMarketStatVal style={{fontSize:11}}>{fmt.compact(cityMarketStats.minPrice)}–{fmt.compact(cityMarketStats.maxPrice)}</CityMarketStatVal>
                <CityMarketStatLabel>טווח מחירים</CityMarketStatLabel>
              </CityMarketStat>
            </CityMarketGrid>
            {/* Price distribution mini-histogram */}
            {cityMarketStats.priceBuckets.length > 0 && (
              <HistogramWrap>
                <HistogramTitle>📊 התפלגות מחירים</HistogramTitle>
                <HistogramBars>
                  {cityMarketStats.priceBuckets.map((b, i) => (
                    <HistogramBarCol key={i}>
                      <HistogramBar $h={b.pct} $intensity={b.pct >= 80 ? 'high' : b.pct >= 40 ? 'mid' : 'low'} />
                      {b.count > 0 && <HistogramBarCount>{b.count}</HistogramBarCount>}
                    </HistogramBarCol>
                  ))}
                </HistogramBars>
                <HistogramLabels>
                  <HistogramLabel>{fmt.compact(cityMarketStats.minPrice)}</HistogramLabel>
                  <HistogramLabel>{fmt.compact(cityMarketStats.maxPrice)}</HistogramLabel>
                </HistogramLabels>
              </HistogramWrap>
            )}
          </CityMarketCard>
        )}

        {/* Mobile City Market Strip — compact horizontal summary for mobile users */}
        {!mapFullscreen && cityMarketStats && !isLoading && (
          <MobileCityStrip aria-label={`סיכום שוק ${cityMarketStats.city}`}>
            <MobileCityStat>
              <BarChart3 size={12} color={t.gold} />
              <MobileCityVal>{cityMarketStats.city}</MobileCityVal>
            </MobileCityStat>
            <MobileCitySep />
            <MobileCityStat>
              <MobileCityVal>{cityMarketStats.count}</MobileCityVal>
              <MobileCityLabel>חלקות</MobileCityLabel>
            </MobileCityStat>
            <MobileCitySep />
            <MobileCityStat>
              <MobileCityLabel>ממוצע</MobileCityLabel>
              <MobileCityVal>{fmt.compact(Math.round(cityMarketStats.avgPrice))}</MobileCityVal>
            </MobileCityStat>
            <MobileCitySep />
            <MobileCityStat>
              <MobileCityLabel>ציון</MobileCityLabel>
              <MobileCityVal $c={cityMarketStats.avgScore >= 7 ? t.ok : cityMarketStats.avgScore >= 5 ? t.warn : t.err}>
                {cityMarketStats.avgScore}
              </MobileCityVal>
            </MobileCityStat>
            <MobileCitySep />
            <MobileCityStat>
              <MobileCityVal style={{fontSize:10}}>{fmt.compact(cityMarketStats.minPrice)}–{fmt.compact(cityMarketStats.maxPrice)}</MobileCityVal>
            </MobileCityStat>
          </MobileCityStrip>
        )}

        {/* Recently Viewed — desktop floating widget (below city market card area) */}
        {!mapFullscreen && !isLoading && !cityMarketStats && recentlyViewed.ids.length > 0 && (
          <RecentlyViewedWidget
            recentIds={recentlyViewed.ids}
            plots={plots}
            onSelect={selectPlot}
          />
        )}

        {/* Accessibility: aria-live announcer for screen readers when filter results change */}
        <div aria-live="polite" aria-atomic="true" role="status" className="sr-only">
          {!isLoading && (filtered.length > 0
            ? `נמצאו ${filtered.length} חלקות${filters.city && filters.city !== 'all' ? ` ב${filters.city}` : ''}`
            : hasActiveFilters ? 'לא נמצאו חלקות התואמות את הסינון' : ''
          )}
        </div>

        {/* Empty state with smart filter suggestions (like Madlan) */}
        {!mapFullscreen && !isLoading && filtered.length === 0 && hasActiveFilters && (() => {
          // Build smart suggestions: tell user which filter to relax
          const suggestions: { label: string; action: () => void }[] = []
          if (filters.priceMax && Number(filters.priceMax) > 0) {
            const relaxedMax = Number(filters.priceMax) * 2
            suggestions.push({
              label: `הרחב מחיר עד ${fmt.compact(relaxedMax)}`,
              action: () => setFilters({ ...filters, priceMax: String(relaxedMax) }),
            })
          }
          if (filters.priceMin && Number(filters.priceMin) > 0) {
            suggestions.push({
              label: 'הסר מחיר מינימום',
              action: () => setFilters({ ...filters, priceMin: '' }),
            })
          }
          if (filters.city && filters.city !== 'all') {
            suggestions.push({
              label: `הצג כל הערים (לא רק ${filters.city})`,
              action: () => setFilters({ ...filters, city: '' }),
            })
          }
          if (filters.zoning) {
            suggestions.push({
              label: 'הצג כל שלבי התכנון',
              action: () => setFilters({ ...filters, zoning: '' }),
            })
          }
          if (filters.sizeMin && Number(filters.sizeMin) > 0) {
            suggestions.push({
              label: 'הסר מינימום שטח',
              action: () => setFilters({ ...filters, sizeMin: '' }),
            })
          }
          return (
            <EmptyWrap>
              <EmptyIcon><SearchX size={28} color={t.gold} /></EmptyIcon>
              <EmptyTitle>לא נמצאו חלקות</EmptyTitle>
              <EmptyDesc>לא נמצאו חלקות התואמות את הסינון שבחרת. נסו אחת מהאפשרויות:</EmptyDesc>
              {suggestions.length > 0 && (
                <SuggestionsCol>
                  {suggestions.slice(0, 3).map((s, i) => (
                    <SuggestionBtn key={i} onClick={s.action}>
                      💡 {s.label}
                    </SuggestionBtn>
                  ))}
                </SuggestionsCol>
              )}
              <EmptyResetBtn onClick={resetFilters}><RotateCcw size={14} /> אפס הכל</EmptyResetBtn>
            </EmptyWrap>
          )
        })()}

        {/* Sort dropdown + City Comparison button */}
        {!mapFullscreen && <SortWrap ref={sortRef}>
          <SortActionsRow>
            {hasMutipleCities && (
              <CityCompBtn $active={cityCompOpen} onClick={() => setCityCompOpen(o => !o)} aria-label="השוואת ערים">
                <Building2 size={14} />
                ערים
              </CityCompBtn>
            )}
            <SortBtn
              onClick={() => setSortOpen(o => !o)}
              $active={sortKey !== 'recommended'}
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
              aria-label={`מיון: ${SORT_OPTIONS.find(o => o.key === sortKey)?.label || 'מומלץ'}`}
            >
              <ArrowUpDown size={14} />
              {SORT_OPTIONS.find(o => o.key === sortKey)?.label || 'מיון'}
            </SortBtn>
          </SortActionsRow>
          {sortOpen && (
            <SortDrop role="listbox" aria-label="אפשרויות מיון">
              {SORT_OPTIONS.map(o => (
                <SortOption
                  key={o.key}
                  $active={o.key === sortKey}
                  onClick={() => { setSortWithUrl(o.key); setSortOpen(false) }}
                  role="option"
                  aria-selected={o.key === sortKey}
                >
                  {o.label}
                </SortOption>
              ))}
            </SortDrop>
          )}
        </SortWrap>}

        {/* City Comparison Overlay Panel */}
        {!mapFullscreen && cityCompOpen && cityComparisonData.length > 1 && (
          <CityCompPanel>
            <CityCompHeader>
              <CityCompTitle><Building2 size={16} color={t.gold} /> השוואת ערים ({cityComparisonData.length})</CityCompTitle>
              <CityCompClose onClick={() => setCityCompOpen(false)} aria-label="סגור השוואת ערים"><X size={14} /></CityCompClose>
            </CityCompHeader>
            <CityCompGrid>
              {cityComparisonData.map(cd => {
                const scoreColor = cd.avgScore >= 7 ? t.ok : cd.avgScore >= 5 ? t.warn : t.err
                const isActive = filters.city === cd.city
                const isBest = cd.avgScore === Math.max(...cityComparisonData.map(c => c.avgScore))
                return (
                  <CityCompCard
                    key={cd.city}
                    $active={isActive}
                    $best={isBest}
                    onClick={() => {
                      setFilters({ ...filters, city: isActive ? '' : cd.city })
                      setCityCompOpen(false)
                    }}
                  >
                    <CityCompCardName>
                      <span>{cd.city}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: t.textDim }}>{cd.count} חלקות</span>
                    </CityCompCardName>
                    <CityCompCardMetrics>
                      <CityCompMetric>
                        <CityCompMetricVal>{fmt.compact(Math.round(cd.avgPrice))}</CityCompMetricVal>
                        <CityCompMetricLabel>מחיר ממוצע</CityCompMetricLabel>
                      </CityCompMetric>
                      <CityCompMetric>
                        <CityCompMetricVal $c={scoreColor}>{cd.avgScore}</CityCompMetricVal>
                        <CityCompMetricLabel>ציון ממוצע</CityCompMetricLabel>
                      </CityCompMetric>
                      <CityCompMetric>
                        <CityCompMetricVal style={{fontSize:11}}>{fmt.num(cd.avgPps)}</CityCompMetricVal>
                        <CityCompMetricLabel>₪/מ״ר</CityCompMetricLabel>
                      </CityCompMetric>
                      <CityCompMetric>
                        <CityCompMetricVal style={{fontSize:11}}>{fmt.num(cd.avgPpd)}</CityCompMetricVal>
                        <CityCompMetricLabel>₪/דונם</CityCompMetricLabel>
                      </CityCompMetric>
                    </CityCompCardMetrics>
                    <CityCompScoreBar>
                      <CityCompScoreTrack>
                        <CityCompScoreFill $w={cd.avgScore * 10} $c={scoreColor} />
                      </CityCompScoreTrack>
                      <span style={{ fontSize: 10, fontWeight: 800, color: scoreColor }}>{getGrade(cd.avgScore).grade}</span>
                    </CityCompScoreBar>
                    {cd.bestCount > 0 && (
                      <CityCompBestBadge>💎 {cd.bestCount} Best Value</CityCompBestBadge>
                    )}
                  </CityCompCard>
                )
              })}
            </CityCompGrid>
          </CityCompPanel>
        )}

        <Suspense fallback={null}>
          <PlotListPanel
            plots={sorted}
            selected={selected}
            onSelect={(pl) => { selectPlot(pl); setListOpen(false) }}
            open={listOpen}
            onToggle={() => setListOpen(o => !o)}
            isLoading={isLoading}
            userLocation={sortKey === 'nearest' ? userGeo.location : null}
            recentlyViewedIds={recentlyViewed.ids}
          />
        </Suspense>
        <Suspense fallback={selected ? <SidebarFallback /> : null}>
          {selected && <Sidebar plot={selected} open={isMobile ? mobileExpanded : true} onClose={() => { setSelected(null); setMobileExpanded(false) }} onLead={() => setLeadPlot(selected)} plots={sorted} onNavigate={selectPlot} isCompared={isCompared(selected.id)} onToggleCompare={toggleCompare} />}
        </Suspense>
        {/* Mobile Plot Preview Bottom Card — extracted memoized component */}
        {selected && !mobileExpanded && (
          <MobilePreviewCard
            ref={previewRef}
            plot={selected}
            allSorted={sorted}
            onExpand={() => setMobileExpanded(true)}
            onShare={sharePlot}
            onClose={() => setSelected(null)}
            isFav={isFav(selected.id)}
            onToggleFav={() => toggle(selected.id)}
            isCompared={isCompared(selected.id)}
            onToggleCompare={() => toggleCompare(selected.id)}
            onNavigate={selectPlot}
          />
        )}

        <Suspense fallback={null}>
          <LeadModal plot={leadPlot} open={!!leadPlot} onClose={() => setLeadPlot(null)} />
        </Suspense>
        <Suspense fallback={null}><Chat plotId={selected?.id ?? null} /></Suspense>

        {/* Mortgage Calculator — interactive investment modeling widget */}
        {!mapFullscreen && (
          <Suspense fallback={null}>
            <MortgageCalculator
              plotPrice={selected ? p(selected).price : undefined}
              plotLabel={selected ? `גוש ${p(selected).block} · חלקה ${selected.number} — ${selected.city}` : undefined}
            />
          </Suspense>
        )}

        {/* Floating Compare Bar — simplified */}
        {!mapFullscreen && compareIds.length > 0 && (
          <CompareBar>
            <GitCompareArrows size={16} color={t.gold} />
            <CompareLabel>השוואה ({compareIds.length})</CompareLabel>
            {compareIds.length >= 2 && (
              <CompareAction onClick={() => setCompareOpen(true)}>
                <GitCompareArrows size={14} /> השווה
              </CompareAction>
            )}
            <CompareClear onClick={clearCompare} aria-label="נקה השוואה"><Trash2 size={14} /></CompareClear>
          </CompareBar>
        )}

        {/* Inline Compare Drawer — no auth needed, works for everyone */}
        <Suspense fallback={compareOpen ? <CompareDrawerFallback /> : null}>
          <CompareDrawer
            open={compareOpen}
            onClose={() => setCompareOpen(false)}
            plots={sorted.filter(pl => compareIds.includes(pl.id))}
            allPlots={plots}
          />
        </Suspense>

        {/* Keyboard Shortcuts Dialog */}
        <KbBackdrop $open={shortcutsOpen} onClick={() => setShortcutsOpen(false)}>
          <KbDialog onClick={e => e.stopPropagation()} role="dialog" aria-label="קיצורי מקלדת">
            <KbClose onClick={() => setShortcutsOpen(false)} aria-label="סגור"><X size={14} /></KbClose>
            <KbTitle><Keyboard size={20} color={t.gold} /> קיצורי מקלדת</KbTitle>
            <KbGroup>
              <KbGroupLabel>ניווט</KbGroupLabel>
              <KbRow><KbLabel>חיפוש מהיר</KbLabel><KbKey>/</KbKey></KbRow>
              <KbRow><KbLabel>מפה מלאה</KbLabel><KbKey>F</KbKey></KbRow>
              <KbRow><KbLabel>רשימת חלקות</KbLabel><KbKey>L</KbKey></KbRow>
              <KbRow><KbLabel>סגור / חזרה</KbLabel><KbKey>Esc</KbKey></KbRow>
            </KbGroup>
            <KbGroup>
              <KbGroupLabel>חלקה נבחרת</KbGroupLabel>
              <KbRow><KbLabel>חלקה הבאה</KbLabel><KbKey>←</KbKey></KbRow>
              <KbRow><KbLabel>חלקה קודמת</KbLabel><KbKey>→</KbKey></KbRow>
              <KbRow><KbLabel>שתף חלקה</KbLabel><KbKey>S</KbKey></KbRow>
            </KbGroup>
            <KbGroup>
              <KbGroupLabel>עזרה</KbGroupLabel>
              <KbRow><KbLabel>קיצורי מקלדת</KbLabel><KbKey>?</KbKey></KbRow>
            </KbGroup>
            <KbHint>ניתן להשתמש בקיצורים כשהמיקוד לא בשדה טקסט</KbHint>
          </KbDialog>
        </KbBackdrop>

        {/* Market Insights Ticker — extracted memoized widget to prevent re-render cascades */}
        {!mapFullscreen && !isLoading && (
          <InsightsTickerWidget insights={marketInsights} hasCompare={compareIds.length > 0} />
        )}

        {/* Stats bar with viewport visible count, total value, market momentum */}
        {!mapFullscreen && (
          <Stats>
            <Stat><Val><AnimatedValue value={filtered.length} /></Val> חלקות</Stat>
            {visibleInViewport != null && visibleInViewport < filtered.length && (
              <ViewportStat title="חלקות הנראות בתצוגת המפה הנוכחית">
                <Eye size={10} /> {visibleInViewport} נראות
              </ViewportStat>
            )}
            <Stat>ממוצע <Val><AnimatedValue value={Math.round(avg)} format={fmt.compact} /></Val></Stat>
            {/* Total portfolio value — shows aggregate investment scope */}
            {totalPortfolioValue > 0 && (
              <TotalValueStat title={`סך שווי כל החלקות המוצגות: ${fmt.price(totalPortfolioValue)}`}>
                💰 סה״כ <TotalValueAmount>{fmt.compact(totalPortfolioValue)}</TotalValueAmount>
              </TotalValueStat>
            )}
            {statsBarData.prices.length >= 2 && (
              <Stat title={`טווח: ${fmt.compact(statsBarData.minPrice)} – ${fmt.compact(statsBarData.maxPrice)}`}>
                {fmt.short(statsBarData.minPrice)} – <Val>{fmt.short(statsBarData.maxPrice)}</Val>
              </Stat>
            )}
            {statsBarData.avgRoi > 0 && (
              <Stat title={`תשואה ממוצעת צפויה: +${statsBarData.avgRoi}%`}>
                ROI <ValOk>+{statsBarData.avgRoi}%</ValOk>
              </Stat>
            )}
            {/* Market momentum — buyer's/seller's market indicator */}
            {marketMomentum && (
              <MomentumBadge $c={marketMomentum.color} title={marketMomentum.tip}>
                {marketMomentum.label}
              </MomentumBadge>
            )}
            {portfolioQuality && (
              <PortfolioGauge title={`ציון תיק השקעות ממוצע: ${portfolioQuality.avg}/10 — ${portfolioQuality.grade.grade}`}>
                <QualityLabel>איכות</QualityLabel>
                <GaugeTrack>
                  <GaugeFill $w={portfolioQuality.pct} $c={portfolioQuality.grade.color} />
                </GaugeTrack>
                <GaugeLabel $c={portfolioQuality.grade.color}>{portfolioQuality.avg}</GaugeLabel>
              </PortfolioGauge>
            )}
            {sse.status === 'connected' ? (
              <LiveBadge $connected title={`חיבור חי — ${sse.updateCount} עדכונים מתעדכנים אוטומטית${dataFreshness.relativeTime ? ` · עודכן ${dataFreshness.relativeTime}` : ''}`}>
                <LiveDot $c={t.ok} /> עדכני {sse.updateCount > 0 && <SseUpdateCount>({sse.updateCount})</SseUpdateCount>}
              </LiveBadge>
            ) : dataSource === 'api' ? (
              <ClickableLiveBadge $connected={false} title={`נתונים מהשרת${dataFreshness.relativeTime ? ` · עודכן ${dataFreshness.relativeTime}` : ''} — לחץ לרענון`}
                onClick={() => { window.location.reload() }}>
                <LiveDot $c={t.warn} /> {dataFreshness.relativeTime && dataFreshness.relativeTime !== 'עכשיו' ? dataFreshness.relativeTime : 'נתוני שרת'} ↻
              </ClickableLiveBadge>
            ) : (
              <ClickableDemo title="נתונים לדוגמה — לחץ לנסות שוב"
                onClick={() => { window.location.reload() }}>נתוני דמו ↻</ClickableDemo>
            )}
            <KbHintBtn onClick={() => setShortcutsOpen(true)} title="קיצורי מקלדת (?)">
              <Keyboard size={10} /> ?
            </KbHintBtn>
          </Stats>
        )}

        {/* Mobile Favorites Overlay */}
        <MobileOverlay $open={tab === 'fav'}>
          <MobileOverlayHeader>
            <MobileOverlayTitle><Heart size={18} color={t.gold} /> מועדפים ({favIds.length})</MobileOverlayTitle>
            <MobileOverlayClose onClick={() => setTab('map')}><X size={16} /></MobileOverlayClose>
          </MobileOverlayHeader>
          {favIds.length === 0 ? (
            <MobileEmptyState>
              <MobileEmptyIcon><Heart size={28} color={t.gold} /></MobileEmptyIcon>
              <MobileEmptyTitle>אין מועדפים עדיין</MobileEmptyTitle>
              <MobileEmptyDesc>לחצו על ❤️ בחלקה כדי לשמור אותה כאן</MobileEmptyDesc>
            </MobileEmptyState>
          ) : (
            <MobileFavList>
              {sorted.filter(pl => favIds.includes(pl.id)).map(pl => {
                const d = p(pl), grade = getGrade(calcScore(pl))
                return (
                  <MobileFavItem key={pl.id} onClick={() => { selectPlot(pl); setTab('map') }}>
                    <MobileFavInfo>
                      <MobileFavTitle>גוש {d.block} · חלקה {pl.number}</MobileFavTitle>
                      <MobileFavSub>
                        <span>{pl.city}</span>
                        <GaugeLabel $c={grade.color}>{grade.grade}</GaugeLabel>
                        <span>{fmt.num(d.size)} מ״ר</span>
                      </MobileFavSub>
                    </MobileFavInfo>
                    <MobileFavPrice>{fmt.compact(d.price)}</MobileFavPrice>
                    <MobileFavRemove onClick={(e) => { e.stopPropagation(); toggle(pl.id) }}><X size={14} /></MobileFavRemove>
                  </MobileFavItem>
                )
              })}
            </MobileFavList>
          )}
        </MobileOverlay>

        {/* Mobile Nav — 3 tabs (no IIFE, computed inline for clarity) */}
        {!mapFullscreen && (
          <MobileNav role="navigation" aria-label="ניווט ראשי">
            <NavIndicator
              $idx={((tab === 'map' && listOpen) ? 'areas' : tab) === 'fav' ? 1 : ((tab === 'map' && listOpen) ? 'areas' : tab) === 'areas' ? 2 : 0}
              $total={3}
            />
            <NavBtn $active={tab==='map' && !listOpen} onClick={()=>{ setTab('map'); setListOpen(false) }} aria-label="מפה" aria-current={tab==='map' && !listOpen ?'page':undefined}>
              <NavBtnWrap>
                <MapIcon size={20}/>
              </NavBtnWrap>
              מפה
            </NavBtn>
            <NavBtn $active={tab==='fav'} onClick={()=>{ setTab('fav'); setListOpen(false) }} aria-label={`מועדפים${favIds.length>0?` (${favIds.length})`:''}`} aria-current={tab==='fav'?'page':undefined}>
              <NavBtnWrap>
                <Heart size={20}/>
                {favIds.length > 0 && <NavBadge>{favIds.length}</NavBadge>}
              </NavBtnWrap>
              מועדפים
            </NavBtn>
            <NavBtn $active={tab==='map' && listOpen} onClick={()=>{ setTab('map'); setListOpen(o => !o) }} aria-label="רשימת חלקות" aria-current={tab==='map' && listOpen?'page':undefined}>
              <NavBtnWrap>
                <Layers size={20}/>
                {sorted.length > 0 && <NavBadge>{sorted.length > 99 ? '99+' : sorted.length}</NavBadge>}
              </NavBtnWrap>
              רשימה
            </NavBtn>
          </MobileNav>
        )}
      </ErrorBoundary>
    </Wrap>
  )
}
