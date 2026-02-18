import { useState, useEffect, useCallback } from 'react'
import { ArrowUp } from 'lucide-react'

/**
 * Floating "back to top" button — appears when the user scrolls down 400px+.
 * Standard UX pattern on content-heavy pages (Madlan, Yad2, Medium all use this).
 * Uses smooth scroll, has gold accent matching the design system, and is accessible.
 *
 * Usage: Just drop <BackToTopButton /> at the bottom of any long page component.
 * Optional: pass `threshold` (px) to control when it appears.
 */
export default function BackToTopButton({ threshold = 400 }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > threshold)
    window.addEventListener('scroll', handler, { passive: true })
    handler() // initial check
    return () => window.removeEventListener('scroll', handler)
  }, [threshold])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  if (!visible) return null

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-20 right-4 z-50 w-10 h-10 rounded-xl bg-gold/20 border border-gold/30 flex items-center justify-center hover:bg-gold/30 hover:scale-110 transition-all shadow-lg backdrop-blur-sm animate-fade-in"
      aria-label="חזרה למעלה"
      title="חזרה למעלה"
    >
      <ArrowUp className="w-4 h-4 text-gold" />
    </button>
  )
}
