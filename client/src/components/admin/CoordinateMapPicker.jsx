import { useState, useCallback } from 'react'
import { MapContainer, TileLayer, Polygon, useMapEvents } from 'react-leaflet'
import { Undo2, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

function ClickHandler({ onAdd }) {
  useMapEvents({
    click(e) {
      onAdd([e.latlng.lat, e.latlng.lng])
    },
  })
  return null
}

export default function CoordinateMapPicker({ value = [], onChange }) {
  const [showRaw, setShowRaw] = useState(false)
  const [rawText, setRawText] = useState('')

  // value is an array of [lat, lng] pairs
  const points = Array.isArray(value) ? value : []

  const addPoint = useCallback((latlng) => {
    onChange([...points, latlng])
  }, [points, onChange])

  const undoLast = useCallback(() => {
    if (points.length > 0) {
      onChange(points.slice(0, -1))
    }
  }, [points, onChange])

  const clearAll = useCallback(() => {
    onChange([])
  }, [onChange])

  const handleRawApply = useCallback(() => {
    try {
      const parsed = JSON.parse(rawText)
      if (Array.isArray(parsed) && parsed.every((p) => Array.isArray(p) && p.length === 2)) {
        onChange(parsed)
        setShowRaw(false)
      }
    } catch { /* ignore parse errors */ }
  }, [rawText, onChange])

  // Center map on Israel or on existing points
  const center = points.length > 0
    ? [points.reduce((s, p) => s + p[0], 0) / points.length, points.reduce((s, p) => s + p[1], 0) / points.length]
    : [31.7683, 35.2137]

  const zoom = points.length > 0 ? 15 : 8

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-400">לחץ על המפה להוספת נקודות ({points.length} נקודות)</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={undoLast}
            disabled={points.length === 0}
            className="p-1.5 rounded-lg text-slate-400 hover:text-gold hover:bg-gold/10 transition disabled:opacity-30"
            title="בטל אחרון"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={points.length === 0}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-30"
            title="נקה הכל"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border border-white/10" style={{ height: 280 }}>
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          <ClickHandler onAdd={addPoint} />
          {points.length >= 3 && (
            <Polygon
              positions={points}
              pathOptions={{
                color: '#C8942A',
                fillColor: '#C8942A',
                fillOpacity: 0.2,
                weight: 2,
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Raw JSON toggle */}
      <button
        type="button"
        onClick={() => {
          setShowRaw(!showRaw)
          if (!showRaw) setRawText(JSON.stringify(points, null, 2))
        }}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition"
      >
        {showRaw ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        עריכת JSON ידנית
      </button>

      {showRaw && (
        <div className="space-y-2">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={4}
            dir="ltr"
            className="w-full px-3 py-2.5 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:border-gold/50 focus:outline-none transition text-xs font-mono resize-none"
          />
          <button
            type="button"
            onClick={handleRawApply}
            className="px-3 py-1.5 text-xs bg-gold/15 text-gold rounded-lg hover:bg-gold/25 transition"
          >
            החל JSON
          </button>
        </div>
      )}
    </div>
  )
}
