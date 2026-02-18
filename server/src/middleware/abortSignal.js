/**
 * Request AbortSignal middleware.
 *
 * Creates an AbortController tied to the client connection lifecycle.
 * When the client disconnects (navigates away, closes tab, loses connection),
 * the signal aborts immediately — allowing downstream handlers to cancel
 * in-flight Supabase queries, AI calls, or compute-heavy loops.
 *
 * Usage:
 *   router.get('/expensive', requestAbortSignal, async (req, res) => {
 *     const { data } = await supabaseAdmin
 *       .from('plots')
 *       .select('*')
 *       .abortSignal(req.signal)  // Supabase supports AbortSignal
 *     // ...
 *   })
 *
 * Why this matters:
 *   Without abort signals, when a user clicks a plot then immediately clicks
 *   another, the server processes BOTH expensive /similar + /nearby queries
 *   to completion — wasting CPU, memory, and Supabase connection pool slots.
 *   With this middleware, the first request's queries are cancelled the moment
 *   the browser abandons them.
 *
 * Performance impact:
 *   On a 12-plot dataset this is marginal, but as the DB grows to 100+ plots
 *   and more users browse simultaneously, this prevents request pile-up under
 *   rapid navigation patterns (common on mobile).
 */
export function requestAbortSignal(req, res, next) {
  const controller = new AbortController()

  // Attach signal to the request object for downstream use
  req.signal = controller.signal

  // Abort when client disconnects
  const onClose = () => {
    if (!controller.signal.aborted) {
      controller.abort()
    }
  }

  req.on('close', onClose)

  // Cleanup listener when response finishes normally
  res.on('finish', () => {
    req.removeListener('close', onClose)
  })

  next()
}

/**
 * Helper: Check if a caught error is an abort (client disconnect).
 * When aborted, we skip error logging — it's expected behavior, not a bug.
 */
export function isAbortError(err) {
  if (!err) return false
  return (
    err.name === 'AbortError' ||
    err.code === 'ABORT_ERR' ||
    err.code === 20 || // DOMException.ABORT_ERR
    (err.message && err.message.includes('aborted'))
  )
}
