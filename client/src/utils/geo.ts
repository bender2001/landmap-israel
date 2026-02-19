import type { LatLng, TravelTime, CommuteTime } from '../types'

export function plotCenter(coordinates: [number, number][] | null | undefined): LatLng | null {
  if (!coordinates || !Array.isArray(coordinates)) return null
  const valid = coordinates.filter(c => Array.isArray(c) && c.length >= 2 && isFinite(c[0]) && isFinite(c[1]))
  if (valid.length === 0) return null
  const lat = valid.reduce((s, c) => s + c[0], 0) / valid.length
  const lng = valid.reduce((s, c) => s + c[1], 0) / valid.length
  if (!isFinite(lat) || !isFinite(lng)) return null
  return { lat, lng }
}

export function plotNavigateUrl(coordinates: [number, number][] | null | undefined): string | null {
  const center = plotCenter(coordinates)
  if (!center) return null
  return `https://www.google.com/maps/dir/?api=1&destination=${center.lat},${center.lng}&travelmode=driving`
}

export function plotMapViewUrl(coordinates: [number, number][] | null | undefined): string | null {
  const center = plotCenter(coordinates)
  if (!center) return null
  return `https://www.google.com/maps/@${center.lat},${center.lng},17z`
}

export function calcPlotPerimeter(coordinates: [number, number][] | null | undefined): number | null {
  if (!coordinates || !Array.isArray(coordinates)) return null
  const valid = coordinates.filter(c => Array.isArray(c) && c.length >= 2 && isFinite(c[0]) && isFinite(c[1]))
  if (valid.length < 3) return null

  const R = 6371000
  const toRad = (deg: number) => deg * Math.PI / 180

  let perimeter = 0
  for (let i = 0; i < valid.length; i++) {
    const [lat1, lng1] = valid[i]
    const [lat2, lng2] = valid[(i + 1) % valid.length]
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
    perimeter += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  return Math.round(perimeter)
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function estimateTravelTime(distanceM: number): TravelTime {
  const walkMin = Math.max(1, Math.round(distanceM / 80))
  const driveMin = Math.max(1, Math.round(distanceM / 500))
  const walkLabel = walkMin >= 60
    ? `${Math.floor(walkMin / 60)} שע׳ ${walkMin % 60 > 0 ? `${walkMin % 60} דק׳` : ''}`.trim()
    : `${walkMin} דק׳`
  const driveLabel = driveMin >= 60
    ? `${Math.floor(driveMin / 60)} שע׳ ${driveMin % 60 > 0 ? `${driveMin % 60} דק׳` : ''}`.trim()
    : `${driveMin} דק׳`
  return { walkMin, driveMin, walkLabel, driveLabel }
}

const MAJOR_CITIES = [
  { name: 'תל אביב', emoji: '🏙️', lat: 32.0853, lng: 34.7818 },
  { name: 'ירושלים', emoji: '🕌', lat: 31.7683, lng: 35.2137 },
  { name: 'חיפה', emoji: '⚓', lat: 32.7940, lng: 34.9896 },
  { name: 'באר שבע', emoji: '🏜️', lat: 31.2530, lng: 34.7915 },
  { name: 'נתב״ג', emoji: '✈️', lat: 32.0055, lng: 34.8854 },
  { name: 'הרצליה', emoji: '🏢', lat: 32.1629, lng: 34.7913 },
]

export function calcCommuteTimes(lat: number, lng: number): CommuteTime[] {
  if (!isFinite(lat) || !isFinite(lng)) return []
  const ROAD_FACTOR = 1.35
  const AVG_SPEED_KMH = 60

  return MAJOR_CITIES.map(city => {
    const straightKm = haversineKm(lat, lng, city.lat, city.lng)
    const roadKm = Math.round(straightKm * ROAD_FACTOR)
    const minutes = Math.round((roadKm / AVG_SPEED_KMH) * 60)
    const googleMapsUrl = `https://www.google.com/maps/dir/${lat},${lng}/${city.lat},${city.lng}`
    return { city: city.name, emoji: city.emoji, distanceKm: roadKm, drivingMinutes: minutes, googleMapsUrl }
  }).sort((a, b) => a.distanceKm - b.distanceKm)
}
