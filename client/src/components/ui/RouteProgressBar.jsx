import { useEffect, useRef, useState } from 'react'
import { useNavigation } from 'react-router-dom'

/**
 * NProgress-style route transition bar — a slim animated progress indicator
 * at the top of the page during route changes. Replaces the jarring full-screen
 * spinner with a subtle, professional UX pattern used by Madlan, YouTube, GitHub.
 *
 * Works with React Router's useNavigation() to detect loading states,
 * plus a manual trigger for Suspense-based lazy loading.
 */
export default function RouteProgressBar() {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)
  const completeTimerRef = useRef(null)

  // Start progress animation
  const start = () => {
    setIsLoading(true)
    setVisible(true)
    setProgress(0)

    // Simulate progress: fast at start, slows down approaching 90%
    let current = 0
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      current += current < 50 ? 8 : current < 80 ? 3 : 0.5
      if (current > 95) current = 95
      setProgress(current)
    }, 200)
  }

  // Complete: jump to 100% then fade out
  const complete = () => {
    clearInterval(timerRef.current)
    setProgress(100)
    setIsLoading(false)

    clearTimeout(completeTimerRef.current)
    completeTimerRef.current = setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, 400)
  }

  // Listen for Suspense boundary transitions via a MutationObserver on the fallback
  useEffect(() => {
    // Detect when Suspense fallback appears/disappears (lazy route loading)
    const observer = new MutationObserver(() => {
      const hasFallback = document.querySelector('[data-page-loader]')
      if (hasFallback && !isLoading) {
        start()
      } else if (!hasFallback && isLoading) {
        complete()
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-page-loader'],
    })

    return () => {
      observer.disconnect()
      clearInterval(timerRef.current)
      clearTimeout(completeTimerRef.current)
    }
  }, [isLoading])

  if (!visible) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="טוען עמוד"
    >
      <div
        className="h-full transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #C8942A, #E5B94E, #F0D078)',
          boxShadow: '0 0 10px rgba(200, 148, 42, 0.5), 0 0 5px rgba(200, 148, 42, 0.3)',
          opacity: progress >= 100 ? 0 : 1,
          transition: progress >= 100
            ? 'width 200ms ease-out, opacity 400ms ease-out'
            : 'width 300ms ease-out',
        }}
      />
      {/* Animated glow dot at the end of the bar */}
      {progress < 100 && (
        <div
          className="absolute top-0 h-full w-24"
          style={{
            right: 0,
            transform: `translateX(${100 - progress}%)`,
            background: 'linear-gradient(90deg, transparent, rgba(200, 148, 42, 0.3))',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      )}
    </div>
  )
}
