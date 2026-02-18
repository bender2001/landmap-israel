import { Link } from 'react-router-dom'
import { Map, Calculator, BarChart3, Heart, Info, Phone, FileText, Shield, MapPin } from 'lucide-react'

const footerLinks = [
  {
    title: 'עמודים',
    links: [
      { to: '/about', label: 'אודות', icon: Info },
      { to: '/contact', label: 'צור קשר', icon: Phone },
      { to: '/areas', label: 'סקירת אזורים', icon: MapPin },
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

        {/* Social links — like Madlan/Yad2's footer social presence */}
        <div className="mt-8 pt-6 border-t border-white/5">
          <div className="flex items-center justify-center gap-3 mb-6">
            <a
              href="https://wa.me/972526331157?text=%D7%A9%D7%9C%D7%95%D7%9D%2C%20%D7%90%D7%A0%D7%99%20%D7%9E%D7%A2%D7%95%D7%A0%D7%99%D7%99%D7%9F%20%D7%91%D7%A7%D7%A8%D7%A7%D7%A2%D7%95%D7%AA%20%D7%9C%D7%94%D7%A9%D7%A7%D7%A2%D7%94"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center hover:bg-[#25D366]/20 hover:scale-110 transition-all"
              aria-label="WhatsApp"
            >
              <svg className="w-4 h-4 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
            <a
              href="https://t.me/LandMapIsraelBot"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-xl bg-[#229ED9]/10 border border-[#229ED9]/20 flex items-center justify-center hover:bg-[#229ED9]/20 hover:scale-110 transition-all"
              aria-label="Telegram"
            >
              <svg className="w-4 h-4 text-[#229ED9]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <span>© {new Date().getFullYear()} LandMap Israel. כל הזכויות שמורות.</span>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-gold transition">תנאי שימוש</Link>
            <Link to="/privacy" className="hover:text-gold transition">פרטיות</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
