import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, TrendingUp, Ruler, DollarSign, ArrowLeft, BarChart3, Building2, Users, ChevronDown, ChevronUp, Activity, ArrowUpDown, Zap, Shield } from 'lucide-react'
import { useMarketOverview } from '../../hooks/useMarketOverview.js'
import { useMarketTrends } from '../../hooks/useMarketTrends.js'
import { useMetaTags } from '../../hooks/useMetaTags.js'
import PublicNav from '../../components/PublicNav.jsx'
import PublicFooter from '../../components/PublicFooter.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import BackToTopButton from '../../components/ui/BackToTopButton.jsx'
import { formatCurrency, formatDunam } from '../../utils/formatters.js'
import { statusColors, statusLabels, zoningLabels } from '../../utils/constants.js'

function StatCard({ icon: Icon, label, value, subValue, color = 'gold' }) {
  const colorMap = {
    gold: 'bg-gold/15 text-gold border-gold/20',
    green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  }
  return (
    <div className="glass-panel p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className="text-xl font-bold text-slate-100">{value}</div>
      {subValue && <div className="text-[11px] text-slate-500">{subValue}</div>}
    </div>
  )
}

function CityCard({ city, stats }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="glass-panel overflow-hidden">
      {/* Header */}
      <div
        className="p-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(prev => !prev)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/20 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">{city}</h3>
              <span className="text-xs text-slate-400">{stats.count} חלקות</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
              +{stats.avgRoi}% ROI ממוצע
            </span>
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/[0.03] rounded-lg p-3 text-center">
            <div className="text-[10px] text-slate-500 mb-1">מחיר ממוצע/דונם</div>
            <div className="text-sm font-bold text-gold">{formatCurrency(stats.avgPricePerDunam)}</div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-3 text-center">
            <div className="text-[10px] text-slate-500 mb-1">שטח כולל</div>
            <div className="text-sm font-bold text-slate-200">{formatDunam(stats.totalArea)} דונם</div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-3 text-center">
            <div className="text-[10px] text-slate-500 mb-1">זמינות</div>
            <div className="text-sm font-bold text-emerald-400">
              {stats.available}/{stats.count}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-white/5 p-5 space-y-4">
          {/* Zoning breakdown */}
          {stats.byZoning && Object.keys(stats.byZoning).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 mb-2">שלבי תכנון</h4>
              <div className="space-y-1.5">
                {Object.entries(stats.byZoning)
                  .sort(([, a], [, b]) => b - a)
                  .map(([zoning, count]) => {
                    const pct = Math.round((count / stats.count) * 100)
                    return (
                      <div key={zoning} className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 w-40 truncate">{zoningLabels[zoning] || zoning}</span>
                        <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full bg-gold/40" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-500 w-8 text-left">{count}</span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Price range */}
          {stats.priceRange && (stats.priceRange.min > 0 || stats.priceRange.max > 0) && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 mb-2">טווח מחירים</h4>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-slate-400">{formatCurrency(stats.priceRange.min)}</span>
                <div className="flex-1 h-1 rounded-full bg-gradient-to-r from-emerald-500/40 via-gold/40 to-red-500/40" />
                <span className="text-slate-400">{formatCurrency(stats.priceRange.max)}</span>
              </div>
            </div>
          )}

          {/* Price per sqm range */}
          {stats.priceSqmRange && stats.priceSqmRange.max > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 mb-2">מחיר למ״ר</h4>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-slate-400">₪{stats.priceSqmRange.min.toLocaleString()}</span>
                <div className="flex-1 h-1 rounded-full bg-gradient-to-r from-blue-500/40 via-purple-500/40 to-pink-500/40" />
                <span className="text-slate-400">₪{stats.priceSqmRange.max.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="flex gap-2">
            <Link
              to={`/areas/${encodeURIComponent(city)}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-slate-200 font-bold text-sm hover:border-gold/30 hover:text-gold transition-all"
            >
              <span>פרופיל {city}</span>
            </Link>
            <Link
              to={`/?city=${encodeURIComponent(city)}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-gold to-gold-bright text-navy font-bold text-sm hover:shadow-lg hover:shadow-gold/20 transition-all"
            >
              <span>צפה במפה</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Market Health Score — composite score (0–100) per city evaluating investment attractiveness.
 * Factors: availability ratio, average ROI, zoning diversity (advancement), price accessibility.
 * This is a key differentiator vs Madlan/Yad2 — they don't offer aggregate investment scoring for areas.
 */
function calcMarketHealthScore(cityStats) {
  if (!cityStats) return null
  const { count, available, avgRoi, byZoning, priceRange, avgPricePerDunam, totalArea } = cityStats

  // 1. Availability Score (0–25): Higher availability = better investor choice
  const availRatio = count > 0 ? available / count : 0
  const availScore = Math.min(25, Math.round(availRatio * 30)) // 83%+ = max

  // 2. ROI Score (0–25): Higher ROI = better returns
  const roiScore = Math.min(25, Math.round((Math.min(avgRoi, 250) / 250) * 25))

  // 3. Zoning Diversity / Advancement Score (0–25): More advanced zoning stages = closer to realization
  const zoningKeys = Object.keys(byZoning || {})
  const advancedStages = ['DETAILED_PLAN_APPROVED', 'DEVELOPER_TENDER', 'BUILDING_PERMIT', 'MASTER_PLAN_APPROVED', 'DETAILED_PLAN_DEPOSIT']
  const advancedCount = zoningKeys.reduce((s, k) => s + (advancedStages.includes(k) ? (byZoning[k] || 0) : 0), 0)
  const advancedRatio = count > 0 ? advancedCount / count : 0
  const diversityBonus = Math.min(5, zoningKeys.length) // up to 5 points for variety
  const zoningScore = Math.min(25, Math.round(advancedRatio * 20) + diversityBonus)

  // 4. Market Depth Score (0–25): More plots, wider price range = healthier market
  const depthCount = Math.min(10, Math.round((count / 20) * 10)) // up to 10 for >20 plots
  const priceSpread = priceRange && priceRange.max > 0 && priceRange.min > 0
    ? Math.min(10, Math.round(((priceRange.max - priceRange.min) / priceRange.max) * 15))
    : 0
  const areaBonus = totalArea > 10000 ? 5 : totalArea > 5000 ? 3 : totalArea > 1000 ? 1 : 0
  const depthScore = Math.min(25, depthCount + priceSpread + areaBonus)

  const total = availScore + roiScore + zoningScore + depthScore

  // Grade & color
  let grade, color, emoji
  if (total >= 80) { grade = 'A+'; color = '#22C55E'; emoji = '🔥' }
  else if (total >= 65) { grade = 'A'; color = '#4ADE80'; emoji = '🟢' }
  else if (total >= 50) { grade = 'B+'; color = '#FBBF24'; emoji = '🟡' }
  else if (total >= 35) { grade = 'B'; color = '#F59E0B'; emoji = '🟠' }
  else { grade = 'C'; color = '#EF4444'; emoji = '🔴' }

  return {
    total,
    grade,
    color,
    emoji,
    breakdown: {
      availability: { score: availScore, max: 25, label: 'זמינות' },
      roi: { score: roiScore, max: 25, label: 'תשואה' },
      zoning: { score: zoningScore, max: 25, label: 'בשלות תכנונית' },
      depth: { score: depthScore, max: 25, label: 'עומק שוק' },
    },
  }
}

function MarketHealthScores({ cities }) {
  if (!cities || cities.length === 0) return null

  const scored = useMemo(() => {
    return cities
      .map(city => ({ ...city, health: calcMarketHealthScore(city) }))
      .filter(c => c.health)
      .sort((a, b) => b.health.total - a.health.total)
  }, [cities])

  if (scored.length === 0) return null

  return (
    <div className="glass-panel p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Shield className="w-4 h-4 text-gold" />
          ציון בריאות שוק
        </h3>
        <span className="text-[9px] text-slate-500 bg-white/5 px-2 py-1 rounded-lg">
          מבוסס על: זמינות, תשואה, תכנון, עומק שוק
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {scored.map(city => {
          const h = city.health
          return (
            <Link
              key={city.city}
              to={`/areas/${encodeURIComponent(city.city)}`}
              className="relative bg-white/[0.02] border border-white/5 rounded-xl p-4 hover:border-gold/20 hover:bg-white/[0.04] transition-all group"
            >
              {/* Score badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{h.emoji}</span>
                  <div>
                    <div className="text-base font-bold text-slate-100 group-hover:text-gold transition-colors">{city.city}</div>
                    <div className="text-[10px] text-slate-500">{city.count} חלקות</div>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div
                    className="text-2xl font-black tabular-nums"
                    style={{ color: h.color }}
                  >
                    {h.total}
                  </div>
                  <div
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${h.color}15`, color: h.color, border: `1px solid ${h.color}30` }}
                  >
                    {h.grade}
                  </div>
                </div>
              </div>

              {/* Breakdown bars */}
              <div className="space-y-1.5">
                {Object.entries(h.breakdown).map(([key, dim]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-500 w-20 text-right">{dim.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(dim.score / dim.max) * 100}%`,
                          background: h.color,
                          opacity: 0.7,
                        }}
                      />
                    </div>
                    <span className="text-[8px] text-slate-600 tabular-nums w-6 text-left">{dim.score}/{dim.max}</span>
                  </div>
                ))}
              </div>

              {/* Total progress ring (simplified as bar) */}
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${h.total}%`, background: `linear-gradient(90deg, ${h.color}80, ${h.color})` }}
                  />
                </div>
                <span className="text-[10px] font-bold tabular-nums" style={{ color: h.color }}>{h.total}/100</span>
              </div>
            </Link>
          )
        })}
      </div>

      <p className="text-[9px] text-slate-600 mt-3 text-center">
        💡 הציון משקלל זמינות חלקות, תשואה ממוצעת, בשלות שלבי תכנון ועומק שוק. ציון גבוה = שוק אטרקטיבי יותר למשקיעים.
      </p>
    </div>
  )
}

const CITY_COLORS = {
  'חדרה': '#3B82F6',
  'נתניה': '#22C55E',
  'קיסריה': '#E5B94E',
}

/**
 * Mini SVG line chart for price trends per city — like Madlan's area price history.
 * Pure SVG, no chart library dependency.
 */
function PriceTrendMiniChart({ trends }) {
  if (!trends || !trends.cities || Object.keys(trends.cities).length === 0) return null

  const cities = Object.entries(trends.cities)
  const allValues = cities.flatMap(([, d]) => d.trend.map(t => t.avgPriceSqm))
  const min = Math.min(...allValues) * 0.95
  const max = Math.max(...allValues) * 1.05
  const range = max - min || 1

  const W = 500
  const H = 180
  const padX = 40
  const padY = 20
  const chartW = W - padX * 2
  const chartH = H - padY * 2

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Activity className="w-4 h-4 text-gold" />
          מגמת מחירים — 12 חודשים אחרונים
        </h3>
        <div className="flex items-center gap-3">
          {cities.map(([city, data]) => (
            <div key={city} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: CITY_COLORS[city] || '#94A3B8' }} />
              <span className="text-[10px] text-slate-400">{city}</span>
              <span className={`text-[10px] font-bold ${data.change12m >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {data.change12m >= 0 ? '+' : ''}{data.change12m}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet" role="img" aria-label="תרשים מגמות מחירים לפי עיר">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = padY + chartH * (1 - pct)
          const val = Math.round(min + range * pct)
          return (
            <g key={pct}>
              <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <text x={padX - 4} y={y + 3} fill="rgba(148,163,184,0.5)" fontSize="8" textAnchor="end" fontFamily="sans-serif">
                ₪{val.toLocaleString()}
              </text>
            </g>
          )
        })}

        {/* Month labels */}
        {trends.monthLabels && trends.monthLabels.map((label, i) => {
          if (i % 2 !== 0) return null
          const x = padX + (i / (trends.monthLabels.length - 1)) * chartW
          return (
            <text key={i} x={x} y={H - 4} fill="rgba(148,163,184,0.4)" fontSize="7" textAnchor="middle" fontFamily="sans-serif">
              {label}
            </text>
          )
        })}

        {/* Lines */}
        {cities.map(([city, data]) => {
          const points = data.trend.map((t, i) => {
            const x = padX + (i / (data.trend.length - 1)) * chartW
            const y = padY + chartH * (1 - (t.avgPriceSqm - min) / range)
            return `${x},${y}`
          })
          const color = CITY_COLORS[city] || '#94A3B8'
          return (
            <g key={city}>
              <polyline
                points={points.join(' ')}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* End dot */}
              {data.trend.length > 0 && (() => {
                const last = data.trend[data.trend.length - 1]
                const x = padX + ((data.trend.length - 1) / (data.trend.length - 1)) * chartW
                const y = padY + chartH * (1 - (last.avgPriceSqm - min) / range)
                return <circle cx={x} cy={y} r="3" fill={color} />
              })()}
            </g>
          )
        })}
      </svg>

      <p className="text-[9px] text-slate-600 mt-2 text-center">
        מחיר ממוצע למ״ר לפי עיר. הנתונים מבוססים על חלקות פעילות במערכת.
      </p>
    </div>
  )
}

/**
 * JSON-LD structured data for the Areas page — helps Google understand and index
 * our area comparison content. Uses ItemList schema for city listings and
 * FAQPage schema for common investor questions. Like Madlan's SEO strategy.
 */
function AreasJsonLd({ overview, cities }) {
  if (!overview || !cities || cities.length === 0) return null

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'אזורי השקעה בקרקעות — ישראל',
    description: 'רשימת אזורים להשקעה בקרקעות בישראל עם נתוני שוק מעודכנים',
    numberOfItems: cities.length,
    itemListElement: cities.map((city, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: city.city,
      url: `${window.location.origin}/areas/${encodeURIComponent(city.city)}`,
      description: `${city.count} חלקות להשקעה ב${city.city}. מחיר ממוצע לדונם: ₪${city.avgPricePerDunam?.toLocaleString()}. תשואה ממוצעת: +${city.avgRoi}%.`,
    })),
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'באיזה אזור כדאי להשקיע בקרקע בישראל?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `האזורים המובילים להשקעה כוללים ${cities.map(c => c.city).join(', ')}. תשואה ממוצעת באזורים אלו: +${overview.avgRoi}%. סה״כ ${overview.total} חלקות זמינות.`,
        },
      },
      {
        '@type': 'Question',
        name: 'מה מחיר ממוצע לדונם קרקע להשקעה?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: cities.map(c => `${c.city}: ₪${c.avgPricePerDunam?.toLocaleString()} לדונם`).join('. ') + '.',
        },
      },
      {
        '@type': 'Question',
        name: 'כמה חלקות קרקע זמינות כרגע להשקעה?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `כרגע זמינות ${overview.available} חלקות מתוך ${overview.total} במערכת. שטח כולל: ${formatDunam(overview.totalArea)} דונם.`,
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </>
  )
}

/**
 * Sortable comparison table — click any column header to sort ascending/descending.
 * Like Madlan's area comparison but interactive. Helps investors quickly find
 * the cheapest area, highest ROI, or most available plots.
 */
const SORT_COLUMNS = [
  { key: 'city', label: 'עיר', align: 'text-right', getValue: (c) => c.city },
  { key: 'count', label: 'חלקות', align: 'text-center', getValue: (c) => c.count },
  { key: 'avgPricePerDunam', label: 'מחיר/דונם', align: 'text-center', getValue: (c) => c.avgPricePerDunam || 0 },
  { key: 'avgRoi', label: 'ROI ממוצע', align: 'text-center', getValue: (c) => c.avgRoi || 0 },
  { key: 'totalArea', label: 'שטח כולל', align: 'text-center', getValue: (c) => c.totalArea || 0 },
  { key: 'availability', label: 'זמינות', align: 'text-center', getValue: (c) => c.count > 0 ? c.available / c.count : 0 },
]

function SortableComparisonTable({ cities }) {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('desc') // 'asc' | 'desc'

  const handleSort = useCallback((key) => {
    if (sortKey === key) {
      // Toggle direction, then reset
      if (sortDir === 'desc') setSortDir('asc')
      else { setSortKey(null); setSortDir('desc') }
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }, [sortKey, sortDir])

  const sortedCities = useMemo(() => {
    if (!sortKey) return cities
    const col = SORT_COLUMNS.find(c => c.key === sortKey)
    if (!col) return cities
    const sorted = [...cities].sort((a, b) => {
      const va = col.getValue(a)
      const vb = col.getValue(b)
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb, 'he') : vb.localeCompare(va, 'he')
      return sortDir === 'asc' ? va - vb : vb - va
    })
    return sorted
  }, [cities, sortKey, sortDir])

  return (
    <div className="glass-panel p-5 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-gold" />
          השוואת אזורים
        </h3>
        {sortKey && (
          <button
            onClick={() => { setSortKey(null); setSortDir('desc') }}
            className="text-[10px] text-slate-500 hover:text-gold flex items-center gap-1 transition-colors"
          >
            <ArrowUpDown className="w-3 h-3" />
            איפוס מיון
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="grid" aria-label="טבלת השוואת אזורים — לחץ על כותרת עמודה למיון">
          <thead>
            <tr className="text-[10px] text-slate-500 border-b border-white/5">
              {SORT_COLUMNS.map((col) => {
                const isActive = sortKey === col.key
                return (
                  <th
                    key={col.key}
                    className={`${col.align} py-2.5 font-medium ${col.key === 'city' ? 'pr-2' : ''} cursor-pointer select-none hover:text-gold transition-colors group`}
                    onClick={() => handleSort(col.key)}
                    aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    title={`מיין לפי ${col.label}`}
                    role="columnheader"
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {isActive ? (
                        sortDir === 'asc' ? (
                          <ChevronUp className="w-3 h-3 text-gold" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-gold" />
                        )
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 opacity-0 group-hover:opacity-40 transition-opacity" />
                      )}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sortedCities.map((city, rowIdx) => {
              const availPct = city.count > 0 ? Math.round((city.available / city.count) * 100) : 0
              const roiColor = city.avgRoi >= 150 ? 'text-emerald-400' : city.avgRoi >= 100 ? 'text-emerald-500' : city.avgRoi >= 50 ? 'text-yellow-400' : 'text-slate-400'
              // Highlight the "winner" row for each sorted column
              const isTopRow = sortKey && rowIdx === 0
              return (
                <tr
                  key={city.city}
                  className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${isTopRow ? 'bg-gold/[0.03]' : ''}`}
                >
                  <td className="py-3 pr-2">
                    <Link to={`/areas/${encodeURIComponent(city.city)}`} className="flex items-center gap-2 text-slate-200 hover:text-gold transition-colors font-medium">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: CITY_COLORS[city.city] || '#94A3B8' }} />
                      {city.city}
                      {isTopRow && <span className="text-[8px] text-gold bg-gold/10 px-1.5 py-0.5 rounded-full">🏆</span>}
                    </Link>
                  </td>
                  <td className="py-3 text-center text-slate-300">{city.count}</td>
                  <td className="py-3 text-center text-gold font-medium">{formatCurrency(city.avgPricePerDunam)}</td>
                  <td className={`py-3 text-center font-bold ${roiColor}`}>+{city.avgRoi}%</td>
                  <td className="py-3 text-center text-slate-400">{formatDunam(city.totalArea)} דונם</td>
                  <td className="py-3 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <div className="w-12 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-400/60" style={{ width: `${availPct}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-500">{availPct}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[9px] text-slate-600 mt-3 text-center">
        💡 לחצו על כותרת עמודה כדי למיין. לחיצה חוזרת משנה כיוון.
      </p>
    </div>
  )
}

export default function Areas() {
  const { data: overview, isLoading } = useMarketOverview()
  const { data: trends } = useMarketTrends()

  // SEO meta tags
  useMetaTags({
    title: 'סקירת אזורים — השוואת ערים וקרקעות להשקעה | LandMap Israel',
    description: 'השוואת מחירי קרקעות, תשואות ושלבי תכנון בין ערים בישראל — חדרה, נתניה, קיסריה. נתוני שוק מעודכנים למשקיעים.',
    url: `${window.location.origin}/areas`,
  })

  const cities = overview?.cities || []

  return (
    <div className="min-h-screen bg-navy" dir="rtl">
      <PublicNav />
      {/* Structured data for SEO — helps Google index area comparisons and answer investor FAQs */}
      <AreasJsonLd overview={overview} cities={cities} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-100 mb-3">
            <span className="brand-text">סקירת אזורים</span>
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto text-sm leading-relaxed">
            השוואת נתוני נדל"ן בין ערים — מחירים, תשואות, שלבי תכנון וזמינות.
            כמו מדל"ן, רק עבור קרקעות להשקעה.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner className="w-10 h-10 text-gold" />
          </div>
        ) : (
          <>
            {/* Global stats */}
            {overview && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                <StatCard icon={Building2} label="סה״כ חלקות" value={overview.total} color="gold" />
                <StatCard icon={Ruler} label="שטח כולל" value={`${formatDunam(overview.totalArea)} דונם`} color="blue" />
                <StatCard icon={TrendingUp} label="ROI ממוצע" value={`+${overview.avgRoi}%`} color="green" />
                <StatCard icon={DollarSign} label="שווי כולל" value={formatCurrency(overview.totalValue)} subValue={`${overview.available} זמינות`} color="purple" />
              </div>
            )}

            {/* Market Health Scores — composite investment score per city */}
            {cities.length > 0 && <MarketHealthScores cities={cities} />}

            {/* Price trends chart */}
            {trends && <PriceTrendMiniChart trends={trends} />}

            {/* City comparison table — sortable like Madlan's area comparison */}
            {cities.length > 1 && <SortableComparisonTable cities={cities} />}

            {/* City cards */}
            <div className="space-y-4 mt-6">
              {cities.map((city) => (
                <CityCard key={city.city} city={city.city} stats={city} />
              ))}
            </div>

            {cities.length === 0 && !isLoading && (
              <div className="text-center py-20">
                <div className="text-4xl mb-4">🏜️</div>
                <div className="text-slate-400">אין נתונים להצגה</div>
              </div>
            )}
          </>
        )}
      </main>

      <BackToTopButton />
      <PublicFooter />
    </div>
  )
}
