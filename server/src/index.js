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
import sitemapRoutes from './routes/sitemap.js'
import ogRoutes from './routes/og.js'
import { errorHandler, requestId } from './middleware/errorHandler.js'
import { requestTimeout } from './middleware/timeout.js'
import { supabaseAdmin } from './config/supabase.js'

const app = express()
const PORT = process.env.PORT || 3001

// Security
app.use(helmet({
  contentSecurityPolicy: false,
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
}))

// Vary header for correct CDN/proxy caching with CORS + compression
app.use((req, res, next) => {
  res.vary('Origin')
  res.vary('Accept-Encoding')
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
    // Set timing header (may not reach client if headers already sent, but that's fine)
    if (!res.headersSent) {
      res.set('X-Response-Time', `${ms.toFixed(1)}ms`)
    }
    // Skip logging for health checks and SSE — they're too noisy
    if (req.originalUrl === '/api/health' || req.originalUrl === '/api/events') return
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
app.use('/api/og', ogRoutes)

// ─── Admin routes ───
app.use('/api/admin/plots', adminPlotRoutes)
app.use('/api/admin/leads', adminLeadRoutes)
app.use('/api/admin/dashboard', adminDashboardRoutes)
app.use('/api/admin/documents', adminDocumentRoutes)
app.use('/api/admin/images', adminImageRoutes)
app.use('/api/admin/pois', adminPoiRoutes)
app.use('/api/admin/activity', adminActivityRoutes)
app.use('/api/admin/settings', adminSettingsRoutes)
app.use('/api/admin/analytics', adminAnalyticsRoutes)

// Cache stats endpoint for monitoring
app.get('/api/cache-stats', (req, res) => {
  try {
    const { plotCache, statsCache, marketCache } = require('./services/cacheService.js')
    res.json({
      plots: plotCache.getStats(),
      stats: statsCache.getStats(),
      market: marketCache.getStats(),
    })
  } catch {
    // Dynamic import for ESM
    import('./services/cacheService.js').then(mod => {
      res.json({
        plots: mod.plotCache.getStats(),
        stats: mod.statsCache.getStats(),
        market: mod.marketCache.getStats(),
      })
    }).catch(() => res.json({ error: 'cache not available' }))
  }
})

// Health check with DB connectivity, uptime, and memory stats
app.get('/api/health', async (req, res) => {
  const mem = process.memoryUsage()
  const base = {
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    memory: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
    },
    version: process.env.npm_package_version || '2.0.0',
    sseClients: getClientCount(),
  }
  try {
    const start = Date.now()
    const { error } = await supabaseAdmin.from('plots').select('id').limit(1)
    const dbLatency = Date.now() - start
    res.json({
      ...base,
      status: error ? 'degraded' : 'ok',
      db: error ? 'error' : 'connected',
      dbLatencyMs: dbLatency,
    })
  } catch (e) {
    res.status(503).json({
      ...base,
      status: 'degraded',
      db: 'unreachable',
    })
  }
})

// ─── Serve frontend static files in production ───
if (process.env.NODE_ENV === 'production') {
  const { sendWithOgMeta, getBaseUrl, getClientDist, sendFallback } = await import('./services/ogService.js')
  const clientDist = getClientDist()
  app.use(express.static(clientDist))

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

// ─── Server-Sent Events for real-time plot updates ───
import { addClient, removeClient, closeAll as closeSSE, getClientCount } from './services/sseService.js'

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

  res.write('data: {"type":"connected"}\n\n')
  req.on('close', () => removeClient(res))
})

const server = app.listen(PORT, async () => {
  console.log(`[server] Running on http://localhost:${PORT}`)

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

  // Close SSE connections
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
