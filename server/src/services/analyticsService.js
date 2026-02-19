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
    // Contact conversion tracking — measures which channels drive inquiries.
    // Critical for marketing ROI: WhatsApp vs Telegram vs Phone vs Lead form.
    // Like Madlan's internal funnel metrics that drive business decisions.
    this.conversions = []        // Recent conversion events
    this.conversionsByChannel = {} // { channel: count }
    this.conversionsByPlot = {}   // { plotId: count }

    // Impression tracking — counts how many times each plot was *seen* (not just clicked).
    // Impression data is the denominator for CTR (Click-Through Rate) calculation:
    //   CTR = clicks / impressions
    // YouTube, TikTok, and Instagram all use impressions for feed algorithms.
    // With this + plotClicks, we can surface plots with high impressions but low clicks
    // (possible UX issues) or high CTR (strong demand signals).
    this.impressions = {}         // { plotId: count }
    this.impressionEvents = 0     // total impression events received

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

  /**
   * Record plot impressions (plots seen in the card strip / viewport).
   * Accepts a batch of { plotId } entries from the client's IntersectionObserver.
   * @param {{ plotId: string }[]} batch - Array of impression entries
   */
  trackImpressions(batch) {
    if (!Array.isArray(batch)) return
    for (const entry of batch) {
      if (!entry?.plotId || typeof entry.plotId !== 'string') continue
      const id = entry.plotId.slice(0, 50) // sanitize
      this.impressions[id] = (this.impressions[id] || 0) + 1
      this.impressionEvents++
    }
  }

  /**
   * Get Click-Through Rate (CTR) for each plot — clicks / impressions.
   * High CTR = strong demand signal → candidates for "Featured Deals".
   * Low CTR with high impressions = possible pricing or presentation issue.
   * @param {number} limit - Max results
   */
  getPlotCTR(limit = 20) {
    const results = []
    for (const [plotId, impressionCount] of Object.entries(this.impressions)) {
      if (impressionCount < 3) continue // Skip noise (< 3 impressions)
      const clicks = this.plotClicks[plotId] || 0
      const ctr = Math.round((clicks / impressionCount) * 10000) / 100 // percentage with 2 decimals
      results.push({ plotId, impressions: impressionCount, clicks, ctr })
    }
    return results.sort((a, b) => b.ctr - a.ctr).slice(0, limit)
  }

  trackSession() {
    this.sessionCount++
  }

  /**
   * Record a contact conversion event (WhatsApp/Telegram/Phone/Lead click).
   * @param {{ channel: string, plotId?: string, source?: string, ts?: number }} event
   */
  trackConversion(event) {
    if (!event?.channel) return
    const entry = {
      channel: event.channel,
      plotId: event.plotId || null,
      source: event.source || 'unknown',
      url: event.url || null,
      ts: event.ts || Date.now(),
    }
    this.conversions.push(entry)
    this.conversionsByChannel[entry.channel] = (this.conversionsByChannel[entry.channel] || 0) + 1
    if (entry.plotId) {
      this.conversionsByPlot[entry.plotId] = (this.conversionsByPlot[entry.plotId] || 0) + 1
    }
    // Rolling window — keep bounded (max 500 events)
    if (this.conversions.length > 500) {
      this.conversions = this.conversions.slice(-500)
    }
  }

  /** Get conversion summary — channel breakdown, top plots, funnel metrics */
  getConversionSummary() {
    const now = Date.now()
    const last24h = this.conversions.filter(c => now - c.ts < 86400000)
    const last7d = this.conversions.filter(c => now - c.ts < 7 * 86400000)

    // Channel breakdown for last 24h
    const channelLast24h = {}
    for (const c of last24h) {
      channelLast24h[c.channel] = (channelLast24h[c.channel] || 0) + 1
    }

    // Top plots by conversions
    const plotCounts = {}
    for (const c of last7d) {
      if (c.plotId) plotCounts[c.plotId] = (plotCounts[c.plotId] || 0) + 1
    }
    const topPlots = Object.entries(plotCounts)
      .map(([plotId, count]) => ({ plotId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      total: this.conversions.length,
      last24h: last24h.length,
      last7d: last7d.length,
      byChannel: this.conversionsByChannel,
      channelLast24h,
      topPlots,
      // Conversion rate estimate: conversions / sessions
      conversionRate: this.sessionCount > 0
        ? Math.round((this.conversions.length / this.sessionCount) * 10000) / 100
        : 0,
    }
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
      impressions: {
        totalEvents: this.impressionEvents,
        uniquePlots: Object.keys(this.impressions).length,
        topCTR: this.getPlotCTR(10),
      },
      vitals: this.getVitalsSummary(),
      conversions: this.getConversionSummary(),
    }
  }
}

// Singleton
export const analytics = new AnalyticsService()
