import { Router } from 'express'
import { auth } from '../../middleware/auth.js'
import { adminOnly } from '../../middleware/adminOnly.js'
import { supabaseAdmin } from '../../config/supabase.js'
import { logActivity } from '../../services/activityLogger.js'

const router = Router()
router.use(auth, adminOnly)

// GET /api/admin/pois — List all POIs
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('points_of_interest')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Map coordinates JSONB → flat lat/lng for client compatibility
    const mapped = (data || []).map((poi) => ({
      ...poi,
      lat: poi.lat ?? poi.coordinates?.lat ?? null,
      lng: poi.lng ?? poi.coordinates?.lng ?? null,
    }))

    res.json(mapped)
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/pois/:id — Get single POI
router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('points_of_interest')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'POI not found' })

    // Map coordinates JSONB → flat lat/lng
    res.json({
      ...data,
      lat: data.lat ?? data.coordinates?.lat ?? null,
      lng: data.lng ?? data.coordinates?.lng ?? null,
    })
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
      .from('points_of_interest')
      .insert({
        name,
        type: type || 'general',
        icon: icon || '📍',
        lat,
        lng,
        coordinates: { lat, lng },
        description: description || null,
      })
      .select()
      .single()

    if (error) throw error

    logActivity({
      action: 'create',
      entityType: 'poi',
      entityId: data.id,
      userId: req.user?.id,
      description: `נוצרה נקודת עניין: ${name}`,
    })

    res.status(201).json({ ...data, lat, lng })
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
    if (lat !== undefined) { update.lat = lat }
    if (lng !== undefined) { update.lng = lng }
    if (lat !== undefined || lng !== undefined) {
      update.coordinates = { lat: lat ?? undefined, lng: lng ?? undefined }
    }
    if (description !== undefined) update.description = description

    const { data, error } = await supabaseAdmin
      .from('points_of_interest')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'POI not found' })

    logActivity({
      action: 'update',
      entityType: 'poi',
      entityId: id,
      userId: req.user?.id,
      description: `עודכנה נקודת עניין: ${data.name}`,
    })

    res.json({
      ...data,
      lat: data.lat ?? data.coordinates?.lat ?? null,
      lng: data.lng ?? data.coordinates?.lng ?? null,
    })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/admin/pois/:id — Delete POI
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    // Get name before deleting for log
    const { data: existing } = await supabaseAdmin
      .from('points_of_interest')
      .select('name')
      .eq('id', id)
      .single()

    const { error } = await supabaseAdmin
      .from('points_of_interest')
      .delete()
      .eq('id', id)

    if (error) throw error

    logActivity({
      action: 'delete',
      entityType: 'poi',
      entityId: id,
      userId: req.user?.id,
      description: `נמחקה נקודת עניין: ${existing?.name || id}`,
    })

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
