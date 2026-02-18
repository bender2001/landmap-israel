import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { X, MapPin, TrendingUp, Waves, TreePine, Hospital, Shield, CheckCircle2, BarChart3, FileText, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Award, DollarSign, AlertTriangle, Building2, Hourglass, Phone, MessageCircle, Share2, Copy, Check, Heart, BarChart, Image as ImageIcon, Download, File, FileImage, FileSpreadsheet, Printer, ExternalLink, Eye, Navigation, Clipboard, Maximize2 } from 'lucide-react'
import ShareMenu from './ui/ShareMenu'
import ImageLightbox from './ui/ImageLightbox'
import PriceTrendChart from './ui/PriceTrendChart'
import { useFocusTrap } from '../hooks/useFocusTrap'
import ProfitWaterfall from './ui/ProfitWaterfall'
import { statusColors, statusLabels, zoningLabels, zoningPipelineStages, roiStages } from '../utils/constants'
import { formatCurrency, formatDunam, calcInvestmentScore, getScoreLabel, calcCAGR, calcDaysOnMarket, calcMonthlyPayment, formatMonthlyPayment, calcInvestmentVerdict, calcRiskLevel, generatePlotSummary, calcDemandVelocity } from '../utils/formatters'
import AnimatedNumber from './ui/AnimatedNumber'
import NeighborhoodRadar from './ui/NeighborhoodRadar'
import InvestmentBenchmark from './ui/InvestmentBenchmark'
import PlotPercentileBadges from './ui/PlotPercentileBadges'
import { usePlot, useNearbyPlots, useSimilarPlots } from '../hooks/usePlots'
import MiniMap from './ui/MiniMap'
import DueDiligenceChecklist from './ui/DueDiligenceChecklist'
import LocationScore from './ui/LocationScore'
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

  useEffect(() => {
    if (isOpen && !hasBeenOpened) setHasBeenOpened(true)
  }, [isOpen, hasBeenOpened])

  useEffect(() => {
    if (!contentRef.current) return
    const target = isOpen ? `${contentRef.current.scrollHeight + 20}px` : '0px'
    if (target !== maxHeight) setMaxHeight(target)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={animClass} id={sectionId}>
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
        <div className="pb-2">{hasBeenOpened ? children : null}</div>
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
  const { currentIndex, total } = useMemo(() => {
    if (!currentPlot || !allPlots || allPlots.length < 2) return { currentIndex: -1, total: 0 }
    const idx = allPlots.findIndex(p => p.id === currentPlot.id)
    return { currentIndex: idx, total: allPlots.length }
  }, [currentPlot?.id, allPlots])

  if (total < 2 || currentIndex < 0) return null

  const goPrev = () => {
    const prevIdx = currentIndex > 0 ? currentIndex - 1 : total - 1
    onSelectPlot(allPlots[prevIdx])
  }
  const goNext = () => {
    const nextIdx = currentIndex < total - 1 ? currentIndex + 1 : 0
    onSelectPlot(allPlots[nextIdx])
  }

  return (
    <div className="flex items-center gap-2 px-5 py-2 border-b border-white/5 bg-navy-light/20">
      <button
        onClick={goNext}
        className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-gold/20 transition-all flex items-center justify-center"
        title="חלקה הבאה"
      >
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </button>
      <span className="text-[11px] text-slate-500 flex-1 text-center tabular-nums">
        {currentIndex + 1} / {total}
      </span>
      <button
        onClick={goPrev}
        className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-gold/20 transition-all flex items-center justify-center"
        title="חלקה קודמת"
      >
        <ChevronLeft className="w-4 h-4 text-slate-400" />
      </button>
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
      <div class="section">
        <h2>עלויות נלוות (הערכה)</h2>
        <div class="row"><span class="label">מס רכישה (6%)</span><span class="val">${formatCurrency(Math.round(price * 0.06))}</span></div>
        <div class="row"><span class="label">שכ״ט עו״ד (~1.75%)</span><span class="val">${formatCurrency(Math.round(price * 0.0175))}</span></div>
        <div class="row"><span class="label">היטל השבחה משוער</span><span class="val">${formatCurrency(Math.round((proj - price) * 0.5))}</span></div>
        <div class="row"><span class="label">סה״כ עלות כוללת</span><span class="val" style="color:#C8942A">${formatCurrency(Math.round(price * 1.0775))}</span></div>
        ${(() => {
          const gp = proj - price
          const costs = Math.round(price * 0.0775)
          const betterment = Math.round(gp * 0.5)
          const taxable = Math.max(0, gp - betterment - costs)
          const capGains = Math.round(taxable * 0.25)
          const net = gp - costs - betterment - capGains
          return `<div class="row"><span class="label">מס שבח (25%)</span><span class="val" style="color:#EF4444">-${formatCurrency(capGains)}</span></div>
        <div class="row"><span class="label">רווח נקי (אחרי כל המיסים)</span><span class="val" style="color:#22C55E">${formatCurrency(net)}</span></div>`
        })()}
      </div>
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
            <div className="h-36 relative overflow-hidden">
              <MiniMap
                coordinates={plot.coordinates}
                status={plot.status}
                city={plot.city}
                height="144px"
                className="rounded-none border-0"
                showStreetViewToggle
              />
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

          <div className="px-6 pb-6">
            {/* Total Investment Summary — the #1 thing investors want to see upfront */}
            {(() => {
              const purchaseTax = Math.round(totalPrice * 0.06)
              const attorneyFees = Math.round(totalPrice * 0.0175)
              const totalCashNeeded = totalPrice + purchaseTax + attorneyFees
              const grossProfit = projectedValue - totalPrice
              const bettermentLevyAmt = Math.round(grossProfit * 0.5)
              const costs = purchaseTax + attorneyFees
              const taxable = Math.max(0, grossProfit - bettermentLevyAmt - costs)
              const capGains = Math.round(taxable * 0.25)
              const netProfit = grossProfit - costs - bettermentLevyAmt - capGains
              const netRoi = totalPrice > 0 ? Math.round((netProfit / totalCashNeeded) * 100) : 0
              return (
                <div className="bg-gradient-to-r from-navy-light/60 to-navy-light/40 border border-gold/15 rounded-2xl p-4 mb-4 animate-stagger-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <div className="text-[10px] text-slate-500 mb-0.5">💰 סה״כ השקעה נדרשת</div>
                      <div className="text-lg font-black text-blue-400">{formatCurrency(totalCashNeeded)}</div>
                      <div className="text-[9px] text-slate-600">כולל מיסים ושכ״ט</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-slate-500 mb-0.5">✨ רווח נקי צפוי</div>
                      <div className={`text-lg font-black ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(netProfit)}</div>
                      <div className="text-[9px] text-slate-600">אחרי כל המיסים · {netRoi}% ROI נטו</div>
                    </div>
                  </div>
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

            {/* Distance chips */}
            <div className="flex flex-wrap gap-2.5 mt-3 animate-stagger-3">
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
            {plot.coordinates?.length >= 3 && (() => {
              const validCoords = plot.coordinates.filter(c => Array.isArray(c) && c.length >= 2 && isFinite(c[0]) && isFinite(c[1]))
              if (validCoords.length === 0) return null
              const lat = validCoords.reduce((s, c) => s + c[0], 0) / validCoords.length
              const lng = validCoords.reduce((s, c) => s + c[1], 0) / validCoords.length
              return (
                <div className="flex flex-wrap gap-2 mt-3 animate-stagger-3">
                  <a
                    href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`}
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
                    href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
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
                    href={`https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes`}
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
                href={`https://www.govmap.gov.il/?lat=${(() => { const vc = plot.coordinates?.filter(c => Array.isArray(c) && c.length >= 2); return vc && vc.length > 0 ? (vc.reduce((s,c)=>s+c[0],0)/vc.length).toFixed(5) : '32.45' })()}&lon=${(() => { const vc = plot.coordinates?.filter(c => Array.isArray(c) && c.length >= 2); return vc && vc.length > 0 ? (vc.reduce((s,c)=>s+c[1],0)/vc.length).toFixed(5) : '34.87' })()}&z=15`}
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

              {/* Tax authority comparison */}
              {taxAuthorityValue && (
                <div className="bg-navy-light/40 border border-white/5 rounded-xl p-3 mt-3 mb-3">
                  <div className="text-xs text-slate-300">
                    שווי רשות המיסים: {formatCurrency(taxAuthorityValue)}
                  </div>
                  {totalPrice < taxAuthorityValue && (
                    <div className="text-xs text-green-400 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      מחיר אטרקטיבי! מתחת לשווי רשות המיסים
                    </div>
                  )}
                  <div className="text-xs text-slate-400 mt-1">
                    היטל השבחה משוער: {bettermentLevy}
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

        {/* Sticky CTA footer */}
        <div className="sidebar-cta-footer">
          <div className="flex gap-2">
            <button
              onClick={onOpenLeadModal}
              className="cta-shimmer relative overflow-hidden flex-1 py-3.5 px-6 bg-gradient-to-r from-gold via-gold-bright to-gold rounded-2xl text-navy font-extrabold text-base shadow-lg shadow-gold/30 hover:shadow-xl hover:shadow-gold/40 hover:-translate-y-px transition-all duration-300"
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
