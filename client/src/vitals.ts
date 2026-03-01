/**
 * Web Vitals collection & reporting.
 *
 * Uses the native PerformanceObserver API to track Core Web Vitals (LCP, CLS, INP, TTFB)
 * and beacons them to /api/vitals for real-user monitoring.
 *
 * No external dependencies — uses only browser APIs.
 * Gracefully degrades when PerformanceObserver is unavailable (older browsers).
 */

type VitalMetric = {
  name: 'LCP' | 'CLS' | 'INP' | 'TTFB' | 'FID'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
}

const ENDPOINT = '/api/vitals'

/** Thresholds per Google's Web Vitals definitions (2024) */
const THRESHOLDS: Record<string, [number, number]> = {
  LCP: [2500, 4000],
  CLS: [0.1, 0.25],
  INP: [200, 500],
  TTFB: [800, 1800],
  FID: [100, 300],
}

function rate(name: string, value: number): VitalMetric['rating'] {
  const [good, poor] = THRESHOLDS[name] ?? [Infinity, Infinity]
  if (value <= good) return 'good'
  if (value <= poor) return 'needs-improvement'
  return 'poor'
}

function send(metric: VitalMetric) {
  const body = JSON.stringify({ ...metric, url: location.pathname })
  // Prefer sendBeacon (non-blocking, survives page unload); fall back to fetch
  if (navigator.sendBeacon) {
    navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }))
  } else {
    fetch(ENDPOINT, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {})
  }
}

function observe(type: string, callback: (entries: PerformanceEntryList) => void, opts?: PerformanceObserverInit) {
  try {
    if (!('PerformanceObserver' in window)) return
    const po = new PerformanceObserver((list) => callback(list.getEntries()))
    po.observe({ type, buffered: true, ...opts })
  } catch {
    // Silently ignore — metric type not supported in this browser
  }
}

export function initWebVitals() {
  if (typeof window === 'undefined') return

  // ── TTFB ──
  // Time to First Byte from navigation timing
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (nav && nav.responseStart > 0) {
      const ttfb = nav.responseStart - nav.startTime
      send({ name: 'TTFB', value: Math.round(ttfb), rating: rate('TTFB', ttfb) })
    }
  } catch {}

  // ── LCP ──
  // Largest Contentful Paint — report the final LCP candidate
  let lcpValue = 0
  observe('largest-contentful-paint', (entries) => {
    const last = entries[entries.length - 1] as PerformancePaintTiming & { startTime: number }
    if (last) lcpValue = last.startTime
  })
  // Report LCP on page hide (ensures we capture the final value)
  const reportLcp = () => {
    if (lcpValue > 0) {
      send({ name: 'LCP', value: Math.round(lcpValue), rating: rate('LCP', lcpValue) })
      lcpValue = 0 // Only report once
    }
  }
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') reportLcp() }, { once: true })
  addEventListener('pagehide', reportLcp, { once: true })

  // ── CLS ──
  // Cumulative Layout Shift — sum all layout shift values (excluding user-input shifts)
  let clsValue = 0
  observe('layout-shift', (entries) => {
    for (const entry of entries) {
      const ls = entry as PerformanceEntry & { hadRecentInput: boolean; value: number }
      if (!ls.hadRecentInput) clsValue += ls.value
    }
  })
  const reportCls = () => {
    send({ name: 'CLS', value: Math.round(clsValue * 1000) / 1000, rating: rate('CLS', clsValue) })
  }
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') reportCls() }, { once: true })

  // ── INP ──
  // Interaction to Next Paint — track the worst interaction latency
  let inpValue = 0
  observe('event', (entries) => {
    for (const entry of entries) {
      const evt = entry as PerformanceEntry & { duration: number; interactionId: number }
      if (evt.interactionId && evt.duration > inpValue) {
        inpValue = evt.duration
      }
    }
  }, { durationThreshold: 16 } as any)
  const reportInp = () => {
    if (inpValue > 0) {
      send({ name: 'INP', value: Math.round(inpValue), rating: rate('INP', inpValue) })
    }
  }
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') reportInp() }, { once: true })
}
