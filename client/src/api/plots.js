import { api } from './client.js'

export function getPlots(filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v && v !== 'all') params.set(k, v)
  })
  const qs = params.toString()
  return api.get(`/plots${qs ? `?${qs}` : ''}`)
}

export function getPlot(id) {
  return api.get(`/plots/${id}`)
}
