import { Link } from 'react-router-dom'
import { Map, Calculator, BarChart3, Heart, Info, Phone, FileText, Shield } from 'lucide-react'

const footerLinks = [
  {
    title: 'עמודים',
    links: [
      { to: '/about', label: 'אודות', icon: Info },
      { to: '/contact', label: 'צור קשר', icon: Phone },
    ],
  },
  {
    title: 'כלים',
    links: [
      { to: '/calculator', label: 'מחשבון השקעה', icon: Calculator },
      { to: '/compare', label: 'השוואת חלקות', icon: BarChart3 },
      { to: '/favorites', label: 'מועדפים', icon: Heart },
    ],
  },
  {
    title: 'משפטי',
    links: [
      { to: '/terms', label: 'תנאי שימוש', icon: FileText },
      { to: '/privacy', label: 'מדיניות פרטיות', icon: Shield },
    ],
  },
]

export default function PublicFooter() {
  return (
    <footer className="border-t border-white/5 bg-navy" dir="rtl">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-3 group">
              <span className="text-xl">🏗️</span>
              <span className="text-lg font-bold brand-text">LandMap</span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              הפלטפורמה הדיגיטלית להשקעות קרקע בישראל.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gold to-gold-bright rounded-lg text-navy text-sm font-bold hover:shadow-lg hover:shadow-gold/30 transition"
            >
              <Map className="w-4 h-4" />
              למפה
            </Link>
          </div>

          {/* Link columns */}
          {footerLinks.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-bold text-slate-300 mb-3">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="flex items-center gap-2 text-sm text-slate-500 hover:text-gold transition-colors"
                    >
                      <link.icon className="w-3.5 h-3.5" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <span>© {new Date().getFullYear()} LandMap. כל הזכויות שמורות.</span>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-gold transition">תנאי שימוש</Link>
            <Link to="/privacy" className="hover:text-gold transition">פרטיות</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
