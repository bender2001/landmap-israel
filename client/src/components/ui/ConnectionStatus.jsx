import { useState, useEffect } from 'react'
import { Wifi, WifiOff } from 'lucide-react'

/**
 * Floating connection status indicator.
 * Shows a subtle banner when the app goes offline or the API is unreachable.
 * Auto-hides when connection is restored.
 */
export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showBanner, setShowBanner] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (wasOffline) {
        setShowBanner(true)
        // Auto-hide "back online" banner after 3s
        setTimeout(() => setShowBanner(false), 3000)
      }
    }
    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
      setShowBanner(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasOffline])

  if (!showBanner) return null

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-2xl flex items-center gap-2.5 text-xs font-medium shadow-lg backdrop-blur-md border transition-all duration-500 ${
        isOnline
          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
          : 'bg-red-500/15 border-red-500/30 text-red-300'
      }`}
      dir="rtl"
    >
      {isOnline ? (
        <>
          <Wifi className="w-3.5 h-3.5" />
          <span>החיבור חזר — הנתונים מעודכנים</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          <span>אין חיבור — מציג נתונים שמורים</span>
        </>
      )}
    </div>
  )
}
