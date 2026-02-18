import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { ArrowRight, ArrowUp, MapPin, TrendingUp, Clock, Waves, TreePine, Hospital, CheckCircle2, DollarSign, Hourglass, Heart, Share2, MessageCircle, Printer, Copy, Check, GitCompareArrows, BarChart, ExternalLink } from 'lucide-react'
import { usePlot, useNearbyPlots, useSimilarPlots } from '../../hooks/usePlots.js'
import { useMarketOverview } from '../../hooks/useMarketOverview.js'
import { useFavorites } from '../../hooks/useFavorites.js'
import { useViewTracker } from '../../hooks/useViewTracker.js'
import LeadModal from '../../components/LeadModal.jsx'
import ShareMenu from '../../components/ui/ShareMenu.jsx'
import ImageLightbox from '../../components/ui/ImageLightbox.jsx'
import PublicNav from '../../components/PublicNav.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import NeighborhoodRadar from '../../components/ui/NeighborhoodRadar.jsx'
import { statusColors, statusLabels, zoningLabels, zoningPipelineStages, roiStages } from '../../utils/constants.js'
import { formatCurrency, formatDunam, formatPriceShort, calcInvestmentScore, getScoreLabel, formatRelativeTime, getFreshnessColor, calcCAGR, calcInvestmentVerdict } from '../../utils/formatters.js'
import PriceTrendChart from '../../components/ui/PriceTrendChart.jsx'
import MiniMap from '../../components/ui/MiniMap.jsx'
import { plotInquiryLink } from '../../utils/config.js'
import InvestmentBenchmark from '../../components/ui/InvestmentBenchmark.jsx'

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {nearbyFiltered.map(p => <PlotCard key={p.id} p={p} />)}
          </div>
        </div>
      )}
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
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const favorites = useFavorites()
  const { trackView } = useViewTracker()

  // Compare state (localStorage-backed, consistent with MapView)
  const [compareIds, setCompareIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('landmap_compare') || '[]') } catch { return [] }
  })
  useEffect(() => {
    localStorage.setItem('landmap_compare', JSON.stringify(compareIds))
  }, [compareIds])
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

      <div className="relative z-10 pt-20 pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">

          {/* Breadcrumb — uses history.back() when possible to preserve filter state from MapView */}
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6" aria-label="ניווט">
            <button
              onClick={() => window.history.length > 2 ? navigate(-1) : navigate('/')}
              className="hover:text-gold transition-colors flex items-center gap-1"
            >
              <ArrowRight className="w-3 h-3" />
              מפת קרקעות
            </button>
            <span>/</span>
            <Link to={`/?city=${plot.city}`} className="hover:text-gold transition-colors">{plot.city}</Link>
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

              {/* Investment Benchmark — compare CAGR vs alternative investments */}
              <InvestmentBenchmark
                totalPrice={totalPrice}
                projectedValue={projectedValue}
                readinessEstimate={readiness}
                className="mt-4"
              />
            </div>
          </div>

          {/* Similar Plots — lightweight: uses server-side geo-proximity API */}
          <SimilarPlotsSection plotId={id} onNearbyLoaded={handleNearbyLoaded} />

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
