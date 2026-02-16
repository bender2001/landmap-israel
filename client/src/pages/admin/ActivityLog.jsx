import { useQuery } from '@tanstack/react-query'
import { adminActivity } from '../../api/admin.js'
import { formatDate } from '../../utils/formatters.js'
import { Activity, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import Spinner from '../../components/ui/Spinner.jsx'

const entityTypes = [
  { value: '', label: 'הכל' },
  { value: 'plot', label: 'חלקות' },
  { value: 'lead', label: 'לידים' },
  { value: 'poi', label: 'נקודות עניין' },
  { value: 'user', label: 'משתמשים' },
]

const actionIcons = {
  create: '➕',
  update: '✏️',
  delete: '🗑️',
  publish: '👁️',
  unpublish: '🔒',
  status_change: '🔄',
}

const actionLabels = {
  create: 'נוצר',
  update: 'עודכן',
  delete: 'נמחק',
  publish: 'פורסם',
  unpublish: 'הוסר מפרסום',
  status_change: 'שינוי סטטוס',
}

export default function ActivityLog() {
  const [entityFilter, setEntityFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'activity', entityFilter, page],
    queryFn: () => adminActivity.list({ entity_type: entityFilter || undefined, page, limit: 30 }),
  })

  const activities = data?.data || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / 30)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="w-10 h-10 text-gold" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">יומן פעילות</h1>
            <p className="text-xs text-slate-500">{total} רשומות</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <Filter className="w-4 h-4 text-slate-400" />
        {entityTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => { setEntityFilter(type.value); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
              entityFilter === type.value
                ? 'bg-gold/15 text-gold font-medium'
                : 'bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {activities.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">אין רשומות פעילות</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((item) => (
            <div
              key={item.id}
              className="glass-panel p-4 flex items-start gap-4 hover:border-gold/20 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 text-lg">
                {actionIcons[item.action] || '📋'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-200">
                    {actionLabels[item.action] || item.action}
                  </span>
                  {item.entity_type && (
                    <span className="text-xs bg-white/5 px-2 py-0.5 rounded-full text-slate-400">
                      {item.entity_type}
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="text-xs text-slate-400 mt-1 truncate">{item.description}</p>
                )}
                {item.entity_id && (
                  <p className="text-[10px] text-slate-600 mt-1" dir="ltr">ID: {item.entity_id}</p>
                )}
              </div>
              <div className="text-xs text-slate-500 flex-shrink-0">
                {formatDate(item.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 disabled:opacity-30 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-400">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 disabled:opacity-30 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
