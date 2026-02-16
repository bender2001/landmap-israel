import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { adminPlots } from '../../api/admin.js'
import { statusColors, statusLabels, zoningLabels } from '../../utils/constants.js'
import { formatCurrency } from '../../utils/formatters.js'
import { Plus, Pencil, Trash2, Eye, EyeOff, Search } from 'lucide-react'
import { useState } from 'react'
import Spinner from '../../components/ui/Spinner.jsx'

export default function PlotList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: plots = [], isLoading } = useQuery({
    queryKey: ['admin', 'plots'],
    queryFn: adminPlots.list,
  })

  const togglePublish = useMutation({
    mutationFn: ({ id, published }) => adminPlots.togglePublish(id, published),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'plots'] }),
  })

  const deletePlot = useMutation({
    mutationFn: (id) => adminPlots.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'plots'] }),
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="w-10 h-10 text-gold" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
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

      {/* Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
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
                return (
                  <tr key={plot.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
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
                  <td colSpan={8} className="text-center py-10 text-slate-500">
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
