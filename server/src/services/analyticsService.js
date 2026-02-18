/**
 * Lightweight in-memory analytics service for search queries and user behavior.
 * Tracks popular searches, filter usage, and plot engagement — no DB dependency.
 * Admin can query via /api/admin/analytics for business insights (like Madlan's data team).
 */

const MAX_SEARCHES = 500
const MAX_FILTER_STATS = 100
const MAX_VITALS = 200

class AnalyticsService {
  constructor() {
    this.searches = []           // Recent search queries
    this.filterUsage = {}        // { filterName: count }
    this.plotClicks = {}         // { plotId: count }
    this.sessionCount = 0
    this.startedAt = Date.now()

    // Core Web Vitals — tracks LCP, INP, CLS, TTFB, FID from real users.
    // Stored in-memory with rolling window. Provides p75 aggregates
    // (the same percentile Google uses for CWV ranking decisions).
    this.vitals = {
      LCP: [],   // Largest Contentful Paint (ms) — ≤2500 good
      INP: [],   // Interaction to Next Paint (ms) — ≤200 good
      CLS: [],   // Cumulative Layout Shift (score) — ≤0.1 good
      TTFB: [],  // Time to First Byte (ms) — ≤800 good
      FID: [],   // First Input Delay (ms) — legacy, ≤100 good
    }
  }

  /**
   * Record a Core Web Vital measurement from a real user session.
   * @param {{ name: string, value: number, rating: string, url: string }} metric
   */
  trackVital(metric) {
    if (!metric?.name || typeof metric.value !== 'number') return
    const bucket = this.vitals[metric.name]
    if (!bucket) return
    bucket.push({
      value: metric.value,
      rating: metric.rating,
      url: metric.url,
      ts: Date.now(),
    })
    // Rolling window — keep bounded
    if (bucket.length > MAX_VITALS) {
      this.vitals[metric.name] = bucket.slice(-MAX_VITALS)
    }
  }

  /**
   * Get Web Vitals summary — p75 aggregates (what Google uses for CWV).
   * Returns per-metric p75, sample count, and rating distribution.
   */
  getVitalsSummary() {
    const summary = {}
    for (const [name, entries] of Object.entries(this.vitals)) {
      if (entries.length === 0) {
        summary[name] = { p75: null, count: 0, ratings: {} }
        continue
      }
      const sorted = entries.map(e => e.value).sort((a, b) => a - b)
      const p75Idx = Math.floor(sorted.length * 0.75)
      const p75 = sorted[Math.min(p75Idx, sorted.length - 1)]
      const ratings = { good: 0, 'needs-improvement': 0, poor: 0 }
      for (const e of entries) {
        if (ratings[e.rating] !== undefined) ratings[e.rating]++
      }
      summary[name] = {
        p75: Math.round(p75 * 100) / 100,
        count: entries.length,
        ratings,
      }
    }
    return summary
  }

  trackSearch(query, resultCount, filters = {}) {
    if (!query || typeof query !== 'string') return
    const q = query.trim().slice(0, 100)
    if (q.length === 0) return

    this.searches.push({
      query: q,
      resultCount,
      filters: Object.keys(filters).filter(k => filters[k] && filters[k] !== 'all'),
      ts: Date.now(),
    })

    // Keep bounded
    if (this.searches.length > MAX_SEARCHES) {
      this.searches = this.searches.slice(-MAX_SEARCHES)
    }
  }

  trackFilter(filterName) {
    if (!filterName || typeof filterName !== 'string') return
    this.filterUsage[filterName] = (this.filterUsage[filterName] || 0) + 1
  }

  trackPlotClick(plotId) {
    if (!plotId) return
    this.plotClicks[plotId] = (this.plotClicks[plotId] || 0) + 1
  }

  trackSession() {
    this.sessionCount++
  }

  /** Get top N search terms by frequency */
  getTopSearches(limit = 20) {
    const counts = {}
    for (const s of this.searches) {
      const q = s.query.toLowerCase()
      counts[q] = (counts[q] || 0) + 1
    }
    return Object.entries(counts)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  /** Get searches with zero results — indicates demand gaps */
  getZeroResultSearches(limit = 20) {
    const zeroSearches = {}
    for (const s of this.searches) {
      if (s.resultCount === 0) {
        const q = s.query.toLowerCase()
        zeroSearches[q] = (zeroSearches[q] || 0) + 1
      }
    }
    return Object.entries(zeroSearches)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  /** Get most clicked plots */
  getTopPlots(limit = 10) {
    return Object.entries(this.plotClicks)
      .map(([plotId, clicks]) => ({ plotId, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, limit)
  }

  /** Full analytics summary */
  getSummary() {
    const now = Date.now()
    const uptimeHours = ((now - this.startedAt) / 3600000).toFixed(1)
    const last24h = this.searches.filter(s => now - s.ts < 86400000)
    const lastHour = this.searches.filter(s => now - s.ts < 3600000)

    return {
      uptime: `${uptimeHours}h`,
      sessions: this.sessionCount,
      searches: {
        total: this.searches.length,
        last24h: last24h.length,
        lastHour: lastHour.length,
        top: this.getTopSearches(10),
        zeroResults: this.getZeroResultSearches(10),
      },
      filters: Object.entries(this.filterUsage)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      topPlots: this.getTopPlots(10),
      vitals: this.getVitalsSummary(),
    }
  }
}

// Singleton
export const analytics = new AnalyticsService()
