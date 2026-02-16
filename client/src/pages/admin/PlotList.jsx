import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { adminPlots } from '../../api/admin.js'
import { statusColors, statusLabels, zoningLabels } from '../../utils/constants.js'
import { formatCurrency } from '../../utils/formatters.js'
import { Plus, Pencil, Trash2, Eye, EyeOff, Search, CheckSquare, Square, X } from 'lucide-react'
import { useState } from 'react'
import Spinner from '../../components/ui/Spinner.jsx'
import { useToast } from '../../components/ui/ToastContainer.jsx'

export default function PlotList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())

  const { data: plots = [], isLoading } = useQuery({
    queryKey: ['admin', 'plots'],
    queryFn: adminPlots.list,
  })

  const togglePublish = useMutation({
    mutationFn: ({ id, published }) => adminPlots.togglePublish(id, published),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plots'] })
      toast('סטטוס פרסום עודכן', 'success')
    },
  })

  const deletePlot = useMutation({
    mutationFn: (id) => adminPlots.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plots'] })
      toast('חלקה נמחקה', 'success')
    },
  })

  const bulkDelete = useMutation({
    mutationFn: (ids) => adminPlots.bulkDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plots'] })
      setSelected(new Set())
      toast('חלקות נמחקו', 'success')
    },
  })

  const bulkPublish = useMutation({
    mutationFn: ({ ids, published }) => adminPlots.bulkPublish(ids, published),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plots'] })
      setSelected(new Set())
      toast('סטטוס פרסום עודכן', 'success')
    },
  })

  const filtered = plots.filter((p) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      (p.city || '').toLowerCase().includes(s) ||
      String(p.block_number || '').includes(s) ||
      String(p.number || '').includes(s)
    )
  })

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((p) => p.id)))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="w-10 h-10 text-gold" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-100">ניהול חלקות</h1>
        <button
          onClick={() => navigate('/admin/plots/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold to-gold-bright rounded-xl text-navy font-bold text-sm hover:shadow-lg hover:shadow-gold/30 transition"
        >
          <Plus className="w-4 h-4" />
          חלקה חדשה
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="חפש לפי עיר, גוש, חלקה..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pr-10 pl-4 py-2.5 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:border-gold/50 focus:outline-none transition text-sm"
        />
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-gold/5 border border-gold/20 rounded-xl animate-fade-in">
          <span className="text-sm text-gold font-medium">{selected.size} נבחרו</span>
          <button
            onClick={() => bulkPublish.mutate({ ids: [...selected], published: true })}
            className="px-3 py-1.5 text-xs bg-emerald-500/15 text-emerald-400 rounded-lg hover:bg-emerald-500/25 transition"
          >
            פרסם
          </button>
          <button
            onClick={() => bulkPublish.mutate({ ids: [...selected], published: false })}
            className="px-3 py-1.5 text-xs bg-slate-500/15 text-slate-400 rounded-lg hover:bg-slate-500/25 transition"
          >
            הסר פרסום
          </button>
          <button
            onClick={() => {
              if (confirm(`האם למחוק ${selected.size} חלקות?`)) {
                bulkDelete.mutate([...selected])
              }
            }}
            className="px-3 py-1.5 text-xs bg-red-500/15 text-red-400 rounded-lg hover:bg-red-500/25 transition"
          >
            מחק
          </button>
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
                    {selected.size === filtered.length && filtered.length > 0 ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="text-right py-3 px-4 font-medium">גוש / חלקה</th>
                <th className="text-right py-3 px-4 font-medium">עיר</th>
                <th className="text-right py-3 px-4 font-medium">מחיר</th>
                <th className="text-right py-3 px-4 font-medium">שטח</th>
                <th className="text-right py-3 px-4 font-medium">סטטוס</th>
                <th className="text-right py-3 px-4 font-medium">ייעוד</th>
                <th className="text-right py-3 px-4 font-medium">פורסם</th>
                <th className="text-right py-3 px-4 font-medium">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((plot) => {
                const color = statusColors[plot.status]
                const isChecked = selected.has(plot.id)
                return (
                  <tr key={plot.id} className={`border-b border-white/5 transition-colors ${isChecked ? 'bg-gold/5' : 'hover:bg-white/5'}`}>
                    <td className="py-3 px-3">
                      <button onClick={() => toggleSelect(plot.id)} className="text-slate-400 hover:text-gold transition">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-gold" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-medium">
                      {plot.block_number} / {plot.number}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{plot.city}</td>
                    <td className="py-3 px-4 text-gold">{formatCurrency(plot.total_price)}</td>
                    <td className="py-3 px-4 text-slate-300">{plot.size_sqm?.toLocaleString()} מ"ר</td>
                    <td className="py-3 px-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs"
                        style={{ background: `${color}20`, color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                        {statusLabels[plot.status]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">{zoningLabels[plot.zoning_stage]}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => togglePublish.mutate({ id: plot.id, published: !plot.is_published })}
                        className={`p-1.5 rounded-lg transition-colors ${
                          plot.is_published
                            ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                            : 'text-slate-500 bg-white/5 hover:bg-white/10'
                        }`}
                        title={plot.is_published ? 'מפורסם' : 'טיוטה'}
                      >
                        {plot.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/admin/plots/${plot.id}/edit`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-gold hover:bg-gold/10 transition-colors"
                          title="ערוך"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('האם למחוק את החלקה?')) {
                              deletePlot.mutate(plot.id)
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="מחק"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-500">
                    {search ? 'לא נמצאו תוצאות' : 'אין חלקות'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
