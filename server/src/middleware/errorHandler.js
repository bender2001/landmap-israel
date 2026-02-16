export function errorHandler(err, req, res, _next) {
  console.error('[error]', err.message, err.stack)

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const status = err.status || 500
  const message = status === 500 ? 'Internal server error' : err.message

  res.status(status).json({ error: message })
}
