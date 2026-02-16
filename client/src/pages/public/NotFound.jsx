import { Link } from 'react-router-dom'
import { Map, ArrowRight } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center px-4" dir="rtl">
      {/* Animated 404 */}
      <div className="relative mb-8">
        <h1 className="text-[120px] sm:text-[180px] font-black leading-none bg-gradient-to-b from-gold via-gold-bright to-gold/30 bg-clip-text text-transparent select-none animate-fade-in">
          404
        </h1>
        <div className="absolute inset-0 text-[120px] sm:text-[180px] font-black leading-none text-gold/5 blur-2xl select-none">
          404
        </div>
      </div>

      {/* Message */}
      <div className="glass-panel p-8 max-w-md w-full text-center animate-fade-in-up">
        <h2 className="text-2xl font-bold text-slate-100 mb-3">
          הדף לא נמצא
        </h2>
        <p className="text-slate-400 mb-6">
          מצטערים, הדף שחיפשת לא קיים או שהקישור שגוי.
        </p>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold to-gold-bright rounded-xl text-navy font-bold hover:shadow-lg hover:shadow-gold/30 transition"
        >
          <Map className="w-5 h-5" />
          חזרה למפה
        </Link>
      </div>

      {/* Footer links */}
      <div className="flex items-center gap-4 mt-8">
        <Link to="/about" className="text-sm text-slate-500 hover:text-gold transition">אודות</Link>
        <span className="text-slate-700">|</span>
        <Link to="/contact" className="text-sm text-slate-500 hover:text-gold transition">צור קשר</Link>
      </div>
    </div>
  )
}
