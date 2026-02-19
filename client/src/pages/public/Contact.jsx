import { useState } from 'react'
import { User, Phone, Mail, MessageSquare, Lock, Send, CheckCircle2, BarChart3, MapPin, TrendingUp } from 'lucide-react'
import { useCreateLead } from '../../hooks/useLeads'
import { useMarketOverview } from '../../hooks/useMarketOverview'
import PublicNav from '../../components/PublicNav'
import PublicFooter from '../../components/PublicFooter'
import BackToTopButton from '../../components/ui/BackToTopButton'
import { useMetaTags } from '../../hooks/useMetaTags'
import { whatsappLink } from '../../utils/config'

// Accept Israeli numbers: 05X, +972-5X, 972-5X, with optional dashes/spaces
const phoneRegex = /^(?:\+?972[-\s]?|0)(?:[2-9])[-\s]?\d{3}[-\s]?\d{4}$/
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Organization + LocalBusiness JSON-LD — helps Google show contact info in search results
 * and improves local SEO for "LandMap Israel contact" queries.
 * Like Madlan's organization markup — standard practice for real estate platforms.
 */
function ContactJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: 'LandMap Israel',
    description: 'פלטפורמת השקעות בקרקעות בישראל — מפות, ניתוח תשואות ומידע תכנוני למשקיעים',
    url: window.location.origin,
    logo: `${window.location.origin}/logo.png`,
    email: 'info@landmap.co.il',
    telephone: '+972-50-000-0000',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'IL',
      addressRegion: 'ישראל',
    },
    areaServed: {
      '@type': 'Country',
      name: 'Israel',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        opens: '09:00',
        closes: '18:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Friday',
        opens: '09:00',
        closes: '13:00',
      },
    ],
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      telephone: '+972-50-000-0000',
      email: 'info@landmap.co.il',
      availableLanguage: ['Hebrew', 'English', 'Russian'],
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export default function Contact() {
  useMetaTags({
    title: 'צור קשר — LandMap Israel | השאירו פרטים ונחזור אליכם',
    description: 'מעוניינים בהשקעה בקרקע? צרו קשר עם צוות LandMap. נחזור אליכם בהקדם עם מידע מותאם אישית.',
    url: `${window.location.origin}/contact`,
  })

  const { data: overview } = useMarketOverview()
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
    if (!formData.phone || !phoneRegex.test(formData.phone.trim())) e.phone = 'נא להזין טלפון ישראלי תקין (למשל 050-1234567 או +972-50-1234567)'
    if (!formData.email || !emailRegex.test(formData.email)) e.email = 'נא להזין אימייל תקין'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = validate()
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    try {
      // Normalize phone: strip spaces/dashes, convert +972/972 prefix to 0
      const normalizedPhone = formData.phone
        .trim()
        .replace(/[-\s]/g, '')
        .replace(/^\+?972/, '0')
      await createLead.mutateAsync({
        full_name: formData.name.trim(),
        phone: normalizedPhone,
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
      <ContactJsonLd />

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
              {/* Quick contact — direct WhatsApp & Telegram (like Madlan/Yad2's prominent CTAs) */}
              <div className="glass-panel p-6">
                <h3 className="text-lg font-bold text-slate-100 mb-4">דברו איתנו ישירות</h3>
                <div className="space-y-3">
                  <a
                    href={whatsappLink('שלום, אני מעוניין במידע נוסף על קרקעות להשקעה')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full px-4 py-3 bg-[#25D366]/10 border border-[#25D366]/20 rounded-xl hover:bg-[#25D366]/15 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#25D366]/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#25D366]">WhatsApp</div>
                      <div className="text-[11px] text-slate-400">תשובה תוך דקות</div>
                    </div>
                  </a>
                  <a
                    href="https://t.me/LandMapIsraelBot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full px-4 py-3 bg-[#229ED9]/10 border border-[#229ED9]/20 rounded-xl hover:bg-[#229ED9]/15 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#229ED9]/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-[#229ED9]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#229ED9]">Telegram</div>
                      <div className="text-[11px] text-slate-400">בוט אוטומטי + ייעוץ אישי</div>
                    </div>
                  </a>
                </div>
              </div>

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

              {/* Social proof — live stats from the platform (like Madlan's trust indicators) */}
              {overview && (
                <div className="glass-panel p-6">
                  <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">הפלטפורמה במספרים</h3>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 rounded-xl bg-white/[0.03]">
                      <div className="text-lg font-black text-gold">{overview.total || 0}+</div>
                      <div className="text-[10px] text-slate-500">חלקות</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03]">
                      <div className="text-lg font-black text-emerald-400">{overview.cities?.length || 0}</div>
                      <div className="text-[10px] text-slate-500">ערים</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03]">
                      <div className="text-lg font-black text-blue-400">+{overview.avgRoi || 0}%</div>
                      <div className="text-[10px] text-slate-500">ROI ממוצע</div>
                    </div>
                  </div>
                </div>
              )}
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
                      <label htmlFor="contact-name" className="text-xs text-slate-400 mb-1.5 block">שם מלא</label>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          id="contact-name"
                          type="text"
                          autoComplete="name"
                          aria-required="true"
                          aria-invalid={!!errors.name}
                          aria-describedby={errors.name ? 'contact-name-error' : undefined}
                          placeholder="הכנס שם מלא"
                          value={formData.name}
                          onChange={(e) => handleChange('name', e.target.value)}
                          className="w-full pr-10 pl-4 py-3 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:border-gold/50 focus:outline-none transition"
                        />
                      </div>
                      {errors.name && <p id="contact-name-error" role="alert" className="text-red-400 text-xs mt-1">{errors.name}</p>}
                    </div>

                    {/* Phone */}
                    <div>
                      <label htmlFor="contact-phone" className="text-xs text-slate-400 mb-1.5 block">טלפון</label>
                      <div className="relative">
                        <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          id="contact-phone"
                          type="tel"
                          dir="ltr"
                          autoComplete="tel"
                          aria-required="true"
                          aria-invalid={!!errors.phone}
                          aria-describedby={errors.phone ? 'contact-phone-error' : undefined}
                          placeholder="050-0000000"
                          value={formData.phone}
                          onChange={(e) => handleChange('phone', e.target.value)}
                          className="w-full pr-10 pl-4 py-3 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 text-right placeholder-slate-500 focus:border-gold/50 focus:outline-none transition"
                        />
                      </div>
                      {errors.phone && <p id="contact-phone-error" role="alert" className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="contact-email" className="text-xs text-slate-400 mb-1.5 block">אימייל</label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          id="contact-email"
                          type="email"
                          dir="ltr"
                          autoComplete="email"
                          aria-required="true"
                          aria-invalid={!!errors.email}
                          aria-describedby={errors.email ? 'contact-email-error' : undefined}
                          placeholder="email@example.com"
                          value={formData.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                          className="w-full pr-10 pl-4 py-3 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 text-right placeholder-slate-500 focus:border-gold/50 focus:outline-none transition"
                        />
                      </div>
                      {errors.email && <p id="contact-email-error" role="alert" className="text-red-400 text-xs mt-1">{errors.email}</p>}
                    </div>

                    {/* Message */}
                    <div>
                      <label htmlFor="contact-message" className="text-xs text-slate-400 mb-1.5 block">הודעה (אופציונלי)</label>
                      <div className="relative">
                        <MessageSquare className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                        <textarea
                          id="contact-message"
                          autoComplete="off"
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

      <BackToTopButton />
      <PublicFooter />
    </div>
  )
}
