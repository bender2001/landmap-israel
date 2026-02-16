import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminPois } from '../../api/admin.js'
import { ArrowRight, Save } from 'lucide-react'
import Spinner from '../../components/ui/Spinner.jsx'
import { useToast } from '../../components/ui/ToastContainer.jsx'

const iconOptions = ['📍', '🏥', '🏫', '🏪', '🏬', '🏗️', '🌳', '🏖️', '🚉', '🅿️', '⛽', '🏛️', '🕌', '⛪', '🕍', '🏟️']
const typeOptions = ['general', 'hospital', 'school', 'shopping', 'transport', 'park', 'beach', 'religious', 'government']

export default function PoiForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const isEdit = Boolean(id)

  const [formData, setFormData] = useState({
    name: '',
    type: 'general',
    icon: '📍',
    lat: '',
    lng: '',
    description: '',
  })
  const [errors, setErrors] = useState({})

  // Load existing POI for editing
  const { data: existingPoi, isLoading: loadingPoi } = useQuery({
    queryKey: ['admin', 'pois', id],
    queryFn: () => adminPois.get(id),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existingPoi) {
      setFormData({
        name: existingPoi.name || '',
        type: existingPoi.type || 'general',
        icon: existingPoi.icon || '📍',
        lat: existingPoi.lat?.toString() || '',
        lng: existingPoi.lng?.toString() || '',
        description: existingPoi.description || '',
      })
    }
  }, [existingPoi])

  const saveMutation = useMutation({
    mutationFn: (data) => isEdit ? adminPois.update(id, data) : adminPois.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pois'] })
      toast(isEdit ? 'נקודת עניין עודכנה' : 'נקודת עניין נוצרה', 'success')
      navigate('/admin/pois')
    },
    onError: () => toast('שגיאה בשמירה', 'error'),
  })

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'שדה חובה'
    if (!formData.lat || isNaN(parseFloat(formData.lat))) newErrors.lat = 'נדרש מספר תקין'
    if (!formData.lng || isNaN(parseFloat(formData.lng))) newErrors.lng = 'נדרש מספר תקין'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    saveMutation.mutate({
      name: formData.name.trim(),
      type: formData.type,
      icon: formData.icon,
      lat: parseFloat(formData.lat),
      lng: parseFloat(formData.lng),
      description: formData.description.trim() || null,
    })
  }

  if (isEdit && loadingPoi) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="w-10 h-10 text-gold" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto" dir="rtl">
      <button
        onClick={() => navigate('/admin/pois')}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-gold transition mb-6"
      >
        <ArrowRight className="w-4 h-4" />
        חזרה לרשימה
      </button>

      <h1 className="text-2xl font-bold text-slate-100 mb-6">
        {isEdit ? 'עריכת נקודת עניין' : 'נקודת עניין חדשה'}
      </h1>

      <form onSubmit={handleSubmit} className="glass-panel p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">שם</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="שם נקודת העניין"
            className="w-full px-4 py-3 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:border-gold/50 focus:outline-none transition"
          />
          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
        </div>

        {/* Type */}
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">סוג</label>
          <select
            value={formData.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="w-full px-4 py-3 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 focus:border-gold/50 focus:outline-none transition"
          >
            {typeOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Icon picker */}
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">אייקון</label>
          <div className="flex flex-wrap gap-2">
            {iconOptions.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => handleChange('icon', icon)}
                className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                  formData.icon === icon
                    ? 'bg-gold/20 border-2 border-gold scale-110'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Coordinates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Latitude</label>
            <input
              type="text"
              dir="ltr"
              value={formData.lat}
              onChange={(e) => handleChange('lat', e.target.value)}
              placeholder="32.0853"
              className="w-full px-4 py-3 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:border-gold/50 focus:outline-none transition"
            />
            {errors.lat && <p className="text-red-400 text-xs mt-1">{errors.lat}</p>}
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Longitude</label>
            <input
              type="text"
              dir="ltr"
              value={formData.lng}
              onChange={(e) => handleChange('lng', e.target.value)}
              placeholder="34.7818"
              className="w-full px-4 py-3 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:border-gold/50 focus:outline-none transition"
            />
            {errors.lng && <p className="text-red-400 text-xs mt-1">{errors.lng}</p>}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">תיאור (אופציונלי)</label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="תיאור נקודת העניין..."
            className="w-full px-4 py-3 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:border-gold/50 focus:outline-none transition resize-none"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="w-full py-3.5 bg-gradient-to-r from-gold to-gold-bright rounded-xl text-navy font-bold text-base disabled:opacity-60 transition hover:shadow-lg hover:shadow-gold/30 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'שומר...' : isEdit ? 'עדכן' : 'צור'}
        </button>
      </form>
    </div>
  )
}
