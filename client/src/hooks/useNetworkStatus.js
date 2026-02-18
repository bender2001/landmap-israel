import { useState, useEffect, useSyncExternalStore } from 'react'

/**
 * Hook to detect network quality and online/offline status.
 * Enables connection-aware UX: reduce animations, defer image loads,
 * show offline indicators — like premium real estate platforms.
 */

function getNetworkInfo() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  return {
    online: navigator.onLine,
    effectiveType: conn?.effectiveType || '4g', // '4g', '3g', '2g', 'slow-2g'
    downlink: conn?.downlink || null,            // Mbps
    rtt: conn?.rtt || null,                      // Round trip time ms
    saveData: conn?.saveData || false,
  }
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
  return useSyncExternalStore(subscribe, getNetworkInfo, () => ({
    online: true,
    effectiveType: '4g',
    downlink: null,
    rtt: null,
    saveData: false,
  }))
}

/**
 * Returns true when the connection is slow (2g/3g or high RTT).
 * Useful for disabling heavy animations, reducing image quality, etc.
 */
export function useIsSlowConnection() {
  const { effectiveType, rtt, saveData } = useNetworkStatus()
  return saveData || effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g' || (rtt != null && rtt > 500)
}
