/**
 * API Response Time Percentile Tracker
 *
 * Lightweight in-memory histogram that tracks P50/P75/P95/P99 response times
 * per API route group. Exposed via the health endpoint for monitoring.
 *
 * Like Google's latency SLOs — tracks whether the API meets its performance budget.
 * Uses a circular buffer per route to keep memory bounded (max 500 samples per route).
 *
 * Route groups (to avoid cardinality explosion):
 *   /api/plots/:id → "plots:detail"
 *   /api/plots     → "plots:list"
 *   /api/market/*  → "market"
 *   /api/chat      → "chat"
 *   etc.
 */

const MAX_SAMPLES = 500
const MAX_ROUTES = 30

class ResponseTimeTracker {
  constructor() {
    /** @type {Map<string, { samples: Float64Array, idx: number, count: number, total: number }>} */
    this.routes = new Map()
    this.globalSamples = new Float64Array(MAX_SAMPLES)
    this.globalIdx = 0
    this.globalCount = 0
    this.globalTotal = 0
  }

  /**
   * Classify a request path into a route group.
   * Prevents high-cardinality from dynamic params (plot IDs, etc.).
   */
  _classify(method, path) {
    // Normalize: strip query string
    const p = path.split('?')[0]

    if (p === '/api/plots' || p === '/api/plots/') return 'plots:list'
    if (p.startsWith('/api/plots/stats')) return 'plots:stats'
    if (p.startsWith('/api/plots/batch')) return 'plots:batch'
    if (p.startsWith('/api/plots/') && p.split('/').length === 4) return 'plots:detail'
    if (p.startsWith('/api/plots/')) return 'plots:other'
    if (p.startsWith('/api/market')) return 'market'
    if (p.startsWith('/api/chat')) return 'chat'
    if (p.startsWith('/api/leads')) return 'leads'
    if (p.startsWith('/api/pois')) return 'pois'
    if (p.startsWith('/api/export')) return 'export'
    if (p.startsWith('/api/admin')) return 'admin'
    if (p.startsWith('/api/alerts')) return 'alerts'
    if (p.startsWith('/api/data')) return 'data'
    if (p.startsWith('/api/og')) return 'og'
    if (p.startsWith('/api/sitemap')) return 'sitemap'
    if (p.startsWith('/api/subscription')) return 'subscription'
    return 'other'
  }

  /**
   * Record a response time sample.
   */
  record(method, path, durationMs) {
    const route = this._classify(method, path)

    // Route-level tracking
    if (!this.routes.has(route)) {
      if (this.routes.size >= MAX_ROUTES) return // prevent unbounded growth
      this.routes.set(route, {
        samples: new Float64Array(MAX_SAMPLES),
        idx: 0,
        count: 0,
        total: 0,
      })
    }
    const entry = this.routes.get(route)
    entry.samples[entry.idx] = durationMs
    entry.idx = (entry.idx + 1) % MAX_SAMPLES
    entry.count++
    entry.total += durationMs

    // Global tracking
    this.globalSamples[this.globalIdx] = durationMs
    this.globalIdx = (this.globalIdx + 1) % MAX_SAMPLES
    this.globalCount++
    this.globalTotal += durationMs
  }

  /**
   * Compute percentiles from a circular buffer.
   */
  _percentiles(samples, count) {
    const n = Math.min(count, MAX_SAMPLES)
    if (n === 0) return { p50: 0, p75: 0, p95: 0, p99: 0, avg: 0 }

    // Copy valid samples and sort
    const arr = Array.from(samples.subarray(0, n)).sort((a, b) => a - b)
    const pct = (p) => arr[Math.min(Math.floor(p / 100 * n), n - 1)]

    return {
      p50: Math.round(pct(50) * 10) / 10,
      p75: Math.round(pct(75) * 10) / 10,
      p95: Math.round(pct(95) * 10) / 10,
      p99: Math.round(pct(99) * 10) / 10,
    }
  }

  /**
   * Get stats for the health endpoint.
   */
  getStats() {
    const global = {
      ...this._percentiles(this.globalSamples, this.globalCount),
      totalRequests: this.globalCount,
      avgMs: this.globalCount > 0
        ? Math.round((this.globalTotal / this.globalCount) * 10) / 10
        : 0,
    }

    const routes = {}
    for (const [route, entry] of this.routes) {
      const n = Math.min(entry.count, MAX_SAMPLES)
      routes[route] = {
        ...this._percentiles(entry.samples, entry.count),
        requests: entry.count,
        avgMs: entry.count > 0
          ? Math.round((entry.total / entry.count) * 10) / 10
          : 0,
      }
    }

    return { global, routes }
  }
}

export const responseTracker = new ResponseTimeTracker()
