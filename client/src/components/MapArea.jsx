import { MapContainer, TileLayer, Polygon, Popup, Tooltip, Marker, ZoomControl, useMap, LayersControl } from 'react-leaflet'
import L from 'leaflet'
import { useState, useEffect, useCallback, useRef } from 'react'
import { MapPin, Eye, Check, ArrowLeft, Navigation, Layers, Map as MapIcon } from 'lucide-react'
import { statusColors, statusLabels, zoningLabels } from '../utils/constants'
import { formatCurrency, formatPriceShort, formatDunam } from '../utils/formatters'
import { usePrefetchPlot } from '../hooks/usePlots'
import MapClusterLayer from './MapClusterLayer'

function FlyToSelected({ plot }) {
  const map = useMap()

  useEffect(() => {
    if (!plot?.coordinates?.length) return
    const coords = plot.coordinates
    const validCoords = coords.filter(c => Array.isArray(c) && c.length >= 2 && isFinite(c[0]) && isFinite(c[1]))
    if (validCoords.length === 0) return
    const lat = validCoords.reduce((sum, c) => sum + c[0], 0) / validCoords.length
    const lng = validCoords.reduce((sum, c) => sum + c[1], 0) / validCoords.length
    if (!isFinite(lat) || !isFinite(lng)) return
    map.flyTo([lat, lng], 15, { duration: 1.2 })
  }, [plot, map])

  return null
}

function AutoFitBounds({ plots }) {
  const map = useMap()
  const fitted = useRef(false)

  useEffect(() => {
    if (fitted.current || !plots || plots.length === 0) return
    const allCoords = []
    plots.forEach(p => {
      if (!p.coordinates || !Array.isArray(p.coordinates)) return
      p.coordinates.forEach(c => {
        if (Array.isArray(c) && c.length >= 2 && isFinite(c[0]) && isFinite(c[1])) {
          allCoords.push(c)
        }
      })
    })
    if (allCoords.length < 2) return
    const bounds = L.latLngBounds(allCoords)
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14, animate: true, duration: 1 })
      fitted.current = true
    }
  }, [plots, map])

  return null
}

const MAP_LAYERS = [
  {
    id: 'satellite',
    label: 'לוויין',
    emoji: '🛰️',
    tiles: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    showLabels: true,
  },
  {
    id: 'street',
    label: 'רחובות',
    emoji: '🗺️',
    tiles: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    showLabels: false,
  },
  {
    id: 'topo',
    label: 'טופוגרפי',
    emoji: '⛰️',
    tiles: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap',
    showLabels: false,
  },
  {
    id: 'dark',
    label: 'כהה',
    emoji: '🌙',
    tiles: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO',
    showLabels: false,
  },
]

function MapLayerSwitcher({ activeLayer, onChangeLayer }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="absolute top-4 right-4 z-[1000] pointer-events-none">
      <div className="pointer-events-auto relative">
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className="glass-panel w-9 h-9 flex items-center justify-center hover:border-gold/20 transition-colors"
          style={{ minWidth: 44, minHeight: 44 }}
          title="שכבות מפה"
          aria-label="שכבות מפה"
        >
          <Layers className="w-4 h-4 text-gold" />
        </button>
        {isOpen && (
          <div className="absolute top-12 right-0 glass-panel p-2 min-w-[140px] flex flex-col gap-1" dir="rtl">
            {MAP_LAYERS.map(layer => (
              <button
                key={layer.id}
                onClick={() => { onChangeLayer(layer.id); setIsOpen(false) }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                  activeLayer === layer.id
                    ? 'bg-gold/15 text-gold font-medium'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <span>{layer.emoji}</span>
                <span>{layer.label}</span>
                {activeLayer === layer.id && <Check className="w-3 h-3 mr-auto" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
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
    <div className="absolute bottom-40 sm:bottom-32 left-4 z-[1000] pointer-events-none">
      <button
        onClick={handleLocate}
        disabled={locating}
        className="glass-panel w-9 h-9 sm:w-9 sm:h-9 flex items-center justify-center pointer-events-auto hover:border-gold/20 transition-colors disabled:opacity-50"
        style={{ minWidth: 44, minHeight: 44 }}
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
  const [activeLayerId, setActiveLayerId] = useState('satellite')
  const prefetchPlot = usePrefetchPlot()
  const activeLayer = MAP_LAYERS.find(l => l.id === activeLayerId) || MAP_LAYERS[0]

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer
        center={[32.45, 34.87]}
        zoom={10}
        zoomControl={false}
        className="h-full w-full"
      >
        {/* Dynamic base layer */}
        <TileLayer
          key={activeLayer.id}
          url={activeLayer.tiles}
          attribution={activeLayer.attribution}
        />
        {/* Label overlay for satellite/topo */}
        {activeLayer.showLabels && (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap'
            opacity={0.7}
          />
        )}
        <ZoomControl position="bottomleft" />
        <AutoFitBounds plots={plots} />
        <FlyToSelected plot={selectedPlot} />
        <LocateButton />
        <MapClusterLayer plots={plots} onSelectPlot={onSelectPlot} />

        {plots.map((plot) => {
          // Validate coordinates before rendering polygon
          if (!plot.coordinates || !Array.isArray(plot.coordinates) || plot.coordinates.length < 3) return null
          const hasValidCoords = plot.coordinates.every(
            (c) => Array.isArray(c) && c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number' && isFinite(c[0]) && isFinite(c[1])
          )
          if (!hasValidCoords) return null

          const color = statusColors[plot.status]
          const isHovered = hoveredId === plot.id
          const price = plot.total_price ?? plot.totalPrice
          const projValue = plot.projected_value ?? plot.projectedValue
          const roi = price > 0 ? Math.round((projValue - price) / price * 100) : 0
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
                mouseover: () => { setHoveredId(plot.id); prefetchPlot(plot.id) },
                mouseout: () => setHoveredId(null),
              }}
            >
              <Tooltip permanent direction="center" className="price-tooltip">
                <span className="tooltip-main-price">{favorites?.isFavorite(plot.id) ? '❤️ ' : ''}{plot.plot_images?.length > 0 ? '📷 ' : ''}{formatPriceShort(price)}</span>
                <span className="tooltip-sub">{formatDunam(sizeSqM)} דונם · +{roi}% · ₪{sizeSqM > 0 ? Math.round(price / sizeSqM).toLocaleString() : '—'}/מ״ר</span>
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
                    <span className="plot-popup-value">{formatDunam(sizeSqM)} דונם ({sizeSqM.toLocaleString()} מ&quot;ר)</span>
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

      {/* Map layer switcher */}
      <MapLayerSwitcher activeLayer={activeLayerId} onChangeLayer={setActiveLayerId} />

      {/* Map vignette overlay */}
      <div className="map-vignette" />
      {/* Map noise texture */}
      <div className="map-noise" />

      {/* Top-left: Brand badge — compact on mobile */}
      <div className="absolute top-4 left-4 z-[1000] pointer-events-none hidden sm:block">
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
      {/* Mobile brand badge — smaller, bottom-left above zoom */}
      <div className="absolute top-3 left-3 z-[1000] pointer-events-none sm:hidden">
        <div className="glass-panel px-2.5 py-1.5 pointer-events-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🏗️</span>
            <span className="text-[11px] font-bold brand-text">LandMap</span>
          </div>
        </div>
      </div>

      {/* Bottom-right: Interactive Legend — hidden on mobile, positioned above card strip */}
      <div className="absolute bottom-40 right-4 z-[1000] pointer-events-none hidden sm:block">
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

      {/* Bottom-left (above zoom): Plot count badge — repositioned on mobile */}
      <div className="absolute bottom-24 sm:bottom-24 left-4 z-[1000] pointer-events-none hidden sm:flex">
        <div className="glass-panel px-3 py-1.5 pointer-events-auto flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-gold" />
          <span className="text-xs text-slate-300">{plots.length} חלקות</span>
        </div>
      </div>

      {/* Empty state */}
      {plots.length === 0 && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center pointer-events-none">
          <div className="glass-panel px-8 py-8 text-center pointer-events-auto max-w-xs">
            <div className="text-4xl mb-4">🏜️</div>
            <div className="text-base font-bold text-slate-200 mb-2">לא נמצאו חלקות</div>
            <div className="text-xs text-slate-400 mb-4 leading-relaxed">
              נסה להרחיב את הסינון — הסר מסננים או בחר עיר אחרת
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <div className="text-[10px] text-slate-500 bg-white/5 px-3 py-1.5 rounded-lg">💡 הסר מסנן מחיר</div>
              <div className="text-[10px] text-slate-500 bg-white/5 px-3 py-1.5 rounded-lg">💡 בחר "כל הערים"</div>
              <div className="text-[10px] text-slate-500 bg-white/5 px-3 py-1.5 rounded-lg">💡 הסר סינון סטטוס</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
