import { useState } from 'react'
import { X, User, Phone, Mail, Lock } from 'lucide-react'
import { useCreateLead } from '../hooks/useLeads.js'

const phoneRegex = /^0[2-9]\d{7,8}$/
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LeadModal({ isOpen, onClose, plot }) {
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' })
  const [isSuccess, setIsSuccess] = useState(false)
  const [errors, setErrors] = useState({})
  const createLead = useCreateLead()

  if (!isOpen) return null

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'נא להזין שם מלא (לפחות 2 תווים)'
    }
    if (!formData.phone || !phoneRegex.test(formData.phone.replace(/-/g, ''))) {
      newErrors.phone = 'נא להזין מספר טלפון ישראלי תקין'
    }
    if (!formData.email || !emailRegex.test(formData.email)) {
      newErrors.email = 'נא להזין כתובת אימייל תקינה'
    }
    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = validate()
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    try {
      await createLead.mutateAsync({
        plot_id: plot?.id,
        full_name: formData.name.trim(),
        phone: formData.phone.replace(/-/g, ''),
        email: formData.email.trim(),
      })
      setIsSuccess(true)
      setTimeout(() => {
        setIsSuccess(false)
        setFormData({ name: '', phone: '', email: '' })
        setErrors({})
        createLead.reset()
        onClose()
      }, 2000)
    } catch {
      setErrors({ form: 'אירעה שגיאה בשליחת הפרטים. נסה שוב.' })
    }
  }

  const blockNumber = plot?.block_number ?? plot?.blockNumber

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="glass-panel max-w-md w-full mx-4 p-0 overflow-hidden animate-scale-in"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gold accent bar */}
        <div
          className="h-[3px]"
          style={{ background: 'linear-gradient(90deg, #C8942A, #E5B94E, #F0D078, #E5B94E, #C8942A)' }}
        />

        {isSuccess ? (
          /* Success state */
          <div className="p-10 flex flex-col items-center justify-center gap-4">
            <svg className="w-20 h-20" viewBox="0 0 52 52">
              <circle
                cx="26" cy="26" r="25"
                fill="none"
                stroke="#22C55E"
                strokeWidth="2"
                style={{ strokeDasharray: 157, strokeDashoffset: 0 }}
                className="animate-draw-check"
              />
              <path
                fill="none"
                stroke="#22C55E"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.1 27.2l7.1 7.2 16.7-16.8"
                style={{ strokeDasharray: 50, strokeDashoffset: 0 }}
                className="animate-draw-check"
              />
            </svg>
            <div className="text-lg font-bold text-green-400">הפרטים נשלחו בהצלחה!</div>
            <div className="text-sm text-slate-400">ניצור אתך קשר בהקדם</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-6 pb-4 relative">
              <h2 className="text-xl font-bold text-slate-100">צור קשר</h2>
              {plot && (
                <p className="text-sm text-slate-400 mt-1">
                  גוש {blockNumber} | חלקה {plot.number}
                </p>
              )}
              <button
                onClick={onClose}
                className="absolute top-4 left-4 w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-center"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 pt-2">
              {errors.form && (
                <p className="text-red-400 text-sm mb-3 text-center">{errors.form}</p>
              )}

              {/* Name */}
              <div className="mb-4">
                <label className="text-xs text-slate-400 mb-1.5 block">שם מלא</label>
                <div className="relative flex items-center">
                  <User className="absolute right-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="הכנס שם מלא"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full pr-10 pl-4 py-3 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:border-gold/50 focus:outline-none transition"
                  />
                </div>
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
              </div>

              {/* Phone */}
              <div className="mb-4">
                <label className="text-xs text-slate-400 mb-1.5 block">טלפון</label>
                <div className="relative flex items-center">
                  <Phone className="absolute right-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="tel"
                    placeholder="050-0000000"
                    dir="ltr"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full pr-10 pl-4 py-3 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 text-right placeholder-slate-500 focus:border-gold/50 focus:outline-none transition"
                  />
                </div>
                {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
              </div>

              {/* Email */}
              <div className="mb-4">
                <label className="text-xs text-slate-400 mb-1.5 block">אימייל</label>
                <div className="relative flex items-center">
                  <Mail className="absolute right-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="email@example.com"
                    dir="ltr"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full pr-10 pl-4 py-3 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 text-right placeholder-slate-500 focus:border-gold/50 focus:outline-none transition"
                  />
                </div>
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={createLead.isPending}
                className="w-full py-3.5 mt-2 bg-gradient-to-r from-gold to-gold-bright rounded-xl text-navy font-bold text-base disabled:opacity-60 transition hover:shadow-lg hover:shadow-gold/30"
              >
                {createLead.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                    </svg>
                    שולח...
                  </span>
                ) : (
                  'שלח פרטים'
                )}
              </button>

              {/* Trust text */}
              <div className="flex items-center justify-center gap-1.5 mt-3">
                <Lock className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs text-slate-400">המידע שלך מאובטח</span>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
