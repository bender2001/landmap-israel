/**
 * Request timeout middleware.
 * Returns 504 if a request exceeds the configured timeout.
 * Prevents hanging connections from consuming server resources.
 */
export function requestTimeout(ms = 15000) {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          error: 'Gateway Timeout',
          message: 'Request took too long to process',
        })
      }
    }, ms)

    // Clear timeout when response finishes
    res.on('finish', () => clearTimeout(timer))
    res.on('close', () => clearTimeout(timer))

    next()
  }
}
