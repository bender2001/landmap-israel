import { useState, useEffect } from 'react'
import { X, Keyboard, Search, ArrowLeftRight, MessageCircle } from 'lucide-react'

const hints = [
  { icon: Search, text: 'לחצו / לפתיחת צ׳אט AI', key: '/' },
  { icon: ArrowLeftRight, text: 'חצים ← → לניווט בין חלקות', key: '←→' },
  { icon: Keyboard, text: 'לחצו ? לקיצורי מקלדת', key: '?' },
  { icon: MessageCircle, text: 'F לשמירה במועדפים', key: 'F' },
]

export default function FirstVisitHints() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const key = 'landmap_hints_shown'
    const shown = localStorage.getItem(key)
    if (shown) return

    // Show after a short delay so user can see the map first
    const timer = setTimeout(() => setVisible(true), 4000)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem('landmap_hints_shown', '1')
  }

  // Auto-dismiss after 12 seconds
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(dismiss, 12000)
    return () => clearTimeout(timer)
  }, [visible])

  if (!visible) return null

  return (
    <div
      className="fixed top-20 left-1/2 -translate-x-1/2 z-[40] animate-fade-in-up hidden sm:block"
      dir="rtl"
    >
      <div className="bg-navy/95 backdrop-blur-xl border border-gold/20 rounded-2xl px-5 py-3.5 shadow-2xl shadow-gold/10 max-w-md">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-gold flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5" />
            טיפים מהירים
          </span>
          <button
            onClick={dismiss}
            className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-3 h-3 text-slate-400" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {hints.map((hint, i) => (
            <div key={i} className="flex items-center gap-2">
              <kbd className="text-[10px] font-mono bg-white/10 border border-white/10 rounded px-1.5 py-0.5 text-gold min-w-[24px] text-center">
                {hint.key}
              </kbd>
              <span className="text-[11px] text-slate-400">{hint.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
