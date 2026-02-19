type MetricName = 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'INP'
type MetricRating = 'good' | 'needs-improvement' | 'poor'

interface Metric {
  name: MetricName
  value: number
  rating: MetricRating
  delta?: number
  id?: string
}

const PERF_BUDGET: Record<MetricName, number> = {
  LCP: 2500,
  FID: 100,
  CLS: 0.1,
  TTFB: 800,
  INP: 200,
}

function logMetric(metric: Metric): void {
  const budget = PERF_BUDGET[metric.name]
  const overBudget = budget != null && metric.value > budget

  if (import.meta.env.DEV || overBudget) {
    const status = overBudget ? '🔴' : '🟢'
    console.log(
      `${status} [WebVitals] ${metric.name}: ${Math.round(metric.value)}${metric.name === 'CLS' ? '' : 'ms'}` +
      (budget != null ? ` (budget: ${budget}${metric.name === 'CLS' ? '' : 'ms'})` : '')
    )
  }

  if (import.meta.env.PROD && overBudget) {
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
    } catch {}
  }
}

export function initWebVitals(): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

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

  try {
    const fidObserver = new PerformanceObserver((list) => {
      const entry = list.getEntries()[0] as PerformanceEventTiming
      if (entry) {
        const value = entry.processingStart - entry.startTime
        logMetric({ name: 'FID', value, rating: value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor' })
      }
    })
    fidObserver.observe({ type: 'first-input', buffered: true })
  } catch {}

  try {
    let clsValue = 0
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutEntry = entry as PerformanceEntry & { hadRecentInput: boolean; value: number }
        if (!layoutEntry.hadRecentInput) {
          clsValue += layoutEntry.value
        }
      }
    })
    clsObserver.observe({ type: 'layout-shift', buffered: true })

    addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        logMetric({ name: 'CLS', value: clsValue, rating: clsValue <= 0.1 ? 'good' : clsValue <= 0.25 ? 'needs-improvement' : 'poor' })
      }
    }, { once: true })
  } catch {}

  try {
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navEntry) {
      const ttfb = navEntry.responseStart - navEntry.requestStart
      logMetric({ name: 'TTFB', value: ttfb, rating: ttfb <= 800 ? 'good' : ttfb <= 1800 ? 'needs-improvement' : 'poor' })
    }
  } catch {}
}
