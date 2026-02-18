import { useSyncExternalStore } from 'react'

/**
 * Hook to detect network quality and online/offline status.
 * Enables connection-aware UX: reduce animations, defer image loads,
 * show offline indicators — like premium real estate platforms.
 */

// Cache the snapshot object — useSyncExternalStore compares by reference,
// so returning a new object every call causes an infinite re-render loop.
let cachedSnapshot = null

function getNetworkInfo() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  const online = navigator.onLine
  const effectiveType = conn?.effectiveType || '4g'
  const downlink = conn?.downlink || null
  const rtt = conn?.rtt || null
  const saveData = conn?.saveData || false

  // Only create a new object if values actually changed
  if (
    cachedSnapshot &&
    cachedSnapshot.online === online &&
    cachedSnapshot.effectiveType === effectiveType &&
    cachedSnapshot.downlink === downlink &&
    cachedSnapshot.rtt === rtt &&
    cachedSnapshot.saveData === saveData
  ) {
    return cachedSnapshot
  }

  cachedSnapshot = { online, effectiveType, downlink, rtt, saveData }
  return cachedSnapshot
}

const SERVER_SNAPSHOT = {
  online: true,
  effectiveType: '4g',
  downlink: null,
  rtt: null,
  saveData: false,
}

function subscribe(callback) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  if (conn) conn.addEventListener('change', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
    if (conn) conn.removeEventListener('change', callback)
  }
}

export function useNetworkStatus() {
  return useSyncExternalStore(subscribe, getNetworkInfo, () => SERVER_SNAPSHOT)
}

/**
 * Returns true when the connection is slow (2g/3g or high RTT).
 * Useful for disabling heavy animations, reducing image quality, etc.
 */
export function useIsSlowConnection() {
  const { effectiveType, rtt, saveData } = useNetworkStatus()
  return saveData || effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g' || (rtt != null && rtt > 500)
}
