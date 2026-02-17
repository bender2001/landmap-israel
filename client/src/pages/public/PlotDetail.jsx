import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import { usePlot } from '../../hooks/usePlots.js'
import SidebarDetails from '../../components/SidebarDetails.jsx'
import LeadModal from '../../components/LeadModal.jsx'
import PublicNav from '../../components/PublicNav.jsx'
import Spinner from '../../components/ui/Spinner.jsx'

export default function PlotDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: plot, isLoading, error } = usePlot(id)
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)

  // Dynamic page title for SEO
  useEffect(() => {
    if (plot) {
      const blockNum = plot.block_number ?? plot.blockNumber
      document.title = `גוש ${blockNum} חלקה ${plot.number} - ${plot.city} | LandMap Israel`
      // Update meta description
      let meta = document.querySelector('meta[name="description"]')
      if (!meta) {
        meta = document.createElement('meta')
        meta.name = 'description'
        document.head.appendChild(meta)
      }
      const price = plot.total_price ?? plot.totalPrice
      meta.content = `קרקע להשקעה בגוש ${blockNum} חלקה ${plot.number}, ${plot.city}. מחיר: ₪${Math.round(price/1000)}K. שטח: ${(plot.size_sqm ?? plot.sizeSqM)?.toLocaleString()} מ"ר.`
    }
    return () => { document.title = 'LandMap Israel - מפת קרקעות להשקעה' }
  }, [plot])

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-navy">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-12 h-12 text-gold" />
          <span className="text-sm text-slate-400">טוען פרטי חלקה...</span>
        </div>
      </div>
    )
  }

  if (error || !plot) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-navy" dir="rtl">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="text-6xl">🏗️</div>
          <h1 className="text-xl font-bold text-slate-200">חלקה לא נמצאה</h1>
          <p className="text-sm text-slate-400">ייתכן שהחלקה הוסרה או שהקישור שגוי</p>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-6 py-2.5 bg-gold/20 border border-gold/30 rounded-xl text-gold text-sm hover:bg-gold/30 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה למפה
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen bg-navy relative pt-16">
      <PublicNav />

      {/* Background with grid */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'linear-gradient(rgba(200,148,42,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(200,148,42,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* SidebarDetails rendered full-width in this context */}
      <SidebarDetails
        plot={plot}
        onClose={() => navigate('/')}
        onOpenLeadModal={() => setIsLeadModalOpen(true)}
      />

      <LeadModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        plot={plot}
      />
    </div>
  )
}
