export type Role = 'public' | 'user' | 'business' | 'admin'

export interface User {
  id: string
  email: string
  name?: string
  role: Role
  avatar?: string
  created_at?: string
}

export interface Plot {
  id: string
  number: string
  city: string
  block_number?: string; blockNumber?: string
  total_price?: number; totalPrice?: number
  projected_value?: number; projectedValue?: number
  size_sqm?: number; sizeSqM?: number
  status?: string
  coordinates?: [number, number][]
  zoning_stage?: string; zoningStage?: string
  readiness_estimate?: string; readinessEstimate?: string
  distance_to_sea?: number; distanceToSea?: number
  distance_to_park?: number; distanceToPark?: number
  distance_to_hospital?: number; distanceToHospital?: number
  density_units_per_dunam?: number; densityUnitsPerDunam?: number
  description?: string
  area_context?: string; areaContext?: string
  nearby_development?: string; nearbyDevelopment?: string
  tax_authority_value?: number; taxAuthorityValue?: number
  views?: number
  created_at?: string; createdAt?: string
  updated_at?: string; updatedAt?: string
  documents?: string[]
  images?: unknown[]
  owner_id?: string
  committees?: { national: Committee; district: Committee; local: Committee }
  standard22?: Standard22
  [key: string]: unknown
}

export interface Committee { status: 'approved' | 'in_preparation' | 'pending' | 'in_discussion' | 'not_started'; label: string; date: string | null }
export interface Standard22 { appraiser: string; date: string; value: number; methodology: string }

export interface Filters {
  city: string; priceMin: string; priceMax: string; sizeMin: string; sizeMax: string
  ripeness: string; minRoi: string; zoning: string; search: string; belowAvg?: string
}

export interface Lead {
  id: string; plot_id: string; name: string; phone: string; email?: string; message?: string
  status: string; created_at: string
}

export interface Poi { id: string; name: string; type: string; lat: number; lng: number; icon?: string; [key: string]: unknown }
export interface ChatMessage { role: 'assistant' | 'user'; content: string }
export interface InvestmentGrade { grade: string; color: string; tier: string }
