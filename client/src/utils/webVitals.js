/**
 * Web Vitals monitoring — track real user performance metrics.
 * Logs LCP, FID, CLS, TTFB, INP to console in dev, and can be extended
 * to send to an analytics endpoint in production.
 * 
 * Like Madlan/Yad2, we care about perceived performance — especially
 * for map-heavy pages where LCP and INP matter most.
 */

const PERF_BUDGET = {
  LCP: 2500,   // Largest Contentful Paint < 2.5s
  FID: 100,    // First Input Delay < 100ms
  CLS: 0.1,    // Cumulative Layout Shift < 0.1
  TTFB: 800,   // Time to First Byte < 800ms
  INP: 200,    // Interaction to Next Paint < 200ms
}

function logMetric(metric) {
  const budget = PERF_BUDGET[metric.name]
  const overBudget = budget != null && metric.value > budget
  
  if (import.meta.env.DEV || overBudget) {
    const status = overBudget ? '🔴' : '🟢'
    console.log(
      `${status} [WebVitals] ${metric.name}: ${Math.round(metric.value)}${metric.name === 'CLS' ? '' : 'ms'}` +
      (budget != null ? ` (budget: ${budget}${metric.name === 'CLS' ? '' : 'ms'})` : '')
    )
  }

  // In production, send to analytics endpoint
  if (import.meta.env.PROD && overBudget) {
    // Fire-and-forget beacon to server (can be extended with real endpoint)
    try {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        url: window.location.pathname,
        timestamp: Date.now(),
      })
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/vitals', body)
      }
    } catch {
      // Non-critical — silently ignore
    }
  }
}

/**
 * Initialize Web Vitals monitoring.
 * Uses the native PerformanceObserver API (no external dependency).
 */
export function initWebVitals() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

  // LCP — Largest Contentful Paint
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const last = entries[entries.length - 1]
      if (last) {
        logMetric({ name: 'LCP', value: last.startTime, rating: last.startTime <= 2500 ? 'good' : last.startTime <= 4000 ? 'needs-improvement' : 'poor' })
      }
    })
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
  } catch {}

  // FID — First Input Delay
  try {
    const fidObserver = new PerformanceObserver((list) => {
      const entry = list.getEntries()[0]
      if (entry) {
        const value = entry.processingStart - entry.startTime
        logMetric({ name: 'FID', value, rating: value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor' })
      }
    })
    fidObserver.observe({ type: 'first-input', buffered: true })
  } catch {}

  // CLS — Cumulative Layout Shift
  try {
    let clsValue = 0
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
        }
      }
    })
    clsObserver.observe({ type: 'layout-shift', buffered: true })
    
    // Report on page hide
    addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        logMetric({ name: 'CLS', value: clsValue, rating: clsValue <= 0.1 ? 'good' : clsValue <= 0.25 ? 'needs-improvement' : 'poor' })
      }
    }, { once: true })
  } catch {}

  // TTFB — Time to First Byte
  try {
    const navEntry = performance.getEntriesByType('navigation')[0]
    if (navEntry) {
      const ttfb = navEntry.responseStart - navEntry.requestStart
      logMetric({ name: 'TTFB', value: ttfb, rating: ttfb <= 800 ? 'good' : ttfb <= 1800 ? 'needs-improvement' : 'poor' })
    }
  } catch {}
}
