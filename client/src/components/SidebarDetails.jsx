import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { X, MapPin, TrendingUp, Waves, TreePine, Hospital, Shield, CheckCircle2, BarChart3, FileText, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Award, DollarSign, AlertTriangle, Building2, Hourglass, Phone, MessageCircle, Share2, Copy, Check, Heart, BarChart, Image as ImageIcon, Download, File, FileImage, FileSpreadsheet, Printer, ExternalLink, Eye, Navigation } from 'lucide-react'
import ShareMenu from './ui/ShareMenu'
import ImageLightbox from './ui/ImageLightbox'
import PriceTrendChart from './ui/PriceTrendChart'
import { statusColors, statusLabels, zoningLabels, zoningPipelineStages, roiStages } from '../utils/constants'
import { formatCurrency, formatDunam, calcInvestmentScore, getScoreLabel, calcCAGR } from '../utils/formatters'
import AnimatedNumber from './ui/AnimatedNumber'
import { usePlot, useNearbyPlots } from '../hooks/usePlots'
import MiniMap from './ui/MiniMap'
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

function CollapsibleSection({ number, icon, title, children, animClass = '' }) {
  const [isOpen, setIsOpen] = useState(true)
  const contentRef = useRef(null)
  const [maxHeight, setMaxHeight] = useState('2000px')

  useEffect(() => {
    if (!contentRef.current) return
    const target = isOpen ? `${contentRef.current.scrollHeight + 20}px` : '0px'
    if (target !== maxHeight) setMaxHeight(target)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={animClass}>
      <div
        className="section-header"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="section-number">{number}</span>
        <SectionIcon icon={icon} />
        <h3 className="text-base font-bold text-slate-100 flex-1">{title}</h3>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 section-chevron ${!isOpen ? 'collapsed' : ''}`}
        />
      </div>
      <div
        ref={contentRef}
        className="section-collapse"
        style={{ maxHeight: isOpen ? maxHeight : '0px', opacity: isOpen ? 1 : 0 }}
      >
        <div className="pb-2">{children}</div>
      </div>
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
  // Use geo-proximity API for nearby plots (like Madlan's "נכסים באזור")
  const { data: nearbyPlots } = useNearbyPlots(currentPlot?.id)

  // Fallback to client-side similarity if API returns nothing
  const similar = useMemo(() => {
    if (nearbyPlots && nearbyPlots.length > 0) return nearbyPlots

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
        return { ...p, score: priceDiff + sizeDiff + cityBonus }
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
  }, [currentPlot?.id, allPlots, nearbyPlots])

  if (similar.length === 0) return null

  const hasDistance = similar[0]?.distance_km != null

  return (
    <div className="mt-4 mb-2">
      <h4 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2">
        <span className="w-5 h-5 rounded bg-gold/15 flex items-center justify-center text-[10px]">📍</span>
        {hasDistance ? 'חלקות בסביבה' : 'חלקות דומות'}
      </h4>
      <div className="space-y-2">
        {similar.map(p => {
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
                  {p.distance_km != null && (
                    <span className="text-blue-400">· {p.distance_km < 1 ? `${Math.round(p.distance_km * 1000)}מ׳` : `${p.distance_km} ק״מ`}</span>
                  )}
                </div>
              </div>
              <div className="text-left flex-shrink-0">
                <div className="text-xs font-bold text-gold">{formatCurrency(price)}</div>
                <div className="text-[10px] text-emerald-400">+{roi}%</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function NeighborhoodRadar({ distanceToSea, distanceToPark, distanceToHospital, roi, investmentScore }) {
  // Convert distances to 0-10 scores (closer = better)
  const seaScore = distanceToSea != null ? Math.max(0, Math.min(10, 10 - distanceToSea / 500)) : null
  const parkScore = distanceToPark != null ? Math.max(0, Math.min(10, 10 - distanceToPark / 300)) : null
  const hospitalScore = distanceToHospital != null ? Math.max(0, Math.min(10, 10 - distanceToHospital / 1000)) : null
  const roiScore = Math.max(0, Math.min(10, roi / 30))
  const invScore = investmentScore || 5

  const dimensions = [
    { label: '🌊 ים', score: seaScore },
    { label: '🌳 פארק', score: parkScore },
    { label: '🏥 בי״ח', score: hospitalScore },
    { label: '📈 ROI', score: roiScore },
    { label: '⭐ השקעה', score: invScore },
  ].filter(d => d.score != null)

  if (dimensions.length < 3) return null

  const cx = 80, cy = 80, r = 60
  const n = dimensions.length
  const angleStep = (2 * Math.PI) / n
  const startAngle = -Math.PI / 2

  const getPoint = (i, val) => {
    const angle = startAngle + i * angleStep
    const dist = (val / 10) * r
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) }
  }

  const gridLevels = [2, 4, 6, 8, 10]
  const overallScore = Math.round(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length * 10) / 10

  return (
    <div className="bg-navy-light/40 border border-white/5 rounded-xl p-4 mb-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-200">ציון כולל</span>
        </div>
        <span className={`text-lg font-black ${overallScore >= 7 ? 'text-emerald-400' : overallScore >= 4 ? 'text-gold' : 'text-orange-400'}`}>
          {overallScore}/10
        </span>
      </div>
      <svg viewBox="0 0 160 160" className="w-full max-w-[200px] mx-auto">
        {/* Grid */}
        {gridLevels.map(level => {
          const points = Array.from({ length: n }, (_, i) => {
            const p = getPoint(i, level)
            return `${p.x},${p.y}`
          }).join(' ')
          return <polygon key={level} points={points} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        })}
        {/* Axis lines */}
        {dimensions.map((_, i) => {
          const p = getPoint(i, 10)
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
        })}
        {/* Data polygon */}
        <polygon
          points={dimensions.map((d, i) => { const p = getPoint(i, d.score); return `${p.x},${p.y}` }).join(' ')}
          fill="rgba(200,148,42,0.15)"
          stroke="#C8942A"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Data points */}
        {dimensions.map((d, i) => {
          const p = getPoint(i, d.score)
          return <circle key={i} cx={p.x} cy={p.y} r="3" fill="#C8942A" stroke="#1a1a2e" strokeWidth="1" />
        })}
        {/* Labels */}
        {dimensions.map((d, i) => {
          const p = getPoint(i, 12.5)
          return (
            <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="text-[8px] fill-slate-400">
              {d.label}
            </text>
          )
        })}
      </svg>
      {/* Score bars */}
      <div className="space-y-1.5 mt-3">
        {dimensions.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 w-12 text-left flex-shrink-0">{d.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(d.score / 10) * 100}%`,
                  background: d.score >= 7 ? '#22C55E' : d.score >= 4 ? '#C8942A' : '#F59E0B',
                }}
              />
            </div>
            <span className="text-[10px] text-slate-400 w-6 text-right">{d.score.toFixed(1)}</span>
          </div>
        ))}
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

export default function SidebarDetails({ plot: rawPlot, onClose, onOpenLeadModal, favorites, compareIds = [], onToggleCompare, allPlots = [], onSelectPlot }) {
  // Enrich plot data: fetch full plot when images/documents are missing (e.g. from list endpoint)
  const needsEnrich = rawPlot && !rawPlot.plot_images && !rawPlot.plot_documents
  const { data: enrichedPlot, isLoading: isEnriching } = usePlot(needsEnrich ? rawPlot.id : null)
  const plot = useMemo(() => {
    return needsEnrich && enrichedPlot ? { ...rawPlot, ...enrichedPlot } : rawPlot
  }, [needsEnrich, enrichedPlot, rawPlot])

  const scrollRef = useRef(null)
  const panelRef = useRef(null)
  const [scrollShadow, setScrollShadow] = useState({ top: false, bottom: false })
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Swipe-to-close gesture for mobile (swipe right in RTL = close)
  const swipeRef = useRef({ startX: 0, startY: 0, swiping: false, translateX: 0 })
  const [swipeOffset, setSwipeOffset] = useState(0)

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0]
    swipeRef.current = { startX: touch.clientX, startY: touch.clientY, swiping: false, translateX: 0 }
  }, [])

  const handleTouchMove = useCallback((e) => {
    const touch = e.touches[0]
    const state = swipeRef.current
    const dx = touch.clientX - state.startX
    const dy = touch.clientY - state.startY

    // Only activate swipe if horizontal movement dominates
    if (!state.swiping && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      state.swiping = true
    }

    if (state.swiping && dx < 0) {
      // RTL: swiping left = pulling panel away (negative dx)
      // LTR sidebar on right: swiping right = closing (positive dx)
      // Since sidebar is on the right in RTL, swipe-right (positive dx in screen coords) = close
      // Actually in RTL, the panel slides from the right. Swiping right (positive dx) should close it.
    }

    if (state.swiping) {
      // Only allow swiping in the "close" direction (right, positive dx)
      const offset = Math.max(0, dx)
      state.translateX = offset
      setSwipeOffset(offset)
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    const state = swipeRef.current
    if (state.swiping && state.translateX > 80) {
      // Threshold reached — close the sidebar
      setSwipeOffset(0)
      onClose()
    } else {
      setSwipeOffset(0)
    }
    swipeRef.current = { startX: 0, startY: 0, swiping: false, translateX: 0 }
  }, [onClose])

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
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[50]"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="sidebar-panel fixed top-0 right-0 h-full w-full sm:w-[420px] md:w-[480px] max-w-full z-[60] bg-navy border-l border-white/10 shadow-2xl flex flex-col overflow-hidden sm:animate-slide-in-right"
        dir="rtl"
        style={swipeOffset > 0 ? { transform: `translateX(${swipeOffset}px)`, transition: 'none' } : undefined}
      >
        {/* Gold accent bar */}
        <div
          className="h-[3px] flex-shrink-0"
          style={{ background: 'linear-gradient(90deg, #C8942A, #E5B94E, #F0D078, #E5B94E, #C8942A)' }}
        />

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
          <div className="flex justify-between items-start p-5 pb-3">
          <div>
            <h2 className="text-2xl font-black">
              <span className="bg-gradient-to-r from-gold to-gold-bright bg-clip-text text-transparent">גוש</span>
              {' '}{blockNumber}{' | '}
              <span className="bg-gradient-to-r from-gold to-gold-bright bg-clip-text text-transparent">חלקה</span>
              {' '}{plot.number}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
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
              {/* Status badge */}
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
              {/* Investment score badge */}
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
              {/* View count badge — social proof like Madlan */}
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
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:rotate-90 transition-all duration-300 flex items-center justify-center"
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

          <div className="px-6 pb-6">
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
              <PriceTrendChart totalPrice={totalPrice} sizeSqM={sizeSqM} city={plot.city} />

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
              {/* Quick Investment Summary */}
              <div className="bg-gradient-to-r from-gold/5 to-gold/10 border border-gold/20 rounded-xl p-3 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-gold" />
                  <span className="text-xs font-medium text-slate-200">סיכום השקעה</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">רווח צפוי (ברוטו)</span>
                    <span className="text-emerald-400 font-medium">{formatCurrency(projectedValue - totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">רווח צפוי (נטו, אחרי היטל)</span>
                    <span className="text-emerald-400 font-medium">{formatCurrency(Math.round((projectedValue - totalPrice) * 0.5))}</span>
                  </div>
                  {readinessEstimate && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">זמן החזר משוער</span>
                      <span className="text-gold font-medium">{readinessEstimate}</span>
                    </div>
                  )}
                  <div className="h-px bg-white/5 my-1" />
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300">תשואה שנתית משוערת</span>
                    <span className="text-gold">
                      {(() => {
                        const years = readinessEstimate?.includes('1-3') ? 2 : readinessEstimate?.includes('3-5') ? 4 : readinessEstimate?.includes('5+') ? 6 : 3
                        return `~${Math.round(roi / years)}%`
                      })()}
                    </span>
                  </div>
                </div>
              </div>
              {/* Mini Mortgage Calculator */}
              <MiniMortgageCalc totalPrice={totalPrice} />
            </CollapsibleSection>

            {/* ROI Stages - Appreciation Path */}
            <CollapsibleSection
              number={`0${++sectionNum}`}
              icon={BarChart3}
              title="צפי השבחה לפי שלבי תכנון"
              animClass="animate-stagger-7"
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

            {/* Neighborhood Quality Score */}
            {(distanceToSea != null || distanceToPark != null || distanceToHospital != null) && (
              <CollapsibleSection
                number={`0${++sectionNum}`}
                icon={Shield}
                title="ציון איכות סביבה"
              >
                <NeighborhoodRadar
                  distanceToSea={distanceToSea}
                  distanceToPark={distanceToPark}
                  distanceToHospital={distanceToHospital}
                  roi={roi}
                  investmentScore={calcInvestmentScore(plot)}
                />
              </CollapsibleSection>
            )}

            {/* Similar Plots */}
            <SimilarPlots currentPlot={plot} allPlots={allPlots} onSelectPlot={onSelectPlot} />
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
              className="flex-shrink-0 w-14 py-3.5 flex items-center justify-center bg-[#25D366] rounded-2xl hover:bg-[#20BD5A] hover:-translate-y-px transition-all duration-300 shadow-lg shadow-[#25D366]/20"
              title="WhatsApp"
            >
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
          </div>
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={handlePrintReport}
              className="flex-shrink-0 w-11 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-gold/20 transition-all"
              title="הדפס דו״ח השקעה"
            >
              <Printer className="w-4 h-4 text-slate-400 hover:text-gold" />
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
