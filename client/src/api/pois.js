import { api } from './client.js'

export function getPois() {
  return api.get('/pois')
}
