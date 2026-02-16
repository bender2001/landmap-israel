import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminLeads } from '../../api/admin.js'
import { leadStatusLabels, leadStatusColors } from '../../utils/constants.js'
import { formatDate } from '../../utils/formatters.js'
import { Download, Search, ChevronDown, ChevronLeft, ChevronRight, CheckSquare, Square, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import TableSkeleton from '../../components/ui/TableSkeleton.jsx'
import SortableHeader from '../../components/admin/SortableHeader.jsx'
import usePagination from '../../hooks/usePagination.js'
import { useToast } from '../../components/ui/ToastContainer.jsx'

const statusOptions = [
  { value: '', label: 'כל הסטטוסים' },
  { value: 'new', label: 'חדש' },
  { value: 'contacted', label: 'נוצר קשר' },
  { value: 'qualified', label: 'מתאים' },
  { value: 'converted', label: 'הומר' },
  { value: 'lost', label: 'אבוד' },
]

export default function LeadList() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())
  const { page, setPage, sortBy, sortDir, handleSort, params } = usePagination()

  const queryParams = {
    ...params,
    status: statusFilter || undefined,
    search: search || undefined,
  }

  const { data: result, isLoading } = useQuery({
    queryKey: ['admin', 'leads', queryParams],
    queryFn: () => adminLeads.list(queryParams),
    keepPreviousData: true,
  })

  const leads = result?.data || []
  const total = result?.total || 0
  const totalPages = Math.ceil(total / params.limit)

  const updateStatus = useMutation({
    mutationFn: ({ id, status, notes }) => adminLeads.updateStatus(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'leads'] })
      toast('סטטוס עודכן', 'success')
    },
  })

  const bulkUpdateStatus = useMutation({
    mutationFn: ({ ids, status }) => adminLeads.bulkUpdateStatus(ids, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'leads'] })
      setSelected(new Set())
      toast('סטטוס עודכן', 'success')
    },
  })

  const handleExport = async () => {
    try {
      const csv = await adminLeads.export()
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast('קובץ CSV יוצא בהצלחה', 'success')
    } catch {
      toast('שגיאה בייצוא', 'error')
    }
  }

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === leads.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(leads.map((l) => l.id)))
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto" dir="rtl">
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 bg-white/5 rounded-lg w-32 animate-pulse" />
          <div className="h-10 bg-white/5 rounded-xl w-28 animate-pulse" />
        </div>
        <TableSkeleton rows={8} cols={7} />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-100">ניהול לידים</h1>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-sm hover:bg-white/10 transition-colors"
        >
          <Download className="w-4 h-4" />
          ייצוא CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="חפש לפי שם, טלפון, אימייל..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pr-10 pl-4 py-2.5 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:border-gold/50 focus:outline-none transition text-sm"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-4 py-2.5 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 focus:border-gold/50 focus:outline-none transition text-sm"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-gold/5 border border-gold/20 rounded-xl animate-fade-in flex-wrap">
          <span className="text-sm text-gold font-medium">{selected.size} נבחרו</span>
          {statusOptions.filter((o) => o.value).map((opt) => (
            <button
              key={opt.value}
              onClick={() => bulkUpdateStatus.mutate({ ids: [...selected], status: opt.value })}
              className="px-2.5 py-1 text-xs rounded-lg transition"
              style={{
                background: (leadStatusColors[opt.value] || '#64748b') + '15',
                color: leadStatusColors[opt.value] || '#94a3b8',
              }}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => setSelected(new Set())}
            className="mr-auto p-1 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="py-3 px-3 w-10">
                  <button onClick={toggleAll} className="text-slate-400 hover:text-gold transition">
                    {selected.size === leads.length && leads.length > 0 ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <SortableHeader label="שם" column="full_name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="טלפון" column="phone" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="אימייל" column="email" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="text-right py-3 px-4 font-medium">חלקה</th>
                <SortableHeader label="סטטוס" column="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="תאריך" column="created_at" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const isChecked = selected.has(lead.id)
                return (
                  <tr key={lead.id} className={`border-b border-white/5 transition-colors ${isChecked ? 'bg-gold/5' : 'hover:bg-white/5'}`}>
                    <td className="py-3 px-3">
                      <button onClick={() => toggleSelect(lead.id)} className="text-slate-400 hover:text-gold transition">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-gold" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-medium">
                      <Link to={`/admin/leads/${lead.id}`} className="hover:text-gold transition-colors">
                        {lead.full_name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-slate-300" dir="ltr">{lead.phone}</td>
                    <td className="py-3 px-4 text-slate-400" dir="ltr">{lead.email}</td>
                    <td className="py-3 px-4 text-slate-300">
                      {lead.plots?.block_number ? `${lead.plots.block_number}/${lead.plots.number}` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusDropdown
                        value={lead.status}
                        onChange={(status, notes) => updateStatus.mutate({ id: lead.id, status, notes })}
                      />
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">
                      {formatDate(lead.created_at)}
                    </td>
                  </tr>
                )
              })}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    {search || statusFilter ? 'לא נמצאו תוצאות' : 'אין לידים'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 disabled:opacity-30 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-400">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 disabled:opacity-30 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-600">({total} סה"כ)</span>
        </div>
      )}
    </div>
  )
}

function StatusDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState(null)
  const [notes, setNotes] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false)
        setPendingStatus(null)
        setNotes('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleConfirm = () => {
    if (pendingStatus) {
      onChange(pendingStatus, notes.trim() || undefined)
    }
    setIsOpen(false)
    setPendingStatus(null)
    setNotes('')
  }

  const color = leadStatusColors[value] || '#64748b'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setIsOpen(prev => !prev); setPendingStatus(null); setNotes('') }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors hover:opacity-80"
        style={{ background: color + '20', color }}
      >
        {leadStatusLabels[value] || value}
        <ChevronDown className="w-3 h-3" />
      </button>
      {isOpen && (
        <div className="absolute top-full mt-1 right-0 z-20 min-w-[200px] bg-navy-mid border border-white/10 rounded-xl shadow-xl overflow-hidden">
          {!pendingStatus ? (
            // Step 1: Select status
            statusOptions.filter(o => o.value).map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  if (opt.value === value) return
                  setPendingStatus(opt.value)
                }}
                className={`block w-full text-right px-3 py-2 text-xs transition-colors ${
                  value === opt.value
                    ? 'bg-gold/10 text-gold'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                {opt.label}
              </button>
            ))
          ) : (
            // Step 2: Add note + confirm
            <div className="p-3 space-y-2">
              <div className="text-xs text-slate-400">
                שינוי ל: <span className="text-slate-200 font-medium">{leadStatusLabels[pendingStatus]}</span>
              </div>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="הערה (אופציונלי)..."
                className="w-full px-2.5 py-1.5 bg-navy-light/60 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:border-gold/50 focus:outline-none transition text-xs"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm() }}
              />
              <div className="flex gap-1.5">
                <button
                  onClick={handleConfirm}
                  className="flex-1 px-2 py-1.5 bg-gold/20 text-gold text-xs rounded-lg hover:bg-gold/30 transition font-medium"
                >
                  אישור
                </button>
                <button
                  onClick={() => { setPendingStatus(null); setNotes('') }}
                  className="px-2 py-1.5 text-slate-400 text-xs hover:text-slate-200 transition"
                >
                  ביטול
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
