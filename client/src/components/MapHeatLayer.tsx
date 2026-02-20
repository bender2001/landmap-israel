import { useEffect, useMemo } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

/**
 * Price heatmap layer — shows price density/intensity across the map.
 * Uses Leaflet's built-in canvas rendering with circle markers for performance.
 * Inspired by Madlan's price heat zones.
 */
export default function MapHeatLayer({ plots, visible, metric = 'priceSqm' }) {
  const map = useMap()

  const heatData = useMemo(() => {
    if (!plots || plots.length === 0) return []

    return plots
      .map(p => {
        const coords = p.coordinates
        if (!coords || !Array.isArray(coords) || coords.length < 3) return null

        const validCoords = coords.filter(c => Array.isArray(c) && c.length >= 2 && isFinite(c[0]) && isFinite(c[1]))
        if (validCoords.length === 0) return null

        const lat = validCoords.reduce((s, c) => s + c[0], 0) / validCoords.length
        const lng = validCoords.reduce((s, c) => s + c[1], 0) / validCoords.length

        const price = p.total_price ?? p.totalPrice ?? 0
        const size = p.size_sqm ?? p.sizeSqM ?? 1
        const proj = p.projected_value ?? p.projectedValue ?? 0

        let intensity
        if (metric === 'roi') {
          intensity = price > 0 ? ((proj - price) / price) * 100 : 0
        } else {
          // price per sqm
          intensity = size > 0 ? price / size : 0
        }

        return { lat, lng, intensity }
      })
      .filter(Boolean)
  }, [plots, metric])

  // Compute min/max for normalization
  const { min, max } = useMemo(() => {
    if (heatData.length === 0) return { min: 0, max: 1 }
    const vals = heatData.map(d => d.intensity)
    return { min: Math.min(...vals), max: Math.max(...vals) }
  }, [heatData])

  useEffect(() => {
    if (!visible || heatData.length === 0) return

    const range = max - min || 1
    const layerGroup = L.layerGroup()

    heatData.forEach(({ lat, lng, intensity }) => {
      const normalized = (intensity - min) / range // 0 to 1

      // Color gradient: green (cheap/high ROI) → yellow → red (expensive/low ROI)
      let r, g, b, alpha
      if (metric === 'roi') {
        // For ROI: green = high, red = low
        r = Math.round(255 * (1 - normalized))
        g = Math.round(200 * normalized)
        b = 50
        alpha = 0.25 + normalized * 0.2
      } else {
        // For price: red = expensive, green = cheap
        r = Math.round(255 * normalized)
        g = Math.round(200 * (1 - normalized))
        b = 50
        alpha = 0.2 + normalized * 0.25
      }

      const circle = L.circle([lat, lng], {
        radius: 200, // meters
        stroke: false,
        fillColor: `rgb(${r},${g},${b})`,
        fillOpacity: alpha,
        interactive: false,
      })

      layerGroup.addLayer(circle)
    })

    layerGroup.addTo(map)
    // Put heatmap below plot polygons
    layerGroup.setZIndex?.(100)

    return () => {
      map.removeLayer(layerGroup)
    }
  }, [map, visible, heatData, min, max, metric])

  return null
}
