import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import { rateLimit } from 'express-rate-limit'
import plotRoutes from './routes/plots.js'
import leadRoutes from './routes/leads.js'
import chatRoutes from './routes/chat.js'
import poiRoutes from './routes/pois.js'
import marketRoutes from './routes/market.js'
import adminPlotRoutes from './routes/admin/plots.js'
import adminLeadRoutes from './routes/admin/leads.js'
import adminDashboardRoutes from './routes/admin/dashboard.js'
import adminDocumentRoutes from './routes/admin/documents.js'
import adminImageRoutes from './routes/admin/images.js'
import adminPoiRoutes from './routes/admin/pois.js'
import adminActivityRoutes from './routes/admin/activity.js'
import adminSettingsRoutes from './routes/admin/settings.js'
import sitemapRoutes from './routes/sitemap.js'
import { errorHandler, requestId } from './middleware/errorHandler.js'
import { supabaseAdmin } from './config/supabase.js'

const app = express()
const PORT = process.env.PORT || 3001

// Security
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}))

// CORS — support multiple origins
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))

// Request tracing
app.use(requestId)

// Compression
app.use(compression())

// Request logging
app.use(morgan('short'))

// Response time header for monitoring
app.use((req, res, next) => {
  const start = process.hrtime.bigint()
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6
    res.set('X-Response-Time', `${ms.toFixed(1)}ms`)
  })
  next()
})

// Body parsing
app.use(express.json({ limit: '10mb' }))

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api', globalLimiter)

// ─── SEO routes (before API) ───
app.use(sitemapRoutes)

// ─── Public routes ───
app.use('/api/plots', plotRoutes)
app.use('/api/leads', leadRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/pois', poiRoutes)
app.use('/api/market', marketRoutes)

// ─── Admin routes ───
app.use('/api/admin/plots', adminPlotRoutes)
app.use('/api/admin/leads', adminLeadRoutes)
app.use('/api/admin/dashboard', adminDashboardRoutes)
app.use('/api/admin/documents', adminDocumentRoutes)
app.use('/api/admin/images', adminImageRoutes)
app.use('/api/admin/pois', adminPoiRoutes)
app.use('/api/admin/activity', adminActivityRoutes)
app.use('/api/admin/settings', adminSettingsRoutes)

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

// Error handler
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`)
})
