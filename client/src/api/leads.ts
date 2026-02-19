import { api } from './client'

export interface LeadData {
  name: string
  email: string
  phone?: string
  plot_id?: string
  message?: string
  [key: string]: unknown
}

export interface LeadResponse {
  id: string
  created_at: string
  [key: string]: unknown
}

export function createLead(data: LeadData): Promise<LeadResponse> {
  return api.post('/leads', data) as Promise<LeadResponse>
}
