import { useState, useEffect } from 'react'
import { Wifi, WifiOff, Radio } from 'lucide-react'

/**
 * Floating connection status indicator.
 * Shows a subtle banner when the app goes offline, SSE disconnects, or reconnects.
 * Three states: online+SSE, online but no SSE, offline.
 * Auto-hides "back online" after 3s to avoid clutter.
 *
 * @param {boolean} sseConnected - Whether the SSE real-time connection is active
 */
export default function ConnectionStatus({ sseConnected = true }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showBanner, setShowBanner] = useState(false)
  const [bannerState, setBannerState] = useState('hidden') // 'hidden' | 'offline' | 'no-sse' | 'restored'
  const [wasDisconnected, setWasDisconnected] = useState(false)

  // Track browser online/offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (wasDisconnected) {
        setBannerState('restored')
        setShowBanner(true)
        setTimeout(() => setShowBanner(false), 3000)
      }
    }
    const handleOffline = () => {
      setIsOnline(false)
      setWasDisconnected(true)
      setBannerState('offline')
      setShowBanner(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasDisconnected])

  // Track SSE connection state — show banner if SSE drops while still online
  useEffect(() => {
    if (!isOnline) return // offline state takes priority
    if (!sseConnected) {
      // Only show SSE warning after a brief delay to avoid flash on initial connect
      const timer = setTimeout(() => {
        setWasDisconnected(true)
        setBannerState('no-sse')
        setShowBanner(true)
      }, 5000) // wait 5s before showing — SSE may still be reconnecting
      return () => clearTimeout(timer)
    } else if (wasDisconnected && bannerState === 'no-sse') {
      // SSE reconnected
      setBannerState('restored')
      setShowBanner(true)
      setTimeout(() => setShowBanner(false), 3000)
    }
  }, [sseConnected, isOnline]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!showBanner) return null

  const configs = {
    offline: {
      bg: 'bg-red-500/15 border-red-500/30 text-red-300',
      icon: WifiOff,
      pulse: true,
      text: 'אין חיבור — מציג נתונים שמורים',
    },
    'no-sse': {
      bg: 'bg-amber-500/12 border-amber-500/25 text-amber-300',
      icon: Radio,
      pulse: true,
      text: 'עדכונים בזמן אמת מנותקים — רענן לחיבור מחדש',
    },
    restored: {
      bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
      icon: Wifi,
      pulse: false,
      text: 'החיבור חזר — הנתונים מעודכנים',
    },
  }

  const config = configs[bannerState] || configs.restored
  const Icon = config.icon

  return (
    <div
      className={`fixed top-[2.75rem] left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-2xl flex items-center gap-2.5 text-xs font-medium shadow-lg backdrop-blur-md border transition-all duration-500 ${config.bg}`}
      dir="rtl"
      role="status"
      aria-live="polite"
    >
      <Icon className={`w-3.5 h-3.5 ${config.pulse ? 'animate-pulse' : ''}`} />
      <span>{config.text}</span>
    </div>
  )
}
