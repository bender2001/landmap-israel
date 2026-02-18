/**
 * Request timeout middleware.
 * Returns 504 if a request exceeds the configured timeout.
 * Prevents hanging connections from consuming server resources.
 *
 * Hebrew error message for consistency with errorHandler.js.
 * Includes requestId for tracing and retryable hint for client-side retry logic.
 */
export function requestTimeout(ms = 15000) {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        const reqId = req.id || '-'
        console.warn(JSON.stringify({
          level: 'warn',
          reqId,
          method: req.method,
          path: req.originalUrl,
          status: 504,
          message: `Request timed out after ${ms}ms`,
          timestamp: new Date().toISOString(),
        }))
        res.status(504).json({
          error: 'תם הזמן המוקצב לבקשה — נסה שוב',
          errorCode: 'REQUEST_TIMEOUT',
          requestId: reqId,
          retryable: true,
        })
      }
    }, ms)

    // Clear timeout when response finishes
    res.on('finish', () => clearTimeout(timer))
    res.on('close', () => clearTimeout(timer))

    next()
  }
}
