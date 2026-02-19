import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { leadLimiter } from '../middleware/rateLimiter.js'
import { createLeadSchema } from '../schemas/lead.js'
import { createLead } from '../services/leadService.js'

const router = Router()

// POST /api/leads - Submit a lead
router.post('/', leadLimiter, validate(createLeadSchema), async (req, res, next) => {
  try {
    // Honeypot check — bots auto-fill the hidden "website" field.
    // Return fake success (201) to avoid tipping off sophisticated bots.
    // Log the attempt for monitoring bot traffic patterns.
    if (req.validated.website) {
      console.warn(JSON.stringify({
        level: 'warn',
        type: 'honeypot-triggered',
        ip: req.ip,
        email: req.validated.email,
        timestamp: new Date().toISOString(),
      }))
      return res.status(201).json({ success: true, id: 'ok' })
    }

    // Strip honeypot field before saving — don't pollute the DB schema
    const { website: _hp, ...leadData } = req.validated
    const lead = await createLead(leadData)
    res.status(201).json({ success: true, id: lead.id })
  } catch (err) {
    next(err)
  }
})

export default router
