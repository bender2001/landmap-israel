import { useState } from 'react'
import { User, Phone, Mail, MessageSquare, Lock, Send, CheckCircle2 } from 'lucide-react'
import { useCreateLead } from '../../hooks/useLeads'
import PublicNav from '../../components/PublicNav'
import PublicFooter from '../../components/PublicFooter'
import { useMetaTags } from '../../hooks/useMetaTags'

const phoneRegex = /^0[2-9]\d{7,8}$/
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Contact() {
  useMetaTags({
    title: 'צור קשר — LandMap Israel | השאירו פרטים ונחזור אליכם',
    description: 'מעוניינים בהשקעה בקרקע? צרו קשר עם צוות LandMap. נחזור אליכם בהקדם עם מידע מותאם אישית.',
    url: `${window.location.origin}/contact`,
  })

  const [formData, setFormData] = useState({ name: '', phone: '', email: '', message: '' })
  const [errors, setErrors] = useState({})
  const [isSuccess, setIsSuccess] = useState(false)
  const createLead = useCreateLead()

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!formData.name || formData.name.trim().length < 2) e.name = 'נא להזין שם מלא'
    if (!formData.phone || !phoneRegex.test(formData.phone.replace(/-/g, ''))) e.phone = 'נא להזין טלפון ישראלי תקין'
    if (!formData.email || !emailRegex.test(formData.email)) e.email = 'נא להזין אימייל תקין'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = validate()
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    try {
      await createLead.mutateAsync({
        full_name: formData.name.trim(),
        phone: formData.phone.replace(/-/g, ''),
        email: formData.email.trim(),
        message: formData.message.trim(),
      })
      setIsSuccess(true)
      setTimeout(() => {
        setIsSuccess(false)
        setFormData({ name: '', phone: '', email: '', message: '' })
        createLead.reset()
      }, 3000)
    } catch {
      setErrors({ form: 'אירעה שגיאה בשליחה. נסו שוב.' })
    }
  }

  return (
    <div className="min-h-screen bg-navy" dir="rtl">
      <PublicNav />

      <div className="pt-28 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-4 animate-fade-in-up">
              צרו איתנו קשר
            </h1>
            <p className="text-slate-400 max-w-lg mx-auto animate-fade-in-up">
              מעוניינים לשמוע עוד? השאירו פרטים ונחזור אליכם בהקדם.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-4xl mx-auto">
            {/* Contact info */}
            <div className="lg:col-span-2 space-y-4">
              <div className="glass-panel p-6">
                <h3 className="text-lg font-bold text-slate-100 mb-4">פרטי התקשרות</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">טלפון</div>
                      <div className="text-sm text-slate-200" dir="ltr">+972-50-000-0000</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">אימייל</div>
                      <div className="text-sm text-slate-200" dir="ltr">info@landmap.co.il</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-6">
                <h3 className="text-lg font-bold text-slate-100 mb-2">שעות פעילות</h3>
                <div className="space-y-1.5 text-sm text-slate-400">
                  <div className="flex justify-between">
                    <span>ראשון - חמישי</span>
                    <span className="text-slate-300">09:00 - 18:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>שישי</span>
                    <span className="text-slate-300">09:00 - 13:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>שבת</span>
                    <span className="text-slate-500">סגור</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-3">
              <div className="glass-panel p-0 overflow-hidden">
                <div
                  className="h-[3px]"
                  style={{ background: 'linear-gradient(90deg, #C8942A, #E5B94E, #F0D078, #E5B94E, #C8942A)' }}
                />

                {isSuccess ? (
                  <div className="p-12 flex flex-col items-center gap-4 text-center">
                    <CheckCircle2 className="w-16 h-16 text-green-400" />
                    <div className="text-xl font-bold text-green-400">הפרטים נשלחו בהצלחה!</div>
                    <p className="text-sm text-slate-400">ניצור אתך קשר בהקדם</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {errors.form && (
                      <p className="text-red-400 text-sm text-center">{errors.form}</p>
                    )}

                    {/* Name */}
                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block">שם מלא</label>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
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
                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block">טלפון</label>
                      <div className="relative">
                        <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="tel"
                          dir="ltr"
                          placeholder="050-0000000"
                          value={formData.phone}
                          onChange={(e) => handleChange('phone', e.target.value)}
                          className="w-full pr-10 pl-4 py-3 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 text-right placeholder-slate-500 focus:border-gold/50 focus:outline-none transition"
                        />
                      </div>
                      {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block">אימייל</label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="email"
                          dir="ltr"
                          placeholder="email@example.com"
                          value={formData.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                          className="w-full pr-10 pl-4 py-3 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 text-right placeholder-slate-500 focus:border-gold/50 focus:outline-none transition"
                        />
                      </div>
                      {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                    </div>

                    {/* Message */}
                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block">הודעה (אופציונלי)</label>
                      <div className="relative">
                        <MessageSquare className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                        <textarea
                          placeholder="ספרו לנו על הצרכים שלכם..."
                          rows={4}
                          value={formData.message}
                          onChange={(e) => handleChange('message', e.target.value)}
                          className="w-full pr-10 pl-4 py-3 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:border-gold/50 focus:outline-none transition resize-none"
                        />
                      </div>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={createLead.isPending}
                      className="w-full py-3.5 bg-gradient-to-r from-gold to-gold-bright rounded-xl text-navy font-bold text-base disabled:opacity-60 transition hover:shadow-lg hover:shadow-gold/30 flex items-center justify-center gap-2"
                    >
                      {createLead.isPending ? (
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                          </svg>
                          שולח...
                        </span>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          שלח פרטים
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-xs text-slate-400">המידע שלך מאובטח</span>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  )
}
