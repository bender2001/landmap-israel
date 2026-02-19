import { useMemo, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { MapPin, TrendingUp, Ruler, DollarSign, ArrowLeft, ArrowRight, BarChart3, Building2, Shield, Clock, Zap, Map } from 'lucide-react'
import { useMarketOverview } from '../../hooks/useMarketOverview.js'
import { useAllPlots } from '../../hooks/usePlots.js'
import { useMetaTags } from '../../hooks/useMetaTags.js'
import { useStructuredData } from '../../hooks/useStructuredData.js'
import PublicNav from '../../components/PublicNav.jsx'
import PublicFooter from '../../components/PublicFooter.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import BackToTopButton from '../../components/ui/BackToTopButton.jsx'
import { formatCurrency, formatDunam, formatPriceShort, calcInvestmentScore, getScoreLabel, calcCAGR } from '../../utils/formatters.js'
import { statusColors, statusLabels, zoningLabels } from '../../utils/constants.js'

/**
 * City-specific SEO landing page — like Madlan's /hadera, /netanya pages.
 * Dedicated URLs per city dramatically improve organic search ranking for
 * queries like "קרקעות להשקעה בחדרה" or "land investment hadera".
 * This is a key SEO gap vs Madlan/Yad2 who have dedicated area pages.
 */

/** JSON-LD structured data for city landing page */
function CityJsonLd({ city, stats, plots }) {
  if (!city || !stats) return null

  const baseUrl = window.location.origin

  // RealEstateAgent or WebPage schema for the city
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `קרקעות להשקעה ב${city} — LandMap Israel`,
    description: `${stats.count} חלקות קרקע להשקעה ב${city}. מחיר ממוצע: ₪${stats.avgPricePerDunam?.toLocaleString()} לדונם. תשואה ממוצעת: +${stats.avgRoi}%.`,
    url: `${baseUrl}/areas/${encodeURIComponent(city)}`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'LandMap Israel',
      url: baseUrl,
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'מפת קרקעות', item: baseUrl },
        { '@type': 'ListItem', position: 2, name: 'סקירת אזורים', item: `${baseUrl}/areas` },
        { '@type': 'ListItem', position: 3, name: city },
      ],
    },
  }

  // ItemList of plots in this city
  const plotListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `חלקות קרקע להשקעה ב${city}`,
    numberOfItems: plots?.length || 0,
    itemListElement: (plots || []).slice(0, 10).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `גוש ${p.block_number ?? p.blockNumber} חלקה ${p.number}`,
      url: `${baseUrl}/plot/${p.id}`,
    })),
  }

  // FAQ for this specific city
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `כמה עולה דונם קרקע ב${city}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `מחיר ממוצע לדונם ב${city}: ₪${stats.avgPricePerDunam?.toLocaleString()}. טווח מחירים: ${formatCurrency(stats.priceRange?.min || 0)} — ${formatCurrency(stats.priceRange?.max || 0)}.`,
        },
      },
      {
        '@type': 'Question',
        name: `כמה חלקות זמינות להשקעה ב${city}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `כרגע זמינות ${stats.available} חלקות מתוך ${stats.count} ב${city}. שטח כולל: ${formatDunam(stats.totalArea)} דונם.`,
        },
      },
      {
        '@type': 'Question',
        name: `מה התשואה הצפויה מקרקע ב${city}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `תשואה ממוצעת צפויה ב${city}: +${stats.avgRoi}%. התשואה תלויה בשלב התכנוני, מיקום החלקה ותנאי השוק.`,
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(plotListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </>
  )
}

function StatCard({ icon: Icon, label, value, sub, color = 'gold' }) {
  const colorMap = {
    gold: 'bg-gold/15 text-gold border-gold/20',
    green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
    orange: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  }
  return (
    <div className="glass-panel p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className="text-xl font-bold text-slate-100">{value}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}

function PlotRow({ plot }) {
  const price = plot.total_price ?? plot.totalPrice ?? 0
  const proj = plot.projected_value ?? plot.projectedValue ?? 0
  const size = plot.size_sqm ?? plot.sizeSqM ?? 0
  const bn = plot.block_number ?? plot.blockNumber
  const roi = price > 0 ? Math.round(((proj - price) / price) * 100) : 0
  const score = calcInvestmentScore(plot)
  const { label: scoreLabel, color: scoreColor } = getScoreLabel(score)
  const zoningStage = plot.zoning_stage ?? plot.zoningStage
  const readiness = plot.readiness_estimate ?? plot.readinessEstimate
  const statusColor = statusColors[plot.status]
  const cagrData = calcCAGR(roi, readiness)

  return (
    <Link
      to={`/plot/${plot.id}`}
      className="glass-panel p-4 hover:border-gold/20 transition-all group card-lift"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-100 group-hover:text-gold transition-colors">
            גוש {bn} | חלקה {plot.number}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium"
              style={{ background: `${statusColor}20`, color: statusColor }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
              {statusLabels[plot.status]}
            </span>
            <span className="text-[10px] text-slate-500">
              {zoningLabels[zoningStage]}
            </span>
          </div>
        </div>
        <div className="text-left">
          <div
            className="text-xs font-bold px-2 py-1 rounded-lg"
            style={{ background: `${scoreColor}15`, color: scoreColor, border: `1px solid ${scoreColor}30` }}
          >
            ⭐ {score}/10
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="text-[10px] text-slate-500">מחיר</div>
          <div className="text-sm font-bold text-gold">{formatPriceShort(price)}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500">שטח</div>
          <div className="text-sm font-bold text-slate-200">{formatDunam(size)} דונם</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500">תשואה</div>
          <div className="text-sm font-bold text-emerald-400">+{roi}%</div>
          {cagrData && (
            <div className="text-[9px] text-slate-500">{cagrData.cagr}%/שנה</div>
          )}
        </div>
      </div>

      {readiness && (
        <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500">
          <Clock className="w-3 h-3" />
          מוכנות: {readiness}
        </div>
      )}
    </Link>
  )
}

/**
 * PriceDistributionChart — SVG histogram showing how plot prices are distributed.
 * Like Madlan's price distribution for neighborhoods — gives investors instant visual
 * context about where most plots are priced and whether there are bargain outliers.
 * Pure SVG, no chart library dependency.
 */
function PriceDistributionChart({ plots }) {
  const chartData = useMemo(() => {
    if (!plots || plots.length < 3) return null
    const prices = plots
      .map(p => p.total_price ?? p.totalPrice ?? 0)
      .filter(p => p > 0)
      .sort((a, b) => a - b)
    if (prices.length < 3) return null

    // Create 8 bins from min to max
    const min = prices[0]
    const max = prices[prices.length - 1]
    const range = max - min
    if (range <= 0) return null

    const binCount = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(prices.length))))
    const binWidth = range / binCount
    const bins = Array.from({ length: binCount }, (_, i) => ({
      min: min + i * binWidth,
      max: min + (i + 1) * binWidth,
      count: 0,
    }))

    for (const price of prices) {
      const idx = Math.min(binCount - 1, Math.floor((price - min) / binWidth))
      bins[idx].count++
    }

    const maxCount = Math.max(...bins.map(b => b.count))
    const median = prices[Math.floor(prices.length / 2)]

    return { bins, maxCount, min, max, median, total: prices.length }
  }, [plots])

  if (!chartData) return null

  const { bins, maxCount, min, max, median, total } = chartData
  const W = 400
  const H = 140
  const padX = 10
  const padY = 10
  const barGap = 4
  const chartW = W - padX * 2
  const chartH = H - padY * 2 - 20 // 20px for labels
  const barW = (chartW - barGap * (bins.length - 1)) / bins.length

  // Median line position
  const range = max - min
  const medianX = range > 0 ? padX + ((median - min) / range) * chartW : W / 2

  return (
    <div className="glass-panel p-5 mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-gold" />
          התפלגות מחירים
        </h2>
        <span className="text-[9px] text-slate-500 bg-white/5 px-2 py-1 rounded-lg">
          {total} חלקות · חציון: ₪{Math.round(median).toLocaleString()}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`התפלגות מחירי חלקות — חציון ₪${Math.round(median).toLocaleString()}`}
      >
        {/* Bars */}
        {bins.map((bin, i) => {
          const barH = maxCount > 0 ? (bin.count / maxCount) * chartH : 0
          const x = padX + i * (barW + barGap)
          const y = padY + chartH - barH
          const isMedianBin = median >= bin.min && median < bin.max
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(2, barH)}
                rx={3}
                fill={isMedianBin ? 'rgba(200,148,42,0.6)' : 'rgba(200,148,42,0.25)'}
                stroke={isMedianBin ? 'rgba(200,148,42,0.8)' : 'rgba(200,148,42,0.15)'}
                strokeWidth={1}
              />
              {/* Count label on bars with data */}
              {bin.count > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 4}
                  fill="rgba(148,163,184,0.7)"
                  fontSize="9"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  {bin.count}
                </text>
              )}
              {/* Price range label */}
              {i % 2 === 0 && (
                <text
                  x={x + barW / 2}
                  y={H - 4}
                  fill="rgba(148,163,184,0.4)"
                  fontSize="8"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  ₪{bin.min >= 1000000 ? `${(bin.min / 1000000).toFixed(1)}M` : `${Math.round(bin.min / 1000)}K`}
                </text>
              )}
            </g>
          )
        })}

        {/* Median line */}
        <line
          x1={medianX}
          y1={padY}
          x2={medianX}
          y2={padY + chartH}
          stroke="rgba(200,148,42,0.5)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
        <text
          x={medianX}
          y={padY - 2}
          fill="rgba(200,148,42,0.8)"
          fontSize="8"
          textAnchor="middle"
          fontFamily="sans-serif"
          fontWeight="bold"
        >
          חציון
        </text>
      </svg>

      <p className="text-[9px] text-slate-600 mt-1 text-center">
        💡 העמודה הבולטת מסמנת את הטווח שבו נמצא המחיר החציוני
      </p>
    </div>
  )
}

export default function AreaCity() {
  const { city } = useParams()
  const decodedCity = decodeURIComponent(city || '')
  const navigate = useNavigate()

  const { data: overview, isLoading: overviewLoading } = useMarketOverview()
  const { data: plots = [], isLoading: plotsLoading } = useAllPlots({ city: decodedCity })

  const isLoading = overviewLoading || plotsLoading

  // Find city-specific stats from overview
  const cityStats = useMemo(() => {
    if (!overview?.cities) return null
    return overview.cities.find(c => c.city === decodedCity)
  }, [overview, decodedCity])

  // Other cities for navigation
  const otherCities = useMemo(() => {
    if (!overview?.cities) return []
    return overview.cities.filter(c => c.city !== decodedCity)
  }, [overview, decodedCity])

  // Sort plots by investment score (best first)
  const sortedPlots = useMemo(() => {
    if (!plots || plots.length === 0) return []
    return [...plots]
      .filter(p => p.status !== 'SOLD')
      .sort((a, b) => calcInvestmentScore(b) - calcInvestmentScore(a))
  }, [plots])

  // Zoning breakdown
  const zoningBreakdown = useMemo(() => {
    if (!plots || plots.length === 0) return []
    const counts = {}
    plots.forEach(p => {
      const z = p.zoning_stage ?? p.zoningStage
      if (z) counts[z] = (counts[z] || 0) + 1
    })
    return Object.entries(counts)
      .map(([key, count]) => ({ key, label: zoningLabels[key] || key, count, pct: Math.round((count / plots.length) * 100) }))
      .sort((a, b) => b.count - a.count)
  }, [plots])

  // Price distribution
  const priceStats = useMemo(() => {
    if (!plots || plots.length === 0) return null
    const prices = plots.map(p => p.total_price ?? p.totalPrice ?? 0).filter(p => p > 0)
    if (prices.length === 0) return null
    prices.sort((a, b) => a - b)
    const median = prices[Math.floor(prices.length / 2)]
    const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length)
    return { min: prices[0], max: prices[prices.length - 1], median, avg, count: prices.length }
  }, [plots])

  // Dynamic SEO meta
  useMetaTags({
    title: `קרקעות להשקעה ב${decodedCity} — מחירים, תשואות ונתוני שוק | LandMap Israel`,
    description: cityStats
      ? `${cityStats.count} חלקות קרקע להשקעה ב${decodedCity}. מחיר ממוצע: ₪${cityStats.avgPricePerDunam?.toLocaleString()}/דונם. תשואה: +${cityStats.avgRoi}%. נתונים מעודכנים.`
      : `חלקות קרקע להשקעה ב${decodedCity} — מחירים, תשואות ונתוני שוק מעודכנים.`,
    url: `${window.location.origin}/areas/${encodeURIComponent(decodedCity)}`,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy" dir="rtl">
        <PublicNav />
        <div className="flex justify-center items-center py-32">
          <Spinner className="w-10 h-10 text-gold" />
        </div>
      </div>
    )
  }

  // City not found
  if (!cityStats && !plotsLoading) {
    return (
      <div className="min-h-screen bg-navy" dir="rtl">
        <PublicNav />
        <div className="max-w-4xl mx-auto px-4 py-32 text-center">
          <div className="text-6xl mb-4">🏜️</div>
          <h1 className="text-2xl font-bold text-slate-200 mb-3">
            אזור "{decodedCity}" לא נמצא
          </h1>
          <p className="text-slate-400 mb-6">
            ייתכן שהאזור הוסר או שהקישור שגוי.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/areas"
              className="flex items-center gap-2 px-6 py-2.5 bg-gold/20 border border-gold/30 rounded-xl text-gold text-sm hover:bg-gold/30 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              כל האזורים
            </Link>
            <Link
              to="/"
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-gold to-gold-bright rounded-xl text-navy text-sm font-bold hover:shadow-lg hover:shadow-gold/30 transition"
            >
              <Map className="w-4 h-4" />
              למפה
            </Link>
          </div>
        </div>
        <PublicFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy" dir="rtl">
      <PublicNav />
      <CityJsonLd city={decodedCity} stats={cityStats} plots={sortedPlots} />

      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(200,148,42,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(200,148,42,0.3) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-16">
        {/* Breadcrumb */}
        <nav aria-label="ניווט" className="mb-6">
          <ol className="flex items-center gap-2 text-xs text-slate-500 list-none p-0 m-0">
            <li className="flex items-center gap-2">
              <Link to="/" className="hover:text-gold transition-colors">מפת קרקעות</Link>
              <span aria-hidden="true">/</span>
            </li>
            <li className="flex items-center gap-2">
              <Link to="/areas" className="hover:text-gold transition-colors">סקירת אזורים</Link>
              <span aria-hidden="true">/</span>
            </li>
            <li aria-current="page">
              <span className="text-slate-300">{decodedCity}</span>
            </li>
          </ol>
        </nav>

        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/20 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-gold" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black">
                <span className="bg-gradient-to-r from-gold to-gold-bright bg-clip-text text-transparent">
                  קרקעות להשקעה ב{decodedCity}
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {cityStats.count} חלקות · {cityStats.available} זמינות · שטח כולל {formatDunam(cityStats.totalArea)} דונם
              </p>
            </div>
          </div>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          <StatCard
            icon={Building2}
            label="חלקות"
            value={cityStats.count}
            sub={`${cityStats.available} זמינות`}
            color="gold"
          />
          <StatCard
            icon={DollarSign}
            label="מחיר/דונם"
            value={formatCurrency(cityStats.avgPricePerDunam)}
            sub="ממוצע"
            color="blue"
          />
          <StatCard
            icon={TrendingUp}
            label="תשואה ממוצעת"
            value={`+${cityStats.avgRoi}%`}
            color="green"
          />
          <StatCard
            icon={Ruler}
            label="שטח כולל"
            value={`${formatDunam(cityStats.totalArea)} דונם`}
            color="purple"
          />
          {priceStats && (
            <StatCard
              icon={BarChart3}
              label="מחיר חציוני"
              value={formatPriceShort(priceStats.median)}
              sub={`טווח: ${formatPriceShort(priceStats.min)} — ${formatPriceShort(priceStats.max)}`}
              color="orange"
            />
          )}
        </div>

        {/* Zoning breakdown */}
        {zoningBreakdown.length > 0 && (
          <div className="glass-panel p-5 mb-8">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-gold" />
              שלבי תכנון ב{decodedCity}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {zoningBreakdown.map(z => (
                <div key={z.key} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-36 truncate">{z.label}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-gold/60 to-gold transition-all duration-700"
                      style={{ width: `${z.pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 tabular-nums w-12 text-left">{z.count} ({z.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price distribution histogram — like Madlan's area price distribution */}
        <PriceDistributionChart plots={plots} />

        {/* CTA: View on map */}
        <div className="glass-panel p-6 mb-8 border-gold/10 bg-gradient-to-r from-gold/5 to-transparent">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 text-center sm:text-right">
              <h2 className="text-base font-bold text-slate-100 mb-1">
                צפה בכל החלקות ב{decodedCity} על המפה
              </h2>
              <p className="text-xs text-slate-400">
                מפה אינטראקטיבית עם פילטרים, השוואות ו-AI יועץ
              </p>
            </div>
            <Link
              to={`/?city=${encodeURIComponent(decodedCity)}`}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold to-gold-bright rounded-xl text-navy font-bold text-sm hover:shadow-lg hover:shadow-gold/20 transition-all whitespace-nowrap"
            >
              <Map className="w-5 h-5" />
              פתח במפה
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Plot listings */}
        {sortedPlots.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Zap className="w-5 h-5 text-gold" />
                חלקות מובילות ב{decodedCity}
              </h2>
              <span className="text-xs text-slate-500">ממוינות לפי ציון השקעה</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedPlots.slice(0, 9).map(p => (
                <PlotRow key={p.id} plot={p} />
              ))}
            </div>
            {sortedPlots.length > 9 && (
              <div className="text-center mt-6">
                <Link
                  to={`/?city=${encodeURIComponent(decodedCity)}`}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300 hover:border-gold/30 hover:text-gold transition-all"
                >
                  עוד {sortedPlots.length - 9} חלקות ב{decodedCity}
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Sold plots section */}
        {(() => {
          const soldPlots = plots.filter(p => p.status === 'SOLD')
          if (soldPlots.length === 0) return null
          return (
            <div className="mb-8">
              <h2 className="text-base font-bold text-slate-400 flex items-center gap-2 mb-4">
                🔴 חלקות שנמכרו ({soldPlots.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 opacity-60">
                {soldPlots.slice(0, 3).map(p => (
                  <PlotRow key={p.id} plot={p} />
                ))}
              </div>
            </div>
          )
        })()}

        {/* Other cities navigation */}
        {otherCities.length > 0 && (
          <div className="glass-panel p-5">
            <h2 className="text-sm font-bold text-slate-100 mb-4">
              אזורים נוספים להשקעה
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {otherCities.map(c => (
                <Link
                  key={c.city}
                  to={`/areas/${encodeURIComponent(c.city)}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-gold/20 hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gold" />
                    <div>
                      <div className="text-sm font-bold text-slate-200">{c.city}</div>
                      <div className="text-[10px] text-slate-500">{c.count} חלקות</div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-emerald-400">+{c.avgRoi}%</div>
                    <div className="text-[9px] text-slate-500">{formatCurrency(c.avgPricePerDunam)}/דונם</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <BackToTopButton />
      <PublicFooter />
    </div>
  )
}
