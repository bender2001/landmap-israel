/**
 * Pricing.jsx — Full pricing page with tier comparison
 *
 * Hebrew RTL layout, dark luxury design matching the project style.
 * Shows Free / Basic / Pro / Enterprise tiers with feature comparison.
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Check, X, Crown, Zap, Shield, Building2,
  MapPin, BarChart3, Bell, Code, Users, MessageCircle,
  Star, ChevronDown,
} from 'lucide-react'
import PublicNav from '../../components/PublicNav'
import PublicFooter from '../../components/PublicFooter'
import DataDisclaimer from '../../components/DataDisclaimer'
import { useMetaTags } from '../../hooks/useMetaTags'
import { API_BASE } from '../../utils/config'

const TIERS = [
  {
    id: 'free',
    name: 'חינם',
    nameEn: 'Free',
    price: 0,
    priceLabel: '₪0',
    period: '',
    icon: '🆓',
    iconComponent: MapPin,
    color: '#64748B',
    gradient: 'from-slate-500/20 to-slate-600/10',
    borderColor: 'border-slate-500/20',
    popular: false,
    cta: 'התחל בחינם',
    ctaStyle: 'bg-white/10 border border-white/20 text-slate-200 hover:bg-white/20',
    features: [
      { text: 'תצוגת מפה אינטראקטיבית', included: true },
      { text: 'מידע בסיסי על חלקות', included: true },
      { text: 'עד 3 חלקות בחודש', included: true },
      { text: 'מחשבון השקעות', included: true },
      { text: 'היסטוריית עסקאות מנדל"ן נט', included: false },
      { text: 'התראות דוא"ל', included: false },
      { text: 'ניתוח מתקדם', included: false },
      { text: 'גישת API', included: false },
      { text: 'התראות תכנון ותב"עות', included: false },
      { text: 'תמיכת עדיפות', included: false },
    ],
  },
  {
    id: 'basic',
    name: 'בסיסי',
    nameEn: 'Basic',
    price: 99,
    priceLabel: '₪99',
    period: '/חודש',
    icon: '⭐',
    iconComponent: Star,
    color: '#C8942A',
    gradient: 'from-gold/20 to-gold/5',
    borderColor: 'border-gold/30',
    popular: true,
    cta: 'שדרג עכשיו',
    ctaStyle: 'bg-gradient-to-r from-gold via-gold-bright to-gold text-navy font-extrabold shadow-lg shadow-gold/30 hover:shadow-xl hover:shadow-gold/40',
    features: [
      { text: 'תצוגת מפה אינטראקטיבית', included: true },
      { text: 'מידע בסיסי על חלקות', included: true },
      { text: 'גישה לכל החלקות — ללא הגבלה', included: true },
      { text: 'מחשבון השקעות', included: true },
      { text: 'היסטוריית עסקאות מנדל"ן נט', included: true },
      { text: 'התראות דוא"ל על שינויי מחיר', included: true },
      { text: 'ניתוח מתקדם', included: false },
      { text: 'גישת API', included: false },
      { text: 'התראות תכנון ותב"עות', included: false },
      { text: 'תמיכת עדיפות', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'מקצועי',
    nameEn: 'Pro',
    price: 299,
    priceLabel: '₪299',
    period: '/חודש',
    icon: '👑',
    iconComponent: Crown,
    color: '#A855F7',
    gradient: 'from-purple-500/20 to-purple-600/5',
    borderColor: 'border-purple-500/30',
    popular: false,
    cta: 'הצטרף כמקצוען',
    ctaStyle: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40',
    features: [
      { text: 'תצוגת מפה אינטראקטיבית', included: true },
      { text: 'מידע בסיסי על חלקות', included: true },
      { text: 'גישה לכל החלקות — ללא הגבלה', included: true },
      { text: 'מחשבון השקעות', included: true },
      { text: 'היסטוריית עסקאות מנדל"ן נט', included: true },
      { text: 'התראות דוא"ל על שינויי מחיר', included: true },
      { text: 'ניתוח השקעות מתקדם', included: true },
      { text: 'גישת API מלאה', included: true },
      { text: 'התראות תכנון ותב"עות', included: true },
      { text: 'תמיכת עדיפות', included: true },
    ],
  },
  {
    id: 'enterprise',
    name: 'ארגוני',
    nameEn: 'Enterprise',
    price: null,
    priceLabel: 'מותאם',
    period: 'אישית',
    icon: '🏢',
    iconComponent: Building2,
    color: '#3B82F6',
    gradient: 'from-blue-500/20 to-blue-600/5',
    borderColor: 'border-blue-500/30',
    popular: false,
    cta: 'צור קשר',
    ctaStyle: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold shadow-lg shadow-blue-500/30',
    features: [
      { text: 'כל תכונות מקצועי', included: true },
      { text: 'נתונים בכמות גדולה (Bulk)', included: true },
      { text: 'White-Label — מיתוג מותאם', included: true },
      { text: 'מנהל חשבון אישי', included: true },
      { text: 'אינטגרציית API מותאמת', included: true },
      { text: 'SLA מובטח', included: true },
      { text: 'הדרכה ועדכונים', included: true },
    ],
  },
]

const FAQ = [
  {
    q: 'האם אפשר להתחיל בחינם?',
    a: 'בהחלט! התוכנית החינמית כוללת תצוגת מפה, מידע בסיסי על חלקות ומחשבון השקעות. ניתן לשדרג בכל עת.',
  },
  {
    q: 'מהם מקורות הנתונים?',
    a: 'אנחנו משתמשים בנתונים ממקורות ממשלתיים רשמיים: נדל"ן נט (nadlan.gov.il) לעסקאות, מנהל התכנון (govmap.gov.il) לתב"עות, ורשם המקרקעין לנתוני טאבו.',
  },
  {
    q: 'האם אפשר לבטל בכל עת?',
    a: 'כן, ביטול מנוי בלחיצה. ללא תקופת התחייבות, ללא עלויות נסתרות. המנוי פעיל עד סוף תקופת החיוב.',
  },
  {
    q: 'מה כולל ה-API?',
    a: 'ממשק API מלא לגישה לנתוני חלקות, עסקאות ותכנון. תיעוד מלא, rate limiting סביר, ותמיכה טכנית.',
  },
  {
    q: 'מה ההבדל בין בסיסי למקצועי?',
    a: 'בסיסי מעניק גישה לכל החלקות ועסקאות. מקצועי מוסיף API, ניתוח מתקדם, התראות תכנון ותמיכת עדיפות.',
  },
]

function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border border-white/5 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-right hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-sm font-medium text-slate-200">{question}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 -mt-1">
          <p className="text-sm text-slate-400 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  )
}

/**
 * PricingFaqJsonLd — FAQ structured data for Google rich snippets.
 * Google displays these as expandable FAQ cards directly in search results,
 * dramatically increasing click-through rate for queries like "landmap pricing"
 * or "landmap israel מחירים". Madlan and Yad2 use this pattern extensively.
 */
function PricingFaqJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * PricingBreadcrumbJsonLd — breadcrumb schema for SEO.
 * Helps Google show "LandMap > מחירים" in search results.
 */
function PricingBreadcrumbJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'LandMap Israel', item: window.location.origin },
      { '@type': 'ListItem', position: 2, name: 'תוכניות מנוי' },
    ],
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export default function Pricing() {
  const [email, setEmail] = useState('')
  const [registering, setRegistering] = useState(false)
  const [registered, setRegistered] = useState(false)

  useMetaTags({
    title: 'מחירים — LandMap Israel | תוכניות מנוי',
    description: 'בחרו את התוכנית המתאימה לכם — חינם, בסיסי, מקצועי או ארגוני. גישה לנתוני עסקאות, תכנון וניתוח השקעות קרקע בישראל.',
    url: `${window.location.origin}/pricing`,
  })

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!email.includes('@')) return
    setRegistering(true)
    try {
      const res = await fetch(`${API_BASE}/api/subscription/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setRegistered(true)
      }
    } catch {
      // Silently fail — non-critical
    }
    setRegistering(false)
  }

  return (
    <div className="min-h-screen bg-navy" dir="rtl">
      <PublicNav />
      <PricingFaqJsonLd />
      <PricingBreadcrumbJsonLd />

      {/* Hero */}
      <div className="pt-28 pb-12 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/10 border border-gold/20 mb-6">
            <Crown className="w-4 h-4 text-gold" />
            <span className="text-sm text-gold font-medium">תוכניות מנוי</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4">
            <span className="bg-gradient-to-r from-gold to-gold-bright bg-clip-text text-transparent">
              בחרו את התוכנית
            </span>
            <br />
            <span className="text-slate-200">המתאימה לכם</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            גישה לנתוני עסקאות אמיתיים מנדל"ן נט, תכניות בניין עיר,
            ניתוח השקעות מתקדם — הכל במקום אחד
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TIERS.map((tier) => {
            const TierIcon = tier.iconComponent
            return (
              <div
                key={tier.id}
                className={`relative glass-panel p-0 overflow-hidden transition-all hover:scale-[1.02] ${
                  tier.popular ? 'ring-2 ring-gold/40 shadow-xl shadow-gold/10' : ''
                }`}
              >
                {/* Popular badge */}
                {tier.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-gold via-gold-bright to-gold text-navy text-xs font-bold text-center py-1.5">
                    ⭐ הכי פופולרי
                  </div>
                )}

                {/* Gold accent bar */}
                <div
                  className="h-[3px]"
                  style={{
                    background: `linear-gradient(90deg, ${tier.color}33, ${tier.color}, ${tier.color}33)`,
                  }}
                />

                <div className={`p-6 ${tier.popular ? 'pt-10' : ''}`}>
                  {/* Icon & Name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ background: `${tier.color}15` }}
                    >
                      {tier.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-100">{tier.name}</h3>
                      <p className="text-xs text-slate-500">{tier.nameEn}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span
                        className="text-4xl font-black"
                        style={{ color: tier.color }}
                      >
                        {tier.priceLabel}
                      </span>
                      {tier.period && (
                        <span className="text-sm text-slate-500">{tier.period}</span>
                      )}
                    </div>
                    {tier.price !== null && tier.price > 0 && (
                      <p className="text-[10px] text-slate-600 mt-1">
                        לא כולל מע"מ · ביטול בכל עת
                      </p>
                    )}
                  </div>

                  {/* CTA */}
                  {tier.id === 'enterprise' ? (
                    <Link
                      to="/contact"
                      className={`block w-full text-center py-3 rounded-xl text-sm transition-all ${tier.ctaStyle}`}
                    >
                      {tier.cta}
                    </Link>
                  ) : (
                    <button
                      className={`w-full py-3 rounded-xl text-sm transition-all ${tier.ctaStyle}`}
                      onClick={() => {
                        const el = document.getElementById('register-section')
                        el?.scrollIntoView({ behavior: 'smooth' })
                      }}
                    >
                      {tier.cta}
                    </button>
                  )}

                  {/* Features */}
                  <div className="mt-6 space-y-2.5">
                    {tier.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        {feature.included ? (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${tier.color}15` }}>
                            <Check className="w-3 h-3" style={{ color: tier.color }} />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-white/5">
                            <X className="w-3 h-3 text-slate-600" />
                          </div>
                        )}
                        <span className={`text-xs ${feature.included ? 'text-slate-300' : 'text-slate-600'}`}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Registration Section */}
      <div id="register-section" className="max-w-2xl mx-auto px-4 pb-16">
        <div className="glass-panel p-0 overflow-hidden">
          <div
            className="h-[3px]"
            style={{ background: 'linear-gradient(90deg, #C8942A, #E5B94E, #F0D078, #E5B94E, #C8942A)' }}
          />
          <div className="p-6 sm:p-8 text-center">
            {registered ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-100 mb-2">ברוך הבא! 🎉</h3>
                <p className="text-sm text-slate-400 mb-4">
                  נרשמת בהצלחה לתוכנית החינמית. אפשר להתחיל לחקור חלקות!
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold to-gold-bright rounded-xl text-navy font-bold"
                >
                  למפת החלקות
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </Link>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-slate-100 mb-2">התחילו בחינם</h3>
                <p className="text-sm text-slate-400 mb-6">
                  הירשמו עם כתובת דוא"ל וקבלו גישה מיידית למפת החלקות
                </p>
                <form onSubmit={handleRegister} className="flex gap-3 max-w-md mx-auto">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="כתובת דוא״ל"
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/20"
                    required
                    dir="ltr"
                  />
                  <button
                    type="submit"
                    disabled={registering}
                    className="px-6 py-3 bg-gradient-to-r from-gold to-gold-bright rounded-xl text-navy font-bold text-sm hover:shadow-lg hover:shadow-gold/20 transition-all disabled:opacity-50"
                  >
                    {registering ? '...' : 'הרשמה'}
                  </button>
                </form>
                <p className="text-[10px] text-slate-600 mt-3">
                  ללא כרטיס אשראי · ללא התחייבות · ביטול בכל עת
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-slate-100 text-center mb-8">שאלות נפוצות</h2>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <FAQItem key={i} question={item.q} answer={item.a} />
          ))}
        </div>
      </div>

      {/* Data Disclaimer */}
      <div className="max-w-3xl mx-auto px-4 pb-16">
        <DataDisclaimer variant="full" />
      </div>

      <PublicFooter />
    </div>
  )
}
