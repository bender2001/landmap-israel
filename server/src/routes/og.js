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

    // Investment score (0-10) — same algorithm as client-side calcInvestmentScore
    const score = (() => {
      let s = 5
      if (roi >= 200) s += 2; else if (roi >= 100) s += 1.5; else if (roi >= 50) s += 1
      if (sizeSqM >= 3000) s += 1; else if (sizeSqM >= 1000) s += 0.5
      const zoning = plot.zoning_stage || ''
      if (['BUILDING_PERMIT', 'DEVELOPER_TENDER'].includes(zoning)) s += 1.5
      else if (['DETAILED_PLAN_APPROVED'].includes(zoning)) s += 1
      else if (['DETAILED_PLAN_DEPOSIT', 'MASTER_PLAN_APPROVED'].includes(zoning)) s += 0.5
      return Math.min(10, Math.max(0, Math.round(s * 10) / 10))
    })()
    const grade = score >= 8.5 ? 'A+' : score >= 7 ? 'A' : score >= 5.5 ? 'B+' : score >= 4 ? 'B' : 'C'
    const gradeColor = score >= 8.5 ? '#22C55E' : score >= 7 ? '#4ADE80' : score >= 5.5 ? '#FBBF24' : score >= 4 ? '#F59E0B' : '#EF4444'

    // Status badge
    const statusLabel = plot.status === 'AVAILABLE' ? 'זמין' : plot.status === 'SOLD' ? 'נמכר' : plot.status === 'RESERVED' ? 'שמור' : ''
    const statusColor = plot.status === 'AVAILABLE' ? '#22C55E' : plot.status === 'SOLD' ? '#EF4444' : '#F59E0B'
    const statusBg = plot.status === 'AVAILABLE' ? 'rgba(34,197,94,0.15)' : plot.status === 'SOLD' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'

    // Price per sqm
    const priceSqm = sizeSqM > 0 ? Math.round(totalPrice / sizeSqM) : 0
    const priceSqmFormatted = priceSqm > 0 ? `₪${priceSqm.toLocaleString()}/מ״ר` : ''

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
  
  <!-- Status Badge (top right) -->
  ${statusLabel ? `
  <rect x="920" y="45" width="200" height="48" rx="24" fill="${statusBg}" stroke="${statusColor}" stroke-width="1.5" stroke-opacity="0.4"/>
  <circle cx="960" cy="69" r="6" fill="${statusColor}"/>
  <text x="1020" y="77" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="${statusColor}" text-anchor="middle">${statusLabel}</text>
  ` : ''}
  
  <!-- Investment Grade Badge (top right, below status) -->
  <rect x="980" y="${statusLabel ? '110' : '45'}" width="140" height="56" rx="16" fill="rgba(0,0,0,0.3)" stroke="${gradeColor}" stroke-width="1.5" stroke-opacity="0.5"/>
  <text x="1050" y="${statusLabel ? '130' : '65'}" font-family="Arial, sans-serif" font-size="12" fill="#94A3B8" text-anchor="middle">דירוג השקעה</text>
  <text x="1050" y="${statusLabel ? '155' : '90'}" font-family="Arial, sans-serif" font-size="26" font-weight="900" fill="${gradeColor}" text-anchor="middle">${grade} (${score}/10)</text>
  
  <!-- Plot Title -->
  <text x="80" y="180" font-family="Arial, sans-serif" font-size="64" font-weight="900" fill="#F1F5F9" direction="rtl">גוש ${blockNumber} | חלקה ${plot.number}</text>
  
  <!-- City + Price/sqm -->
  <text x="80" y="240" font-family="Arial, sans-serif" font-size="32" fill="#94A3B8">📍 ${city}${priceSqmFormatted ? `  ·  ${priceSqmFormatted}` : ''}</text>
  
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
  
  <!-- ROI progress bar -->
  <rect x="80" y="440" width="1040" height="6" rx="3" fill="rgba(255,255,255,0.05)"/>
  <rect x="80" y="440" width="${Math.min(1040, Math.max(80, (roi / 300) * 1040))}" height="6" rx="3" fill="url(#green)" opacity="0.6"/>
  
  <!-- CTA -->
  <rect x="80" y="480" width="400" height="60" rx="16" fill="url(#gold)"/>
  <text x="280" y="520" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="#050D1A" text-anchor="middle">צפה בפרטים מלאים →</text>
  
  <!-- Footer -->
  <text x="80" y="590" font-family="Arial, sans-serif" font-size="16" fill="rgba(148,163,184,0.5)">landmap.co.il — מפת קרקעות להשקעה בישראל</text>
  <text x="1120" y="590" font-family="Arial, sans-serif" font-size="14" fill="rgba(148,163,184,0.3)" text-anchor="end">${new Date().toLocaleDateString('he-IL')}</text>
  
  <!-- Gold accent line bottom -->
  <rect x="0" y="626" width="1200" height="4" fill="url(#gold)"/>
</svg>`

    res.send(svg)
  } catch (err) {
    next(err)
  }
})

export default router
