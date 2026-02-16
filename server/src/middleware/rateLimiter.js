import { rateLimit } from 'express-rate-limit'

export const leadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'Too many lead submissions. Try again later.' },
})

export const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Chat rate limit exceeded. Try again later.' },
})
