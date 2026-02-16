import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import plotRoutes from './routes/plots.js'
import leadRoutes from './routes/leads.js'
import chatRoutes from './routes/chat.js'
import poiRoutes from './routes/pois.js'
import adminPlotRoutes from './routes/admin/plots.js'
import adminLeadRoutes from './routes/admin/leads.js'
import adminDashboardRoutes from './routes/admin/dashboard.js'
import adminDocumentRoutes from './routes/admin/documents.js'
import adminImageRoutes from './routes/admin/images.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()
const PORT = process.env.PORT || 3001

// Security
app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))

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

// ─── Public routes ───
app.use('/api/plots', plotRoutes)
app.use('/api/leads', leadRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/pois', poiRoutes)

// ─── Admin routes ───
app.use('/api/admin/plots', adminPlotRoutes)
app.use('/api/admin/leads', adminLeadRoutes)
app.use('/api/admin/dashboard', adminDashboardRoutes)
app.use('/api/admin/documents', adminDocumentRoutes)
app.use('/api/admin/images', adminImageRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handler
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`)
})
