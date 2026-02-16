import { z } from 'zod'

export const createPlotSchema = z.object({
  block_number: z.string().min(1),
  number: z.string().min(1),
  city: z.string().min(1),
  size_sqm: z.number().positive(),
  status: z.enum(['AVAILABLE', 'SOLD', 'RESERVED', 'IN_PLANNING']),
  total_price: z.number().positive(),
  tax_authority_value: z.number().positive().optional(),
  projected_value: z.number().positive().optional(),
  zoning_stage: z.string(),
  ripeness: z.string().optional(),
  coordinates: z.array(z.array(z.number()).length(2)).min(3),
  documents: z.array(z.string()).optional(),
  description: z.string().optional(),
  area_context: z.string().optional(),
  readiness_estimate: z.string().optional(),
  nearby_development: z.string().optional(),
  distance_to_sea: z.number().optional(),
  distance_to_park: z.number().optional(),
  distance_to_hospital: z.number().optional(),
  density_units_per_dunam: z.number().optional(),
  committees: z.record(z.any()).optional(),
  standard22: z.record(z.any()).optional(),
  is_published: z.boolean().optional(),
})

export const updatePlotSchema = createPlotSchema.partial()
