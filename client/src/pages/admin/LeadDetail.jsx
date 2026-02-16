import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminLeads } from '../../api/admin.js'
import { leadStatusLabels, leadStatusColors } from '../../utils/constants.js'
import { formatDate } from '../../utils/formatters.js'
import { ArrowRight, User, Phone, Mail, MessageSquare, MapPin, Clock, Save } from 'lucide-react'
import { useState } from 'react'
import Spinner from '../../components/ui/Spinner.jsx'
import { useToast } from '../../components/ui/ToastContainer.jsx'

const statusOptions = [
  { value: 'new', label: 'חדש' },
  { value: 'contacted', label: 'נוצר קשר' },
  { value: 'qualified', label: 'מתאים' },
  { value: 'converted', label: 'הומר' },
  { value: 'lost', label: 'אבוד' },
]

export default function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [newStatus, setNewStatus] = useState('')
  const [notes, setNotes] = useState('')

  const { data: lead, isLoading, error } = useQuery({
    queryKey: ['admin', 'lead', id],
    queryFn: () => adminLeads.get(id),
    enabled: !!id,
  })

  const updateStatus = useMutation({
    mutationFn: ({ status, notes }) => adminLeads.updateStatus(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'lead', id] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'leads'] })
      toast('סטטוס עודכן בהצלחה', 'success')
      setNotes('')
      setNewStatus('')
    },
    onError: () => {
      toast('שגיאה בעדכון סטטוס', 'error')
    },
  })

  const handleUpdateStatus = () => {
    if (!newStatus) return
    updateStatus.mutate({ status: newStatus, notes: notes.trim() || undefined })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Spinner className="w-10 h-10 text-gold" />
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto" dir="rtl">
        <div className="glass-panel p-12 text-center">
          <p className="text-red-400 mb-4">ליד לא נמצא</p>
          <button
            onClick={() => navigate('/admin/leads')}
            className="text-sm text-gold hover:underline"
          >
            חזרה לרשימת הלידים
          </button>
        </div>
      </div>
    )
  }

  const statusColor = leadStatusColors[lead.status] || '#64748b'
  const plot = lead.plots

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto" dir="rtl">
      {/* Back button */}
      <button
        onClick={() => navigate('/admin/leads')}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-gold transition mb-6"
      >
        <ArrowRight className="w-4 h-4" />
        חזרה לרשימת לידים
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
            <User className="w-7 h-7 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">{lead.full_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ background: statusColor + '20', color: statusColor }}
              >
                {leadStatusLabels[lead.status] || lead.status}
              </span>
              <span className="text-xs text-slate-500">
                {formatDate(lead.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Info Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6">
            <h2 className="text-base font-bold text-slate-100 mb-4">פרטי ליד</h2>
            <div className="space-y-4">
              {/* Phone */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-slate-400">טלפון</div>
                  <a href={`tel:${lead.phone}`} className="text-sm text-slate-200 hover:text-gold transition" dir="ltr">
                    {lead.phone}
                  </a>
                </div>
              </div>

              {/* Email */}
              {lead.email && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-slate-400">אימייל</div>
                    <a href={`mailto:${lead.email}`} className="text-sm text-slate-200 hover:text-gold transition" dir="ltr">
                      {lead.email}
                    </a>
                  </div>
                </div>
              )}

              {/* Message */}
              {lead.message && (
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-gold" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-slate-400 mb-1">הודעה</div>
                    <p className="text-sm text-slate-300 leading-relaxed bg-navy-light/40 border border-white/5 rounded-xl p-3">
                      {lead.message}
                    </p>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                <Clock className="w-4 h-4 text-slate-500" />
                <div className="text-xs text-slate-500">
                  נוצר: {formatDate(lead.created_at)}
                  {lead.updated_at && lead.updated_at !== lead.created_at && (
                    <span className="mr-4">עודכן: {formatDate(lead.updated_at)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Status Update Card */}
          <div className="glass-panel p-6">
            <h2 className="text-base font-bold text-slate-100 mb-4">עדכון סטטוס</h2>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((opt) => {
                  const color = leadStatusColors[opt.value] || '#64748b'
                  const isSelected = newStatus === opt.value
                  const isCurrent = lead.status === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setNewStatus(isSelected ? '' : opt.value)}
                      disabled={isCurrent}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        isCurrent
                          ? 'opacity-40 cursor-not-allowed'
                          : isSelected
                            ? 'ring-2 ring-gold/50 scale-105'
                            : 'hover:opacity-80'
                      }`}
                      style={{
                        background: color + (isSelected ? '30' : '15'),
                        borderColor: color + (isSelected ? '60' : '25'),
                        color,
                      }}
                    >
                      {opt.label}
                      {isCurrent && ' (נוכחי)'}
                    </button>
                  )
                })}
              </div>

              {newStatus && (
                <>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="הוסף הערה (אופציונלי)..."
                    rows={3}
                    className="w-full px-4 py-3 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:border-gold/50 focus:outline-none transition resize-none text-sm"
                  />
                  <button
                    onClick={handleUpdateStatus}
                    disabled={updateStatus.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-gold-bright rounded-xl text-navy font-bold text-sm hover:shadow-lg hover:shadow-gold/30 transition disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" />
                    {updateStatus.isPending ? 'מעדכן...' : 'עדכן סטטוס'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Associated Plot Card */}
        <div className="space-y-6">
          {plot ? (
            <div className="glass-panel p-6">
              <h2 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gold" />
                חלקה משויכת
              </h2>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-slate-400">גוש / חלקה</div>
                  <div className="text-sm text-slate-200 font-medium">
                    {plot.block_number} / {plot.number}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">עיר</div>
                  <div className="text-sm text-slate-200">{plot.city}</div>
                </div>
                {plot.status && (
                  <div>
                    <div className="text-xs text-slate-400">סטטוס</div>
                    <div className="text-sm text-slate-200">{plot.status}</div>
                  </div>
                )}
                <Link
                  to={`/admin/plots/${plot.id}/edit`}
                  className="flex items-center justify-center gap-2 w-full py-2 mt-2 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-sm hover:bg-white/10 transition"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  ערוך חלקה
                </Link>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-6 text-center">
              <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">אין חלקה משויכת</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
