import { MapContainer, TileLayer, Polygon, Popup, Tooltip, Marker, ZoomControl, useMap, LayersControl } from 'react-leaflet'
import L from 'leaflet'
import { useState, useEffect } from 'react'
import { MapPin, Eye, Check, ArrowLeft, Navigation, Layers } from 'lucide-react'
import { statusColors, statusLabels, zoningLabels } from '../utils/constants'
import { formatCurrency, formatPriceShort } from '../utils/formatters'

function FlyToSelected({ plot }) {
  const map = useMap()

  useEffect(() => {
    if (!plot) return
    const coords = plot.coordinates
    const lat = coords.reduce((sum, c) => sum + c[0], 0) / coords.length
    const lng = coords.reduce((sum, c) => sum + c[1], 0) / coords.length
    map.flyTo([lat, lng], 15, { duration: 1.2 })
  }, [plot, map])

  return null
}

function LocateButton() {
  const map = useMap()
  const [locating, setLocating] = useState(false)

  const handleLocate = () => {
    setLocating(true)
    map.locate({ setView: true, maxZoom: 14 })
    map.once('locationfound', () => setLocating(false))
    map.once('locationerror', () => setLocating(false))
    // timeout fallback
    setTimeout(() => setLocating(false), 8000)
  }

  return (
    <div className="absolute bottom-40 left-4 z-[30] pointer-events-none">
      <button
        onClick={handleLocate}
        disabled={locating}
        className="glass-panel w-9 h-9 flex items-center justify-center pointer-events-auto hover:border-gold/20 transition-colors disabled:opacity-50"
        title="המיקום שלי"
      >
        <Navigation className={`w-4 h-4 text-gold ${locating ? 'animate-spin' : ''}`} />
      </button>
    </div>
  )
}

const poiIcon = (poi) =>
  L.divIcon({
    className: 'poi-marker',
    html: `<div class="poi-marker-inner"><span class="poi-marker-emoji">${poi.icon}</span><span class="poi-marker-label">${poi.name}</span></div>`,
    iconSize: [60, 40],
    iconAnchor: [30, 20],
  })

export default function MapArea({ plots, pois = [], selectedPlot, onSelectPlot, statusFilter, onToggleStatus, favorites }) {
  const [hoveredId, setHoveredId] = useState(null)

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer
        center={[32.45, 34.87]}
        zoom={10}
        zoomControl={false}
        className="h-full w-full"
      >
        {/* Satellite base layer for rich visuals */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; Esri, Maxar, Earthstar Geographics'
        />
        {/* Semi-transparent label overlay for readability */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap'
          opacity={0.7}
        />
        <ZoomControl position="bottomleft" />
        <FlyToSelected plot={selectedPlot} />

        {plots.map((plot) => {
          const color = statusColors[plot.status]
          const isHovered = hoveredId === plot.id
          const price = plot.total_price ?? plot.totalPrice
          const projValue = plot.projected_value ?? plot.projectedValue
          const roi = Math.round((projValue - price) / price * 100)
          const blockNum = plot.block_number ?? plot.blockNumber
          const sizeSqM = plot.size_sqm ?? plot.sizeSqM
          const zoningStage = plot.zoning_stage ?? plot.zoningStage
          const readiness = plot.readiness_estimate ?? plot.readinessEstimate

          return (
            <Polygon
              key={plot.id}
              positions={plot.coordinates}
              pathOptions={{
                color: isHovered ? '#FFFFFF' : color,
                fillColor: color,
                fillOpacity: isHovered ? 0.6 : 0.45,
                weight: isHovered ? 4 : 2.5,
                dashArray: isHovered ? '' : '6 4',
              }}
              eventHandlers={{
                click: () => onSelectPlot(plot),
                mouseover: () => setHoveredId(plot.id),
                mouseout: () => setHoveredId(null),
              }}
            >
              <Tooltip permanent direction="center" className="price-tooltip">
                {favorites?.isFavorite(plot.id) ? '❤️ ' : ''}{formatPriceShort(price)}
              </Tooltip>

              <Popup>
                <div className="plot-popup">
                  <div className="plot-popup-header">
                    <span className="plot-popup-title">
                      גוש {blockNum} | חלקה {plot.number}
                    </span>
                    <span
                      className="plot-popup-status"
                      style={{ background: `${color}20`, color }}
                    >
                      {statusLabels[plot.status]}
                    </span>
                  </div>
                  <div className="plot-popup-row">
                    <span className="plot-popup-label">שטח</span>
                    <span className="plot-popup-value">{sizeSqM.toLocaleString()} מ&quot;ר</span>
                  </div>
                  <div className="plot-popup-row">
                    <span className="plot-popup-label">מחיר</span>
                    <span className="plot-popup-value gold">{formatCurrency(price)}</span>
                  </div>
                  <div className="plot-popup-row">
                    <span className="plot-popup-label">ייעוד</span>
                    <span className="plot-popup-value">{zoningLabels[zoningStage]}</span>
                  </div>

                  <div className="plot-popup-badges">
                    <span className="plot-popup-badge plot-popup-badge-roi">
                      +{roi}% ROI
                    </span>
                    {readiness && (
                      <span className="plot-popup-badge plot-popup-badge-time">
                        {readiness}
                      </span>
                    )}
                  </div>

                  <button
                    className="plot-popup-cta"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectPlot(plot)
                    }}
                  >
                    <span>צפה בפרטים</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </div>
              </Popup>
            </Polygon>
          )
        })}

        {pois.map((poi, idx) => (
          <Marker key={idx} position={poi.coordinates} icon={poiIcon(poi)} />
        ))}
      </MapContainer>

      {/* Map vignette overlay */}
      <div className="map-vignette" />
      {/* Map noise texture */}
      <div className="map-noise" />

      {/* Top-left: Brand badge */}
      <div className="absolute top-4 left-4 z-[30] pointer-events-none">
        <div className="glass-panel px-4 py-3 pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏗️</span>
            <div>
              <div className="text-sm font-bold brand-text">LandMap Israel</div>
              <div className="text-[10px] text-slate-400">מפת קרקעות להשקעה</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom-right: Interactive Legend */}
      <div className="absolute bottom-6 right-4 z-[30] pointer-events-none">
        <div className="glass-panel px-3 py-2.5 pointer-events-auto">
          <div className="flex flex-col gap-0.5">
            {Object.entries(statusColors).map(([status, color]) => {
              const isActive = statusFilter.length === 0 || statusFilter.includes(status)
              return (
                <div
                  key={status}
                  className={`legend-item ${!isActive ? 'inactive' : ''}`}
                  onClick={() => onToggleStatus(status)}
                >
                  <div
                    className="legend-item-check"
                    style={{ background: isActive ? color : 'rgba(100,116,139,0.3)' }}
                  >
                    {isActive && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <span className="text-slate-300">{statusLabels[status]}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom-left (above zoom): Plot count badge */}
      <div className="absolute bottom-24 left-4 z-[30] pointer-events-none">
        <div className="glass-panel px-3 py-1.5 pointer-events-auto flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-gold" />
          <span className="text-xs text-slate-300">{plots.length} חלקות</span>
        </div>
      </div>

      {/* Empty state */}
      {plots.length === 0 && (
        <div className="absolute inset-0 z-[20] flex items-center justify-center pointer-events-none">
          <div className="glass-panel px-8 py-6 text-center pointer-events-auto">
            <div className="text-3xl mb-3">🔍</div>
            <div className="text-sm font-medium text-slate-300 mb-1">לא נמצאו חלקות</div>
            <div className="text-xs text-slate-500">נסה לשנות את הסינון</div>
          </div>
        </div>
      )}
    </div>
  )
}
