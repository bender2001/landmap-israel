import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { X, MapPin, TrendingUp, Waves, TreePine, Hospital, Shield, CheckCircle2, BarChart3, FileText, ChevronDown, Clock, Award, DollarSign, AlertTriangle, Building2, Hourglass, Phone, MessageCircle, Share2, Copy, Check, Heart, BarChart, Image as ImageIcon, Download, File, FileImage, FileSpreadsheet } from 'lucide-react'
import ShareMenu from './ui/ShareMenu'
import ImageLightbox from './ui/ImageLightbox'
import { statusColors, statusLabels, zoningLabels, zoningPipelineStages, roiStages } from '../utils/constants'
import { formatCurrency } from '../utils/formatters'
import AnimatedNumber from './ui/AnimatedNumber'
import { usePlot } from '../hooks/usePlots'

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

// Snap points as % of viewport height (from bottom)
const SNAP_PEEK = 35   // title + key info peek
const SNAP_MID = 75    // default open
const SNAP_FULL = 95   // fully expanded
const SNAPS = [SNAP_PEEK, SNAP_MID, SNAP_FULL]

function isMobile() {
  return typeof window !== 'undefined' && window.innerWidth < 640
}

export default function SidebarDetails({ plot: rawPlot, onClose, onOpenLeadModal, favorites }) {
  // Enrich plot data: fetch full plot when images/documents are missing (e.g. from list endpoint)
  const needsEnrich = rawPlot && !rawPlot.plot_images && !rawPlot.plot_documents
  const { data: enrichedPlot, isLoading: isEnriching } = usePlot(needsEnrich ? rawPlot.id : null)
  const plot = useMemo(() => {
    return needsEnrich && enrichedPlot ? { ...rawPlot, ...enrichedPlot } : rawPlot
  }, [needsEnrich, enrichedPlot, rawPlot])

  const scrollRef = useRef(null)
  const panelRef = useRef(null)
  const dragRef = useRef({ startY: 0, startSnap: SNAP_MID, isDragging: false, velocity: 0, lastY: 0, lastTime: 0 })
  const [scrollShadow, setScrollShadow] = useState({ top: false, bottom: false })
  const [linkCopied, setLinkCopied] = useState(false)
  const [sheetSnap, setSheetSnap] = useState(SNAP_PEEK) // start at peek
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Animate to mid after mount on mobile
  useEffect(() => {
    if (plot && isMobile()) {
      // Start at peek, then animate to mid after a short delay
      setSheetSnap(SNAP_PEEK)
      const t = setTimeout(() => setSheetSnap(SNAP_MID), 50)
      return () => clearTimeout(t)
    }
  }, [plot?.id])

  // Set sheet height via CSS custom property
  useEffect(() => {
    if (panelRef.current && isMobile()) {
      panelRef.current.style.height = `${sheetSnap}vh`
    }
  }, [sheetSnap])

  // Mobile drag with velocity + multi-snap
  const handleDragStart = useCallback((e) => {
    if (!isMobile()) return
    const touch = e.touches[0]
    dragRef.current = {
      startY: touch.clientY,
      startSnap: sheetSnap,
      isDragging: true,
      velocity: 0,
      lastY: touch.clientY,
      lastTime: Date.now(),
    }
    if (panelRef.current) panelRef.current.style.transition = 'none'
  }, [sheetSnap])

  const handleDragMove = useCallback((e) => {
    if (!dragRef.current.isDragging || !panelRef.current) return
    const touch = e.touches[0]
    const now = Date.now()
    const dt = now - dragRef.current.lastTime
    if (dt > 0) {
      dragRef.current.velocity = (dragRef.current.lastY - touch.clientY) / dt // positive = dragging up
    }
    dragRef.current.lastY = touch.clientY
    dragRef.current.lastTime = now

    const deltaY = touch.clientY - dragRef.current.startY
    const deltaPct = (deltaY / window.innerHeight) * 100
    const newHeight = Math.max(10, Math.min(98, dragRef.current.startSnap - deltaPct))
    panelRef.current.style.height = `${newHeight}vh`
  }, [])

  const handleDragEnd = useCallback(() => {
    if (!dragRef.current.isDragging || !panelRef.current) return
    dragRef.current.isDragging = false

    const currentHeight = (panelRef.current.getBoundingClientRect().height / window.innerHeight) * 100
    const vel = dragRef.current.velocity // positive = up, negative = down

    // If fast fling down below peek → dismiss
    if (vel < -0.8 && currentHeight < SNAP_PEEK + 5) {
      panelRef.current.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease'
      panelRef.current.style.height = '0vh'
      panelRef.current.style.opacity = '0'
      setTimeout(onClose, 300)
      return
    }

    // Find nearest snap, biased by velocity
    const biased = currentHeight + vel * 40
    let bestSnap = SNAPS[0]
    let bestDist = Math.abs(biased - SNAPS[0])
    for (const s of SNAPS) {
      const d = Math.abs(biased - s)
      if (d < bestDist) { bestDist = d; bestSnap = s }
    }

    panelRef.current.style.transition = 'height 0.35s cubic-bezier(0.32, 0.72, 0, 1)'
    panelRef.current.style.height = `${bestSnap}vh`
    setSheetSnap(bestSnap)
  }, [onClose])

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const top = scrollTop > 10
    const bottom = scrollTop + clientHeight < scrollHeight - 10
    setScrollShadow(prev => {
      if (prev.top === top && prev.bottom === bottom) return prev
      return { top, bottom }
    })
  }, [])

  useEffect(() => {
    handleScroll()
  }, [plot, handleScroll])

  if (!plot) return null

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
      >
        {/* Mobile drag handle (visual only — drag events on header zone below) */}
        <div className="sidebar-drag-handle">
          <div className="sidebar-drag-handle-bar" />
        </div>

        {/* Gold accent bar */}
        <div
          className="h-[3px] flex-shrink-0"
          style={{ background: 'linear-gradient(90deg, #C8942A, #E5B94E, #F0D078, #E5B94E, #C8942A)' }}
        />

        {/* Draggable header zone (drag handle + preview + title) */}
        <div
          className="sidebar-header-drag-zone flex-shrink-0"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          {/* Map preview area */}
          <div className="h-36 bg-navy-mid relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'linear-gradient(rgba(200,148,42,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(200,148,42,0.3) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-gold animate-pulse-gold" />
              <span className="text-xs text-gold/80 mt-2">
                גוש {blockNumber} | {plot.city}
              </span>
            </div>
            <div className="absolute bottom-0 w-full h-12 bg-gradient-to-t from-navy to-transparent" />

            {/* Mobile: tap-to-expand hint */}
            <div className="sidebar-expand-hint">
              <ChevronDown className="w-4 h-4 text-gold/50 rotate-180" />
              <span>גרור למעלה לפרטים</span>
            </div>
          </div>

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
                {sizeSqM.toLocaleString()} מ&quot;ר
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

              {/* Associated Costs */}
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
          </div>
        </div>

        {/* Sticky CTA footer */}
        <div className="sidebar-cta-footer">
          <button
            onClick={onOpenLeadModal}
            className="cta-shimmer relative overflow-hidden w-full py-3.5 px-6 bg-gradient-to-r from-gold via-gold-bright to-gold rounded-2xl text-navy font-extrabold text-base shadow-lg shadow-gold/30 hover:shadow-xl hover:shadow-gold/40 hover:-translate-y-px transition-all duration-300"
          >
            צור קשר לפרטים מלאים
          </button>
          <div className="flex gap-2 mt-2.5">
            <ShareMenu
              plotTitle={`גוש ${blockNumber} חלקה ${plot.number} - ${plot.city}`}
              plotPrice={formatCurrency(totalPrice)}
              plotUrl={`${window.location.origin}/?plot=${plot.id}`}
              className="flex-1"
            />
            <a
              href={`/compare?plots=${plot.id}`}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 text-sm font-medium hover:bg-purple-600/30 transition-colors"
            >
              <BarChart className="w-4 h-4" />
              השווה
            </a>
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
