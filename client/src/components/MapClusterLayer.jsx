import { useEffect, useState, useMemo } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { formatPriceShort } from '../utils/formatters'
import { statusColors } from '../utils/constants'

/**
 * Cluster layer that shows aggregated city bubbles when zoomed out (< zoom 12).
 * Similar to Madlan's cluster view — shows count + avg price per area.
 * When zoomed in (>= 12), individual polygons show instead.
 */
export default function MapClusterLayer({ plots, onSelectPlot }) {
  const map = useMap()
  const [zoom, setZoom] = useState(map.getZoom())

  useEffect(() => {
    const handler = () => setZoom(map.getZoom())
    map.on('zoomend', handler)
    return () => map.off('zoomend', handler)
  }, [map])

  // Compute city clusters
  const clusters = useMemo(() => {
    if (!plots || plots.length === 0) return []
    const byCity = {}
    plots.forEach(p => {
      const city = p.city || 'unknown'
      if (!byCity[city]) byCity[city] = { plots: [], lats: [], lngs: [] }
      byCity[city].plots.push(p)
      if (p.coordinates?.length >= 3) {
        const validCoords = p.coordinates.filter(c => Array.isArray(c) && c.length >= 2 && isFinite(c[0]) && isFinite(c[1]))
        if (validCoords.length > 0) {
          const lat = validCoords.reduce((s, c) => s + c[0], 0) / validCoords.length
          const lng = validCoords.reduce((s, c) => s + c[1], 0) / validCoords.length
          byCity[city].lats.push(lat)
          byCity[city].lngs.push(lng)
        }
      }
    })
    return Object.entries(byCity).map(([city, data]) => {
      if (data.lats.length === 0) return null
      const lat = data.lats.reduce((s, v) => s + v, 0) / data.lats.length
      const lng = data.lngs.reduce((s, v) => s + v, 0) / data.lngs.length
      const count = data.plots.length
      const avgPrice = Math.round(data.plots.reduce((s, p) => s + (p.total_price ?? p.totalPrice ?? 0), 0) / count)
      const available = data.plots.filter(p => p.status === 'AVAILABLE').length
      return { city, lat, lng, count, avgPrice, available, plots: data.plots }
    }).filter(Boolean)
  }, [plots])

  // Only show clusters when zoomed out
  useEffect(() => {
    if (zoom >= 12) return // polygons visible, no clusters needed

    const markers = clusters.map(cluster => {
      const size = Math.min(80, Math.max(45, 30 + cluster.count * 5))
      const icon = L.divIcon({
        className: 'city-cluster-marker',
        html: `<div class="city-cluster-bubble" style="width:${size}px;height:${size}px">
          <div class="city-cluster-count">${cluster.count}</div>
          <div class="city-cluster-city">${cluster.city}</div>
          <div class="city-cluster-price">${formatPriceShort(cluster.avgPrice)}</div>
        </div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })
      const marker = L.marker([cluster.lat, cluster.lng], { icon })
      marker.on('click', () => {
        map.flyTo([cluster.lat, cluster.lng], 13, { duration: 0.8 })
      })
      return marker
    })

    const layerGroup = L.layerGroup(markers).addTo(map)
    return () => { map.removeLayer(layerGroup) }
  }, [zoom, clusters, map])

  return null
}
