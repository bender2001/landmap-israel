import { z } from 'zod'

export const chatMessageSchema = z.object({
  session_key: z.string().min(1),
  plot_id: z.string().uuid().optional(),
  message: z.string().min(1).max(1000),
})
