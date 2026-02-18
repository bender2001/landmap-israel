import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { ArrowRight, ArrowUp, MapPin, TrendingUp, Clock, Waves, TreePine, Hospital, CheckCircle2, DollarSign, Hourglass, Heart, Share2, MessageCircle } from 'lucide-react'
import { usePlot, useAllPlots } from '../../hooks/usePlots.js'
import { useFavorites } from '../../hooks/useFavorites.js'
import { useViewTracker } from '../../hooks/useViewTracker.js'
import LeadModal from '../../components/LeadModal.jsx'
import ShareMenu from '../../components/ui/ShareMenu.jsx'
import ImageLightbox from '../../components/ui/ImageLightbox.jsx'
import PublicNav from '../../components/PublicNav.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import NeighborhoodRadar from '../../components/ui/NeighborhoodRadar.jsx'
import { statusColors, statusLabels, zoningLabels, zoningPipelineStages, roiStages } from '../../utils/constants.js'
import { formatCurrency, formatDunam, formatPriceShort, calcInvestmentScore, formatRelativeTime, getFreshnessColor } from '../../utils/formatters.js'
import PriceTrendChart from '../../components/ui/PriceTrendChart.jsx'
import MiniMap from '../../components/ui/MiniMap.jsx'
import { plotInquiryLink } from '../../utils/config.js'

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

function SimilarPlotsSection({ currentPlot, allPlots }) {
  const similar = useMemo(() => {
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
        return { ...p, _score: priceDiff + sizeDiff + cityBonus }
      })
      .sort((a, b) => a._score - b._score)
      .slice(0, 4)
  }, [currentPlot?.id, allPlots])

  if (similar.length === 0) return null

  return (
    <div className="mb-8">
      <h2 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center text-sm">🔗</span>
        חלקות דומות
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {similar.map(p => {
          const bn = p.block_number ?? p.blockNumber
          const price = p.total_price ?? p.totalPrice
          const projValue = p.projected_value ?? p.projectedValue
          const sizeSqM = p.size_sqm ?? p.sizeSqM
          const roi = price > 0 ? Math.round((projValue - price) / price * 100) : 0
          const color = statusColors[p.status]
          return (
            <Link
              key={p.id}
              to={`/plot/${p.id}`}
              className="bg-navy-light/40 border border-white/5 rounded-2xl p-4 hover:border-gold/20 transition-all group"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: color }} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-200 truncate">גוש {bn} | חלקה {p.number}</div>
                  <div className="text-xs text-slate-500">{p.city} · {formatDunam(sizeSqM)} דונם</div>
                </div>
              </div>
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
        })}
      </div>
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
    <div className="bg-navy-light/40 border border-white/5 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-4 h-4 text-gold" />
        <h2 className="text-base font-bold text-slate-100">מחשבון מימון</h2>
      </div>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>הון עצמי</span>
            <span className="text-gold font-medium">{equity}% ({formatCurrency(Math.round(totalPrice * equity / 100))})</span>
          </div>
          <input type="range" min="20" max="100" step="5" value={equity}
            onChange={(e) => setEquity(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-gold cursor-pointer" />
        </div>
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>תקופה</span>
            <span className="text-slate-300 font-medium">{years} שנים</span>
          </div>
          <input type="range" min="5" max="30" step="1" value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-gold cursor-pointer" />
        </div>
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>ריבית</span>
            <span className="text-slate-300 font-medium">{rate}%</span>
          </div>
          <input type="range" min="2" max="8" step="0.25" value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-gold cursor-pointer" />
        </div>
        {equity < 100 && (
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/5">
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
  const { data: allPlots = [] } = useAllPlots({})
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const favorites = useFavorites()
  const { trackView } = useViewTracker()

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
      // OG image from first plot image — improves social sharing like Madlan
      const images = plot.plot_images || []
      if (images.length > 0 && images[0].url) {
        setMeta('property', 'og:image', images[0].url)
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

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-navy">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-12 h-12 text-gold" />
          <span className="text-sm text-slate-400">טוען פרטי חלקה...</span>
        </div>
      </div>
    )
  }

  if (error || !plot) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-navy" dir="rtl">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="text-6xl">🏗️</div>
          <h1 className="text-xl font-bold text-slate-200">חלקה לא נמצאה</h1>
          <p className="text-sm text-slate-400">ייתכן שהחלקה הוסרה או שהקישור שגוי</p>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-6 py-2.5 bg-gold/20 border border-gold/30 rounded-xl text-gold text-sm hover:bg-gold/30 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה למפה
          </button>
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
      <JsonLdSchema plot={plot} />
      <BreadcrumbSchema plot={plot} />

      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(200,148,42,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(200,148,42,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
            <button onClick={() => navigate('/')} className="hover:text-gold transition-colors">מפת קרקעות</button>
            <span>/</span>
            <button onClick={() => navigate(`/?city=${plot.city}`)} className="hover:text-gold transition-colors">{plot.city}</button>
            <span>/</span>
            <span className="text-slate-300">גוש {blockNumber} חלקה {plot.number}</span>
          </nav>

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
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => favorites.toggle(plot.id)}
                className={`w-10 h-10 rounded-xl border transition-all flex items-center justify-center ${
                  favorites.isFavorite(plot.id) ? 'bg-red-500/15 border-red-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <Heart className={`w-4 h-4 ${favorites.isFavorite(plot.id) ? 'text-red-400 fill-red-400' : 'text-slate-400'}`} />
              </button>
              <ShareMenu
                plotTitle={`גוש ${blockNumber} חלקה ${plot.number} - ${plot.city}`}
                plotPrice={formatCurrency(totalPrice)}
                plotUrl={window.location.href}
              />
            </div>
          </div>

          {/* Images gallery */}
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
                    alt={img.alt || `תמונה ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    style={{ aspectRatio: i === 0 ? '16/9' : '1/1' }}
                    loading={i === 0 ? 'eager' : 'lazy'}
                  />
                </button>
              ))}
            </div>
          )}

          {/* Location mini-map — like Madlan always shows location context */}
          {plot.coordinates && plot.coordinates.length >= 3 && (
            <div className="mb-8">
              <h2 className="text-base font-bold text-slate-100 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gold" />
                מיקום החלקה
              </h2>
              <MiniMap
                coordinates={plot.coordinates}
                status={plot.status}
                city={plot.city}
                height="280px"
                interactive={true}
              />
            </div>
          )}

          {/* Financial cards grid */}
          <div className="grid grid-cols-3 gap-4 mb-8">
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

          {/* Price trend chart — like Madlan area trends */}
          <div className="mb-8">
            <PriceTrendChart totalPrice={totalPrice} sizeSqM={sizeSqM} city={plot.city} plotId={plot.id} />
          </div>

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
              <div className="bg-navy-light/40 border border-white/5 rounded-2xl p-5">
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

              {/* Associated costs */}
              <div className="bg-navy-light/40 border border-white/5 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4 text-gold" />
                  <h2 className="text-base font-bold text-slate-100">עלויות נלוות משוערות</h2>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-slate-400">מס רכישה (6%)</span><span className="text-slate-300">{formatCurrency(Math.round(totalPrice * 0.06))}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">שכ"ט עו"ד (~1.5%+מע"מ)</span><span className="text-slate-300">{formatCurrency(Math.round(totalPrice * 0.0175))}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">היטל השבחה משוער</span><span className="text-slate-300">{formatCurrency(Math.round((projectedValue - totalPrice) * 0.5))}</span></div>
                  {(() => {
                    const gp = projectedValue - totalPrice
                    const costs = Math.round(totalPrice * 0.0775)
                    const betterment = Math.round(gp * 0.5)
                    const taxable = Math.max(0, gp - betterment - costs)
                    const capGains = Math.round(taxable * 0.25)
                    return (
                      <div className="flex justify-between text-sm"><span className="text-slate-400">מס שבח (25%)</span><span className="text-slate-300">{formatCurrency(capGains)}</span></div>
                    )
                  })()}
                  <div className="h-px bg-white/5 my-1" />
                  <div className="flex justify-between text-sm font-medium"><span className="text-slate-300">סה"כ עלות כוללת</span><span className="text-gold">{formatCurrency(Math.round(totalPrice * 1.0775))}</span></div>
                </div>
              </div>

              {/* Neighborhood Radar */}
              <NeighborhoodRadar
                distanceToSea={distanceToSea}
                distanceToPark={distanceToPark}
                distanceToHospital={distanceToHospital}
                roi={roi}
                investmentScore={calcInvestmentScore(plot)}
              />

              {/* Mortgage Calculator */}
              <MortgageCalcSection totalPrice={totalPrice} />
            </div>
          </div>

          {/* Similar Plots */}
          <SimilarPlotsSection currentPlot={plot} allPlots={allPlots} />

          {/* Sticky CTA */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-navy/90 backdrop-blur-xl border-t border-white/10 px-4 py-3">
            <div className="max-w-4xl mx-auto flex gap-3">
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
                className="w-14 flex items-center justify-center bg-[#25D366] rounded-2xl hover:bg-[#20BD5A] transition-all shadow-lg shadow-[#25D366]/20"
              >
                <MessageCircle className="w-6 h-6 text-white" />
              </a>
              <button
                onClick={() => navigate('/')}
                className="w-14 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all"
              >
                <MapPin className="w-5 h-5 text-gold" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll-to-top button — appears when scrolled down */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 right-4 z-50 w-10 h-10 rounded-xl bg-gold/20 border border-gold/30 flex items-center justify-center hover:bg-gold/30 transition-all shadow-lg backdrop-blur-sm animate-fade-in"
          aria-label="חזרה למעלה"
        >
          <ArrowUp className="w-4 h-4 text-gold" />
        </button>
      )}

      <LeadModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        plot={plot}
      />

      {images.length > 0 && (
        <ImageLightbox
          images={images}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  )
}
