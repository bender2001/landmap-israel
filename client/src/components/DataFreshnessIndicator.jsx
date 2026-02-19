import { useState } from 'react'
import { useVisibilityInterval } from '../hooks/useVisibilityInterval'

/**
 * DataFreshnessIndicator — compact timestamp showing when plot data was last synced.
 * Like Google Docs' "Last synced X min ago" or Slack's connection status indicator.
 * 
 * Positioned bottom-right on desktop, top-left on mobile. Click triggers a manual refresh.
 * Turns orange when data is >5 min old (stale) with a pulsing dot — nudges refresh
 * without being alarming (investors shouldn't feel the data is unreliable).
 * 
 * Re-renders every 30s via useVisibilityInterval which pauses when the tab is hidden,
 * saving CPU in background tabs.
 */
export default function DataFreshnessIndicator({ updatedAt, onRefresh }) {
  const [, setTick] = useState(0)

  // Re-render every 30s to update relative time — pauses when tab is hidden.
  useVisibilityInterval(() => setTick(t => t + 1), 30_000)

  const ago = Math.round((Date.now() - updatedAt) / 1000)
  const label = ago < 60 ? 'עכשיו' : ago < 3600 ? `לפני ${Math.floor(ago / 60)} דק׳` : `לפני ${Math.floor(ago / 3600)} שע׳`
  const isStale = ago > 300 // >5 min

  return (
    <button
      onClick={onRefresh}
      className={`fixed top-[4rem] left-4 sm:left-auto sm:top-auto sm:bottom-[5.5rem] sm:right-6 z-[20] flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] backdrop-blur-md border transition-all hover:scale-105 ${
        isStale
          ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
          : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-400'
      }`}
      title="לחץ לרענון הנתונים"
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isStale ? 'bg-orange-400 animate-pulse' : 'bg-emerald-400'}`} />
      {label}
    </button>
  )
}
