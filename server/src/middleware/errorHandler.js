import crypto from 'crypto'

/**
 * Request ID middleware — assigns a unique ID to every request for tracing.
 * The ID is returned in X-Request-Id header and included in error responses.
 */
export function requestId(req, _res, next) {
  req.id = req.headers['x-request-id'] || crypto.randomUUID().slice(0, 8)
  _res.set('X-Request-Id', req.id)
  next()
}

export function errorHandler(err, req, res, _next) {
  const reqId = req.id || '-'
  const status = err.status || 500
  const message = status === 500 ? 'Internal server error' : err.message

  // Structured error logging
  console.error(JSON.stringify({
    level: 'error',
    reqId,
    method: req.method,
    path: req.originalUrl,
    status,
    message: err.message,
    stack: status === 500 ? err.stack : undefined,
    timestamp: new Date().toISOString(),
  }))

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body', requestId: reqId })
  }

  res.status(status).json({
    error: message,
    requestId: reqId,
    ...(err.details ? { details: err.details } : {}),
  })
}
