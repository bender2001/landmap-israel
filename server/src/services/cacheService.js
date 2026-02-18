/**
 * Simple in-memory TTL cache for server-side data.
 * Reduces Supabase API calls dramatically for frequently-accessed endpoints.
 * 
 * Features:
 * - Configurable TTL per entry
 * - Max size with LRU-style eviction (oldest first)
 * - Stale-while-revalidate pattern
 * - Cache statistics for monitoring
 */

class MemoryCache {
  constructor({ maxEntries = 100, defaultTtlMs = 30_000, gracePeriodMs = 0 } = {}) {
    this.store = new Map()
    this.maxEntries = maxEntries
    this.defaultTtlMs = defaultTtlMs
    this.gracePeriodMs = gracePeriodMs
    this.stats = { hits: 0, misses: 0, sets: 0, evictions: 0, coalesced: 0, swrHits: 0 }
    // Singleflight: track in-flight promises to prevent thundering herd.
    // When cache expires and N concurrent requests arrive for the same key,
    // only the first hits the database. The other N-1 wait for its result.
    this._inflight = new Map()
  }

  /**
   * Get a cached value. Returns null if expired or missing.
   */
  get(key) {
    const entry = this.store.get(key)
    if (!entry) {
      this.stats.misses++
      return null
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      this.stats.misses++
      return null
    }
    this.stats.hits++
    return entry.data
  }

  /**
   * Get the age of a cached entry in milliseconds.
   * Returns null if not cached. Used for X-Data-Age response header.
   */
  getAge(key) {
    const entry = this.store.get(key)
    if (!entry) return null
    return Date.now() - entry.createdAt
  }

  /**
   * Set a value with optional TTL override.
   */
  set(key, data, ttlMs) {
    // Evict oldest if at capacity
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      const oldest = this.store.keys().next().value
      this.store.delete(oldest)
      this.stats.evictions++
    }
    this.store.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs || this.defaultTtlMs),
      createdAt: Date.now(),
    })
    this.stats.sets++
  }

  /**
   * Delete a specific key.
   */
  delete(key) {
    this.store.delete(key)
  }

  /**
   * Invalidate all entries matching a prefix.
   */
  invalidatePrefix(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key)
    }
  }

  /**
   * Clear all cached data.
   */
  clear() {
    this.store.clear()
  }

  /**
   * Get cache statistics for monitoring.
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses
    return {
      ...this.stats,
      size: this.store.size,
      hitRate: total > 0 ? Math.round((this.stats.hits / total) * 100) : 0,
    }
  }

  /**
   * Get raw entry including stale data (for SWR pattern).
   * Returns { data, isStale } or null if no entry exists at all.
   */
  _getWithStale(key) {
    const entry = this.store.get(key)
    if (!entry) return null
    const now = Date.now()
    if (now <= entry.expiresAt) {
      return { data: entry.data, isStale: false }
    }
    // Grace period: entry is expired but within the grace window — serve stale
    if (this.gracePeriodMs > 0 && now <= entry.expiresAt + this.gracePeriodMs) {
      return { data: entry.data, isStale: true }
    }
    // Fully expired
    this.store.delete(key)
    return null
  }

  /**
   * Wrap an async function with caching + singleflight + stale-while-revalidate.
   *
   * Singleflight: if multiple callers hit `wrap()` for the same key simultaneously
   * (e.g., cache just expired and 10 requests arrive), only ONE executes `fn()`.
   * The others await the same in-flight promise. Prevents thundering herd on Supabase.
   *
   * Stale-While-Revalidate (when gracePeriodMs > 0): if the entry is expired but
   * within the grace window, return stale data immediately and refresh in the background.
   *
   * Usage: const data = await cache.wrap('key', () => fetchFromDb(), 60000)
   */
  async wrap(key, fn, ttlMs) {
    // Fast path: fresh cache hit
    const cached = this.get(key)
    if (cached !== null) return cached

    // SWR path: serve stale data immediately, refresh in background
    const staleEntry = this._getWithStale(key)
    if (staleEntry?.isStale) {
      this.stats.swrHits++
      // Trigger background refresh (only if not already in-flight)
      if (!this._inflight.has(key)) {
        const refreshPromise = fn()
          .then(data => { this.set(key, data, ttlMs); return data })
          .catch(() => {}) // swallow errors on background refresh
          .finally(() => this._inflight.delete(key))
        this._inflight.set(key, refreshPromise)
      }
      return staleEntry.data
    }

    // Singleflight: if another caller is already fetching this key, wait for it
    if (this._inflight.has(key)) {
      this.stats.coalesced++
      return this._inflight.get(key)
    }

    // First caller: execute fn() and store the promise for coalescing
    const promise = fn()
      .then(data => {
        this.set(key, data, ttlMs)
        return data
      })
      .finally(() => {
        this._inflight.delete(key)
      })
    this._inflight.set(key, promise)
    return promise
  }
}

// Shared cache instances — each with a grace period for stale-while-revalidate.
// Grace period = how long stale data can be served while a background refresh runs.
// This eliminates latency spikes on cache expiry: users always get instant responses.
export const plotCache = new MemoryCache({ maxEntries: 50, defaultTtlMs: 30_000, gracePeriodMs: 60_000 })    // 30s fresh + 60s stale grace
export const statsCache = new MemoryCache({ maxEntries: 20, defaultTtlMs: 120_000, gracePeriodMs: 120_000 }) // 2min fresh + 2min stale grace
export const marketCache = new MemoryCache({ maxEntries: 30, defaultTtlMs: 300_000, gracePeriodMs: 300_000 }) // 5min fresh + 5min stale grace

/**
 * Invalidate all plot-related caches (call after admin CRUD operations).
 */
export function invalidatePlotCaches() {
  plotCache.clear()
  statsCache.clear()
  marketCache.invalidatePrefix('overview')
  marketCache.invalidatePrefix('trends')
}
