import { useState, useEffect, useRef } from 'react'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'
import { WifiOff, Wifi, RefreshCw } from 'lucide-react'

/**
 * OfflineBanner — shows a prominent banner when the user loses internet connectivity.
 * When connection is restored, shows a brief "Back online" confirmation and optionally
 * triggers a data refresh. Like Google Maps / Madlan's offline indicators — critical for
 * real estate apps where users might browse in areas with spotty cellular coverage.
 *
 * States:
 * 1. Hidden — online, nothing to show
 * 2. Offline — red banner, pulsing icon
 * 3. Reconnected — green banner for 4s, then fades out
 */
export default function OfflineBanner({ onReconnect }) {
  const { online } = useNetworkStatus()
  const [showReconnected, setShowReconnected] = useState(false)
  const wasOfflineRef = useRef(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!online) {
      // User went offline — track this so we know to show reconnection banner
      wasOfflineRef.current = true
      setShowReconnected(false)
      if (timerRef.current) clearTimeout(timerRef.current)
    } else if (wasOfflineRef.current) {
      // User came back online after being offline
      wasOfflineRef.current = false
      setShowReconnected(true)

      // Trigger data refresh callback (non-blocking)
      if (onReconnect) {
        try { onReconnect() } catch {}
      }

      // Auto-hide after 4 seconds
      timerRef.current = setTimeout(() => {
        setShowReconnected(false)
      }, 4000)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [online, onReconnect])

  // Nothing to show — user is online and hasn't just reconnected
  if (online && !showReconnected) return null

  return (
    <div
      className={`fixed top-12 left-1/2 -translate-x-1/2 z-[110] animate-bounce-in transition-all duration-300`}
      dir="rtl"
      role="alert"
      aria-live="assertive"
    >
      {!online ? (
        /* ── Offline banner ── */
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-red-500/15 backdrop-blur-md border border-red-500/25 rounded-2xl shadow-lg shadow-red-500/10">
          <WifiOff className="w-4 h-4 text-red-400 animate-pulse flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-red-300">אין חיבור לאינטרנט</span>
            <span className="text-[10px] text-red-400/70">הנתונים המוצגים עשויים להיות לא מעודכנים</span>
          </div>
        </div>
      ) : (
        /* ── Reconnected banner ── */
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-emerald-500/15 backdrop-blur-md border border-emerald-500/25 rounded-2xl shadow-lg shadow-emerald-500/10">
          <Wifi className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-emerald-300">חזרת לאינטרנט</span>
          <RefreshCw className="w-3 h-3 text-emerald-400/60 animate-spin" />
          <span className="text-[10px] text-emerald-400/60">מרענן נתונים...</span>
        </div>
      )}
    </div>
  )
}
