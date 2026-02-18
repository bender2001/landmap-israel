import { useState, useCallback, memo } from 'react'
import { Eye, EyeOff, ExternalLink, MapPin, RotateCcw } from 'lucide-react'

/**
 * StreetViewPanel — Embedded Google Street View panorama for plot coordinates.
 * Uses Google Maps embed URL (no API key required for basic iframe embed).
 * Falls back gracefully if Street View isn't available at the coordinates.
 *
 * Inspired by Madlan's plot page which shows the actual street-level view,
 * giving investors real visual context beyond satellite imagery.
 */
const StreetViewPanel = memo(function StreetViewPanel({ lat, lng, heading = 0, className = '' }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const toggleExpand = useCallback(() => setIsExpanded(prev => !prev), [])

  if (!lat || !lng || !isFinite(lat) || !isFinite(lng)) return null

  // Google Maps Street View embed URL — free, no API key needed
  const streetViewUrl = `https://www.google.com/maps/embed?pb=!4v${Date.now()}!6m8!1m7!1s!2m2!1d${lat}!2d${lng}!3f${heading}!4f0!5f0.7820865974627469`

  // Direct Google Maps Street View link for "open in new tab"
  const mapsLink = `https://www.google.com/maps/@${lat},${lng},3a,75y,${heading}h,90t/data=!3m6!1e1!3m4!1s!2e0!7i16384!8i8192`

  // Alternative: Google Maps link with street view layer
  const fallbackLink = `https://www.google.com/maps?q=${lat},${lng}&layer=c&cbll=${lat},${lng}`

  if (hasError) {
    return (
      <div className={`rounded-xl bg-white/[0.02] border border-white/5 p-4 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-400">Street View</span>
          </div>
          <button
            onClick={() => { setHasError(false); setIsLoaded(false) }}
            className="text-[10px] text-gold hover:text-gold-bright transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            נסה שוב
          </button>
        </div>
        <div className="text-center py-4">
          <EyeOff className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-[11px] text-slate-500 mb-2">Street View לא זמין בנקודה זו</p>
          <a
            href={fallbackLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] text-gold hover:text-gold-bright transition-colors"
          >
            <MapPin className="w-3 h-3" />
            פתח במפות Google
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-xl overflow-hidden border border-white/5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-gold" />
          <span className="text-xs font-medium text-slate-300">Street View</span>
          {!isLoaded && (
            <span className="text-[9px] text-slate-600 animate-pulse">טוען...</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={fallbackLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-slate-500 hover:text-gold transition-colors flex items-center gap-1"
            title="פתח ב-Google Maps"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={toggleExpand}
            className="text-[10px] text-slate-500 hover:text-gold transition-colors"
          >
            {isExpanded ? 'מזער' : 'הרחב'}
          </button>
        </div>
      </div>

      {/* Street View iframe */}
      <div
        className="relative bg-navy-light/60 transition-all duration-300"
        style={{ height: isExpanded ? '320px' : '180px' }}
      >
        {/* Loading skeleton */}
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-navy-light/80 z-10">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full border-2 border-gold/20 border-t-gold animate-spin mx-auto mb-2" />
              <span className="text-[10px] text-slate-500">טוען Street View...</span>
            </div>
          </div>
        )}
        <iframe
          src={streetViewUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Street View של החלקה"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      </div>

      {/* Coordinates footer */}
      <div className="px-3 py-1.5 bg-white/[0.01] flex items-center justify-between">
        <span className="text-[9px] text-slate-600 font-mono" dir="ltr">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </span>
        <span className="text-[9px] text-slate-600">גרור כדי להסתובב</span>
      </div>
    </div>
  )
})

export default StreetViewPanel
