import { api } from './client'

export interface Poi {
  id: string
  name: string
  type: string
  lat: number
  lng: number
  [key: string]: unknown
}

export function getPois(): Promise<Poi[]> {
  return api.get('/pois') as Promise<Poi[]>
}
