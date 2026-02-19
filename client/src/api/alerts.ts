import { api } from './client'

export interface AlertCriteria {
  city?: string
  min_price?: number
  max_price?: number
  zoning_stage?: string
  [key: string]: unknown
}

export interface AlertSubscribeParams {
  email: string
  phone?: string
  criteria: AlertCriteria
  frequency: 'daily' | 'weekly' | 'instant'
}

export interface AlertSubscribeResponse {
  id: string
  email: string
  active: boolean
}

export interface AlertStatusResponse {
  active: boolean
  subscriptions: AlertSubscribeResponse[]
}

export async function subscribeToAlerts(params: AlertSubscribeParams): Promise<AlertSubscribeResponse> {
  const { email, phone, criteria, frequency } = params
  return api.post('/alerts/subscribe', { email, phone, criteria, frequency }) as Promise<AlertSubscribeResponse>
}

export async function unsubscribeFromAlerts(email: string, id?: string): Promise<void> {
  const params = new URLSearchParams({ email })
  if (id) params.set('id', id)
  return api.delete(`/alerts/unsubscribe?${params}`) as Promise<void>
}

export async function getAlertStatus(email: string): Promise<AlertStatusResponse> {
  return api.get(`/alerts/status?email=${encodeURIComponent(email)}`) as Promise<AlertStatusResponse>
}
