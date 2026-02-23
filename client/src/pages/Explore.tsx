import { useState, useMemo, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { Map as MapIcon, Heart, Calculator, Layers, ArrowUpDown, GitCompareArrows, X, Trash2, SearchX, RotateCcw, ChevronLeft, DollarSign, ExternalLink, MessageCircle, Share2, Check, Filter } from 'lucide-react'
import { t, mobile } from '../theme'
import { useAllPlots, useFavorites, useCompare, useDebounce, useRecentlyViewed, useUserLocation, useOnlineStatus, useIsMobile, useFocusTrap, useSSE, useDocumentTitle, useMetaDescription } from '../hooks'
// Note: dataFreshness and dataSource are computed locally in this component (not via hooks)
import MapArea from '../components/Map'
import FilterBar from '../components/Filters'
import { ErrorBoundary, useToast, NetworkBanner, AnimatedValue, DemoModeBanner, ExploreLoadingSkeleton } from '../components/UI'
import { CityStatsOverlay, MarketPulseOverlay, InsightsTickerOverlay, RecentlyViewedStrip, TopPickOverlay } from '../components/ExploreOverlays'
import type { MarketPulseData, InsightItem } from '../components/ExploreOverlays'
import { p, roi, fmt, sortPlots, SORT_OPTIONS, pricePerSqm, pricePerDunam, calcScore, getGrade, calcMonthly, statusColors, statusLabels, pricePosition, plotDistanceFromUser, fmtDistance, zoningLabels, calcAggregateStats, estimatedYear, plotCenter, SITE_CONFIG, calcMarketTemperature, calcQuickInsight } from '../utils'
import type { SortKey } from '../utils'
import { pois } from '../data'
import type { Plot, Filters } from '../types'

const Sidebar = lazy(() => import('../components/Sidebar'))
const LeadModal = lazy(() => import('../components/LeadModal'))
const Chat = lazy(() => import('../components/Chat'))
const PlotListPanel = lazy(() => import('../components/PlotListPanel'))
const CompareDrawer = lazy(() => import('../components/CompareDrawer'))

const DEFAULTS: Filters = { city: '', priceMin: '', priceMax: '', sizeMin: '', sizeMax: '', ripeness: '', minRoi: '', zoning: '', search: '', belowAvg: '' }

/* ── animations ── */
const slideUp = keyframes`from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}`
const chipPop = keyframes`from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}`
const loadingSlide = keyframes`0%{left:-35%;width:35%}50%{left:20%;width:50%}100%{left:100%;width:15%}`

/* ── styled ── */
const Wrap = styled.div`position:relative;width:100vw;height:100vh;height:100dvh;overflow:hidden;background:${t.bg};`
const Stats = styled.div`
  position:absolute;bottom:0;left:0;right:0;z-index:${t.z.filter};
  display:flex;align-items:center;justify-content:center;gap:24px;padding:8px 16px;
  background:${t.glass};backdrop-filter:blur(12px);border-top:1px solid ${t.border};
  font-size:12px;color:${t.textSec};direction:rtl;
  ${mobile}{bottom:56px;gap:8px;font-size:10px;padding:6px 10px;
    justify-content:flex-start;overflow-x:auto;scrollbar-width:none;
    -webkit-overflow-scrolling:touch;&::-webkit-scrollbar{display:none;}
    mask-image:linear-gradient(to left,transparent 0px,black 16px,black calc(100% - 16px),transparent 100%);
    -webkit-mask-image:linear-gradient(to left,transparent 0px,black 16px,black calc(100% - 16px),transparent 100%);
    /* Divider between stat groups */
    & > span:nth-child(4)::before{content:'';width:1px;height:14px;background:${t.border};margin-left:4px;display:inline-block;vertical-align:middle;}}
`
const Stat = styled.span`display:flex;align-items:center;gap:4px;`
const Val = styled.span`color:${t.goldBright};font-weight:700;`
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
const Loader = styled.div`position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:2;`
const TopProgress = styled.div<{$show:boolean}>`
  position:absolute;top:0;left:0;right:0;height:3px;z-index:${t.z.filter + 2};overflow:hidden;
  opacity:${pr=>pr.$show?1:0};transition:opacity 0.4s;pointer-events:none;
  &::after{content:'';position:absolute;top:0;left:-35%;width:35%;height:100%;
    background:linear-gradient(90deg,transparent,${t.gold},${t.goldBright},${t.gold},transparent);
    border-radius:0 2px 2px 0;animation:${loadingSlide} 1.2s cubic-bezier(0.4,0,0.2,1) infinite;}
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
const SortDrop = styled.div`
  position:absolute;top:calc(100% + 6px);right:0;min-width:140px;
  background:${t.glass};backdrop-filter:blur(24px);border:1px solid ${t.glassBorder};
  border-radius:${t.r.md};box-shadow:${t.sh.lg};overflow:hidden;
`
const SortOption = styled.button<{$active?:boolean}>`
  display:block;width:100%;padding:8px 14px;text-align:right;
  background:${pr=>pr.$active?t.goldDim:'transparent'};border:none;
  color:${pr=>pr.$active?t.gold:t.textSec};font-size:12px;font-weight:${pr=>pr.$active?700:500};
  font-family:${t.font};cursor:pointer;transition:all ${t.tr};
  &:hover{background:${t.hover};color:${t.gold};}
`

/* ── Breadcrumb Navigation ── */
const BreadcrumbWrap = styled.nav`
  position:absolute;bottom:42px;left:16px;z-index:${t.z.filter - 2};
  display:flex;align-items:center;gap:0;direction:rtl;
  background:${t.glass};backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border:1px solid ${t.glassBorder};border-radius:${t.r.full};
  padding:4px 14px;box-shadow:${t.sh.sm};
  font-size:11px;font-weight:600;font-family:${t.font};
  ${mobile}{display:none;}
`
const BreadcrumbItem = styled.span<{$active?:boolean;$clickable?:boolean}>`
  color:${pr=>pr.$active?t.gold:t.textDim};
  cursor:${pr=>pr.$clickable?'pointer':'default'};
  white-space:nowrap;transition:color ${t.tr};
  ${pr=>pr.$clickable?`&:hover{color:${t.goldBright};text-decoration:underline;}`:``}
`
const BreadcrumbSep = styled.span`color:${t.textDim};margin:0 6px;opacity:0.4;font-size:9px;`

/* ── Share View Button ── */
const shareSuccess = keyframes`0%{transform:scale(0.8);opacity:0}50%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}`
const ShareBtn = styled.button<{$copied?:boolean}>`
  display:inline-flex;align-items:center;gap:6px;padding:8px 14px;
  background:${pr=>pr.$copied?'rgba(16,185,129,0.15)':t.glass};backdrop-filter:blur(16px);
  border:1px solid ${pr=>pr.$copied?'rgba(16,185,129,0.3)':t.glassBorder};border-radius:${t.r.full};
  color:${pr=>pr.$copied?t.ok:t.textSec};font-size:12px;font-weight:600;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};box-shadow:${t.sh.sm};white-space:nowrap;
  &:hover{border-color:${t.goldBorder};color:${t.gold};}
  svg{${pr=>pr.$copied?`animation:${shareSuccess} 0.3s ease-out`:''}}
  ${mobile}{padding:7px 10px;font-size:11px;gap:4px;
    span{display:none;}}
`

/* ── Active Filter Count Badge ── */
const FilterBadge = styled.span`
  display:inline-flex;align-items:center;justify-content:center;
  min-width:18px;height:18px;padding:0 5px;
  background:linear-gradient(135deg,${t.gold},${t.goldBright});color:${t.bg};
  border-radius:${t.r.full};font-size:10px;font-weight:800;line-height:1;
  ${mobile}{min-width:16px;height:16px;font-size:9px;}
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

/* ── Compare Bar (floating bottom tray) ── */
const CompareBar = styled.div`
  position:absolute;bottom:42px;left:50%;transform:translateX(-50%);z-index:${t.z.filter};
  display:flex;align-items:center;gap:12px;padding:10px 18px;direction:rtl;
  background:${t.glass};backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border:1px solid ${t.goldBorder};border-radius:${t.r.xl};box-shadow:${t.sh.lg};
  animation:${slideUp} 0.3s cubic-bezier(0.32,0.72,0,1);
  ${mobile}{bottom:96px;left:8px;right:8px;transform:none;padding:8px 14px;gap:8px;}
`
const CompareChip = styled.div`
  display:flex;align-items:center;gap:6px;padding:4px 12px;
  background:${t.goldDim};border:1px solid ${t.goldBorder};border-radius:${t.r.full};
  font-size:12px;font-weight:600;color:${t.gold};animation:${chipPop} 0.2s ease-out;
  white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;
`
const CompareChipX = styled.button`
  display:flex;align-items:center;justify-content:center;background:none;border:none;
  color:${t.goldBright};cursor:pointer;padding:0;flex-shrink:0;
  &:hover{color:${t.text};}
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
const PreviewMetrics = styled.div`
  display:flex;align-items:center;gap:12px;overflow-x:auto;scrollbar-width:none;
  &::-webkit-scrollbar{display:none;}
`
const PreviewMetric = styled.div`
  display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 12px;
  background:${t.surfaceLight};border:1px solid ${t.border};border-radius:${t.r.md};min-width:72px;flex-shrink:0;
`
const PreviewMetricVal = styled.span<{$c?:string}>`font-size:13px;font-weight:800;color:${pr=>pr.$c||t.text};`
const PreviewMetricLabel = styled.span`font-size:9px;font-weight:600;color:${t.textDim};white-space:nowrap;`
const PreviewInsight = styled.div<{$c:string}>`
  display:flex;align-items:center;gap:6px;padding:7px 12px;
  background:${pr=>pr.$c}0A;border:1px solid ${pr=>pr.$c}20;
  border-radius:${t.r.md};font-size:12px;font-weight:600;color:${pr=>pr.$c};
  direction:rtl;line-height:1.4;
`
const PreviewInsightEmoji = styled.span`font-size:14px;flex-shrink:0;`
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
const PreviewActionBtn = styled.button<{$active?:boolean}>`
  width:44px;height:44px;border-radius:${t.r.md};
  border:1px solid ${pr=>pr.$active?t.gold:t.border};
  background:${pr=>pr.$active?t.goldDim:'transparent'};
  color:${pr=>pr.$active?t.gold:t.textSec};cursor:pointer;
  display:flex;align-items:center;justify-content:center;transition:all ${t.tr};flex-shrink:0;
  &:hover{border-color:${t.goldBorder};color:${t.gold};}
`

/* ── Mobile Calculator ── */
const CalcCard = styled.div`
  margin:20px;padding:24px;background:${t.surface};border:1px solid ${t.border};border-radius:${t.r.lg};
`
const CalcTitle = styled.h4`font-size:15px;font-weight:700;color:${t.text};margin:0 0 16px;display:flex;align-items:center;gap:8px;`
const CalcSliderRow = styled.div`display:flex;flex-direction:column;gap:6px;margin-bottom:16px;`
const CalcSliderLabel = styled.div`display:flex;align-items:center;justify-content:space-between;font-size:12px;`
const CalcSliderName = styled.span`color:${t.textSec};font-weight:600;`
const CalcSliderVal = styled.span`color:${t.text};font-weight:700;font-size:13px;`
const CalcSlider = styled.input.attrs({ type: 'range' })`
  width:100%;height:6px;-webkit-appearance:none;appearance:none;outline:none;border-radius:3px;
  background:linear-gradient(90deg,${t.gold} 0%,${t.gold} var(--pct,50%),${t.surfaceLight} var(--pct,50%),${t.surfaceLight} 100%);
  &::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;
    background:linear-gradient(135deg,${t.gold},${t.goldBright});cursor:pointer;
    box-shadow:0 2px 8px rgba(212,168,75,0.35);border:2px solid ${t.bg};}
`
const CalcResult = styled.div`
  display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px;margin-top:12px;
  background:${t.goldDim};border:1px solid ${t.goldBorder};border-radius:${t.r.md};
`
const CalcResultItem = styled.div`text-align:center;`
const CalcResultVal = styled.div<{$gold?:boolean}>`font-size:18px;font-weight:800;color:${pr=>pr.$gold?t.gold:t.text};`
const CalcResultLabel = styled.div`font-size:10px;color:${t.textSec};margin-top:2px;`
const CalcInput = styled.input`
  width:100%;padding:12px 14px;background:${t.surfaceLight};border:1px solid ${t.border};border-radius:${t.r.md};
  color:${t.text};font-size:16px;font-weight:700;font-family:${t.font};outline:none;direction:ltr;text-align:center;
  &:focus{border-color:${t.goldBorder};box-shadow:0 0 0 3px ${t.goldDim};}
  &::placeholder{color:${t.textDim};}
`

/* ── Mobile Preview Navigation Links ── */
const PreviewNavRow = styled.div`display:flex;align-items:center;gap:6px;`
const PreviewNavLink = styled.a<{$bg:string;$border:string;$color:string}>`
  flex:1;display:flex;align-items:center;justify-content:center;gap:5px;
  padding:8px 10px;background:${pr=>pr.$bg};
  border:1px solid ${pr=>pr.$border};border-radius:${t.r.md};
  font-size:11px;font-weight:700;color:${pr=>pr.$color};
  text-decoration:none!important;white-space:nowrap;
  transition:all ${t.tr};
  &:hover{filter:brightness(1.15);transform:translateY(-1px);}
`

/* ── WhatsApp Floating CTA ── */
const waPulse = keyframes`0%{box-shadow:0 0 0 0 rgba(37,211,102,0.45)}70%{box-shadow:0 0 0 14px rgba(37,211,102,0)}100%{box-shadow:0 0 0 0 rgba(37,211,102,0)}`
const WhatsAppFab = styled.a`
  position:fixed;bottom:92px;right:20px;z-index:${t.z.filter};
  width:52px;height:52px;border-radius:${t.r.full};
  background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;
  box-shadow:0 4px 16px rgba(37,211,102,0.4);cursor:pointer;
  transition:all ${t.tr};animation:${waPulse} 2.5s ease-in-out infinite;
  text-decoration:none !important;
  &:hover{transform:scale(1.1) translateY(-2px);box-shadow:0 8px 28px rgba(37,211,102,0.5);}
  ${mobile}{bottom:196px;right:14px;width:44px;height:44px;}
`
const WhatsAppTooltip = styled.div`
  position:fixed;bottom:100px;right:78px;z-index:${t.z.filter};
  padding:8px 14px;background:${t.glass};backdrop-filter:blur(16px);
  border:1px solid ${t.glassBorder};border-radius:${t.r.md};
  font-size:12px;font-weight:600;color:${t.text};white-space:nowrap;direction:rtl;
  box-shadow:${t.sh.md};pointer-events:none;
  &::after{content:'';position:absolute;top:50%;right:-6px;transform:translateY(-50%);
    border:6px solid transparent;border-left-color:${t.glass};}
  ${mobile}{display:none;}
`

/* ── Keyboard Shortcuts Dialog ── */
const KbdBackdrop = styled.div<{$open:boolean}>`
  position:fixed;inset:0;z-index:${t.z.modal};
  background:rgba(0,0,0,0.6);backdrop-filter:blur(6px);
  opacity:${pr=>pr.$open?1:0};pointer-events:${pr=>pr.$open?'auto':'none'};
  transition:opacity 0.3s;display:flex;align-items:center;justify-content:center;
`
const KbdPanel = styled.div`
  width:min(440px,calc(100vw - 32px));background:${t.surface};
  border:1px solid ${t.goldBorder};border-radius:${t.r.xl};
  box-shadow:${t.sh.xl};direction:rtl;overflow:hidden;
`
const KbdHeader = styled.div`
  display:flex;align-items:center;justify-content:space-between;
  padding:16px 20px;border-bottom:1px solid ${t.border};
  background:linear-gradient(180deg,rgba(212,168,75,0.06),transparent);
`
const KbdTitle = styled.h3`
  font-size:16px;font-weight:700;color:${t.text};margin:0;
  display:flex;align-items:center;gap:8px;font-family:${t.font};
`
const KbdCloseBtn = styled.button`
  width:30px;height:30px;border-radius:${t.r.sm};background:transparent;
  border:1px solid ${t.border};color:${t.textSec};cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  transition:all ${t.tr};&:hover{border-color:${t.goldBorder};color:${t.gold};}
`
const KbdList = styled.div`padding:12px 20px;`
const KbdRow = styled.div`
  display:flex;align-items:center;justify-content:space-between;
  padding:8px 0;border-bottom:1px solid ${t.border};
  &:last-child{border-bottom:none;}
`
const KbdLabel = styled.span`font-size:13px;color:${t.textSec};`
const KbdKey = styled.kbd`
  display:inline-flex;align-items:center;justify-content:center;
  min-width:28px;height:26px;padding:0 8px;
  background:${t.surfaceLight};border:1px solid ${t.border};
  border-radius:${t.r.sm};font-size:12px;font-weight:700;
  color:${t.gold};font-family:${t.font};
  box-shadow:inset 0 -1px 0 ${t.border};
`
const KbdCombo = styled.div`display:flex;align-items:center;gap:4px;`
const KbdFooter = styled.div`
  padding:10px 20px;border-top:1px solid ${t.border};
  font-size:11px;color:${t.textDim};text-align:center;
`

/* ── Quick City Navigation Pills ── */
const CityPillsWrap = styled.div`
  position:absolute;top:114px;left:50%;transform:translateX(-50%);z-index:${t.z.filter};
  display:flex;align-items:center;gap:6px;direction:rtl;
  max-width:min(620px,calc(100vw - 32px));overflow-x:auto;
  scrollbar-width:none;&::-webkit-scrollbar{display:none;}
  padding:4px 8px;
  background:${t.glass};backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border:1px solid ${t.glassBorder};border-radius:${t.r.full};box-shadow:${t.sh.md};
  ${mobile}{top:90px;left:8px;right:8px;transform:none;gap:5px;border-radius:${t.r.lg};}
`
const CityPill = styled.button<{$active?:boolean}>`
  display:inline-flex;align-items:center;gap:4px;padding:5px 14px;
  background:${pr=>pr.$active ? t.goldDim : t.glass};backdrop-filter:blur(16px);
  border:1px solid ${pr=>pr.$active ? t.gold : t.glassBorder};border-radius:${t.r.full};
  color:${pr=>pr.$active ? t.gold : t.textSec};font-size:11px;font-weight:700;
  font-family:${t.font};cursor:pointer;transition:all ${t.tr};white-space:nowrap;flex-shrink:0;
  box-shadow:${t.sh.sm};
  &:hover{border-color:${t.gold};color:${t.gold};transform:translateY(-1px);}
  ${pr=>pr.$active && `box-shadow:0 0 12px rgba(212,168,75,0.2);`}
`

/* City emoji map — used by dynamic city pills */
const CITY_EMOJI: Record<string, string> = {
  'חדרה': '🏗️', 'נתניה': '🌊', 'קיסריה': '🏛️', 'הרצליה': '💎',
  'כפר סבא': '🌳', 'רעננה': '🏠', 'הוד השרון': '🌿', 'תל אביב': '🏙️',
  'חיפה': '⚓', 'באר שבע': '🏜️', 'ראשון לציון': '🌅', 'אשדוד': '🚢',
  'ירושלים': '✡️', 'פתח תקווה': '🌳', 'רחובות': '🔬', 'אשקלון': '🏖️',
}

const SHORTCUTS = [
  { keys: ['/'], label: 'מיקוד בחיפוש' },
  { keys: ['?'], label: 'פתח/סגור קיצורי מקשים' },
  { keys: ['F'], label: 'מצב מסך מלא (הסתר ממשק)' },
  { keys: ['L'], label: 'פתח/סגור רשימת חלקות' },
  { keys: ['R'], label: 'מדידת מרחק (סרגל)' },
  { keys: ['Esc'], label: 'סגור סרגל צד / חלון / מסך מלא' },
  { keys: ['←'], label: 'חלקה הבאה (כשסרגל צד פתוח)' },
  { keys: ['→'], label: 'חלקה קודמת (כשסרגל צד פתוח)' },
]

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

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFiltersRaw] = useState<Filters>(() => filtersFromParams(searchParams))
  const [selected, setSelected] = useState<Plot | null>(null)
  const [leadPlot, setLeadPlot] = useState<Plot | null>(null)
  const [tab, setTab] = useState<'map'|'fav'|'calc'|'areas'>('map')
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    const s = searchParams.get('sort')
    return (s && SORT_OPTIONS.some(o => o.key === s) ? s : 'recommended') as SortKey
  })
  const [sortOpen, setSortOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const { isFav, toggle: rawToggleFav, ids: favIds } = useFavorites()
  const { ids: compareIds, toggle: rawToggleCompare, clear: clearCompare, has: isCompared } = useCompare()
  const { ids: recentIds, add: addRecentlyViewed } = useRecentlyViewed()
  const { toast } = useToast()
  const sortRef = useRef<HTMLDivElement>(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const kbdTrapRef = useFocusTrap(shortcutsOpen)
  const [cityStatsDismissed, setCityStatsDismissed] = useState(false)
  const userGeo = useUserLocation()
  const { online, wasOffline } = useOnlineStatus()
  const sse = useSSE()
  const isMobile = useIsMobile()
  const [mobileExpanded, setMobileExpanded] = useState(false)
  const [mapFullscreen, setMapFullscreen] = useState(false)
  const toggleFullscreen = useCallback(() => setMapFullscreen(f => !f), [])
  const [shareCopied, setShareCopied] = useState(false)
  const [visibleInViewport, setVisibleInViewport] = useState<number | null>(null)

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

  // Active filter count for badge
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.city && filters.city !== 'all') count++
    if (filters.priceMin) count++
    if (filters.priceMax) count++
    if (filters.sizeMin) count++
    if (filters.sizeMax) count++
    if (filters.ripeness) count++
    if (filters.minRoi) count++
    if (filters.zoning) count++
    if (filters.search) count++
    if (filters.belowAvg === 'true') count++
    return count
  }, [filters])

  // Dynamic city pills — built from actual plot data instead of hardcoded list
  const cityPills = useMemo(() => {
    const counts = new Map<string, number>()
    for (const pl of plots) {
      if (pl.city) counts.set(pl.city, (counts.get(pl.city) || 0) + 1)
    }
    const pills = [{ name: 'הכל', emoji: '🗺️', value: '', count: plots.length }]
    // Sort cities by plot count descending, take top 8
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    for (const [city, count] of sorted) {
      pills.push({ name: city, emoji: CITY_EMOJI[city] || '📍', value: city, count })
    }
    return pills
  }, [plots])

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

  // Tab visibility — pause expensive intervals when tab is hidden
  const [tabVisible, setTabVisible] = useState(true)
  useEffect(() => {
    const handler = () => setTabVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  // Mobile calculator state
  const [calcPrice, setCalcPrice] = useState(500000)
  const [calcLtv, setCalcLtv] = useState(50)
  const [calcRate, setCalcRate] = useState(6)
  const [calcYears, setCalcYears] = useState(15)
  const calcMortgage = useMemo(() => calcMonthly(calcPrice, calcLtv / 100, calcRate / 100, calcYears), [calcPrice, calcLtv, calcRate, calcYears])

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
    return list
  }, [plots, filters.sizeMin, filters.sizeMax, filters.belowAvg, filters.minRoi, filters.ripeness, dSearch])

  const sorted = useMemo(() => sortPlots(filtered, sortKey, userGeo.location), [filtered, sortKey, userGeo.location])

  // ── Computed stats (must be declared before memos that reference them) ──
  const avg = useMemo(() => filtered.length ? filtered.reduce((s, pl) => s + p(pl).price, 0) / filtered.length : 0, [filtered])
  const avgPps = useMemo(() => filtered.length ? Math.round(filtered.reduce((s, pl) => s + pricePerSqm(pl), 0) / filtered.length) : 0, [filtered])
  const avgPpd = useMemo(() => filtered.length ? Math.round(filtered.reduce((s, pl) => s + pricePerDunam(pl), 0) / filtered.length) : 0, [filtered])

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

  // Share current view URL (must be after filtered is declared)
  const shareView = useCallback(async () => {
    const url = window.location.href
    try {
      if (navigator.share && isMobile) {
        await navigator.share({
          title: `חלקות להשקעה${filters.city && filters.city !== 'all' ? ` ב${filters.city}` : ''} | LandMap Israel`,
          text: `${filtered.length} חלקות קרקע להשקעה — מפה אינטראקטיבית עם ניתוח AI`,
          url,
        })
        toast('🔗 קישור שותף בהצלחה', 'success')
      } else {
        await navigator.clipboard.writeText(url)
        setShareCopied(true)
        toast('🔗 הקישור הועתק ללוח', 'success')
        setTimeout(() => setShareCopied(false), 2000)
      }
    } catch {
      // User cancelled share or clipboard failed — try fallback
      try {
        await navigator.clipboard.writeText(url)
        setShareCopied(true)
        toast('🔗 הקישור הועתק ללוח', 'success')
        setTimeout(() => setShareCopied(false), 2000)
      } catch { /* silently fail */ }
    }
  }, [filters.city, filtered.length, isMobile, toast])

  const medianPrice = useMemo(() => {
    if (!filtered.length) return 0
    const prices = filtered.map(pl => p(pl).price).filter(v => v > 0).sort((a, b) => a - b)
    if (!prices.length) return 0
    const mid = Math.floor(prices.length / 2)
    return prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid]
  }, [filtered])

  // City-level statistics (for city stats card)
  const cityStats = useMemo(() => {
    if (!filters.city || filters.city === 'all' || !filtered.length) return null
    const cityPlots = filtered
    const prices = cityPlots.map(pl => p(pl).price).filter(v => v > 0)
    const rois = cityPlots.map(roi).filter(v => v > 0)
    const ppsList = cityPlots.map(pricePerDunam).filter(v => v > 0)
    const sizes = cityPlots.map(pl => p(pl).size).filter(v => v > 0)
    // Dominant zoning stage
    const zoningMap = new Map<string, number>()
    for (const pl of cityPlots) {
      const z = p(pl).zoning
      zoningMap.set(z, (zoningMap.get(z) || 0) + 1)
    }
    const dominantZoning = [...zoningMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || ''
    return {
      count: cityPlots.length,
      avgPrice: prices.length ? Math.round(prices.reduce((s, v) => s + v, 0) / prices.length) : 0,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      avgPps: ppsList.length ? Math.round(ppsList.reduce((s, v) => s + v, 0) / ppsList.length) : 0,
      avgRoi: rois.length ? Math.round(rois.reduce((s, v) => s + v, 0) / rois.length * 10) / 10 : 0,
      totalArea: sizes.length ? Math.round(sizes.reduce((s, v) => s + v, 0)) : 0,
      dominantZoning: zoningLabels[dominantZoning] || dominantZoning,
    }
  }, [filtered, filters.city])

  // Market Pulse data — investment opportunity summary
  const marketPulse = useMemo(() => {
    if (!filtered.length) return null
    const totalValue = filtered.reduce((s, pl) => s + p(pl).price, 0)
    const hotDeals = filtered.filter(pl => { const score = calcScore(pl); return score >= 8 }).length
    const belowAvgCount = (() => {
      const ppsList = filtered.map(pricePerSqm).filter(v => v > 0)
      if (ppsList.length < 2) return 0
      const avg = ppsList.reduce((s, v) => s + v, 0) / ppsList.length
      return filtered.filter(pl => { const pps = pricePerSqm(pl); return pps > 0 && pps < avg * 0.9 }).length
    })()
    const avgRoi = (() => {
      const rois = filtered.map(roi).filter(v => v > 0)
      return rois.length ? Math.round(rois.reduce((s, v) => s + v, 0) / rois.length) : 0
    })()
    return { totalValue, hotDeals, belowAvgCount, avgRoi }
  }, [filtered])

  // Market temperature
  const marketTemp = useMemo(() => calcMarketTemperature(filtered), [filtered])

  // Top investment pick — highest score plot from currently visible set
  const [topPickDismissed, setTopPickDismissed] = useState(false)
  const topPick = useMemo(() => {
    if (!filtered.length || filtered.length < 2) return null
    let best: Plot | null = null, bestScore = 0
    for (const pl of filtered) {
      const s = calcScore(pl)
      const r = roi(pl)
      // Combined ranking: score * 10 + ROI weight (prefer high score + high ROI)
      const combined = s * 10 + Math.min(r, 100) * 0.3
      if (combined > bestScore && p(pl).price > 0) {
        bestScore = combined
        best = pl
      }
    }
    return best
  }, [filtered])

  // Average days on market
  const avgDom = useMemo(() => {
    if (!filtered.length) return null
    const doms = filtered
      .map(pl => p(pl).created)
      .filter((c): c is string => !!c)
      .map(c => Math.floor((Date.now() - new Date(c).getTime()) / 864e5))
      .filter(d => d >= 0 && d < 3650) // exclude outliers (>10 years)
    if (!doms.length) return null
    const avg = Math.round(doms.reduce((s, d) => s + d, 0) / doms.length)
    return avg
  }, [filtered])

  // Reset top pick dismissed when filters change
  useEffect(() => { setTopPickDismissed(false) }, [filters.city, filters.ripeness, filters.zoning])

  // Reset city stats dismissed state when city changes
  useEffect(() => { setCityStatsDismissed(false) }, [filters.city])

  const hasActiveFilters = useMemo(() =>
    Object.entries(filters).some(([, v]) => v && v !== 'all'), [filters])

  const resetFilters = useCallback(() => {
    setFilters(DEFAULTS)
  }, [setFilters])

  // Track recently viewed plots
  const selectPlot = useCallback((pl: Plot | null) => {
    setSelected(pl)
    setMobileExpanded(false) // Reset to preview mode on new selection
    if (pl) addRecentlyViewed(pl.id)
  }, [addRecentlyViewed])

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

  // WhatsApp tooltip hover state
  const [waHover, setWaHover] = useState(false)

  // Dynamic WhatsApp link — contextual when a plot is selected
  const waLink = useMemo(() => {
    const base = `${SITE_CONFIG.waLink}?text=`
    if (selected) {
      const d = p(selected)
      const msg = `היי, מתעניין/ת בחלקה ${selected.number} גוש ${d.block} ב${selected.city} (${fmt.compact(d.price)}). אשמח לפרטים נוספים.`
      return base + encodeURIComponent(msg)
    }
    return base + encodeURIComponent('היי, אשמח לשמוע על הזדמנויות קרקע')
  }, [selected])

  // Data freshness — enhanced with live/demo status and relative time
  const dataSource = useMemo(() => {
    try { return sessionStorage.getItem('data_source') || 'demo' } catch { return 'demo' }
  }, [plots])
  const dataFreshness = useMemo(() => {
    try {
      const ts = Number(sessionStorage.getItem('data_last_fetched'))
      if (!ts) return null
      const secs = Math.floor((Date.now() - ts) / 1000)
      if (secs < 60) return 'עכשיו'
      if (secs < 3600) return `לפני ${Math.floor(secs / 60)} דק׳`
      return `לפני ${Math.floor(secs / 3600)} שע׳`
    } catch { return null }
  }, [plots])
  const dataFreshnessTitle = useMemo(() => {
    try {
      const ts = Number(sessionStorage.getItem('data_last_fetched'))
      if (!ts) return undefined
      return `עדכון אחרון: ${new Date(ts).toLocaleString('he-IL')}`
    } catch { return undefined }
  }, [plots])

  // Total area in dunams and city count
  const totalDunams = useMemo(() => {
    if (!filtered.length) return 0
    return Math.round(filtered.reduce((s, pl) => s + p(pl).size, 0) / 1000 * 10) / 10
  }, [filtered])
  const cityCount = useMemo(() => {
    if (!filtered.length) return 0
    return new Set(filtered.map(pl => pl.city).filter(Boolean)).size
  }, [filtered])

  // Recently viewed plots (resolve IDs to actual plot objects)
  const recentPlots = useMemo(() => {
    if (!recentIds.length || !plots.length) return []
    return recentIds
      .map(id => plots.find(pl => pl.id === id))
      .filter((pl): pl is Plot => !!pl)
      .slice(0, 5)
  }, [recentIds, plots])

  // ── Market Insights (rotating) — rendered by InsightsTickerOverlay ──
  const insights: InsightItem[] = useMemo(() => {
    if (!filtered.length) return []
    const items: { icon: string; text: string; val: string }[] = []
    // Best ROI plot
    const bestRoi = filtered.reduce((best, pl) => roi(pl) > roi(best) ? pl : best, filtered[0])
    const bestRoiVal = roi(bestRoi)
    if (bestRoiVal > 0) {
      items.push({ icon: '🔥', text: `תשואה גבוהה ב${bestRoi.city}`, val: `+${Math.round(bestRoiVal)}%` })
    }
    // Below average count
    const ppsList = filtered.map(pricePerSqm).filter(v => v > 0)
    if (ppsList.length > 2) {
      const avgPps = ppsList.reduce((s, v) => s + v, 0) / ppsList.length
      const below = filtered.filter(pl => { const pps = pricePerSqm(pl); return pps > 0 && pps < avgPps * 0.9 }).length
      if (below > 0) items.push({ icon: '📉', text: `${below} חלקות מתחת לממוצע`, val: 'הזדמנות' })
    }
    // Cheapest plot
    const cheapest = filtered.filter(pl => p(pl).price > 0).sort((a, b) => p(a).price - p(b).price)[0]
    if (cheapest) {
      items.push({ icon: '💎', text: `מחיר נמוך ב${cheapest.city}`, val: fmt.compact(p(cheapest).price) })
    }
    // Average score
    const scores = filtered.map(calcScore)
    const avgScore = scores.reduce((s, v) => s + v, 0) / scores.length
    items.push({ icon: '📊', text: 'ציון ממוצע', val: `${avgScore.toFixed(1)}/10` })
    // New listings (< 7 days)
    const newCount = filtered.filter(pl => {
      const created = p(pl).created
      if (!created) return false
      const days = Math.floor((Date.now() - new Date(created).getTime()) / 864e5)
      return days <= 7
    }).length
    if (newCount > 0) items.push({ icon: '✨', text: `${newCount} חלקות חדשות השבוע`, val: 'חדש' })
    // Largest plot
    const largest = filtered.reduce((best, pl) => p(pl).size > p(best).size ? pl : best, filtered[0])
    if (p(largest).size > 0) {
      items.push({ icon: '📐', text: `חלקה גדולה ב${largest.city}`, val: `${fmt.dunam(p(largest).size)} דונם` })
    }
    return items
  }, [filtered])

  // Note: insight ticker rotation is now handled inside InsightsTickerOverlay

  // OG, Twitter Card, and Canonical URL — complement the useDocumentTitle/useMetaDescription hooks
  useEffect(() => {
    const cityLabel = filters.city && filters.city !== 'all' ? filters.city : ''

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

    // Canonical URL (clean — avoids duplicate content from various filter combos)
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    const canonicalUrl = `${window.location.origin}/explore${cityLabel ? `?city=${encodeURIComponent(cityLabel)}` : ''}`
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical) }
    canonical.href = canonicalUrl

    return () => { canonical?.remove() }
  }, [filters.city, filtered.length, exploreTitle, exploreDesc])

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
      // '?' key to toggle shortcuts help
      if (e.key === '?') {
        setShortcutsOpen(o => !o)
      }
      // 'L' key to toggle list panel
      if (e.key === 'l' || e.key === 'L') {
        setListOpen(o => !o)
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
  }, [selected, sortOpen, listOpen, shortcutsOpen, sorted, selectPlot])

  return (
    <Wrap className="dark" aria-label="מפת חלקות להשקעה">
      <ErrorBoundary>
        <NetworkBanner online={online} wasOffline={wasOffline} onRetry={() => window.location.reload()} />
        {dataSource === 'demo' && !isLoading && online && (
          <DemoModeBanner onRetry={() => window.location.reload()} />
        )}
        <TopProgress $show={isLoading} />
        {isLoading && <ExploreLoadingSkeleton />}
        <MapArea
          plots={sorted} pois={pois} selected={selected} darkMode
          onSelect={selectPlot} onLead={setLeadPlot}
          favorites={{ isFav, toggle }}
          compare={{ has: isCompared, toggle: toggleCompare }}
          filterCity={filters.city}
          fullscreen={mapFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onVisiblePlotsChange={setVisibleInViewport}
        />
        {!mapFullscreen && <FilterBar filters={filters} onChange={setFilters} resultCount={filtered.length}
          plots={plots} onSelectPlot={(id) => { const pl = plots.find(pp => pp.id === id); if (pl) selectPlot(pl) }} />}
        {/* Accessibility: aria-live announcer for screen readers when filter results change */}
        <div aria-live="polite" aria-atomic="true" role="status" className="sr-only">
          {!isLoading && (filtered.length > 0
            ? `נמצאו ${filtered.length} חלקות${filters.city && filters.city !== 'all' ? ` ב${filters.city}` : ''}`
            : hasActiveFilters ? 'לא נמצאו חלקות התואמות את הסינון' : ''
          )}
        </div>

        {/* Breadcrumb navigation — SEO + UX context (like Madlan) */}
        {!mapFullscreen && !isMobile && (
          <BreadcrumbWrap aria-label="מיקום נוכחי">
            <BreadcrumbItem $clickable onClick={() => window.location.href = '/'}>ראשי</BreadcrumbItem>
            <BreadcrumbSep>‹</BreadcrumbSep>
            <BreadcrumbItem $clickable={!!(filters.city && filters.city !== 'all')} $active={!filters.city || filters.city === 'all'}
              onClick={() => { if (filters.city && filters.city !== 'all') setFilters({ ...filters, city: '' }) }}>
              חלקות להשקעה
            </BreadcrumbItem>
            {filters.city && filters.city !== 'all' && (
              <>
                <BreadcrumbSep>‹</BreadcrumbSep>
                <BreadcrumbItem $active>{filters.city}</BreadcrumbItem>
              </>
            )}
            {selected && (
              <>
                <BreadcrumbSep>‹</BreadcrumbSep>
                <BreadcrumbItem $active>חלקה {selected.number}</BreadcrumbItem>
              </>
            )}
          </BreadcrumbWrap>
        )}

        {/* Quick City Navigation Pills — dynamic from actual data */}
        {!mapFullscreen && !selected && !listOpen && !cityStats && recentPlots.length === 0 && cityPills.length > 1 && (
          <CityPillsWrap>
            {cityPills.map(cp => (
              <CityPill
                key={cp.value || 'all'}
                $active={(filters.city || '') === cp.value || (!filters.city && !cp.value)}
                onClick={() => setFilters({ ...filters, city: cp.value })}
                title={cp.count != null ? `${cp.count} חלקות` : undefined}
              >
                {cp.emoji} {cp.name}{cp.count != null && cp.value ? ` (${cp.count})` : ''}
              </CityPill>
            ))}
          </CityPillsWrap>
        )}

        {/* Empty state when no plots match filters */}
        {!mapFullscreen && !isLoading && filtered.length === 0 && hasActiveFilters && (
          <EmptyWrap>
            <EmptyIcon><SearchX size={28} color={t.gold} /></EmptyIcon>
            <EmptyTitle>לא נמצאו חלקות</EmptyTitle>
            <EmptyDesc>לא נמצאו חלקות התואמות את הסינון שבחרת. נסו להרחיב את הקריטריונים או לאפס את הסינון.</EmptyDesc>
            <EmptyResetBtn onClick={resetFilters}><RotateCcw size={14} /> אפס סינון</EmptyResetBtn>
          </EmptyWrap>
        )}

        {/* Sort dropdown + Share + Filter badge */}
        {!mapFullscreen && <SortWrap ref={sortRef}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeFilterCount > 0 && (
              <SortBtn as="div" $active style={{ cursor: 'default', gap: 4 }}>
                <Filter size={12} />
                <FilterBadge>{activeFilterCount}</FilterBadge>
                <button onClick={resetFilters} style={{ background: 'none', border: 'none', color: t.goldBright, cursor: 'pointer', display: 'flex', padding: 0, marginInlineStart: 2 }} aria-label="אפס סינון"><X size={12} /></button>
              </SortBtn>
            )}
            <ShareBtn onClick={shareView} $copied={shareCopied} aria-label="שתף תצוגה">
              {shareCopied ? <Check size={14} /> : <Share2 size={14} />}
              <span>{shareCopied ? 'הועתק!' : 'שתף'}</span>
            </ShareBtn>
            <SortBtn onClick={() => setSortOpen(o => !o)} $active={sortKey !== 'recommended'}>
              <ArrowUpDown size={14} />
              {SORT_OPTIONS.find(o => o.key === sortKey)?.label || 'מיון'}
            </SortBtn>
          </div>
          {sortOpen && (
            <SortDrop>
              {SORT_OPTIONS.map(o => (
                <SortOption key={o.key} $active={o.key === sortKey} onClick={() => { setSortWithUrl(o.key); setSortOpen(false) }}>
                  {o.label}
                </SortOption>
              ))}
            </SortDrop>
          )}
        </SortWrap>}

        <Suspense fallback={null}>
          <PlotListPanel
            plots={sorted}
            selected={selected}
            onSelect={(pl) => { selectPlot(pl); setListOpen(false) }}
            open={listOpen}
            onToggle={() => setListOpen(o => !o)}
            isLoading={isLoading}
            userLocation={sortKey === 'nearest' ? userGeo.location : null}
          />
        </Suspense>
        <Suspense fallback={null}>
          {selected && <Sidebar plot={selected} open={isMobile ? mobileExpanded : true} onClose={() => { setSelected(null); setMobileExpanded(false) }} onLead={() => setLeadPlot(selected)} plots={sorted} onNavigate={selectPlot} isCompared={isCompared(selected.id)} onToggleCompare={toggleCompare} />}
        </Suspense>
        {/* Mobile Plot Preview Bottom Card */}
        {selected && !mobileExpanded && (() => {
          const d = p(selected), score = calcScore(selected), grade = getGrade(score)
          const r = roi(selected), ppd = pricePerDunam(selected)
          const estYr = estimatedYear(selected)
          const center = plotCenter(selected.coordinates)
          const navLinks = center ? {
            gmaps: `https://www.google.com/maps/@${center.lat},${center.lng},17z`,
            waze: `https://waze.com/ul?ll=${center.lat},${center.lng}&z=17&navigate=yes`,
          } : null
          return (
            <MobilePreview $show={true} ref={previewRef}>
              <PreviewHandle />
              <PreviewBody>
                <PreviewTopRow>
                  <PreviewInfo>
                    <PreviewTitle>גוש {d.block} · חלקה {selected.number}</PreviewTitle>
                    <PreviewCity>
                      <MapIcon size={12} /> {selected.city}
                      <span style={{ color: grade.color, fontWeight: 800 }}>{grade.grade}</span>
                      <span>{fmt.dunam(d.size)} דונם</span>
                      {estYr && <span style={{ color: t.gold, fontWeight: 700, fontSize: 11 }}>🏗️ {estYr.label}</span>}
                    </PreviewCity>
                  </PreviewInfo>
                  <PreviewPrice>{fmt.compact(d.price)}</PreviewPrice>
                </PreviewTopRow>
                <PreviewMetrics>
                  {r > 0 && (
                    <PreviewMetric>
                      <PreviewMetricVal $c={r > 30 ? t.ok : t.warn}>+{fmt.pct(r)}</PreviewMetricVal>
                      <PreviewMetricLabel>תשואה</PreviewMetricLabel>
                    </PreviewMetric>
                  )}
                  {d.projected > 0 && d.price > 0 && d.projected > d.price && (
                    <PreviewMetric>
                      <PreviewMetricVal $c={t.ok}>+{fmt.compact(d.projected - d.price)}</PreviewMetricVal>
                      <PreviewMetricLabel>רווח צפוי</PreviewMetricLabel>
                    </PreviewMetric>
                  )}
                  {ppd > 0 && (
                    <PreviewMetric>
                      <PreviewMetricVal>₪{fmt.num(ppd)}</PreviewMetricVal>
                      <PreviewMetricLabel>לדונם</PreviewMetricLabel>
                    </PreviewMetric>
                  )}
                  <PreviewMetric>
                    <PreviewMetricVal $c={grade.color}>{score}/10</PreviewMetricVal>
                    <PreviewMetricLabel>ציון</PreviewMetricLabel>
                  </PreviewMetric>
                  {d.size > 0 && (
                    <PreviewMetric>
                      <PreviewMetricVal>{fmt.num(d.size)}</PreviewMetricVal>
                      <PreviewMetricLabel>מ״ר</PreviewMetricLabel>
                    </PreviewMetric>
                  )}
                </PreviewMetrics>
                {/* Quick investment insight */}
                {(() => {
                  const insight = calcQuickInsight(selected, sorted)
                  return (
                    <PreviewInsight $c={insight.color}>
                      <PreviewInsightEmoji>{insight.emoji}</PreviewInsightEmoji>
                      {insight.text}
                    </PreviewInsight>
                  )
                })()}
                {/* Navigation quick links */}
                {navLinks && (
                  <PreviewNavRow>
                    <PreviewNavLink href={navLinks.gmaps} target="_blank" rel="noopener noreferrer"
                      $bg="rgba(66,133,244,0.08)" $border="rgba(66,133,244,0.2)" $color="#4285F4"
                    >🗺️ Google Maps</PreviewNavLink>
                    <PreviewNavLink href={navLinks.waze} target="_blank" rel="noopener noreferrer"
                      $bg="rgba(51,181,229,0.08)" $border="rgba(51,181,229,0.2)" $color="#33B5E5"
                    >🚗 Waze</PreviewNavLink>
                    <PreviewNavLink
                      href={`${SITE_CONFIG.waLink}?text=${encodeURIComponent(`היי, מתעניין/ת בחלקה ${selected.number} גוש ${d.block} ב${selected.city} (${fmt.compact(d.price)}). אשמח לפרטים.`)}`}
                      target="_blank" rel="noopener noreferrer"
                      $bg="rgba(37,211,102,0.08)" $border="rgba(37,211,102,0.2)" $color="#25D366"
                    >💬 WhatsApp</PreviewNavLink>
                  </PreviewNavRow>
                )}
                <PreviewActions>
                  <PreviewDetailBtn onClick={() => setMobileExpanded(true)}>
                    <ChevronLeft size={16} /> פרטים מלאים
                  </PreviewDetailBtn>
                  <PreviewActionBtn $active={isFav(selected.id)} onClick={() => toggle(selected.id)} aria-label="מועדפים">
                    <Heart size={18} fill={isFav(selected.id) ? t.gold : 'none'} />
                  </PreviewActionBtn>
                  <PreviewActionBtn $active={isCompared(selected.id)} onClick={() => toggleCompare(selected.id)} aria-label="השוואה">
                    <GitCompareArrows size={18} />
                  </PreviewActionBtn>
                  <PreviewActionBtn onClick={() => setSelected(null)} aria-label="סגור">
                    <X size={18} />
                  </PreviewActionBtn>
                </PreviewActions>
              </PreviewBody>
            </MobilePreview>
          )
        })()}

        <Suspense fallback={null}>
          <LeadModal plot={leadPlot} open={!!leadPlot} onClose={() => setLeadPlot(null)} />
        </Suspense>
        <Suspense fallback={null}><Chat plotId={selected?.id ?? null} /></Suspense>

        {/* Floating Compare Bar */}
        {!mapFullscreen && compareIds.length > 0 && (
          <CompareBar>
            <GitCompareArrows size={16} color={t.gold} />
            <span style={{ fontSize: 13, fontWeight: 700, color: t.text, whiteSpace: 'nowrap' }}>השוואה ({compareIds.length})</span>
            {sorted.filter(pl => compareIds.includes(pl.id)).slice(0, 3).map(pl => (
              <CompareChip key={pl.id}>
                {pl.city} · {pl.number}
                <CompareChipX onClick={() => toggleCompare(pl.id)}><X size={10} /></CompareChipX>
              </CompareChip>
            ))}
            {compareIds.length >= 2 && (
              <CompareAction onClick={() => setCompareOpen(true)}>
                <GitCompareArrows size={14} /> השווה
              </CompareAction>
            )}
            <CompareClear onClick={clearCompare} aria-label="נקה השוואה"><Trash2 size={14} /></CompareClear>
          </CompareBar>
        )}

        {/* Inline Compare Drawer — no auth needed, works for everyone */}
        <Suspense fallback={null}>
          <CompareDrawer
            open={compareOpen}
            onClose={() => setCompareOpen(false)}
            plots={sorted.filter(pl => compareIds.includes(pl.id))}
            allPlots={plots}
          />
        </Suspense>

        {/* Note: single aria-live region is declared above near the filter bar */}

        {!mapFullscreen && <Stats>
          <Stat><Val><AnimatedValue value={filtered.length} /></Val> חלקות{visibleInViewport != null && visibleInViewport < filtered.length && <span style={{ opacity: 0.5, fontSize: 10 }}> ({visibleInViewport} בתצוגה)</span>}</Stat>
          {marketPulse && marketPulse.totalValue > 0 && <Stat>סה״כ <Val><AnimatedValue value={marketPulse.totalValue} format={fmt.compact} /></Val></Stat>}
          <Stat>ממוצע <Val><AnimatedValue value={Math.round(avg)} format={fmt.compact} /></Val></Stat>
          {medianPrice > 0 && <Stat>חציון <Val><AnimatedValue value={Math.round(medianPrice)} format={fmt.compact} /></Val></Stat>}
          {avgPpd > 0 && <Stat>₪/דונם <Val><AnimatedValue value={avgPpd} format={fmt.num} /></Val></Stat>}
          {marketPulse && marketPulse.avgRoi > 0 && <Stat>ROI <Val style={{color: marketPulse.avgRoi > 30 ? t.ok : t.warn}}>+<AnimatedValue value={marketPulse.avgRoi} />%</Val></Stat>}
          {totalDunams > 0 && <Stat>📐 <Val>{totalDunams}</Val> דונם</Stat>}
          {cityCount > 1 && <Stat>🏘️ <Val>{cityCount}</Val> ערים</Stat>}
          {favIds.length > 0 && <Stat><Heart size={12} color={t.gold} /><Val>{favIds.length}</Val></Stat>}
          {compareIds.length > 0 && <Stat><GitCompareArrows size={12} color={t.gold} /><Val>{compareIds.length}</Val></Stat>}
          {avgDom != null && <Stat>📅 <Val>{avgDom}</Val> ימים ממוצע</Stat>}
          {sortKey === 'nearest' && userGeo.location && <Stat>📍 <Val>לפי קרבה</Val></Stat>}
          {sortKey === 'nearest' && userGeo.loading && <Stat>📍 מאתר...</Stat>}
          {sortKey === 'nearest' && userGeo.error && <Stat style={{color:t.err}}>⚠️ שגיאה</Stat>}
          {dataFreshness && <Stat title={dataFreshnessTitle}>🕐 <span style={{opacity:0.7}}>{dataFreshness}</span></Stat>}
          {sse.status === 'connected' ? (
            <LiveBadge $connected title={`חיבור חי — ${sse.updateCount} עדכונים`}>
              <LiveDot $c={t.ok} /> LIVE
              {sse.updateCount > 0 && <span style={{opacity:0.7}}>({sse.updateCount})</span>}
            </LiveBadge>
          ) : (
            <Demo>{dataSource === 'api' ? 'API' : 'DEMO'}</Demo>
          )}
        </Stats>}

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
                        <span style={{ color: grade.color, fontWeight: 700 }}>{grade.grade}</span>
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

        {/* Mobile Calculator Overlay */}
        <MobileOverlay $open={tab === 'calc'}>
          <MobileOverlayHeader>
            <MobileOverlayTitle><Calculator size={18} color={t.gold} /> מחשבון מימון</MobileOverlayTitle>
            <MobileOverlayClose onClick={() => setTab('map')}><X size={16} /></MobileOverlayClose>
          </MobileOverlayHeader>
          <CalcCard>
            <CalcTitle><DollarSign size={16} color={t.gold} /> סכום הנכס</CalcTitle>
            <CalcInput type="number" value={calcPrice} placeholder="הכנס מחיר..." onChange={e => setCalcPrice(Math.max(0, Number(e.target.value)))} />
          </CalcCard>
          <CalcCard>
            <CalcTitle><Calculator size={16} color={t.gold} /> פרמטרים</CalcTitle>
            <CalcSliderRow>
              <CalcSliderLabel><CalcSliderName>אחוז מימון (LTV)</CalcSliderName><CalcSliderVal>{calcLtv}%</CalcSliderVal></CalcSliderLabel>
              <CalcSlider min={10} max={80} step={5} value={calcLtv}
                style={{ '--pct': `${((calcLtv - 10) / 70) * 100}%` } as React.CSSProperties}
                onChange={e => setCalcLtv(Number(e.target.value))} />
            </CalcSliderRow>
            <CalcSliderRow>
              <CalcSliderLabel><CalcSliderName>ריבית שנתית</CalcSliderName><CalcSliderVal>{calcRate}%</CalcSliderVal></CalcSliderLabel>
              <CalcSlider min={2} max={12} step={0.5} value={calcRate}
                style={{ '--pct': `${((calcRate - 2) / 10) * 100}%` } as React.CSSProperties}
                onChange={e => setCalcRate(Number(e.target.value))} />
            </CalcSliderRow>
            <CalcSliderRow>
              <CalcSliderLabel><CalcSliderName>תקופה</CalcSliderName><CalcSliderVal>{calcYears} שנים</CalcSliderVal></CalcSliderLabel>
              <CalcSlider min={5} max={30} step={1} value={calcYears}
                style={{ '--pct': `${((calcYears - 5) / 25) * 100}%` } as React.CSSProperties}
                onChange={e => setCalcYears(Number(e.target.value))} />
            </CalcSliderRow>
            {calcMortgage && (
              <CalcResult>
                <CalcResultItem><CalcResultVal $gold>{fmt.price(calcMortgage.monthly)}</CalcResultVal><CalcResultLabel>החזר חודשי</CalcResultLabel></CalcResultItem>
                <CalcResultItem><CalcResultVal>{fmt.price(calcMortgage.down)}</CalcResultVal><CalcResultLabel>הון עצמי</CalcResultLabel></CalcResultItem>
                <CalcResultItem><CalcResultVal>{fmt.price(calcMortgage.loan)}</CalcResultVal><CalcResultLabel>סכום הלוואה</CalcResultLabel></CalcResultItem>
                <CalcResultItem><CalcResultVal>{fmt.price(calcMortgage.monthly * calcYears * 12)}</CalcResultVal><CalcResultLabel>סה״כ החזר</CalcResultLabel></CalcResultItem>
              </CalcResult>
            )}
          </CalcCard>
          {selected && (
            <CalcCard>
              <CalcTitle>חלקה נבחרת</CalcTitle>
              <div style={{ fontSize: 14, color: t.textSec }}>
                {selected.city} · גוש {p(selected).block} · חלקה {selected.number}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: t.gold, marginTop: 8 }}>
                {fmt.price(p(selected).price)}
              </div>
              <button onClick={() => { setCalcPrice(p(selected).price); }} style={{
                marginTop: 12, padding: '8px 16px', background: t.goldDim, border: `1px solid ${t.goldBorder}`,
                borderRadius: t.r.md, color: t.gold, fontSize: 13, fontWeight: 600, fontFamily: t.font, cursor: 'pointer',
              }}>השתמש במחיר הזה</button>
            </CalcCard>
          )}
        </MobileOverlay>

        {/* City Statistics Card (appears when filtering by city) */}
        {!mapFullscreen && cityStats && !cityStatsDismissed && !selected && (
          <CityStatsOverlay
            cityName={filters.city}
            stats={cityStats}
            marketTemp={marketTemp}
            onDismiss={() => setCityStatsDismissed(true)}
          />
        )}

        {/* Market Pulse Widget — investment at-a-glance (desktop only, when no plot/city selected) */}
        {!mapFullscreen && marketPulse && !selected && !cityStats && !listOpen && filtered.length >= 2 && (
          <MarketPulseOverlay pulse={marketPulse} marketTemp={marketTemp} />
        )}

        {/* Market Insights Ticker (show when no overlays active) */}
        {!mapFullscreen && insights.length > 0 && !selected && !listOpen && !cityStats && recentPlots.length === 0 && (
          <InsightsTickerOverlay insights={insights} tabVisible={tabVisible} />
        )}

        {/* Recently Viewed Strip (show only when user has viewed plots and no sidebar is open) */}
        {!mapFullscreen && recentPlots.length > 0 && !selected && !listOpen && !cityStats && (
          <RecentlyViewedStrip plots={recentPlots} onSelect={selectPlot} />
        )}

        {/* Top Investment Pick — floating highlight card */}
        {!mapFullscreen && topPick && !topPickDismissed && !selected && !listOpen && !compareOpen && (
          <TopPickOverlay plot={topPick} onSelect={selectPlot} onDismiss={() => setTopPickDismissed(true)} />
        )}

        {/* WhatsApp Floating CTA */}
        {!mapFullscreen && <WhatsAppFab
          href={waLink}
          target="_blank" rel="noopener noreferrer"
          aria-label="שלח הודעה בוואטסאפ"
          onMouseEnter={() => setWaHover(true)}
          onMouseLeave={() => setWaHover(false)}
        >
          <MessageCircle size={26} />
        </WhatsAppFab>}
        {!mapFullscreen && waHover && <WhatsAppTooltip>{selected ? `שאל על חלקה ${selected.number}` : 'דברו עם מומחה קרקע'}</WhatsAppTooltip>}

        {/* Keyboard Shortcuts Help Dialog */}
        <KbdBackdrop $open={shortcutsOpen} onClick={() => setShortcutsOpen(false)}>
          <KbdPanel ref={kbdTrapRef} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="קיצורי מקשים">
            <KbdHeader>
              <KbdTitle>⌨️ קיצורי מקשים</KbdTitle>
              <KbdCloseBtn onClick={() => setShortcutsOpen(false)}><X size={16} /></KbdCloseBtn>
            </KbdHeader>
            <KbdList>
              {SHORTCUTS.map(s => (
                <KbdRow key={s.keys.join('+')}>
                  <KbdLabel>{s.label}</KbdLabel>
                  <KbdCombo>
                    {s.keys.map((k, i) => (
                      <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {i > 0 && <span style={{ fontSize: 10, color: t.textDim }}>+</span>}
                        <KbdKey>{k}</KbdKey>
                      </span>
                    ))}
                  </KbdCombo>
                </KbdRow>
              ))}
            </KbdList>
            <KbdFooter>לחצו <KbdKey style={{ display: 'inline-flex', margin: '0 4px' }}>?</KbdKey> בכל עת להצגת קיצורים</KbdFooter>
          </KbdPanel>
        </KbdBackdrop>

        {!mapFullscreen && (() => {
          const tabOrder = ['map', 'fav', 'calc', 'areas'] as const
          // Derive effective tab: if list panel is open while tab is 'map', show 'areas' as active
          const effectiveTab = (tab === 'map' && listOpen) ? 'areas' : tab
          const activeIdx = tabOrder.indexOf(effectiveTab as any)
          return (
            <MobileNav role="navigation" aria-label="ניווט ראשי" style={{ position: 'relative' }}>
              <NavIndicator $idx={activeIdx >= 0 ? activeIdx : 0} $total={tabOrder.length} />
              <NavBtn $active={effectiveTab==='map'} onClick={()=>{ setTab('map'); setListOpen(false) }} aria-label="מפה" aria-current={effectiveTab==='map'?'page':undefined}>
                <NavBtnWrap>
                  <MapIcon size={20}/>
                  {activeFilterCount > 0 && <NavBadge>{activeFilterCount}</NavBadge>}
                </NavBtnWrap>
                מפה
              </NavBtn>
              <NavBtn $active={effectiveTab==='fav'} onClick={()=>{ setTab('fav'); setListOpen(false) }} aria-label={`מועדפים${favIds.length>0?` (${favIds.length})`:''}`} aria-current={effectiveTab==='fav'?'page':undefined}>
                <NavBtnWrap>
                  <Heart size={20}/>
                  {favIds.length > 0 && <NavBadge>{favIds.length}</NavBadge>}
                </NavBtnWrap>
                מועדפים
              </NavBtn>
              <NavBtn $active={effectiveTab==='calc'} onClick={()=>{ setTab('calc'); setListOpen(false) }} aria-label="מחשבון מימון" aria-current={effectiveTab==='calc'?'page':undefined}><Calculator size={20}/>מחשבון</NavBtn>
              <NavBtn $active={effectiveTab==='areas'} onClick={()=>{ setTab('map'); setListOpen(o => !o) }} aria-label="רשימת חלקות" aria-current={effectiveTab==='areas'?'page':undefined}>
                <NavBtnWrap>
                  <Layers size={20}/>
                  {sorted.length > 0 && <NavBadge>{sorted.length > 99 ? '99+' : sorted.length}</NavBadge>}
                </NavBtnWrap>
                רשימה
              </NavBtn>
            </MobileNav>
          )
        })()}
      </ErrorBoundary>
    </Wrap>
  )
}
