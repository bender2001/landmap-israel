import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { adminPois } from '../../api/admin.js'
import { Plus, Pencil, Trash2, Search, MapPin } from 'lucide-react'
import { useState } from 'react'
import Spinner from '../../components/ui/Spinner.jsx'
import { useToast } from '../../components/ui/ToastContainer.jsx'

export default function PoiList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')

  const { data: pois = [], isLoading } = useQuery({
    queryKey: ['admin', 'pois'],
    queryFn: adminPois.list,
  })

  const deletePoi = useMutation({
    mutationFn: (id) => adminPois.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pois'] })
      toast('נקודת עניין נמחקה', 'success')
    },
    onError: () => toast('שגיאה במחיקה', 'error'),
  })

  const filtered = pois.filter((p) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (p.name || '').toLowerCase().includes(s) || (p.type || '').toLowerCase().includes(s)
  })

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
        <h1 className="text-2xl font-bold text-slate-100">ניהול נקודות עניין</h1>
        <button
          onClick={() => navigate('/admin/pois/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold to-gold-bright rounded-xl text-navy font-bold text-sm hover:shadow-lg hover:shadow-gold/30 transition"
        >
          <Plus className="w-4 h-4" />
          נקודה חדשה
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="חפש לפי שם או סוג..."
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
                <th className="text-right py-3 px-4 font-medium">אייקון</th>
                <th className="text-right py-3 px-4 font-medium">שם</th>
                <th className="text-right py-3 px-4 font-medium">סוג</th>
                <th className="text-right py-3 px-4 font-medium">קואורדינטות</th>
                <th className="text-right py-3 px-4 font-medium">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((poi) => (
                <tr key={poi.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 text-xl">{poi.icon || '📍'}</td>
                  <td className="py-3 px-4 text-slate-200 font-medium">{poi.name}</td>
                  <td className="py-3 px-4 text-slate-400">{poi.type || 'general'}</td>
                  <td className="py-3 px-4 text-slate-400 text-xs" dir="ltr">
                    {poi.lat?.toFixed(4)}, {poi.lng?.toFixed(4)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/admin/pois/${poi.id}/edit`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-gold hover:bg-gold/10 transition-colors"
                        title="ערוך"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('האם למחוק את נקודת העניין?')) {
                            deletePoi.mutate(poi.id)
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
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-500">
                    {search ? 'לא נמצאו תוצאות' : 'אין נקודות עניין'}
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
