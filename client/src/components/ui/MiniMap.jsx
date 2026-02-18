import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, Polygon, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { ExternalLink, Eye, Map as MapIcon } from 'lucide-react'
import { statusColors } from '../../utils/constants'

// Gold pin icon
const pinIcon = L.divIcon({
  className: 'mini-map-pin',
  html: `<div style="width:24px;height:24px;background:#C8942A;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center"><div style="width:6px;height:6px;background:#fff;border-radius:50%"></div></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

function FitBounds({ bounds }) {
  const map = useMap()
  useMemo(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16, animate: false })
    }
  }, [bounds, map])
  return null
}

/**
 * MiniMap — shows a small, non-interactive map preview of a plot's location.
 * Used on PlotDetail page and optionally in the sidebar header.
 *
 * Props:
 * - coordinates: [[lat, lng], ...] polygon coords
 * - status: plot status for polygon color
 * - city: city name
 * - className: optional wrapper class
 * - interactive: allow zoom/pan (default false)
 * - height: css height (default '200px')
 */
export default function MiniMap({ coordinates, status, city, className = '', interactive = false, height = '200px', showStreetViewToggle = false }) {
  const [viewMode, setViewMode] = useState('map') // 'map' | 'streetview'
  const validCoords = useMemo(() => {
    if (!coordinates || !Array.isArray(coordinates)) return []
    return coordinates.filter(c => Array.isArray(c) && c.length >= 2 && isFinite(c[0]) && isFinite(c[1]))
  }, [coordinates])

  const center = useMemo(() => {
    if (validCoords.length === 0) return [32.45, 34.87]
    const lat = validCoords.reduce((s, c) => s + c[0], 0) / validCoords.length
    const lng = validCoords.reduce((s, c) => s + c[1], 0) / validCoords.length
    return [lat, lng]
  }, [validCoords])

  const bounds = useMemo(() => {
    if (validCoords.length < 2) return null
    return L.latLngBounds(validCoords)
  }, [validCoords])

  const color = statusColors[status] || '#C8942A'

  if (validCoords.length === 0) return null

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${center[0]},${center[1]}`
  const streetViewEmbedUrl = `https://maps.google.com/maps?q=&layer=c&cbll=${center[0]},${center[1]}&cbp=11,0,0,0,0&ie=UTF8&source=embed&output=svembed`

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-white/10 group ${className}`} style={{ height }}>
      {/* Street View / Map toggle */}
      {showStreetViewToggle && (
        <div className="absolute top-3 left-3 z-20 flex bg-navy/80 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden">
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium transition-all ${
              viewMode === 'map'
                ? 'bg-gold/20 text-gold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="מפה"
          >
            <MapIcon className="w-3 h-3" />
            מפה
          </button>
          <button
            onClick={() => setViewMode('streetview')}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium transition-all ${
              viewMode === 'streetview'
                ? 'bg-gold/20 text-gold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Street View"
          >
            <Eye className="w-3 h-3" />
            רחוב
          </button>
        </div>
      )}

      {/* Street View iframe */}
      {viewMode === 'streetview' && showStreetViewToggle ? (
        <iframe
          src={streetViewEmbedUrl}
          className="w-full h-full border-0"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Google Street View"
        />
      ) : (
      <MapContainer
        center={center}
        zoom={15}
        zoomControl={false}
        dragging={interactive}
        touchZoom={interactive}
        doubleClickZoom={interactive}
        scrollWheelZoom={interactive}
        boxZoom={false}
        keyboard={false}
        attributionControl={false}
        className="h-full w-full"
        style={{ background: '#0a1628' }}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
          opacity={0.7}
        />
        {bounds && <FitBounds bounds={bounds} />}
        {validCoords.length >= 3 && (
          <Polygon
            positions={validCoords}
            pathOptions={{
              color: '#fff',
              fillColor: color,
              fillOpacity: 0.5,
              weight: 2,
            }}
          />
        )}
        <Marker position={center} icon={pinIcon} />
      </MapContainer>

      )}

      {/* Overlay gradient */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-navy/60 via-transparent to-transparent" />

      {/* Open in Google Maps link */}
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-navy/80 backdrop-blur-sm border border-white/10 rounded-xl text-[11px] text-slate-300 hover:border-gold/30 hover:text-gold transition-all opacity-0 group-hover:opacity-100"
      >
        <ExternalLink className="w-3 h-3" />
        פתח במפה
      </a>

      {/* City label */}
      {city && (
        <div className="absolute top-3 right-3 z-10 px-2.5 py-1 bg-navy/70 backdrop-blur-sm rounded-lg text-[11px] text-slate-300 border border-white/10">
          📍 {city}
        </div>
      )}
    </div>
  )
}
