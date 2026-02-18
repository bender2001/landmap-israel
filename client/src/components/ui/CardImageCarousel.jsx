import { useState, useCallback, useRef, useEffect, memo } from 'react'

/**
 * CardImageCarousel — Madlan/Airbnb-style multi-image carousel for plot cards.
 * Shows dot indicators for multiple images and supports click/touch navigation.
 * Falls back to a single static image when there's only one photo.
 * Designed to be lightweight (<1KB) and work inside small card thumbnails.
 *
 * Features:
 * - Click left/right halves to navigate (no arrow buttons = cleaner UX)
 * - Touch swipe support for mobile
 * - Dot indicators show current position
 * - Lazy loads non-visible images
 * - Gradient overlay at bottom for text readability
 * - Fallback gradient placeholder on image error
 */
const CardImageCarousel = memo(function CardImageCarousel({ images, blockNum, color, isCompared, onImageCountClick }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loadErrors, setLoadErrors] = useState(new Set())
  const touchRef = useRef({ startX: 0, startY: 0 })

  const count = images?.length || 0

  // Navigate to next/prev image
  const goTo = useCallback((idx, e) => {
    if (e) e.stopPropagation()
    setCurrentIndex(idx)
  }, [])

  const goNext = useCallback((e) => {
    if (e) e.stopPropagation()
    setCurrentIndex(prev => (prev + 1) % count)
  }, [count])

  const goPrev = useCallback((e) => {
    if (e) e.stopPropagation()
    setCurrentIndex(prev => (prev - 1 + count) % count)
  }, [count])

  // Click handler: left half = prev, right half = next
  const handleClick = useCallback((e) => {
    if (count <= 1) return
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const isRightHalf = clickX > rect.width / 2
    // RTL: right half = prev, left half = next
    if (isRightHalf) {
      goPrev(e)
    } else {
      goNext(e)
    }
  }, [count, goNext, goPrev])

  // Touch swipe support
  const handleTouchStart = useCallback((e) => {
    if (count <= 1) return
    touchRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
    }
  }, [count])

  const handleTouchEnd = useCallback((e) => {
    if (count <= 1) return
    const dx = e.changedTouches[0].clientX - touchRef.current.startX
    const dy = e.changedTouches[0].clientY - touchRef.current.startY
    // Only trigger if horizontal swipe > vertical (avoid scroll conflicts)
    if (Math.abs(dx) < 30 || Math.abs(dx) < Math.abs(dy)) return
    e.stopPropagation()
    // RTL: swipe left (negative dx) = prev, swipe right = next
    if (dx < 0) {
      goPrev()
    } else {
      goNext()
    }
  }, [count, goNext, goPrev])

  const handleImgError = useCallback((idx) => {
    setLoadErrors(prev => new Set(prev).add(idx))
  }, [])

  // No images — show color accent bar
  if (!images || count === 0) {
    return (
      <div
        className="plot-card-mini-accent"
        style={{ background: isCompared ? '#8B5CF6' : color }}
      />
    )
  }

  // Single image — simple static thumbnail (no carousel overhead)
  if (count === 1) {
    const img = images[0]
    return (
      <div className="plot-card-mini-thumb">
        {loadErrors.has(0) ? (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${color}25, ${color}08)` }}
          >
            <span style={{ fontSize: '20px', opacity: 0.5 }}>🏗️</span>
          </div>
        ) : (
          <img
            src={img.url}
            alt={img.alt || `גוש ${blockNum}`}
            className="plot-card-mini-thumb-img"
            loading="lazy"
            decoding="async"
            onError={() => handleImgError(0)}
          />
        )}
        <div className="plot-card-mini-thumb-overlay" />
        <div
          className="plot-card-mini-accent"
          style={{
            background: isCompared ? '#8B5CF6' : color,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          }}
        />
      </div>
    )
  }

  // Multi-image carousel
  const currentImg = images[currentIndex]

  // Preload next image for instant transitions — like Airbnb's carousel
  useEffect(() => {
    if (count <= 1) return
    const nextIdx = (currentIndex + 1) % count
    const prevIdx = (currentIndex - 1 + count) % count
    ;[nextIdx, prevIdx].forEach(idx => {
      if (!loadErrors.has(idx) && images[idx]?.url) {
        const link = document.createElement('link')
        link.rel = 'prefetch'
        link.href = images[idx].url
        link.as = 'image'
        document.head.appendChild(link)
        // Clean up after 10s to avoid accumulating prefetch links
        setTimeout(() => { try { document.head.removeChild(link) } catch {} }, 10000)
      }
    })
  }, [currentIndex, count, images, loadErrors])

  return (
    <div
      className="plot-card-mini-thumb plot-card-carousel"
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="group"
      aria-roledescription="carousel"
      aria-label={`${count} תמונות`}
    >
      {/* Current image with crossfade transition */}
      {loadErrors.has(currentIndex) ? (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${color}25, ${color}08)` }}
        >
          <span style={{ fontSize: '20px', opacity: 0.5 }}>🏗️</span>
        </div>
      ) : (
        <img
          key={currentImg.id || currentIndex}
          src={currentImg.url}
          alt={currentImg.alt || `גוש ${blockNum} — תמונה ${currentIndex + 1}`}
          className="plot-card-mini-thumb-img"
          loading={currentIndex === 0 ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => handleImgError(currentIndex)}
        />
      )}

      {/* Gradient overlay */}
      <div className="plot-card-mini-thumb-overlay" />

      {/* Dot indicators — like Airbnb/Madlan carousel dots */}
      <div className="card-carousel-dots" aria-hidden="true">
        {images.slice(0, 5).map((_, i) => (
          <button
            key={i}
            className={`card-carousel-dot ${i === currentIndex ? 'active' : ''}`}
            onClick={(e) => goTo(i, e)}
            aria-label={`תמונה ${i + 1}`}
            tabIndex={-1}
          />
        ))}
        {count > 5 && (
          <span className="card-carousel-dot-more">+{count - 5}</span>
        )}
      </div>

      {/* Photo count badge */}
      <span className="absolute top-1.5 left-1.5 z-10 flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-bold text-white bg-black/60 backdrop-blur-sm rounded-md leading-none">
        📷 {currentIndex + 1}/{count}
      </span>

      {/* Hover arrows — appear on desktop hover for discoverability */}
      <div className="card-carousel-arrows" aria-hidden="true">
        <div className="card-carousel-arrow-zone card-carousel-arrow-prev" />
        <div className="card-carousel-arrow-zone card-carousel-arrow-next" />
      </div>

      {/* Color accent bar */}
      <div
        className="plot-card-mini-accent"
        style={{
          background: isCompared ? '#8B5CF6' : color,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        }}
      />
    </div>
  )
})

export default CardImageCarousel
