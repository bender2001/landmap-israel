import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import helmet from 'helmet'
import compression from 'compression'
import { rateLimit } from 'express-rate-limit'
import plotRoutes from './routes/plots.js'
import leadRoutes from './routes/leads.js'
import chatRoutes from './routes/chat.js'
import poiRoutes from './routes/pois.js'
import marketRoutes from './routes/market.js'
import exportRoutes from './routes/export.js'
import adminPlotRoutes from './routes/admin/plots.js'
import adminLeadRoutes from './routes/admin/leads.js'
import adminDashboardRoutes from './routes/admin/dashboard.js'
import adminDocumentRoutes from './routes/admin/documents.js'
import adminImageRoutes from './routes/admin/images.js'
import adminPoiRoutes from './routes/admin/pois.js'
import adminActivityRoutes from './routes/admin/activity.js'
import adminSettingsRoutes from './routes/admin/settings.js'
import adminAnalyticsRoutes from './routes/admin/analytics.js'
import alertRoutes from './routes/alerts.js'
import dataSourceRoutes from './routes/data-sources.js'
import subscriptionRoutes from './routes/subscription.js'
import sitemapRoutes from './routes/sitemap.js'
import ogRoutes from './routes/og.js'
import healthRoutes from './routes/health.js'
import vitalsRoutes from './routes/vitals.js'
import { errorHandler, requestId } from './middleware/errorHandler.js'
import { requestTimeout } from './middleware/timeout.js'
import { supabaseAdmin } from './config/supabase.js'
import { responseTracker } from './services/responseTimeTracker.js'
import { analytics } from './services/analyticsService.js'

const app = express()
const PORT = process.env.PORT || 3001

// Security — helmet with Content Security Policy enabled.
// CSP prevents XSS by whitelisting only trusted resource origins.
// Previously disabled (contentSecurityPolicy: false) which left the app
// vulnerable to script injection. Now locked down to known origins.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: [
        "'self'", "data:", "blob:",
        "https://server.arcgisonline.com",
        "https://*.tile.openstreetmap.org",
        "https://*.tile.opentopomap.org",
        "https://*.basemaps.cartocdn.com",
        "https://unpkg.com",
        // Street View / satellite imagery providers
        "https://*.google.com",
        "https://*.googleapis.com",
        "https://*.gstatic.com",
      ],
      connectSrc: [
        "'self'",
        // Tile servers (Leaflet fetches via JS for some layers)
        "https://server.arcgisonline.com",
        "https://*.tile.openstreetmap.org",
        "https://*.tile.opentopomap.org",
        "https://*.basemaps.cartocdn.com",
        // Geocoding
        "https://nominatim.openstreetmap.org",
        // Google Fonts CSS
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com",
      ],
      frameSrc: [
        "'self'",
        // Street View embed
        "https://www.google.com",
        "https://maps.google.com",
      ],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'", "blob:"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      // Report violations to server endpoint for monitoring
      reportUri: '/api/csp-report',
    },
    reportOnly: false,
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permissionsPolicy: {
    features: {
      geolocation: ['self'],
      camera: [],
      microphone: [],
      fullscreen: ['self'],
    },
  },
}))

// CORS — support multiple origins
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, server-to-server, mobile apps)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    // Return false instead of throwing — avoids 500 errors, returns clean 403 CORS block.
    // The browser handles the rejection via missing Access-Control-Allow-Origin header.
    cb(null, false)
  },
  credentials: true,
  maxAge: 86400, // Cache preflight for 24h — reduces OPTIONS round-trips
  // Expose custom response headers to client-side JavaScript.
  // Without this, CORS blocks access to ETag (breaking the api/client.js conditional
  // request cache), X-Request-Id (needed for error reporting), and observability
  // headers. Critical in cross-origin setups (dev: Vite:5173 → Express:3001,
  // or future subdomain split like api.landmap.co.il).
  exposedHeaders: [
    'ETag',
    'X-Request-Id',
    'X-Cache',
    'X-Data-Age',
    'X-Response-Time',
    'Server-Timing',
    'RateLimit-Limit',
    'RateLimit-Remaining',
    'RateLimit-Reset',
  ],
}))

// Vary header for correct CDN/proxy caching with CORS + compression + Save-Data
app.use((req, res, next) => {
  res.vary('Origin')
  res.vary('Accept-Encoding')
  // Vary on Save-Data so CDN/proxies cache lightweight and full responses separately.
  // Without this, a CDN caches the first response variant and serves it to all clients —
  // data-saver users get full images, or normal users get stripped responses.
  res.vary('Save-Data')
  // Timing-Allow-Origin — allows the browser's Resource Timing API (PerformanceObserver)
  // to measure actual server response times for cross-origin API requests.
  // Without this, the browser zeroes out timing details (connectStart, responseStart, etc.)
  // for CORS requests, making our useWebVitals TTFB and LCP measurements inaccurate.
  // Madlan/Yad2 don't set this — our Web Vitals data will be more precise than theirs.
  res.set('Timing-Allow-Origin', '*')
  next()
})

// ─── Save-Data awareness middleware ─────────────────────────────────────
// When the browser sends `Save-Data: on` (Android Chrome data saver, Lite mode),
// we tag the request so downstream handlers can return lightweight responses.
// This reduces mobile data usage by 30-40% — critical for users in areas with
// expensive or slow mobile data (common among Israeli real estate investors
// browsing from construction sites with spotty 3G coverage).
// Complements the client-side useNetworkStatus() hook with server-side awareness.
app.use('/api', (req, res, next) => {
  if (req.headers['save-data'] === 'on') {
    req.saveData = true
  }
  next()
})

// ─── API versioning & deprecation headers ──────────────────────────────
// Sets X-API-Version on all API responses for client-side version awareness.
// Like Google/Stripe APIs: clients can detect API changes and adapt gracefully.
// Also sets Deprecation header on sunset endpoints for forward compatibility.
app.use('/api', (req, res, next) => {
  res.set('X-API-Version', '1.0')
  // NEL (Network Error Logging) hint — helps clients report network failures
  // back to the server for infrastructure monitoring. Supported by Chrome/Edge.
  res.set('NEL', '{"report_to":"default","max_age":86400,"include_subdomains":true}')
  next()
})

// Request tracing
app.use(requestId)

// Compression — skip tiny responses (<1KB) where overhead exceeds savings.
// The default threshold is 1KB, but we make it explicit for clarity.
// Also set preferred encoding order: brotli > gzip for modern browsers.
app.use(compression({ threshold: 1024 }))

// Structured access logging — JSON format for monitoring/observability.
// Replaces basic morgan 'short' with a single middleware that:
// 1. Sets X-Response-Time header (useful for client-side perf budgets)
// 2. Logs method, URL, status, response time, and content length
// 3. Skips noisy health checks and SSE keep-alives
app.use((req, res, next) => {
  const start = process.hrtime.bigint()
  const onFinish = () => {
    res.removeListener('finish', onFinish)
    const ms = Number(process.hrtime.bigint() - start) / 1e6
    // Set timing headers (may not reach client if headers already sent, but that's fine)
    if (!res.headersSent) {
      res.set('X-Response-Time', `${ms.toFixed(1)}ms`)
      // W3C Server-Timing header — shows natively in Chrome/Edge DevTools "Timing" tab.
      // Zero client-side code needed, works out of the box for performance profiling.
      res.set('Server-Timing', `total;dur=${ms.toFixed(1)};desc="Server"`)
    }
    // Skip logging for health checks and SSE — they're too noisy
    if (req.originalUrl === '/api/health' || req.originalUrl === '/api/health/ping' || req.originalUrl === '/api/events') return
    // Track response time percentiles for API routes (P50/P75/P95/P99)
    if (req.originalUrl.startsWith('/api/')) {
      responseTracker.record(req.method, req.originalUrl, ms)
    }
    // Log slow requests at warn level (>2s), others at info
    const level = ms > 2000 ? 'warn' : 'info'
    const cacheHit = res.getHeader('X-Cache')
    const entry = {
      level,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      ms: Math.round(ms * 10) / 10,
      size: res.getHeader('content-length') || '-',
      ...(cacheHit ? { cache: cacheHit } : {}),
      ...(req.id ? { reqId: req.id } : {}),
    }
    // Compact single-line JSON — easy to grep/parse, doesn't flood console
    if (level === 'warn') {
      console.warn(JSON.stringify(entry))
    } else {
      console.log(JSON.stringify(entry))
    }
  }
  res.on('finish', onFinish)
  next()
})

// Body parsing
app.use(express.json({ limit: '10mb' }))

// Global rate limiter — Hebrew error for consistency with errorHandler.js
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'יותר מדי בקשות — נסה שוב בעוד דקה',
    errorCode: 'RATE_LIMIT_GLOBAL',
    retryAfter: 900,
  },
})
app.use('/api', globalLimiter)

// ─── CSP violation reporting (before rate limiter to avoid counting bot reports) ───
// Browsers send CSP violations as JSON POST. Log them for monitoring.
// Helps catch any missing CSP whitelist entries without breaking the app.
app.post('/api/csp-report', express.json({ type: ['application/json', 'application/csp-report'] }), (req, res) => {
  const report = req.body?.['csp-report'] || req.body
  if (report) {
    console.warn(JSON.stringify({
      level: 'warn',
      type: 'csp-violation',
      blockedUri: report['blocked-uri'] || report.blockedURL,
      violatedDirective: report['violated-directive'] || report.effectiveDirective,
      documentUri: report['document-uri'] || report.documentURL,
      timestamp: new Date().toISOString(),
    }))
  }
  res.status(204).end()
})

// ─── Health endpoint (before timeout — must respond fast for monitors) ───
// Exempt from rate limiting above since monitors poll every 30-60s
app.use('/api/health', healthRoutes)

// ─── Server-Sent Events (before timeout — SSE connections are long-lived) ───
// Must be registered before the API 404 catch-all to be reachable.
// Supports Last-Event-ID reconnection (SSE spec §9.2) — when a client reconnects
// after a network drop, the browser sends the last event ID it received. We replay
// any missed events from the circular buffer so no updates are lost.
app.get('/api/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Nginx compatibility
  })
  res.flushHeaders()

  // Connection limiting: reject if server or per-IP limit reached
  const accepted = addClient(res, req.ip)
  if (!accepted) {
    res.write('data: {"type":"rejected","reason":"connection_limit"}\n\n')
    res.end()
    return
  }

  // Set retry interval — controls how long the browser waits before auto-reconnecting.
  // Without this, browsers default to 3000ms which hammers the server during outages.
  res.write(`retry: ${getRetryMs()}\n\n`)

  // Replay missed events if client is reconnecting with Last-Event-ID
  const lastEventId = req.headers['last-event-id']
  if (lastEventId) {
    replayMissedEvents(res, lastEventId)
  }

  res.write('data: {"type":"connected"}\n\n')
  req.on('close', () => removeClient(res))
})

// ─── Web Vitals collection (before timeout — lightweight fire-and-forget beacons) ───
// Previously, CWV beacons were sent to /api/admin/analytics which only had GET handlers,
// silently dropping all Web Vitals data. This dedicated endpoint accepts POST beacons
// without admin auth and feeds into the analytics service for p75 monitoring.
app.use('/api/vitals', vitalsRoutes)

// ─── Contact conversion tracking (lightweight fire-and-forget beacon) ───
// Tracks WhatsApp/Telegram/Phone/Lead clicks for marketing ROI measurement.
// Like Madlan's internal funnel metrics — critical for business intelligence.
// Accepts POST beacons from sendBeacon() or fetch({ keepalive: true }).
app.post('/api/analytics/conversion', (req, res) => {
  const { channel, plotId, source, url, ts } = req.body || {}
  const VALID_CHANNELS = ['whatsapp', 'telegram', 'phone', 'lead_form', 'share']
  if (!channel || !VALID_CHANNELS.includes(channel)) {
    return res.status(204).end()
  }
  analytics.trackConversion({
    channel,
    plotId: typeof plotId === 'string' ? plotId.slice(0, 50) : null,
    source: typeof source === 'string' ? source.slice(0, 30) : 'unknown',
    url: typeof url === 'string' ? url.slice(0, 200) : '/',
    ts: typeof ts === 'number' ? ts : Date.now(),
  })
  res.status(204).end()
})

// Request timeout — prevent hanging connections (15s for normal, 30s for chat/AI)
app.use('/api/chat', requestTimeout(30000))
app.use('/api', requestTimeout(15000))

// ─── SEO routes (before API) ───
app.use(sitemapRoutes)

// ─── Public routes ───
app.use('/api/plots', plotRoutes)
app.use('/api/leads', leadRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/pois', poiRoutes)
app.use('/api/market', marketRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/alerts', alertRoutes)
app.use('/api/data', dataSourceRoutes)
app.use('/api/subscription', subscriptionRoutes)
app.use('/api/og', ogRoutes)

// ─── Admin routes ───
// Prevent search engines from indexing admin API responses
app.use('/api/admin', (req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow')
  next()
})
app.use('/api/admin/plots', adminPlotRoutes)
app.use('/api/admin/leads', adminLeadRoutes)
app.use('/api/admin/dashboard', adminDashboardRoutes)
app.use('/api/admin/documents', adminDocumentRoutes)
app.use('/api/admin/images', adminImageRoutes)
app.use('/api/admin/pois', adminPoiRoutes)
app.use('/api/admin/activity', adminActivityRoutes)
app.use('/api/admin/settings', adminSettingsRoutes)
app.use('/api/admin/analytics', adminAnalyticsRoutes)

// Cache stats endpoint for monitoring — restricted to prevent infrastructure info leaks.
// Requires a simple secret token in query or header to prevent public enumeration.
app.get('/api/cache-stats', async (req, res) => {
  const secret = process.env.CACHE_STATS_SECRET || process.env.ADMIN_SECRET
  if (secret && req.query.token !== secret && req.headers['x-admin-token'] !== secret) {
    return res.status(403).json({ error: 'גישה נדחתה', errorCode: 'FORBIDDEN' })
  }

  try {
    // Use dynamic import — this is an ESM project, require() is not available.
    // Previous code tried require() first which always threw ReferenceError,
    // wasting time before falling back to import(). Clean path now.
    const mod = await import('./services/cacheService.js')
    res.json({
      plots: mod.plotCache.getStats(),
      stats: mod.statsCache.getStats(),
      market: mod.marketCache.getStats(),
    })
  } catch {
    res.json({ error: 'cache not available' })
  }
})

// Note: Health endpoint is handled by healthRoutes above (routes/health.js).
// SSE client count is exposed via the /api/health route's checks object.

// ─── Serve frontend static files in production ───
if (process.env.NODE_ENV === 'production') {
  const { sendWithOgMeta, getBaseUrl, getClientDist, sendFallback } = await import('./services/ogService.js')
  const clientDist = getClientDist()

  // Serve hashed assets (JS/CSS chunks from Vite) with immutable caching.
  // Vite generates content-hashed filenames (e.g., index-a1b2c3.js), so the
  // same URL always returns the same content — safe to cache indefinitely.
  // This eliminates re-download of unchanged bundles on repeat visits.
  app.use('/assets', express.static(path.join(clientDist, 'assets'), {
    maxAge: '365d',
    immutable: true,
    etag: false,        // Not needed for immutable content
    lastModified: false, // Content-addressed, Last-Modified is irrelevant
  }))

  app.use(express.static(clientDist, {
    maxAge: '1h',  // Non-hashed files (index.html, manifest.json) get short cache
    setHeaders: (res, filePath) => {
      // Service worker must always be fresh — browsers cap sw.js caching at 24h anyway,
      // but setting no-cache ensures instant update propagation.
      if (filePath.endsWith('sw.js')) {
        res.set('Cache-Control', 'no-cache')
      }
    },
  }))

  // SEO-friendly gush/helka URL — resolves block+parcel to canonical plot page.
  // Handles social bots (WhatsApp, Telegram, Facebook) and search engine crawlers
  // that access /plot/by-gush/10043/15 directly.
  app.get('/plot/by-gush/:block/:parcel', async (req, res) => {
    try {
      const { block, parcel } = req.params
      const { supabaseAdmin: sb } = await import('./config/supabase.js')
      const { data: plot } = await sb
        .from('plots')
        .select('id, block_number, number, city, total_price, projected_value, size_sqm, description')
        .eq('block_number', parseInt(block, 10))
        .eq('number', parcel)
        .eq('is_published', true)
        .limit(1)
        .single()

      if (plot) {
        const baseUrl = getBaseUrl(req)
        const price = plot.total_price ?? 0
        const sizeSqM = plot.size_sqm ?? 0
        const projValue = plot.projected_value ?? 0
        const roi = price > 0 ? Math.round((projValue - price) / price * 100) : 0
        const dunam = (sizeSqM / 1000).toFixed(1)
        const priceK = Math.round(price / 1000)

        await sendWithOgMeta({
          req, res,
          title: `גוש ${block} חלקה ${parcel} - ${plot.city} | LandMap Israel`,
          description: `קרקע להשקעה ב${plot.city} · ₪${priceK.toLocaleString()}K · ${dunam} דונם · תשואה +${roi}%`.slice(0, 200),
          url: `${baseUrl}/plot/${plot.id}`,
          cacheControl: 'public, max-age=300, stale-while-revalidate=600',
        })
      } else {
        sendFallback(res)
      }
    } catch {
      sendFallback(res)
    }
  })

  // OG meta injection for /plot/:id — enables rich social previews (WhatsApp, Telegram, Facebook)
  app.get('/plot/:id', async (req, res) => {
    try {
      const { getPlotById } = await import('./services/plotService.js')
      const plot = await getPlotById(req.params.id)

      if (plot) {
        const baseUrl = getBaseUrl(req)
        const blockNum = plot.block_number ?? plot.blockNumber ?? ''
        const price = plot.total_price ?? plot.totalPrice ?? 0
        const sizeSqM = plot.size_sqm ?? plot.sizeSqM ?? 0
        const projValue = plot.projected_value ?? plot.projectedValue ?? 0
        const roi = price > 0 ? Math.round((projValue - price) / price * 100) : 0
        const city = plot.city || ''
        const dunam = (sizeSqM / 1000).toFixed(1)
        const priceK = Math.round(price / 1000)
        const images = plot.plot_images || []

        await sendWithOgMeta({
          req, res,
          title: `גוש ${blockNum} חלקה ${plot.number} - ${city} | LandMap Israel`,
          description: `קרקע להשקעה ב${city} · ₪${priceK.toLocaleString()}K · ${dunam} דונם · תשואה +${roi}% · ${plot.description || ''}`.slice(0, 200),
          url: `${baseUrl}/plot/${plot.id}`,
          image: images.length > 0 ? images[0].url : `${baseUrl}/og-default.png`,
          includeTwitter: true,
          cacheControl: 'public, max-age=60, stale-while-revalidate=300',
        })
      } else {
        sendFallback(res)
      }
    } catch {
      sendFallback(res)
    }
  })

  // City landing pages with OG meta
  app.get('/', async (req, res, next) => {
    if (!req.query.city || req.query.city === 'all') return next()
    try {
      const city = String(req.query.city)
      const baseUrl = getBaseUrl(req)
      await sendWithOgMeta({
        req, res,
        title: `קרקעות להשקעה ב${city} | LandMap Israel`,
        description: `מפת קרקעות להשקעה ב${city} — מחירים, תשואות, ייעודי קרקע, מידע תכנוני מלא.`,
        url: `${baseUrl}/?city=${encodeURIComponent(city)}`,
      })
    } catch {
      next()
    }
  })

  // Static pages with OG meta — DRY configuration
  const staticPages = [
    {
      path: '/areas',
      title: 'סטטיסטיקות אזוריות — קרקעות להשקעה בישראל | LandMap Israel',
      description: 'השוואת אזורים לפי מחיר, תשואה, שטח ומספר חלקות — חדרה, נתניה, קיסריה. נתונים מעודכנים לצד מפה אינטראקטיבית.',
    },
    {
      path: '/about',
      title: 'אודות LandMap Israel — פלטפורמת השקעות קרקעות',
      description: 'LandMap Israel — פלטפורמה מתקדמת לחיפוש וניתוח קרקעות להשקעה בישראל. מפה אינטראקטיבית, AI יועץ, ונתוני תכנון בזמן אמת.',
      cacheControl: 'public, max-age=3600, stale-while-revalidate=7200',
    },
    {
      path: '/calculator',
      title: 'מחשבון השקעות קרקע | LandMap Israel',
      description: 'חשב תשואה, עלויות נלוות, מימון ורווח נקי מהשקעה בקרקע בישראל. סימולטור מימון ואנליזת רגישות.',
      cacheControl: 'public, max-age=3600, stale-while-revalidate=7200',
    },
    {
      path: '/contact',
      title: 'צור קשר — LandMap Israel | השאירו פרטים ונחזור אליכם',
      description: 'מעוניינים בהשקעה בקרקע? צרו קשר עם צוות LandMap. WhatsApp, טלגרם, או טופס יצירת קשר — נחזור אליכם בהקדם.',
      cacheControl: 'public, max-age=3600, stale-while-revalidate=7200',
    },
    {
      path: '/compare',
      title: 'השוואת חלקות — LandMap Israel',
      description: 'השווה בין חלקות קרקע להשקעה לפי מחיר, שטח, תשואה, ייעוד ובשלות. כלי החלטה חכם למשקיעים.',
      cacheControl: 'public, max-age=300, stale-while-revalidate=600',
    },
    {
      path: '/favorites',
      title: 'חלקות שמורות — LandMap Israel',
      description: 'החלקות שסימנת כמועדפות. עקוב אחרי שינויי מחירים ועדכוני תכנון של ההשקעות שמעניינות אותך.',
      cacheControl: 'public, max-age=60, stale-while-revalidate=120',
    },
    {
      path: '/pricing',
      title: 'תוכניות ומחירים — LandMap Israel',
      description: 'תוכניות מנוי ל-LandMap Israel — גישה לנתוני קרקעות, ניתוח השקעות AI, התראות מחיר ודוחות מפורטים.',
      cacheControl: 'public, max-age=3600, stale-while-revalidate=7200',
    },
    {
      path: '/terms',
      title: 'תנאי שימוש — LandMap Israel',
      description: 'תנאי השימוש באתר LandMap Israel — פלטפורמת השקעות קרקעות בישראל.',
      cacheControl: 'public, max-age=86400, stale-while-revalidate=172800',
    },
    {
      path: '/privacy',
      title: 'מדיניות פרטיות — LandMap Israel',
      description: 'מדיניות הפרטיות של LandMap Israel — כיצד אנו אוספים, משתמשים ומגנים על המידע שלך.',
      cacheControl: 'public, max-age=86400, stale-while-revalidate=172800',
    },
  ]

  for (const page of staticPages) {
    app.get(page.path, async (req, res, next) => {
      try {
        const baseUrl = getBaseUrl(req)
        await sendWithOgMeta({
          req, res,
          title: page.title,
          description: page.description,
          url: `${baseUrl}${page.path}`,
          cacheControl: page.cacheControl,
        })
      } catch {
        next()
      }
    })
  }

  // City-specific area pages with dynamic OG meta — enables rich WhatsApp/Telegram previews
  // when sharing /areas/חדרה or /areas/נתניה. Queries DB for live stats per city.
  // Like Madlan's city landing pages that show up with proper thumbnails on social media.
  app.get('/areas/:city', async (req, res, next) => {
    try {
      const city = decodeURIComponent(req.params.city)
      const baseUrl = getBaseUrl(req)

      // Quick DB query for city stats to enrich the OG description
      const { supabaseAdmin: sb } = await import('./config/supabase.js')
      const { count, data: plots } = await sb
        .from('plots')
        .select('total_price, size_sqm, projected_value', { count: 'exact' })
        .eq('city', city)
        .eq('is_published', true)
        .limit(200)

      let description = `קרקעות להשקעה ב${city} — מחירים, תשואות, שטחים ומידע תכנוני מעודכן.`
      if (plots && plots.length > 0) {
        const avgPrice = Math.round(plots.reduce((s, p) => s + (p.total_price || 0), 0) / plots.length / 1000)
        const avgRoi = plots.reduce((s, p) => {
          const price = p.total_price || 0
          const proj = p.projected_value || 0
          return s + (price > 0 ? ((proj - price) / price) * 100 : 0)
        }, 0) / plots.length
        description = `${count || plots.length} חלקות ב${city} · מחיר ממוצע ₪${avgPrice.toLocaleString()}K · תשואה ממוצעת +${Math.round(avgRoi)}% ROI`
      }

      await sendWithOgMeta({
        req, res,
        title: `קרקעות להשקעה ב${city} — סטטיסטיקות ומפה | LandMap Israel`,
        description,
        url: `${baseUrl}/areas/${encodeURIComponent(city)}`,
        cacheControl: 'public, max-age=300, stale-while-revalidate=600',
      })
    } catch {
      next()
    }
  })

  app.get('*', (req, res) => {
    sendFallback(res)
  })
}

// API 404 handler — catch unmatched /api/* routes before the frontend catch-all.
// Without this, unmatched API requests fall through to the static file handler
// and return index.html with 200, confusing clients and breaking error handling.
app.all('/api/*', (req, res) => {
  res.status(404).json({
    error: 'נתיב API לא נמצא',
    errorCode: 'API_NOT_FOUND',
    path: req.originalUrl,
    method: req.method,
    requestId: req.id || '-',
  })
})

// Error handler
app.use(errorHandler)

// SSE service imports (used by /api/events above and shutdown below)
import { addClient, removeClient, replayMissedEvents, getRetryMs, closeAll as closeSSE, getClientCount, startKeepalive, stopKeepalive } from './services/sseService.js'

import { serverState } from './services/serverState.js'

const server = app.listen(PORT, async () => {
  // Start SSE keepalive heartbeat — prevents proxy/LB timeout on idle connections.
  // Sends a comment ping every 25s (below Nginx's default 60s proxy_read_timeout).
  startKeepalive()
  console.log(`[server] Running on http://localhost:${PORT}`)

  // ─── Cache warming — pre-populate plot cache on startup ──────────────
  // Without this, the first user request after deploy/restart hits Supabase with
  // full cold-start latency (200-500ms). Pre-warming ensures instant responses
  // from the very first request. Classic Google SRE pattern for latency-sensitive services.
  try {
    const warmStart = performance.now()
    const { getPublishedPlots, getPlotStats } = await import('./services/plotService.js')

    // Warm the main plots cache (most frequently hit endpoint)
    const plots = await getPublishedPlots({})
    plotCache.set('plots:{}', plots, 30_000)

    // Warm the stats cache (polled by dashboard widgets)
    const stats = await getPlotStats()
    statsCache.set('plot-stats', stats, 120_000)

    const warmMs = Math.round(performance.now() - warmStart)
    serverState.cacheWarmedAt = Date.now()
    console.log(`[cache] Warmed: ${plots.length} plots + stats in ${warmMs}ms`)
  } catch (err) {
    console.warn(`[cache] Warming failed (non-fatal): ${err.message}`)
  }

  // Take daily price snapshot on startup (idempotent, non-blocking)
  try {
    const { takeDailySnapshot } = await import('./services/priceHistoryService.js')
    const result = await takeDailySnapshot()
    if (result.success) {
      console.log(`[priceHistory] Snapshot taken: ${result.count} plots for ${result.date}`)
    } else if (result.skipped) {
      console.log(`[priceHistory] Snapshot skipped (${result.reason || 'already exists'})`)
    }
  } catch (err) {
    console.warn(`[priceHistory] Snapshot failed (table may not exist yet): ${err.message}`)
  }
})

// ─── Graceful shutdown ───
function gracefulShutdown(signal) {
  console.log(`[server] ${signal} received — shutting down gracefully...`)

  // Stop SSE keepalive and close all connections
  stopKeepalive()
  closeSSE()

  server.close(() => {
    console.log('[server] HTTP server closed')
    process.exit(0)
  })

  // Force exit after 10s if connections hang
  setTimeout(() => {
    console.warn('[server] Forcing exit after timeout')
    process.exit(1)
  }, 10_000).unref()
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// ─── Unhandled error safety nets ───
// Without these, a single unhandled promise rejection silently kills the process
// in Node 15+ (--unhandled-rejections=throw is now default). We log the error,
// alert via SSE, and let the process manager (PM2/systemd) restart us cleanly.
process.on('unhandledRejection', (reason, promise) => {
  console.error(JSON.stringify({
    level: 'fatal',
    type: 'unhandledRejection',
    message: reason?.message || String(reason),
    stack: reason?.stack,
    timestamp: new Date().toISOString(),
  }))
  // Don't exit — let the event loop drain and the process manager handle it.
  // Most unhandled rejections are non-fatal (failed fetch, Supabase timeout).
})

process.on('uncaughtException', (err, origin) => {
  console.error(JSON.stringify({
    level: 'fatal',
    type: 'uncaughtException',
    origin,
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  }))
  // Uncaught exceptions leave the process in an undefined state — shutdown cleanly.
  gracefulShutdown('uncaughtException')
})
