import { useState, useMemo, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { Map as MapIcon, Heart, Layers, ArrowUpDown, GitCompareArrows, X, Trash2, SearchX, RotateCcw, ChevronLeft, Keyboard, Eye, Share2, TrendingDown, TrendingUp, Minus, Home, BarChart3 } from 'lucide-react'
import { t, mobile } from '../theme'
import { useAllPlots, useFavorites, useCompare, useDebounce, useUserLocation, useOnlineStatus, useIsMobile, useSSE, useDocumentTitle, useMetaDescription, useRecentlyViewed } from '../hooks'
// Note: dataFreshness and dataSource are computed locally in this component (not via hooks)
import MapArea from '../components/Map'
import FilterBar from '../components/Filters'
import { ErrorBoundary, useToast, NetworkBanner, AnimatedValue, DemoModeBanner, ExploreLoadingSkeleton } from '../components/UI'
import { p, roi, fmt, sortPlots, SORT_OPTIONS, pricePerSqm, calcScore, getGrade, calcQuickInsight, pricePosition } from '../utils'
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
  direction:rtl;position:relative;overflow:hidden;
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
  const [mobileExpanded, setMobileExpanded] = useState(false)
  const [mapFullscreen, setMapFullscreen] = useState(false)
  const toggleFullscreen = useCallback(() => setMapFullscreen(f => !f), [])
  const [visibleInViewport, setVisibleInViewport] = useState<number | null>(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

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
    return list
  }, [plots, filters.sizeMin, filters.sizeMax, filters.belowAvg, filters.minRoi, filters.ripeness, dSearch])

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
    return {
      city,
      count: filtered.length,
      avgPrice: avg,
      minPrice,
      maxPrice,
      avgScore: Math.round(avgScore * 10) / 10,
      avgSize: Math.round(avgSize),
    }
  }, [filters.city, filtered, avg])

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

  const hasActiveFilters = useMemo(() =>
    Object.entries(filters).some(([, v]) => v && v !== 'all'), [filters])

  const resetFilters = useCallback(() => {
    setFilters(DEFAULTS)
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
          </CityMarketCard>
        )}

        {/* Accessibility: aria-live announcer for screen readers when filter results change */}
        <div aria-live="polite" aria-atomic="true" role="status" className="sr-only">
          {!isLoading && (filtered.length > 0
            ? `נמצאו ${filtered.length} חלקות${filters.city && filters.city !== 'all' ? ` ב${filters.city}` : ''}`
            : hasActiveFilters ? 'לא נמצאו חלקות התואמות את הסינון' : ''
          )}
        </div>

        {/* Empty state when no plots match filters */}
        {!mapFullscreen && !isLoading && filtered.length === 0 && hasActiveFilters && (
          <EmptyWrap>
            <EmptyIcon><SearchX size={28} color={t.gold} /></EmptyIcon>
            <EmptyTitle>לא נמצאו חלקות</EmptyTitle>
            <EmptyDesc>לא נמצאו חלקות התואמות את הסינון שבחרת. נסו להרחיב את הקריטריונים או לאפס את הסינון.</EmptyDesc>
            <EmptyResetBtn onClick={resetFilters}><RotateCcw size={14} /> אפס סינון</EmptyResetBtn>
          </EmptyWrap>
        )}

        {/* Sort dropdown */}
        {!mapFullscreen && <SortWrap ref={sortRef}>
          <SortBtn onClick={() => setSortOpen(o => !o)} $active={sortKey !== 'recommended'}>
            <ArrowUpDown size={14} />
            {SORT_OPTIONS.find(o => o.key === sortKey)?.label || 'מיון'}
          </SortBtn>
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
            recentlyViewedIds={recentlyViewed.ids}
          />
        </Suspense>
        <Suspense fallback={null}>
          {selected && <Sidebar plot={selected} open={isMobile ? mobileExpanded : true} onClose={() => { setSelected(null); setMobileExpanded(false) }} onLead={() => setLeadPlot(selected)} plots={sorted} onNavigate={selectPlot} isCompared={isCompared(selected.id)} onToggleCompare={toggleCompare} />}
        </Suspense>
        {/* Mobile Plot Preview Bottom Card — simplified */}
        {selected && !mobileExpanded && (() => {
          const d = p(selected), score = calcScore(selected), grade = getGrade(score)
          const insight = calcQuickInsight(selected, sorted)
          const pp = pricePosition(selected, sorted)
          return (
            <MobilePreview $show={true} ref={previewRef}>
              <PreviewHandle />
              <PreviewBody>
                <PreviewTopRow>
                  <PreviewInfo>
                    <PreviewTitle>גוש {d.block} · חלקה {selected.number}</PreviewTitle>
                    <PreviewCity>
                      <MapIcon size={12} /> {selected.city}
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
                <PreviewScore $c={grade.color}>
                  ציון השקעה: {score}/10 — {grade.grade}
                </PreviewScore>
                {/* Quick investment insight */}
                {insight.priority >= 4 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                    background: `${insight.color}10`, border: `1px solid ${insight.color}25`,
                    borderRadius: t.r.full, fontSize: 11, fontWeight: 700, color: insight.color,
                    direction: 'rtl',
                  }}>
                    {insight.emoji} {insight.text}
                  </div>
                )}
                <PreviewActions>
                  <PreviewDetailBtn onClick={() => setMobileExpanded(true)}>
                    <ChevronLeft size={16} /> פרטים מלאים
                  </PreviewDetailBtn>
                  <PreviewQuickActions>
                    <PreviewQuickBtn
                      onClick={() => sharePlot(selected)}
                      aria-label="שתף חלקה"
                      title="שתף"
                    >
                      <Share2 size={16} />
                    </PreviewQuickBtn>
                    <PreviewQuickBtn
                      $active={isFav(selected.id)}
                      $color="#EF4444"
                      onClick={() => toggle(selected.id)}
                      aria-label={isFav(selected.id) ? 'הסר מהמועדפים' : 'הוסף למועדפים'}
                      title="מועדפים"
                    >
                      <Heart size={16} fill={isFav(selected.id) ? '#EF4444' : 'none'} />
                    </PreviewQuickBtn>
                    <PreviewQuickBtn
                      $active={isCompared(selected.id)}
                      $color={t.info}
                      onClick={() => toggleCompare(selected.id)}
                      aria-label={isCompared(selected.id) ? 'הסר מהשוואה' : 'הוסף להשוואה'}
                      title="השוואה"
                    >
                      <GitCompareArrows size={16} />
                    </PreviewQuickBtn>
                  </PreviewQuickActions>
                  <PreviewCloseBtn onClick={() => setSelected(null)} aria-label="סגור">
                    <X size={18} />
                  </PreviewCloseBtn>
                </PreviewActions>
              </PreviewBody>
            </MobilePreview>
          )
        })()}

        <Suspense fallback={null}>
          <LeadModal plot={leadPlot} open={!!leadPlot} onClose={() => setLeadPlot(null)} />
        </Suspense>
        <Suspense fallback={null}><Chat plotId={selected?.id ?? null} /></Suspense>

        {/* Floating Compare Bar — simplified */}
        {!mapFullscreen && compareIds.length > 0 && (
          <CompareBar>
            <GitCompareArrows size={16} color={t.gold} />
            <span style={{ fontSize: 13, fontWeight: 700, color: t.text, whiteSpace: 'nowrap' }}>השוואה ({compareIds.length})</span>
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

        {/* Stats bar with viewport visible count */}
        {!mapFullscreen && (() => {
          const prices = filtered.map(pl => p(pl).price).filter(v => v > 0)
          const minPrice = prices.length ? Math.min(...prices) : 0
          const maxPrice = prices.length ? Math.max(...prices) : 0
          return (
            <Stats>
              <Stat><Val><AnimatedValue value={filtered.length} /></Val> חלקות</Stat>
              {visibleInViewport != null && visibleInViewport < filtered.length && (
                <ViewportStat title="חלקות הנראות בתצוגת המפה הנוכחית">
                  <Eye size={10} /> {visibleInViewport} נראות
                </ViewportStat>
              )}
              <Stat>ממוצע <Val><AnimatedValue value={Math.round(avg)} format={fmt.compact} /></Val></Stat>
              {prices.length >= 2 && (
                <Stat title={`טווח: ${fmt.compact(minPrice)} – ${fmt.compact(maxPrice)}`}>
                  {fmt.short(minPrice)} – <Val>{fmt.short(maxPrice)}</Val>
                </Stat>
              )}
              {sse.status === 'connected' ? (
                <LiveBadge $connected title={`חיבור חי — ${sse.updateCount} עדכונים מתעדכנים אוטומטית`}>
                  <LiveDot $c={t.ok} /> עדכני
                </LiveBadge>
              ) : dataSource === 'api' ? (
                <LiveBadge $connected={false} title="נתונים מהשרת — חיבור חי לא פעיל">
                  <LiveDot $c={t.warn} /> נתוני שרת
                </LiveBadge>
              ) : (
                <Demo title="נתונים לדוגמה — השרת לא זמין">נתוני דמו</Demo>
              )}
              <KbHintBtn onClick={() => setShortcutsOpen(true)} title="קיצורי מקלדת (?)">
                <Keyboard size={10} /> ?
              </KbHintBtn>
            </Stats>
          )
        })()}

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

        {/* Mobile Nav — 3 tabs */}
        {!mapFullscreen && (() => {
          const tabOrder = ['map', 'fav', 'areas'] as const
          // Derive effective tab: if list panel is open while tab is 'map', show 'areas' as active
          const effectiveTab = (tab === 'map' && listOpen) ? 'areas' : tab
          const activeIdx = tabOrder.indexOf(effectiveTab as any)
          return (
            <MobileNav role="navigation" aria-label="ניווט ראשי" style={{ position: 'relative' }}>
              <NavIndicator $idx={activeIdx >= 0 ? activeIdx : 0} $total={tabOrder.length} />
              <NavBtn $active={effectiveTab==='map'} onClick={()=>{ setTab('map'); setListOpen(false) }} aria-label="מפה" aria-current={effectiveTab==='map'?'page':undefined}>
                <NavBtnWrap>
                  <MapIcon size={20}/>
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
