import { apiClient } from './client'

export async function subscribeToAlerts({ email, phone, criteria, frequency }) {
  const res = await apiClient.post('/api/alerts/subscribe', { email, phone, criteria, frequency })
  return res.data
}

export async function unsubscribeFromAlerts(email, id) {
  const params = new URLSearchParams({ email })
  if (id) params.set('id', id)
  const res = await apiClient.delete(`/api/alerts/unsubscribe?${params}`)
  return res.data
}

export async function getAlertStatus(email) {
  const res = await apiClient.get(`/api/alerts/status?email=${encodeURIComponent(email)}`)
  return res.data
}
