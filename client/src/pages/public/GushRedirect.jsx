import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { MapPin, Search, ArrowLeft } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import { useMetaTags } from '../../hooks/useMetaTags'

/**
 * GushRedirect — resolves /plot/by-gush/:block/:parcel to the canonical /plot/:id.
 * SEO-friendly URL that Google and investors can understand.
 *
 * Flow:
 * 1. User visits /plot/by-gush/10043/15
 * 2. Component calls GET /api/plots/by-gush/10043/15
 * 3. API returns { id, url } → redirect to /plot/:id
 * 4. If not found → show error with search suggestion
 *
 * This enables:
 * - Google indexing of "גוש 10043 חלקה 15" searches
 * - Human-readable sharing URLs
 * - Link from tabu.gov.il or legal documents that reference gush/helka
 */
export default function GushRedirect() {
  const { block, parcel } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useMetaTags({
    title: `גוש ${block} חלקה ${parcel} — LandMap Israel`,
    description: `מחפש גוש ${block} חלקה ${parcel}...`,
  })

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      try {
        const res = await fetch(`/api/plots/by-gush/${encodeURIComponent(block)}/${encodeURIComponent(parcel)}`)
        if (cancelled) return

        if (res.ok) {
          const data = await res.json()
          if (data.id) {
            // Replace the URL so back button doesn't loop
            navigate(`/plot/${data.id}`, { replace: true })
            return
          }
        }

        const errorData = res.status === 404
          ? { message: `לא נמצאה חלקה: גוש ${block} חלקה ${parcel}` }
          : { message: 'שגיאה בחיפוש החלקה' }

        setError(errorData.message)
      } catch {
        if (!cancelled) setError('שגיאה בחיבור לשרת')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    resolve()
    return () => { cancelled = true }
  }, [block, parcel, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-4 bg-navy-light/40 border border-white/5 rounded-2xl px-8 py-6">
          <Spinner className="w-10 h-10 text-gold" />
          <span className="text-sm text-slate-400">
            מחפש גוש {block} חלקה {parcel}...
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-navy flex flex-col items-center justify-center px-4" dir="rtl">
        <div className="glass-panel p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">
            לא נמצאה חלקה
          </h2>
          <p className="text-sm text-slate-400 mb-2">
            גוש <span className="font-bold text-gold">{block}</span> חלקה <span className="font-bold text-gold">{parcel}</span>
          </p>
          <p className="text-xs text-slate-500 mb-6">
            ייתכן שהחלקה לא פורסמה עדיין, או שמספרי הגוש/חלקה שגויים.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to={`/?q=${block}`}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold to-gold-bright text-navy font-bold text-sm rounded-xl hover:shadow-lg hover:shadow-gold/30 transition-all"
            >
              <Search className="w-4 h-4" />
              חפש גוש {block} במפה
            </Link>
            <Link
              to="/"
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-gold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              חזרה למפה הראשית
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return null
}
