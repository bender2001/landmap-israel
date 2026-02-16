import { api } from './client.js'

export function createLead(data) {
  return api.post('/leads', data)
}
