import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminPlots, adminImages, adminDocuments } from '../../api/admin.js'
import { statusLabels, zoningLabels } from '../../utils/constants.js'
import { ArrowRight, Save, Upload, Trash2, ImageIcon, FileText } from 'lucide-react'
import Spinner from '../../components/ui/Spinner.jsx'
import CoordinateMapPicker from '../../components/admin/CoordinateMapPicker.jsx'
import { useToast } from '../../components/ui/ToastContainer.jsx'

const emptyForm = {
  block_number: '',
  number: '',
  city: '',
  status: 'available',
  zoning_stage: 'agricultural',
  total_price: '',
  projected_value: '',
  size_sqm: '',
  readiness_estimate: '',
  description: '',
  area_context: '',
  nearby_development: '',
  distance_to_sea: '',
  distance_to_park: '',
  distance_to_hospital: '',
  density_units_per_dunam: '',
  tax_authority_value: '',
  coordinates: '',
  is_published: false,
}

export default function PlotForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [form, setForm] = useState(emptyForm)
  const [coordsArray, setCoordsArray] = useState([])
  const [error, setError] = useState('')

  const { data: existing, isLoading } = useQuery({
    queryKey: ['admin', 'plot', id],
    queryFn: () => adminPlots.get(id),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing) {
      setForm({
        block_number: existing.block_number ?? '',
        number: existing.number ?? '',
        city: existing.city ?? '',
        status: existing.status ?? 'available',
        zoning_stage: existing.zoning_stage ?? 'agricultural',
        total_price: existing.total_price ?? '',
        projected_value: existing.projected_value ?? '',
        size_sqm: existing.size_sqm ?? '',
        readiness_estimate: existing.readiness_estimate ?? '',
        description: existing.description ?? '',
        area_context: existing.area_context ?? '',
        nearby_development: existing.nearby_development ?? '',
        distance_to_sea: existing.distance_to_sea ?? '',
        distance_to_park: existing.distance_to_park ?? '',
        distance_to_hospital: existing.distance_to_hospital ?? '',
        density_units_per_dunam: existing.density_units_per_dunam ?? '',
        tax_authority_value: existing.tax_authority_value ?? '',
        coordinates: existing.coordinates ? JSON.stringify(existing.coordinates) : '',
        is_published: existing.is_published ?? false,
      })
      if (Array.isArray(existing.coordinates)) {
        setCoordsArray(existing.coordinates)
      }
    }
  }, [existing])

  const saveMutation = useMutation({
    mutationFn: (data) => isEdit ? adminPlots.update(id, data) : adminPlots.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plots'] })
      navigate('/admin/plots')
    },
    onError: (err) => setError(err.message || 'שגיאה בשמירה'),
  })

  // Image upload
  const uploadImage = useMutation({
    mutationFn: ({ file, alt }) => adminImages.upload(id, file, alt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plot', id] })
      toast('תמונה הועלתה', 'success')
    },
    onError: () => toast('שגיאה בהעלאת תמונה', 'error'),
  })

  const deleteImage = useMutation({
    mutationFn: (imgId) => adminImages.delete(imgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plot', id] })
      toast('תמונה נמחקה', 'success')
    },
  })

  // Document upload
  const uploadDoc = useMutation({
    mutationFn: ({ file, name }) => adminDocuments.upload(id, file, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plot', id] })
      toast('מסמך הועלה', 'success')
    },
    onError: () => toast('שגיאה בהעלאת מסמך', 'error'),
  })

  const deleteDoc = useMutation({
    mutationFn: (docId) => adminDocuments.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plot', id] })
      toast('מסמך נמחק', 'success')
    },
  })

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleCoordsChange = (newCoords) => {
    setCoordsArray(newCoords)
    setForm(prev => ({ ...prev, coordinates: JSON.stringify(newCoords) }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    const payload = {
      ...form,
      block_number: Number(form.block_number) || 0,
      number: Number(form.number) || 0,
      total_price: Number(form.total_price) || 0,
      projected_value: Number(form.projected_value) || 0,
      size_sqm: Number(form.size_sqm) || 0,
      distance_to_sea: form.distance_to_sea ? Number(form.distance_to_sea) : null,
      distance_to_park: form.distance_to_park ? Number(form.distance_to_park) : null,
      distance_to_hospital: form.distance_to_hospital ? Number(form.distance_to_hospital) : null,
      density_units_per_dunam: form.density_units_per_dunam ? Number(form.density_units_per_dunam) : null,
      tax_authority_value: form.tax_authority_value ? Number(form.tax_authority_value) : null,
    }

    // Parse coordinates
    try {
      if (form.coordinates) {
        payload.coordinates = JSON.parse(form.coordinates)
      }
    } catch {
      setError('פורמט קואורדינטות שגוי (JSON)')
      return
    }

    saveMutation.mutate(payload)
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) uploadImage.mutate({ file, alt: '' })
    e.target.value = ''
  }

  const handleDocUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) uploadDoc.mutate({ file, name: file.name })
    e.target.value = ''
  }

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="w-10 h-10 text-gold" />
      </div>
    )
  }

  const images = existing?.plot_images || []
  const documents = existing?.plot_documents || []

  return (
    <div className="p-6 max-w-3xl mx-auto" dir="rtl">
      <button
        onClick={() => navigate('/admin/plots')}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-gold transition-colors mb-4"
      >
        <ArrowRight className="w-4 h-4" />
        חזרה לרשימה
      </button>

      <h1 className="text-2xl font-bold text-slate-100 mb-6">
        {isEdit ? 'עריכת חלקה' : 'חלקה חדשה'}
      </h1>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="glass-panel p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-300 mb-2">פרטים בסיסיים</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="מספר גוש" type="number" value={form.block_number} onChange={(v) => handleChange('block_number', v)} />
            <Field label="מספר חלקה" type="number" value={form.number} onChange={(v) => handleChange('number', v)} />
            <Field label="עיר" value={form.city} onChange={(v) => handleChange('city', v)} />
            <Field label="שטח (מ&quot;ר)" type="number" value={form.size_sqm} onChange={(v) => handleChange('size_sqm', v)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="סטטוס" value={form.status} options={statusLabels} onChange={(v) => handleChange('status', v)} />
            <SelectField label="שלב ייעוד" value={form.zoning_stage} options={zoningLabels} onChange={(v) => handleChange('zoning_stage', v)} />
          </div>
        </div>

        {/* Financial */}
        <div className="glass-panel p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-300 mb-2">נתונים פיננסיים</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="מחיר מבוקש (₪)" type="number" value={form.total_price} onChange={(v) => handleChange('total_price', v)} />
            <Field label="שווי צפוי (₪)" type="number" value={form.projected_value} onChange={(v) => handleChange('projected_value', v)} />
            <Field label="שווי רשות מיסים (₪)" type="number" value={form.tax_authority_value} onChange={(v) => handleChange('tax_authority_value', v)} />
            <Field label="צפי מוכנות" value={form.readiness_estimate} onChange={(v) => handleChange('readiness_estimate', v)} placeholder="3-5 שנים" />
          </div>
        </div>

        {/* Details */}
        <div className="glass-panel p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-300 mb-2">פרטים נוספים</h2>
          <TextArea label="תיאור" value={form.description} onChange={(v) => handleChange('description', v)} />
          <TextArea label="הקשר אזורי" value={form.area_context} onChange={(v) => handleChange('area_context', v)} />
          <Field label="פיתוח סמוך" value={form.nearby_development} onChange={(v) => handleChange('nearby_development', v)} />
          <div className="grid grid-cols-3 gap-4">
            <Field label="מרחק מהים (מ')" type="number" value={form.distance_to_sea} onChange={(v) => handleChange('distance_to_sea', v)} />
            <Field label="מרחק מפארק (מ')" type="number" value={form.distance_to_park} onChange={(v) => handleChange('distance_to_park', v)} />
            <Field label="מרחק מביה&quot;ח (מ')" type="number" value={form.distance_to_hospital} onChange={(v) => handleChange('distance_to_hospital', v)} />
          </div>
          <Field label="צפיפות (יח&quot;ד/דונם)" type="number" value={form.density_units_per_dunam} onChange={(v) => handleChange('density_units_per_dunam', v)} />
        </div>

        {/* Coordinates — Map Picker */}
        <div className="glass-panel p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-300 mb-2">קואורדינטות מגרש</h2>
          <CoordinateMapPicker value={coordsArray} onChange={handleCoordsChange} />
        </div>

        {/* Images — Edit mode only */}
        {isEdit && (
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-gold" />
                תמונות ({images.length})
              </h2>
              <label className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gold/15 text-gold rounded-lg hover:bg-gold/25 transition cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                העלה תמונה
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
            {images.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {images.map((img) => (
                  <div key={img.id} className="relative group rounded-xl overflow-hidden border border-white/10">
                    <img src={img.url} alt={img.alt} className="w-full h-24 object-cover" />
                    <button
                      type="button"
                      onClick={() => deleteImage.mutate(img.id)}
                      className="absolute top-1 left-1 p-1 bg-red-500/80 rounded-lg opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">אין תמונות. העלה תמונות לחלקה.</p>
            )}
          </div>
        )}

        {/* Documents — Edit mode only */}
        {isEdit && (
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gold" />
                מסמכים ({documents.length})
              </h2>
              <label className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gold/15 text-gold rounded-lg hover:bg-gold/25 transition cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                העלה מסמך
                <input type="file" accept="application/pdf,image/*" className="hidden" onChange={handleDocUpload} />
              </label>
            </div>
            {documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between bg-navy-light/40 border border-white/5 rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-gold/60 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-slate-300 truncate">{doc.name}</p>
                        {doc.size_bytes && (
                          <p className="text-[10px] text-slate-500">{(doc.size_bytes / 1024).toFixed(0)} KB</p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteDoc.mutate(doc.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">אין מסמכים. העלה מסמכים לחלקה.</p>
            )}
          </div>
        )}

        {/* Publish toggle */}
        <div className="glass-panel p-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => handleChange('is_published', e.target.checked)}
              className="w-4 h-4 rounded accent-gold"
            />
            <span className="text-sm text-slate-200">פרסם חלקה (גלוי לציבור)</span>
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-gold to-gold-bright rounded-xl text-navy font-bold disabled:opacity-60 transition hover:shadow-lg hover:shadow-gold/30"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'שומר...' : isEdit ? 'עדכן חלקה' : 'צור חלקה'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-xs text-slate-400 mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:border-gold/50 focus:outline-none transition text-sm"
      />
    </div>
  )
}

function SelectField({ label, value, options, onChange }) {
  return (
    <div>
      <label className="text-xs text-slate-400 mb-1.5 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 focus:border-gold/50 focus:outline-none transition text-sm"
      >
        {Object.entries(options).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
    </div>
  )
}

function TextArea({ label, value, onChange, rows = 3 }) {
  return (
    <div>
      <label className="text-xs text-slate-400 mb-1.5 block">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2.5 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:border-gold/50 focus:outline-none transition text-sm resize-none"
      />
    </div>
  )
}
