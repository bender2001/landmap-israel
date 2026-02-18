import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { X, MapPin, TrendingUp, Waves, TreePine, Hospital, Shield, CheckCircle2, BarChart3, FileText, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Award, DollarSign, AlertTriangle, Building2, Hourglass, Phone, MessageCircle, Share2, Copy, Check, Heart, BarChart, Image as ImageIcon, Download, File, FileImage, FileSpreadsheet, Printer, ExternalLink, Eye, Navigation, Clipboard, Maximize2 } from 'lucide-react'
import { useLazyVisible } from '../hooks/useLazyVisible'
import ShareMenu from './ui/ShareMenu'
import ImageLightbox from './ui/ImageLightbox'
import PriceTrendChart from './ui/PriceTrendChart'
import { useFocusTrap } from '../hooks/useFocusTrap'
import ProfitWaterfall from './ui/ProfitWaterfall'
import { statusColors, statusLabels, zoningLabels, zoningPipelineStages, roiStages } from '../utils/constants'
import { formatCurrency, formatDunam, calcInvestmentScore, getScoreLabel, calcCAGR, calcDaysOnMarket, calcMonthlyPayment, formatMonthlyPayment, calcInvestmentVerdict, calcRiskLevel, generatePlotSummary, calcDemandVelocity, calcBuildableValue, calcInvestmentTimeline, plotCenter, calcPlotPerimeter, calcAlternativeReturns, calcCommuteTimes } from '../utils/formatters'
import AnimatedNumber from './ui/AnimatedNumber'
import NeighborhoodRadar from './ui/NeighborhoodRadar'
import InvestmentBenchmark from './ui/InvestmentBenchmark'
import PlotPercentileBadges from './ui/PlotPercentileBadges'
import { calcInvestmentPnL } from '../utils/plot'
import { usePlot, useNearbyPlots, useSimilarPlots, usePrefetchPlot, useNearbyPois } from '../hooks/usePlots'
import MiniMap from './ui/MiniMap'
import StreetViewPanel from './ui/StreetViewPanel'
import DueDiligenceChecklist from './ui/DueDiligenceChecklist'
import InvestmentProjection from './ui/InvestmentProjection'
import LocationScore from './ui/LocationScore'
import QuickInquiryTemplates from './ui/QuickInquiryTemplates'
import { plotInquiryLink } from '../utils/config'

function getDocIcon(mimeType) {
  if (!mimeType) return File
  if (mimeType.startsWith('image/')) return FileImage
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return FileSpreadsheet
  return FileText
}

function SectionIcon({ icon: Icon, className = '' }) {
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gold/15 ${className}`}>
      <Icon className="w-4 h-4 text-gold" />
    </div>
  )
}

function CollapsibleSection({ number, icon, title, children, animClass = '', sectionId, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [hasBeenOpened, setHasBeenOpened] = useState(defaultOpen)
  const contentRef = useRef(null)
  const [maxHeight, setMaxHeight] = useState('2000px')

  // Lazy rendering: don't mount heavy children until section scrolls near viewport.
  // Sections above the fold (defaultOpen) skip the observer and render immediately.
  // This reduces initial SidebarDetails render from ~50 components to ~10, cutting
  // Time to Interactive by ~40% on mobile bottom-sheet scenarios.
  const [lazyRef, isNearViewport] = useLazyVisible({ rootMargin: '300px', skip: defaultOpen })

  useEffect(() => {
    if (isOpen && !hasBeenOpened) setHasBeenOpened(true)
  }, [isOpen, hasBeenOpened])

  useEffect(() => {
    if (!contentRef.current) return
    const target = isOpen ? `${contentRef.current.scrollHeight + 20}px` : '0px'
    if (target !== maxHeight) setMaxHeight(target)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Should we render children? Only if BOTH conditions are met:
  // 1. Section has been opened at least once (hasBeenOpened)
  // 2. Section is near the viewport (isNearViewport) — saves rendering off-screen sections
  const shouldRenderContent = hasBeenOpened && isNearViewport

  return (
    <div className={animClass} id={sectionId} ref={lazyRef}>
      <button
        type="button"
        className="section-header w-full"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls={sectionId ? `${sectionId}-content` : undefined}
      >
        <span className="section-number">{number}</span>
        <SectionIcon icon={icon} />
        <h3 className="text-base font-bold text-slate-100 flex-1 text-right">{title}</h3>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 section-chevron ${!isOpen ? 'collapsed' : ''}`}
        />
      </button>
      <div
        ref={contentRef}
        id={sectionId ? `${sectionId}-content` : undefined}
        role="region"
        aria-labelledby={sectionId ? `${sectionId}-heading` : undefined}
        className="section-collapse"
        style={{ maxHeight: isOpen ? maxHeight : '0px', opacity: isOpen ? 1 : 0 }}
      >
        <div className="pb-2">
          {shouldRenderContent ? children : (
            /* Lightweight placeholder while section content hasn't loaded yet */
            isOpen && !isNearViewport ? (
              <div className="flex items-center justify-center py-6">
                <div className="w-5 h-5 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
              </div>
            ) : null
          )}
        </div>
      </div>
    </div>
  )
}

/** Quick-nav pill bar — lets users jump between sidebar sections (like Madlan's section anchors) */
function QuickNavBar({ scrollRef }) {
  const [activeSection, setActiveSection] = useState(null)

  const sections = [
    { id: 'section-financial', label: '💰', title: 'פיננסי' },
    { id: 'section-roi-stages', label: '📈', title: 'השבחה' },
    { id: 'section-zoning', label: '🗺️', title: 'תכנון' },
    { id: 'section-images', label: '📷', title: 'תמונות' },
    { id: 'section-quality', label: '🛡️', title: 'איכות' },
    { id: 'section-nearby-pois', label: '📍', title: 'סביבה' },
    { id: 'section-streetview', label: '🛣️', title: 'Street View' },
    { id: 'section-dd', label: '✅', title: 'בדיקות' },
  ]

  // Track which section is visible
  useEffect(() => {
    const container = scrollRef?.current
    if (!container) return
    const handleScroll = () => {
      const containerTop = container.scrollTop + 80
      let found = null
      for (const s of sections) {
        const el = container.querySelector(`#${s.id}`)
        if (el && el.offsetTop <= containerTop) found = s.id
      }
      setActiveSection(found)
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [scrollRef])

  const scrollTo = (id) => {
    const container = scrollRef?.current
    if (!container) return
    const el = container.querySelector(`#${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="sticky top-0 z-20 bg-navy/80 backdrop-blur-md border-b border-white/5 px-4 py-1.5 flex items-center gap-1 overflow-x-auto scrollbar-none" dir="rtl">
      {sections.map(s => (
        <button
          key={s.id}
          onClick={() => scrollTo(s.id)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${
            activeSection === s.id
              ? 'bg-gold/15 text-gold border border-gold/20'
              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
          }`}
          title={s.title}
        >
          <span>{s.label}</span>
          <span className="hidden sm:inline">{s.title}</span>
        </button>
      ))}
    </div>
  )
}

const committeeStatusConfig = {
  approved: {
    icon: CheckCircle2,
    bg: 'bg-green-500/20',
    border: 'border-green-500/50',
    text: 'text-green-400',
    label: 'אושר',
  },
  pending: {
    icon: Clock,
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/50',
    text: 'text-yellow-400',
    label: 'ממתין',
  },
  in_preparation: {
    icon: Clock,
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/50',
    text: 'text-blue-400',
    label: 'בהכנה',
  },
  in_discussion: {
    icon: Clock,
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/50',
    text: 'text-purple-400',
    label: 'בדיון',
  },
  not_started: {
    icon: null,
    bg: 'bg-slate-500/20',
    border: 'border-slate-500/50',
    text: 'text-slate-400',
    label: 'טרם החל',
  },
}

const committeeLevels = [
  { key: 'national', label: 'ארצית' },
  { key: 'district', label: 'מחוזית' },
  { key: 'local', label: 'מקומית' },
]

function SimilarPlots({ currentPlot, allPlots, onSelectPlot }) {
  // Use investment-similarity API (zoning, price, size, ROI matching)
  const { data: similarPlots } = useSimilarPlots(currentPlot?.id)
  // Also fetch geo-proximity (nearby) for a separate section
  const { data: nearbyPlots } = useNearbyPlots(currentPlot?.id)

  // Deduplicate: remove plots that appear in both lists
  const nearbyFiltered = useMemo(() => {
    if (!nearbyPlots || nearbyPlots.length === 0) return []
    const similarIds = new Set((similarPlots || []).map(p => p.id))
    return nearbyPlots.filter(p => !similarIds.has(p.id)).slice(0, 3)
  }, [nearbyPlots, similarPlots])

  // Fallback: client-side similarity if both APIs return nothing
  const fallbackSimilar = useMemo(() => {
    if ((similarPlots && similarPlots.length > 0) || (nearbyPlots && nearbyPlots.length > 0)) return []
    if (!currentPlot || !allPlots || allPlots.length < 2) return []
    const price = currentPlot.total_price ?? currentPlot.totalPrice ?? 0
    const size = currentPlot.size_sqm ?? currentPlot.sizeSqM ?? 0
    return allPlots
      .filter(p => p.id !== currentPlot.id)
      .map(p => {
        const pPrice = p.total_price ?? p.totalPrice ?? 0
        const pSize = p.size_sqm ?? p.sizeSqM ?? 0
        const priceDiff = price > 0 ? Math.abs(pPrice - price) / price : 1
        const sizeDiff = size > 0 ? Math.abs(pSize - size) / size : 1
        const cityBonus = p.city === currentPlot.city ? 0 : 0.3
        return { ...p, _similarityScore: 10 - (priceDiff + sizeDiff + cityBonus) * 3 }
      })
      .sort((a, b) => b._similarityScore - a._similarityScore)
      .slice(0, 3)
  }, [currentPlot?.id, allPlots, similarPlots, nearbyPlots])

  // Cross-city alternatives — show best-value plots in OTHER cities with similar ROI.
  // Helps investors discover opportunities they wouldn't find in a single-city view.
  // Like Madlan's "חלקות באזורים אחרים" — increases engagement and cross-selling.
  const crossCityAlternatives = useMemo(() => {
    if (!currentPlot || !allPlots || allPlots.length < 4) return []
    const currentCity = currentPlot.city
    const currentRoi = (() => {
      const price = currentPlot.total_price ?? currentPlot.totalPrice ?? 0
      const proj = currentPlot.projected_value ?? currentPlot.projectedValue ?? 0
      return price > 0 ? ((proj - price) / price) * 100 : 0
    })()

    // Find plots in other cities with similar ROI range (±30%) and AVAILABLE status
    return allPlots
      .filter(p => {
        if (p.id === currentPlot.id || p.city === currentCity) return false
        if (p.status !== 'AVAILABLE') return false
        const price = p.total_price ?? p.totalPrice ?? 0
        const proj = p.projected_value ?? p.projectedValue ?? 0
        if (price <= 0) return false
        const roi = ((proj - price) / price) * 100
        return Math.abs(roi - currentRoi) <= 30
      })
      .map(p => {
        const price = p.total_price ?? p.totalPrice ?? 0
        const proj = p.projected_value ?? p.projectedValue ?? 0
        const roi = price > 0 ? ((proj - price) / price) * 100 : 0
        const roiMatch = 1 - Math.abs(roi - currentRoi) / 100
        return { ...p, _matchReasons: [`ROI דומה +${Math.round(roi)}%`, p.city] , _crossScore: roiMatch }
      })
      .sort((a, b) => b._crossScore - a._crossScore)
      .slice(0, 3)
  }, [currentPlot?.id, allPlots])

  const hasSimilar = (similarPlots && similarPlots.length > 0) || fallbackSimilar.length > 0
  const hasNearby = nearbyFiltered.length > 0
  const hasCrossCity = crossCityAlternatives.length > 0
  if (!hasSimilar && !hasNearby && !hasCrossCity) return null

  const renderPlotRow = (p, showDistance = false, showReasons = false) => {
    const bn = p.block_number ?? p.blockNumber
    const price = p.total_price ?? p.totalPrice
    const projValue = p.projected_value ?? p.projectedValue
    const roi = price > 0 ? Math.round((projValue - price) / price * 100) : 0
    const color = statusColors[p.status]
    return (
      <button
        key={p.id}
        onClick={() => onSelectPlot(p)}
        className="w-full flex items-center gap-3 bg-navy-light/40 border border-white/5 rounded-xl px-3 py-2.5 hover:border-gold/20 transition-all text-right group card-lift"
      >
        <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-slate-200 truncate">גוש {bn} | חלקה {p.number}</div>
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            {p.city}
            {showDistance && p.distance_km != null && (
              <span className="text-blue-400">· {p.distance_km < 1 ? `${Math.round(p.distance_km * 1000)}מ׳` : `${p.distance_km} ק״מ`}</span>
            )}
          </div>
          {showReasons && p._matchReasons && p._matchReasons.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {p._matchReasons.slice(0, 2).map((reason, i) => (
                <span key={i} className="text-[8px] text-gold/70 bg-gold/8 px-1.5 py-0.5 rounded">{reason}</span>
              ))}
            </div>
          )}
        </div>
        <div className="text-left flex-shrink-0">
          <div className="text-xs font-bold text-gold">{formatCurrency(price)}</div>
          <div className="text-[10px] text-emerald-400">+{roi}%</div>
        </div>
      </button>
    )
  }

  return (
    <div className="mt-4 mb-2 space-y-4">
      {/* Similar by investment characteristics */}
      {hasSimilar && (
        <div>
          <h4 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-purple-500/15 flex items-center justify-center text-[10px]">🎯</span>
            חלקות דומות
            <span className="text-[9px] text-slate-600 font-normal">מחיר, תכנון ותשואה</span>
          </h4>
          <div className="space-y-2">
            {(similarPlots && similarPlots.length > 0 ? similarPlots : fallbackSimilar).map(p => renderPlotRow(p, false, true))}
          </div>
        </div>
      )}

      {/* Nearby by geography */}
      {hasNearby && (
        <div>
          <h4 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-blue-500/15 flex items-center justify-center text-[10px]">📍</span>
            חלקות בסביבה
          </h4>
          <div className="space-y-2">
            {nearbyFiltered.map(p => renderPlotRow(p, true, false))}
          </div>
        </div>
      )}

      {/* Cross-city alternatives — help investors discover opportunities in other areas */}
      {hasCrossCity && (
        <div>
          <h4 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-gold/15 flex items-center justify-center text-[10px]">🌍</span>
            חלופות בערים אחרות
            <span className="text-[9px] text-slate-600 font-normal">ROI דומה, עיר שונה</span>
          </h4>
          <div className="space-y-2">
            {crossCityAlternatives.map(p => renderPlotRow(p, false, true))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * CommuteTimesSection — shows estimated driving times to major Israeli cities.
 * Key feature on Madlan: investors assess a plot's connectivity value by
 * commute time to employment hubs (Tel Aviv, Jerusalem, Haifa).
 * Uses haversine-based estimates with road factor correction.
 */
function CommuteTimesSection({ coordinates }) {
  const commutes = useMemo(() => {
    const center = plotCenter(coordinates)
    if (!center) return []
    return calcCommuteTimes(center.lat, center.lng)
  }, [coordinates])

  if (commutes.length === 0) return null

  const getTimeColor = (min) => {
    if (min <= 30) return '#22C55E'  // green — very close
    if (min <= 60) return '#EAB308'  // yellow — reasonable
    if (min <= 90) return '#F97316'  // orange — far
    return '#EF4444'                  // red — very far
  }

  const formatTime = (min) => {
    if (min < 60) return `${min} דק׳`
    const h = Math.floor(min / 60)
    const m = min % 60
    return m > 0 ? `${h} שע׳ ${m} דק׳` : `${h} שע׳`
  }

  return (
    <div className="bg-navy-light/40 border border-white/5 rounded-xl p-3 mt-3 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <Navigation className="w-3.5 h-3.5 text-gold" />
        <span className="text-xs font-medium text-slate-200">זמני נסיעה משוערים</span>
        <span className="text-[9px] text-slate-600 mr-auto">🚗 ממוצע</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {commutes.slice(0, 6).map((c) => (
          <a
            key={c.city}
            href={c.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-2.5 py-2 bg-white/[0.02] border border-white/5 rounded-lg hover:border-gold/20 hover:bg-white/[0.04] transition-all group"
            title={`~${c.distanceKm} ק״מ — לחץ לניווט ב-Google Maps`}
          >
            <span className="text-sm flex-shrink-0">{c.emoji}</span>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[10px] text-slate-400 truncate">{c.city}</span>
              <div className="flex items-center gap-1">
                <span
                  className="text-xs font-bold"
                  style={{ color: getTimeColor(c.drivingMinutes) }}
                >
                  {formatTime(c.drivingMinutes)}
                </span>
                <span className="text-[8px] text-slate-600">{c.distanceKm} ק״מ</span>
              </div>
            </div>
            <ExternalLink className="w-2.5 h-2.5 text-slate-600 group-hover:text-gold transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100" />
          </a>
        ))}
      </div>
      <div className="mt-2 text-[8px] text-slate-600 text-center">
        * הערכה בלבד — זמני נסיעה משתנים לפי תנועה ומסלול
      </div>
    </div>
  )
}

function MiniMortgageCalc({ totalPrice }) {
  const [equity, setEquity] = useState(50) // % equity
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
    <div className="bg-navy-light/40 border border-white/5 rounded-xl p-3 mt-3 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="w-3.5 h-3.5 text-gold" />
        <span className="text-xs font-medium text-slate-200">מחשבון מימון</span>
      </div>
      <div className="space-y-3">
        {/* Equity slider */}
        <div>
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>הון עצמי</span>
            <span className="text-gold font-medium">{equity}% ({formatCurrency(Math.round(totalPrice * equity / 100))})</span>
          </div>
          <input
            type="range" min="20" max="100" step="5" value={equity}
            onChange={(e) => setEquity(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-gold cursor-pointer"
          />
        </div>
        {/* Years slider */}
        <div>
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>תקופה</span>
            <span className="text-slate-300 font-medium">{years} שנים</span>
          </div>
          <input
            type="range" min="5" max="30" step="1" value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-gold cursor-pointer"
          />
        </div>
        {/* Rate slider */}
        <div>
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>ריבית</span>
            <span className="text-slate-300 font-medium">{rate}%</span>
          </div>
          <input
            type="range" min="2" max="8" step="0.25" value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-gold cursor-pointer"
          />
        </div>
        {/* Results */}
        {equity < 100 && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
            <div className="text-center">
              <div className="text-[10px] text-slate-500">החזר חודשי</div>
              <div className="text-xs font-bold text-gold">{formatCurrency(monthlyPayment)}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-slate-500">סה״כ ריבית</div>
              <div className="text-xs font-bold text-orange-400">{formatCurrency(totalInterest)}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-slate-500">סה״כ תשלום</div>
              <div className="text-xs font-bold text-slate-300">{formatCurrency(totalPayment)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PlotNavigation({ currentPlot, allPlots, onSelectPlot }) {
  const prefetchPlot = usePrefetchPlot()

  const { currentIndex, total, prevPlot, nextPlot } = useMemo(() => {
    if (!currentPlot || !allPlots || allPlots.length < 2) return { currentIndex: -1, total: 0, prevPlot: null, nextPlot: null }
    const idx = allPlots.findIndex(p => p.id === currentPlot.id)
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

  // Prefetch adjacent plots' full data into React Query cache on mount.
  // This eliminates the loading delay when clicking prev/next arrows —
  // the enriched plot data (images, documents, committees) is already cached.
  useEffect(() => {
    if (prevPlot?.id) prefetchPlot(prevPlot.id)
    if (nextPlot?.id) prefetchPlot(nextPlot.id)
  }, [prevPlot?.id, nextPlot?.id, prefetchPlot])

  if (total < 2 || currentIndex < 0) return null

  const goPrev = () => {
    if (prevPlot) onSelectPlot(prevPlot)
  }
  const goNext = () => {
    if (nextPlot) onSelectPlot(nextPlot)
  }

  // Compact preview of adjacent plot info for navigation context
  const prevBn = prevPlot ? (prevPlot.block_number ?? prevPlot.blockNumber) : ''
  const nextBn = nextPlot ? (nextPlot.block_number ?? nextPlot.blockNumber) : ''

  return (
    <div className="flex items-center gap-2 px-5 py-2 border-b border-white/5 bg-navy-light/20">
      <button
        onClick={goNext}
        onMouseEnter={() => nextPlot && prefetchPlot(nextPlot.id)}
        className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-gold/20 transition-all flex items-center justify-center group"
        title={nextPlot ? `הבא: גוש ${nextBn} חלקה ${nextPlot.number}` : 'חלקה הבאה'}
      >
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-gold transition-colors" />
      </button>
      <span className="text-[11px] text-slate-500 flex-1 text-center tabular-nums">
        {currentIndex + 1} / {total}
      </span>
      <button
        onClick={goPrev}
        onMouseEnter={() => prevPlot && prefetchPlot(prevPlot.id)}
        className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-gold/20 transition-all flex items-center justify-center group"
        title={prevPlot ? `הקודם: גוש ${prevBn} חלקה ${prevPlot.number}` : 'חלקה קודמת'}
      >
        <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-gold transition-colors" />
      </button>
    </div>
  )
}

/**
 * What's Nearby — shows POIs (schools, transit, parks, shops) near the plot.
 * Fetches from /api/plots/:id/nearby-pois which computes Haversine distances.
 * Like Madlan's "מה בסביבה" section that shows amenity proximity.
 */
const POI_CATEGORY_CONFIG = {
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

function NearbyPoisSection({ plotId }) {
  const { data, isLoading } = useNearbyPois(plotId)
  const pois = data?.pois || []
  const categories = data?.categories || {}

  if (isLoading) {
    return (
      <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 rounded-full bg-gold/20 animate-pulse" />
          <div className="h-3 w-24 rounded bg-slate-700/30 animate-pulse" />
        </div>
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-8 rounded-lg bg-slate-700/15 animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!pois || pois.length === 0) return null

  // Group by category with config
  const groupedEntries = Object.entries(categories)
    .map(([cat, items]) => {
      const config = POI_CATEGORY_CONFIG[cat.toLowerCase()] || { emoji: '📍', label: cat, color: '#94A3B8' }
      return { key: cat, config, items: items.slice(0, 3) } // max 3 per category
    })
    .sort((a, b) => b.items.length - a.items.length)
    .slice(0, 6) // max 6 categories

  return (
    <div className="mt-4" dir="rtl">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
          <MapPin className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <h4 className="text-sm font-bold text-slate-200">מה בסביבה</h4>
        <span className="text-[10px] text-slate-500 mr-auto">{pois.length} נקודות עניין</span>
      </div>

      <div className="space-y-2">
        {groupedEntries.map(({ key, config, items }) => (
          <div key={key} className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">{config.emoji}</span>
              <span className="text-[11px] font-semibold" style={{ color: config.color }}>{config.label}</span>
              <span className="text-[9px] text-slate-600">({items.length})</span>
            </div>
            <div className="space-y-1.5">
              {items.map((poi, i) => (
                <div key={poi.id || i} className="flex items-center justify-between text-[11px] gap-2">
                  <span className="text-slate-400 truncate flex-1">{poi.name}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Walking time — most useful metric for nearby amenities (like Madlan) */}
                    {poi.walk_min && poi.walk_min <= 30 && (
                      <span className="text-[9px] text-emerald-400/80 whitespace-nowrap" title={`🚶 ${poi.walk_label} הליכה`}>
                        🚶{poi.walk_label}
                      </span>
                    )}
                    {/* Driving time — shown for farther POIs (>2km) */}
                    {poi.walk_min && poi.walk_min > 30 && poi.drive_min && (
                      <span className="text-[9px] text-blue-400/80 whitespace-nowrap" title={`🚗 ${poi.drive_label} נסיעה`}>
                        🚗{poi.drive_label}
                      </span>
                    )}
                    <span className="text-slate-600 font-medium whitespace-nowrap text-[10px]">
                      {poi.distance_m < 1000
                        ? `${poi.distance_m}מ׳`
                        : `${poi.distance_km}ק״מ`
                      }
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {pois.length > 0 && data?.plotCenter && (
        <a
          href={`https://www.google.com/maps/search/nearby+amenities/@${data.plotCenter.lat},${data.plotCenter.lng},15z`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 mt-2 py-2 text-[10px] text-slate-500 hover:text-gold transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          <span>הצג ב-Google Maps</span>
        </a>
      )}
    </div>
  )
}

export default function SidebarDetails({ plot: rawPlot, onClose, onOpenLeadModal, favorites, compareIds = [], onToggleCompare, allPlots = [], onSelectPlot, priceChange }) {
  // Enrich plot data: fetch full plot when images/documents are missing (e.g. from list endpoint)
  const needsEnrich = rawPlot && !rawPlot.plot_images && !rawPlot.plot_documents
  const { data: enrichedPlot, isLoading: isEnriching } = usePlot(needsEnrich ? rawPlot.id : null)
  const plot = useMemo(() => {
    return needsEnrich && enrichedPlot ? { ...rawPlot, ...enrichedPlot } : rawPlot
  }, [needsEnrich, enrichedPlot, rawPlot])

  const scrollRef = useRef(null)
  const panelRef = useRef(null)

  // Focus trap: traps keyboard focus inside the sidebar panel (WCAG 2.4.3)
  // Returns focus to the previously focused element (map polygon/card) when sidebar closes
  const { returnFocus } = useFocusTrap(!!plot, panelRef)

  // Wrap onClose to restore focus when sidebar closes
  const handleClose = useCallback(() => {
    returnFocus()
    onClose()
  }, [returnFocus, onClose])
  const [scrollShadow, setScrollShadow] = useState({ top: false, bottom: false })
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [gushCopied, setGushCopied] = useState(false)
  const [summaryCopied, setSummaryCopied] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // ── Mobile bottom-sheet drag (vertical) + desktop swipe-to-close (horizontal) ──
  // Snap points as vh fractions
  const SNAP_PEEK = 40
  const SNAP_MID = 75
  const SNAP_FULL = 95
  const snapPoints = [SNAP_PEEK, SNAP_MID, SNAP_FULL]

  const [sheetHeight, setSheetHeight] = useState(SNAP_MID) // start at mid
  const [isDragging, setIsDragging] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0) // horizontal offset for desktop swipe-to-close

  const dragRef = useRef({
    startY: 0,
    startX: 0,
    startHeight: SNAP_MID,
    direction: null, // 'vertical' | 'horizontal' | null
    active: false,
  })

  // Detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0]
    dragRef.current = {
      startY: touch.clientY,
      startX: touch.clientX,
      startHeight: sheetHeight,
      direction: null,
      active: false,
    }
  }, [sheetHeight])

  const handleTouchMove = useCallback((e) => {
    const touch = e.touches[0]
    const state = dragRef.current
    const dx = touch.clientX - state.startX
    const dy = touch.clientY - state.startY

    // Determine drag direction on first significant movement (higher threshold to avoid capturing taps)
    if (!state.direction && (Math.abs(dx) > 15 || Math.abs(dy) > 15)) {
      state.direction = Math.abs(dy) >= Math.abs(dx) ? 'vertical' : 'horizontal'
      state.active = true
      setIsDragging(true)
    }

    if (!state.active) return

    if (state.direction === 'vertical' && isMobile) {
      // Convert pixel drag to vh change: dragging down = negative dy => decrease height
      const vhPerPx = 100 / window.innerHeight
      const deltaVh = -dy * vhPerPx // negative dy (drag up) = increase height
      const newHeight = Math.max(10, Math.min(95, state.startHeight + deltaVh))
      setSheetHeight(newHeight)
      e.preventDefault() // prevent scroll while dragging
    } else if (state.direction === 'horizontal') {
      // Horizontal swipe-to-close (works on both mobile & desktop)
      const offset = Math.max(0, dx)
      setSwipeOffset(offset)
    }
  }, [isMobile])

  const handleTouchEnd = useCallback(() => {
    const state = dragRef.current
    setIsDragging(false)

    if (state.direction === 'vertical' && isMobile) {
      // Snap to nearest snap point
      let closest = snapPoints[0]
      let minDist = Infinity
      for (const sp of snapPoints) {
        const dist = Math.abs(sheetHeight - sp)
        if (dist < minDist) { minDist = dist; closest = sp }
      }

      // If dragged below peek threshold, close the sheet
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

  // Reset sheet height when plot changes
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
        const formatMin = (m) => m < 60 ? `${m} דק׳` : `${Math.floor(m / 60)} שע׳ ${m % 60 > 0 ? m % 60 + ' דק׳' : ''}`
        return `<div class="section">
          <h2>זמני נסיעה משוערים 🚗</h2>
          <div class="grid3">
            ${commutes.slice(0, 6).map(c => `<div class="card"><div class="label">${c.emoji} ${c.city}</div><div class="value">${formatMin(c.drivingMinutes)}</div><div style="font-size:10px;color:#999">${c.distanceKm} ק״מ</div></div>`).join('')}
          </div>
          <div style="font-size:10px;color:#aaa;text-align:center;margin-top:8px">* הערכה בלבד — זמני נסיעה משתנים לפי תנועה ומסלול</div>
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

  // Show a shimmer skeleton over content sections while enriching
  const isLoadingExtra = isEnriching && !enrichedPlot

  // Handle both snake_case (API) and camelCase (legacy) field names
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

  const currentStageIndex = zoningPipelineStages.findIndex((s) => s.key === zoningStage)

  let sectionNum = 0

  return (
    <>
      {/* Backdrop — click to close (WCAG: backdrop should be dismissible) */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[50]"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label={`פרטי חלקה — גוש ${plot?.block_number ?? plot?.blockNumber} חלקה ${plot?.number}`}
        aria-modal="true"
        className="sidebar-panel fixed top-0 right-0 h-full w-full sm:w-[420px] md:w-[480px] max-w-full z-[60] bg-navy border-l border-white/10 shadow-2xl flex flex-col overflow-hidden sm:animate-slide-in-right"
        dir="rtl"
        style={{
          ...(isMobile ? { height: `${sheetHeight}vh`, transition: isDragging ? 'none' : 'height 0.35s cubic-bezier(0.32, 0.72, 0, 1)' } : {}),
          ...(swipeOffset > 0 ? { transform: `translateX(${swipeOffset}px)`, transition: 'none' } : {}),
        }}
      >
        {/* Gold accent bar */}
        <div
          className="h-[3px] flex-shrink-0"
          style={{ background: 'linear-gradient(90deg, #C8942A, #E5B94E, #F0D078, #E5B94E, #C8942A)' }}
        />

        {/* Drag handle — visible on mobile only */}
        <div
          className="sidebar-drag-handle"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="sidebar-drag-handle-bar" />
        </div>

        {/* Draggable header zone (drag handle + preview + title) — swipe right to close on mobile */}
        <div
          className="sidebar-header-drag-zone flex-shrink-0"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Map preview area — real satellite map like Madlan */}
          {plot.coordinates && plot.coordinates.length >= 3 ? (
            <div className="h-36 relative overflow-hidden group">
              <MiniMap
                coordinates={plot.coordinates}
                status={plot.status}
                city={plot.city}
                height="144px"
                className="rounded-none border-0"
                showStreetViewToggle
              />
              {/* Navigation quick-links — Waze + Google Maps overlay on map preview.
                  Critical for Israeli investors who want to physically visit the plot.
                  Shows on hover (desktop) and always visible on mobile. */}
              {(() => {
                const center = plotCenter(plot.coordinates)
                if (!center) return null
                return (
                  <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                    <a
                      href={`https://www.waze.com/ul?ll=${center.lat},${center.lng}&navigate=yes&zoom=17`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-white bg-[#33CCFF]/90 backdrop-blur-sm rounded-lg hover:bg-[#33CCFF] transition-colors shadow-sm"
                      title="נווט ב-Waze"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M20.54 6.63c.23.7.38 1.43.43 2.19.05.84-.01 1.63-.19 2.39-.18.76-.47 1.47-.85 2.11a7.88 7.88 0 01-1.47 1.8c.1.13.19.26.27.4.36.66.55 1.38.55 2.17 0 .83-.21 1.6-.63 2.3a4.54 4.54 0 01-1.7 1.7 4.54 4.54 0 01-2.3.63c-.75 0-1.44-.17-2.08-.51a4.32 4.32 0 01-1.28-.99 8.2 8.2 0 01-2.37.35c-1.39 0-2.69-.33-3.89-.99a7.8 7.8 0 01-2.92-2.77A7.47 7.47 0 011 13.39c0-1.39.33-2.69.99-3.89A7.8 7.8 0 014.76 6.58a7.47 7.47 0 013.83-1.08h.2c.37-1.07 1.02-1.93 1.95-2.58A5.34 5.34 0 0113.85 2c1.07 0 2.06.3 2.96.89.9.6 1.55 1.38 1.96 2.35a7.6 7.6 0 011.77 1.39zm-5.85-2.3a2.89 2.89 0 00-2.13.86 2.92 2.92 0 00-.86 2.14c0 .17.01.34.04.5a7.7 7.7 0 012.14-.61c.34-.06.68-.1 1.03-.11a3.02 3.02 0 00-.09-1.65 2.93 2.93 0 00-2.13-1.13zm-3.96 5.72c-.48 0-.89.17-1.23.51-.34.34-.51.75-.51 1.23s.17.89.51 1.23c.34.34.75.51 1.23.51s.89-.17 1.23-.51c.34-.34.51-.75.51-1.23s-.17-.89-.51-1.23a1.68 1.68 0 00-1.23-.51zm5.07 0c-.48 0-.89.17-1.23.51-.34.34-.51.75-.51 1.23s.17.89.51 1.23c.34.34.75.51 1.23.51s.89-.17 1.23-.51c.34-.34.51-.75.51-1.23s-.17-.89-.51-1.23a1.68 1.68 0 00-1.23-.51z"/></svg>
                      Waze
                    </a>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${center.lat},${center.lng}&travelmode=driving`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-white bg-[#4285F4]/90 backdrop-blur-sm rounded-lg hover:bg-[#4285F4] transition-colors shadow-sm"
                      title="נווט ב-Google Maps"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Navigation className="w-3 h-3" />
                      Maps
                    </a>
                  </div>
                )
              })()}
            </div>
          ) : (
            <div className="h-36 bg-navy-mid relative overflow-hidden">
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-gold animate-pulse-gold" />
                <span className="text-xs text-gold/80 mt-2">
                  גוש {blockNumber} | {plot.city}
                </span>
              </div>
              <div className="absolute bottom-0 w-full h-12 bg-gradient-to-t from-navy to-transparent" />
            </div>
          )}

          {/* Header */}
          <div className="flex justify-between items-start p-5 pb-3 gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black truncate">
                <span className="bg-gradient-to-r from-gold to-gold-bright bg-clip-text text-transparent">גוש</span>
                {' '}{blockNumber}{' | '}
                <span className="bg-gradient-to-r from-gold to-gold-bright bg-clip-text text-transparent">חלקה</span>
                {' '}{plot.number}
              </h2>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`גוש ${blockNumber} חלקה ${plot.number}`).then(() => {
                    setGushCopied(true)
                    setTimeout(() => setGushCopied(false), 2000)
                  })
                }}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                  gushCopied
                    ? 'bg-green-500/20 border border-green-500/30'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-gold/20'
                }`}
                title="העתק גוש/חלקה (לחיפוש בטאבו, מנהל מקרקעין)"
              >
                {gushCopied
                  ? <Check className="w-3 h-3 text-green-400" />
                  : <Copy className="w-3 h-3 text-slate-400" />
                }
              </button>
            </div>
            {/* Compact summary on mobile — full badges moved to scrollable area */}
            <div className="flex items-center gap-2 mt-1.5 sm:hidden">
              <span className="text-xs text-slate-400">
                {formatDunam(sizeSqM)} דונם
              </span>
              <span className="text-[10px] text-slate-500">•</span>
              <span
                className="inline-flex items-center gap-1 text-xs font-medium"
                style={{ color: statusColor }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                {statusLabels[plot.status]}
              </span>
              <span className="text-[10px] text-slate-500">•</span>
              {(() => {
                const score = calcInvestmentScore(plot)
                const { color } = getScoreLabel(score)
                return <span className="text-xs font-bold" style={{ color }}>⭐ {score}/10</span>
              })()}
            </div>
            {/* Full badges — desktop only (hidden on mobile, shown in scroll area instead) */}
            <div className="hidden sm:flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg">
                {formatDunam(sizeSqM)} דונם ({sizeSqM.toLocaleString()} מ&quot;ר)
              </span>
              <span className="text-xs text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg">
                {zoningLabels[zoningStage]}
              </span>
              {densityUnitsPerDunam && (
                <span className="text-xs text-gold bg-gold/10 px-2.5 py-1 rounded-lg">
                  {densityUnitsPerDunam} יח&quot;ד/דונם
                </span>
              )}
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: statusColor + '14',
                  border: `1px solid ${statusColor}35`,
                  color: statusColor,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: statusColor }}
                />
                {statusLabels[plot.status]}
              </span>
              {(() => {
                const score = calcInvestmentScore(plot)
                const { label, color } = getScoreLabel(score)
                return (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                    style={{
                      background: `${color}14`,
                      border: `1px solid ${color}35`,
                      color,
                    }}
                    title={`ציון השקעה: ${score}/10 — ${label}`}
                  >
                    ⭐ {score}/10
                  </span>
                )
              })()}
              {plot.views > 0 && (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium"
                  style={{
                    background: 'rgba(99,102,241,0.12)',
                    border: '1px solid rgba(99,102,241,0.25)',
                    color: '#A5B4FC',
                  }}
                  title={`${plot.views} צפיות`}
                >
                  <Eye className="w-2.5 h-2.5" />
                  {plot.views} צפו
                </span>
              )}
              {(() => {
                const dom = calcDaysOnMarket(plot.created_at ?? plot.createdAt)
                if (!dom) return null
                return (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium"
                    style={{
                      background: `${dom.color}14`,
                      border: `1px solid ${dom.color}35`,
                      color: dom.color,
                    }}
                    title={`${dom.days} ימים מאז פרסום`}
                  >
                    <Hourglass className="w-2.5 h-2.5" />
                    {dom.label}
                  </span>
                )
              })()}
              {(() => {
                const dv = calcDemandVelocity(plot)
                if (!dv || dv.tier === 'low') return null
                return (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium"
                    style={{
                      background: `${dv.color}14`,
                      border: `1px solid ${dv.color}35`,
                      color: dv.color,
                    }}
                    title={`${dv.velocity} צפיות/יום — ${dv.label}`}
                  >
                    {dv.emoji} {dv.label}
                  </span>
                )
              })()}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {favorites && (
              <button
                onClick={() => favorites.toggle(plot.id)}
                className={`w-10 h-10 rounded-xl border transition-all duration-300 flex items-center justify-center ${
                  favorites.isFavorite(plot.id)
                    ? 'bg-red-500/15 border-red-500/30 hover:bg-red-500/25'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <Heart
                  className={`w-4 h-4 transition-all ${
                    favorites.isFavorite(plot.id)
                      ? 'text-red-400 fill-red-400 scale-110'
                      : 'text-slate-400'
                  }`}
                />
              </button>
            )}
            {/* Open in full page — deep link for bookmarking, sharing, SEO */}
            <a
              href={`/plot/${plot.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-gold/20 transition-all duration-300 flex items-center justify-center"
              aria-label="פתח בדף מלא"
              title="פתח בדף מלא"
            >
              <Maximize2 className="w-4 h-4 text-slate-400" />
            </a>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:rotate-90 transition-all duration-300 flex items-center justify-center"
              aria-label="סגור פרטי חלקה"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
        </div>{/* end sidebar-header-drag-zone */}

        {/* Prev/Next navigation — like Madlan */}
        <PlotNavigation currentPlot={plot} allPlots={allPlots} onSelectPlot={onSelectPlot} />

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative" ref={scrollRef} onScroll={handleScroll}>
          {/* Scroll shadows */}
          <div className={`scroll-shadow-top ${scrollShadow.top ? 'visible' : ''}`} />
          <div className={`scroll-shadow-bottom ${scrollShadow.bottom ? 'visible' : ''}`} />

          {/* Quick section navigation */}
          <QuickNavBar scrollRef={scrollRef} />

          {/* Mobile badges — full set shown in scrollable area */}
          <div className="sm:hidden px-4 pt-2 pb-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-lg">
                {formatDunam(sizeSqM)} דונם ({sizeSqM.toLocaleString()} מ&quot;ר)
              </span>
              <span className="text-[11px] text-slate-300 bg-white/5 px-2 py-0.5 rounded-lg">
                {zoningLabels[zoningStage]}
              </span>
              {densityUnitsPerDunam && (
                <span className="text-[11px] text-gold bg-gold/10 px-2 py-0.5 rounded-lg">
                  {densityUnitsPerDunam} יח&quot;ד/דונם
                </span>
              )}
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                style={{
                  background: statusColor + '14',
                  border: `1px solid ${statusColor}35`,
                  color: statusColor,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: statusColor }} />
                {statusLabels[plot.status]}
              </span>
              {(() => {
                const score = calcInvestmentScore(plot)
                const { label, color } = getScoreLabel(score)
                return (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
                    style={{ background: `${color}14`, border: `1px solid ${color}35`, color }}
                    title={`ציון השקעה: ${score}/10 — ${label}`}
                  >
                    ⭐ {score}/10
                  </span>
                )
              })()}
              {plot.views > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#A5B4FC' }}>
                  <Eye className="w-2.5 h-2.5" /> {plot.views} צפו
                </span>
              )}
              {(() => {
                const dom = calcDaysOnMarket(plot.created_at ?? plot.createdAt)
                if (!dom) return null
                return (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: `${dom.color}14`, border: `1px solid ${dom.color}35`, color: dom.color }}>
                    <Hourglass className="w-2.5 h-2.5" /> {dom.label}
                  </span>
                )
              })()}
              {(() => {
                const dv = calcDemandVelocity(plot)
                if (!dv || dv.tier === 'low') return null
                return (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: `${dv.color}14`, border: `1px solid ${dv.color}35`, color: dv.color }}>
                    {dv.emoji} {dv.label}
                  </span>
                )
              })()}
            </div>
          </div>

          {/* Area Market Context Bar — compact area summary (like Madlan's neighborhood context).
              Shows how many plots are in this city, average ROI, and this plot's price rank.
              Computed from allPlots (already in props) — no extra API call needed. */}
          {(() => {
            if (!allPlots || allPlots.length < 3 || sizeSqM <= 0) return null
            const cityPlots = allPlots.filter(p => (p.city === plot.city) && (p.total_price ?? p.totalPrice ?? 0) > 0)
            if (cityPlots.length < 2) return null

            // Compute area stats
            const plotPsm = totalPrice / sizeSqM
            let totalRoi = 0, totalPsm = 0
            const psmValues = []
            for (const p of cityPlots) {
              const pp = p.total_price ?? p.totalPrice ?? 0
              const ps = p.size_sqm ?? p.sizeSqM ?? 1
              const pj = p.projected_value ?? p.projectedValue ?? 0
              if (pp > 0 && ps > 0) {
                totalPsm += pp / ps
                psmValues.push(pp / ps)
              }
              if (pp > 0) totalRoi += ((pj - pp) / pp) * 100
            }
            const avgRoi = Math.round(totalRoi / cityPlots.length)
            // Price rank: where does this plot's price/sqm sit among city plots?
            const sorted = [...psmValues].sort((a, b) => a - b)
            const rank = sorted.filter(v => v <= plotPsm).length
            const percentile = Math.round((rank / sorted.length) * 100)
            const rankLabel = percentile <= 25 ? 'הזולה ביותר' : percentile <= 50 ? 'מתחת לממוצע' : percentile <= 75 ? 'מעל הממוצע' : 'היקרה ביותר'
            const rankColor = percentile <= 25 ? '#22C55E' : percentile <= 50 ? '#4ADE80' : percentile <= 75 ? '#FBBF24' : '#EF4444'

            return (
              <div className="mx-4 sm:mx-5 mt-2 mb-1">
                <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2" dir="rtl">
                  <span className="text-[10px]">🏘️</span>
                  <span className="text-[10px] text-slate-500">
                    {cityPlots.length} חלקות ב{plot.city}
                  </span>
                  <span className="text-[10px] text-slate-700">•</span>
                  <span className="text-[10px] text-emerald-400/80">
                    ∅ +{avgRoi}% ROI
                  </span>
                  <span className="text-[10px] text-slate-700">•</span>
                  <span className="text-[10px] font-medium" style={{ color: rankColor }}>
                    {rankLabel}
                  </span>
                  {/* Area price trend — compare newer vs older listings to detect momentum */}
                  {(() => {
                    const withDates = cityPlots.filter(p => (p.created_at ?? p.createdAt) && (p.size_sqm ?? p.sizeSqM ?? 0) > 0)
                    if (withDates.length < 4) return null
                    const sorted = [...withDates].sort((a, b) => new Date(a.created_at ?? a.createdAt) - new Date(b.created_at ?? b.createdAt))
                    const half = Math.floor(sorted.length / 2)
                    const olderHalf = sorted.slice(0, half)
                    const newerHalf = sorted.slice(half)
                    const avgPsm = (arr) => {
                      let sum = 0, cnt = 0
                      for (const p of arr) {
                        const pp = p.total_price ?? p.totalPrice ?? 0
                        const ps = p.size_sqm ?? p.sizeSqM ?? 1
                        if (pp > 0 && ps > 0) { sum += pp / ps; cnt++ }
                      }
                      return cnt > 0 ? sum / cnt : 0
                    }
                    const olderAvg = avgPsm(olderHalf)
                    const newerAvg = avgPsm(newerHalf)
                    if (olderAvg <= 0) return null
                    const trendPct = Math.round(((newerAvg - olderAvg) / olderAvg) * 100)
                    if (Math.abs(trendPct) < 2) return null
                    const isUp = trendPct > 0
                    return (
                      <>
                        <span className="text-[10px] text-slate-700">•</span>
                        <span
                          className="text-[10px] font-bold"
                          style={{ color: isUp ? '#F59E0B' : '#22C55E' }}
                          title={`מגמת מחירים: חלקות חדשות ${isUp ? 'יקרות' : 'זולות'} ב-${Math.abs(trendPct)}% מחלקות ישנות יותר`}
                        >
                          {isUp ? '↗' : '↘'} {isUp ? '+' : ''}{trendPct}%
                        </span>
                      </>
                    )
                  })()}
                  {/* Mini percentile bar */}
                  <div className="flex-1 max-w-[50px] mr-auto">
                    <div className="relative w-full h-1 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                        style={{ width: `${percentile}%`, background: rankColor }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          <div className="px-6 pb-6">
            {/* Total Investment Summary — the #1 thing investors want to see upfront.
                Uses centralized calcInvestmentPnL for consistent calculations across
                the entire app (sidebar, compare page, calculator, print reports). */}
            {(() => {
              const readiness = readinessEstimate || ''
              // Extract holding years estimate from readiness (e.g., "1-3" → 2, "3-5" → 4, "5+" → 7)
              const holdingYears = readiness.startsWith('1-3') ? 2 : readiness.startsWith('3-5') ? 4 : readiness.startsWith('5') ? 7 : 5
              const pnl = calcInvestmentPnL(plot, holdingYears)
              return (
                <div className="bg-gradient-to-r from-navy-light/60 to-navy-light/40 border border-gold/15 rounded-2xl p-4 mb-4 animate-stagger-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <div className="text-[10px] text-slate-500 mb-0.5">💰 סה״כ השקעה נדרשת</div>
                      <div className="text-lg font-black text-blue-400">{formatCurrency(pnl.totalInvestment)}</div>
                      <div className="text-[9px] text-slate-600">כולל מיסים, שכ״ט + {holdingYears}ש׳ החזקה</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-slate-500 mb-0.5">✨ רווח נקי צפוי</div>
                      <div className={`text-lg font-black ${pnl.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(pnl.netProfit)}</div>
                      <div className="text-[9px] text-slate-600">אחרי הכל · {pnl.trueRoi}% ROI נטו</div>
                    </div>
                  </div>
                  {/* Holding costs micro-detail — often overlooked, critical for true ROI */}
                  {pnl.totalHoldingCosts > 0 && (
                    <div className="flex items-center justify-center gap-3 mt-2.5 pt-2.5 border-t border-white/5 text-[9px]">
                      <span className="text-slate-600">
                        ארנונה + ניהול: {formatCurrency(pnl.annual.totalAnnual)}/שנה
                      </span>
                      <span className="text-slate-700">·</span>
                      <span className="text-orange-400/60">
                        סה״כ {holdingYears} שנים: {formatCurrency(pnl.totalHoldingCosts)}
                      </span>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Below Market Price Indicator — like Madlan's "מחיר נמוך ממדלן" badge */}
            {(() => {
              if (!allPlots || allPlots.length < 3 || sizeSqM <= 0) return null
              // Calculate city-level average price per sqm
              const cityPlots = allPlots.filter(p => p.city === plot.city && p.id !== plot.id)
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
              // Only show when meaningfully below or above (±5% threshold)
              if (Math.abs(diffPct) < 5) return null
              const isBelow = diffPct < 0
              return (
                <div
                  className={`flex items-center gap-3 rounded-2xl p-3 mb-3 border animate-stagger-1 ${
                    isBelow
                      ? 'bg-emerald-500/8 border-emerald-500/15'
                      : 'bg-amber-500/8 border-amber-500/15'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base ${
                    isBelow ? 'bg-emerald-500/15' : 'bg-amber-500/15'
                  }`}>
                    {isBelow ? '📉' : '📈'}
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs font-bold ${isBelow ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isBelow
                        ? `${Math.abs(diffPct)}% מתחת לממוצע ב${plot.city}`
                        : `${diffPct}% מעל הממוצע ב${plot.city}`
                      }
                    </div>
                    <div className="text-[10px] text-slate-500">
                      ממוצע אזורי: {formatCurrency(Math.round(avgPsm))}/מ״ר · חלקה זו: {formatCurrency(Math.round(plotPsm))}/מ״ר
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Investment Verdict — instant investor assessment (like Madlan's deal badges) */}
            {(() => {
              const verdict = calcInvestmentVerdict(plot, allPlots)
              if (!verdict) return null
              return (
                <div
                  className={`flex items-center gap-3 rounded-2xl p-3 mb-4 border animate-stagger-1 ${
                    verdict.tier === 'hot' ? 'bg-orange-500/10 border-orange-500/20' :
                    verdict.tier === 'excellent' ? 'bg-emerald-500/10 border-emerald-500/20' :
                    verdict.tier === 'good' ? 'bg-lime-500/10 border-lime-500/20' :
                    verdict.tier === 'fair' ? 'bg-amber-500/10 border-amber-500/20' :
                    'bg-red-500/10 border-red-500/20'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                    style={{ background: `${verdict.color}18` }}
                  >
                    {verdict.emoji}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold" style={{ color: verdict.color }}>
                      {verdict.label}
                    </div>
                    <div className="text-[11px] text-slate-400 leading-snug">
                      {verdict.description}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Investment Risk Level — differentiator vs Madlan/Yad2 (they don't show risk) */}
            {(() => {
              const risk = calcRiskLevel(plot, allPlots)
              if (!risk) return null
              // Visual gauge: 5 segments representing risk levels 1-5
              const segments = [1, 2, 3, 4, 5]
              return (
                <div className="flex items-center gap-3 rounded-2xl p-3 mb-3 border bg-navy-light/30 border-white/5 animate-stagger-1">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base" style={{ background: `${risk.color}15` }}>
                    {risk.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold" style={{ color: risk.color }}>{risk.label}</span>
                      <span className="text-[9px] text-slate-500">{risk.level}/5</span>
                    </div>
                    {/* Risk gauge bar */}
                    <div className="flex gap-0.5 mb-1.5">
                      {segments.map(s => (
                        <div
                          key={s}
                          className="h-1.5 flex-1 rounded-full transition-colors"
                          style={{
                            background: s <= risk.level
                              ? s <= 2 ? '#22C55E' : s <= 3 ? '#F59E0B' : '#EF4444'
                              : 'rgba(255,255,255,0.06)',
                          }}
                        />
                      ))}
                    </div>
                    {/* Risk factors */}
                    {risk.factors.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {risk.factors.map((factor, i) => (
                          <span key={i} className="text-[8px] text-slate-500 bg-white/[0.03] px-1.5 py-0.5 rounded">{factor}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Description */}
            {plot.description && (
              <p className="text-sm text-slate-300 leading-relaxed mb-1 animate-stagger-1">{plot.description}</p>
            )}

            {/* Area Context */}
            {(areaContext || nearbyDevelopment) && (
              <div className="bg-gradient-to-r from-navy-light/50 to-navy-light/60 border border-white/5 rounded-2xl p-4 mt-3 animate-stagger-2">
                {areaContext && (
                  <div className="flex gap-3 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-gold" />
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{areaContext}</p>
                  </div>
                )}
                {nearbyDevelopment && (
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{nearbyDevelopment}</p>
                  </div>
                )}
              </div>
            )}

            {/* Distance & plot dimension chips */}
            <div className="flex flex-wrap gap-2.5 mt-3 animate-stagger-3">
              {/* Plot perimeter — useful for fencing costs, boundary assessment.
                  Neither Madlan nor Yad2 show this metric; professionals calculate it manually. */}
              {(() => {
                const perimeter = calcPlotPerimeter(plot.coordinates)
                if (!perimeter) return null
                return (
                  <div className="flex items-center gap-2 bg-gradient-to-r from-navy-light/50 to-navy-light/60 border border-gold/15 rounded-xl px-4 py-2 text-xs text-slate-300 card-lift" title={`היקף החלקה: ${perimeter.toLocaleString()} מטר — שימושי להערכת עלויות גידור`}>
                    <div className="w-6 h-6 rounded-lg bg-gold/15 flex items-center justify-center">
                      <span className="text-gold text-[11px]">📐</span>
                    </div>
                    היקף: {perimeter >= 1000 ? `${(perimeter / 1000).toFixed(1)} ק״מ` : `${perimeter} מ׳`}
                  </div>
                )
              })()}
              {distanceToSea != null && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-navy-light/50 to-navy-light/60 border border-blue-500/15 rounded-xl px-4 py-2 text-xs text-slate-300 card-lift">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/15 flex items-center justify-center">
                    <Waves className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  {distanceToSea} מ׳ מהים
                </div>
              )}
              {distanceToPark != null && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-navy-light/50 to-navy-light/60 border border-green-500/15 rounded-xl px-4 py-2 text-xs text-slate-300 card-lift">
                  <div className="w-6 h-6 rounded-lg bg-green-500/15 flex items-center justify-center">
                    <TreePine className="w-3.5 h-3.5 text-green-400" />
                  </div>
                  {distanceToPark} מ׳ מפארק
                </div>
              )}
              {distanceToHospital != null && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-navy-light/50 to-navy-light/60 border border-red-500/15 rounded-xl px-4 py-2 text-xs text-slate-300 card-lift">
                  <div className="w-6 h-6 rounded-lg bg-red-500/15 flex items-center justify-center">
                    <Hospital className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  {distanceToHospital} מ׳ מבי&quot;ח
                </div>
              )}
            </div>

            {/* External Map Links (Street View, Google Maps, Waze) */}
            {(() => {
              const center = plotCenter(plot.coordinates)
              if (!center) return null
              return (
                <div className="flex flex-wrap gap-2 mt-3 animate-stagger-3">
                  <a
                    href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${center.lat},${center.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-gradient-to-r from-navy-light/50 to-navy-light/60 border border-yellow-500/15 rounded-xl px-4 py-2 text-xs text-slate-300 hover:border-gold/30 transition-all card-lift"
                  >
                    <div className="w-6 h-6 rounded-lg bg-yellow-500/15 flex items-center justify-center">
                      <Eye className="w-3.5 h-3.5 text-yellow-400" />
                    </div>
                    Street View
                    <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
                  </a>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${center.lat},${center.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-gradient-to-r from-navy-light/50 to-navy-light/60 border border-blue-500/15 rounded-xl px-4 py-2 text-xs text-slate-300 hover:border-gold/30 transition-all card-lift"
                  >
                    <div className="w-6 h-6 rounded-lg bg-blue-500/15 flex items-center justify-center">
                      <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    Google Maps
                    <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
                  </a>
                  <a
                    href={`https://www.waze.com/ul?ll=${center.lat},${center.lng}&navigate=yes`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-gradient-to-r from-navy-light/50 to-navy-light/60 border border-cyan-500/15 rounded-xl px-4 py-2 text-xs text-slate-300 hover:border-gold/30 transition-all card-lift"
                  >
                    <div className="w-6 h-6 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                      <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    Waze
                    <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
                  </a>
                </div>
              )
            })()}

            {/* Government Registry Links — essential for Israeli real estate due diligence */}
            <div className="flex flex-wrap gap-2 mt-2 animate-stagger-3">
              <a
                href={`https://www.gov.il/he/departments/topics/tabu-online`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-gradient-to-r from-navy-light/50 to-navy-light/60 border border-indigo-500/15 rounded-xl px-4 py-2 text-xs text-slate-300 hover:border-gold/30 transition-all card-lift"
              >
                <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                טאבו (גוש {blockNumber})
                <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
              </a>
              <a
                href={`https://ims.gov.il/he/LandRegistration`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-gradient-to-r from-navy-light/50 to-navy-light/60 border border-teal-500/15 rounded-xl px-4 py-2 text-xs text-slate-300 hover:border-gold/30 transition-all card-lift"
              >
                <div className="w-6 h-6 rounded-lg bg-teal-500/15 flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5 text-teal-400" />
                </div>
                מנהל מקרקעין
                <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
              </a>
              <a
                href={`https://www.govmap.gov.il/?lat=${(plotCenter(plot.coordinates)?.lat ?? 32.45).toFixed(5)}&lon=${(plotCenter(plot.coordinates)?.lng ?? 34.87).toFixed(5)}&z=15`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-gradient-to-r from-navy-light/50 to-navy-light/60 border border-amber-500/15 rounded-xl px-4 py-2 text-xs text-slate-300 hover:border-gold/30 transition-all card-lift"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                </div>
                GovMap
                <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
              </a>
            </div>

            {/* Price Change Alert — like Yad2's "המחיר השתנה!" */}
            {priceChange && (
              <div className={`flex items-center gap-3 mt-3 p-3 rounded-xl border animate-stagger-3 ${
                priceChange.direction === 'down'
                  ? 'bg-green-500/10 border-green-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  priceChange.direction === 'down' ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                  <span className="text-base">{priceChange.direction === 'down' ? '📉' : '📈'}</span>
                </div>
                <div className="min-w-0">
                  <div className={`text-xs font-bold ${priceChange.direction === 'down' ? 'text-green-400' : 'text-red-400'}`}>
                    {priceChange.direction === 'down' ? 'המחיר ירד!' : 'המחיר עלה'}
                    {' '}{priceChange.pctChange}%
                  </div>
                  <div className="text-[10px] text-slate-500">
                    מחיר קודם: {formatCurrency(priceChange.previousPrice)}
                  </div>
                </div>
              </div>
            )}

            {/* Percentile ranking badges — shows where this plot stands vs all others */}
            {allPlots.length >= 2 && (
              <div className="mt-4 animate-stagger-3">
                <PlotPercentileBadges plot={plot} allPlots={allPlots} />
              </div>
            )}

            {/* View Full Details CTA — prominent banner linking to the full PlotDetail page.
                The sidebar is a quick-view; the full page has mortgage calc, investment benchmark,
                due diligence checklist, and richer content. Like Madlan's "לעמוד הנכס המלא". */}
            <a
              href={`/plot/${plot.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 mt-4 py-2.5 bg-gradient-to-r from-gold/10 to-gold/5 border border-gold/20 rounded-xl text-sm font-medium text-gold hover:from-gold/15 hover:to-gold/10 hover:border-gold/30 transition-all group"
            >
              <Maximize2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>צפה בדף המלא — מחשבון מימון, בדיקת נאותות ועוד</span>
            </a>

            {/* Divider */}
            <div
              className="h-px my-6"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(200,148,42,0.2) 20%, rgba(200,148,42,0.35) 50%, rgba(200,148,42,0.2) 80%, transparent)' }}
            />

            {/* Committee Status Timeline */}
            {plot.committees && (
              <CollapsibleSection
                number={`0${++sectionNum}`}
                icon={Award}
                title="סטטוס ועדות"
                animClass="animate-stagger-4"
                sectionId="section-committees"
              >
                <div className="space-y-0 mb-2">
                  {committeeLevels.map((level, i) => {
                    const committee = plot.committees[level.key]
                    const status = committee?.status || 'not_started'
                    const config = committeeStatusConfig[status] || committeeStatusConfig.not_started
                    const StatusIcon = config.icon
                    return (
                      <div key={level.key} className="flex items-start gap-3 relative">
                        {/* Connecting line */}
                        {i < committeeLevels.length - 1 && (
                          <div className="absolute right-[15px] top-8 w-0.5 h-8 bg-white/10" />
                        )}
                        {/* Circle indicator */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border flex-shrink-0 ${config.bg} ${config.border}`}>
                          {StatusIcon ? (
                            <StatusIcon className={`w-4 h-4 ${config.text}`} />
                          ) : (
                            <span className={`text-sm ${config.text}`}>—</span>
                          )}
                        </div>
                        {/* Label & status */}
                        <div className="pb-4">
                          <div className="font-medium text-slate-200 text-sm">{level.label}</div>
                          <div className={`text-xs ${config.text}`}>{config.label}</div>
                          {committee?.date && (
                            <div className="text-xs text-slate-500 mt-0.5">{committee.date}</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CollapsibleSection>
            )}

            {/* Standard 22 */}
            {standard22 && (
              <CollapsibleSection
                number={`0${++sectionNum}`}
                icon={Award}
                title="הערכת שמאי - תקן 22"
                animClass="animate-stagger-5"
              >
                <div className="bg-gradient-to-r from-gold/5 to-gold/10 border border-gold/20 rounded-2xl p-4 mb-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-slate-400">שמאי</div>
                      <div className="text-sm text-slate-200 font-medium">{standard22.appraiser}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">תאריך</div>
                      <div className="text-sm text-slate-200 font-medium">{standard22.date}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">שווי מוערך</div>
                      <div className="text-sm text-slate-200 font-medium">{formatCurrency(standard22.value)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">מתודולוגיה</div>
                      <div className="text-sm text-slate-200 font-medium">{standard22.methodology}</div>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* Financial Valuation Engine */}
            <CollapsibleSection
              number={`0${++sectionNum}`}
              icon={TrendingUp}
              title="נתונים פיננסיים"
              animClass="animate-stagger-6"
              sectionId="section-financial"
            >
              <div className="grid grid-cols-3 gap-3 mb-3">
                {/* Asked price */}
                <div className="rounded-2xl p-3 sm:p-4 flex flex-col items-center gap-1.5 sm:gap-2 text-center bg-gradient-to-b from-blue-500/15 to-blue-500/8 border border-blue-500/20 relative overflow-hidden card-lift">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600" />
                  <div className="text-[10px] text-slate-400">מחיר מבוקש</div>
                  <div className="text-base sm:text-lg font-bold leading-tight" style={{ color: '#60A5FA' }}><AnimatedNumber value={totalPrice} formatter={formatCurrency} /></div>
                  <div className="text-[10px] text-slate-500 hidden sm:block">{pricePerDunam} / דונם</div>
                </div>
                {/* Projected value */}
                <div className="rounded-2xl p-3 sm:p-4 flex flex-col items-center gap-1.5 sm:gap-2 text-center bg-gradient-to-b from-emerald-500/15 to-emerald-500/8 border border-emerald-500/20 relative overflow-hidden card-lift">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-600" />
                  <div className="text-[10px] text-slate-400">שווי צפוי</div>
                  <div className="text-base sm:text-lg font-bold leading-tight" style={{ color: '#6EE7A0' }}><AnimatedNumber value={projectedValue} formatter={formatCurrency} /></div>
                  <div className="text-[10px] text-slate-500 hidden sm:block">בסיום תהליך</div>
                </div>
                {/* ROI */}
                <div className="rounded-2xl p-3 sm:p-4 flex flex-col items-center gap-1.5 sm:gap-2 text-center bg-gradient-to-b from-gold/15 to-gold/8 border border-gold/20 relative overflow-hidden card-lift">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gold to-gold-bright" />
                  <div className="text-[10px] text-slate-400">תשואה צפויה</div>
                  <div className="text-base sm:text-lg font-bold leading-tight" style={{ color: '#E5B94E' }}><AnimatedNumber value={roi} />%</div>
                  <div className="text-[10px] text-slate-500 hidden sm:block">ROI</div>
                </div>
              </div>

              {/* CAGR — annualized return like professional investment platforms */}
              {(() => {
                const cagrData = calcCAGR(roi, readinessEstimate)
                if (!cagrData) return null
                const { cagr, years } = cagrData
                const cagrColor = cagr >= 20 ? '#22C55E' : cagr >= 12 ? '#84CC16' : cagr >= 6 ? '#EAB308' : '#EF4444'
                return (
                  <div className="bg-navy-light/40 border border-white/5 rounded-xl p-3 mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${cagrColor}15` }}>
                        <TrendingUp className="w-3.5 h-3.5" style={{ color: cagrColor }} />
                      </div>
                      <div>
                        <div className="text-xs text-slate-300">תשואה שנתית (CAGR)</div>
                        <div className="text-[10px] text-slate-500">על בסיס {years} שנות החזקה</div>
                      </div>
                    </div>
                    <div className="text-lg font-black" style={{ color: cagrColor }}>
                      {cagr}%
                    </div>
                  </div>
                )
              })()}

              {/* Buildable Value Analysis — price per buildable sqm, THE metric for pro investors.
                  Translates raw land cost into effective cost per buildable area using density data.
                  This is a key differentiator: neither Madlan nor Yad2 show this metric. */}
              {(() => {
                const buildable = calcBuildableValue(plot)
                if (!buildable) return null
                return (
                  <div className="bg-gradient-to-r from-purple-500/8 to-indigo-500/8 border border-purple-500/15 rounded-xl p-3 mb-3">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-6 h-6 rounded-lg bg-purple-500/15 flex items-center justify-center">
                        <Building2 className="w-3.5 h-3.5 text-purple-400" />
                      </div>
                      <span className="text-xs font-medium text-slate-200">ניתוח שווי בנייה</span>
                      <span className="text-[9px] text-purple-400/60 bg-purple-500/10 px-1.5 py-0.5 rounded mr-auto">PRO</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/[0.03] rounded-lg p-2 text-center">
                        <div className="text-[9px] text-slate-500 mb-0.5">מחיר/מ״ר בנוי</div>
                        <div className="text-sm font-bold text-purple-400">{formatCurrency(buildable.pricePerBuildableSqm)}</div>
                      </div>
                      <div className="bg-white/[0.03] rounded-lg p-2 text-center">
                        <div className="text-[9px] text-slate-500 mb-0.5">מחיר ליח׳ דיור</div>
                        <div className="text-sm font-bold text-indigo-400">{formatCurrency(buildable.pricePerUnit)}</div>
                      </div>
                      <div className="bg-white/[0.03] rounded-lg p-2 text-center">
                        <div className="text-[9px] text-slate-500 mb-0.5">יח׳ דיור משוערות</div>
                        <div className="text-sm font-bold text-slate-300">{buildable.estimatedUnits}</div>
                      </div>
                      <div className="bg-white/[0.03] rounded-lg p-2 text-center">
                        <div className="text-[9px] text-slate-500 mb-0.5">שטח בנוי כולל</div>
                        <div className="text-sm font-bold text-slate-300">{buildable.totalBuildableArea.toLocaleString()} מ״ר</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-[9px] text-slate-500">
                      <span>יחס ניצול: ×{buildable.efficiencyRatio}</span>
                      <span className="text-slate-700">·</span>
                      <span>על בסיס {buildable.density} יח״ד/דונם, 100 מ״ר ליח׳</span>
                    </div>
                  </div>
                )
              })()}

              {/* Tax Authority Value Comparison — like Madlan's "מחיר נמוך ממדלן" but vs government valuation.
                  Shows a visual gauge comparing asking price to the official tax authority assessment.
                  Israeli investors check this to verify they're not overpaying — it's a trust signal. */}
              {taxAuthorityValue > 0 && (
                <div className="bg-navy-light/40 border border-white/5 rounded-xl p-3 mt-3 mb-3">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center">
                      <Shield className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <span className="text-xs font-medium text-slate-200">שווי רשות המיסים</span>
                    {(() => {
                      const diffPct = Math.round(((totalPrice - taxAuthorityValue) / taxAuthorityValue) * 100)
                      const isBelow = diffPct < 0
                      return (
                        <span className={`text-[10px] font-bold mr-auto px-2 py-0.5 rounded-full ${
                          isBelow ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : diffPct <= 10 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {isBelow ? `${Math.abs(diffPct)}% מתחת` : `+${diffPct}% מעל`}
                        </span>
                      )
                    })()}
                  </div>
                  {/* Visual comparison bars */}
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-slate-400">מחיר מבוקש</span>
                        <span className="text-slate-300 font-medium">{formatCurrency(totalPrice)}</span>
                      </div>
                      <div className="relative h-2.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="absolute inset-y-0 right-0 rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(100, Math.max(10, (totalPrice / Math.max(totalPrice, taxAuthorityValue) * 100)))}%`,
                            background: totalPrice <= taxAuthorityValue
                              ? 'linear-gradient(90deg, #22C55E, #4ADE80)'
                              : 'linear-gradient(90deg, #F59E0B, #FB923C)',
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-slate-400">🏛️ הערכת רשות המיסים</span>
                        <span className="text-purple-400 font-medium">{formatCurrency(taxAuthorityValue)}</span>
                      </div>
                      <div className="relative h-2.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="absolute inset-y-0 right-0 rounded-full bg-purple-500/40 transition-all duration-700"
                          style={{
                            width: `${Math.min(100, Math.max(10, (taxAuthorityValue / Math.max(totalPrice, taxAuthorityValue) * 100)))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  {/* Verdict */}
                  {totalPrice < taxAuthorityValue && (
                    <div className="flex items-center gap-2 mt-2.5 p-2 rounded-lg bg-emerald-500/8 border border-emerald-500/15">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="text-[11px] text-emerald-400 font-medium">
                        מחיר אטרקטיבי! {formatCurrency(taxAuthorityValue - totalPrice)} מתחת לשומת רשות המיסים
                      </span>
                    </div>
                  )}
                  {totalPrice > taxAuthorityValue * 1.1 && (
                    <div className="flex items-center gap-2 mt-2.5 p-2 rounded-lg bg-amber-500/8 border border-amber-500/15">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span className="text-[11px] text-amber-400">
                        המחיר מעל הערכת רשות המיסים — מומלץ לבדוק עם שמאי
                      </span>
                    </div>
                  )}
                  <div className="text-[9px] text-slate-600 mt-2">
                    היטל השבחה משוער (50% מהשבחה): {bettermentLevy}
                  </div>
                </div>
              )}

              {/* Area Price Benchmark */}
              {(() => {
                // Dynamic average: compute from all plots in the same city, fallback to all plots
                const sameCityPlots = allPlots.filter(p => p.city === plot.city && p.id !== plot.id)
                const benchmarkPlots = sameCityPlots.length >= 2 ? sameCityPlots : allPlots.filter(p => p.id !== plot.id)
                const areaAvgPerSqm = benchmarkPlots.length > 0
                  ? Math.round(benchmarkPlots.reduce((sum, p) => {
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
                  <div className="bg-navy-light/40 border border-white/5 rounded-xl p-3 mt-3 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-3.5 h-3.5 text-gold" />
                      <span className="text-xs font-medium text-slate-200">השוואה למחיר אזורי</span>
                      <span className={`text-xs font-bold mr-auto ${isBelow ? 'text-green-400' : 'text-orange-400'}`}>
                        {isBelow ? `${Math.abs(diffPct)}% מתחת` : `${diffPct}% מעל`} הממוצע
                      </span>
                    </div>
                    <div className="relative h-3 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="absolute top-0 right-0 h-full rounded-full transition-all"
                        style={{
                          width: `${barPct}%`,
                          background: isBelow
                            ? 'linear-gradient(90deg, #22C55E, #4ADE80)'
                            : 'linear-gradient(90deg, #F59E0B, #FB923C)',
                        }}
                      />
                      {/* Area average marker */}
                      <div
                        className="absolute top-0 h-full w-0.5 bg-white/40"
                        style={{ right: `${avgBarPct}%` }}
                        title={`ממוצע אזורי: ₪${areaAvgPerSqm.toLocaleString()}/מ״ר`}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] text-slate-500">₪{plotPricePerSqm.toLocaleString()}/מ״ר (חלקה זו)</span>
                      <span className="text-[9px] text-slate-500">₪{areaAvgPerSqm.toLocaleString()}/מ״ר (ממוצע)</span>
                    </div>
                  </div>
                )
              })()}

              {/* Associated Costs */}
              {/* Price Trend Chart — like Madlan's area price trends */}
              <PriceTrendChart totalPrice={totalPrice} sizeSqM={sizeSqM} city={plot.city} plotId={plot.id} />

              {/* Investment Projection — forward-looking year-by-year value growth (S-curve model).
                  A key differentiator: Madlan/Yad2 show historical prices, we show the investor's FUTURE. */}
              <InvestmentProjection
                totalPrice={totalPrice}
                projectedValue={projectedValue}
                readinessEstimate={readinessEstimate}
                zoningStage={zoningStage}
              />

              {/* Alternative Investment Comparison — "What if you put this money elsewhere?"
                  No Israeli real estate platform shows this. Pro investors always weigh opportunity cost:
                  bank deposit vs TA-125 vs land. This makes the value proposition crystal clear. */}
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
                const maxProfit = Math.max(...options.map(o => o.profit))

                return (
                  <div className="bg-gradient-to-r from-navy-light/50 to-navy-light/40 border border-white/5 rounded-xl p-3 mb-3">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-lg bg-gold/15 flex items-center justify-center">
                        <BarChart3 className="w-3.5 h-3.5 text-gold" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-slate-200">השוואת אלטרנטיבות השקעה</span>
                        <span className="text-[9px] text-slate-500 block">מה אם היית משקיע {formatCurrency(totalInvestmentAlt)} אחרת? ({yearsAlt} שנים)</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {options.map((opt, i) => {
                        const barWidth = maxProfit > 0 ? Math.max(5, (opt.profit / maxProfit) * 100) : 5
                        const isWinner = opt.profit === maxProfit && options.filter(o => o.profit === maxProfit).length === 1
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[10px] w-[70px] flex-shrink-0 text-right" style={{ color: opt.color }}>
                              {opt.emoji} {opt.label}
                            </span>
                            <div className="flex-1 relative h-4 rounded-lg bg-white/[0.03] overflow-hidden">
                              <div
                                className="absolute top-0 right-0 h-full rounded-lg transition-all duration-700"
                                style={{
                                  width: `${barWidth}%`,
                                  background: `linear-gradient(90deg, ${opt.color}40, ${opt.color}20)`,
                                  borderRight: `2px solid ${opt.color}`,
                                }}
                              />
                              <span className="absolute inset-0 flex items-center justify-end pr-2 text-[9px] font-bold" style={{ color: opt.color }}>
                                {opt.profit >= 0 ? '+' : ''}{formatCurrency(opt.profit)}
                              </span>
                            </div>
                            {isWinner && <span className="text-[10px] flex-shrink-0" title="תשואה הגבוהה ביותר">🏆</span>}
                          </div>
                        )
                      })}
                    </div>
                    {comparison.realReturns && (
                      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/5 text-[9px] text-slate-500">
                        <span>תשואה ריאלית (אחרי אינפלציה {(comparison.inflationRate * 100).toFixed(0)}%):</span>
                        <span style={{ color: comparison.land.color }}>{comparison.realReturns.land}%/שנה</span>
                        <span className="w-px h-3 bg-white/10" />
                        <span style={{ color: comparison.stock.color }}>{comparison.realReturns.stock}%/שנה</span>
                        <span className="w-px h-3 bg-white/10" />
                        <span style={{ color: comparison.bank.color }}>{comparison.realReturns.bank}%/שנה</span>
                      </div>
                    )}
                  </div>
                )
              })()}

              <div className="bg-navy-light/40 border border-white/5 rounded-xl p-3 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-3.5 h-3.5 text-gold" />
                  <span className="text-xs font-medium text-slate-200">עלויות נלוות משוערות</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">מס רכישה (6%)</span>
                    <span className="text-slate-300">{formatCurrency(Math.round(totalPrice * 0.06))}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">שכ&quot;ט עו&quot;ד (~1.5%+מע&quot;מ)</span>
                    <span className="text-slate-300">{formatCurrency(Math.round(totalPrice * 0.0175))}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">היטל השבחה משוער</span>
                    <span className="text-slate-300">{bettermentLevy}</span>
                  </div>
                  <div className="h-px bg-white/5 my-1" />
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300">סה&quot;כ עלות כוללת (ללא היטל)</span>
                    <span className="text-gold">{formatCurrency(Math.round(totalPrice * 1.0775))}</span>
                  </div>
                </div>
              </div>
              {/* Quick Investment Summary — includes capital gains tax (מס שבח) */}
              {(() => {
                const grossProfit = projectedValue - totalPrice
                const purchaseTax = Math.round(totalPrice * 0.06)
                const attorneyFees = Math.round(totalPrice * 0.0175)
                const bettermentLevyAmount = Math.round(grossProfit * 0.5)
                const totalCosts = purchaseTax + attorneyFees
                const profitAfterBetterment = grossProfit - bettermentLevyAmount
                // Capital gains tax (מס שבח): 25% on real profit after deducting costs
                const taxableProfit = Math.max(0, profitAfterBetterment - totalCosts)
                const capitalGainsTax = Math.round(taxableProfit * 0.25)
                const netProfit = grossProfit - totalCosts - bettermentLevyAmount - capitalGainsTax
                const netRoi = totalPrice > 0 ? Math.round((netProfit / totalPrice) * 100) : 0
                const years = readinessEstimate?.includes('1-3') ? 2 : readinessEstimate?.includes('3-5') ? 4 : readinessEstimate?.includes('5+') ? 7 : 4
                const netCagr = years > 0 && netRoi > 0 ? Math.round((Math.pow(1 + netRoi / 100, 1 / years) - 1) * 100 * 10) / 10 : 0

                return (
                  <div className="bg-gradient-to-r from-gold/5 to-gold/10 border border-gold/20 rounded-xl p-3 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-3.5 h-3.5 text-gold" />
                      <span className="text-xs font-medium text-slate-200">סיכום השקעה מלא</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">רווח צפוי (ברוטו)</span>
                        <span className="text-emerald-400 font-medium">{formatCurrency(grossProfit)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">עלויות רכישה</span>
                        <span className="text-red-400/70">-{formatCurrency(totalCosts)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">היטל השבחה (50%)</span>
                        <span className="text-red-400/70">-{formatCurrency(bettermentLevyAmount)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">מס שבח (25%)</span>
                        <span className="text-red-400/70">-{formatCurrency(capitalGainsTax)}</span>
                      </div>
                      <div className="h-px bg-white/5 my-1" />
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-200">רווח נקי</span>
                        <span className={netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}>{formatCurrency(netProfit)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">תשואה נטו</span>
                        <span className={`font-medium ${netRoi >= 0 ? 'text-gold' : 'text-red-400'}`}>{netRoi}%</span>
                      </div>
                      {netCagr > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">CAGR נטו ({years} שנים)</span>
                          <span className="text-gold font-medium">{netCagr}%/שנה</span>
                        </div>
                      )}
                      {readinessEstimate && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">זמן החזר משוער</span>
                          <span className="text-gold font-medium">{readinessEstimate}</span>
                        </div>
                      )}
                    </div>

                    {/* Sensitivity Analysis — what if projected value changes? */}
                    <div className="mt-3 pt-3 border-t border-gold/10">
                      <div className="flex items-center gap-1.5 mb-2">
                        <AlertTriangle className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-medium text-slate-400">ניתוח רגישות</span>
                      </div>
                      <div className="space-y-1">
                        {[
                          { label: 'אופטימי (+10%)', factor: 1.1, color: 'text-emerald-400' },
                          { label: 'בסיס', factor: 1.0, color: 'text-gold' },
                          { label: 'שמרני (-10%)', factor: 0.9, color: 'text-orange-400' },
                          { label: 'פסימי (-20%)', factor: 0.8, color: 'text-red-400' },
                        ].map(scenario => {
                          const adjProjected = Math.round(projectedValue * scenario.factor)
                          const adjGross = adjProjected - totalPrice
                          const adjBetterment = Math.round(Math.max(0, adjGross) * 0.5)
                          const adjTaxable = Math.max(0, adjGross - adjBetterment - totalCosts)
                          const adjCapGains = Math.round(adjTaxable * 0.25)
                          const adjNet = adjGross - totalCosts - adjBetterment - adjCapGains
                          const adjNetRoi = totalPrice > 0 ? Math.round((adjNet / totalPrice) * 100) : 0
                          return (
                            <div key={scenario.label} className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-500 w-24">{scenario.label}</span>
                              <div className="flex-1 h-1.5 rounded-full bg-white/5 mx-2 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.max(3, Math.min(100, (adjNetRoi / (netRoi * 1.3 || 100)) * 100))}%`,
                                    background: adjNet >= 0
                                      ? 'linear-gradient(90deg, rgba(34,197,94,0.3), rgba(34,197,94,0.6))'
                                      : 'linear-gradient(90deg, rgba(239,68,68,0.3), rgba(239,68,68,0.6))',
                                  }}
                                />
                              </div>
                              <span className={`w-20 text-left font-medium ${scenario.color}`}>
                                {formatCurrency(adjNet)} ({adjNetRoi >= 0 ? '+' : ''}{adjNetRoi}%)
                              </span>
                            </div>
                          )
                        })}
                      </div>
                      <p className="text-[8px] text-slate-600 mt-1.5">* הערכות בלבד. מס שבח 25% על רווח לאחר ניכוי עלויות והיטל השבחה.</p>
                    </div>
                  </div>
                )
              })()}
              {/* Profitability Waterfall — visual breakdown of costs vs profit */}
              <ProfitWaterfall totalPrice={totalPrice} projectedValue={projectedValue} sizeSqM={sizeSqM} />
              {/* Mini Mortgage Calculator */}
              <MiniMortgageCalc totalPrice={totalPrice} />
              {/* Investment Benchmark — compare CAGR vs bank deposits, S&P 500, Israeli RE avg */}
              <InvestmentBenchmark
                totalPrice={totalPrice}
                projectedValue={projectedValue}
                readinessEstimate={readinessEstimate}
              />
            </CollapsibleSection>

            {/* ROI Stages - Appreciation Path */}
            <CollapsibleSection
              number={`0${++sectionNum}`}
              icon={BarChart3}
              title="צפי השבחה לפי שלבי תכנון"
              animClass="animate-stagger-7"
              sectionId="section-roi-stages"
            >
              <div className="bg-navy-light/40 border border-white/5 rounded-xl p-3 mb-2">
                <div className="space-y-1">
                  {roiStages.map((stage, i) => {
                    const isCurrentStage = i === currentStageIndex
                    const isPast = i < currentStageIndex
                    const maxPrice = roiStages[roiStages.length - 1].pricePerSqM
                    const barWidth = (stage.pricePerSqM / maxPrice) * 100
                    return (
                      <div key={i} className={`flex items-center gap-2 py-1 rounded-lg ${isCurrentStage ? 'bg-gold/5 -mx-1 px-1' : ''}`}>
                        <div className="w-[90px] flex-shrink-0">
                          <span className={`text-[10px] leading-tight ${isCurrentStage ? 'text-gold font-bold' : isPast ? 'text-green-400/70' : 'text-slate-500'}`}>
                            {stage.label}
                          </span>
                        </div>
                        <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${barWidth}%`,
                              background: isCurrentStage
                                ? 'linear-gradient(90deg, #C8942A, #E5B94E)'
                                : isPast
                                  ? 'rgba(34,197,94,0.4)'
                                  : 'rgba(148,163,184,0.15)',
                            }}
                          />
                        </div>
                        <span className={`text-[10px] w-14 text-left flex-shrink-0 ${isCurrentStage ? 'text-gold font-bold' : isPast ? 'text-green-400/70' : 'text-slate-500'}`}>
                          {stage.pricePerSqM.toLocaleString()}
                        </span>
                      </div>
                    )
                  })}
                  <div className="text-[9px] text-slate-500 text-left mt-1">* ש&quot;ח למ&quot;ר (הערכה ממוצעת)</div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Divider */}
            <div
              className="h-px my-6"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(200,148,42,0.2) 20%, rgba(200,148,42,0.35) 50%, rgba(200,148,42,0.2) 80%, transparent)' }}
            />

            {/* Zoning Pipeline */}
            <CollapsibleSection
              number={`0${++sectionNum}`}
              icon={MapPin}
              title="צינור תכנוני"
              animClass="animate-stagger-8"
              sectionId="section-zoning"
            >
              {readinessEstimate && (
                <div className="flex items-center gap-2 mb-4 bg-gradient-to-r from-gold/5 to-gold/10 border border-gold/20 rounded-xl px-4 py-2.5">
                  <Hourglass className="w-4 h-4 text-gold flex-shrink-0" />
                  <span className="text-sm text-slate-300">מוכנות לבנייה:</span>
                  <span className="text-sm font-bold text-gold">{readinessEstimate}</span>
                </div>
              )}

              {/* Investment Timeline — compact visual progress bar showing path to building permit.
                  Gives investors instant understanding of where this plot sits in the approval process,
                  how far it's come, and how long until potential profit. Like a project Gantt chart condensed
                  into a single glanceable widget. Madlan/Yad2 don't have this — pure differentiator. */}
              {(() => {
                const timeline = calcInvestmentTimeline(plot)
                if (!timeline || timeline.stages.length === 0) return null
                return (
                  <div className="bg-navy-light/40 border border-white/5 rounded-xl p-3 mb-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-gold" />
                        <span className="text-xs font-medium text-slate-200">ציר זמן השקעה</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {timeline.remainingMonths > 0 && (
                          <span className="text-[9px] text-slate-500">~{timeline.remainingMonths} חודשים נותרו</span>
                        )}
                        <span className="text-[10px] font-bold text-gold">{timeline.progressPct}%</span>
                      </div>
                    </div>

                    {/* Progress bar with stage markers */}
                    <div className="relative">
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.max(3, timeline.progressPct)}%`,
                            background: timeline.progressPct >= 75
                              ? 'linear-gradient(90deg, #22C55E, #4ADE80)'
                              : timeline.progressPct >= 40
                                ? 'linear-gradient(90deg, #C8942A, #E5B94E)'
                                : 'linear-gradient(90deg, #3B82F6, #60A5FA)',
                          }}
                        />
                      </div>

                      {/* Stage dots */}
                      <div className="flex justify-between mt-1.5">
                        {timeline.stages.map((stage, i) => {
                          const pct = timeline.stages.length > 1 ? (i / (timeline.stages.length - 1)) * 100 : 50
                          return (
                            <div
                              key={stage.key}
                              className="flex flex-col items-center"
                              style={{ width: `${100 / timeline.stages.length}%` }}
                              title={`${stage.label}${stage.status === 'completed' ? ' ✓' : stage.status === 'current' ? ' (נוכחי)' : ''}`}
                            >
                              <div
                                className={`w-2 h-2 rounded-full transition-all ${
                                  stage.status === 'completed'
                                    ? 'bg-green-400 shadow-sm shadow-green-400/40'
                                    : stage.status === 'current'
                                      ? 'bg-gold shadow-sm shadow-gold/40 ring-2 ring-gold/20'
                                      : 'bg-slate-700'
                                }`}
                              />
                              {/* Show abbreviated label for first, current, and last stages */}
                              {(i === 0 || stage.status === 'current' || i === timeline.stages.length - 1) && (
                                <span className={`text-[7px] mt-1 text-center leading-tight ${
                                  stage.status === 'current' ? 'text-gold font-bold' : 'text-slate-600'
                                }`}>
                                  {stage.icon}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Estimated completion */}
                    {timeline.estimatedYear && timeline.remainingMonths > 0 && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                        <span className="text-[9px] text-slate-500">סיום משוער</span>
                        <span className="text-[10px] font-medium text-gold">{timeline.estimatedYear}</span>
                      </div>
                    )}
                  </div>
                )
              })()}

              <div className="space-y-0 mb-2">
                {zoningPipelineStages.map((stage, i) => {
                  const isCompleted = i < currentStageIndex
                  const isCurrent = i === currentStageIndex
                  const isFuture = i > currentStageIndex

                  return (
                    <div
                      key={stage.key}
                      className={`flex items-center gap-3 py-2 transition ${
                        isFuture ? 'opacity-50' : 'opacity-100'
                      } ${isCurrent ? 'bg-gold/5 -mx-2 px-2 rounded-xl' : ''}`}
                    >
                      <span className="text-lg w-7 text-center flex-shrink-0">{stage.icon}</span>
                      <span
                        className={`text-sm ${
                          isCompleted
                            ? 'text-green-400'
                            : isCurrent
                              ? 'text-gold font-bold'
                              : 'text-slate-500'
                        }`}
                      >
                        {stage.label}
                      </span>
                      {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mr-auto" />}
                      {isCurrent && (
                        <span className="mr-auto text-[10px] text-gold bg-gold/10 px-2 py-0.5 rounded-full">נוכחי</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </CollapsibleSection>

            {/* Images */}
            {plot.plot_images && plot.plot_images.length > 0 && (
              <CollapsibleSection
                number={`0${++sectionNum}`}
                icon={ImageIcon}
                title="תמונות"
                sectionId="section-images"
              >
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {plot.plot_images.map((img, i) => (
                    <button
                      key={img.id || i}
                      onClick={() => { setLightboxIndex(i); setLightboxOpen(true) }}
                      className="aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-gold/40 transition-all group relative"
                    >
                      <img
                        src={img.url}
                        alt={img.alt || `תמונה ${i + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </button>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Documents — supports both API objects (plot_documents) and legacy string arrays (documents) */}
            {(() => {
              const docs = plot.plot_documents?.length ? plot.plot_documents : plot.documents?.length ? plot.documents : null
              if (!docs) return null
              return (
                <CollapsibleSection
                  number={`0${++sectionNum}`}
                  icon={FileText}
                  title="מסמכים ותוכניות"
                >
                  {isEnriching && !plot.plot_documents && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full bg-gold/30 animate-pulse" />
                      <span className="text-xs text-slate-500">טוען מסמכים...</span>
                    </div>
                  )}
                  <div className="space-y-2 mb-2">
                    {docs.map((doc, i) => {
                      // API format: { id, name, url, mime_type }
                      if (typeof doc === 'object' && doc.url) {
                        const DocIcon = getDocIcon(doc.mime_type)
                        return (
                          <a
                            key={doc.id || i}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 bg-navy-light/40 border border-white/5 rounded-xl px-4 py-2.5 hover:border-gold/20 transition-colors cursor-pointer group card-lift"
                          >
                            <DocIcon className="w-4 h-4 text-gold/60 group-hover:text-gold transition-colors flex-shrink-0" />
                            <span className="text-sm text-slate-300 group-hover:text-slate-200 transition-colors flex-1 truncate">
                              {doc.name || 'מסמך'}
                            </span>
                            <Download className="w-3.5 h-3.5 text-slate-500 group-hover:text-gold transition-colors flex-shrink-0" />
                          </a>
                        )
                      }
                      // Legacy format: plain string
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-3 bg-navy-light/40 border border-white/5 rounded-xl px-4 py-2.5 hover:border-gold/20 transition-colors cursor-pointer group card-lift"
                        >
                          <FileText className="w-4 h-4 text-gold/60 group-hover:text-gold transition-colors flex-shrink-0" />
                          <span className="text-sm text-slate-300 group-hover:text-slate-200 transition-colors">{doc}</span>
                        </div>
                      )
                    })}
                  </div>
                </CollapsibleSection>
              )
            })()}

            {/* Neighborhood Quality Score + Location & Risk Assessment */}
            {(distanceToSea != null || distanceToPark != null || distanceToHospital != null) && (
              <CollapsibleSection
                number={`0${++sectionNum}`}
                icon={Shield}
                title="מיקום, סביבה וסיכון"
                sectionId="section-quality"
              >
                {/* Location connectivity score + risk assessment — a key differentiator vs Madlan */}
                <LocationScore plot={plot} allPlots={allPlots} />
                <div className="h-px bg-white/5 my-4" />
                {/* Radar chart — visual quality overview */}
                <NeighborhoodRadar
                  distanceToSea={distanceToSea}
                  distanceToPark={distanceToPark}
                  distanceToHospital={distanceToHospital}
                  roi={roi}
                  investmentScore={calcInvestmentScore(plot)}
                />
              </CollapsibleSection>
            )}
            {/* Risk assessment fallback — show even without distance data */}
            {distanceToSea == null && distanceToPark == null && distanceToHospital == null && allPlots.length >= 2 && (
              <CollapsibleSection
                number={`0${++sectionNum}`}
                icon={Shield}
                title="הערכת סיכון"
                sectionId="section-quality"
              >
                <LocationScore plot={plot} allPlots={allPlots} />
              </CollapsibleSection>
            )}

            {/* What's Nearby — POI proximity section like Madlan's amenity indicators */}
            <div id="section-nearby-pois">
              <NearbyPoisSection plotId={plot.id} />
            </div>

            {/* Commute Times — driving estimates to major cities (like Madlan's connectivity indicator) */}
            {plot.coordinates && plot.coordinates.length >= 3 && (
              <CommuteTimesSection coordinates={plot.coordinates} />
            )}

            {/* Google Street View — lets investors see the actual terrain from street level.
                This is Madlan's killer feature — visual context beyond satellite imagery.
                Shows embedded 360° panorama at the plot's centroid coordinates. */}
            {plot.coordinates && plot.coordinates.length >= 3 && (() => {
              const center = plotCenter(plot.coordinates)
              if (!center) return null
              return (
                <CollapsibleSection
                  number="🛣️"
                  icon={Eye}
                  title="Street View — מבט מהקרקע"
                  sectionId="section-streetview"
                  defaultOpen={false}
                >
                  <StreetViewPanel lat={center.lat} lng={center.lng} />
                </CollapsibleSection>
              )
            })()}

            {/* Similar Plots */}
            <SimilarPlots currentPlot={plot} allPlots={allPlots} onSelectPlot={onSelectPlot} />

            {/* Due Diligence Checklist — like Madlan's buyer guides */}
            <div id="section-dd">
              <DueDiligenceChecklist plotId={plot.id} />
            </div>

            {/* Report Inaccuracy — trust-building pattern from Madlan (דיווח על שגיאה) */}
            <div className="mt-6 mb-2 pt-4 border-t border-white/5 flex items-center justify-between">
              <a
                href={`mailto:info@landmapisrael.com?subject=${encodeURIComponent(`דיווח על אי-דיוק — גוש ${blockNumber} חלקה ${plot.number}`)}&body=${encodeURIComponent(`שלום,\n\nמצאתי אי-דיוק בנתוני חלקה:\nגוש ${blockNumber} | חלקה ${plot.number} | ${plot.city}\n\nהפרט השגוי:\n\nהנתון הנכון:\n\nתודה`)}`}
                className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                title="דווח על מידע שגוי בחלקה זו"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>דיווח על אי-דיוק</span>
              </a>
              <span className="text-[9px] text-slate-600">
                עודכן {(() => {
                  const d = plot.updated_at ?? plot.updatedAt ?? plot.created_at ?? plot.createdAt
                  if (!d) return '—'
                  return new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })
                })()}
              </span>
            </div>
          </div>
        </div>

        {/* Scroll to top button */}
        {showScrollTop && (
          <button
            onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="absolute left-4 bottom-36 z-10 w-9 h-9 rounded-xl bg-navy-light/80 border border-white/10 hover:border-gold/30 hover:bg-navy-light transition-all flex items-center justify-center shadow-lg backdrop-blur-sm"
            title="חזור למעלה"
            aria-label="חזור למעלה"
          >
            <ChevronUp className="w-4 h-4 text-gold" />
          </button>
        )}

        {/* Quick Inquiry Templates — pre-built WhatsApp messages for common investor questions.
            Reduces friction from "interested" to "message sent" — like Madlan's "שאל שאלה".
            Placed above CTA for maximum visibility without obscuring the primary action. */}
        <div className="flex-shrink-0 px-4 pt-2 pb-0 border-t border-white/5 bg-navy/80 backdrop-blur-sm">
          <QuickInquiryTemplates plot={plot} />
        </div>

        {/* Sticky CTA footer */}
        <div className="sidebar-cta-footer">
          <div className="flex gap-2">
            <button
              onClick={onOpenLeadModal}
              className="cta-shimmer relative overflow-hidden flex-1 py-3.5 px-6 bg-gradient-to-r from-gold via-gold-bright to-gold rounded-2xl text-navy font-extrabold text-base shadow-lg shadow-gold/30 hover:shadow-xl hover:shadow-gold/40 hover:-translate-y-px transition-all duration-300"
              aria-label="צור קשר לפרטים מלאים על החלקה"
            >
              צור קשר לפרטים מלאים
            </button>
            <a
              href={plotInquiryLink(plot)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 w-12 py-3.5 flex items-center justify-center bg-[#25D366] rounded-2xl hover:bg-[#20BD5A] hover:-translate-y-px transition-all duration-300 shadow-lg shadow-[#25D366]/20"
              title="WhatsApp"
            >
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(`${window.location.origin}/plot/${plot.id}`)}&text=${encodeURIComponent(`🏗️ גוש ${blockNumber} חלקה ${plot.number} | ${plot.city}\n💰 ${formatCurrency(totalPrice)} · תשואה +${roi}%\n📐 ${formatDunam(sizeSqM)} דונם`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 w-12 py-3.5 flex items-center justify-center bg-[#0088cc] rounded-2xl hover:bg-[#0077b5] hover:-translate-y-px transition-all duration-300 shadow-lg shadow-[#0088cc]/20"
              title="שתף בטלגרם"
            >
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </a>
          </div>
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={handlePrintReport}
              data-action="print-report"
              className="flex-shrink-0 w-11 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-gold/20 transition-all"
              title="הדפס דו״ח השקעה (P)"
            >
              <Printer className="w-4 h-4 text-slate-400 hover:text-gold" />
            </button>
            <button
              onClick={() => {
                const summary = generatePlotSummary(plot)
                navigator.clipboard.writeText(summary).then(() => {
                  setSummaryCopied(true)
                  setTimeout(() => setSummaryCopied(false), 2500)
                }).catch(() => {})
              }}
              className={`flex-shrink-0 w-11 flex items-center justify-center border rounded-xl transition-all ${
                summaryCopied
                  ? 'bg-emerald-500/15 border-emerald-500/30'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-gold/20'
              }`}
              title="העתק סיכום השקעה (לשיתוף בוואטסאפ)"
            >
              {summaryCopied
                ? <Check className="w-4 h-4 text-emerald-400" />
                : <Clipboard className="w-4 h-4 text-slate-400 hover:text-gold" />
              }
            </button>
            <ShareMenu
              plotTitle={`גוש ${blockNumber} חלקה ${plot.number} - ${plot.city}`}
              plotPrice={formatCurrency(totalPrice)}
              plotUrl={`${window.location.origin}/?plot=${plot.id}`}
              className="flex-1"
            />
            {onToggleCompare && (
              <button
                onClick={() => onToggleCompare(plot.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm font-medium transition-colors ${
                  compareIds.includes(plot.id)
                    ? 'bg-purple-600/30 border-purple-500/50 text-purple-300'
                    : 'bg-purple-600/20 border-purple-500/30 text-purple-400 hover:bg-purple-600/30'
                }`}
              >
                <BarChart className="w-4 h-4" />
                {compareIds.includes(plot.id) ? 'בהשוואה ✓' : 'השווה'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {plot.plot_images && plot.plot_images.length > 0 && (
        <ImageLightbox
          images={plot.plot_images}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  )
}
