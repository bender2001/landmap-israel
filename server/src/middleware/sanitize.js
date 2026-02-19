/**
 * Query parameter sanitization middleware.
 * Validates and cleans user-supplied filter params before they reach Supabase.
 * Prevents injection of unexpected values and enforces type constraints.
 */

const ALLOWED_CITIES = new Set(['all', 'חדרה', 'נתניה', 'קיסריה'])
const ALLOWED_STATUSES = new Set(['AVAILABLE', 'RESERVED', 'SOLD', 'IN_PROGRESS', 'PENDING'])
const ALLOWED_RIPENESS = new Set(['all', '1-3', '3-5', '5+'])
const ALLOWED_SORTS = new Set([
  'default',
  'price-asc', 'price-desc',
  'size-asc', 'size-desc',
  'roi-desc', 'roi-asc',
  'ppsqm-asc', 'ppsqm-desc',
  'score-desc',
  'cagr-desc',
  'updated-desc',
  'newest-first',
  'monthly-asc',
  'distance-asc',
  'deal-desc',
])
const MAX_SEARCH_LENGTH = 100

/**
 * Sanitize plot list query parameters.
 * Strips invalid values, coerces types, and caps limits.
 */
export function sanitizePlotQuery(req, res, next) {
  const q = req.query

  // City: must be in allowed list or treat as 'all'
  if (q.city && !ALLOWED_CITIES.has(q.city)) {
    q.city = 'all'
  }

  // Numeric fields: coerce to positive numbers or remove
  for (const key of ['priceMin', 'priceMax', 'sizeMin', 'sizeMax', 'limit', 'offset']) {
    if (q[key] !== undefined) {
      const num = Number(q[key])
      if (!isFinite(num) || num < 0) {
        delete q[key]
      } else {
        q[key] = String(num)
      }
    }
  }

  // Price sanity: min must be <= max
  if (q.priceMin && q.priceMax && Number(q.priceMin) > Number(q.priceMax)) {
    // Swap them
    ;[q.priceMin, q.priceMax] = [q.priceMax, q.priceMin]
  }

  // Size sanity: min must be <= max
  if (q.sizeMin && q.sizeMax && Number(q.sizeMin) > Number(q.sizeMax)) {
    ;[q.sizeMin, q.sizeMax] = [q.sizeMax, q.sizeMin]
  }

  // Status: validate each comma-separated value
  if (q.status) {
    const statuses = q.status.split(',').filter(s => ALLOWED_STATUSES.has(s.trim()))
    q.status = statuses.length > 0 ? statuses.join(',') : undefined
    if (!q.status) delete q.status
  }

  // Ripeness
  if (q.ripeness && !ALLOWED_RIPENESS.has(q.ripeness)) {
    delete q.ripeness
  }

  // Sort
  if (q.sort && !ALLOWED_SORTS.has(q.sort)) {
    delete q.sort
  }

  // Bounding box: validate format "south,west,north,east" (4 finite numbers)
  if (q.bbox) {
    const parts = q.bbox.split(',').map(Number)
    if (parts.length !== 4 || !parts.every(n => isFinite(n))) {
      delete q.bbox // Malformed → ignore (don't error, just return all plots)
    } else {
      // Validate geographic range: lat [-90,90], lng [-180,180]
      const [south, west, north, east] = parts
      if (south < -90 || south > 90 || north < -90 || north > 90 ||
          west < -180 || west > 180 || east < -180 || east > 180 ||
          south > north) {
        delete q.bbox
      }
    }
  }

  // Search: truncate and strip control characters
  if (q.q) {
    q.q = q.q
      .replace(/[\x00-\x1f\x7f]/g, '') // strip control chars
      .slice(0, MAX_SEARCH_LENGTH)
      .trim()
    if (!q.q) delete q.q
  }

  // Limit cap: prevent abuse
  if (q.limit) {
    const limit = parseInt(q.limit, 10)
    q.limit = String(Math.min(limit, 200))
  }

  next()
}

/**
 * Sanitize UUID-like path parameters.
 * Rejects requests with obviously invalid IDs early.
 */
export function sanitizePlotId(req, res, next) {
  const { id } = req.params
  if (!id) return res.status(400).json({ error: 'Missing plot ID' })

  // UUID v4 format check (Supabase default)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Invalid plot ID format' })
  }

  next()
}
