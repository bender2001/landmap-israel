/**
 * RealTransactions.jsx — Shows real nearby transactions from nadlan.gov.il
 *
 * Displays a table of actual real estate transactions near a plot,
 * with average price calculations and government data attribution.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { TrendingUp, TrendingDown, ArrowUpDown, ExternalLink, AlertCircle, Database, RefreshCw, ChevronDown } from 'lucide-react'
import { API_BASE } from '../utils/config'

function formatPrice(amount) {
  if (!amount) return '—'
  if (amount >= 1_000_000) return `₪${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `₪${(amount / 1_000).toFixed(0)}K`
  return `₪${amount.toLocaleString()}`
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

const PROPERTY_TYPE_LABELS = {
  land: '🏗️ קרקע',
  apartment: '🏠 דירה',
  house: '🏡 בית',
  commercial: '🏪 מסחרי',
  other: '📋 אחר',
}

const DEAL_TYPE_LABELS = {
  sale: 'מכירה',
  lease: 'חכירה',
  gift: 'מתנה',
  inheritance: 'ירושה',
}

export default function RealTransactions({ plotId, city, className = '' }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortField, setSortField] = useState('deal_date')
  const [sortAsc, setSortAsc] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [showAll, setShowAll] = useState(false)
  const abortRef = useRef(null)

  const fetchData = useCallback(async (signal) => {
    if (!plotId && !city) return
    setLoading(true)
    setError(null)
    try {
      const url = plotId
        ? `${API_BASE}/api/data/transactions/nearby/${plotId}?radius=2000`
        : `${API_BASE}/api/data/transactions?city=${encodeURIComponent(city)}&months=24`

      const res = await fetch(url, { signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setTransactions(data.transactions || [])
    } catch (err) {
      if (err.name === 'AbortError') return // component unmounted or params changed
      setError('לא הצלחנו לטעון נתוני עסקאות. נסה שוב מאוחר יותר.')
    } finally {
      setLoading(false)
    }
  }, [plotId, city])

  useEffect(() => {
    if (!plotId && !city) return
    // Abort any in-flight request when plotId/city changes or on unmount
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    fetchData(controller.signal)
    return () => controller.abort()
  }, [plotId, city, fetchData])

  const handleRetry = useCallback(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    fetchData(controller.signal)
  }, [fetchData])

  // Filter and sort
  const processedTx = useMemo(() => {
    let filtered = [...transactions]

    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.property_type === filterType)
    }

    filtered.sort((a, b) => {
      let valA = a[sortField]
      let valB = b[sortField]
      if (sortField === 'deal_date') {
        valA = new Date(valA || 0).getTime()
        valB = new Date(valB || 0).getTime()
      }
      if (typeof valA === 'string') valA = valA.toLowerCase()
      if (typeof valB === 'string') valB = valB.toLowerCase()
      if (valA < valB) return sortAsc ? -1 : 1
      if (valA > valB) return sortAsc ? 1 : -1
      return 0
    })

    return filtered
  }, [transactions, sortField, sortAsc, filterType])

  // Stats
  const stats = useMemo(() => {
    const valid = processedTx.filter(t => t.deal_amount > 0 && t.size_sqm > 0)
    if (valid.length === 0) return null

    const prices = valid.map(t => t.deal_amount / t.size_sqm)
    const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length)
    const sorted = [...prices].sort((a, b) => a - b)
    const med = Math.round(sorted[Math.floor(sorted.length / 2)])
    const min = Math.round(Math.min(...prices))
    const max = Math.round(Math.max(...prices))
    const totalVolume = valid.reduce((s, t) => s + t.deal_amount, 0)

    return { avg, median: med, min, max, count: valid.length, totalVolume }
  }, [processedTx])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center">
            <Database className="w-3.5 h-3.5 text-gold" />
          </div>
          <span className="text-xs font-medium text-slate-200">עסקאות בסביבה</span>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 rounded-xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-xs text-red-300">{error}</span>
          </div>
          <button
            onClick={handleRetry}
            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 hover:text-red-200 transition-all flex-shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            נסה שוב
          </button>
        </div>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center">
            <Database className="w-3.5 h-3.5 text-gold" />
          </div>
          <span className="text-xs font-medium text-slate-200">עסקאות בסביבה</span>
        </div>
        <div className="text-center py-6 text-slate-500 text-xs">
          <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>לא נמצאו עסקאות באזור</p>
          <p className="text-[10px] mt-1">נתונים מנדל"ן נט (nadlan.gov.il)</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center">
            <Database className="w-3.5 h-3.5 text-gold" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-200">עסקאות בסביבה</span>
            <span className="text-[9px] text-slate-500 mr-2">({transactions.length})</span>
          </div>
        </div>
        {/* Filter pills */}
        <div className="flex gap-1">
          {[
            { key: 'all', label: 'הכל' },
            { key: 'land', label: 'קרקע' },
            { key: 'apartment', label: 'דירה' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterType(f.key)}
              className={`text-[9px] px-2 py-0.5 rounded-md transition-all ${
                filterType === f.key
                  ? 'bg-gold/15 text-gold border border-gold/20'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="bg-white/[0.03] rounded-lg p-2 text-center">
            <div className="text-[8px] text-slate-500">ממוצע/מ״ר</div>
            <div className="text-xs font-bold text-gold">₪{stats.avg.toLocaleString()}</div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2 text-center">
            <div className="text-[8px] text-slate-500">חציון/מ״ר</div>
            <div className="text-xs font-bold text-slate-300">₪{stats.median.toLocaleString()}</div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2 text-center">
            <div className="text-[8px] text-slate-500">טווח</div>
            <div className="text-xs font-bold text-slate-300">
              {formatPrice(stats.min)}–{formatPrice(stats.max)}
            </div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2 text-center">
            <div className="text-[8px] text-slate-500">עסקאות</div>
            <div className="text-xs font-bold text-blue-400">{stats.count}</div>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-slate-500 border-b border-white/5">
              <th
                className="text-right py-1.5 px-1 cursor-pointer hover:text-slate-300 transition-colors"
                onClick={() => handleSort('deal_date')}
              >
                <span className="flex items-center gap-1">
                  תאריך
                  <ArrowUpDown className="w-2.5 h-2.5" />
                </span>
              </th>
              <th
                className="text-right py-1.5 px-1 cursor-pointer hover:text-slate-300 transition-colors"
                onClick={() => handleSort('deal_amount')}
              >
                <span className="flex items-center gap-1">
                  מחיר
                  <ArrowUpDown className="w-2.5 h-2.5" />
                </span>
              </th>
              <th className="text-right py-1.5 px-1">שטח</th>
              <th
                className="text-right py-1.5 px-1 cursor-pointer hover:text-slate-300 transition-colors"
                onClick={() => handleSort('price_per_sqm')}
              >
                <span className="flex items-center gap-1">
                  ₪/מ״ר
                  <ArrowUpDown className="w-2.5 h-2.5" />
                </span>
              </th>
              <th className="text-right py-1.5 px-1">כתובת</th>
            </tr>
          </thead>
          <tbody>
            {processedTx.slice(0, showAll ? processedTx.length : 20).map((tx, i) => {
              const priceSqm = tx.size_sqm > 0 ? Math.round(tx.deal_amount / tx.size_sqm) : null
              const isAboveAvg = stats && priceSqm && priceSqm > stats.avg

              return (
                <tr
                  key={tx.id || i}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-1.5 px-1 text-slate-400">{formatDate(tx.deal_date)}</td>
                  <td className="py-1.5 px-1 font-medium text-slate-200">{formatPrice(tx.deal_amount)}</td>
                  <td className="py-1.5 px-1 text-slate-400">
                    {tx.size_sqm ? `${tx.size_sqm.toLocaleString()} מ״ר` : '—'}
                  </td>
                  <td className="py-1.5 px-1">
                    {priceSqm ? (
                      <span className={`font-medium flex items-center gap-0.5 ${
                        isAboveAvg ? 'text-red-400' : 'text-emerald-400'
                      }`}>
                        {isAboveAvg
                          ? <TrendingUp className="w-2.5 h-2.5" />
                          : <TrendingDown className="w-2.5 h-2.5" />
                        }
                        ₪{priceSqm.toLocaleString()}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-1.5 px-1 text-slate-500 truncate max-w-[120px]" title={tx.address}>
                    {tx.address || '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {processedTx.length > 20 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 mt-1 text-[10px] text-gold/70 hover:text-gold transition-colors rounded-lg hover:bg-gold/5"
        >
          <ChevronDown className="w-3 h-3" />
          <span>הצג את כל {processedTx.length} העסקאות</span>
        </button>
      )}
      {showAll && processedTx.length > 20 && (
        <button
          onClick={() => setShowAll(false)}
          className="w-full flex items-center justify-center gap-1.5 py-2 mt-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors rounded-lg hover:bg-white/5"
        >
          <ChevronDown className="w-3 h-3 rotate-180" />
          <span>הצג פחות</span>
        </button>
      )}

      {/* Attribution */}
      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] text-slate-600">מקור: נדל"ן נט (nadlan.gov.il) — משרד המשפטים</span>
        </div>
        <a
          href="https://www.nadlan.gov.il/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[8px] text-gold/50 hover:text-gold/80 transition-colors"
        >
          <ExternalLink className="w-2.5 h-2.5" />
          <span>למקור</span>
        </a>
      </div>
    </div>
  )
}
