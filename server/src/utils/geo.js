/**
 * Geo utilities — shared geographic calculations.
 * Extracted from plots.js to eliminate duplication (haversine was copy-pasted
 * in both /nearby and /nearby-pois handlers).
 */

const EARTH_RADIUS_KM = 6371

/**
 * Calculate the Haversine distance between two lat/lng points.
 * @param {number} lat1 - Latitude of point 1 (degrees)
 * @param {number} lng1 - Longitude of point 1 (degrees)
 * @param {number} lat2 - Latitude of point 2 (degrees)
 * @param {number} lng2 - Longitude of point 2 (degrees)
 * @returns {number} Distance in kilometers
 */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Calculate the centroid (center of mass) of a polygon defined by coordinate pairs.
 * @param {Array<[number, number]>} coordinates - Array of [lat, lng] pairs
 * @returns {{ lat: number, lng: number } | null} Centroid or null if no valid coords
 */
export function calcCentroid(coordinates) {
  if (!coordinates || !Array.isArray(coordinates)) return null
  const valid = coordinates.filter(
    c => Array.isArray(c) && c.length >= 2 && isFinite(c[0]) && isFinite(c[1])
  )
  if (valid.length === 0) return null
  const lat = valid.reduce((s, c) => s + c[0], 0) / valid.length
  const lng = valid.reduce((s, c) => s + c[1], 0) / valid.length
  return { lat, lng }
}

/**
 * Format a distance for display (meters if < 1km, else km).
 * @param {number} km - Distance in kilometers
 * @returns {{ km: number, m: number, label: string }}
 */
export function formatDistance(km) {
  const m = Math.round(km * 1000)
  const label = km < 1 ? `${m}מ׳` : `${Math.round(km * 10) / 10} ק״מ`
  return { km: Math.round(km * 100) / 100, m, label }
}

/**
 * Estimate travel time for a given distance.
 * Walking: ~80m/min (4.8 km/h average pedestrian speed).
 * Driving: ~500m/min in urban areas (30 km/h with traffic/lights).
 * Returns walking and driving estimates with Hebrew labels.
 * @param {number} distanceM - Distance in meters
 * @returns {{ walkMin: number, driveMin: number, walkLabel: string, driveLabel: string }}
 */
export function estimateTravelTime(distanceM) {
  const WALK_SPEED_M_PER_MIN = 80
  const DRIVE_SPEED_M_PER_MIN = 500

  const walkMin = Math.max(1, Math.round(distanceM / WALK_SPEED_M_PER_MIN))
  const driveMin = Math.max(1, Math.round(distanceM / DRIVE_SPEED_M_PER_MIN))

  const walkLabel = walkMin >= 60
    ? `${Math.floor(walkMin / 60)} שע׳ ${walkMin % 60 > 0 ? `${walkMin % 60} דק׳` : ''}`
    : `${walkMin} דק׳`
  const driveLabel = driveMin >= 60
    ? `${Math.floor(driveMin / 60)} שע׳ ${driveMin % 60 > 0 ? `${driveMin % 60} דק׳` : ''}`
    : `${driveMin} דק׳`

  return { walkMin, driveMin, walkLabel: walkLabel.trim(), driveLabel: driveLabel.trim() }
}
