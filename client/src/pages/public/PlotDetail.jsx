import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react'
import { ArrowRight, ArrowUp, MapPin, TrendingUp, Clock, Waves, TreePine, Hospital, CheckCircle2, DollarSign, Hourglass, Heart, Share2, MessageCircle, Printer, Copy, Check, GitCompareArrows, BarChart, ExternalLink, Calculator as CalcIcon, FileText, Download, File, FileImage, FileSpreadsheet, Map as MapIcon } from 'lucide-react'
import { usePlot, useNearbyPlots, useSimilarPlots } from '../../hooks/usePlots.js'
import { useMarketOverview } from '../../hooks/useMarketOverview.js'
import { useLastVisitPrice } from '../../hooks/useLastVisitPrice.js'
import { calcAnnualHoldingCosts, calcExitCosts, calcTransactionCosts } from '../../utils/plot.js'
import { useFavorites } from '../../hooks/useFavorites.js'
import { useViewTracker } from '../../hooks/useViewTracker.js'
import { useLocalStorage } from '../../hooks/useLocalStorage.js'
import PublicNav from '../../components/PublicNav.jsx'
import PublicFooter from '../../components/PublicFooter.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { statusColors, statusLabels, zoningLabels, zoningPipelineStages, roiStages } from '../../utils/constants.js'
import { formatCurrency, formatDunam, formatPriceShort, calcInvestmentScore, getScoreLabel, formatRelativeTime, getFreshnessColor, calcCAGR, calcInvestmentVerdict, calcDaysOnMarket, calcInvestmentTimeline } from '../../utils/formatters.js'
import MiniMap from '../../components/ui/MiniMap.jsx'
import Breadcrumb from '../../components/ui/Breadcrumb.jsx'
import { plotInquiryLink } from '../../utils/config.js'
import ZoningProgressBar from '../../components/ui/ZoningProgressBar.jsx'
import WidgetErrorBoundary from '../../components/ui/WidgetErrorBoundary.jsx'

// ─── Lazy-loaded below-fold components ────────────────────────────────
// Same pattern as SidebarDetails.jsx — defer heavy widgets until needed.
// Cuts PlotDetail initial JS chunk by ~25-30KB, improving Time to Interactive
// on slower connections (3G) and mobile devices.
const LeadModal = lazy(() => import('../../components/LeadModal.jsx'))
const ShareMenu = lazy(() => import('../../components/ui/ShareMenu.jsx'))
const ImageLightbox = lazy(() => import('../../components/ui/ImageLightbox.jsx'))
const NeighborhoodRadar = lazy(() => import('../../components/ui/NeighborhoodRadar.jsx'))
const PriceTrendChart = lazy(() => import('../../components/ui/PriceTrendChart.jsx'))
const InvestmentBenchmark = lazy(() => import('../../components/ui/InvestmentBenchmark.jsx'))
const InvestmentProjection = lazy(() => import('../../components/ui/InvestmentProjection.jsx'))
const DueDiligenceChecklist = lazy(() => import('../../components/ui/DueDiligenceChecklist.jsx'))
const MobilePlotActionBar = lazy(() => import('../../components/ui/MobilePlotActionBar.jsx'))
const QuickInquiryTemplates = lazy(() => import('../../components/ui/QuickInquiryTemplates.jsx'))
const BackToTopButton = lazy(() => import('../../components/ui/BackToTopButton.jsx'))
const DataDisclaimer = lazy(() => import('../../components/DataDisclaimer.jsx'))

// Eagerly imported — tiny component, used in the header area above the fold
import DataCompletenessBar from '../../components/ui/DataCompletenessBar.jsx'

// ─── Eager preloading of below-fold chunks ────────────────────────────
// Unlike SidebarDetails (which may not open at all), PlotDetail always renders
// these sections. We preload them immediately after first paint using requestIdleCallback
// so they're ready by the time the user scrolls down. Same pattern as Next.js prefetch.
const chunkPreloaders = [
  () => import('../../components/ui/PriceTrendChart.jsx'),
  () => import('../../components/ui/InvestmentProjection.jsx'),
  () => import('../../components/ui/NeighborhoodRadar.jsx'),
  () => import('../../components/ui/InvestmentBenchmark.jsx'),
  () => import('../../components/ui/DueDiligenceChecklist.jsx'),
  () => import('../../components/ui/ShareMenu.jsx'),
  () => import('../../components/LeadModal.jsx'),
]
let _chunksPreloaded = false
function preloadPlotDetailChunks() {
  if (_chunksPreloaded) return
  _chunksPreloaded = true
  // Use requestIdleCallback to preload during browser idle time — avoids competing
  // with critical rendering. Falls back to setTimeout for Safari/Firefox.
  const schedule = typeof requestIdleCallback === 'function'
    ? requestIdleCallback
    : (fn) => setTimeout(fn, 200)
  schedule(() => {
    chunkPreloaders.forEach(loader => loader().catch(() => {}))
  })
}

/** Lightweight section placeholder for lazy-loaded widgets below the fold */
function SectionSkeleton({ height = 'h-32' }) {
  return (
    <div className={`${height} rounded-2xl bg-navy-light/40 border border-white/5 animate-pulse relative overflow-hidden`}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
      </div>
    </div>
  )
}

function JsonLdSchema({ plot }) {
  const blockNum = plot.block_number ?? plot.blockNumber
  const price = plot.total_price ?? plot.totalPrice
  const sizeSqM = plot.size_sqm ?? plot.sizeSqM

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `גוש ${blockNum} חלקה ${plot.number} - ${plot.city}`,
    description: plot.description || `קרקע להשקעה ב${plot.city}, שטח ${formatDunam(sizeSqM)} דונם`,
    url: window.location.href,
    offers: {
      '@type': 'Offer',
      price: price,
      priceCurrency: 'ILS',
      availability: plot.status === 'AVAILABLE'
        ? 'https://schema.org/InStock'
        : plot.status === 'SOLD'
          ? 'https://schema.org/SoldOut'
          : 'https://schema.org/PreOrder',
    },
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'שטח (מ"ר)', value: sizeSqM },
      { '@type': 'PropertyValue', name: 'עיר', value: plot.city },
      { '@type': 'PropertyValue', name: 'גוש', value: blockNum },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

function BreadcrumbSchema({ plot }) {
  const blockNum = plot.block_number ?? plot.blockNumber
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'מפת קרקעות', item: window.location.origin },
      { '@type': 'ListItem', position: 2, name: plot.city, item: `${window.location.origin}/?city=${plot.city}` },
      { '@type': 'ListItem', position: 3, name: `גוש ${blockNum} חלקה ${plot.number}` },
    ],
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * FAQ structured data — answers common investor questions about this specific plot.
 * Google shows these as expandable FAQ snippets in search results, dramatically improving
 * click-through rates for "גוש X חלקה Y" queries. Like Madlan's rich snippets strategy.
 */
function PlotFaqSchema({ plot }) {
  const blockNum = plot.block_number ?? plot.blockNumber
  const price = plot.total_price ?? plot.totalPrice
  const sizeSqM = plot.size_sqm ?? plot.sizeSqM
  const projected = plot.projected_value ?? plot.projectedValue
  const roi = price > 0 ? Math.round(((projected - price) / price) * 100) : 0
  const readiness = plot.readiness_estimate ?? plot.readinessEstimate
  const zoning = plot.zoning_stage ?? plot.zoningStage

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `מה המחיר של גוש ${blockNum} חלקה ${plot.number} ב${plot.city}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `המחיר המבוקש לחלקה הוא ₪${price.toLocaleString()} (₪${sizeSqM > 0 ? Math.round(price / sizeSqM).toLocaleString() : '—'} למ״ר). שטח החלקה: ${sizeSqM > 0 ? (sizeSqM / 1000).toFixed(1) : '—'} דונם.`,
        },
      },
      {
        '@type': 'Question',
        name: `מה התשואה הצפויה של גוש ${blockNum} חלקה ${plot.number}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `התשואה הצפויה היא +${roi}%. שווי צפוי לאחר השבחה: ₪${projected.toLocaleString()}.${readiness ? ` זמן משוער: ${readiness}.` : ''}`,
        },
      },
      {
        '@type': 'Question',
        name: `מה שלב התכנון של גוש ${blockNum} חלקה ${plot.number}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `החלקה נמצאת בשלב: ${zoningLabels[zoning] || zoning}.${readiness ? ` מוכנות משוערת לבנייה: ${readiness}.` : ''} סטטוס: ${statusLabels[plot.status] || plot.status}.`,
        },
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * Similar plots section — uses server-side geo-proximity API instead of loading ALL plots.
 * This eliminates an unnecessary full-dataset fetch on the detail page, cutting the initial
 * API payload by ~90% (one lightweight nearby query vs the entire plots table).
 */
function PlotCard({ p }) {
  const bn = p.block_number ?? p.blockNumber
  const price = p.total_price ?? p.totalPrice
  const projValue = p.projected_value ?? p.projectedValue
  const sizeSqM = p.size_sqm ?? p.sizeSqM
  const roi = price > 0 ? Math.round((projValue - price) / price * 100) : 0
  const color = statusColors[p.status]
  const distLabel = p.distance_km != null
    ? p.distance_km < 1 ? `${Math.round(p.distance_km * 1000)}מ׳` : `${p.distance_km} ק״מ`
    : null
  return (
    <Link
      to={`/plot/${p.id}`}
      className="bg-navy-light/40 border border-white/5 rounded-2xl p-4 hover:border-gold/20 transition-all group"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: color }} />
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-200 truncate">גוש {bn} | חלקה {p.number}</div>
          <div className="text-xs text-slate-500">
            {p.city} · {formatDunam(sizeSqM)} דונם
            {distLabel && <span className="text-blue-400"> · {distLabel}</span>}
          </div>
        </div>
      </div>
      {/* Match reason tags (from similar endpoint) */}
      {p._matchReasons && p._matchReasons.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {p._matchReasons.slice(0, 2).map((reason, i) => (
            <span key={i} className="text-[9px] text-gold/70 bg-gold/8 px-1.5 py-0.5 rounded">{reason}</span>
          ))}
        </div>
      )}
      <div className="flex justify-between items-end">
        <div className="text-sm font-bold text-gold">{formatPriceShort(price)}</div>
        <div className="text-xs font-bold text-emerald-400">+{roi}%</div>
      </div>
      <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, Math.max(8, (price / (projValue || 1)) * 100))}%`,
            background: 'linear-gradient(90deg, #3B82F6, #60A5FA)',
          }}
        />
      </div>
    </Link>
  )
}

function SimilarPlotsSection({ plotId, onNearbyLoaded }) {
  const { data: similar = [], isLoading: simLoading } = useSimilarPlots(plotId)
  const { data: nearby = [], isLoading: nearLoading } = useNearbyPlots(plotId)

  // Lift nearby plots to parent for investment verdict area benchmark
  useEffect(() => {
    const combined = [...(nearby || []), ...(similar || [])]
    if (combined.length > 0 && onNearbyLoaded) onNearbyLoaded(combined)
  }, [nearby, similar, onNearbyLoaded])

  // Deduplicate: remove plots that appear in both lists
  const nearbyFiltered = useMemo(() => {
    if (!nearby || nearby.length === 0) return []
    const simIds = new Set((similar || []).map(p => p.id))
    return nearby.filter(p => !simIds.has(p.id)).slice(0, 4)
  }, [nearby, similar])

  const hasSimilar = similar && similar.length > 0
  const hasNearby = nearbyFiltered.length > 0
  const isLoading = simLoading && nearLoading

  if (isLoading || (!hasSimilar && !hasNearby)) return null

  return (
    <div className="space-y-8 mb-8">
      {/* Similar by investment characteristics */}
      {hasSimilar && (
        <div>
          <h2 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center text-sm">🎯</span>
            חלקות דומות
            <span className="text-xs text-slate-500 font-normal">מחיר, שלב תכנוני ותשואה</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 plot-similar-grid">
            {similar.map(p => <PlotCard key={p.id} p={p} />)}
          </div>
        </div>
      )}

      {/* Nearby by geography */}
      {hasNearby && (
        <div>
          <h2 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center text-sm">📍</span>
            חלקות בסביבה
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 plot-similar-grid">
            {nearbyFiltered.map(p => <PlotCard key={p.id} p={p} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function getDocIcon(mimeType) {
  if (!mimeType) return File
  if (mimeType.startsWith('image/')) return FileImage
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return FileSpreadsheet
  return FileText
}

/**
 * SectionNav — horizontal scroll-spy navigation for quick-jumping between PlotDetail sections.
 * Like Madlan's property page section anchors and Google's "jump to" links.
 * Uses IntersectionObserver to highlight the active section as the user scrolls.
 * Sticky below the reading progress bar for always-visible navigation.
 */
const SECTION_ANCHORS = [
  { id: 'section-financial', label: 'פיננסי', emoji: '💰' },
  { id: 'section-location', label: 'מיקום', emoji: '📍' },
  { id: 'section-projection', label: 'תחזית', emoji: '📈' },
  { id: 'section-timeline', label: 'ציר זמן', emoji: '⏳' },
  { id: 'section-planning', label: 'תכנון', emoji: '📋' },
  { id: 'section-costs', label: 'עלויות', emoji: '🧾' },
  { id: 'section-documents', label: 'מסמכים', emoji: '📄' },
  { id: 'section-similar', label: 'דומות', emoji: '🎯' },
]

function SectionNav() {
  const [activeId, setActiveId] = useState('')
  const [visible, setVisible] = useState(false)

  // Show only after scrolling past hero section
  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 300)
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Intersection Observer — track which section is in view
  useEffect(() => {
    const elements = SECTION_ANCHORS
      .map(a => document.getElementById(a.id))
      .filter(Boolean)
    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the first intersecting entry with highest intersection ratio
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: '-80px 0px -40% 0px', threshold: [0, 0.25, 0.5] }
    )

    elements.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const handleClick = useCallback((id) => {
    const el = document.getElementById(id)
    if (!el) return
    const y = el.getBoundingClientRect().top + window.scrollY - 100 // offset for sticky nav
    window.scrollTo({ top: y, behavior: 'smooth' })
    // Update URL hash for deep-link shareability — enables "share this section" by copying the URL.
    // Uses replaceState to avoid polluting browser history with every section click.
    const shortHash = id.replace('section-', '')
    window.history.replaceState(null, '', `#${shortHash}`)
  }, [])

  if (!visible) return null

  // Only show pills for sections that actually exist on the page
  const existingAnchors = SECTION_ANCHORS.filter(a => document.getElementById(a.id))
  if (existingAnchors.length < 2) return null

  return (
    <div
      className="fixed top-[4.25rem] left-0 right-0 z-[54] transition-all duration-300"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-8px)',
        willChange: 'transform, opacity', // GPU compositing — prevents repaint jank during scroll-driven visibility
      }}
    >
      <div className="bg-navy/85 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div
            className="flex items-center gap-1 py-1.5 overflow-x-auto scrollbar-none"
            dir="rtl"
            role="navigation"
            aria-label="קפיצה לסעיף"
          >
            {existingAnchors.map(anchor => (
              <button
                key={anchor.id}
                onClick={() => handleClick(anchor.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                  activeId === anchor.id
                    ? 'bg-gold/15 text-gold border-gold/25 shadow-sm shadow-gold/10'
                    : 'bg-white/[0.02] text-slate-500 border-transparent hover:bg-white/[0.05] hover:text-slate-300'
                }`}
                aria-current={activeId === anchor.id ? 'true' : undefined}
              >
                <span className="text-[10px]">{anchor.emoji}</span>
                <span>{anchor.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * StickyPlotInfoBar — compact floating header that appears when the user scrolls past
 * the hero section. Shows block/parcel, city, price, ROI badge, and a WhatsApp CTA.
 * Like Madlan's sticky header on property detail pages — keeps key info visible during
 * deep-dive scrolling through financial analysis, projections, and documents.
 * Neither Yad2 nor most Israeli RE platforms have this; it's a Google-tier UX pattern
 * used by Zillow, Redfin, and Rightmove for long property pages.
 */
function StickyPlotInfoBar({ plot, computed }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 280)
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [])

  if (!visible || !plot || !computed) return null

  const { blockNumber, totalPrice, roi } = computed
  const statusColor = statusColors[plot.status]

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[56] transition-all duration-300"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        pointerEvents: visible ? 'auto' : 'none',
        willChange: 'transform, opacity', // GPU compositing hint — avoids jank on scroll-driven show/hide
      }}
      dir="rtl"
    >
      <div className="bg-navy/92 backdrop-blur-xl border-b border-white/8 shadow-lg shadow-black/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
          {/* Left: plot identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: statusColor }} />
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-100 truncate">
                גוש {blockNumber} | חלקה {plot.number}
              </div>
              <div className="text-[10px] text-slate-500 truncate">{plot.city}</div>
            </div>
          </div>

          {/* Center: price + ROI */}
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-sm font-bold text-gold">{formatPriceShort(totalPrice)}</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
              roi >= 100 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
              : roi >= 50 ? 'bg-gold/15 text-gold border border-gold/20'
              : 'bg-white/5 text-slate-400 border border-white/10'
            }`}>
              +{roi}% ROI
            </span>
            <span
              className="px-2 py-0.5 rounded-md text-[10px] font-medium border"
              style={{ background: `${statusColor}12`, borderColor: `${statusColor}25`, color: statusColor }}
            >
              {statusLabels[plot.status]}
            </span>
          </div>

          {/* Right: CTAs */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* View on Interactive Map — critical for SEO-landed users who arrived
                from Google and want to see spatial context, nearby plots, and filters.
                Like Madlan's "הצג במפה" on property pages — the #1 navigation path
                from detail back to discovery. */}
            <Link
              to={`/?plot=${plot.id}&city=${encodeURIComponent(plot.city)}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/15 border border-gold/25 rounded-lg text-gold text-xs font-bold hover:bg-gold/25 transition-colors"
              title="הצג במפה האינטראקטיבית"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">במפה</span>
            </Link>
            <a
              href={plotInquiryLink(plot)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] rounded-lg text-white text-xs font-bold hover:bg-[#20BD5A] transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Reading progress bar — thin gold bar at the top of the viewport that fills as the user scrolls.
 * Standard UX pattern on content-heavy pages (Medium, Madlan property pages, news sites).
 * Helps users gauge how far they are in the long plot detail page.
 */
function ReadingProgressBar() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const handler = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight <= 0) return
      setProgress(Math.min(100, Math.round((scrollTop / docHeight) * 100)))
    }
    window.addEventListener('scroll', handler, { passive: true })
    handler() // initial
    return () => window.removeEventListener('scroll', handler)
  }, [])

  if (progress <= 0) return null

  return (
    <div className="fixed top-16 left-0 right-0 z-[55] h-[2px] bg-white/5" aria-hidden="true">
      <div
        className="h-full bg-gradient-to-r from-gold via-gold-bright to-gold transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

function MortgageCalcSection({ totalPrice }) {
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
    <div className="bg-navy-light/40 border border-white/5 rounded-2xl p-5" role="group" aria-labelledby="mortgage-calc-heading">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-4 h-4 text-gold" />
        <h2 id="mortgage-calc-heading" className="text-base font-bold text-slate-100">מחשבון מימון</h2>
      </div>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <label htmlFor="mortgage-equity">הון עצמי</label>
            <span className="text-gold font-medium">{equity}% ({formatCurrency(Math.round(totalPrice * equity / 100))})</span>
          </div>
          <input type="range" id="mortgage-equity" min="20" max="100" step="5" value={equity}
            onChange={(e) => setEquity(Number(e.target.value))}
            aria-label="אחוז הון עצמי"
            aria-valuemin={20} aria-valuemax={100} aria-valuenow={equity}
            aria-valuetext={`${equity}% הון עצמי, ${formatCurrency(Math.round(totalPrice * equity / 100))}`}
            className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-gold cursor-pointer" />
        </div>
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <label htmlFor="mortgage-years">תקופה</label>
            <span className="text-slate-300 font-medium">{years} שנים</span>
          </div>
          <input type="range" id="mortgage-years" min="5" max="30" step="1" value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            aria-label="תקופת הלוואה בשנים"
            aria-valuemin={5} aria-valuemax={30} aria-valuenow={years}
            aria-valuetext={`${years} שנים`}
            className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-gold cursor-pointer" />
        </div>
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <label htmlFor="mortgage-rate">ריבית</label>
            <span className="text-slate-300 font-medium">{rate}%</span>
          </div>
          <input type="range" id="mortgage-rate" min="2" max="8" step="0.25" value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            aria-label="אחוז ריבית שנתי"
            aria-valuemin={2} aria-valuemax={8} aria-valuenow={rate}
            aria-valuetext={`ריבית ${rate} אחוז`}
            className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-gold cursor-pointer" />
        </div>
        {equity < 100 && (
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/5" role="status" aria-live="polite" aria-atomic="true">
            <div className="text-center">
              <div className="text-xs text-slate-500">החזר חודשי</div>
              <div className="text-sm font-bold text-gold">{formatCurrency(monthlyPayment)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-500">סה״כ ריבית</div>
              <div className="text-sm font-bold text-orange-400">{formatCurrency(totalInterest)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-500">סה״כ תשלום</div>
              <div className="text-sm font-bold text-slate-300">{formatCurrency(totalPayment)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PlotDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: plot, isLoading, error } = usePlot(id)
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const favorites = useFavorites()
  const { trackView } = useViewTracker()

  // Compare state (localStorage-backed via useLocalStorage, cross-tab sync with MapView)
  const [compareIds, setCompareIds] = useLocalStorage('landmap_compare', [])
  const toggleCompare = useCallback((plotId) => {
    setCompareIds((prev) =>
      prev.includes(plotId) ? prev.filter((id) => id !== plotId) : prev.length < 3 ? [...prev, plotId] : prev
    )
  }, [])

  // Market overview for below-market indicator (like Madlan's "מחיר נמוך ממדלן")
  const { data: marketData } = useMarketOverview()

  // Nearby plots for investment verdict area benchmark — populated by SimilarPlotsSection
  const [nearbyPlots, setNearbyPlots] = useState([])
  const handleNearbyLoaded = useCallback((plots) => setNearbyPlots(plots), [])

  // Scroll to top on mount / route change — prevents stale scroll position from MapView.
  // If a hash fragment is present (e.g., /plot/123#costs → section-costs), auto-scroll
  // to that section after a short delay for the DOM to render. Like Madlan's deep-link
  // support for property page sections — enables sharing "look at the costs" links.
  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash) {
      // Map short hash names to full section IDs for convenience:
      // /plot/123#costs → section-costs, /plot/123#financial → section-financial
      const sectionId = hash.startsWith('section-') ? hash : `section-${hash}`
      // Delay to let React render sections (lazy-loaded via Suspense)
      const timer = setTimeout(() => {
        const el = document.getElementById(sectionId)
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 100
          window.scrollTo({ top: y, behavior: 'smooth' })
        }
      }, 600)
      return () => clearTimeout(timer)
    } else {
      window.scrollTo(0, 0)
    }
    // Start preloading lazy widget chunks during idle time — they'll be needed shortly
    preloadPlotDetailChunks()
  }, [id])

  // Track view on mount (fire-and-forget, deduped by plotId)
  useEffect(() => {
    if (id) trackView(id)
  }, [id, trackView])

  // Canonical link for SEO (like Madlan — each plot has a unique canonical URL)
  useEffect(() => {
    const canonical = document.querySelector('link[rel="canonical"]') || (() => {
      const el = document.createElement('link')
      el.setAttribute('rel', 'canonical')
      document.head.appendChild(el)
      return el
    })()
    canonical.href = `${window.location.origin}/plot/${id}`
    return () => canonical.remove()
  }, [id])

  // Scroll-to-top visibility
  useEffect(() => {
    const handler = () => setShowScrollTop(window.scrollY > 400)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }).catch(() => {})
  }, [])

  /**
   * Copy a rich investment summary card to clipboard — formatted for WhatsApp/email sharing.
   * Investors frequently share plot details with partners, attorneys, and accountants.
   * A structured text card with emoji formatting is more impactful than a plain URL.
   * Like sharing a Bloomberg terminal snapshot — all key metrics in one copy-paste.
   */
  const handleCopyInvestmentCard = useCallback(() => {
    if (!plot || !computed) return
    const { totalPrice, projectedValue, sizeSqM, blockNumber, roi, readiness, zoningStage } = computed
    const score = calcInvestmentScore(plot)
    const { label: scoreLabel } = getScoreLabel(score)
    const cagrData = calcCAGR(roi, readiness)
    const dunam = (sizeSqM / 1000).toFixed(1)
    const priceSqm = sizeSqM > 0 ? Math.round(totalPrice / sizeSqM) : 0

    const card = [
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `🏗️ *גוש ${blockNumber} | חלקה ${plot.number}*`,
      `📍 ${plot.city}`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `💰 מחיר: ${formatCurrency(totalPrice)}`,
      `📐 שטח: ${dunam} דונם (${sizeSqM.toLocaleString()} מ״ר)`,
      `💵 מחיר/מ״ר: ${formatCurrency(priceSqm)}`,
      ``,
      `📈 תשואה צפויה: *+${roi}%*`,
      `🎯 שווי צפוי: ${formatCurrency(projectedValue)}`,
      cagrData ? `📊 CAGR: ${cagrData.cagr}%/שנה (${cagrData.years} שנים)` : null,
      ``,
      `🏷️ סטטוס: ${statusLabels[plot.status] || plot.status}`,
      `📋 ייעוד: ${zoningLabels[zoningStage] || zoningStage}`,
      readiness ? `⏳ מוכנות: ${readiness}` : null,
      `⭐ ציון השקעה: ${score}/10 (${scoreLabel})`,
      ``,
      `🔗 ${window.location.href}`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `LandMap Israel 🗺️`,
    ].filter(Boolean).join('\n')

    navigator.clipboard.writeText(card).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    }).catch(() => {})
  }, [plot, computed])

  /**
   * Print investment report — generates a clean, professional PDF-ready document.
   * Like Madlan's "הפק דו״ח" — essential for agents and investors sharing with lawyers/accountants.
   */
  const handlePrintReport = useCallback(() => {
    if (!plot || !computed) return
    const { totalPrice, projectedValue, sizeSqM, blockNumber, roi, readiness, zoningStage } = computed
    const areaCtx = plot.area_context ?? plot.areaContext ?? ''
    const nearbyDev = plot.nearby_development ?? plot.nearbyDevelopment ?? ''
    const cagrData = calcCAGR(roi, readiness)
    const score = calcInvestmentScore(plot)
    const { label: scoreLabel } = getScoreLabel(score)

    const purchaseTax = Math.round(totalPrice * 0.06)
    const attorneyFees = Math.round(totalPrice * 0.0175)
    const grossProfit = projectedValue - totalPrice
    const bettermentLevy = Math.round(grossProfit * 0.5)
    const costs = purchaseTax + attorneyFees
    const taxable = Math.max(0, grossProfit - bettermentLevy - costs)
    const capGains = Math.round(taxable * 0.25)
    const netProfit = grossProfit - costs - bettermentLevy - capGains

    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8">
      <title>דו״ח השקעה - גוש ${blockNumber} חלקה ${plot.number}</title>
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
        .score-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-weight: 700; font-size: 13px; }
        .footer { margin-top: 40px; text-align: center; color: #aaa; font-size: 11px; border-top: 1px solid #eee; padding-top: 16px; }
        .desc { font-size: 13px; color: #444; margin-bottom: 16px; }
        .highlight { background: #FFFBEB; border: 1px solid #F59E0B; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <h1>🏗️ דו״ח השקעה — גוש ${blockNumber} | חלקה ${plot.number}</h1>
      <div class="subtitle">${plot.city} • ${new Date().toLocaleDateString('he-IL')} • ציון השקעה: ${score}/10 (${scoreLabel})</div>
      ${plot.description ? `<p class="desc">${plot.description}</p>` : ''}
      ${areaCtx ? `<p class="desc">📍 ${areaCtx}</p>` : ''}
      ${nearbyDev ? `<p class="desc">🏗️ ${nearbyDev}</p>` : ''}
      <div class="section">
        <h2>נתונים פיננסיים</h2>
        <div class="grid3">
          <div class="card"><div class="label">מחיר מבוקש</div><div class="value blue">${formatCurrency(totalPrice)}</div></div>
          <div class="card"><div class="label">שווי צפוי</div><div class="value green">${formatCurrency(projectedValue)}</div></div>
          <div class="card"><div class="label">תשואה צפויה</div><div class="value gold">+${roi}%</div></div>
        </div>
        ${cagrData ? `<div class="row" style="margin-top:8px"><span class="label">תשואה שנתית (CAGR)</span><span class="val" style="color:#C8942A">${cagrData.cagr}% לשנה (${cagrData.years} שנים)</span></div>` : ''}
      </div>
      <div class="section">
        <h2>פרטי חלקה</h2>
        <div class="row"><span class="label">שטח</span><span class="val">${(sizeSqM / 1000).toFixed(1)} דונם (${sizeSqM.toLocaleString()} מ״ר)</span></div>
        <div class="row"><span class="label">מחיר למ״ר</span><span class="val">${formatCurrency(Math.round(totalPrice / sizeSqM))}</span></div>
        <div class="row"><span class="label">מחיר לדונם</span><span class="val">${formatCurrency(Math.round(totalPrice / sizeSqM * 1000))}</span></div>
        <div class="row"><span class="label">סטטוס</span><span class="val">${statusLabels[plot.status] || plot.status}</span></div>
        <div class="row"><span class="label">ייעוד קרקע</span><span class="val">${zoningLabels[zoningStage] || zoningStage}</span></div>
        ${readiness ? `<div class="row"><span class="label">מוכנות לבנייה</span><span class="val">${readiness}</span></div>` : ''}
      </div>
      <div class="section">
        <h2>ניתוח עלויות ורווחיות</h2>
        <div class="row"><span class="label">מס רכישה (6%)</span><span class="val">${formatCurrency(purchaseTax)}</span></div>
        <div class="row"><span class="label">שכ״ט עו״ד (~1.75%)</span><span class="val">${formatCurrency(attorneyFees)}</span></div>
        <div class="row"><span class="label">סה״כ עלות כוללת</span><span class="val" style="color:#3B82F6">${formatCurrency(Math.round(totalPrice * 1.0775))}</span></div>
        <div class="row"><span class="label">רווח גולמי</span><span class="val" style="color:#22C55E">${formatCurrency(grossProfit)}</span></div>
        <div class="row"><span class="label">היטל השבחה (50%)</span><span class="val" style="color:#EF4444">-${formatCurrency(bettermentLevy)}</span></div>
        <div class="row"><span class="label">מס שבח (25%)</span><span class="val" style="color:#EF4444">-${formatCurrency(capGains)}</span></div>
        <div class="highlight">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:600;font-size:15px">✨ רווח נקי (אחרי כל המיסים)</span>
            <span style="font-weight:800;font-size:20px;color:${netProfit >= 0 ? '#22C55E' : '#EF4444'}">${formatCurrency(netProfit)}</span>
          </div>
        </div>
      </div>
      <div class="footer">
        <div>LandMap Israel — מפת קרקעות להשקעה</div>
        <div>הופק ב-${new Date().toLocaleDateString('he-IL')} ${new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</div>
        <div style="margin-top:4px">${window.location.href}</div>
        <div style="margin-top:8px;font-size:10px">⚠️ מסמך זה הינו לצרכי מידע בלבד ואינו מהווה ייעוץ השקעות</div>
      </div>
    </body></html>`)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 300)
  }, [plot, computed])

  // Dynamic page title + OG meta for SEO
  useEffect(() => {
    if (plot) {
      const blockNum = plot.block_number ?? plot.blockNumber
      const price = plot.total_price ?? plot.totalPrice
      const sizeSqM = plot.size_sqm ?? plot.sizeSqM

      document.title = `גוש ${blockNum} חלקה ${plot.number} - ${plot.city} | LandMap Israel`

      const setMeta = (attr, key, content) => {
        let el = document.querySelector(`meta[${attr}="${key}"]`)
        if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
        el.content = content
      }

      const desc = `קרקע להשקעה בגוש ${blockNum} חלקה ${plot.number}, ${plot.city}. מחיר: ₪${Math.round(price/1000)}K. שטח: ${sizeSqM?.toLocaleString()} מ"ר.`
      setMeta('name', 'description', desc)
      setMeta('property', 'og:title', `גוש ${blockNum} חלקה ${plot.number} - ${plot.city}`)
      setMeta('property', 'og:description', desc)
      setMeta('property', 'og:url', window.location.href)
      setMeta('property', 'og:type', 'product')
      // OG image from first plot image, fallback to dynamic SVG — improves social sharing like Madlan
      const images = plot.plot_images || []
      if (images.length > 0 && images[0].url) {
        setMeta('property', 'og:image', images[0].url)
      } else {
        // Dynamic OG image from server (SVG with plot stats)
        const ogBase = import.meta.env.VITE_API_URL || window.location.origin
        setMeta('property', 'og:image', `${ogBase}/api/og/${plot.id}`)
      }
      // Twitter card
      setMeta('name', 'twitter:card', 'summary_large_image')
      setMeta('name', 'twitter:title', `גוש ${blockNum} חלקה ${plot.number} - ${plot.city}`)
      setMeta('name', 'twitter:description', desc)
    }
    return () => { document.title = 'LandMap Israel - מפת קרקעות להשקעה' }
  }, [plot])

  const computed = useMemo(() => {
    if (!plot) return null
    const totalPrice = plot.total_price ?? plot.totalPrice
    const projectedValue = plot.projected_value ?? plot.projectedValue
    const sizeSqM = plot.size_sqm ?? plot.sizeSqM
    const blockNumber = plot.block_number ?? plot.blockNumber
    const roi = Math.round((projectedValue - totalPrice) / totalPrice * 100)
    const pricePerDunam = formatCurrency(Math.round(totalPrice / sizeSqM * 1000))
    const readiness = plot.readiness_estimate ?? plot.readinessEstimate
    const zoningStage = plot.zoning_stage ?? plot.zoningStage
    const currentStageIndex = zoningPipelineStages.findIndex((s) => s.key === zoningStage)
    return { totalPrice, projectedValue, sizeSqM, blockNumber, roi, pricePerDunam, readiness, zoningStage, currentStageIndex }
  }, [plot])

  // Track per-user price changes across visits — like Yad2's "המחיר ירד מאז הביקור שלך".
  // Shows a personalized badge when the price changed since the user's last visit to this plot.
  // More impactful than generic price change badges because it's relative to the user's awareness.
  const lastVisitPrice = useLastVisitPrice(id, computed?.totalPrice)

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-navy" dir="rtl">
        <PublicNav />
        <div className="relative z-10 pt-20 pb-28">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            {/* Breadcrumb skeleton */}
            <div className="flex items-center gap-2 mb-6">
              <div className="h-3 w-16 rounded bg-slate-700/50 animate-pulse" />
              <div className="h-3 w-2 rounded bg-slate-700/30" />
              <div className="h-3 w-12 rounded bg-slate-700/40 animate-pulse" style={{ animationDelay: '0.1s' }} />
              <div className="h-3 w-2 rounded bg-slate-700/30" />
              <div className="h-3 w-28 rounded bg-slate-700/40 animate-pulse" style={{ animationDelay: '0.2s' }} />
            </div>

            {/* Hero header skeleton */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
              <div>
                <div className="h-9 w-72 rounded-lg bg-slate-700/40 animate-pulse mb-3" />
                <div className="flex flex-wrap items-center gap-2">
                  <div className="h-6 w-20 rounded-lg bg-slate-700/30 animate-pulse" />
                  <div className="h-6 w-24 rounded-lg bg-slate-700/30 animate-pulse" style={{ animationDelay: '0.15s' }} />
                  <div className="h-6 w-28 rounded-lg bg-slate-700/30 animate-pulse" style={{ animationDelay: '0.25s' }} />
                  <div className="h-6 w-16 rounded-full bg-slate-700/30 animate-pulse" style={{ animationDelay: '0.35s' }} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-slate-700/30 animate-pulse" />
                <div className="w-10 h-10 rounded-xl bg-slate-700/30 animate-pulse" />
              </div>
            </div>

            {/* Map skeleton */}
            <div className="mb-8">
              <div className="h-[280px] rounded-2xl bg-navy-light/40 border border-white/5 animate-pulse relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03]" style={{
                  backgroundImage: 'linear-gradient(rgba(200,148,42,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(200,148,42,0.3) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Spinner className="w-8 h-8 text-gold/40" />
                </div>
              </div>
            </div>

            {/* Financial cards skeleton */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { color: 'blue', delay: '0s' },
                { color: 'emerald', delay: '0.1s' },
                { color: 'gold', delay: '0.2s' },
              ].map(({ color, delay }, i) => (
                <div key={i} className={`rounded-2xl p-5 flex flex-col items-center gap-2 bg-${color === 'gold' ? 'gold' : color + '-500'}/5 border border-white/5 animate-pulse`} style={{ animationDelay: delay }}>
                  <div className="h-3 w-16 rounded bg-slate-700/40" />
                  <div className="h-7 w-28 rounded bg-slate-700/30" />
                  <div className="h-3 w-20 rounded bg-slate-700/20" />
                </div>
              ))}
            </div>

            {/* Two-column skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="h-32 rounded-2xl bg-navy-light/40 border border-white/5 animate-pulse" />
                <div className="h-48 rounded-2xl bg-navy-light/40 border border-white/5 animate-pulse" style={{ animationDelay: '0.15s' }} />
              </div>
              <div className="space-y-4">
                <div className="h-64 rounded-2xl bg-navy-light/40 border border-white/5 animate-pulse" style={{ animationDelay: '0.1s' }} />
                <div className="h-40 rounded-2xl bg-navy-light/40 border border-white/5 animate-pulse" style={{ animationDelay: '0.25s' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !plot) {
    // Differentiate 404 (not found) vs network/server errors for better UX.
    // 404 = plot was removed or link is wrong → show search + alternatives.
    // Network error = transient issue → show retry button prominently.
    const is404 = error?.status === 404 || (!error && !plot && !isLoading)
    const isNetworkError = error && !error.status

    return (
      <div className="min-h-screen w-full bg-navy" dir="rtl">
        <PublicNav />
        {/* noindex for error pages — prevent Google from indexing dead URLs */}
        <meta name="robots" content="noindex, nofollow" />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <div className="flex flex-col items-center gap-5 max-w-md text-center">
            <div className="w-20 h-20 rounded-2xl bg-navy-light/60 border border-white/10 flex items-center justify-center">
              <span className="text-4xl">{is404 ? '🔍' : '⚠️'}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">
              {is404 ? 'חלקה לא נמצאה' : 'שגיאה בטעינת הנתונים'}
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              {is404
                ? 'ייתכן שהחלקה הוסרה מהמערכת או שהקישור שגוי. נסה לחפש את החלקה ישירות.'
                : isNetworkError
                  ? 'בעיית חיבור לשרת — בדוק את חיבור האינטרנט ונסה שנית.'
                  : `השרת השיב עם שגיאה${error?.status ? ` (${error.status})` : ''}. נסה שוב בעוד רגע.`
              }
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {/* Retry button — prominent for network errors, secondary for 404 */}
              {!is404 && (
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-gold to-gold-bright text-navy font-bold text-sm rounded-xl hover:shadow-lg hover:shadow-gold/30 transition-all"
                >
                  🔄 נסה שוב
                </button>
              )}
              <button
                onClick={() => window.history.length > 2 ? navigate(-1) : navigate('/')}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-sm hover:bg-white/10 hover:text-white transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                {window.history.length > 2 ? 'חזרה' : 'למפה'}
              </button>
              <Link
                to="/"
                className="flex items-center gap-2 px-5 py-2.5 bg-gold/10 border border-gold/20 rounded-xl text-gold text-sm hover:bg-gold/15 transition-colors"
              >
                🗺️ חפש במפה
              </Link>
            </div>
            {/* Plot ID hint for debugging / customer support */}
            {id && (
              <p className="text-[10px] text-slate-600 mt-2">
                מזהה חלקה: {id}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  const { totalPrice, projectedValue, sizeSqM, blockNumber, roi, pricePerDunam, readiness, zoningStage, currentStageIndex } = computed
  const statusColor = statusColors[plot.status]
  const distanceToSea = plot.distance_to_sea ?? plot.distanceToSea
  const distanceToPark = plot.distance_to_park ?? plot.distanceToPark
  const distanceToHospital = plot.distance_to_hospital ?? plot.distanceToHospital
  const areaContext = plot.area_context ?? plot.areaContext
  const images = plot.plot_images || []

  return (
    <div className="min-h-screen w-full bg-navy" dir="rtl">
      <PublicNav />
      <ReadingProgressBar />
      <StickyPlotInfoBar plot={plot} computed={computed} />
      <SectionNav />
      <JsonLdSchema plot={plot} />
      <PlotFaqSchema plot={plot} />

      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(200,148,42,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(200,148,42,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 pt-20 pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">

          {/* Breadcrumb — reusable component with JSON-LD structured data for Google rich results */}
          <Breadcrumb
            items={[
              { label: 'מפה', to: '/' },
              { label: plot.city, to: `/?city=${encodeURIComponent(plot.city)}` },
              { label: `גוש ${blockNumber} חלקה ${plot.number}` },
            ]}
            className="mb-6"
          />

          {/* Hero header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black mb-3">
                <span className="bg-gradient-to-r from-gold to-gold-bright bg-clip-text text-transparent">גוש</span>
                {' '}{blockNumber}{' | '}
                <span className="bg-gradient-to-r from-gold to-gold-bright bg-clip-text text-transparent">חלקה</span>
                {' '}{plot.number}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-sm text-slate-400">
                  <MapPin className="w-4 h-4" /> {plot.city}
                </span>
                <span className="text-xs text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg">
                  {formatDunam(sizeSqM)} דונם
                </span>
                <span className="text-xs text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg">
                  {zoningLabels[zoningStage]}
                </span>
                {/* Compact zoning pipeline progress — regulatory stage at a glance */}
                {zoningStage && (
                  <span className="inline-flex items-center bg-white/5 px-2.5 py-1 rounded-lg">
                    <ZoningProgressBar currentStage={zoningStage} variant="compact" />
                  </span>
                )}
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: statusColor + '14', border: `1px solid ${statusColor}35`, color: statusColor }}
                >
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: statusColor }} />
                  {statusLabels[plot.status]}
                </span>
                {/* Freshness & views — social proof indicators like Madlan */}
                {(() => {
                  const updatedAt = plot.updated_at ?? plot.updatedAt
                  const freshness = formatRelativeTime(updatedAt)
                  if (!freshness) return null
                  const colorClass = getFreshnessColor(updatedAt)
                  return (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs ${colorClass} bg-white/5`}>
                      <Clock className="w-3 h-3" />
                      עודכן {freshness}
                    </span>
                  )
                })()}
                {plot.views > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20">
                    👁 {plot.views} צפיות
                  </span>
                )}
                {/* Days on Market — like Yad2's "ימים מאז פרסום" badge.
                    Helps investors assess urgency: fresh listings = opportunity, stale = potential issues. */}
                {(() => {
                  const dom = calcDaysOnMarket(plot.created_at ?? plot.createdAt)
                  if (!dom) return null
                  return (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border"
                      style={{ color: dom.color, background: `${dom.color}10`, borderColor: `${dom.color}20` }}
                    >
                      📅 {dom.label}
                    </span>
                  )
                })()}
                {/* Price changed since last visit — personalized Yad2-style "המחיר ירד!" badge.
                    Shows only if this isn't the user's first visit AND the price actually changed.
                    More impactful than generic price alerts: relative to the user's awareness. */}
                {lastVisitPrice.hasChange && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border animate-bounce-in ${
                      lastVisitPrice.direction === 'down'
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        : 'text-orange-400 bg-orange-500/10 border-orange-500/20'
                    }`}
                    title={`מחיר קודם: ${formatCurrency(lastVisitPrice.previousPrice)} (${lastVisitPrice.lastVisit?.toLocaleDateString('he-IL')})`}
                  >
                    {lastVisitPrice.direction === 'down' ? '📉' : '📈'}
                    {lastVisitPrice.direction === 'down' ? 'המחיר ירד' : 'המחיר עלה'}
                    {' '}
                    {Math.abs(lastVisitPrice.changePct)}%
                    {' מאז ביקורך'}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* View on Interactive Map — the primary navigation from detail → map discovery.
                  SEO-landed users (from Google "גוש X חלקה Y") need this to explore spatial context:
                  nearby plots, area comparison, and interactive filters. Like Madlan's "הצג על המפה".
                  Opens the main MapView with ?plot= param to auto-center and select this plot. */}
              <Link
                to={`/?plot=${plot.id}&city=${encodeURIComponent(plot.city)}`}
                className="h-10 flex items-center gap-2 px-4 rounded-xl bg-gold/10 border border-gold/25 text-gold text-sm font-bold hover:bg-gold/20 hover:border-gold/35 transition-all"
                title="הצג על המפה האינטראקטיבית"
              >
                <MapIcon className="w-4 h-4" />
                <span className="hidden sm:inline">הצג במפה</span>
                <span className="sm:hidden">🗺️</span>
              </Link>
              <button
                onClick={() => favorites.toggle(plot.id)}
                className={`w-10 h-10 rounded-xl border transition-all flex items-center justify-center ${
                  favorites.isFavorite(plot.id) ? 'bg-red-500/15 border-red-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <Heart className={`w-4 h-4 ${favorites.isFavorite(plot.id) ? 'text-red-400 fill-red-400' : 'text-slate-400'}`} />
              </button>
              <Suspense fallback={<div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 animate-pulse" />}>
                <ShareMenu
                  plotTitle={`גוש ${blockNumber} חלקה ${plot.number} - ${plot.city}`}
                  plotPrice={formatCurrency(totalPrice)}
                  plotUrl={window.location.href}
                />
              </Suspense>
            </div>
          </div>

          {/* Images gallery — hero image uses fetchpriority=high for LCP, others lazy-loaded.
              Error fallback prevents broken image icons when CDN/storage URLs expire. */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              {images.map((img, i) => (
                <button
                  key={img.id || i}
                  onClick={() => { setLightboxIndex(i); setLightboxOpen(true) }}
                  className={`rounded-2xl overflow-hidden border border-white/10 hover:border-gold/40 transition-all group relative ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
                >
                  <img
                    src={img.url}
                    alt={img.alt || `גוש ${blockNumber} חלקה ${plot.number} — תמונה ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                    style={{
                      aspectRatio: i === 0 ? '16/9' : '1/1',
                      opacity: 0,
                      filter: 'blur(8px)',
                      transition: 'opacity 0.5s ease, filter 0.5s ease, transform 0.3s ease',
                    }}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    fetchPriority={i === 0 ? 'high' : undefined}
                    decoding="async"
                    onLoad={(e) => {
                      // Blur-up progressive reveal — image sharpens as it loads
                      e.target.style.opacity = '1'
                      e.target.style.filter = 'blur(0)'
                    }}
                    onError={(e) => {
                      // Graceful fallback — styled placeholder instead of broken image icon
                      e.target.style.display = 'none'
                      const parent = e.target.parentElement
                      if (parent && !parent.querySelector('.img-fallback-placeholder')) {
                        const ph = document.createElement('div')
                        ph.className = 'img-fallback-placeholder'
                        ph.style.cssText = `position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:linear-gradient(135deg,rgba(200,148,42,0.08),rgba(200,148,42,0.02));`
                        ph.innerHTML = `<span style="font-size:${i === 0 ? '32' : '20'}px;opacity:0.3">🏗️</span><span style="font-size:10px;color:rgba(148,163,184,0.4)">תמונה לא זמינה</span>`
                        parent.appendChild(ph)
                      }
                    }}
                  />
                  {/* Gradient placeholder visible until image loads */}
                  <div className="absolute inset-0 -z-10 bg-gradient-to-br from-navy-light/60 to-gold/5" />
                  {/* Image count badge on last visible image */}
                  {i === Math.min(images.length - 1, 5) && images.length > 6 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">+{images.length - 6}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Data Completeness — Bloomberg-style data quality bar.
              Investors need to know how much they can trust the data for this specific plot.
              Shows percentage of available data fields (coordinates, images, enrichment, etc.).
              Unique to LandMap — builds trust through radical transparency. */}
          <div className="mb-6">
            <DataCompletenessBar plot={plot} variant="full" />
          </div>

          {/* Location mini-map — like Madlan always shows location context */}
          {plot.coordinates && plot.coordinates.length >= 3 && (
            <div id="section-location" className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gold" />
                  מיקום החלקה
                </h2>
                {/* Google Street View link — like Madlan/Yad2's "סטריט וויו" */}
                {(() => {
                  const valid = plot.coordinates.filter(c => Array.isArray(c) && c.length >= 2 && isFinite(c[0]) && isFinite(c[1]))
                  if (valid.length === 0) return null
                  const lat = (valid.reduce((s, c) => s + c[0], 0) / valid.length).toFixed(6)
                  const lng = (valid.reduce((s, c) => s + c[1], 0) / valid.length).toFixed(6)
                  return (
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://www.google.com/maps/@${lat},${lng},3a,75y,0h,90t/data=!3m4!1e1!3m2!1s!2e0`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 bg-white/5 border border-white/10 rounded-lg hover:text-gold hover:border-gold/20 hover:bg-gold/5 transition-all"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Street View
                      </a>
                      <a
                        href={`https://www.google.com/maps?q=${lat},${lng}&z=17`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 bg-white/5 border border-white/10 rounded-lg hover:text-gold hover:border-gold/20 hover:bg-gold/5 transition-all"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Google Maps
                      </a>
                      {/* Waze — the #1 navigation app in Israel, used more than Google Maps */}
                      <a
                        href={`https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes&zoom=17`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 bg-white/5 border border-white/10 rounded-lg hover:text-[#33CCFF] hover:border-[#33CCFF]/20 hover:bg-[#33CCFF]/5 transition-all"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.54 6.63c-1.19-4.28-5.37-6.2-9.26-5.62C6.6 1.74 3.56 5.24 3.06 9.86c-.46 4.2 1.26 7.3 4.33 8.94.15.08.2.2.18.37-.04.47-.09.93-.14 1.4-.04.43.27.65.63.44.5-.29.98-.6 1.47-.9.16-.1.31-.12.49-.08.65.14 1.3.21 1.97.19 4.26-.12 8.24-3.19 9.12-7.49.3-1.47.28-2.9-.03-4.32zm-8.29 8.93c-.64.02-1.16-.5-1.16-1.13 0-.61.5-1.13 1.14-1.14.63 0 1.15.52 1.15 1.14 0 .62-.5 1.12-1.13 1.13zm3.98 0c-.63.02-1.15-.5-1.16-1.12 0-.63.51-1.14 1.14-1.15.64 0 1.15.52 1.15 1.14 0 .62-.5 1.12-1.13 1.13zm-7.96 0c-.63.02-1.15-.5-1.16-1.12-.01-.63.51-1.14 1.14-1.15.64 0 1.16.51 1.16 1.13 0 .63-.51 1.13-1.14 1.14z"/>
                        </svg>
                        Waze
                      </a>
                    </div>
                  )
                })()}
              </div>
              <MiniMap
                coordinates={plot.coordinates}
                status={plot.status}
                city={plot.city}
                height="280px"
                interactive={true}
              />
            </div>
          )}

          {/* Investment Verdict — instant assessment using nearby plots for area benchmark */}
          {(() => {
            const verdict = calcInvestmentVerdict(plot, nearbyPlots.length > 0 ? [plot, ...nearbyPlots] : [])
            if (!verdict) return null
            return (
              <div
                className={`flex items-center gap-4 rounded-2xl p-4 mb-6 border ${
                  verdict.tier === 'hot' ? 'bg-orange-500/10 border-orange-500/20' :
                  verdict.tier === 'excellent' ? 'bg-emerald-500/10 border-emerald-500/20' :
                  verdict.tier === 'good' ? 'bg-lime-500/10 border-lime-500/20' :
                  verdict.tier === 'fair' ? 'bg-amber-500/10 border-amber-500/20' :
                  'bg-red-500/10 border-red-500/20'
                }`}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                  style={{ background: `${verdict.color}18` }}
                >
                  {verdict.emoji}
                </div>
                <div className="min-w-0">
                  <div className="text-base font-bold" style={{ color: verdict.color }}>
                    {verdict.label}
                  </div>
                  <div className="text-sm text-slate-400">
                    {verdict.description}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Below Market Price Indicator — like Madlan's "מחיר נמוך ממדלן" */}
          {(() => {
            if (!marketData?.cities || sizeSqM <= 0) return null
            const cityData = marketData.cities.find(c => c.city === plot.city)
            if (!cityData || !cityData.avgPricePerSqm || cityData.count < 3) return null
            const plotPsm = totalPrice / sizeSqM
            const diffPct = Math.round(((plotPsm - cityData.avgPricePerSqm) / cityData.avgPricePerSqm) * 100)
            if (Math.abs(diffPct) < 5) return null
            const isBelow = diffPct < 0
            return (
              <div
                className={`flex items-center gap-4 rounded-2xl p-4 mb-6 border ${
                  isBelow
                    ? 'bg-emerald-500/8 border-emerald-500/15'
                    : 'bg-amber-500/8 border-amber-500/15'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${
                  isBelow ? 'bg-emerald-500/15' : 'bg-amber-500/15'
                }`}>
                  {isBelow ? '📉' : '📈'}
                </div>
                <div className="min-w-0">
                  <div className={`text-sm font-bold ${isBelow ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isBelow
                      ? `${Math.abs(diffPct)}% מתחת לממוצע ב${plot.city}`
                      : `${diffPct}% מעל הממוצע ב${plot.city}`
                    }
                  </div>
                  <div className="text-xs text-slate-500">
                    ממוצע אזורי: {formatCurrency(cityData.avgPricePerSqm)}/מ״ר · חלקה זו: {formatCurrency(Math.round(plotPsm))}/מ״ר
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Price per sqm visual comparison — bar chart vs city average (like Madlan's price benchmark) */}
          {(() => {
            if (!marketData?.cities || sizeSqM <= 0) return null
            const cityData = marketData.cities.find(c => c.city === plot.city)
            if (!cityData || !cityData.avgPricePerSqm || cityData.count < 3) return null
            const plotPsm = Math.round(totalPrice / sizeSqM)
            const avgPsm = Math.round(cityData.avgPricePerSqm)
            const maxPsm = Math.max(plotPsm, avgPsm) * 1.15
            const plotPct = (plotPsm / maxPsm) * 100
            const avgPct = (avgPsm / maxPsm) * 100
            const isBelow = plotPsm < avgPsm
            return (
              <div className="bg-navy-light/40 border border-white/5 rounded-2xl p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart className="w-4 h-4 text-gold" />
                  <h2 className="text-sm font-bold text-slate-200">מחיר למ״ר — השוואה אזורית</h2>
                </div>
                <div className="space-y-3">
                  {/* This plot */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">חלקה זו</span>
                      <span className={`font-bold ${isBelow ? 'text-emerald-400' : 'text-amber-400'}`}>
                        ₪{plotPsm.toLocaleString()}/מ״ר
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${plotPct}%`,
                          background: isBelow
                            ? 'linear-gradient(90deg, #22C55E, #4ADE80)'
                            : 'linear-gradient(90deg, #F59E0B, #FBBF24)',
                        }}
                      />
                    </div>
                  </div>
                  {/* City average */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">ממוצע {plot.city} ({cityData.count} חלקות)</span>
                      <span className="text-slate-300 font-medium">₪{avgPsm.toLocaleString()}/מ״ר</span>
                    </div>
                    <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 bg-slate-500/50"
                        style={{ width: `${avgPct}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-600 mt-2">
                  {isBelow
                    ? `💡 המחיר למ״ר נמוך ב-${Math.round(((avgPsm - plotPsm) / avgPsm) * 100)}% מהממוצע האזורי`
                    : `📊 המחיר למ״ר גבוה ב-${Math.round(((plotPsm - avgPsm) / avgPsm) * 100)}% מהממוצע האזורי`
                  }
                </div>
              </div>
            )
          })()}

          {/* Auto-generated Investment Narrative — natural-language summary for investors + SEO.
              Google indexes natural language better than structured cards. Madlan does this with
              "תיאור הנכס" sections — we generate ours from data for every plot automatically.
              Provides instant context without the user having to parse numbers. */}
          {(() => {
            const score = calcInvestmentScore(plot)
            const { grade } = getScoreLabel(score)
            const cagrData = calcCAGR(roi, readiness)
            const zoningName = zoningLabels[zoningStage] || zoningStage
            const dunam = formatDunam(sizeSqM)

            // Build narrative paragraphs
            const introSentence = `חלקה ${plot.number} בגוש ${blockNumber} ממוקמת ב${plot.city} ומשתרעת על שטח של ${dunam} דונם (${sizeSqM.toLocaleString()} מ״ר).`

            const priceSentence = `המחיר המבוקש עומד על ${formatCurrency(totalPrice)}, שהם ${formatCurrency(Math.round(totalPrice / sizeSqM * 1000))} לדונם.`

            const roiSentence = roi > 0
              ? `השווי הצפוי לאחר השבחה: ${formatCurrency(projectedValue)} — תשואה ברוטו של +${roi}%${cagrData ? ` (כ-${cagrData.cagr}% שנתי על פני ${cagrData.years} שנים)` : ''}.`
              : null

            const zoningSentence = `החלקה נמצאת בשלב תכנוני: ${zoningName}.${readiness ? ` מוכנות משוערת לבנייה: ${readiness}.` : ''}`

            const scoreSentence = `ציון ההשקעה: ${score}/10 (${grade}).`

            const areaCtx = plot.area_context ?? plot.areaContext
            const nearbyDev = plot.nearby_development ?? plot.nearbyDevelopment

            return (
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 mb-6" id="section-narrative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5 text-gold" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-200">סיכום השקעה</h2>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {introSentence} {priceSentence} {roiSentence} {zoningSentence} {scoreSentence}
                </p>
                {(areaCtx || nearbyDev) && (
                  <p className="text-sm text-slate-400 leading-relaxed mt-2">
                    {areaCtx && <span>📍 {areaCtx} </span>}
                    {nearbyDev && <span>🏗️ {nearbyDev}</span>}
                  </p>
                )}
                {plot.description && (
                  <p className="text-sm text-slate-400 leading-relaxed mt-2 border-t border-white/5 pt-2">
                    {plot.description}
                  </p>
                )}
              </div>
            )
          })()}

          {/* Financial cards grid */}
          <div id="section-financial" className="grid grid-cols-3 gap-4 mb-8">
            <div className="rounded-2xl p-5 flex flex-col items-center gap-2 text-center bg-gradient-to-b from-blue-500/15 to-blue-500/8 border border-blue-500/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600" />
              <div className="text-xs text-slate-400">מחיר מבוקש</div>
              <div className="text-xl sm:text-2xl font-bold text-blue-400">{formatCurrency(totalPrice)}</div>
              <div className="text-xs text-slate-500">{pricePerDunam} / דונם</div>
            </div>
            <div className="rounded-2xl p-5 flex flex-col items-center gap-2 text-center bg-gradient-to-b from-emerald-500/15 to-emerald-500/8 border border-emerald-500/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-600" />
              <div className="text-xs text-slate-400">שווי צפוי</div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-400">{formatCurrency(projectedValue)}</div>
              <div className="text-xs text-slate-500">בסיום תהליך</div>
            </div>
            <div className="rounded-2xl p-5 flex flex-col items-center gap-2 text-center bg-gradient-to-b from-gold/15 to-gold/8 border border-gold/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gold to-gold-bright" />
              <div className="text-xs text-slate-400">תשואה צפויה</div>
              <div className="text-xl sm:text-2xl font-bold text-gold">{roi}%</div>
              {readiness && <div className="text-xs text-slate-500">{readiness}</div>}
            </div>
          </div>

          {/* Calculator CTA — like Madlan's "חשב תשואה" button, pre-fills the investment calculator */}
          <Link
            to={`/calculator?price=${totalPrice}&size=${sizeSqM}&zoning=${encodeURIComponent(zoningStage)}&years=${readiness?.includes('1-3') ? '2' : readiness?.includes('3-5') ? '4' : '7'}`}
            className="flex items-center justify-center gap-2 mb-6 py-3 px-5 bg-gradient-to-r from-purple-600/15 to-indigo-600/15 border border-purple-500/20 rounded-2xl text-sm font-medium text-purple-300 hover:border-purple-500/40 hover:bg-purple-600/20 transition-all group"
          >
            <CalcIcon className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
            <span>חשב תשואה מפורטת במחשבון ההשקעות</span>
            <ArrowRight className="w-3.5 h-3.5 text-purple-400/60 group-hover:translate-x-[-2px] transition-transform" />
          </Link>

          {/* Price trend chart — like Madlan area trends */}
          <div className="mb-8">
            <WidgetErrorBoundary name="מגמת מחירים">
              <Suspense fallback={<SectionSkeleton height="h-48" />}>
                <PriceTrendChart totalPrice={totalPrice} sizeSqM={sizeSqM} city={plot.city} plotId={plot.id} />
              </Suspense>
            </WidgetErrorBoundary>
          </div>

          {/* Forward-looking investment projection — year-by-year S-curve growth.
              Differentiator: Madlan/Yad2 show history, we show the investor's future. */}
          <div id="section-projection" className="mb-8 bg-navy-light/40 border border-white/5 rounded-2xl p-5 plot-detail-section">
            <WidgetErrorBoundary name="תחזית השקעה">
              <Suspense fallback={<SectionSkeleton height="h-56" />}>
                <InvestmentProjection
                  totalPrice={totalPrice}
                  projectedValue={projectedValue}
                  readinessEstimate={readiness}
                  zoningStage={zoningStage}
                />
              </Suspense>
            </WidgetErrorBoundary>
          </div>

          {/* Investment Timeline — visual roadmap from current zoning stage to building permit.
              Uses calcInvestmentTimeline from formatters.js — shows elapsed, current, and remaining stages
              with estimated months and completion year. Differentiator: no Israeli competitor shows a
              clear visual timeline for land investment maturation. Like a Gantt chart for real estate. */}
          {(() => {
            const timeline = calcInvestmentTimeline(plot)
            if (!timeline || timeline.stages.length === 0) return null
            return (
              <div id="section-timeline" className="mb-8 bg-navy-light/40 border border-white/5 rounded-2xl p-5 plot-detail-section">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-100">ציר זמן השקעה</h2>
                      <p className="text-[10px] text-slate-500">מסלול תכנוני מ-{timeline.stages[0].label} עד {timeline.stages[timeline.stages.length - 1].label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {timeline.remainingMonths > 0 && (
                      <div className="text-left">
                        <div className="text-[10px] text-slate-500">נותרו</div>
                        <div className="text-sm font-bold text-indigo-400">~{timeline.remainingMonths} חודשים</div>
                      </div>
                    )}
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex flex-col items-center justify-center">
                      <span className="text-lg font-black text-indigo-400">{timeline.progressPct}%</span>
                      <span className="text-[8px] text-slate-500">התקדמות</span>
                    </div>
                  </div>
                </div>

                {/* Main progress bar */}
                <div className="mb-6">
                  <div className="h-2.5 rounded-full bg-white/5 overflow-hidden relative">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max(3, timeline.progressPct)}%`,
                        background: timeline.progressPct >= 75
                          ? 'linear-gradient(90deg, #22C55E, #4ADE80)'
                          : timeline.progressPct >= 40
                            ? 'linear-gradient(90deg, #C8942A, #E5B94E)'
                            : 'linear-gradient(90deg, #6366F1, #818CF8)',
                      }}
                    />
                  </div>
                </div>

                {/* Stage milestones */}
                <div className="relative">
                  {/* Connecting line */}
                  <div className="absolute right-[15px] top-4 bottom-4 w-px bg-gradient-to-b from-indigo-500/30 via-gold/20 to-emerald-500/30" />

                  <div className="space-y-0">
                    {timeline.stages.map((stage, i) => {
                      const isCompleted = stage.status === 'completed'
                      const isCurrent = stage.status === 'current'
                      const isFuture = stage.status === 'future'
                      return (
                        <div
                          key={stage.key}
                          className={`relative flex items-center gap-3 py-2.5 pr-1 transition-all ${
                            isCurrent ? 'bg-gold/5 -mx-2 px-2 rounded-xl' : ''
                          } ${isFuture ? 'opacity-40' : ''}`}
                        >
                          {/* Stage dot */}
                          <div
                            className={`w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 transition-all ${
                              isCompleted ? 'bg-emerald-500/20 border-emerald-500/40' :
                              isCurrent ? 'bg-gold/20 border-gold/50 shadow-lg shadow-gold/20 scale-110' :
                              'bg-white/5 border-white/10'
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <span className="text-sm">{stage.icon}</span>
                            )}
                          </div>

                          {/* Stage info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${
                                isCompleted ? 'text-emerald-400/80' :
                                isCurrent ? 'text-gold font-bold' :
                                'text-slate-500'
                              }`}>
                                {stage.label}
                              </span>
                              {isCurrent && (
                                <span className="text-[9px] text-gold bg-gold/10 px-2 py-0.5 rounded-full font-bold animate-pulse">
                                  שלב נוכחי
                                </span>
                              )}
                              {isCompleted && (
                                <span className="text-[9px] text-emerald-400/60">✓ הושלם</span>
                              )}
                            </div>
                            {stage.durationMonths > 0 && !isCompleted && (
                              <span className="text-[10px] text-slate-600">
                                ~{stage.durationMonths} חודשים {isCurrent ? '(בתהליך)' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Estimated completion */}
                {timeline.estimatedYear && timeline.remainingMonths > 0 && (
                  <div className="mt-4 flex items-center gap-3 bg-indigo-500/8 border border-indigo-500/15 rounded-xl px-4 py-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">🎯</span>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">השלמה משוערת</div>
                      <div className="text-sm font-bold text-indigo-300">
                        שנת {timeline.estimatedYear} ({timeline.elapsedMonths > 0 ? `${timeline.elapsedMonths} חודשים עברו, ` : ''}{timeline.remainingMonths} נותרו)
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-[9px] text-slate-600 mt-3">
                  * הערכות זמנים מבוססות על ממוצעי רשויות תכנון בישראל. הזמנים בפועל עשויים להשתנות.
                </p>
              </div>
            )
          })()}

          {/* Two-column layout for details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Left: Description + location */}
            <div className="space-y-4">
              {plot.description && (
                <div className="bg-navy-light/40 border border-white/5 rounded-2xl p-5">
                  <h2 className="text-base font-bold text-slate-100 mb-3">תיאור</h2>
                  <p className="text-sm text-slate-300 leading-relaxed">{plot.description}</p>
                </div>
              )}

              {areaContext && (
                <div className="bg-navy-light/40 border border-white/5 rounded-2xl p-5">
                  <h2 className="text-base font-bold text-slate-100 mb-3">הקשר אזורי</h2>
                  <p className="text-sm text-slate-300 leading-relaxed">{areaContext}</p>
                </div>
              )}

              {/* Nearby Development — like Madlan's "פיתוח בסביבה" */}
              {(() => {
                const nearbyDev = plot.nearby_development ?? plot.nearbyDevelopment
                if (!nearbyDev) return null
                return (
                  <div className="bg-gradient-to-r from-emerald-500/5 to-emerald-500/10 border border-emerald-500/15 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <h2 className="text-base font-bold text-slate-100">פיתוח בסביבה</h2>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{nearbyDev}</p>
                  </div>
                )
              })()}

              {/* ROI Stages — appreciation by planning stage */}
              {roi > 0 && (
                <div className="bg-navy-light/40 border border-white/5 rounded-2xl p-5">
                  <h2 className="text-base font-bold text-slate-100 mb-3">צפי השבחה לפי שלבי תכנון</h2>
                  <div className="space-y-1.5">
                    {roiStages.map((stage, i) => {
                      const isPast = i < currentStageIndex
                      const isCurrent = i === currentStageIndex
                      const maxPrice = roiStages[roiStages.length - 1].pricePerSqM
                      const barWidth = (stage.pricePerSqM / maxPrice) * 100
                      const stageValue = stage.pricePerSqM * sizeSqM
                      return (
                        <div key={i} className={`flex items-center gap-2 py-1.5 rounded-lg ${isCurrent ? 'bg-gold/5 -mx-1 px-1' : ''}`}>
                          <div className="w-[100px] flex-shrink-0">
                            <span className={`text-xs leading-tight ${isCurrent ? 'text-gold font-bold' : isPast ? 'text-green-400/70' : 'text-slate-500'}`}>
                              {stage.label}
                            </span>
                          </div>
                          <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${barWidth}%`,
                                background: isCurrent
                                  ? 'linear-gradient(90deg, #C8942A, #E5B94E)'
                                  : isPast
                                    ? 'rgba(34,197,94,0.4)'
                                    : 'rgba(148,163,184,0.15)',
                              }}
                            />
                          </div>
                          <span className={`text-[10px] w-16 text-left flex-shrink-0 ${isCurrent ? 'text-gold font-bold' : isPast ? 'text-green-400/70' : 'text-slate-500'}`}>
                            ₪{stage.pricePerSqM.toLocaleString()}/מ״ר
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Documents — PDFs, surveys, plans that investors need for due diligence.
                  Matches the sidebar's document access on the full-page view.
                  Like Madlan/Yad2's property document sections — essential for serious investors. */}
              {(() => {
                const docs = plot.plot_documents?.length ? plot.plot_documents : plot.documents?.length ? plot.documents : null
                if (!docs) return null
                return (
                  <div id="section-documents" className="bg-navy-light/40 border border-white/5 rounded-2xl p-5 plot-detail-section">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center">
                        <FileText className="w-3.5 h-3.5 text-gold" />
                      </div>
                      <h2 className="text-base font-bold text-slate-100">מסמכים ותוכניות</h2>
                      <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{docs.length}</span>
                    </div>
                    <div className="space-y-2">
                      {docs.map((doc, i) => {
                        if (typeof doc === 'object' && doc.url) {
                          const DocIcon = getDocIcon(doc.mime_type)
                          return (
                            <a
                              key={doc.id || i}
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 hover:border-gold/20 hover:bg-gold/5 transition-all group"
                            >
                              <DocIcon className="w-5 h-5 text-gold/60 group-hover:text-gold transition-colors flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-slate-300 group-hover:text-slate-200 transition-colors truncate">
                                  {doc.name || 'מסמך'}
                                </div>
                                {doc.mime_type && (
                                  <div className="text-[10px] text-slate-600 mt-0.5">
                                    {doc.mime_type.includes('pdf') ? 'PDF' : doc.mime_type.includes('image') ? 'תמונה' : doc.mime_type.includes('spread') || doc.mime_type.includes('excel') ? 'גיליון' : 'מסמך'}
                                  </div>
                                )}
                              </div>
                              <Download className="w-4 h-4 text-slate-500 group-hover:text-gold transition-colors flex-shrink-0" />
                            </a>
                          )
                        }
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3"
                          >
                            <FileText className="w-5 h-5 text-gold/60 flex-shrink-0" />
                            <span className="text-sm text-slate-300">{doc}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* Due Diligence Checklist — interactive pre-purchase verification steps.
                  Like a flight pre-check but for land investment. No competitor has this.
                  State persists per-plot in localStorage so users can track progress across sessions. */}
              <WidgetErrorBoundary name="רשימת בדיקת נאותות">
                <Suspense fallback={<SectionSkeleton height="h-40" />}>
                  <DueDiligenceChecklist plotId={id} />
                </Suspense>
              </WidgetErrorBoundary>

              {/* Proximity chips */}
              <div className="flex flex-wrap gap-3">
                {distanceToSea != null && (
                  <div className="flex items-center gap-2 bg-navy-light/40 border border-blue-500/15 rounded-xl px-4 py-2.5 text-sm text-slate-300">
                    <Waves className="w-4 h-4 text-blue-400" /> {distanceToSea} מ׳ מהים
                  </div>
                )}
                {distanceToPark != null && (
                  <div className="flex items-center gap-2 bg-navy-light/40 border border-green-500/15 rounded-xl px-4 py-2.5 text-sm text-slate-300">
                    <TreePine className="w-4 h-4 text-green-400" /> {distanceToPark} מ׳ מפארק
                  </div>
                )}
                {distanceToHospital != null && (
                  <div className="flex items-center gap-2 bg-navy-light/40 border border-red-500/15 rounded-xl px-4 py-2.5 text-sm text-slate-300">
                    <Hospital className="w-4 h-4 text-red-400" /> {distanceToHospital} מ׳ מבי"ח
                  </div>
                )}
              </div>
            </div>

            {/* Right: Zoning pipeline + costs */}
            <div className="space-y-4">
              {/* Zoning pipeline */}
              <div id="section-planning" className="bg-navy-light/40 border border-white/5 rounded-2xl p-5 plot-detail-section">
                <h2 className="text-base font-bold text-slate-100 mb-3">צינור תכנוני</h2>
                {readiness && (
                  <div className="flex items-center gap-2 mb-4 bg-gold/5 border border-gold/20 rounded-xl px-4 py-2.5">
                    <Hourglass className="w-4 h-4 text-gold" />
                    <span className="text-sm text-slate-300">מוכנות:</span>
                    <span className="text-sm font-bold text-gold">{readiness}</span>
                  </div>
                )}
                <div className="space-y-0">
                  {zoningPipelineStages.map((stage, i) => {
                    const isCompleted = i < currentStageIndex
                    const isCurrent = i === currentStageIndex
                    const isFuture = i > currentStageIndex
                    return (
                      <div key={stage.key} className={`flex items-center gap-3 py-2 ${isFuture ? 'opacity-40' : ''} ${isCurrent ? 'bg-gold/5 -mx-2 px-2 rounded-xl' : ''}`}>
                        <span className="text-lg w-7 text-center">{stage.icon}</span>
                        <span className={`text-sm ${isCompleted ? 'text-green-400' : isCurrent ? 'text-gold font-bold' : 'text-slate-500'}`}>{stage.label}</span>
                        {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mr-auto" />}
                        {isCurrent && <span className="mr-auto text-[10px] text-gold bg-gold/10 px-2 py-0.5 rounded-full">נוכחי</span>}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Associated costs — comprehensive P&L breakdown like Madlan's cost analysis */}
              {(() => {
                const txn = calcTransactionCosts(totalPrice)
                const exit = calcExitCosts(totalPrice, projectedValue)
                const holdYears = readiness?.includes('1-3') ? 2 : readiness?.includes('3-5') ? 4 : 7
                const annual = calcAnnualHoldingCosts(totalPrice, sizeSqM, zoningStage)
                const totalHolding = annual.totalAnnual * holdYears
                const totalAllCosts = txn.total + totalHolding + exit.totalExit
                const netAfterAll = (projectedValue - totalPrice) - totalAllCosts
                const trueRoi = txn.totalWithPurchase > 0 ? Math.round((netAfterAll / txn.totalWithPurchase) * 100) : 0

                return (
                  <div id="section-costs" className="bg-navy-light/40 border border-white/5 rounded-2xl p-5 plot-detail-section">
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="w-4 h-4 text-gold" />
                      <h2 className="text-base font-bold text-slate-100">ניתוח עלויות מלא</h2>
                    </div>

                    {/* Entry costs */}
                    <div className="mb-4">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        עלויות רכישה (חד-פעמי)
                      </div>
                      <div className="space-y-1.5 pr-3">
                        <div className="flex justify-between text-sm"><span className="text-slate-400">מס רכישה (6%)</span><span className="text-slate-300">{formatCurrency(txn.purchaseTax)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-slate-400">שכ״ט עו״ד (~1.75%)</span><span className="text-slate-300">{formatCurrency(txn.attorneyFees)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-slate-400">שמאי מקרקעין</span><span className="text-slate-300">{formatCurrency(txn.appraiserFee)}</span></div>
                        <div className="flex justify-between text-[13px] font-medium pt-1 border-t border-white/5">
                          <span className="text-slate-300">סה״כ כניסה</span>
                          <span className="text-blue-400">{formatCurrency(txn.total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Annual holding costs */}
                    <div className="mb-4">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        עלויות החזקה שנתיות
                      </div>
                      <div className="space-y-1.5 pr-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">ארנונה (~₪{annual.arnonaPerSqm}/מ״ר)</span>
                          <span className="text-slate-300">{formatCurrency(annual.arnona)}<span className="text-[10px] text-slate-500">/שנה</span></span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">ניהול ותחזוקת קרקע</span>
                          <span className="text-slate-300">{formatCurrency(annual.management)}<span className="text-[10px] text-slate-500">/שנה</span></span>
                        </div>
                        <div className="flex justify-between text-[13px] font-medium pt-1 border-t border-white/5">
                          <span className="text-slate-300">סה״כ שנתי</span>
                          <span className="text-amber-400">{formatCurrency(annual.totalAnnual)}<span className="text-[10px] text-slate-500">/שנה</span></span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>סה״כ ל-{holdYears} שנות החזקה</span>
                          <span>{formatCurrency(totalHolding)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Exit costs */}
                    <div className="mb-4">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        עלויות יציאה (מכירה)
                      </div>
                      <div className="space-y-1.5 pr-3">
                        <div className="flex justify-between text-sm"><span className="text-slate-400">היטל השבחה (50%)</span><span className="text-slate-300">{formatCurrency(exit.bettermentLevy)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-slate-400">מס שבח (25%)</span><span className="text-slate-300">{formatCurrency(exit.capitalGains)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-slate-400">עמלת מתווך (1%)</span><span className="text-slate-300">{formatCurrency(exit.agentCommission)}</span></div>
                        <div className="flex justify-between text-[13px] font-medium pt-1 border-t border-white/5">
                          <span className="text-slate-300">סה״כ יציאה</span>
                          <span className="text-red-400">{formatCurrency(exit.totalExit)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Net result summary — the bottom line investors care about */}
                    <div className={`rounded-xl p-4 border ${netAfterAll >= 0 ? 'bg-emerald-500/8 border-emerald-500/15' : 'bg-red-500/8 border-red-500/15'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-slate-200">✨ רווח נקי (אחרי הכל)</span>
                        <span className={`text-lg font-black ${netAfterAll >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatCurrency(netAfterAll)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">תשואה אמיתית (נטו)</span>
                        <span className={`font-bold ${trueRoi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{trueRoi > 0 ? '+' : ''}{trueRoi}%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-slate-500">סה״כ עלויות</span>
                        <span className="text-slate-400">{formatCurrency(totalAllCosts)}</span>
                      </div>
                      {/* Visual cost breakdown bar */}
                      <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden flex">
                        <div
                          className="h-full bg-blue-500/60"
                          style={{ width: `${totalAllCosts > 0 ? Math.round((txn.total / totalAllCosts) * 100) : 0}%` }}
                          title={`רכישה: ${formatCurrency(txn.total)}`}
                        />
                        <div
                          className="h-full bg-amber-500/60"
                          style={{ width: `${totalAllCosts > 0 ? Math.round((totalHolding / totalAllCosts) * 100) : 0}%` }}
                          title={`החזקה: ${formatCurrency(totalHolding)}`}
                        />
                        <div
                          className="h-full bg-red-500/60"
                          style={{ width: `${totalAllCosts > 0 ? Math.round((exit.totalExit / totalAllCosts) * 100) : 0}%` }}
                          title={`יציאה: ${formatCurrency(exit.totalExit)}`}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-[9px] text-slate-600">
                        <span>🔵 רכישה</span>
                        <span>🟡 החזקה</span>
                        <span>🔴 יציאה</span>
                      </div>
                    </div>

                    <p className="text-[9px] text-slate-600 mt-3 leading-relaxed">
                      * אומדנים בלבד. המחירים והמיסים בפועל תלויים בנסיבות ספציפיות. יש להתייעץ עם רו״ח ועו״ד.
                    </p>
                  </div>
                )
              })()}

              {/* Neighborhood Radar */}
              <WidgetErrorBoundary name="רדאר שכונתי">
                <Suspense fallback={<SectionSkeleton height="h-48" />}>
                  <NeighborhoodRadar
                    distanceToSea={distanceToSea}
                    distanceToPark={distanceToPark}
                    distanceToHospital={distanceToHospital}
                    roi={roi}
                    investmentScore={calcInvestmentScore(plot)}
                  />
                </Suspense>
              </WidgetErrorBoundary>

              {/* Mortgage Calculator */}
              <MortgageCalcSection totalPrice={totalPrice} />

              {/* Investment Benchmark — compare CAGR vs alternative investments */}
              <WidgetErrorBoundary name="השוואת השקעות">
                <Suspense fallback={<SectionSkeleton height="h-44" />}>
                  <InvestmentBenchmark
                    totalPrice={totalPrice}
                    projectedValue={projectedValue}
                    readinessEstimate={readiness}
                    className="mt-4"
                  />
                </Suspense>
              </WidgetErrorBoundary>
            </div>
          </div>

          {/* Similar Plots — lightweight: uses server-side geo-proximity API */}
          <div id="section-similar">
            <SimilarPlotsSection plotId={id} onNearbyLoaded={handleNearbyLoaded} />
          </div>

          {/* Quick Inquiry Templates — pre-built WhatsApp messages for common investor questions */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-6 mb-20">
            <WidgetErrorBoundary name="תבניות פנייה">
              <Suspense fallback={<SectionSkeleton height="h-28" />}>
                <QuickInquiryTemplates plot={plot} />
              </Suspense>
            </WidgetErrorBoundary>
          </div>

          {/* Sticky CTA — enhanced with print, share, compare, and map actions (like Madlan/Yad2 bottom bars) */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-navy/90 backdrop-blur-xl border-t border-white/10 px-4 py-3">
            <div className="max-w-4xl mx-auto flex gap-2">
              <button
                onClick={() => setIsLeadModalOpen(true)}
                className="flex-1 py-3.5 bg-gradient-to-r from-gold via-gold-bright to-gold rounded-2xl text-navy font-extrabold text-base shadow-lg shadow-gold/30 hover:shadow-xl transition-all"
              >
                צור קשר לפרטים מלאים
              </button>
              <a
                href={plotInquiryLink(plot)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 sm:w-14 flex items-center justify-center bg-[#25D366] rounded-2xl hover:bg-[#20BD5A] transition-all shadow-lg shadow-[#25D366]/20"
                aria-label="צור קשר ב-WhatsApp"
              >
                <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </a>
              <button
                onClick={() => toggleCompare(id)}
                className={`w-12 sm:w-14 flex items-center justify-center border rounded-2xl transition-all ${
                  compareIds.includes(id)
                    ? 'bg-purple-600/30 border-purple-500/50'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-purple-500/30'
                }`}
                aria-label={compareIds.includes(id) ? 'הסר מהשוואה' : 'הוסף להשוואה'}
                title={compareIds.includes(id) ? 'בהשוואה ✓' : 'הוסף להשוואה'}
              >
                <BarChart className={`w-5 h-5 ${compareIds.includes(id) ? 'text-purple-300' : 'text-slate-400'}`} />
              </button>
              <button
                onClick={handlePrintReport}
                className="w-12 sm:w-14 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-gold/20 transition-all"
                aria-label="הדפס דו״ח השקעה"
                title="הדפס דו״ח השקעה (PDF)"
              >
                <Printer className="w-5 h-5 text-slate-400" />
              </button>
              <button
                onClick={handleCopyLink}
                className={`w-12 sm:w-14 flex items-center justify-center border rounded-2xl transition-all ${
                  linkCopied
                    ? 'bg-green-500/15 border-green-500/30'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-gold/20'
                }`}
                aria-label="העתק קישור"
                title="העתק קישור לחלקה"
              >
                {linkCopied
                  ? <Check className="w-5 h-5 text-green-400" />
                  : <Copy className="w-5 h-5 text-slate-400" />
                }
              </button>
              {/* Copy Investment Card — rich formatted summary for WhatsApp/email sharing.
                  Investors frequently share plot info with partners/attorneys/accountants.
                  A structured card with key metrics is more useful than a bare URL. */}
              <button
                onClick={handleCopyInvestmentCard}
                className="hidden sm:flex w-14 items-center justify-center bg-white/5 border border-white/10 rounded-2xl hover:bg-gold/10 hover:border-gold/20 transition-all"
                aria-label="העתק כרטיס השקעה"
                title="העתק כרטיס השקעה (מפורט) לשיתוף"
              >
                <FileText className="w-5 h-5 text-slate-400" />
              </button>
              <button
                onClick={() => navigate(`/?plot=${id}`)}
                className="w-12 sm:w-14 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-gold/20 transition-all"
                aria-label="הצג במפה"
                title="הצג במפה (עם סימון החלקה)"
              >
                <MapPin className="w-5 h-5 text-gold" />
              </button>
            </div>
            {/* Compare count indicator — shows when plots are in compare list */}
            {compareIds.length > 0 && (
              <div className="max-w-4xl mx-auto mt-2">
                <Link
                  to="/compare"
                  className="flex items-center justify-center gap-2 py-2 bg-purple-600/20 border border-purple-500/30 rounded-xl text-purple-300 text-sm font-medium hover:bg-purple-600/30 transition-colors"
                >
                  <GitCompareArrows className="w-4 h-4" />
                  השווה {compareIds.length} חלקות
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Disclaimer — legal compliance + trust signal.
          Shows government data sources (nadlan.gov.il, govmap.gov.il, tabu.gov.il),
          investment warning, and data accuracy notice. Required for credibility with
          professional investors and legal protection. Like Madlan's footer disclaimers
          but more prominent and detailed — builds trust through transparency. */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <Suspense fallback={null}>
          <WidgetErrorBoundary name="DataDisclaimer" silent>
            <DataDisclaimer variant="compact" lastUpdate={plot.updated_at ? new Date(plot.updated_at ?? plot.updatedAt).toLocaleDateString('he-IL') : null} />
          </WidgetErrorBoundary>
        </Suspense>
      </div>

      {/* Public footer — legal links, contact info, brand.
          Previously missing on PlotDetail, the longest page on the site.
          Every Madlan/Yad2 property page has a footer with Terms/Privacy links.
          Critical for legal compliance and UX completeness — users who scroll
          the entire page need clear navigation back to important pages. */}
      <PublicFooter />

      {/* Floating navigation: Back-to-Map + Scroll-to-top.
          Back-to-Map preserves the map viewport position via URL hash (#map=zoom/lat/lng).
          This is a UX pattern from Madlan/Yad2 — users can deep-dive into a plot and seamlessly
          return to exactly where they were on the map, preserving all filters and position. */}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 animate-fade-in">
        {/* Back to Map — always visible. Uses navigate(-1) to preserve map hash + filters.
            Falls back to /?plot=id if no history (e.g., direct link). */}
        <button
          onClick={() => window.history.length > 2 ? navigate(-1) : navigate(`/?plot=${id}`)}
          className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center hover:bg-blue-500/30 transition-all shadow-lg backdrop-blur-sm group"
          aria-label="חזרה למפה"
          title="חזרה למפה"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 group-hover:text-blue-300">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
          </svg>
        </button>

        {/* Scroll-to-top — appears when scrolled down */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="w-10 h-10 rounded-xl bg-gold/20 border border-gold/30 flex items-center justify-center hover:bg-gold/30 transition-all shadow-lg backdrop-blur-sm"
            aria-label="חזרה למעלה"
          >
            <ArrowUp className="w-4 h-4 text-gold" />
          </button>
        )}
      </div>

      {/* Mobile sticky CTA bar — like Madlan/Yad2's bottom action bar on property pages.
          Keeps WhatsApp/Call/Share buttons visible while scrolling through long detail pages.
          Only visible on mobile (sm:hidden inside the component). Huge conversion driver. */}
      <Suspense fallback={null}>
        <MobilePlotActionBar
          plot={plot}
          isFavorite={favorites?.favorites?.includes(id)}
          onToggleFavorite={favorites?.toggle}
        />
      </Suspense>

      <Suspense fallback={null}>
        <LeadModal
          isOpen={isLeadModalOpen}
          onClose={() => setIsLeadModalOpen(false)}
          plot={plot}
        />
      </Suspense>

      {images.length > 0 && (
        <Suspense fallback={null}>
          <ImageLightbox
            images={images}
            initialIndex={lightboxIndex}
            isOpen={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <BackToTopButton />
      </Suspense>
    </div>
  )
}
