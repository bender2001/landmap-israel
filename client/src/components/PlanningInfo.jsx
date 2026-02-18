/**
 * PlanningInfo.jsx — Shows relevant תב"ע plans from GovMap
 *
 * Displays planning permits affecting a plot with status badges,
 * links to GovMap, and a timeline of planning progress.
 */

import { useState, useEffect } from 'react'
import { MapPin, ExternalLink, AlertCircle, Clock, CheckCircle2, FileText, Building2 } from 'lucide-react'
import { API_BASE } from '../utils/config'

const STATUS_CONFIG = {
  approved: {
    label: 'אושר',
    labelLong: 'אושרה למתן תוקף',
    color: '#22C55E',
    bg: 'bg-green-500/15',
    border: 'border-green-500/25',
    icon: CheckCircle2,
  },
  deposited: {
    label: 'הופקדה',
    labelLong: 'הופקדה',
    color: '#EAB308',
    bg: 'bg-yellow-500/15',
    border: 'border-yellow-500/25',
    icon: Clock,
  },
  in_preparation: {
    label: 'בהכנה',
    labelLong: 'בשלבי הכנה',
    color: '#3B82F6',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/25',
    icon: FileText,
  },
  in_discussion: {
    label: 'בדיון',
    labelLong: 'בדיון בוועדה',
    color: '#A855F7',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/25',
    icon: Building2,
  },
  cancelled: {
    label: 'בוטלה',
    labelLong: 'בוטלה',
    color: '#EF4444',
    bg: 'bg-red-500/15',
    border: 'border-red-500/25',
    icon: AlertCircle,
  },
  unknown: {
    label: 'לא ידוע',
    labelLong: 'סטטוס לא ידוע',
    color: '#64748B',
    bg: 'bg-slate-500/15',
    border: 'border-slate-500/25',
    icon: Clock,
  },
}

const PLAN_TYPE_LABELS = {
  national: 'ארצית',
  district: 'מחוזית',
  local: 'מקומית',
  detailed: 'מפורטת',
  point: 'נקודתית',
  other: 'אחר',
}

const USE_LABELS = {
  residential: 'מגורים',
  commercial: 'מסחרי',
  industrial: 'תעשייה',
  public: 'ציבורי',
  agricultural: 'חקלאי',
  tourism: 'תיירות',
  mixed: 'מעורב',
}

function formatDate(dateStr) {
  if (!dateStr) return null
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

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.unknown
  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.bg} ${config.border} border`}
      style={{ color: config.color }}
    >
      <Icon className="w-2.5 h-2.5" />
      {config.label}
    </span>
  )
}

function PlanCard({ plan, isExpanded, onToggle }) {
  const config = STATUS_CONFIG[plan.status] || STATUS_CONFIG.unknown

  return (
    <div
      className={`border rounded-xl transition-all ${
        isExpanded ? 'bg-white/[0.03]' : 'bg-white/[0.01] hover:bg-white/[0.02]'
      } border-white/5 hover:border-white/10`}
    >
      {/* Compact header — always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-3 text-right"
      >
        <div
          className="w-1 h-8 rounded-full flex-shrink-0 mt-0.5"
          style={{ background: config.color }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-200 truncate">
              {plan.plan_name || plan.plan_number}
            </span>
            <StatusBadge status={plan.status} />
          </div>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
            {plan.plan_number && <span>תכנית {plan.plan_number}</span>}
            {plan.plan_type && (
              <>
                <span className="text-slate-700">·</span>
                <span>{PLAN_TYPE_LABELS[plan.plan_type] || plan.plan_type}</span>
              </>
            )}
            {plan.status_date && (
              <>
                <span className="text-slate-700">·</span>
                <span>{formatDate(plan.status_date)}</span>
              </>
            )}
          </div>
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 border-t border-white/5 mt-0">
          <div className="grid grid-cols-2 gap-2 mt-3">
            {plan.area_description && (
              <div className="col-span-2">
                <span className="text-[9px] text-slate-500 block">שטח</span>
                <span className="text-[11px] text-slate-300">{plan.area_description}</span>
              </div>
            )}
            {plan.total_units && (
              <div>
                <span className="text-[9px] text-slate-500 block">יח׳ דיור</span>
                <span className="text-[11px] text-slate-300">{plan.total_units.toLocaleString()}</span>
              </div>
            )}
            {plan.main_uses && plan.main_uses.length > 0 && (
              <div>
                <span className="text-[9px] text-slate-500 block">ייעודים</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {plan.main_uses.map((use, i) => (
                    <span
                      key={i}
                      className="text-[8px] text-gold/70 bg-gold/8 px-1.5 py-0.5 rounded"
                    >
                      {USE_LABELS[use] || use}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {plan.city && (
              <div>
                <span className="text-[9px] text-slate-500 block">רשות</span>
                <span className="text-[11px] text-slate-300">{plan.city}</span>
              </div>
            )}
            {plan.relevance && (
              <div>
                <span className="text-[9px] text-slate-500 block">רלוונטיות</span>
                <span className={`text-[11px] font-medium ${
                  plan.relevance === 'direct' ? 'text-gold' :
                  plan.relevance === 'nearby' ? 'text-blue-400' : 'text-slate-400'
                }`}>
                  {plan.relevance === 'direct' ? 'ישירה' :
                   plan.relevance === 'nearby' ? 'בסביבה' : 'אזורית'}
                </span>
              </div>
            )}
          </div>

          {/* Links */}
          <div className="flex gap-2 mt-3">
            {plan.govmap_link && (
              <a
                href={plan.govmap_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[9px] text-gold/60 hover:text-gold transition-colors bg-gold/5 px-2 py-1 rounded-lg"
              >
                <MapPin className="w-2.5 h-2.5" />
                GovMap
                <ExternalLink className="w-2 h-2" />
              </a>
            )}
            {plan.documents_url && (
              <a
                href={plan.documents_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[9px] text-blue-400/60 hover:text-blue-400 transition-colors bg-blue-500/5 px-2 py-1 rounded-lg"
              >
                <FileText className="w-2.5 h-2.5" />
                מסמכים
                <ExternalLink className="w-2 h-2" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PlanningInfo({ plotId, city, className = '' }) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    if (!plotId && !city) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const url = plotId
          ? `${API_BASE}/api/data/plans/plot/${plotId}`
          : `${API_BASE}/api/data/plans?city=${encodeURIComponent(city)}`

        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setPlans(data.plans || [])
      } catch (err) {
        console.error('[PlanningInfo] Fetch error:', err)
        setError('לא הצלחנו לטעון נתוני תכנון. נסה שוב מאוחר יותר.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [plotId, city])

  // Status summary
  const statusCounts = plans.reduce((acc, p) => {
    const s = p.status || 'unknown'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="text-xs font-medium text-slate-200">תכנון ותב"עות</span>
        </div>
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-xs text-red-300">{error}</span>
        </div>
      </div>
    )
  }

  if (plans.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="text-xs font-medium text-slate-200">תכנון ותב"עות</span>
        </div>
        <div className="text-center py-6 text-slate-500 text-xs">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>לא נמצאו תכניות באזור</p>
          <p className="text-[10px] mt-1">נתונים ממנהל התכנון (govmap.gov.il)</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-200">תכנון ותב"עות</span>
            <span className="text-[9px] text-slate-500 mr-2">({plans.length} תכניות)</span>
          </div>
        </div>
      </div>

      {/* Status Summary Pills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {Object.entries(statusCounts).map(([status, count]) => {
          const config = STATUS_CONFIG[status] || STATUS_CONFIG.unknown
          return (
            <span
              key={status}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] ${config.bg} ${config.border} border`}
              style={{ color: config.color }}
            >
              {config.label}: {count}
            </span>
          )
        })}
      </div>

      {/* Plan Timeline / List */}
      <div className="space-y-2">
        {plans.map((plan, i) => (
          <PlanCard
            key={plan.id || i}
            plan={plan}
            isExpanded={expandedId === (plan.id || i)}
            onToggle={() => setExpandedId(expandedId === (plan.id || i) ? null : (plan.id || i))}
          />
        ))}
      </div>

      {/* Attribution */}
      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
        <span className="text-[8px] text-slate-600">מקור: מנהל התכנון — govmap.gov.il</span>
        <a
          href="https://www.govmap.gov.il/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[8px] text-blue-400/50 hover:text-blue-400/80 transition-colors"
        >
          <ExternalLink className="w-2.5 h-2.5" />
          <span>GovMap</span>
        </a>
      </div>
    </div>
  )
}
