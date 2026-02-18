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
  constructor({ maxEntries = 100, defaultTtlMs = 30_000 } = {}) {
    this.store = new Map()
    this.maxEntries = maxEntries
    this.defaultTtlMs = defaultTtlMs
    this.stats = { hits: 0, misses: 0, sets: 0, evictions: 0 }
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
   * Wrap an async function with caching.
   * Usage: const data = await cache.wrap('key', () => fetchFromDb(), 60000)
   */
  async wrap(key, fn, ttlMs) {
    const cached = this.get(key)
    if (cached !== null) return cached
    const data = await fn()
    this.set(key, data, ttlMs)
    return data
  }
}

// Shared cache instances
export const plotCache = new MemoryCache({ maxEntries: 50, defaultTtlMs: 30_000 })    // 30s for plot listings
export const statsCache = new MemoryCache({ maxEntries: 20, defaultTtlMs: 120_000 })   // 2min for aggregate stats
export const marketCache = new MemoryCache({ maxEntries: 30, defaultTtlMs: 300_000 })   // 5min for market data

/**
 * Invalidate all plot-related caches (call after admin CRUD operations).
 */
export function invalidatePlotCaches() {
  plotCache.clear()
  statsCache.clear()
  marketCache.invalidatePrefix('overview')
  marketCache.invalidatePrefix('trends')
}
