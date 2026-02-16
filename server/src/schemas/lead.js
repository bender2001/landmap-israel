import { z } from 'zod'

export const createLeadSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().regex(/^0[2-9]\d{7,8}$/, 'Invalid Israeli phone number'),
  email: z.string().email('Invalid email address'),
  plot_id: z.string().uuid('Invalid plot ID'),
  message: z.string().max(500).optional(),
})
