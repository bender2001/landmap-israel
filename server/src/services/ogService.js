/**
 * OG Meta Tag Injection Service
 * 
 * Centralizes server-side Open Graph meta injection for social sharing previews.
 * Used by all page routes that need rich link previews (WhatsApp, Telegram, Facebook, Twitter).
 */
import path from 'path'
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CLIENT_DIST = path.resolve(__dirname, '../../../client/dist')

// Cache index.html in memory after first read (it doesn't change at runtime)
let indexHtmlCache = null

async function getIndexHtml() {
  if (!indexHtmlCache) {
    indexHtmlCache = await readFile(path.join(CLIENT_DIST, 'index.html'), 'utf-8')
  }
  return indexHtmlCache
}

/**
 * Build OG meta tags string from a config object.
 * @param {Object} opts
 * @param {string} opts.title - Page title
 * @param {string} opts.description - Meta description
 * @param {string} opts.url - Canonical URL
 * @param {string} [opts.image] - OG image URL
 * @param {boolean} [opts.includeTwitter] - Include Twitter card tags (default: false)
 * @returns {string} HTML meta tags
 */
function buildOgTags({ title, description, url, image, includeTwitter = false }) {
  const esc = (s) => String(s || '').replace(/"/g, '&quot;')
  
  let tags = `
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:locale" content="he_IL" />
    <meta property="og:site_name" content="LandMap Israel" />
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${esc(url)}" />
    <title>${esc(title)}</title>`

  if (image) {
    tags += `\n    <meta property="og:image" content="${esc(image)}" />`
  }

  if (includeTwitter) {
    tags += `
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />`
    if (image) {
      tags += `\n    <meta name="twitter:image" content="${esc(image)}" />`
    }
  }

  return tags
}

/**
 * Inject OG meta tags into index.html and send the response.
 * @param {Object} opts
 * @param {import('express').Request} opts.req
 * @param {import('express').Response} opts.res
 * @param {string} opts.title
 * @param {string} opts.description
 * @param {string} opts.url
 * @param {string} [opts.image]
 * @param {boolean} [opts.includeTwitter]
 * @param {string} [opts.cacheControl] - Cache-Control header value
 */
export async function sendWithOgMeta({ req, res, title, description, url, image, includeTwitter = false, cacheControl = 'public, max-age=300, stale-while-revalidate=600' }) {
  let html = await getIndexHtml()
  
  const ogTags = buildOgTags({ title, description, url, image, includeTwitter })
  
  // Replace existing <title> and inject OG before </head>
  html = html.replace(/<title>[^<]*<\/title>/, '')
  html = html.replace('</head>', `${ogTags}\n  </head>`)
  
  res.set('Cache-Control', cacheControl)
  res.send(html)
}

/**
 * Get the base URL for the current request.
 */
export function getBaseUrl(req) {
  return process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`
}

/**
 * Get the path to client dist directory.
 */
export function getClientDist() {
  return CLIENT_DIST
}

/**
 * Send the fallback index.html (no OG injection).
 */
export function sendFallback(res) {
  res.sendFile(path.join(CLIENT_DIST, 'index.html'))
}

/**
 * Invalidate the cached index.html (e.g., after a rebuild).
 */
export function invalidateCache() {
  indexHtmlCache = null
}
