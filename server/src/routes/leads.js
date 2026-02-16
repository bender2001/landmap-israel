import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { leadLimiter } from '../middleware/rateLimiter.js'
import { createLeadSchema } from '../schemas/lead.js'
import { createLead } from '../services/leadService.js'

const router = Router()

// POST /api/leads - Submit a lead
router.post('/', leadLimiter, validate(createLeadSchema), async (req, res, next) => {
  try {
    const lead = await createLead(req.validated)
    res.status(201).json({ success: true, id: lead.id })
  } catch (err) {
    next(err)
  }
})

export default router
