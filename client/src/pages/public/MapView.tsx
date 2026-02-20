import { useState, useMemo, useCallback, useEffect, useRef, Suspense, useDeferredValue, lazy, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import styled, { css } from 'styled-components'
import { theme, media } from '../../styles/theme'
import { fadeIn, pulse, bounceIn, shimmerBg } from '../../components/ds'
import { useAllPlots } from '../../hooks/usePlots'
import { useQuery } from '@tanstack/react-query'
import { getPois } from '../../api/pois'
import { useFavorites, usePersonalNotes, useRecentlyViewed, useSavedSearches } from '../../hooks/useUserData'
import { useDebounce } from '../../hooks/useUI'
import MapArea from '../../components/MapArea'
import { MapErrorBoundary } from '../../components/ui/ErrorBoundaries'
import FilterBar from '../../components/FilterBar'
import PlotCardStrip from '../../components/PlotCardStrip'
import CompareBar from '../../components/CompareBar'
import Spinner from '../../components/ui/Spinner'
import { WidgetErrorBoundary } from '../../components/ui/ErrorBoundaries'
import { useMetaTags, useStructuredData, useThemeColor, themeColors } from '../../hooks/useSEO'
import { formatCurrency, formatPriceShort } from '../../utils/format'
import { calcInvestmentScore, calcCAGR, calcMonthlyPayment } from '../../utils/investment'
import { haversineKm, plotCenter } from '../../utils/geo'
import { useViewTracker, usePriceTracker } from '../../hooks/useTracking'
import { Phone, WifiOff, Wifi, RefreshCw, Radio } from 'lucide-react'
import { whatsappLink, plotOgImageUrl, trackContactConversion } from '../../utils/config'
import { showToast } from '../../components/ui/ToastContainer'
import { useRealtimeUpdates, useRefreshOnReturn, useLocalStorage, useNetworkStatus } from '../../hooks/useInfra'
import { usePriceChanges } from '../../hooks/useMarket'
import ViewportSummary from '../../components/ViewportSummary'
import { ActiveFilterChips, FilterSuggestions } from '../../components/FilterBar'
import DataFreshnessIndicator from '../../components/DataFreshnessIndicator'

const SidebarDetails = lazy(() => import('../../components/SidebarDetails'))
const AIChat = lazy(() => import('../../components/AIChat'))
const LeadModal = lazy(() => import('../../components/LeadModal'))
const RecentlyViewed = lazy(() => import('../../components/RecentlyViewed'))
const AlertSubscription = lazy(() => import('../../components/AlertSubscription'))
const FeaturedDeals = lazy(() => import('../../components/MarketWidgets').then(m => ({ default: m.FeaturedDeals })))
const MarketTicker = lazy(() => import('../../components/MarketWidgets').then(m => ({ default: m.MarketTicker })))
const PriceMovers = lazy(() => import('../../components/MarketWidgets').then(m => ({ default: m.PriceMovers })))
const MobilePlotActionBar = lazy(() => import('../../components/ui/MobilePlotActionBar'))
const MarketPulse = lazy(() => import('../../components/MarketWidgets').then(m => ({ default: m.MarketPulse })))
const MarketVelocity = lazy(() => import('../../components/MarketWidgets').then(m => ({ default: m.MarketVelocity })))
const DealSpotlight = lazy(() => import('../../components/MarketWidgets').then(m => ({ default: m.DealSpotlight })))

const plotDetailPreload = () => import('../../pages/public/PlotDetail')

type Filters = {
  city: string
  priceMin: string
  priceMax: string
  sizeMin: string
  sizeMax: string
  ripeness: string
  minRoi: string
  zoning: string
  maxDays: string
  maxMonthly: string
  search: string
}

type BoundsFilter = {
  north: number
  south: number
  east: number
  west: number
}

type Plot = {
  id: string
  block_number?: string | number
  blockNumber?: string | number
  number?: string | number
  city?: string
  description?: string
  total_price?: number
  totalPrice?: number
  size_sqm?: number
  sizeSqM?: number
  projected_value?: number
  projectedValue?: number
  coordinates?: number[][]
  created_at?: string
  createdAt?: string
  updated_at?: string
  updatedAt?: string
  readiness_estimate?: string
  readinessEstimate?: string
  _netRoi?: number
  _roi?: number
  _investmentScore?: number
  _dataCompleteness?: number
}

type Poi = Record<string, unknown>
type NavIndicator = { index: number; total: number }
type UserLocation = { lat: number; lng: number }
type PriceChange = Record<string, unknown>

type FavoritesStore = {
  ids: string[]
  toggle: (id: string) => void
  isFavorite: (id: string) => boolean
}

type SavedSearch = {
  id?: string
  filters: Filters
  statusFilter?: string[]
  sortBy?: string
}

type UseAllPlotsResult = {
  data?: Plot[]
  isLoading: boolean
  error?: Error | null
  refetch: () => void
  isPlaceholderData?: boolean
  dataUpdatedAt?: number
  isMockData?: boolean
  isStaleData?: boolean
}

type UsePoisResult = {
  data?: Poi[]
}

type UsePriceChangesResult = {
  data: Map<string, PriceChange>
}

const initialFilters: Filters = {
  city: 'all',
  priceMin: '',
  priceMax: '',
  sizeMin: '',
  sizeMax: '',
  ripeness: 'all',
  minRoi: 'all',
  zoning: 'all',
  maxDays: '',
  maxMonthly: '',
  search: '',
}

/* ═══════════════════════════════════════════════════════════
   Styled (page-specific — cannot be replaced by DS)
   ═══════════════════════════════════════════════════════════ */

const PageRoot = styled.div<{ $sidebarOpen: boolean }>`
  position: relative;
  height: 100dvh;
  width: 100vw;
  overflow: hidden;
  background: ${theme.colors.navy};
`

const FilterLoadingIndicator = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: ${theme.zIndex.mapControls};
  height: 2px;
`

const FilterLoadingBar = styled.div`
  height: 100%;
  border-radius: ${theme.radii.full};
  background: linear-gradient(90deg, ${theme.colors.gold}, ${theme.colors.goldBright}, ${theme.colors.gold});
  animation: ${pulse} 1.6s ease-in-out infinite;
`

const FloatingBanner = styled.div`
  position: fixed;
  top: 48px;
  left: 50%;
  transform: translateX(-50%);
  z-index: ${theme.zIndex.mapControls};
  animation: ${bounceIn} 0.5s ease;
`

const BannerCard = styled.div<{ $tone: 'amber' | 'emerald' }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: ${({ $tone }) => ($tone === 'emerald' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.12)')};
  backdrop-filter: blur(12px);
  border: 1px solid ${({ $tone }) => ($tone === 'emerald' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(245, 158, 11, 0.25)')};
  border-radius: ${theme.radii.xxl};
  box-shadow: ${theme.shadows.elevated};
`

const BannerDot = styled.span<{ $tone: 'amber' | 'emerald'; $pulse?: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: ${theme.radii.full};
  background: ${({ $tone }) => ($tone === 'emerald' ? theme.colors.emerald : theme.colors.amber)};
  animation: ${({ $pulse }) => ($pulse ? pulse : 'none')} 1.4s ease-in-out infinite;
  flex-shrink: 0;
`

const BannerText = styled.span<{ $tone: 'amber' | 'emerald' }>`
  font-size: 12px;
  font-weight: 500;
  color: ${({ $tone }) => ($tone === 'emerald' ? '#A7F3D0' : '#FCD34D')};
`

const BannerAction = styled.button<{ $tone: 'amber' }>`
  font-size: 10px;
  font-weight: 700;
  color: ${theme.colors.amber};
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
  padding: 2px 8px;
  border-radius: ${theme.radii.lg};
  transition: ${theme.transitions.fast};
  cursor: pointer;
  flex-shrink: 0;
  &:hover { background: rgba(245, 158, 11, 0.2); }
`

const BoundsBadge = styled.div`
  position: fixed;
  top: 56px;
  left: 50%;
  transform: translateX(-50%);
  z-index: ${theme.zIndex.filterBar};
`

const BoundsBadgeInner = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(200, 148, 42, 0.15);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(200, 148, 42, 0.25);
  border-radius: ${theme.radii.full};
  box-shadow: ${theme.shadows.elevated};
`

const SrOnly = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`

const NavIndicatorOverlay = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 200;
  pointer-events: none;
  animation: ${fadeIn} 0.25s ease;
`

const SidebarFallback = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  height: 100%;
  width: 100%;
  max-width: 100%;
  z-index: ${theme.zIndex.sidebar};
  background: ${theme.colors.navy};
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
  ${media.sm} { width: 420px; }
  ${media.md} { width: 480px; }
  ${media.lg} { width: 520px; }
  ${media.xl} { width: 560px; }
`

const EmptyStateOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 25;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`

const EmptyStateCard = styled.div`
  pointer-events: auto;
  background: rgba(10, 22, 40, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radii.xxl};
  padding: 28px 32px;
  max-width: 360px;
  text-align: center;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
  animation: ${fadeIn} 0.25s ease;
`

const ShortcutsHint = styled.button`
  position: fixed;
  bottom: 88px;
  left: 16px;
  z-index: 25;
  display: none;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(10, 22, 40, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radii.xl};
  font-size: 10px;
  color: ${theme.colors.slate[500]};
  transition: ${theme.transitions.smooth};
  cursor: pointer;
  ${media.sm} { display: flex; }
  &:hover { color: ${theme.colors.gold}; border-color: rgba(200, 148, 42, 0.2); }
  &:hover span { color: ${theme.colors.gold}; border-color: rgba(200, 148, 42, 0.2); }
`

const ContactFabDesktop = styled.div`
  position: fixed;
  bottom: 256px;
  left: 16px;
  z-index: 30;
  display: none;
  flex-direction: column;
  gap: 8px;
  animation: ${bounceIn} 0.5s ease;
  ${media.sm} { display: flex; }
`

const ContactFabMobile = styled.div`
  position: fixed;
  bottom: 208px;
  right: 72px;
  z-index: 30;
  ${media.sm} { display: none; }
`

const ContactButton = styled.a<{ $tone: 'whatsapp' | 'telegram' }>`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${theme.radii.xl};
  background: ${({ $tone }) => ($tone === 'whatsapp' ? '#25D366' : '#229ED9')};
  box-shadow: ${({ $tone }) =>
    $tone === 'whatsapp'
      ? '0 12px 24px rgba(37, 211, 102, 0.3)'
      : '0 12px 24px rgba(34, 158, 217, 0.3)'};
  transition: ${theme.transitions.smooth};
  &:hover {
    transform: scale(1.1);
    box-shadow: ${({ $tone }) =>
      $tone === 'whatsapp'
        ? '0 16px 32px rgba(37, 211, 102, 0.35)'
        : '0 16px 32px rgba(34, 158, 217, 0.35)'};
  }
`

const ContactCallButton = styled.button`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(90deg, ${theme.colors.gold}, ${theme.colors.goldBright});
  color: ${theme.colors.navy};
  border-radius: ${theme.radii.xl};
  box-shadow: 0 12px 24px rgba(200, 148, 42, 0.3);
  border: none;
  cursor: pointer;
  transition: ${theme.transitions.smooth};
  &:hover { transform: scale(1.1); box-shadow: 0 16px 32px rgba(200, 148, 42, 0.35); }
`

const PrimaryButton = styled.button`
  padding: 10px 24px;
  background: linear-gradient(90deg, ${theme.colors.gold}, ${theme.colors.goldBright});
  color: ${theme.colors.navy};
  font-weight: 700;
  font-size: 14px;
  border-radius: ${theme.radii.xl};
  border: none;
  cursor: pointer;
  transition: ${theme.transitions.smooth};
  &:hover { box-shadow: 0 12px 24px rgba(200, 148, 42, 0.3); }
`

/* ═══ Inline helper: IdleRender ═══ */

function IdleRender({ children, timeout = 2000, fallback = null }: { children: ReactNode; timeout?: number; fallback?: ReactNode }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => setReady(true), { timeout })
      return () => window.cancelIdleCallback(id)
    }
    const timer = window.setTimeout(() => setReady(true), 200)
    return () => window.clearTimeout(timer)
  }, [timeout])
  return ready ? children : fallback
}

/* ═══ Inline helper: OfflineBanner ═══ */

const OfflineBannerBar = styled.div<{ $bg: string; $border: string; $text: string; $shadow: string }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: ${({ $bg }) => $bg};
  border: 1px solid ${({ $border }) => $border};
  border-radius: ${theme.radii.xxl};
  box-shadow: ${({ $shadow }) => $shadow};
  color: ${({ $text }) => $text};
  backdrop-filter: blur(12px);
`

function OfflineBanner({ onReconnect }: { onReconnect?: () => void }) {
  const { online } = useNetworkStatus()
  const [showReconnected, setShowReconnected] = useState(false)
  const wasOfflineRef = useRef(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!online) {
      wasOfflineRef.current = true
      setShowReconnected(false)
      if (timerRef.current) window.clearTimeout(timerRef.current)
    } else if (wasOfflineRef.current) {
      wasOfflineRef.current = false
      setShowReconnected(true)
      if (onReconnect) { try { onReconnect() } catch {} }
      timerRef.current = window.setTimeout(() => setShowReconnected(false), 4000)
    }
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current) }
  }, [online, onReconnect])

  if (online && !showReconnected) return null

  return (
    <div style={{ position: 'fixed', top: 48, left: '50%', transform: 'translateX(-50%)', zIndex: 110, direction: 'rtl' }} role="alert" aria-live="assertive">
      {!online ? (
        <OfflineBannerBar $bg={`${theme.colors.red}26`} $border={`${theme.colors.red}40`} $text={theme.colors.red} $shadow={`0 12px 30px ${theme.colors.red}1a`}>
          <WifiOff size={16} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{'\u05D0\u05D9\u05DF \u05D7\u05D9\u05D1\u05D5\u05E8 \u05DC\u05D0\u05D9\u05E0\u05D8\u05E8\u05E0\u05D8'}</span>
            <span style={{ fontSize: 10, opacity: 0.75 }}>{'\u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D4\u05DE\u05D5\u05E6\u05D2\u05D9\u05DD \u05E2\u05E9\u05D5\u05D9\u05D9\u05DD \u05DC\u05D4\u05D9\u05D5\u05EA \u05DC\u05D0 \u05DE\u05E2\u05D5\u05D3\u05DB\u05E0\u05D9\u05DD'}</span>
          </div>
        </OfflineBannerBar>
      ) : (
        <OfflineBannerBar $bg={`${theme.colors.emerald}26`} $border={`${theme.colors.emerald}40`} $text={theme.colors.emerald} $shadow={`0 12px 30px ${theme.colors.emerald}1a`}>
          <Wifi size={16} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>{'\u05D7\u05D6\u05E8\u05EA \u05DC\u05D0\u05D9\u05E0\u05D8\u05E8\u05E0\u05D8'}</span>
          <RefreshCw size={12} style={{ opacity: 0.6, animation: 'spin 1.2s linear infinite' }} />
          <span style={{ fontSize: 10, opacity: 0.75 }}>{'\u05DE\u05E8\u05E2\u05E0\u05DF \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD...'}</span>
        </OfflineBannerBar>
      )}
    </div>
  )
}

/* ═══ Inline helper: ConnectionStatus ═══ */

const ConnBanner = styled.div<{ $bg: string; $border: string; $color: string }>`
  position: fixed;
  top: 44px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  padding: 10px 16px;
  border-radius: ${theme.radii.xxl};
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 500;
  background: ${({ $bg }) => $bg};
  border: 1px solid ${({ $border }) => $border};
  color: ${({ $color }) => $color};
  box-shadow: ${theme.shadows.elevated};
  backdrop-filter: blur(12px);
  transition: opacity ${theme.transitions.smooth};
  direction: rtl;
`

const ConnBannerIcon = styled.span<{ $pulse: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  ${({ $pulse }) => $pulse && css`animation: ${pulse} 1.5s ease-in-out infinite;`}
`

type ConnBannerState = 'hidden' | 'offline' | 'no-sse' | 'restored'

function ConnectionStatus({ sseConnected = true }: { sseConnected?: boolean }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showBanner, setShowBanner] = useState(false)
  const [bannerState, setBannerState] = useState<ConnBannerState>('hidden')
  const [wasDisconnected, setWasDisconnected] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (wasDisconnected) {
        setBannerState('restored')
        setShowBanner(true)
        setTimeout(() => setShowBanner(false), 3000)
      }
    }
    const handleOffline = () => {
      setIsOnline(false)
      setWasDisconnected(true)
      setBannerState('offline')
      setShowBanner(true)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasDisconnected])

  useEffect(() => {
    if (!isOnline) return
    if (!sseConnected) {
      const timer = setTimeout(() => {
        setWasDisconnected(true)
        setBannerState('no-sse')
        setShowBanner(true)
      }, 5000)
      return () => clearTimeout(timer)
    }
    if (wasDisconnected && bannerState === 'no-sse') {
      setBannerState('restored')
      setShowBanner(true)
      setTimeout(() => setShowBanner(false), 3000)
    }
  }, [sseConnected, isOnline, wasDisconnected, bannerState])

  if (!showBanner) return null

  const configs = {
    offline: { bg: `${theme.colors.red}26`, border: `${theme.colors.red}4d`, color: theme.colors.red, icon: WifiOff, pulse: true, text: '\u05D0\u05D9\u05DF \u05D7\u05D9\u05D1\u05D5\u05E8 \u2014 \u05DE\u05E6\u05D9\u05D2 \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05E9\u05DE\u05D5\u05E8\u05D9\u05DD' },
    'no-sse': { bg: `${theme.colors.amber}1f`, border: `${theme.colors.amber}40`, color: theme.colors.amber, icon: Radio, pulse: true, text: '\u05E2\u05D3\u05DB\u05D5\u05E0\u05D9\u05DD \u05D1\u05D6\u05DE\u05DF \u05D0\u05DE\u05EA \u05DE\u05E0\u05D5\u05EA\u05E7\u05D9\u05DD \u2014 \u05E8\u05E2\u05E0\u05DF \u05DC\u05D7\u05D9\u05D1\u05D5\u05E8 \u05DE\u05D7\u05D3\u05E9' },
    restored: { bg: `${theme.colors.emerald}26`, border: `${theme.colors.emerald}4d`, color: theme.colors.emerald, icon: Wifi, pulse: false, text: '\u05D4\u05D7\u05D9\u05D1\u05D5\u05E8 \u05D7\u05D6\u05E8 \u2014 \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05DE\u05E2\u05D5\u05D3\u05DB\u05E0\u05D9\u05DD' },
  }

  const config = configs[bannerState] || configs.restored
  const Icon = config.icon

  return (
    <ConnBanner $bg={config.bg} $border={config.border} $color={config.color} role="status" aria-live="polite">
      <ConnBannerIcon $pulse={config.pulse}>
        <Icon style={{ width: 14, height: 14 }} />
      </ConnBannerIcon>
      <span>{config.text}</span>
    </ConnBanner>
  )
}

/* ═══ Loading skeleton (inlined) ═══ */

function LoadingSkeleton() {
  const skeletonLine = (w: string, h: number, tone?: string) => ({
    width: w,
    height: h,
    borderRadius: 6,
    marginBottom: 8,
    background: tone === 'gold' ? 'rgba(200, 148, 42, 0.1)' : tone === 'emerald' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(51, 65, 85, 0.35)',
  })

  return (
    <div dir="rtl" role="main" aria-busy="true" aria-label={'\u05D8\u05D5\u05E2\u05DF \u05DE\u05E4\u05EA \u05E7\u05E8\u05E7\u05E2\u05D5\u05EA'} style={{ position: 'relative', height: '100dvh', width: '100vw', overflow: 'hidden', background: theme.colors.navy }}>
      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${theme.colors.navy} 0%, rgba(22, 42, 74, 0.2) 50%, ${theme.colors.navy} 100%)` }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'linear-gradient(rgba(200, 148, 42, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(200, 148, 42, 0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* Filter bar skeleton */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: 12 }}>
        <div style={{ background: 'rgba(10, 22, 40, 0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: theme.radii.xxl, padding: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ height: 28, width: 60 + i * 8, borderRadius: theme.radii.lg, background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }} />
            ))}
          </div>
          <div style={{ height: 40, borderRadius: theme.radii.xl, background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }} />
        </div>
      </div>

      {/* Card strip skeleton */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, padding: 12 }}>
        <div style={{ display: 'flex', gap: 12, overflow: 'hidden' }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} style={{ flexShrink: 0, width: 192, height: 128, borderRadius: theme.radii.xl, background: 'rgba(22, 42, 74, 0.4)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: 12 }}>
              <div style={skeletonLine('75%', 12)} />
              <div style={skeletonLine('50%', 10)} />
              <div style={skeletonLine('100%', 14)} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={skeletonLine('56px', 12, 'gold')} />
                <div style={skeletonLine('40px', 12, 'emerald')} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Center loading */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, background: 'rgba(10, 22, 40, 0.6)', backdropFilter: 'blur(8px)', borderRadius: theme.radii.xxl, padding: '24px 32px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <Spinner style={{ width: 40, height: 40, color: theme.colors.gold }} />
          <span style={{ fontSize: 14, color: theme.colors.slate[400], fontWeight: 500 }}>{'\u05D8\u05D5\u05E2\u05DF \u05E0\u05EA\u05D5\u05E0\u05D9 \u05E7\u05E8\u05E7\u05E2\u05D5\u05EA...'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: theme.colors.slate[600] }}>
            <span style={{ width: 6, height: 6, borderRadius: theme.radii.full, background: 'rgba(200, 148, 42, 0.4)' }} />
            <span>{'\u05DE\u05EA\u05D7\u05D1\u05E8 \u05DC\u05E9\u05E8\u05EA'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══ Error state ═══ */

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div dir="rtl" role="alert" style={{ height: '100dvh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.colors.navy }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, maxWidth: 360, textAlign: 'center', padding: '0 24px' }}>
        <div style={{ width: 64, height: 64, borderRadius: theme.radii.xl, background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 24 }}>{'\u26A0\uFE0F'}</span>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.colors.slate[200] }}>{'\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD'}</h2>
        <p style={{ fontSize: 14, color: theme.colors.slate[400] }}>{'\u05DC\u05D0 \u05D4\u05E6\u05DC\u05D7\u05E0\u05D5 \u05DC\u05D8\u05E2\u05D5\u05DF \u05D0\u05EA \u05E0\u05EA\u05D5\u05E0\u05D9 \u05D4\u05D7\u05DC\u05E7\u05D5\u05EA. \u05D1\u05D3\u05D5\u05E7 \u05D0\u05EA \u05D4\u05D7\u05D9\u05D1\u05D5\u05E8 \u05DC\u05D0\u05D9\u05E0\u05D8\u05E8\u05E0\u05D8 \u05D5\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1.'}</p>
        <PrimaryButton onClick={onRetry}>{'\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1'}</PrimaryButton>
      </div>
    </div>
  )
}

/* ═══ WhatsApp / Telegram SVG Icons (inline) ═══ */

const waPath = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
const tgPath = "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"

function ContactSvg({ path, size = 24 }: { path: string; size?: number }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: size, height: size, color: '#fff' }}><path d={path} /></svg>
}

/* ═══════════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════════ */

export default function MapView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)
  const [boundsFilter, setBoundsFilter] = useState<BoundsFilter | null>(null)
  const [autoSearchOnMove, setAutoSearchOnMove] = useLocalStorage('landmap_auto_search', false) as [boolean, (value: boolean | ((prev: boolean) => boolean)) => void]
  const [navIndicator, setNavIndicator] = useState<NavIndicator | null>(null)
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)
  const navIndicatorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialPlotRef = useRef<string | null>(searchParams.get('plot'))
  const [filters, setFilters] = useState<Filters>(() => {
    const p = Object.fromEntries(searchParams.entries()) as Record<string, string>
    return {
      city: p.city || 'all',
      priceMin: p.priceMin || '',
      priceMax: p.priceMax || '',
      sizeMin: p.sizeMin || '',
      sizeMax: p.sizeMax || '',
      ripeness: p.ripeness || 'all',
      minRoi: p.minRoi || 'all',
      zoning: p.zoning || 'all',
      maxDays: p.maxDays || '',
      maxMonthly: p.maxMonthly || '',
      search: p.q || '',
    }
  })
  const [statusFilter, setStatusFilter] = useState<string[]>(() => {
    const s = searchParams.get('status')
    return s ? s.split(',') : []
  })
  const [sortBy, setSortBy] = useState<string>(() => searchParams.get('sort') || 'default')
  const favorites = useFavorites() as FavoritesStore | null
  const { trackView } = useViewTracker() as { trackView: (id: string) => void }
  const { recordPrices, getPriceChange } = usePriceTracker() as { recordPrices: (plots: Plot[]) => void; getPriceChange: (id: string) => PriceChange | undefined }
  const { searches: savedSearches, save: saveSearch, remove: removeSearch } = useSavedSearches() as { searches: SavedSearch[]; save: (search: SavedSearch) => void; remove: (id: string) => void }
  const personalNotes = usePersonalNotes() as Record<string, unknown>
  const { recordView: recordRecentView } = useRecentlyViewed() as { recordView: (id: string) => void }
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [compareIds, setCompareIds] = useLocalStorage('landmap_compare', []) as [string[], (value: string[] | ((prev: string[]) => string[])) => void]

  const toggleCompare = useCallback((plotId: string) => {
    setCompareIds((prev) => {
      const wasInCompare = prev.includes(plotId)
      if (wasInCompare) { showToast('\uD83D\uDCCA \u05D4\u05D5\u05E1\u05E8 \u05DE\u05D4\u05D4\u05E9\u05D5\u05D5\u05D0\u05D4', 'info', { duration: 2000 }); return prev.filter((id) => id !== plotId) }
      if (prev.length >= 3) { showToast('\u26A0\uFE0F \u05E0\u05D9\u05EA\u05DF \u05DC\u05D4\u05E9\u05D5\u05D5\u05EA \u05E2\u05D3 3 \u05D7\u05DC\u05E7\u05D5\u05EA', 'warning', { duration: 3000 }); return prev }
      showToast('\uD83D\uDCCA \u05E0\u05D5\u05E1\u05E3 \u05DC\u05D4\u05E9\u05D5\u05D5\u05D0\u05D4 \u2014 \u05D1\u05D7\u05E8 \u05D7\u05DC\u05E7\u05D5\u05EA \u05E0\u05D5\u05E1\u05E4\u05D5\u05EA', 'success', { duration: 2000 })
      return [...prev, plotId]
    })
  }, [setCompareIds])

  const removeFromCompare = useCallback((plotId: string) => { setCompareIds((prev) => prev.filter((id) => id !== plotId)) }, [setCompareIds])
  const clearCompare = useCallback(() => setCompareIds([]), [setCompareIds])

  // URL sync
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.city !== 'all') params.set('city', filters.city)
    if (filters.priceMin) params.set('priceMin', filters.priceMin)
    if (filters.priceMax) params.set('priceMax', filters.priceMax)
    if (filters.sizeMin) params.set('sizeMin', filters.sizeMin)
    if (filters.sizeMax) params.set('sizeMax', filters.sizeMax)
    if (filters.ripeness !== 'all') params.set('ripeness', filters.ripeness)
    if (filters.minRoi && filters.minRoi !== 'all') params.set('minRoi', filters.minRoi)
    if (filters.zoning && filters.zoning !== 'all') params.set('zoning', filters.zoning)
    if (filters.maxDays) params.set('maxDays', filters.maxDays)
    if (filters.maxMonthly) params.set('maxMonthly', filters.maxMonthly)
    if (filters.search) params.set('q', filters.search)
    if (statusFilter.length > 0) params.set('status', statusFilter.join(','))
    if (sortBy !== 'default') params.set('sort', sortBy)
    if (selectedPlot) params.set('plot', selectedPlot.id)
    else if (initialPlotRef.current) params.set('plot', initialPlotRef.current)
    setSearchParams(params, { replace: true })
  }, [filters, statusFilter, sortBy, selectedPlot?.id, setSearchParams])

  const debouncedSearch = useDebounce(filters.search, 250) as string
  const apiFilters = useMemo<Record<string, string>>(() => {
    const f: Record<string, string> = {}
    if (filters.city !== 'all') f.city = filters.city
    if (filters.priceMin) f.priceMin = filters.priceMin
    if (filters.priceMax) f.priceMax = filters.priceMax
    if (filters.sizeMin) f.sizeMin = filters.sizeMin
    if (filters.sizeMax) f.sizeMax = filters.sizeMax
    if (filters.ripeness !== 'all') f.ripeness = filters.ripeness
    if (filters.zoning && filters.zoning !== 'all') f.zoning = filters.zoning
    if (statusFilter.length > 0) f.status = statusFilter.join(',')
    if (debouncedSearch) f.q = debouncedSearch
    if (['price-asc','price-desc','size-asc','size-desc','updated-desc','score-desc','roi-desc','roi-asc','cagr-desc','newest-first','ppsqm-asc','ppsqm-desc','monthly-asc','deal-desc','net-roi-desc','relevance','completeness-desc'].includes(sortBy)) f.sort = sortBy
    return f
  }, [filters, statusFilter, sortBy, debouncedSearch])

  const { data: plots = [], isLoading, error: plotsError, refetch: refetchPlots, isPlaceholderData, dataUpdatedAt = 0, isMockData, isStaleData } = useAllPlots(apiFilters) as UseAllPlotsResult
  const { data: pois = [] } = useQuery({ queryKey: ['pois'], queryFn: getPois, staleTime: 5 * 60_000 }) as UsePoisResult

  const [showApiRecovered, setShowApiRecovered] = useState(false)
  const apiRecoveredTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const handler = () => {
      setShowApiRecovered(true)
      if (apiRecoveredTimer.current) window.clearTimeout(apiRecoveredTimer.current)
      apiRecoveredTimer.current = window.setTimeout(() => setShowApiRecovered(false), 5000)
    }
    window.addEventListener('landmap:connection-recovered', handler)
    return () => { window.removeEventListener('landmap:connection-recovered', handler); if (apiRecoveredTimer.current) window.clearTimeout(apiRecoveredTimer.current) }
  }, [])

  useRefreshOnReturn(refetchPlots, { staleDurationMs: 120_000 })
  useEffect(() => { if (plots.length > 0) recordPrices(plots) }, [plots, recordPrices])

  // Client-side filtering
  const searchedPlots = useMemo(() => {
    const hasRoiFilter = filters.minRoi && filters.minRoi !== 'all'
    const minRoi = hasRoiFilter ? parseInt(filters.minRoi, 10) : 0
    const hasMaxDays = !!filters.maxDays
    const maxDays = hasMaxDays ? parseInt(filters.maxDays, 10) : 0
    const freshnessCutoff = hasMaxDays && maxDays > 0 ? Date.now() - maxDays * 86400000 : 0
    const hasMaxMonthly = !!filters.maxMonthly
    const maxMonthly = hasMaxMonthly ? parseInt(filters.maxMonthly, 10) : 0
    const hasBounds = !!boundsFilter
    const activeSearch = filters.search && filters.search !== debouncedSearch ? filters.search.toLowerCase() : ''
    const hasSearch = !!activeSearch
    if (!hasRoiFilter && !hasMaxDays && !hasMaxMonthly && !hasBounds && !hasSearch) return plots
    return plots.filter((p) => {
      const price = p.total_price ?? p.totalPrice ?? 0
      if (hasRoiFilter) { const proj = p.projected_value ?? p.projectedValue ?? 0; if (price <= 0) return false; if (((proj - price) / price) * 100 < minRoi) return false }
      if (hasMaxDays && maxDays > 0) { const created = p.created_at ?? p.createdAt; if (!created) return false; if (new Date(created).getTime() < freshnessCutoff) return false }
      if (hasMaxMonthly && maxMonthly > 0) { if (price <= 0) return false; const payment = calcMonthlyPayment(price); if (!payment || payment.monthly > maxMonthly) return false }
      if (hasBounds) { if (!p.coordinates || !Array.isArray(p.coordinates) || p.coordinates.length < 3) return false; const inBounds = p.coordinates.some((c) => Array.isArray(c) && c.length >= 2 && c[0] >= boundsFilter!.south && c[0] <= boundsFilter!.north && c[1] >= boundsFilter!.west && c[1] <= boundsFilter!.east); if (!inBounds) return false }
      if (hasSearch) { const bn = (p.block_number ?? p.blockNumber ?? '').toString(); const num = (p.number ?? '').toString(); const city = (p.city ?? '').toLowerCase(); const desc = (p.description ?? '').toLowerCase(); if (!bn.includes(activeSearch) && !num.includes(activeSearch) && !city.includes(activeSearch) && !desc.includes(activeSearch)) return false }
      return true
    })
  }, [plots, filters.minRoi, filters.maxDays, filters.maxMonthly, filters.search, debouncedSearch, boundsFilter])

  // Geolocation for distance sort
  useEffect(() => {
    if (sortBy !== 'distance-asc' || userLocation) return
    if (!navigator.geolocation) { setSortBy('default'); return }
    navigator.geolocation.getCurrentPosition((pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }), () => setSortBy('default'), { enableHighAccuracy: false, timeout: 8000 })
  }, [sortBy, userLocation])

  // Client-side sorting
  const sortedPlots = useMemo(() => {
    if (sortBy === 'default') return searchedPlots
    const sorted = [...searchedPlots]
    const getPrice = (p: Plot) => p.total_price ?? p.totalPrice ?? 0
    const getSize = (p: Plot) => p.size_sqm ?? p.sizeSqM ?? 0
    const getRoi = (p: Plot) => { const price = getPrice(p); const proj = p.projected_value ?? p.projectedValue ?? 0; return price > 0 ? (proj - price) / price : 0 }
    const tieBreak = (a: Plot, b: Plot) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    switch (sortBy) {
      case 'distance-asc': { if (!userLocation) break; sorted.sort((a, b) => { const ca = plotCenter(a.coordinates); const cb = plotCenter(b.coordinates); if (!ca && !cb) return tieBreak(a, b); if (!ca) return 1; if (!cb) return -1; return haversineKm(userLocation.lat, userLocation.lng, ca.lat, ca.lng) - haversineKm(userLocation.lat, userLocation.lng, cb.lat, cb.lng) || tieBreak(a, b) }); break }
      case 'price-asc': sorted.sort((a, b) => getPrice(a) - getPrice(b) || tieBreak(a, b)); break
      case 'price-desc': sorted.sort((a, b) => getPrice(b) - getPrice(a) || tieBreak(a, b)); break
      case 'size-asc': sorted.sort((a, b) => getSize(a) - getSize(b) || tieBreak(a, b)); break
      case 'size-desc': sorted.sort((a, b) => getSize(b) - getSize(a) || tieBreak(a, b)); break
      case 'roi-desc': sorted.sort((a, b) => getRoi(b) - getRoi(a) || tieBreak(a, b)); break
      case 'roi-asc': sorted.sort((a, b) => getRoi(a) - getRoi(b) || tieBreak(a, b)); break
      case 'ppsqm-asc': sorted.sort((a, b) => { const a1 = getSize(a) > 0 ? getPrice(a) / getSize(a) : Infinity; const b1 = getSize(b) > 0 ? getPrice(b) / getSize(b) : Infinity; return a1 - b1 || tieBreak(a, b) }); break
      case 'ppsqm-desc': sorted.sort((a, b) => { const a1 = getSize(a) > 0 ? getPrice(a) / getSize(a) : 0; const b1 = getSize(b) > 0 ? getPrice(b) / getSize(b) : 0; return b1 - a1 || tieBreak(a, b) }); break
      case 'score-desc': sorted.sort((a, b) => calcInvestmentScore(b) - calcInvestmentScore(a) || tieBreak(a, b)); break
      case 'cagr-desc': sorted.sort((a, b) => { const getCagr = (p: Plot) => { const price = getPrice(p); const proj = p.projected_value ?? p.projectedValue ?? 0; const roiPct = price > 0 ? ((proj - price) / price) * 100 : 0; const d = calcCAGR(roiPct, p.readiness_estimate ?? p.readinessEstimate ?? ''); return d ? d.cagr : 0 }; return getCagr(b) - getCagr(a) || tieBreak(a, b) }); break
      case 'updated-desc': sorted.sort((a, b) => { const t = (p: Plot) => new Date(p.updated_at ?? p.updatedAt ?? p.created_at ?? p.createdAt ?? 0).getTime(); return t(b) - t(a) || tieBreak(a, b) }); break
      case 'newest-first': sorted.sort((a, b) => new Date(b.created_at ?? b.createdAt ?? 0).getTime() - new Date(a.created_at ?? a.createdAt ?? 0).getTime() || tieBreak(a, b)); break
      case 'monthly-asc': sorted.sort((a, b) => { const gm = (p: Plot) => { const price = getPrice(p); if (price <= 0) return Infinity; const pay = calcMonthlyPayment(price); return pay ? pay.monthly : Infinity }; return gm(a) - gm(b) || tieBreak(a, b) }); break
      case 'net-roi-desc': sorted.sort((a, b) => (b._netRoi ?? b._roi ?? 0) - (a._netRoi ?? a._roi ?? 0) || tieBreak(a, b)); break
      case 'favorites-first': { const fs = favorites?.ids ? new Set(favorites.ids) : new Set(); sorted.sort((a, b) => { const af = fs.has(a.id) ? 1 : 0; const bf = fs.has(b.id) ? 1 : 0; if (af !== bf) return bf - af; return (b._investmentScore ?? 0) - (a._investmentScore ?? 0) || tieBreak(a, b) }); break }
      case 'completeness-desc': sorted.sort((a, b) => (b._dataCompleteness ?? 0) - (a._dataCompleteness ?? 0) || tieBreak(a, b)); break
      case 'deal-desc': { let totalPsm = 0; let cnt = 0; for (const p of sorted) { const pr = getPrice(p); const sz = getSize(p); if (pr > 0 && sz > 0) { totalPsm += pr / sz; cnt++ } }; const avg = cnt > 0 ? totalPsm / cnt : 0; if (avg > 0) sorted.sort((a, b) => { const ap = getSize(a) > 0 ? getPrice(a) / getSize(a) : Infinity; const bp = getSize(b) > 0 ? getPrice(b) / getSize(b) : Infinity; return (ap - avg) - (bp - avg) || tieBreak(a, b) }); break }
    }
    return sorted
  }, [searchedPlots, sortBy, userLocation, favorites?.ids])

  const filteredPlots = useDeferredValue(sortedPlots)
  const isFilterStale = filteredPlots !== sortedPlots

  // Restore plot from URL
  useEffect(() => {
    const plotId = searchParams.get('plot') || initialPlotRef.current
    if (plotId && filteredPlots.length > 0 && !selectedPlot) {
      const found = filteredPlots.find((p) => p.id === plotId)
      if (found) { setSelectedPlot(found); initialPlotRef.current = null }
    }
  }, [searchParams, filteredPlots, selectedPlot])

  // Dynamic title
  useEffect(() => {
    const parts = ['LandMap Israel']
    if (filters.city !== 'all') parts.unshift(filters.city)
    if (selectedPlot) { const bn = selectedPlot.block_number ?? selectedPlot.blockNumber; parts.unshift(`\u05D2\u05D5\u05E9 ${bn} \u05D7\u05DC\u05E7\u05D4 ${selectedPlot.number}`) }
    if (filteredPlots.length > 0 && !selectedPlot) parts.splice(1, 0, `${filteredPlots.length} \u05D7\u05DC\u05E7\u05D5\u05EA`)
    document.title = parts.join(' | ')
    return () => { document.title = 'LandMap Israel - \u05DE\u05E4\u05EA \u05E7\u05E8\u05E7\u05E2\u05D5\u05EA \u05DC\u05D4\u05E9\u05E7\u05E2\u05D4' }
  }, [filters.city, selectedPlot?.id, filteredPlots.length])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (isLeadModalOpen) setIsLeadModalOpen(false); else if (isChatOpen) setIsChatOpen(false); else if (selectedPlot) handleCloseSidebar() }
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); const si = document.querySelector<HTMLInputElement>('.filter-search-input'); if (si) { si.focus(); si.select() } }
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) { const tag = document.activeElement?.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return; if (selectedPlot && favorites) { e.preventDefault(); favorites.toggle(selectedPlot.id) } }
      if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey) { const tag = document.activeElement?.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return; if (selectedPlot) { e.preventDefault(); toggleCompare(selectedPlot.id) } }
      if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey) { const tag = document.activeElement?.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return; if (selectedPlot) { e.preventDefault(); const btn = document.querySelector<HTMLButtonElement>('.sidebar-panel [data-action="print-report"]'); if (btn) btn.click() } }
      if (e.key === 'Enter' && selectedPlot && !e.ctrlKey && !e.metaKey) { const tag = document.activeElement?.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || tag === 'A') return; e.preventDefault(); window.open(`/plot/${selectedPlot.id}`, '_blank') }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) { const tag = document.activeElement?.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return; e.preventDefault(); setIsChatOpen(true) }
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && filteredPlots.length > 0) { const tag = document.activeElement?.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return; e.preventDefault(); const ci = selectedPlot ? filteredPlots.findIndex((p) => p.id === selectedPlot.id) : -1; const ni = e.key === 'ArrowLeft' ? (ci < filteredPlots.length - 1 ? ci + 1 : 0) : (ci > 0 ? ci - 1 : filteredPlots.length - 1); setSelectedPlot(filteredPlots[ni]); setNavIndicator({ index: ni + 1, total: filteredPlots.length }); if (navIndicatorTimer.current) clearTimeout(navIndicatorTimer.current); navIndicatorTimer.current = setTimeout(() => setNavIndicator(null), 2000) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isLeadModalOpen, isChatOpen, selectedPlot, filteredPlots, favorites, toggleCompare])

  const handleSelectPlot = useCallback((plot: Plot) => { setSelectedPlot(plot); if (plot?.id) { trackView(plot.id); recordRecentView(plot.id); plotDetailPreload() } }, [trackView, recordRecentView])
  const handleCloseSidebar = useCallback(() => { setSelectedPlot(null); const el = document.getElementById('map-content'); if (el) el.focus({ preventScroll: true }) }, [])
  const handleFilterChange = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => { setFilters((prev) => ({ ...prev, [key]: value })) }, [])
  const handleClearFilters = useCallback(() => { setFilters(initialFilters); setStatusFilter([]); setBoundsFilter(null) }, [])
  const handleSearchArea = useCallback((bounds: BoundsFilter) => { setBoundsFilter(bounds) }, [])
  const handleToggleAutoSearch = useCallback((enabled: boolean) => { setAutoSearchOnMove(enabled); if (!enabled) setBoundsFilter(null) }, [setAutoSearchOnMove])
  const handleClearBounds = useCallback(() => { setBoundsFilter(null) }, [])
  const handleLoadSearch = useCallback((search: SavedSearch) => { setFilters(search.filters); setStatusFilter(search.statusFilter || []); setSortBy(search.sortBy || 'default') }, [])
  const handleToggleStatus = useCallback((status: string) => { setStatusFilter((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status])) }, [])

  const { data: serverPriceChanges = new Map<string, PriceChange>() } = usePriceChanges({ days: 14, minPct: 3 }) as UsePriceChangesResult
  const getMergedPriceChange = useCallback((plotId: string) => { const sc = serverPriceChanges.get(plotId); if (sc) return sc; return getPriceChange(plotId) }, [serverPriceChanges, getPriceChange])
  const { isConnected: sseConnected } = useRealtimeUpdates() as { isConnected: boolean }

  useThemeColor(selectedPlot ? themeColors.focused : themeColors.default)
  useStructuredData(selectedPlot, filteredPlots)

  const dynamicMapTitle = useMemo(() => {
    if (selectedPlot) return `\u05D2\u05D5\u05E9 ${selectedPlot.block_number ?? selectedPlot.blockNumber} \u05D7\u05DC\u05E7\u05D4 ${selectedPlot.number} \u2014 ${selectedPlot.city} | LandMap Israel`
    const cityLabel = filters.city !== 'all' ? ` \u05D1${filters.city}` : ''
    const countLabel = filteredPlots.length > 0 ? `${filteredPlots.length} \u05D7\u05DC\u05E7\u05D5\u05EA` : '\u05D7\u05DC\u05E7\u05D5\u05EA'
    return `${countLabel}${cityLabel} \u05DC\u05D4\u05E9\u05E7\u05E2\u05D4 | LandMap Israel`
  }, [selectedPlot, filters.city, filteredPlots.length])

  useMetaTags(
    selectedPlot
      ? { title: dynamicMapTitle, description: `${selectedPlot.city} \u00B7 ${formatCurrency(selectedPlot.total_price ?? selectedPlot.totalPrice)} \u00B7 ${((selectedPlot.size_sqm ?? selectedPlot.sizeSqM) / 1000).toFixed(1)} \u05D3\u05D5\u05E0\u05DD`, url: window.location.href, image: plotOgImageUrl(selectedPlot.id) }
      : { title: dynamicMapTitle, description: '\u05DE\u05E4\u05EA \u05E7\u05E8\u05E7\u05E2\u05D5\u05EA \u05DC\u05D4\u05E9\u05E7\u05E2\u05D4 \u05D1\u05D9\u05E9\u05E8\u05D0\u05DC \u2014 \u05D7\u05D3\u05E8\u05D4, \u05E0\u05EA\u05E0\u05D9\u05D4, \u05E7\u05D9\u05E1\u05E8\u05D9\u05D4. \u05DE\u05D7\u05D9\u05E8\u05D9\u05DD, \u05EA\u05E9\u05D5\u05D0\u05D5\u05EA, \u05D9\u05D9\u05E2\u05D5\u05D3\u05D9 \u05E7\u05E8\u05E7\u05E2.' }
  )

  useEffect(() => { document.documentElement.style.overflow = 'hidden'; document.body.style.overflow = 'hidden'; return () => { document.documentElement.style.overflow = ''; document.body.style.overflow = '' } }, [])

  /* ── Render ── */

  if (isLoading) return <LoadingSkeleton />
  if (plotsError && plots.length === 0) return <ErrorState onRetry={() => refetchPlots()} />

  return (
    <PageRoot className={selectedPlot ? 'sidebar-open' : undefined} $sidebarOpen={!!selectedPlot} aria-busy={isLoading || isPlaceholderData}>
      {(isFilterStale || isPlaceholderData) && <FilterLoadingIndicator><FilterLoadingBar /></FilterLoadingIndicator>}

      {isMockData && (
        <FloatingBanner dir="rtl"><BannerCard $tone="amber"><BannerDot $tone="amber" $pulse /><BannerText $tone="amber">{'\u05DE\u05D5\u05E6\u05D2\u05D9\u05DD \u05E0\u05EA\u05D5\u05E0\u05D9 \u05D4\u05D3\u05D2\u05DE\u05D4 \u2014 \u05D4\u05E9\u05E8\u05EA \u05D0\u05D9\u05E0\u05D5 \u05D6\u05DE\u05D9\u05DF \u05DB\u05E8\u05D2\u05E2'}</BannerText><BannerAction $tone="amber" onClick={() => refetchPlots()}>{'\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1'}</BannerAction></BannerCard></FloatingBanner>
      )}
      {showApiRecovered && (
        <FloatingBanner dir="rtl"><BannerCard $tone="emerald"><BannerDot $tone="emerald" /><BannerText $tone="emerald">{'\u05D4\u05E9\u05E8\u05EA \u05D7\u05D6\u05E8 \u05DC\u05E4\u05E2\u05D5\u05DC\u05D4 \u2014 \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05DE\u05E2\u05D5\u05D3\u05DB\u05E0\u05D9\u05DD \u2713'}</BannerText></BannerCard></FloatingBanner>
      )}
      {isStaleData && !isMockData && (
        <FloatingBanner dir="rtl"><BannerCard $tone="amber"><BannerDot $tone="amber" $pulse /><BannerText $tone="amber">{'\u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05E2\u05E9\u05D5\u05D9\u05D9\u05DD \u05DC\u05D4\u05D9\u05D5\u05EA \u05DC\u05D0 \u05DE\u05E2\u05D5\u05D3\u05DB\u05E0\u05D9\u05DD \u2014 \u05D4\u05E9\u05E8\u05EA \u05D0\u05D9\u05E0\u05D5 \u05DE\u05D2\u05D9\u05D1 \u05DB\u05E8\u05D2\u05E2'}</BannerText><BannerAction $tone="amber" onClick={() => refetchPlots()}>{'\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1'}</BannerAction></BannerCard></FloatingBanner>
      )}

      {boundsFilter && (
        <BoundsBadge dir="rtl"><BoundsBadgeInner><BannerDot $tone="amber" $pulse /><span style={{ fontSize: 12, fontWeight: 500, color: theme.colors.gold }}>{'\u05EA\u05D5\u05E6\u05D0\u05D5\u05EA \u05DE\u05D5\u05D2\u05D1\u05DC\u05D5\u05EA \u05DC\u05D0\u05D6\u05D5\u05E8 \u05D4\u05E0\u05D1\u05D7\u05E8'}</span><button style={{ fontSize: 14, fontWeight: 700, color: 'rgba(200,148,42,0.8)', background: 'transparent', border: 'none', cursor: 'pointer', marginRight: 4 }} onClick={handleClearBounds} title={'\u05D4\u05E1\u05E8 \u05E1\u05D9\u05E0\u05D5\u05DF \u05D0\u05D6\u05D5\u05E8\u05D9'}>{'\u2715'}</button></BoundsBadgeInner></BoundsBadge>
      )}

      <IdleRender><Suspense fallback={null}><WidgetErrorBoundary name="MarketTicker" silent><MarketTicker plots={filteredPlots} /></WidgetErrorBoundary></Suspense></IdleRender>
      <IdleRender><Suspense fallback={null}><WidgetErrorBoundary name="MarketPulse" silent><MarketPulse plots={filteredPlots} /></WidgetErrorBoundary></Suspense></IdleRender>
      <IdleRender><Suspense fallback={null}><WidgetErrorBoundary name="MarketVelocity" silent><MarketVelocity plots={filteredPlots} /></WidgetErrorBoundary></Suspense></IdleRender>

      <a href="#map-content" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>{'\u05D3\u05DC\u05D2 \u05DC\u05EA\u05D5\u05DB\u05DF \u05D4\u05DE\u05E4\u05D4'}</a>

      <SrOnly role="status" aria-live="assertive" aria-atomic="true">
        {selectedPlot ? (() => { const bn = selectedPlot.block_number ?? selectedPlot.blockNumber; const price = selectedPlot.total_price ?? selectedPlot.totalPrice ?? 0; const proj = selectedPlot.projected_value ?? selectedPlot.projectedValue ?? 0; const roi = price > 0 ? Math.round(((proj - price) / price) * 100) : 0; return `\u05E0\u05D1\u05D7\u05E8\u05D4 \u05D7\u05DC\u05E7\u05D4: \u05D2\u05D5\u05E9 ${bn} \u05D7\u05DC\u05E7\u05D4 ${selectedPlot.number}, ${selectedPlot.city}. \u05DE\u05D7\u05D9\u05E8 ${formatPriceShort(price)}, \u05EA\u05E9\u05D5\u05D0\u05D4 ${roi} \u05D0\u05D7\u05D5\u05D6.` })() : ''}
      </SrOnly>
      <SrOnly role="status" aria-live="polite" aria-atomic="true">
        {!isLoading && filteredPlots.length > 0 ? `\u05E0\u05DE\u05E6\u05D0\u05D5 ${filteredPlots.length} \u05D7\u05DC\u05E7\u05D5\u05EA` : !isLoading && filteredPlots.length === 0 ? '\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D5 \u05D7\u05DC\u05E7\u05D5\u05EA \u05DE\u05EA\u05D0\u05D9\u05DE\u05D5\u05EA \u05DC\u05E1\u05D9\u05E0\u05D5\u05DF \u05D4\u05E0\u05D5\u05DB\u05D7\u05D9' : ''}
      </SrOnly>

      <ConnectionStatus sseConnected={sseConnected} />
      <OfflineBanner onReconnect={refetchPlots} />
      {dataUpdatedAt > 0 && <DataFreshnessIndicator updatedAt={dataUpdatedAt} onRefresh={refetchPlots} />}

      <IdleRender><Suspense fallback={null}><WidgetErrorBoundary name="AlertSubscription" silent><AlertSubscription filters={filters} statusFilter={statusFilter} /></WidgetErrorBoundary></Suspense></IdleRender>

      {navIndicator && (
        <NavIndicatorOverlay dir="rtl">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', background: 'rgba(10, 22, 40, 0.9)', backdropFilter: 'blur(16px)', border: '1px solid rgba(200, 148, 42, 0.2)', borderRadius: theme.radii.xxl, boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4)' }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: theme.colors.gold, fontVariantNumeric: 'tabular-nums' }}>{navIndicator.index}</span>
            <span style={{ fontSize: 14, color: theme.colors.slate[500], fontWeight: 500 }}>/</span>
            <span style={{ fontSize: 24, fontWeight: 800, color: theme.colors.slate[400], fontVariantNumeric: 'tabular-nums' }}>{navIndicator.total}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginRight: 12 }}>
              <span style={{ fontSize: 10, color: theme.colors.slate[500] }}>{'\u05D7\u05DC\u05E7\u05D5\u05EA'}</span>
              <div style={{ width: 64, height: 4, borderRadius: theme.radii.full, background: 'rgba(255, 255, 255, 0.05)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: theme.radii.full, background: 'rgba(200, 148, 42, 0.5)', transition: theme.transitions.smooth, width: `${(navIndicator.index / navIndicator.total) * 100}%` }} />
              </div>
            </div>
          </div>
        </NavIndicatorOverlay>
      )}

      <MapErrorBoundary>
        <MapArea plots={filteredPlots} pois={pois} selectedPlot={selectedPlot} onSelectPlot={handleSelectPlot} statusFilter={statusFilter} onToggleStatus={handleToggleStatus} favorites={favorites} compareIds={compareIds} onToggleCompare={toggleCompare} onClearFilters={handleClearFilters} onFilterChange={handleFilterChange} onSearchArea={handleSearchArea} autoSearch={autoSearchOnMove} onToggleAutoSearch={handleToggleAutoSearch} />
      </MapErrorBoundary>

      <FilterBar filters={filters} onFilterChange={handleFilterChange} onClearFilters={handleClearFilters} plotCount={filteredPlots.length} statusFilter={statusFilter} onToggleStatus={handleToggleStatus} sortBy={sortBy} onSortChange={setSortBy} allPlots={plots} onSelectPlot={handleSelectPlot} savedSearches={savedSearches} onSaveSearch={saveSearch} onLoadSearch={handleLoadSearch} onRemoveSearch={removeSearch} />
      <ViewportSummary plots={filteredPlots} />
      <ActiveFilterChips filters={filters} statusFilter={statusFilter} sortBy={sortBy} boundsFilter={boundsFilter} onFilterChange={handleFilterChange} onToggleStatus={handleToggleStatus} onSortChange={setSortBy} onClearBounds={handleClearBounds} onClearFilters={handleClearFilters} />

      {selectedPlot && (
        <Suspense fallback={
          <SidebarFallback dir="rtl">
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ width: 192, height: 24, borderRadius: 8, background: 'rgba(51, 65, 85, 0.4)' }} /><div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(51, 65, 85, 0.4)' }} /></div>
              <div style={{ width: 128, height: 16, borderRadius: 8, background: 'rgba(51, 65, 85, 0.4)' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 24 }}>{[1,2,3,4].map(i => <div key={i} style={{ height: 80, borderRadius: theme.radii.xl, background: 'rgba(51, 65, 85, 0.2)' }} />)}</div>
              <div style={{ height: 128, borderRadius: theme.radii.xl, background: 'rgba(51, 65, 85, 0.2)' }} />
              <div style={{ height: 96, borderRadius: theme.radii.xl, background: 'rgba(51, 65, 85, 0.2)' }} />
            </div>
          </SidebarFallback>
        }>
          <SidebarDetails plot={selectedPlot} onClose={handleCloseSidebar} onOpenLeadModal={() => setIsLeadModalOpen(true)} favorites={favorites} compareIds={compareIds} onToggleCompare={toggleCompare} allPlots={filteredPlots} onSelectPlot={handleSelectPlot} priceChange={getMergedPriceChange(selectedPlot.id)} personalNotes={personalNotes} />
        </Suspense>
      )}

      {selectedPlot && <Suspense fallback={null}><MobilePlotActionBar plot={selectedPlot} isFavorite={favorites?.isFavorite(selectedPlot.id)} onToggleFavorite={favorites?.toggle} /></Suspense>}

      <IdleRender><Suspense fallback={null}><WidgetErrorBoundary name="RecentlyViewed" silent><RecentlyViewed plots={filteredPlots} selectedPlot={selectedPlot} onSelectPlot={handleSelectPlot} /></WidgetErrorBoundary></Suspense></IdleRender>

      <Suspense fallback={null}><WidgetErrorBoundary name="AIChat" silent><AIChat isOpen={isChatOpen} onToggle={() => setIsChatOpen((prev) => !prev)} selectedPlot={selectedPlot} /></WidgetErrorBoundary></Suspense>

      <FilterSuggestions filteredCount={filteredPlots.length} totalCount={plots.length} filters={filters} statusFilter={statusFilter} onFilterChange={handleFilterChange} onToggleStatus={handleToggleStatus} onClearFilters={handleClearFilters} />

      {!isLoading && filteredPlots.length === 0 && plots.length > 0 && (
        <EmptyStateOverlay dir="rtl">
          <EmptyStateCard>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{'\uD83D\uDD0D'}</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: theme.colors.slate[200], marginBottom: 8 }}>{'\u05D0\u05D9\u05DF \u05D7\u05DC\u05E7\u05D5\u05EA \u05DE\u05EA\u05D0\u05D9\u05DE\u05D5\u05EA'}</h3>
            <p style={{ fontSize: 14, color: theme.colors.slate[400], marginBottom: 20, lineHeight: 1.6 }}>
              {'\u05D4\u05E1\u05D9\u05E0\u05D5\u05DF \u05D4\u05E0\u05D5\u05DB\u05D7\u05D9 \u05DC\u05D0 \u05DE\u05E6\u05D9\u05D2 \u05EA\u05D5\u05E6\u05D0\u05D5\u05EA.'}{boundsFilter ? '\u05E0\u05E1\u05D4 \u05DC\u05D4\u05E8\u05D7\u05D9\u05D1 \u05D0\u05EA \u05D0\u05D6\u05D5\u05E8 \u05D4\u05D7\u05D9\u05E4\u05D5\u05E9 \u05D1\u05DE\u05E4\u05D4 \u05D0\u05D5 ' : ''}{'\u05E0\u05E1\u05D4 \u05DC\u05E9\u05E0\u05D5\u05EA \u05D0\u05EA \u05D4\u05E4\u05D9\u05DC\u05D8\u05E8\u05D9\u05DD.'}
            </p>
            <PrimaryButton onClick={handleClearFilters}>{'\uD83D\uDD04 \u05E0\u05E7\u05D4 \u05D0\u05EA \u05DB\u05DC \u05D4\u05E1\u05D9\u05E0\u05D5\u05E0\u05D9\u05DD'}</PrimaryButton>
            <div style={{ fontSize: 10, color: theme.colors.slate[600], marginTop: 12 }}>{plots.length} {'\u05D7\u05DC\u05E7\u05D5\u05EA \u05D6\u05DE\u05D9\u05E0\u05D5\u05EA \u05DC\u05DC\u05D0 \u05E1\u05D9\u05E0\u05D5\u05DF'}</div>
          </EmptyStateCard>
        </EmptyStateOverlay>
      )}

      <CompareBar compareIds={compareIds} plots={filteredPlots} onRemove={removeFromCompare} onClear={clearCompare} />
      <PlotCardStrip plots={filteredPlots} selectedPlot={selectedPlot} onSelectPlot={handleSelectPlot} compareIds={compareIds} onToggleCompare={toggleCompare} isLoading={isLoading} onClearFilters={handleClearFilters} getPriceChange={getMergedPriceChange} favorites={favorites} userLocation={userLocation} />

      <Suspense fallback={null}><LeadModal isOpen={isLeadModalOpen} onClose={() => setIsLeadModalOpen(false)} plot={selectedPlot} /></Suspense>

      <IdleRender><Suspense fallback={null}><WidgetErrorBoundary name="FeaturedDeals" silent><FeaturedDeals onSelectPlot={handleSelectPlot} selectedPlot={selectedPlot} /></WidgetErrorBoundary></Suspense></IdleRender>
      <IdleRender><Suspense fallback={null}><WidgetErrorBoundary name="PriceMovers" silent><PriceMovers onSelectPlot={handleSelectPlot} plots={filteredPlots} /></WidgetErrorBoundary></Suspense></IdleRender>
      <IdleRender><Suspense fallback={null}><WidgetErrorBoundary name="DealSpotlight" silent><DealSpotlight plots={filteredPlots} onSelectPlot={handleSelectPlot} /></WidgetErrorBoundary></Suspense></IdleRender>

      <ShortcutsHint onClick={() => setIsShortcutsOpen(true)} title={'\u05E7\u05D9\u05E6\u05D5\u05E8\u05D9 \u05DE\u05E7\u05DC\u05D3\u05EA \u2014 \u05DC\u05D7\u05E5 ? \u05DC\u05E8\u05E9\u05D9\u05DE\u05D4 \u05DE\u05DC\u05D0\u05D4'} aria-label={'\u05D4\u05E6\u05D2 \u05E7\u05D9\u05E6\u05D5\u05E8\u05D9 \u05DE\u05E7\u05DC\u05D3\u05EA'}>
        <span style={{ fontSize: 11, fontFamily: theme.fonts.mono, background: 'rgba(255,255,255,0.05)', padding: '4px 6px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>?</span>
        <span>{'\u05E7\u05D9\u05E6\u05D5\u05E8\u05D9\u05DD'}</span>
      </ShortcutsHint>

      <ContactFabDesktop>
        <ContactButton $tone="whatsapp" href={selectedPlot ? whatsappLink(`\u05E9\u05DC\u05D5\u05DD, \u05D0\u05E0\u05D9 \u05DE\u05E2\u05D5\u05E0\u05D9\u05D9\u05DF \u05D1\u05E4\u05E8\u05D8\u05D9\u05DD \u05E2\u05DC \u05D2\u05D5\u05E9 ${selectedPlot.block_number ?? selectedPlot.blockNumber} \u05D7\u05DC\u05E7\u05D4 ${selectedPlot.number} \u05D1${selectedPlot.city}`) : whatsappLink('\u05E9\u05DC\u05D5\u05DD, \u05D0\u05E0\u05D9 \u05DE\u05E2\u05D5\u05E0\u05D9\u05D9\u05DF \u05D1\u05E7\u05E8\u05E7\u05E2\u05D5\u05EA \u05DC\u05D4\u05E9\u05E7\u05E2\u05D4')} target="_blank" rel="noopener noreferrer" onClick={() => trackContactConversion('whatsapp', selectedPlot?.id, { source: 'map_fab_desktop' })} aria-label={'\u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8 \u05D1-WhatsApp'}><ContactSvg path={waPath} /></ContactButton>
        <ContactButton $tone="telegram" href={selectedPlot ? `https://t.me/LandMapIsraelBot?start=plot_${selectedPlot.id}` : 'https://t.me/LandMapIsraelBot'} target="_blank" rel="noopener noreferrer" onClick={() => trackContactConversion('telegram', selectedPlot?.id, { source: 'map_fab_desktop' })} aria-label={'\u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8 \u05D1\u05D8\u05DC\u05D2\u05E8\u05DD'}><ContactSvg path={tgPath} /></ContactButton>
        <ContactCallButton onClick={() => { trackContactConversion('phone', selectedPlot?.id, { source: 'map_fab_desktop' }); setIsLeadModalOpen(true) }} aria-label={'\u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8 \u05DC\u05E4\u05E8\u05D8\u05D9\u05DD'}><Phone style={{ width: 20, height: 20 }} /></ContactCallButton>
      </ContactFabDesktop>

      <ContactFabMobile>
        <a href={selectedPlot ? whatsappLink(`\u05E9\u05DC\u05D5\u05DD, \u05D0\u05E0\u05D9 \u05DE\u05E2\u05D5\u05E0\u05D9\u05D9\u05DF \u05D1\u05E4\u05E8\u05D8\u05D9\u05DD \u05E2\u05DC \u05D2\u05D5\u05E9 ${selectedPlot.block_number ?? selectedPlot.blockNumber} \u05D7\u05DC\u05E7\u05D4 ${selectedPlot.number} \u05D1${selectedPlot.city}`) : whatsappLink('\u05E9\u05DC\u05D5\u05DD, \u05D0\u05E0\u05D9 \u05DE\u05E2\u05D5\u05E0\u05D9\u05D9\u05DF \u05D1\u05E7\u05E8\u05E7\u05E2\u05D5\u05EA \u05DC\u05D4\u05E9\u05E7\u05E2\u05D4')} target="_blank" rel="noopener noreferrer" onClick={() => trackContactConversion('whatsapp', selectedPlot?.id, { source: 'map_fab_mobile' })} aria-label={'\u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8 \u05D1-WhatsApp'} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#25d366', borderRadius: theme.radii.lg, boxShadow: '0 12px 24px rgba(37, 211, 102, 0.3)' }}>
          <ContactSvg path={waPath} size={20} />
        </a>
      </ContactFabMobile>
    </PageRoot>
  )
}
