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
  const clientDist = path.resolve(__dirname, '../../client/dist')
  app.use(express.static(clientDist))

  // OG meta injection for /plot/:id — enables rich social previews (WhatsApp, Telegram, Facebook)
  // Crawlers don't run JavaScript, so we inject OG tags server-side into index.html
  app.get('/plot/:id', async (req, res) => {
    try {
      const indexPath = path.join(clientDist, 'index.html')
      const { readFile } = await import('fs/promises')
      let html = await readFile(indexPath, 'utf-8')

      const { getPlotById } = await import('./services/plotService.js')
      const plot = await getPlotById(req.params.id)

      if (plot) {
        const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`
        const blockNum = plot.block_number ?? plot.blockNumber ?? ''
        const price = plot.total_price ?? plot.totalPrice ?? 0
        const sizeSqM = plot.size_sqm ?? plot.sizeSqM ?? 0
        const projValue = plot.projected_value ?? plot.projectedValue ?? 0
        const roi = price > 0 ? Math.round((projValue - price) / price * 100) : 0
        const city = plot.city || ''
        const dunam = (sizeSqM / 1000).toFixed(1)
        const priceK = Math.round(price / 1000)

        const title = `גוש ${blockNum} חלקה ${plot.number} - ${city} | LandMap Israel`
        const description = `קרקע להשקעה ב${city} · ₪${priceK.toLocaleString()}K · ${dunam} דונם · תשואה +${roi}% · ${plot.description || ''}`
          .slice(0, 200)
        const url = `${baseUrl}/plot/${plot.id}`

        // Get first image if available
        const images = plot.plot_images || []
        const ogImage = images.length > 0 ? images[0].url : `${baseUrl}/og-default.png`

        const ogTags = `
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:locale" content="he_IL" />
    <meta property="og:site_name" content="LandMap Israel" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="description" content="${description.replace(/"/g, '&quot;')}" />
    <link rel="canonical" href="${url}" />
    <title>${title}</title>`

        // Replace existing <title> and inject OG before </head>
        html = html.replace(/<title>[^<]*<\/title>/, '')
        html = html.replace('</head>', `${ogTags}\n  </head>`)
      }

      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
      res.send(html)
    } catch {
      // Fallback: serve plain index.html
      res.sendFile(path.join(clientDist, 'index.html'))
    }
  })

  // City landing pages with OG meta
  app.get('/', async (req, res, next) => {
    if (!req.query.city || req.query.city === 'all') return next()
    try {
      const indexPath = path.join(clientDist, 'index.html')
      const { readFile } = await import('fs/promises')
      let html = await readFile(indexPath, 'utf-8')

      const city = String(req.query.city)
      const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`
      const title = `קרקעות להשקעה ב${city} | LandMap Israel`
      const description = `מפת קרקעות להשקעה ב${city} — מחירים, תשואות, ייעודי קרקע, מידע תכנוני מלא.`

      const ogTags = `
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${baseUrl}/?city=${encodeURIComponent(city)}" />
    <meta property="og:locale" content="he_IL" />
    <meta property="og:site_name" content="LandMap Israel" />
    <meta name="description" content="${description}" />
    <title>${title}</title>`

      html = html.replace(/<title>[^<]*<\/title>/, '')
      html = html.replace('</head>', `${ogTags}\n  </head>`)

      res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
      res.send(html)
    } catch {
      next()
    }
  })

  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

// Error handler
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`)
})
