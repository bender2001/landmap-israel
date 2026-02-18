import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'

const router = Router()

/**
 * Dynamic XML sitemap for SEO — like Madlan/Yad2.
 * Includes all published plot detail pages + static pages.
 */
router.get('/sitemap.xml', async (req, res) => {
  try {
    res.set('Content-Type', 'application/xml')
    res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200')

    const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`

    // Fetch all published plots (lightweight — only id, city, updated_at)
    const { data: plots, error } = await supabaseAdmin
      .from('plots')
      .select('id, city, updated_at')
      .eq('is_published', true)
      .order('updated_at', { ascending: false })

    if (error) throw error

    // Static pages
    const staticPages = [
      { path: '/', priority: '1.0', changefreq: 'daily' },
      { path: '/areas', priority: '0.8', changefreq: 'weekly' },
      { path: '/about', priority: '0.5', changefreq: 'monthly' },
      { path: '/contact', priority: '0.5', changefreq: 'monthly' },
      { path: '/calculator', priority: '0.6', changefreq: 'monthly' },
      { path: '/favorites', priority: '0.3', changefreq: 'weekly' },
      { path: '/compare', priority: '0.3', changefreq: 'weekly' },
    ]

    // Get unique cities for city filter pages
    const cities = [...new Set((plots || []).map(p => p.city).filter(Boolean))]

    const urls = [
      // Static pages
      ...staticPages.map(p => `
  <url>
    <loc>${baseUrl}${p.path}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`),

      // Dedicated city area pages (like Madlan's /hadera, /netanya etc.)
      ...cities.map(city => `
  <url>
    <loc>${baseUrl}/areas/${encodeURIComponent(city)}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`),

      // City filter map views
      ...cities.map(city => `
  <url>
    <loc>${baseUrl}/?city=${encodeURIComponent(city)}</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`),

      // Individual plot pages
      ...(plots || []).map(p => `
  <url>
    <loc>${baseUrl}/plot/${p.id}</loc>
    <lastmod>${new Date(p.updated_at || Date.now()).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`),
    ]

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('')}
</urlset>`

    res.send(xml)
  } catch (err) {
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>')
  }
})

/**
 * robots.txt — allow all crawlers, point to sitemap
 */
router.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`
  res.set('Content-Type', 'text/plain')
  res.set('Cache-Control', 'public, max-age=86400')
  res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`)
})

export default router
