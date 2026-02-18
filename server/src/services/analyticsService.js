/**
 * Lightweight in-memory analytics service for search queries and user behavior.
 * Tracks popular searches, filter usage, and plot engagement — no DB dependency.
 * Admin can query via /api/admin/analytics for business insights (like Madlan's data team).
 */

const MAX_SEARCHES = 500
const MAX_FILTER_STATS = 100

class AnalyticsService {
  constructor() {
    this.searches = []           // Recent search queries
    this.filterUsage = {}        // { filterName: count }
    this.plotClicks = {}         // { plotId: count }
    this.sessionCount = 0
    this.startedAt = Date.now()
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
    }
  }
}

// Singleton
export const analytics = new AnalyticsService()
