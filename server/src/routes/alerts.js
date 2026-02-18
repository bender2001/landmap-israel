import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'
import { rateLimit } from 'express-rate-limit'

const router = Router()

// Rate limit alert subscriptions
const alertLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many subscription requests, try again later' },
})

/**
 * POST /api/alerts/subscribe
 * Subscribe to listing alerts matching filter criteria.
 * Like Madlan's "קבל התראה על נכסים חדשים" feature.
 * 
 * Body: { email, phone?, criteria: { city?, priceMin?, priceMax?, sizeMin?, sizeMax?, status? }, frequency: 'instant'|'daily'|'weekly' }
 */
router.post('/subscribe', alertLimiter, async (req, res, next) => {
  try {
    const { email, phone, criteria = {}, frequency = 'daily' } = req.body

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email required' })
    }
    if (!['instant', 'daily', 'weekly'].includes(frequency)) {
      return res.status(400).json({ error: 'Invalid frequency. Use: instant, daily, weekly' })
    }

    // Sanitize criteria
    const cleanCriteria = {}
    if (criteria.city && criteria.city !== 'all') cleanCriteria.city = String(criteria.city).slice(0, 50)
    if (criteria.priceMin) cleanCriteria.priceMin = Number(criteria.priceMin) || undefined
    if (criteria.priceMax) cleanCriteria.priceMax = Number(criteria.priceMax) || undefined
    if (criteria.sizeMin) cleanCriteria.sizeMin = Number(criteria.sizeMin) || undefined
    if (criteria.sizeMax) cleanCriteria.sizeMax = Number(criteria.sizeMax) || undefined
    if (criteria.minRoi) cleanCriteria.minRoi = Number(criteria.minRoi) || undefined
    if (criteria.status) cleanCriteria.status = String(criteria.status).slice(0, 50)

    // Upsert: if same email+criteria exists, update frequency
    const { data: existing } = await supabaseAdmin
      .from('alert_subscriptions')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('criteria', JSON.stringify(cleanCriteria))
      .eq('is_active', true)
      .maybeSingle()

    if (existing) {
      await supabaseAdmin
        .from('alert_subscriptions')
        .update({ frequency, phone: phone || null, updated_at: new Date().toISOString() })
        .eq('id', existing.id)

      return res.json({ success: true, action: 'updated', id: existing.id })
    }

    const { data, error } = await supabaseAdmin
      .from('alert_subscriptions')
      .insert({
        email: email.toLowerCase(),
        phone: phone || null,
        criteria: cleanCriteria,
        frequency,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      // Table might not exist yet — gracefully handle
      if (error.code === '42P01') {
        console.warn('[alerts] alert_subscriptions table does not exist. Storing in leads instead.')
        // Fallback: store as a lead with alert metadata
        const { data: leadData, error: leadError } = await supabaseAdmin
          .from('leads')
          .insert({
            name: email.split('@')[0],
            email: email.toLowerCase(),
            phone: phone || null,
            message: `Alert subscription: ${JSON.stringify(cleanCriteria)} (${frequency})`,
            source: 'alert_subscription',
          })
          .select('id')
          .single()

        if (leadError) throw leadError
        return res.status(201).json({ success: true, action: 'created', id: leadData?.id, fallback: true })
      }
      throw error
    }

    res.status(201).json({ success: true, action: 'created', id: data?.id })
  } catch (err) {
    next(err)
  }
})

/**
 * DELETE /api/alerts/unsubscribe
 * Unsubscribe from alerts by email + token (or just email for now).
 */
router.delete('/unsubscribe', async (req, res, next) => {
  try {
    const { email, id } = req.query

    if (!email) return res.status(400).json({ error: 'Email required' })

    const query = supabaseAdmin
      .from('alert_subscriptions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('email', email.toLowerCase())

    if (id) query.eq('id', id)

    const { error } = await query

    if (error && error.code === '42P01') {
      // Table doesn't exist — that's fine, nothing to unsubscribe from
      return res.json({ success: true, message: 'No active subscriptions' })
    }
    if (error) throw error

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/alerts/status?email=...
 * Check if an email has active alert subscriptions.
 */
router.get('/status', async (req, res, next) => {
  try {
    const { email } = req.query
    if (!email) return res.status(400).json({ error: 'Email required' })

    const { data, error } = await supabaseAdmin
      .from('alert_subscriptions')
      .select('id, criteria, frequency, created_at')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)

    if (error && error.code === '42P01') {
      return res.json({ subscriptions: [] })
    }
    if (error) throw error

    res.json({ subscriptions: data || [] })
  } catch (err) {
    next(err)
  }
})

export default router
