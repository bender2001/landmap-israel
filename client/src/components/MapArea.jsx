import { MapContainer, TileLayer, Polygon, Popup, Tooltip, Marker, Circle, ZoomControl, useMap, LayersControl } from 'react-leaflet'
import L from 'leaflet'
import { useState, useEffect, useCallback, useRef, useMemo, memo, forwardRef } from 'react'
import { MapPin, Eye, Check, ArrowLeft, Navigation, Layers, Map as MapIcon } from 'lucide-react'
import { statusColors, statusLabels, zoningLabels } from '../utils/constants'
import { formatCurrency, formatPriceShort, formatDunam, calcInvestmentScore, getScoreLabel } from '../utils/formatters'
import { usePrefetchPlot } from '../hooks/usePlots'
import MapClusterLayer from './MapClusterLayer'
import MapRuler from './MapRuler'
import MapHeatLayer from './MapHeatLayer'

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
  const ref = useRef(null)

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false)
    }
    function handleKey(e) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen])

  return (
    <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-[1000] pointer-events-none">
      <div className="pointer-events-auto relative" ref={ref}>
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className="glass-panel w-9 h-9 flex items-center justify-center hover:border-gold/20 transition-colors"
          style={{ minWidth: 44, minHeight: 44 }}
          title="שכבות מפה"
          aria-label="שכבות מפה"
          aria-expanded={isOpen}
        >
          <Layers className="w-4 h-4 text-gold" />
        </button>
        {isOpen && (
          <div className="absolute top-12 right-0 glass-panel p-2 min-w-[140px] flex flex-col gap-1" dir="rtl" role="listbox" aria-label="שכבות מפה">
            {MAP_LAYERS.map(layer => (
              <button
                key={layer.id}
                role="option"
                aria-selected={activeLayer === layer.id}
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

/**
 * User location blue dot — renders a pulsing blue circle at the user's geolocation.
 * Like Google Maps / Madlan's "you are here" indicator. Appears after geolocation is triggered
 * and stays visible until the component unmounts or location changes.
 */
function UserLocationMarker() {
  const map = useMap()
  const [position, setPosition] = useState(null)
  const [accuracy, setAccuracy] = useState(0)

  useEffect(() => {
    const onFound = (e) => {
      setPosition(e.latlng)
      setAccuracy(e.accuracy)
    }
    map.on('locationfound', onFound)
    return () => { map.off('locationfound', onFound) }
  }, [map])

  if (!position) return null

  const blueDotIcon = L.divIcon({
    className: 'user-location-marker',
    html: `<div class="user-dot-outer"><div class="user-dot-inner"></div></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })

  return (
    <>
      {/* Accuracy circle — shows GPS precision radius */}
      {accuracy > 0 && accuracy < 2000 && (
        <Circle
          center={position}
          radius={accuracy}
          pathOptions={{ color: '#4285F4', fillColor: '#4285F4', fillOpacity: 0.08, weight: 1, opacity: 0.3 }}
        />
      )}
      <Marker position={position} icon={blueDotIcon} zIndexOffset={9999}>
        <Tooltip direction="top" offset={[0, -14]} className="user-location-tooltip">
          <span className="text-[11px]">📍 המיקום שלך</span>
        </Tooltip>
      </Marker>
    </>
  )
}

/** Compact toolbar with locate + recenter + fullscreen grouped vertically above zoom */
function MapToolbar({ plots }) {
  const map = useMap()
  const [locating, setLocating] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const handleLocate = () => {
    setLocating(true)
    map.locate({ setView: true, maxZoom: 14 })
    map.once('locationfound', () => setLocating(false))
    map.once('locationerror', () => setLocating(false))
    setTimeout(() => setLocating(false), 8000)
  }

  const handleRecenter = useCallback(() => {
    if (!plots || plots.length === 0) return
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
      map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 14, duration: 1.2 })
    }
  }, [plots, map])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen().catch(() => {})
    }
  }, [])

  const btnClass = "w-9 h-9 flex items-center justify-center hover:border-gold/20 transition-colors hover:bg-white/5"

  return (
    <div className="absolute bottom-[14rem] sm:bottom-[15rem] left-3 z-[1000] pointer-events-none">
      <div className="glass-panel pointer-events-auto flex flex-col divide-y divide-white/10 overflow-hidden">
        <button onClick={handleLocate} disabled={locating} className={`${btnClass} disabled:opacity-50`} title="המיקום שלי">
          <Navigation className={`w-4 h-4 text-gold ${locating ? 'animate-spin' : ''}`} />
        </button>
        <button onClick={handleRecenter} className={btnClass} title="הצג את כל החלקות">
          <MapIcon className="w-4 h-4 text-gold" />
        </button>
        <button onClick={toggleFullscreen} className={`${btnClass} hidden sm:flex`} title={isFullscreen ? 'צא ממסך מלא' : 'מסך מלא'}>
          {isFullscreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          )}
        </button>
      </div>
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

const COLOR_MODES = [
  { id: 'status', label: 'סטטוס', emoji: '🏷️' },
  { id: 'price', label: 'מחיר/מ״ר', emoji: '💰' },
  { id: 'roi', label: 'תשואה', emoji: '📈' },
  { id: 'heatmap', label: 'מפת חום', emoji: '🌡️' },
]

function getHeatColor(value, min, max) {
  const t = max > min ? (value - min) / (max - min) : 0.5
  // Green (good deal) → Yellow → Red (expensive)
  const r = Math.round(t < 0.5 ? t * 2 * 255 : 255)
  const g = Math.round(t < 0.5 ? 255 : (1 - (t - 0.5) * 2) * 255)
  return `rgb(${r},${g},60)`
}

function getRoiColor(roi) {
  // Higher ROI = more green
  if (roi >= 200) return '#22C55E'
  if (roi >= 150) return '#4ADE80'
  if (roi >= 100) return '#84CC16'
  if (roi >= 50) return '#EAB308'
  return '#EF4444'
}

function ColorModeToggle({ colorMode, onChangeColorMode }) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef(null)

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false)
    }
    function handleKey(e) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen])

  return (
    <div className="absolute top-[52px] sm:top-[60px] right-3 sm:right-4 z-[1000] pointer-events-none">
      <div className="pointer-events-auto relative" ref={ref}>
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className="glass-panel w-9 h-9 flex items-center justify-center hover:border-gold/20 transition-colors"
          style={{ minWidth: 44, minHeight: 44 }}
          title="צביעת חלקות"
          aria-label="צביעת חלקות"
          aria-expanded={isOpen}
        >
          <span className="text-sm">{COLOR_MODES.find(m => m.id === colorMode)?.emoji || '🏷️'}</span>
        </button>
        {isOpen && (
          <div className="absolute top-12 right-0 glass-panel p-2 min-w-[130px] flex flex-col gap-1" dir="rtl" role="listbox" aria-label="צביעת חלקות">
            {COLOR_MODES.map(mode => (
              <button
                key={mode.id}
                role="option"
                aria-selected={colorMode === mode.id}
                onClick={() => { onChangeColorMode(mode.id); setIsOpen(false) }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                  colorMode === mode.id
                    ? 'bg-gold/15 text-gold font-medium'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <span>{mode.emoji}</span>
                <span>{mode.label}</span>
                {colorMode === mode.id && <Check className="w-3 h-3 mr-auto" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function GeoSearch() {
  const map = useMap()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus()
  }, [isOpen])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  const search = useCallback(async (q) => {
    if (!q || q.length < 2) { setResults([]); return }
    // Cancel previous in-flight request
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setIsSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ' Israel')}&limit=5&accept-language=he`,
        { signal: controller.signal }
      )
      const data = await res.json()
      setResults(data.map(r => ({ name: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) })))
    } catch (err) {
      if (err.name !== 'AbortError') setResults([])
      else return // Don't clear isSearching on abort — next request handles it
    }
    setIsSearching(false)
  }, [])

  const handleInput = (val) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 400)
  }

  const handleSelect = (result) => {
    map.flyTo([result.lat, result.lng], 15, { duration: 1.2 })
    setIsOpen(false)
    setQuery('')
    setResults([])
  }

  if (!isOpen) {
    return (
      <div className="absolute top-[100px] sm:top-[116px] right-3 sm:right-4 z-[1000] pointer-events-none">
        <button
          onClick={() => setIsOpen(true)}
          className="glass-panel w-9 h-9 flex items-center justify-center pointer-events-auto hover:border-gold/20 transition-colors"
          style={{ minWidth: 44, minHeight: 44 }}
          title="חפש כתובת במפה"
          aria-label="חפש כתובת"
        >
          <MapPin className="w-4 h-4 text-gold" />
        </button>
      </div>
    )
  }

  return (
    <div className="absolute top-[100px] sm:top-[116px] right-3 sm:right-4 z-[1000] pointer-events-none">
      <div className="pointer-events-auto glass-panel p-2 min-w-[220px]" dir="rtl">
        <div className="flex items-center gap-2 mb-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') { setIsOpen(false); setQuery(''); setResults([]) } }}
            placeholder="חפש כתובת, עיר..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-gold/30"
          />
          <button onClick={() => { setIsOpen(false); setQuery(''); setResults([]) }} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
        </div>
        {isSearching && <div className="text-[10px] text-slate-500 px-1">מחפש...</div>}
        {results.length > 0 && (
          <div className="space-y-0.5 max-h-40 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => handleSelect(r)}
                className="w-full text-right text-[11px] text-slate-300 hover:text-gold hover:bg-white/5 px-2 py-1.5 rounded-lg transition-colors truncate"
              >
                📍 {r.name.split(',').slice(0, 3).join(', ')}
              </button>
            ))}
          </div>
        )}
        {query.length >= 2 && !isSearching && results.length === 0 && (
          <div className="text-[10px] text-slate-500 px-1">לא נמצאו תוצאות</div>
        )}
      </div>
    </div>
  )
}

/**
 * Memoized individual plot polygon — prevents re-rendering ALL polygons
 * when only one is hovered/selected. Each polygon only re-renders when
 * its own props change (hover state, color mode, favorites, compare).
 */
const PlotPolygon = memo(function PlotPolygon({ plot, color, isHovered, onSelectPlot, onHover, onHoverEnd, prefetchPlot, favorites, compareIds, onToggleCompare, areaAvgPsm }) {
  const price = plot.total_price ?? plot.totalPrice
  const projValue = plot.projected_value ?? plot.projectedValue
  const roi = price > 0 ? Math.round((projValue - price) / price * 100) : 0
  const blockNum = plot.block_number ?? plot.blockNumber
  const sizeSqM = plot.size_sqm ?? plot.sizeSqM
  const zoningStage = plot.zoning_stage ?? plot.zoningStage
  const readiness = plot.readiness_estimate ?? plot.readinessEstimate
  // Freshness: "new listing" indicator (like Madlan/Yad2 "חדש!")
  const createdAt = plot.created_at ?? plot.createdAt
  const isNew = createdAt && (Date.now() - new Date(createdAt).getTime()) < 7 * 86400000

  const handleClick = useCallback(() => onSelectPlot(plot), [onSelectPlot, plot])
  const handleMouseOver = useCallback(() => { onHover(plot.id); prefetchPlot(plot.id) }, [onHover, prefetchPlot, plot.id])
  const handleMouseOut = useCallback(() => onHoverEnd(), [onHoverEnd])

  return (
    <Polygon
      positions={plot.coordinates}
      pathOptions={{
        color: isHovered ? '#FFFFFF' : color,
        fillColor: color,
        fillOpacity: isHovered ? 0.6 : 0.45,
        weight: isHovered ? 4 : 2.5,
        dashArray: isHovered ? '' : '6 4',
      }}
      eventHandlers={{
        click: handleClick,
        mouseover: handleMouseOver,
        mouseout: handleMouseOut,
      }}
    >
      <Tooltip permanent direction="center" className="price-tooltip">
        <span className="tooltip-main-price">{isNew ? '🆕 ' : ''}{favorites?.isFavorite(plot.id) ? '❤️ ' : ''}{plot.plot_images?.length > 0 ? '📷 ' : ''}{formatPriceShort(price)}</span>
        <span className="tooltip-sub">{formatDunam(sizeSqM)} דונם · {sizeSqM > 0 ? `₪${Math.round(price / sizeSqM).toLocaleString()}/מ״ר` : ''} · +{roi}%</span>
        {(() => {
          const avg = areaAvgPsm?.[plot.city]
          if (!avg || sizeSqM <= 0) return null
          const plotPsm = price / sizeSqM
          const diffPct = Math.round(((plotPsm - avg) / avg) * 100)
          if (diffPct >= -5) return null
          return <span className="tooltip-deal-badge">🔥 {Math.abs(diffPct)}% מתחת לממוצע</span>
        })()}
      </Tooltip>

      <Popup>
        <div className="plot-popup">
          {plot.plot_images && plot.plot_images.length > 0 && (
            <div className="plot-popup-images">
              {plot.plot_images.slice(0, 3).map((img, i) => (
                <div key={img.id || i} className="plot-popup-image-thumb">
                  <img
                    src={img.url}
                    alt={img.alt || `גוש ${blockNum} — תמונה ${i + 1}`}
                    loading="lazy"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                </div>
              ))}
              {plot.plot_images.length > 3 && (
                <div className="plot-popup-image-more">+{plot.plot_images.length - 3}</div>
              )}
            </div>
          )}
          <div className="plot-popup-header">
            <span className="plot-popup-title">
              גוש {blockNum} | חלקה {plot.number}
            </span>
            <span className="plot-popup-status" style={{ background: `${color}20`, color }}>
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
            <span className="plot-popup-badge plot-popup-badge-roi">+{roi}% ROI</span>
            {readiness && <span className="plot-popup-badge plot-popup-badge-time">{readiness}</span>}
            {(() => {
              const score = calcInvestmentScore(plot)
              const { label, color: scoreColor } = getScoreLabel(score)
              return (
                <span className="plot-popup-badge" style={{ background: `${scoreColor}20`, color: scoreColor, border: `1px solid ${scoreColor}40` }}>
                  {score}/10 {label}
                </span>
              )
            })()}
            {(() => {
              const avg = areaAvgPsm?.[plot.city]
              if (!avg || sizeSqM <= 0) return null
              const plotPsm = price / sizeSqM
              const diffPct = Math.round(((plotPsm - avg) / avg) * 100)
              if (diffPct >= -5) return null
              return (
                <span className="plot-popup-badge" style={{ background: 'rgba(255,165,0,0.15)', color: '#FFA500', border: '1px solid rgba(255,165,0,0.3)' }}>
                  🔥 {Math.abs(diffPct)}% מתחת לממוצע
                </span>
              )
            })()}
          </div>
          <div className="plot-popup-actions">
            <button className="plot-popup-cta" onClick={(e) => { e.stopPropagation(); onSelectPlot(plot) }}>
              <span>צפה בפרטים</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
            {favorites && (
              <button
                className={`plot-popup-action-btn ${favorites.isFavorite(plot.id) ? 'is-active' : ''}`}
                onClick={(e) => { e.stopPropagation(); favorites.toggle(plot.id) }}
                title={favorites.isFavorite(plot.id) ? 'הסר ממועדפים' : 'הוסף למועדפים'}
              >
                {favorites.isFavorite(plot.id) ? '❤️' : '🤍'}
              </button>
            )}
            {onToggleCompare && (
              <button
                className={`plot-popup-action-btn ${compareIds.includes(plot.id) ? 'is-active' : ''}`}
                onClick={(e) => { e.stopPropagation(); onToggleCompare(plot.id) }}
                title={compareIds.includes(plot.id) ? 'הסר מהשוואה' : 'הוסף להשוואה'}
              >
                {compareIds.includes(plot.id) ? '⚖️' : '📊'}
              </button>
            )}
            <button
              className="plot-popup-action-btn"
              onClick={(e) => {
                e.stopPropagation()
                const url = `${window.location.origin}/plot/${plot.id}`
                navigator.clipboard.writeText(url).then(() => {
                  e.currentTarget.textContent = '✅'
                  setTimeout(() => { e.currentTarget.textContent = '🔗' }, 1500)
                }).catch(() => {})
              }}
              title="העתק קישור לחלקה"
            >
              🔗
            </button>
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(`${window.location.origin}/plot/${plot.id}`)}&text=${encodeURIComponent(`גוש ${blockNum} חלקה ${plot.number} | ${plot.city}\n${formatPriceShort(price)} · +${roi}% ROI`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="plot-popup-action-btn"
              onClick={(e) => e.stopPropagation()}
              title="שתף בטלגרם"
            >
              ✈️
            </a>
          </div>
        </div>
      </Popup>
    </Polygon>
  )
})

/** Helper to validate plot coordinates */
function hasValidCoordinates(plot) {
  if (!plot.coordinates || !Array.isArray(plot.coordinates) || plot.coordinates.length < 3) return false
  return plot.coordinates.every(
    (c) => Array.isArray(c) && c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number' && isFinite(c[0]) && isFinite(c[1])
  )
}

/**
 * "Search this area" button — appears when the user manually pans/zooms the map,
 * like Madlan's "חפש באזור זה". Clicking it filters the plot list (PlotCardStrip,
 * sidebar, etc.) to only plots visible in the current viewport.
 * Hides after click, reappears on next manual move.
 */
function SearchThisAreaButton({ onSearchArea }) {
  const map = useMap()
  const [visible, setVisible] = useState(false)
  const initialFitRef = useRef(true)
  const timeoutRef = useRef(null)

  useEffect(() => {
    // Ignore the first few moves (auto fit-bounds on load)
    const ignoreUntil = Date.now() + 2500
    const handler = () => {
      if (Date.now() < ignoreUntil) return
      initialFitRef.current = false
      // Debounce to avoid flicker
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setVisible(true), 300)
    }
    map.on('moveend', handler)
    map.on('zoomend', handler)
    return () => {
      map.off('moveend', handler)
      map.off('zoomend', handler)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [map])

  const handleClick = useCallback(() => {
    const bounds = map.getBounds()
    onSearchArea({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    })
    setVisible(false)
  }, [map, onSearchArea])

  if (!visible) return null

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1001] pointer-events-none">
      <button
        onClick={handleClick}
        className="pointer-events-auto glass-panel px-4 py-2 flex items-center gap-2 hover:border-gold/30 transition-all hover:shadow-lg hover:shadow-gold/10 animate-fade-in"
        dir="rtl"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <span className="text-xs font-medium text-slate-200">חפש באזור זה</span>
      </button>
    </div>
  )
}

/**
 * Viewport counter — shows "X of Y plots visible" and updates as user pans/zooms.
 * Like Madlan's "X נכסים באזור זה" indicator. Uses plotBounds for efficient
 * AABB intersection test without re-rendering polygons.
 */
function MapViewportCounter({ plots, totalCount }) {
  const map = useMap()
  const [visibleCount, setVisibleCount] = useState(plots.length)

  // Precompute bounding boxes
  const plotBounds = useMemo(() => {
    const result = new Map()
    for (const plot of plots) {
      if (!hasValidCoordinates(plot)) continue
      let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity
      for (const c of plot.coordinates) {
        if (c[0] < minLat) minLat = c[0]
        if (c[0] > maxLat) maxLat = c[0]
        if (c[1] < minLng) minLng = c[1]
        if (c[1] > maxLng) maxLng = c[1]
      }
      result.set(plot.id, { minLat, maxLat, minLng, maxLng })
    }
    return result
  }, [plots])

  const updateCount = useCallback(() => {
    const bounds = map.getBounds()
    const north = bounds.getNorth()
    const south = bounds.getSouth()
    const east = bounds.getEast()
    const west = bounds.getWest()

    let count = 0
    for (const [, bb] of plotBounds) {
      if (bb.maxLat >= south && bb.minLat <= north && bb.maxLng >= west && bb.minLng <= east) {
        count++
      }
    }
    setVisibleCount(count)
  }, [map, plotBounds])

  useEffect(() => {
    updateCount()
    map.on('moveend', updateCount)
    map.on('zoomend', updateCount)
    return () => {
      map.off('moveend', updateCount)
      map.off('zoomend', updateCount)
    }
  }, [map, updateCount])

  if (totalCount === 0) return null

  const isPartial = visibleCount < totalCount

  return (
    <div className="absolute bottom-[11rem] sm:bottom-[12rem] left-4 z-[1000] pointer-events-none flex">
      <div className="glass-panel px-3 py-1.5 pointer-events-auto flex items-center gap-1.5">
        <Eye className="w-3.5 h-3.5 text-gold" />
        <span className="text-xs text-slate-300">
          {isPartial ? (
            <>{visibleCount} <span className="text-slate-500">מתוך</span> {totalCount} חלקות</>
          ) : (
            <>{totalCount} חלקות</>
          )}
        </span>
        {isPartial && (
          <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-pulse" title="הזז/הקטן מפה כדי לראות יותר" />
        )}
      </div>
    </div>
  )
}

/**
 * Viewport-culled polygon renderer — only renders polygons whose bounding box
 * intersects the current map viewport. This is a significant performance win
 * when there are many plots (50+), as Leaflet doesn't need to manage off-screen SVG paths.
 * Re-evaluates on map move/zoom events with debounced updates.
 */
function ViewportCulledPolygons({ plots, plotColors, hoveredId, onSelectPlot, onHover, onHoverEnd, prefetchPlot, favorites, compareIds, onToggleCompare, areaAvgPsm }) {
  const map = useMap()
  const [visiblePlotIds, setVisiblePlotIds] = useState(new Set())
  const boundsRef = useRef(null)

  // Precompute plot bounding boxes (lat/lng) — only recalculate when plots change
  const plotBounds = useMemo(() => {
    const result = new Map()
    for (const plot of plots) {
      if (!hasValidCoordinates(plot)) continue
      let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity
      for (const c of plot.coordinates) {
        if (c[0] < minLat) minLat = c[0]
        if (c[0] > maxLat) maxLat = c[0]
        if (c[1] < minLng) minLng = c[1]
        if (c[1] > maxLng) maxLng = c[1]
      }
      result.set(plot.id, { minLat, maxLat, minLng, maxLng })
    }
    return result
  }, [plots])

  const updateVisibility = useCallback(() => {
    const bounds = map.getBounds()
    // Pad bounds by 20% to preload plots just outside viewport for smoother panning
    const padLat = (bounds.getNorth() - bounds.getSouth()) * 0.2
    const padLng = (bounds.getEast() - bounds.getWest()) * 0.2
    const north = bounds.getNorth() + padLat
    const south = bounds.getSouth() - padLat
    const east = bounds.getEast() + padLng
    const west = bounds.getWest() - padLng

    const visible = new Set()
    for (const [id, bb] of plotBounds) {
      // AABB intersection test
      if (bb.maxLat >= south && bb.minLat <= north && bb.maxLng >= west && bb.minLng <= east) {
        visible.add(id)
      }
    }

    // Also always include hovered plot to prevent flickering
    if (hoveredId) visible.add(hoveredId)

    setVisiblePlotIds(prev => {
      // Only update state if the set actually changed (avoid re-renders)
      if (prev.size === visible.size && [...visible].every(id => prev.has(id))) return prev
      return visible
    })
    boundsRef.current = bounds
  }, [map, plotBounds, hoveredId])

  useEffect(() => {
    updateVisibility()
    map.on('moveend', updateVisibility)
    map.on('zoomend', updateVisibility)
    return () => {
      map.off('moveend', updateVisibility)
      map.off('zoomend', updateVisibility)
    }
  }, [map, updateVisibility])

  // Filter to only visible plots
  const visiblePlots = useMemo(() => {
    return plots.filter(p => visiblePlotIds.has(p.id))
  }, [plots, visiblePlotIds])

  return visiblePlots.map((plot) => (
    <PlotPolygon
      key={plot.id}
      plot={plot}
      color={plotColors[plot.id] || statusColors[plot.status]}
      isHovered={hoveredId === plot.id}
      onSelectPlot={onSelectPlot}
      onHover={onHover}
      onHoverEnd={onHoverEnd}
      prefetchPlot={prefetchPlot}
      favorites={favorites}
      compareIds={compareIds}
      onToggleCompare={onToggleCompare}
      areaAvgPsm={areaAvgPsm}
    />
  ))
}

export default function MapArea({ plots, pois = [], selectedPlot, onSelectPlot, statusFilter, onToggleStatus, favorites, compareIds = [], onToggleCompare, onClearFilters, onFilterChange, onSearchArea }) {
  const [hoveredId, setHoveredId] = useState(null)
  const [activeLayerId, setActiveLayerId] = useState('satellite')
  const [colorMode, setColorMode] = useState('status')
  const prefetchPlot = usePrefetchPlot()
  const activeLayer = MAP_LAYERS.find(l => l.id === activeLayerId) || MAP_LAYERS[0]

  // Stable callbacks for polygon hover (avoid re-creating on each render)
  const handleHover = useCallback((id) => setHoveredId(id), [])
  const handleHoverEnd = useCallback(() => setHoveredId(null), [])

  // Count plots per status for legend
  const statusCounts = useMemo(() => {
    if (!plots || plots.length === 0) return {}
    const counts = {}
    plots.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1 })
    return counts
  }, [plots])

  // Precompute price/sqm range for heatmap
  const priceRange = useMemo(() => {
    if (!plots || plots.length === 0) return { min: 0, max: 1 }
    const values = plots
      .map(p => {
        const price = p.total_price ?? p.totalPrice ?? 0
        const size = p.size_sqm ?? p.sizeSqM ?? 1
        return size > 0 ? price / size : 0
      })
      .filter(v => v > 0)
    return { min: Math.min(...values), max: Math.max(...values) }
  }, [plots])

  // Precompute area average price/sqm for deal indicators on tooltips
  const areaAvgPsm = useMemo(() => {
    if (!plots || plots.length === 0) return {}
    const byCity = {}
    plots.forEach(p => {
      const city = p.city || 'unknown'
      const price = p.total_price ?? p.totalPrice ?? 0
      const size = p.size_sqm ?? p.sizeSqM ?? 1
      if (size <= 0) return
      if (!byCity[city]) byCity[city] = { total: 0, count: 0 }
      byCity[city].total += price / size
      byCity[city].count += 1
    })
    const result = {}
    for (const [city, data] of Object.entries(byCity)) {
      result[city] = Math.round(data.total / data.count)
    }
    return result
  }, [plots])

  // Precompute colors per plot to pass as stable props
  const plotColors = useMemo(() => {
    const colors = {}
    plots.forEach(plot => {
      const price = plot.total_price ?? plot.totalPrice ?? 0
      const projValue = plot.projected_value ?? plot.projectedValue ?? 0
      const sizeSqM = plot.size_sqm ?? plot.sizeSqM ?? 1
      const roi = price > 0 ? Math.round((projValue - price) / price * 100) : 0
      if (colorMode === 'price') {
        const ppsm = sizeSqM > 0 ? price / sizeSqM : 0
        colors[plot.id] = getHeatColor(ppsm, priceRange.min, priceRange.max)
      } else if (colorMode === 'roi') {
        colors[plot.id] = getRoiColor(roi)
      } else {
        colors[plot.id] = statusColors[plot.status]
      }
    })
    return colors
  }, [plots, colorMode, priceRange])

  return (
    <div id="map-content" tabIndex="-1" className="h-full w-full relative z-0 outline-none">
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
        <MapToolbar plots={plots} />
        <UserLocationMarker />
        <MapClusterLayer plots={plots} onSelectPlot={onSelectPlot} />
        <MapRuler />
        <MapHeatLayer plots={plots} visible={colorMode === 'heatmap'} metric="priceSqm" />
        <GeoSearch />
        {onSearchArea && <SearchThisAreaButton onSearchArea={onSearchArea} />}
        <MapViewportCounter plots={plots} totalCount={plots.length} />

        {/* Viewport-culled polygons: only renders plots visible in the current map viewport.
            Dramatically improves performance with many plots by avoiding off-screen SVG paths. */}
        <ViewportCulledPolygons
          plots={plots}
          plotColors={plotColors}
          hoveredId={hoveredId}
          onSelectPlot={onSelectPlot}
          onHover={handleHover}
          onHoverEnd={handleHoverEnd}
          prefetchPlot={prefetchPlot}
          favorites={favorites}
          compareIds={compareIds}
          onToggleCompare={onToggleCompare}
          areaAvgPsm={areaAvgPsm}
        />

        {pois.map((poi, idx) => (
          <Marker key={idx} position={poi.coordinates} icon={poiIcon(poi)} />
        ))}
      </MapContainer>

      {/* Map layer switcher */}
      <MapLayerSwitcher activeLayer={activeLayerId} onChangeLayer={setActiveLayerId} />

      {/* Color mode toggle — price heatmap / ROI / status */}
      <ColorModeToggle colorMode={colorMode} onChangeColorMode={setColorMode} />

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
      {/* Mobile brand badge — hidden on mobile to save space (redundant with filter bar) */}

      {/* Bottom-right: Interactive Legend — adapts to color mode */}
      <div className="absolute bottom-8 right-4 z-[1000] pointer-events-none hidden sm:block">
        <div className="glass-panel px-3 py-2.5 pointer-events-auto">
          {colorMode === 'status' ? (
            <div className="flex flex-col gap-0.5" role="group" aria-label="סינון לפי סטטוס">
              {Object.entries(statusColors).map(([status, color]) => {
                const isActive = statusFilter.length === 0 || statusFilter.includes(status)
                return (
                  <button
                    key={status}
                    type="button"
                    className={`legend-item ${!isActive ? 'inactive' : ''}`}
                    onClick={() => onToggleStatus(status)}
                    aria-pressed={isActive}
                    aria-label={`${statusLabels[status]}${statusCounts[status] > 0 ? ` (${statusCounts[status]})` : ''}`}
                  >
                    <div
                      className="legend-item-check"
                      style={{ background: isActive ? color : 'rgba(100,116,139,0.3)' }}
                    >
                      {isActive && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <span className="text-slate-300">{statusLabels[status]}</span>
                    {statusCounts[status] > 0 && (
                      <span className="text-[9px] text-slate-500 mr-auto tabular-nums">{statusCounts[status]}</span>
                    )}
                  </button>
                )
              })}
            </div>
          ) : colorMode === 'price' ? (
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] text-slate-400 font-medium mb-0.5">💰 מחיר/מ״ר</div>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full" style={{ background: 'linear-gradient(90deg, rgb(0,255,60), rgb(255,255,60), rgb(255,0,60))' }} />
              </div>
              <div className="flex justify-between text-[9px] text-slate-500">
                <span>זול</span>
                <span>ממוצע</span>
                <span>יקר</span>
              </div>
            </div>
          ) : colorMode === 'roi' ? (
            <div className="flex flex-col gap-1">
              <div className="text-[10px] text-slate-400 font-medium mb-0.5">📈 תשואה</div>
              {[
                { label: '200%+', color: '#22C55E' },
                { label: '150%+', color: '#4ADE80' },
                { label: '100%+', color: '#84CC16' },
                { label: '50%+', color: '#EAB308' },
                { label: '<50%', color: '#EF4444' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-[10px] text-slate-300">{item.label}</span>
                </div>
              ))}
            </div>
          ) : colorMode === 'heatmap' ? (
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] text-slate-400 font-medium mb-0.5">🌡️ מפת חום — צפיפות מחירים</div>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(0,200,50,0.4), rgba(255,200,50,0.4), rgba(255,0,50,0.4))' }} />
              </div>
              <div className="flex justify-between text-[9px] text-slate-500">
                <span>זול</span>
                <span>יקר</span>
              </div>
              <div className="text-[8px] text-slate-600 mt-0.5">עיגולים מציגים מחיר/מ״ר באזור</div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Empty state — interactive suggestions like Madlan/Yad2 zero-results pages */}
      {plots.length === 0 && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center pointer-events-none">
          <div className="glass-panel px-8 py-8 text-center pointer-events-auto max-w-sm">
            <div className="text-4xl mb-4">🏜️</div>
            <div className="text-base font-bold text-slate-200 mb-2">לא נמצאו חלקות</div>
            <div className="text-xs text-slate-400 mb-4 leading-relaxed">
              נסה להרחיב את הסינון — לחץ על אחת ההצעות למטה
            </div>
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {onFilterChange && (
                <button
                  onClick={() => { onFilterChange('priceMin', ''); onFilterChange('priceMax', '') }}
                  className="text-[10px] text-slate-400 bg-white/5 hover:bg-gold/10 hover:text-gold hover:border-gold/20 border border-white/10 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  💡 הסר מסנן מחיר
                </button>
              )}
              {onFilterChange && (
                <button
                  onClick={() => onFilterChange('city', 'all')}
                  className="text-[10px] text-slate-400 bg-white/5 hover:bg-gold/10 hover:text-gold hover:border-gold/20 border border-white/10 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  💡 בחר ״כל הערים״
                </button>
              )}
              {statusFilter.length > 0 && onToggleStatus && (
                <button
                  onClick={() => statusFilter.forEach(s => onToggleStatus(s))}
                  className="text-[10px] text-slate-400 bg-white/5 hover:bg-gold/10 hover:text-gold hover:border-gold/20 border border-white/10 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  💡 הסר סינון סטטוס
                </button>
              )}
            </div>
            {onClearFilters && (
              <button
                onClick={onClearFilters}
                className="px-5 py-2 bg-gradient-to-r from-gold to-gold-bright text-navy font-bold text-xs rounded-xl hover:shadow-lg hover:shadow-gold/30 transition-all"
              >
                נקה את כל הסינונים
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
