/**
 * Retry wrapper with exponential backoff and jitter for transient failures.
 * Essential for production Supabase calls — network hiccups, connection resets,
 * and cold-start timeouts are common in serverless DB backends.
 *
 * Like Google's SRE retry pattern:
 * - Exponential backoff: 100ms → 200ms → 400ms (doubles each attempt)
 * - Random jitter: ±50% to prevent thundering herd on recovery
 * - Configurable max retries and timeout
 * - Only retries transient errors (network, timeout, 5xx) — not 4xx client errors
 *
 * Usage:
 *   const data = await withRetry(() => supabaseAdmin.from('plots').select('*'), { retries: 2 })
 */

/**
 * Determines if an error is transient (worth retrying) vs permanent (don't retry).
 * Supabase errors come in various shapes — normalize them all.
 */
function isTransientError(err) {
  if (!err) return false
  const msg = (err.message || '').toLowerCase()
  const code = err.code || ''
  const status = err.status || err.statusCode || 0

  // Network-level failures — always transient
  if (msg.includes('econnrefused') || msg.includes('econnreset') || msg.includes('etimedout')) return true
  if (msg.includes('socket hang up') || msg.includes('network') || msg.includes('fetch failed')) return true
  if (msg.includes('aborted') || msg.includes('timeout')) return true

  // Supabase/PostgREST 5xx errors — server-side transient failures
  if (status >= 500 && status < 600) return true

  // PostgreSQL transient error codes
  // 57P01 = admin_shutdown, 57P02 = crash_shutdown, 57P03 = cannot_connect_now
  // 40001 = serialization_failure, 40P01 = deadlock_detected
  if (['57P01', '57P02', '57P03', '40001', '40P01'].includes(code)) return true

  // Rate limiting — retry after backoff
  if (status === 429) return true

  return false
}

/**
 * Execute an async function with retry logic.
 *
 * @param {Function} fn - Async function to execute (should return the result directly)
 * @param {Object} options
 * @param {number} options.retries - Max retry attempts (default: 2)
 * @param {number} options.baseDelayMs - Initial delay before first retry (default: 100ms)
 * @param {number} options.maxDelayMs - Maximum delay cap (default: 2000ms)
 * @param {string} options.label - Label for log messages (default: 'query')
 * @returns {Promise<*>} Result of fn()
 */
export async function withRetry(fn, { retries = 2, baseDelayMs = 100, maxDelayMs = 2000, label = 'query' } = {}) {
  let lastError = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fn()
      // Log recovery if this succeeded on a retry
      if (attempt > 0) {
        console.log(`[retry] ${label} succeeded on attempt ${attempt + 1}`)
      }
      return result
    } catch (err) {
      lastError = err

      // Don't retry non-transient errors (4xx, validation, auth)
      if (!isTransientError(err)) {
        throw err
      }

      // Don't retry if we've exhausted attempts
      if (attempt >= retries) {
        console.warn(`[retry] ${label} failed after ${attempt + 1} attempts: ${err.message}`)
        throw err
      }

      // Exponential backoff with jitter
      const baseDelay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs)
      const jitter = baseDelay * (0.5 + Math.random()) // 50-150% of base delay
      const delay = Math.round(jitter)

      console.warn(`[retry] ${label} attempt ${attempt + 1} failed (${err.message}), retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Wraps a Supabase query chain with retry logic.
 * Handles the Supabase pattern where queries return { data, error } instead of throwing.
 *
 * Usage:
 *   const { data, error } = await supabaseRetry(
 *     () => supabaseAdmin.from('plots').select('*').eq('is_published', true),
 *     { label: 'getPlots' }
 *   )
 */
export async function supabaseRetry(queryFn, { retries = 2, baseDelayMs = 100, maxDelayMs = 2000, label = 'supabase' } = {}) {
  return withRetry(async () => {
    const result = await queryFn()

    // Supabase returns { data, error } — throw on transient errors so retry logic catches them
    if (result.error) {
      const err = new Error(result.error.message || 'Supabase error')
      err.code = result.error.code
      err.status = result.status || result.error.status
      err.details = result.error.details

      // Only throw (and thus retry) for transient errors
      if (isTransientError(err)) {
        throw err
      }

      // Non-transient: return the error as-is (caller handles it normally)
      return result
    }

    return result
  }, { retries, baseDelayMs, maxDelayMs, label })
}
