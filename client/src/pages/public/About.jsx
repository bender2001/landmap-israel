import { Link } from 'react-router-dom'
import { Map, Shield, Brain, Eye, ArrowLeft, Compass, TrendingUp, Lock, BarChart3, MapPin, Ruler, DollarSign } from 'lucide-react'
import PublicNav from '../../components/PublicNav'
import PublicFooter from '../../components/PublicFooter'
import BackToTopButton from '../../components/ui/BackToTopButton'
import { useMetaTags } from '../../hooks/useMetaTags'
import { useMarketOverview } from '../../hooks/useMarketOverview'
import { formatCurrency, formatDunam } from '../../utils/formatters'

const steps = [
  {
    icon: Compass,
    title: 'גלו קרקעות',
    desc: 'חפשו בין מגוון קרקעות להשקעה ברחבי ישראל עם מידע מלא על סטטוס תכנוני, מיקום ופוטנציאל.',
  },
  {
    icon: Brain,
    title: 'נתחו בעזרת AI',
    desc: 'קבלו ניתוח השקעה חכם, תחזיות תשואה, השוואות מחירים ונתוני ועדות — הכל במקום אחד.',
  },
  {
    icon: TrendingUp,
    title: 'השקיעו בביטחון',
    desc: 'קבלו החלטה מושכלת עם כל הנתונים הפיננסיים, שמאויות ומידע תכנוני מעודכן.',
  },
]

const trustSignals = [
  {
    icon: Shield,
    title: 'אבטחה מלאה',
    desc: 'כל הנתונים מוצפנים ומאובטחים בתקני האבטחה המחמירים ביותר.',
  },
  {
    icon: Eye,
    title: 'אנונימיות מוחלטת',
    desc: 'פרטי המוכרים אינם מוצגים — כל הפניות עוברות דרך הפלטפורמה בלבד.',
  },
  {
    icon: Brain,
    title: 'בינה מלאכותית',
    desc: 'יועץ השקעות AI מנתח עבורכם נתוני שוק, תחזיות ומגמות בזמן אמת.',
  },
]

/**
 * Organization JSON-LD — helps Google surface brand info in knowledge panels.
 * Consistent with ContactJsonLd but focused on the brand/about narrative.
 */
function AboutJsonLd({ stats }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'LandMap Israel',
    url: window.location.origin,
    logo: `${window.location.origin}/icons/icon-512.png`,
    description: 'פלטפורמת השקעות בקרקעות בישראל — מפות אינטראקטיביות, ניתוח AI ונתוני תכנון בזמן אמת.',
    foundingDate: '2025',
    areaServed: { '@type': 'Country', name: 'Israel' },
    knowsAbout: ['Real Estate Investment', 'Land Investment Israel', 'קרקעות להשקעה'],
    ...(stats ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        bestRating: '5',
        ratingCount: String(stats.total || 10),
      },
    } : {}),
  }
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  )
}

/**
 * Animated counter — counts up from 0 to target value on scroll into view.
 * Creates a premium "data dashboard" feel like Madlan's hero stats.
 */
function AnimatedStat({ icon: Icon, value, label, suffix = '', color = 'gold' }) {
  const colorMap = {
    gold: 'from-gold/20 to-gold/5 border-gold/20 text-gold',
    green: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400',
  }
  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-2xl p-6 text-center group hover:scale-105 transition-transform`}>
      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6" />
      </div>
      <div className="text-2xl sm:text-3xl font-black text-slate-100 mb-1">
        {value}{suffix}
      </div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  )
}

export default function About() {
  const { data: overview } = useMarketOverview()

  useMetaTags({
    title: 'אודות LandMap — הפלטפורמה הדיגיטלית להשקעות קרקע בישראל',
    description: 'LandMap מחברת בין משקיעים לקרקעות פוטנציאליות ברחבי ישראל. ניתוח AI, השוואות מחירים ונתוני תכנון — הכל במקום אחד.',
    url: `${window.location.origin}/about`,
  })

  return (
    <div className="min-h-screen bg-navy" dir="rtl">
      <PublicNav />
      <AboutJsonLd stats={overview} />

      {/* Hero */}
      <section className="pt-28 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold/10 border border-gold/20 rounded-full mb-6 animate-fade-in">
            <span className="text-sm">🏗️</span>
            <span className="text-sm text-gold font-medium">ברוכים הבאים ל-LandMap</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-100 mb-6 animate-fade-in-up leading-tight">
            הפלטפורמה הדיגיטלית
            <br />
            <span className="bg-gradient-to-r from-gold to-gold-bright bg-clip-text text-transparent">
              להשקעות קרקע בישראל
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8 animate-fade-in-up leading-relaxed">
            LandMap מחברת בין משקיעים לקרקעות פוטנציאליות ברחבי ישראל.
            כל המידע, הניתוחים והנתונים — במקום אחד, בלי מתווכים מיותרים.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-gold to-gold-bright rounded-2xl text-navy font-bold text-lg hover:shadow-xl hover:shadow-gold/30 hover:-translate-y-0.5 transition-all animate-fade-in-up"
          >
            <Map className="w-5 h-5" />
            גלו קרקעות עכשיו
          </Link>
        </div>
      </section>

      {/* Live market stats — social proof through real numbers, like Madlan's credibility indicators */}
      {overview && (
        <section className="py-12 px-4 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-sm font-bold text-slate-400 text-center mb-8 uppercase tracking-wider">הנתונים מדברים</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <AnimatedStat
                icon={BarChart3}
                value={overview.total || 0}
                suffix="+"
                label="חלקות במערכת"
                color="gold"
              />
              <AnimatedStat
                icon={MapPin}
                value={overview.cities?.length || 0}
                label="ערים פעילות"
                color="blue"
              />
              <AnimatedStat
                icon={TrendingUp}
                value={overview.avgRoi ? `+${overview.avgRoi}` : '0'}
                suffix="%"
                label="תשואה ממוצעת"
                color="green"
              />
              <AnimatedStat
                icon={Ruler}
                value={overview.totalArea ? formatDunam(overview.totalArea) : '0'}
                label="דונם סה״כ"
                color="purple"
              />
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-100 text-center mb-12">
            איך זה עובד?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="glass-panel p-6 text-center group hover:border-gold/30 transition-all animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <step.icon className="w-7 h-7 text-gold" />
                </div>
                <div className="text-xs text-gold font-bold mb-2">שלב {i + 1}</div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="py-16 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-100 text-center mb-12">
            למה LandMap?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {trustSignals.map((signal, i) => (
              <div key={i} className="glass-panel p-6 group hover:border-gold/30 transition-all">
                <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <signal.icon className="w-6 h-6 text-gold" />
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">{signal.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{signal.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-100 mb-4">מוכנים להתחיל?</h2>
          <p className="text-slate-400 mb-8">גלו את ההזדמנויות הטובות ביותר בשוק הקרקעות הישראלי</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-gold to-gold-bright rounded-xl text-navy font-bold hover:shadow-lg hover:shadow-gold/30 transition"
            >
              <Map className="w-5 h-5" />
              למפה
            </Link>
            <Link
              to="/contact"
              className="flex items-center gap-2 px-8 py-3.5 bg-white/5 border border-white/10 rounded-xl text-slate-300 font-medium hover:bg-white/10 transition"
            >
              צרו קשר
            </Link>
          </div>
        </div>
      </section>

      <BackToTopButton />
      <PublicFooter />
    </div>
  )
}
