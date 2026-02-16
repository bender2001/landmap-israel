import { Router } from 'express'
import { auth } from '../../middleware/auth.js'
import { adminOnly } from '../../middleware/adminOnly.js'
import { supabaseAdmin } from '../../config/supabase.js'

const router = Router()
router.use(auth, adminOnly)

// GET /api/admin/pois — List all POIs
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('pois')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

// POST /api/admin/pois — Create POI
router.post('/', async (req, res, next) => {
  try {
    const { name, type, icon, lat, lng, description } = req.body

    if (!name || lat == null || lng == null) {
      return res.status(400).json({ error: 'Name, lat, and lng are required' })
    }

    const { data, error } = await supabaseAdmin
      .from('pois')
      .insert({
        name,
        type: type || 'general',
        icon: icon || '📍',
        lat,
        lng,
        description: description || null,
      })
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
})

// PATCH /api/admin/pois/:id — Update POI
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, type, icon, lat, lng, description } = req.body

    const update = {}
    if (name !== undefined) update.name = name
    if (type !== undefined) update.type = type
    if (icon !== undefined) update.icon = icon
    if (lat !== undefined) update.lat = lat
    if (lng !== undefined) update.lng = lng
    if (description !== undefined) update.description = description

    const { data, error } = await supabaseAdmin
      .from('pois')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'POI not found' })
    res.json(data)
  } catch (err) {
    next(err)
  }
})

// DELETE /api/admin/pois/:id — Delete POI
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { error } = await supabaseAdmin
      .from('pois')
      .delete()
      .eq('id', id)

    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
