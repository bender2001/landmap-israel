import { Router } from 'express'
import { getPlotById } from '../services/plotService.js'

const router = Router()

/**
 * GET /api/og/:plotId
 * Generates a dynamic SVG-based Open Graph image for social sharing.
 * Returns an SVG that can be used as og:image (most platforms support SVG or we wrap in a data URI).
 * For maximum compatibility, we return an HTML page that renders as an image-like preview.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const plot = await getPlotById(req.params.id)
    if (!plot) return res.status(404).send('Not found')

    const blockNumber = plot.block_number ?? plot.blockNumber
    const totalPrice = plot.total_price ?? plot.totalPrice ?? 0
    const projectedValue = plot.projected_value ?? plot.projectedValue ?? 0
    const sizeSqM = plot.size_sqm ?? plot.sizeSqM ?? 0
    const roi = totalPrice > 0 ? Math.round(((projectedValue - totalPrice) / totalPrice) * 100) : 0
    const dunam = (sizeSqM / 1000).toFixed(1)
    const priceFormatted = `₪${(totalPrice / 1000).toFixed(0)}K`
    const city = plot.city || ''

    // Return SVG image
    res.set('Content-Type', 'image/svg+xml')
    res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" style="stop-color:#050D1A"/>
      <stop offset="100%" style="stop-color:#0A1628"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" style="stop-color:#C8942A"/>
      <stop offset="100%" style="stop-color:#E5B94E"/>
    </linearGradient>
    <linearGradient id="green" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" style="stop-color:#22C55E"/>
      <stop offset="100%" style="stop-color:#4ADE80"/>
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  
  <!-- Gold accent line top -->
  <rect x="0" y="0" width="1200" height="4" fill="url(#gold)"/>
  
  <!-- Grid pattern -->
  <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
    <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(200,148,42,0.04)" stroke-width="1"/>
  </pattern>
  <rect width="1200" height="630" fill="url(#grid)"/>
  
  <!-- Logo / Brand -->
  <text x="80" y="80" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#C8942A">🏗️ LandMap Israel</text>
  
  <!-- Plot Title -->
  <text x="80" y="180" font-family="Arial, sans-serif" font-size="64" font-weight="900" fill="#F1F5F9" direction="rtl">גוש ${blockNumber} | חלקה ${plot.number}</text>
  
  <!-- City -->
  <text x="80" y="240" font-family="Arial, sans-serif" font-size="32" fill="#94A3B8">📍 ${city}</text>
  
  <!-- Stats Cards -->
  <!-- Price -->
  <rect x="80" y="290" width="300" height="120" rx="16" fill="rgba(59,130,246,0.12)" stroke="rgba(59,130,246,0.25)" stroke-width="1"/>
  <text x="230" y="335" font-family="Arial, sans-serif" font-size="16" fill="#94A3B8" text-anchor="middle">מחיר</text>
  <text x="230" y="385" font-family="Arial, sans-serif" font-size="36" font-weight="800" fill="#60A5FA" text-anchor="middle">${priceFormatted}</text>
  
  <!-- ROI -->
  <rect x="420" y="290" width="300" height="120" rx="16" fill="rgba(34,197,94,0.12)" stroke="rgba(34,197,94,0.25)" stroke-width="1"/>
  <text x="570" y="335" font-family="Arial, sans-serif" font-size="16" fill="#94A3B8" text-anchor="middle">תשואה צפויה</text>
  <text x="570" y="385" font-family="Arial, sans-serif" font-size="36" font-weight="800" fill="#4ADE80" text-anchor="middle">+${roi}%</text>
  
  <!-- Size -->
  <rect x="760" y="290" width="300" height="120" rx="16" fill="rgba(200,148,42,0.12)" stroke="rgba(200,148,42,0.25)" stroke-width="1"/>
  <text x="910" y="335" font-family="Arial, sans-serif" font-size="16" fill="#94A3B8" text-anchor="middle">שטח</text>
  <text x="910" y="385" font-family="Arial, sans-serif" font-size="36" font-weight="800" fill="#E5B94E" text-anchor="middle">${dunam} דונם</text>
  
  <!-- CTA -->
  <rect x="80" y="460" width="400" height="60" rx="16" fill="url(#gold)"/>
  <text x="280" y="500" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="#050D1A" text-anchor="middle">צפה בפרטים מלאים →</text>
  
  <!-- Footer -->
  <text x="80" y="590" font-family="Arial, sans-serif" font-size="16" fill="rgba(148,163,184,0.5)">landmap.co.il — מפת קרקעות להשקעה בישראל</text>
  
  <!-- Gold accent line bottom -->
  <rect x="0" y="626" width="1200" height="4" fill="url(#gold)"/>
</svg>`

    res.send(svg)
  } catch (err) {
    next(err)
  }
})

export default router
