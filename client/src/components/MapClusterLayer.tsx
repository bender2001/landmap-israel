import { useEffect, useState, useMemo } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { formatPriceShort } from '../utils/format'
import { statusColors } from '../utils/constants'

/**
 * Cluster layer that shows aggregated city bubbles when zoomed out (< zoom 12).
 * Enhanced beyond basic Madlan clusters — shows portfolio-grade metrics per cluster:
 *   - Total portfolio value (not just avg price — investors think in total exposure)
 *   - Average ROI with color-coded indicator (green/amber/red)
 *   - Available vs total count (availability ratio — supply signal)
 *   - Visual size proportional to total value (value-weighted, not count-weighted)
 *
 * This gives investors an instant portfolio overview by geography:
 * "Hadera: ₪5.4M total, 8 plots, +156% avg ROI" — Madlan only shows count.
 *
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

  // Compute city clusters with enriched investment metrics
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
      const available = data.plots.filter(p => p.status === 'AVAILABLE').length

      // Portfolio metrics — total value, total projected, average ROI
      let totalValue = 0
      let totalProjected = 0
      let roiSum = 0
      let roiCount = 0
      for (const p of data.plots) {
        const price = p.total_price ?? p.totalPrice ?? 0
        const proj = p.projected_value ?? p.projectedValue ?? 0
        totalValue += price
        totalProjected += proj
        if (price > 0) {
          roiSum += ((proj - price) / price) * 100
          roiCount++
        }
      }
      const avgRoi = roiCount > 0 ? Math.round(roiSum / roiCount) : 0
      const avgPrice = count > 0 ? Math.round(totalValue / count) : 0

      return { city, lat, lng, count, avgPrice, available, totalValue, totalProjected, avgRoi, plots: data.plots }
    }).filter(Boolean)
  }, [plots])

  // Only show clusters when zoomed out
  useEffect(() => {
    if (zoom >= 12) return // polygons visible, no clusters needed

    // Compute max total value for proportional sizing
    const maxValue = Math.max(...clusters.map(c => c.totalValue), 1)

    const markers = clusters.map(cluster => {
      // Size proportional to total portfolio value (not just count).
      // Investors care about capital concentration, not plot count.
      // A cluster with 2 plots worth ₪10M should be bigger than one with 5 plots worth ₪500K.
      const valueFraction = cluster.totalValue / maxValue
      const size = Math.min(90, Math.max(50, 40 + valueFraction * 50))

      // ROI color — green (high), amber (medium), red (low)
      const roiColor = cluster.avgRoi >= 100 ? '#22C55E'
        : cluster.avgRoi >= 50 ? '#F59E0B'
        : cluster.avgRoi >= 0 ? '#F97316'
        : '#EF4444'

      // Availability ratio for the ring opacity — higher availability = more opaque gold ring
      const availRatio = cluster.count > 0 ? cluster.available / cluster.count : 0
      const ringOpacity = 0.3 + availRatio * 0.5 // 0.3 to 0.8

      const icon = L.divIcon({
        className: 'city-cluster-marker',
        html: `<div class="city-cluster-bubble" style="width:${size}px;height:${size}px;box-shadow:0 0 0 3px rgba(200,148,42,${ringOpacity}),0 4px 20px rgba(0,0,0,0.4)">
          <div class="city-cluster-city">${cluster.city}</div>
          <div class="city-cluster-count">${cluster.available}<span style="opacity:0.5;font-weight:400">/${cluster.count}</span></div>
          <div class="city-cluster-price">${formatPriceShort(cluster.totalValue)}</div>
          <div style="font-size:8px;font-weight:700;color:${roiColor};line-height:1;margin-top:1px">+${cluster.avgRoi}% ROI</div>
        </div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })
      const marker = L.marker([cluster.lat, cluster.lng], { icon })
      marker.on('click', () => {
        map.flyTo([cluster.lat, cluster.lng], 13, { duration: 0.8 })
      })
      // Tooltip on hover with full details — like Bloomberg terminal's geographic overlay
      marker.bindTooltip(
        `<div style="text-align:center;font-family:inherit">
          <strong>${cluster.city}</strong><br/>
          <span style="color:#C8942A">${cluster.available} זמינות</span> מתוך ${cluster.count}<br/>
          סה״כ ${formatPriceShort(cluster.totalValue)}<br/>
          <span style="color:${roiColor}">ROI ממוצע +${cluster.avgRoi}%</span>
        </div>`,
        { direction: 'top', offset: [0, -size / 2 - 5], className: 'city-cluster-tooltip' }
      )
      return marker
    })

    const layerGroup = L.layerGroup(markers).addTo(map)
    return () => { map.removeLayer(layerGroup) }
  }, [zoom, clusters, map])

  return null
}
