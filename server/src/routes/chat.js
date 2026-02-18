import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { chatLimiter, chatBurstLimiter } from '../middleware/rateLimiter.js'
import { chatMessageSchema } from '../schemas/chat.js'
import { processMessage } from '../services/chatService.js'

const router = Router()

// POST /api/chat - Send a chat message
// Double rate limit: chatBurstLimiter (3/min) + chatLimiter (20/hr)
// Prevents both rapid-fire abuse and sustained overuse of the Claude API.
router.post('/', chatBurstLimiter, chatLimiter, validate(chatMessageSchema), async (req, res, next) => {
  try {
    const { session_key, plot_id, message } = req.validated
    const reply = await processMessage(session_key, plot_id, message)
    res.json({ reply })
  } catch (err) {
    next(err)
  }
})

export default router
