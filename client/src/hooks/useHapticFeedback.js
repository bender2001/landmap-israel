import { useCallback, useRef } from 'react'

/**
 * Haptic feedback hook for mobile interactions.
 *
 * Modern mobile UX uses subtle vibrations to confirm user actions:
 * - Light tap: filter selection, toggle, checkbox
 * - Medium tap: plot selection, adding to favorites/compare
 * - Heavy tap: important actions (clear all filters, delete)
 *
 * This uses the Web Vibration API (supported on Android Chrome, Samsung Internet).
 * On iOS/unsupported browsers, it's a no-op — zero runtime cost.
 *
 * Why it matters for real estate apps:
 * - Users browse plots for extended sessions on mobile
 * - Haptic feedback creates a tactile sense of "selecting" a property
 * - It's the difference between a website and an app-quality experience
 * - Madlan's mobile app has haptics; their web app doesn't — we can match the app feel
 *
 * Usage:
 *   const haptic = useHapticFeedback()
 *   <button onClick={() => { haptic.light(); toggleFilter() }}>Filter</button>
 */
export function useHapticFeedback() {
  const supported = useRef(
    typeof navigator !== 'undefined' && 'vibrate' in navigator
  )

  const vibrate = useCallback((pattern) => {
    if (supported.current) {
      try {
        navigator.vibrate(pattern)
      } catch {
        // Silently fail — some browsers throw on vibrate in certain contexts
      }
    }
  }, [])

  /**
   * Light tap — for minor UI interactions
   * Filters, toggles, checkboxes, tabs, dropdown selections
   */
  const light = useCallback(() => vibrate(10), [vibrate])

  /**
   * Medium tap — for meaningful selections
   * Selecting a plot, adding to favorites, compare toggle
   */
  const medium = useCallback(() => vibrate(25), [vibrate])

  /**
   * Heavy tap — for important/destructive actions
   * Clear all filters, remove from favorites, form submission
   */
  const heavy = useCallback(() => vibrate([30, 50, 30]), [vibrate])

  /**
   * Success pattern — double pulse for confirmation
   * Form submitted, search saved, alert subscribed
   */
  const success = useCallback(() => vibrate([15, 80, 15]), [vibrate])

  /**
   * Warning pattern — for attention-needed moments
   * Error states, empty results, validation failures
   */
  const warning = useCallback(() => vibrate([40, 30, 40, 30, 40]), [vibrate])

  return { light, medium, heavy, success, warning, supported: supported.current }
}
