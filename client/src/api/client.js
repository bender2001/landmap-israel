const BASE = '/api'

const RETRY_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504])
const MAX_RETRIES = 3
const BASE_DELAY_MS = 500

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function request(path, options = {}) {
  const token = localStorage.getItem('auth_token')
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers.Authorization = `Bearer ${token}`

  let lastError
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, { ...options, headers })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const error = new Error(body.error || `Request failed (${res.status})`)
        error.status = res.status
        error.details = body.details

        // Retry on transient server errors (GET only)
        if (RETRY_STATUS_CODES.has(res.status) && (!options.method || options.method === 'GET') && attempt < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200
          await sleep(delay)
          lastError = error
          continue
        }
        throw error
      }

      if (res.headers.get('content-type')?.includes('text/csv')) {
        return res.text()
      }

      return res.json()
    } catch (err) {
      // Network errors — retry on GET
      if (err instanceof TypeError && (!options.method || options.method === 'GET') && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200
        await sleep(delay)
        lastError = err
        continue
      }
      throw err
    }
  }
  throw lastError
}

export const api = {
  get: (path) => request(path),
  post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: (path, data) => request(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (path) => request(path, { method: 'DELETE' }),
  upload: async (path, formData) => {
    const token = localStorage.getItem('auth_token')
    const headers = {}
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: formData })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || 'Upload failed')
    }
    return res.json()
  },
}
