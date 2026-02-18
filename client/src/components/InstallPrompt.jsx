import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

/**
 * PWA Install Prompt — shows a native-feeling banner encouraging users
 * to install the app on their home screen (like Madlan's mobile experience).
 * Only shows after 30s of engagement and if not previously dismissed.
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Don't show if already dismissed or already installed
    if (localStorage.getItem('landmap_pwa_dismissed')) return
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Wait 30s before showing to avoid annoying first-time visitors
      setTimeout(() => setShow(true), 30000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShow(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem('landmap_pwa_dismissed', '1')
  }

  if (!show) return null

  return (
    <div
      className="fixed bottom-20 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-[90] animate-slide-up"
      dir="rtl"
    >
      <div className="bg-navy-light/95 backdrop-blur-xl border border-gold/20 rounded-2xl p-4 shadow-2xl shadow-black/40">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-bright flex items-center justify-center flex-shrink-0">
            <span className="text-lg">🗺️</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-slate-200 mb-0.5">התקן את LandMap</div>
            <div className="text-xs text-slate-400 leading-relaxed">
              גישה מהירה למפת הקרקעות ישירות ממסך הבית — גם אופליין
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <X className="w-3 h-3 text-slate-500" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleInstall}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-gold to-gold-bright text-navy font-bold text-xs rounded-xl hover:shadow-lg hover:shadow-gold/30 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            התקן עכשיו
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2.5 bg-white/5 border border-white/10 text-slate-400 text-xs rounded-xl hover:bg-white/10 transition-colors"
          >
            לא עכשיו
          </button>
        </div>
      </div>
    </div>
  )
}
