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

/**
 * Hebrew user-facing error messages by HTTP status code.
 * These are safe to show to end users (no internal details leaked).
 * Backend logs retain the full English error for debugging.
 */
const hebrewMessages = {
  400: 'הבקשה אינה תקינה',
  401: 'נדרשת הזדהות',
  403: 'אין הרשאה לביצוע פעולה זו',
  404: 'המשאב המבוקש לא נמצא',
  409: 'התנגשות בנתונים — נסה שוב',
  413: 'הקובץ גדול מדי',
  422: 'הנתונים שהוזנו אינם תקינים',
  429: 'יותר מדי בקשות — נסה שוב בעוד דקה',
  500: 'שגיאת שרת פנימית',
  502: 'שגיאת חיבור לשרת',
  503: 'השירות אינו זמין כרגע',
  504: 'תם הזמן המוקצב לבקשה',
}

export function errorHandler(err, req, res, _next) {
  const reqId = req.id || '-'
  const status = err.status || 500
  // Internal log message retains the real error for debugging
  const internalMessage = err.message || 'Unknown error'
  // User-facing message: use Hebrew translation, fall back to generic
  const userMessage = hebrewMessages[status] || (status >= 500 ? hebrewMessages[500] : internalMessage)

  // Structured error logging — verbose for 5xx, terse for 4xx
  console.error(JSON.stringify({
    level: status >= 500 ? 'error' : 'warn',
    reqId,
    method: req.method,
    path: req.originalUrl,
    status,
    message: internalMessage,
    stack: status >= 500 ? err.stack : undefined,
    timestamp: new Date().toISOString(),
  }))

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: hebrewMessages[400],
      errorCode: 'INVALID_JSON',
      requestId: reqId,
    })
  }

  res.status(status).json({
    error: userMessage,
    errorCode: err.code || `HTTP_${status}`,
    requestId: reqId,
    ...(err.details ? { details: err.details } : {}),
    // Include retry hint for rate-limited and server errors
    ...(status === 429 ? { retryAfter: err.retryAfter || 60 } : {}),
    ...(status >= 500 ? { retryable: true } : {}),
  })
}
