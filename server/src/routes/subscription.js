/**
 * subscription.js — Freemium subscription management routes
 *
 * Routes:
 * - GET  /api/subscription/tiers    — List available tiers with features
 * - POST /api/subscription/register — Register for free tier
 * - GET  /api/subscription/status   — Check subscription status
 * - POST /api/subscription/upgrade  — Upgrade tier (placeholder for payment)
 */

import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'

const router = Router()

// ─── Tier Definitions ──────────────────────────────────────────────────

const TIERS = {
  free: {
    id: 'free',
    name: 'חינם',
    nameEn: 'Free',
    price: 0,
    priceLabel: 'חינם',
    period: null,
    features: {
      map_view: true,
      basic_plot_info: true,
      plots_per_month: 3,
      transaction_history: false,
      email_alerts: false,
      api_access: false,
      advanced_analytics: false,
      priority_support: false,
      planning_alerts: false,
      bulk_data: false,
      white_label: false,
    },
    featureList: [
      'תצוגת מפה אינטראקטיבית',
      'מידע בסיסי על חלקות',
      'עד 3 חלקות בחודש',
      'מחשבון השקעות',
    ],
    limitations: [
      'ללא היסטוריית עסקאות',
      'ללא התראות דוא"ל',
      'ללא גישת API',
    ],
    cta: 'התחל בחינם',
    popular: false,
  },
  basic: {
    id: 'basic',
    name: 'בסיסי',
    nameEn: 'Basic',
    price: 99,
    priceLabel: '₪99',
    period: 'חודשי',
    features: {
      map_view: true,
      basic_plot_info: true,
      plots_per_month: -1, // unlimited
      transaction_history: true,
      email_alerts: true,
      api_access: false,
      advanced_analytics: false,
      priority_support: false,
      planning_alerts: false,
      bulk_data: false,
      white_label: false,
    },
    featureList: [
      'כל התכונות של חינם',
      'גישה לכל החלקות — ללא הגבלה',
      'היסטוריית עסקאות מנדל"ן נט',
      'התראות דוא"ל על שינויי מחיר',
      'השוואת חלקות מתקדמת',
    ],
    limitations: [
      'ללא גישת API',
      'ללא ניתוח מתקדם',
    ],
    cta: 'שדרג עכשיו',
    popular: true,
  },
  pro: {
    id: 'pro',
    name: 'מקצועי',
    nameEn: 'Pro',
    price: 299,
    priceLabel: '₪299',
    period: 'חודשי',
    features: {
      map_view: true,
      basic_plot_info: true,
      plots_per_month: -1,
      transaction_history: true,
      email_alerts: true,
      api_access: true,
      advanced_analytics: true,
      priority_support: true,
      planning_alerts: true,
      bulk_data: false,
      white_label: false,
    },
    featureList: [
      'כל התכונות של בסיסי',
      'גישת API מלאה',
      'ניתוח השקעות מתקדם',
      'התראות תכנון ותב"עות',
      'תמיכת עדיפות',
      'דו"חות PDF',
      'נתוני מגמות שוק',
    ],
    limitations: [
      'ללא White-Label',
      'ללא נתונים בכמות גדולה',
    ],
    cta: 'הצטרף כמקצוען',
    popular: false,
  },
  enterprise: {
    id: 'enterprise',
    name: 'ארגוני',
    nameEn: 'Enterprise',
    price: null,
    priceLabel: 'מותאם אישית',
    period: null,
    features: {
      map_view: true,
      basic_plot_info: true,
      plots_per_month: -1,
      transaction_history: true,
      email_alerts: true,
      api_access: true,
      advanced_analytics: true,
      priority_support: true,
      planning_alerts: true,
      bulk_data: true,
      white_label: true,
    },
    featureList: [
      'כל התכונות של מקצועי',
      'נתונים בכמות גדולה (Bulk)',
      'White-Label — מיתוג מותאם',
      'מנהל חשבון אישי',
      'אינטגרציית API מותאמת',
      'SLA מובטח',
      'הדרכה ועדכונים',
    ],
    limitations: [],
    cta: 'צור קשר',
    popular: false,
  },
}

// ─── GET /tiers ────────────────────────────────────────────────────────
router.get('/tiers', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200')
  res.json({
    tiers: Object.values(TIERS),
    currency: 'ILS',
    currencySymbol: '₪',
  })
})

// ─── POST /register ────────────────────────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { email, name } = req.body || {}

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        error: 'נדרשת כתובת דוא"ל תקינה',
        errorCode: 'INVALID_EMAIL',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Check if already registered
    const { data: existing } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id, tier, is_active')
      .eq('user_email', normalizedEmail)
      .single()

    if (existing) {
      return res.json({
        message: 'משתמש כבר רשום',
        subscription: {
          email: normalizedEmail,
          tier: existing.tier,
          is_active: existing.is_active,
        },
      })
    }

    // Create free tier subscription
    const { data, error } = await supabaseAdmin
      .from('user_subscriptions')
      .insert({
        user_email: normalizedEmail,
        user_name: name?.trim() || null,
        tier: 'free',
        is_active: true,
        features: TIERS.free.features,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        // Unique violation — race condition
        return res.json({ message: 'משתמש כבר רשום', email: normalizedEmail })
      }
      throw error
    }

    res.status(201).json({
      message: 'נרשמת בהצלחה! ברוך הבא ל-LandMap Israel',
      subscription: {
        id: data.id,
        email: normalizedEmail,
        tier: 'free',
        is_active: true,
        tier_details: TIERS.free,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET /status ───────────────────────────────────────────────────────
router.get('/status', async (req, res, next) => {
  try {
    const email = req.query.email

    if (!email) {
      return res.status(400).json({
        error: 'נדרשת כתובת דוא"ל (email)',
        errorCode: 'MISSING_EMAIL',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const { data, error } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_email', normalizedEmail)
      .single()

    if (error || !data) {
      return res.json({
        registered: false,
        tier: null,
        message: 'משתמש לא נמצא. הירשם לתוכנית חינם.',
      })
    }

    // Check if subscription is expired
    const isExpired = data.expires_at && new Date(data.expires_at) < new Date()
    const effectiveTier = isExpired ? 'free' : data.tier

    res.json({
      registered: true,
      subscription: {
        id: data.id,
        email: data.user_email,
        name: data.user_name,
        tier: effectiveTier,
        is_active: data.is_active && !isExpired,
        started_at: data.started_at,
        expires_at: data.expires_at,
      },
      tier_details: TIERS[effectiveTier],
    })
  } catch (err) {
    next(err)
  }
})

// ─── POST /upgrade ─────────────────────────────────────────────────────
// Placeholder for payment integration (Stripe, PayPlus, etc.)
router.post('/upgrade', async (req, res, next) => {
  try {
    const { email, targetTier } = req.body || {}

    if (!email) {
      return res.status(400).json({ error: 'נדרשת כתובת דוא"ל', errorCode: 'MISSING_EMAIL' })
    }

    if (!targetTier || !TIERS[targetTier]) {
      return res.status(400).json({
        error: 'תוכנית לא תקינה',
        errorCode: 'INVALID_TIER',
        available: Object.keys(TIERS),
      })
    }

    if (targetTier === 'enterprise') {
      return res.json({
        message: 'לתוכנית ארגונית, צרו קשר עם צוות המכירות',
        action: 'contact_sales',
        contact: {
          email: 'enterprise@landmap.co.il',
          phone: '+972-50-000-0000',
        },
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Check existing subscription
    const { data: existing } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_email', normalizedEmail)
      .single()

    if (!existing) {
      return res.status(404).json({
        error: 'משתמש לא נמצא. הירשם קודם לתוכנית חינם.',
        errorCode: 'NOT_REGISTERED',
      })
    }

    const tier = TIERS[targetTier]

    // In production: integrate with payment gateway here
    // For now, return a payment intent placeholder
    res.json({
      message: 'מערכת תשלום בפיתוח. צור קשר לשדרוג.',
      upgrade: {
        from: existing.tier,
        to: targetTier,
        price: tier.price,
        currency: 'ILS',
        period: tier.period,
      },
      payment_status: 'pending_integration',
      note: 'שדרוג יופעל לאחר אינטגרציית תשלום (Stripe/PayPlus)',
    })
  } catch (err) {
    next(err)
  }
})

export default router
