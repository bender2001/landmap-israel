import { useState, useRef, useEffect, memo } from 'react'

/**
 * ProgressiveImage — loads images with a smooth blur-up transition.
 * Like Madlan/Yad2's property images that fade in gracefully instead of popping.
 *
 * Features:
 * 1. Shows a CSS gradient placeholder while loading (no layout shift)
 * 2. Uses IntersectionObserver for true lazy loading (not just native lazy)
 * 3. Fades in with a blur-to-sharp animation on load
 * 4. Falls back to a placeholder icon on error
 * 5. Supports srcSet for responsive images
 *
 * Usage:
 *   <ProgressiveImage src={url} alt="..." className="w-full h-48" />
 */
const ProgressiveImage = memo(function ProgressiveImage({
  src,
  alt = '',
  className = '',
  width,
  height,
  srcSet,
  sizes,
  objectFit = 'cover',
  placeholderColor = 'rgba(30,41,59,0.5)',
  errorFallback,
}) {
  const [state, setState] = useState('idle') // idle | loading | loaded | error
  const imgRef = useRef(null)
  const observerRef = useRef(null)

  useEffect(() => {
    const el = imgRef.current
    if (!el || !src) return

    // If the image is already cached by the browser, it will fire onload synchronously
    // after setting src. Check complete property for instantly cached images.
    if (el.complete && el.naturalWidth > 0) {
      setState('loaded')
      return
    }

    // IntersectionObserver-based lazy loading — triggers load only when near viewport.
    // Native loading="lazy" has inconsistent browser thresholds; this gives us control.
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setState('loading')
          el.src = src
          if (srcSet) el.srcset = srcSet
          if (sizes) el.sizes = sizes
          observerRef.current?.disconnect()
        }
      },
      { rootMargin: '200px' } // Start loading 200px before entering viewport
    )
    observerRef.current.observe(el)

    return () => observerRef.current?.disconnect()
  }, [src, srcSet, sizes])

  const handleLoad = () => setState('loaded')
  const handleError = () => setState('error')

  return (
    <div
      className={`progressive-image-wrapper relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Gradient placeholder — prevents layout shift and provides visual feedback */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background: `linear-gradient(135deg, ${placeholderColor}, rgba(200,148,42,0.08))`,
          opacity: state === 'loaded' ? 0 : 1,
        }}
      />

      {/* Shimmer animation while loading */}
      {state === 'loading' && (
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
            }}
          />
        </div>
      )}

      {/* The actual image */}
      {state !== 'error' && (
        <img
          ref={imgRef}
          alt={alt}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className="absolute inset-0 w-full h-full transition-all duration-700"
          style={{
            objectFit,
            opacity: state === 'loaded' ? 1 : 0,
            filter: state === 'loaded' ? 'blur(0)' : 'blur(8px)',
            transform: state === 'loaded' ? 'scale(1)' : 'scale(1.05)',
          }}
        />
      )}

      {/* Error fallback */}
      {state === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-navy-light/50">
          {errorFallback || (
            <div className="flex flex-col items-center gap-1 text-slate-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              </svg>
              <span className="text-[9px]">תמונה לא זמינה</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
})

export default ProgressiveImage
