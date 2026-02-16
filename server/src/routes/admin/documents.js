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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    cb(null, allowed.includes(file.mimetype))
  },
})

// POST /api/admin/documents/:plotId - Upload document
router.post('/:plotId', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' })

    const { plotId } = req.params
    const fileName = `${plotId}/${Date.now()}-${req.file.originalname}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
      })

    if (uploadError) throw uploadError

    const { data: urlData } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(fileName)

    // Insert record
    const { data, error } = await supabaseAdmin
      .from('plot_documents')
      .insert({
        plot_id: plotId,
        name: req.body.name || req.file.originalname,
        url: urlData.publicUrl,
        mime_type: req.file.mimetype,
        size_bytes: req.file.size,
      })
      .select()
      .single()

    if (error) throw error

    logActivity({
      action: 'create',
      entityType: 'document',
      entityId: data.id,
      userId: req.user?.id,
      description: `הועלה מסמך "${data.name}" לחלקה ${plotId}`,
      metadata: { plot_id: plotId, filename: req.file.originalname },
    })

    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
})

// DELETE /api/admin/documents/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { data: existing } = await supabaseAdmin
      .from('plot_documents')
      .select('name, plot_id')
      .eq('id', req.params.id)
      .single()

    const { error } = await supabaseAdmin
      .from('plot_documents')
      .delete()
      .eq('id', req.params.id)

    if (error) throw error

    logActivity({
      action: 'delete',
      entityType: 'document',
      entityId: req.params.id,
      userId: req.user?.id,
      description: `נמחק מסמך "${existing?.name || ''}" מחלקה ${existing?.plot_id || ''}`,
    })

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
