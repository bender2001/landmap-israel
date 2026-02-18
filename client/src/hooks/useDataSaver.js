import { useSyncExternalStore } from 'react'

/**
 * Unified data-saver detection — respects both browser Save-Data header
 * AND user-set preference in localStorage. Applies class to <html> for CSS targeting.
 *
 * When active:
 * - Skip image prefetch/preload (CardImageCarousel, sidebar gallery)
 * - Reduce animation complexity (disable backdrop-blur, particle effects)
 * - Lower refetch frequency (handled via useIsSlowConnection in usePlots)
 * - Disable autoplay features (market ticker rotation, etc.)
 *
 * Google, YouTube, and Twitter all respect Save-Data — we should too.
 * ~10% of mobile users in Israel have Save-Data enabled (metered plans).
 */

const LS_KEY = 'landmap_data_saver'

function getSnapshot() {
  // Check browser's native Save-Data hint (Connection API)
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  const browserSaveData = conn?.saveData === true

  // Check user's manual preference
  const userPref = localStorage.getItem(LS_KEY)

  // Also check prefers-reduced-motion — users who want reduced motion
  // typically also benefit from reduced data usage
  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false

  return browserSaveData || userPref === 'on' || prefersReduced
}

// Server snapshot — assume normal data usage
function getServerSnapshot() {
  return false
}

function subscribe(callback) {
  // Listen for connection changes (Save-Data can change mid-session)
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  if (conn) conn.addEventListener('change', callback)

  // Listen for reduced motion preference changes
  const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  if (mq?.addEventListener) mq.addEventListener('change', callback)

  // Listen for storage changes (user toggled in another tab)
  window.addEventListener('storage', callback)

  return () => {
    if (conn) conn.removeEventListener('change', callback)
    if (mq?.removeEventListener) mq.removeEventListener('change', callback)
    window.removeEventListener('storage', callback)
  }
}

/**
 * Returns true when the app should minimize data usage.
 * Combines: browser Save-Data, user preference, and prefers-reduced-motion.
 */
export function useDataSaver() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * Toggle the user's data saver preference (for settings UI).
 */
export function toggleDataSaver(enabled) {
  localStorage.setItem(LS_KEY, enabled ? 'on' : 'off')
  // Dispatch storage event so other tabs/hooks pick up the change
  window.dispatchEvent(new StorageEvent('storage', { key: LS_KEY }))
}
