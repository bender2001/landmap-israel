import { Router } from 'express'
import { auth } from '../../middleware/auth.js'
import { adminOnly } from '../../middleware/adminOnly.js'
import { supabaseAdmin } from '../../config/supabase.js'

const router = Router()
router.use(auth, adminOnly)

// GET /api/admin/settings — Get all settings
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('key, value')

    if (error) throw error

    // Convert array of {key, value} to an object
    const settings = {}
    for (const row of (data || [])) {
      settings[row.key] = row.value
    }
    res.json(settings)
  } catch (err) {
    next(err)
  }
})

// PATCH /api/admin/settings — Update settings (partial)
router.patch('/', async (req, res, next) => {
  try {
    const updates = req.body
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Body must be an object of key-value pairs' })
    }

    const entries = Object.entries(updates)
    if (entries.length === 0) {
      return res.status(400).json({ error: 'No settings to update' })
    }

    // Upsert each setting
    const upserts = entries.map(([key, value]) => ({
      key,
      value: JSON.stringify(value) === undefined ? 'null' : value,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabaseAdmin
      .from('settings')
      .upsert(upserts, { onConflict: 'key' })

    if (error) throw error

    // Return full updated settings
    const { data: all, error: fetchError } = await supabaseAdmin
      .from('settings')
      .select('key, value')

    if (fetchError) throw fetchError

    const settings = {}
    for (const row of (all || [])) {
      settings[row.key] = row.value
    }
    res.json(settings)
  } catch (err) {
    next(err)
  }
})

export default router
