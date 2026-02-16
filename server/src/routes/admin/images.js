import { Router } from 'express'
import multer from 'multer'
import { auth } from '../../middleware/auth.js'
import { adminOnly } from '../../middleware/adminOnly.js'
import { supabaseAdmin } from '../../config/supabase.js'
import { logActivity } from '../../services/activityLogger.js'

const router = Router()
router.use(auth, adminOnly)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    cb(null, allowed.includes(file.mimetype))
  },
})

// POST /api/admin/images/:plotId - Upload image
router.post('/:plotId', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' })

    const { plotId } = req.params
    const fileName = `${plotId}/${Date.now()}-${req.file.originalname}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('images')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
      })

    if (uploadError) throw uploadError

    const { data: urlData } = supabaseAdmin.storage
      .from('images')
      .getPublicUrl(fileName)

    const { data, error } = await supabaseAdmin
      .from('plot_images')
      .insert({
        plot_id: plotId,
        url: urlData.publicUrl,
        alt: req.body.alt || '',
        sort_order: Number(req.body.sort_order) || 0,
      })
      .select()
      .single()

    if (error) throw error

    logActivity({
      action: 'create',
      entityType: 'image',
      entityId: data.id,
      userId: req.user?.id,
      description: `הועלתה תמונה לחלקה ${plotId}`,
      metadata: { plot_id: plotId, filename: req.file.originalname },
    })

    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
})

// DELETE /api/admin/images/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { data: existing } = await supabaseAdmin
      .from('plot_images')
      .select('plot_id')
      .eq('id', req.params.id)
      .single()

    const { error } = await supabaseAdmin
      .from('plot_images')
      .delete()
      .eq('id', req.params.id)

    if (error) throw error

    logActivity({
      action: 'delete',
      entityType: 'image',
      entityId: req.params.id,
      userId: req.user?.id,
      description: `נמחקה תמונה מחלקה ${existing?.plot_id || ''}`,
    })

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
