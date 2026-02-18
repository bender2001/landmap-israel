import { useEffect, useRef, useCallback } from 'react'

/**
 * Focus trap hook for modal-like components (sidebar, dialogs).
 * 
 * Accessibility requirement: WCAG 2.4.3 — Focus Order
 * When a modal/sidebar opens, focus should move inside it and be trapped there.
 * When it closes, focus should return to the element that triggered it.
 * 
 * What Madlan/Yad2 get wrong: their sidebars don't trap focus at all,
 * allowing keyboard users to tab behind the overlay. We do it right.
 * 
 * @param {boolean} isActive - Whether the trap is active
 * @param {React.RefObject} containerRef - Ref to the trapping container
 * @returns {{ returnFocus: () => void }}
 */
export function useFocusTrap(isActive, containerRef) {
  const previousFocusRef = useRef(null)

  // Save the previously focused element when trap activates
  useEffect(() => {
    if (isActive) {
      previousFocusRef.current = document.activeElement

      // Focus the first focusable element inside the container
      const timer = requestAnimationFrame(() => {
        if (!containerRef?.current) return
        const focusable = getFocusableElements(containerRef.current)
        if (focusable.length > 0) {
          focusable[0].focus({ preventScroll: false })
        } else {
          // If no focusable elements, focus the container itself
          containerRef.current.setAttribute('tabindex', '-1')
          containerRef.current.focus({ preventScroll: false })
        }
      })
      return () => cancelAnimationFrame(timer)
    }
  }, [isActive, containerRef])

  // Handle Tab key trapping
  useEffect(() => {
    if (!isActive || !containerRef?.current) return

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return

      const container = containerRef.current
      if (!container) return

      const focusable = getFocusableElements(container)
      if (focusable.length === 0) return

      const firstEl = focusable[0]
      const lastEl = focusable[focusable.length - 1]

      if (e.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (document.activeElement === firstEl) {
          e.preventDefault()
          lastEl.focus()
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === lastEl) {
          e.preventDefault()
          firstEl.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isActive, containerRef])

  // Return focus to the previously focused element
  const returnFocus = useCallback(() => {
    if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
      // Small delay to ensure the DOM has updated
      requestAnimationFrame(() => {
        try {
          previousFocusRef.current.focus({ preventScroll: true })
        } catch {
          // Element may have been removed from DOM
        }
      })
    }
  }, [])

  return { returnFocus }
}

/**
 * Get all focusable elements within a container.
 * Respects disabled state, tabindex=-1, and visibility.
 */
function getFocusableElements(container) {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[role="button"]:not([disabled])',
  ].join(', ')

  return Array.from(container.querySelectorAll(selector)).filter((el) => {
    // Filter out elements that are not visible
    if (el.offsetParent === null && el.tagName !== 'BODY') return false
    const style = getComputedStyle(el)
    if (style.visibility === 'hidden' || style.display === 'none') return false
    return true
  })
}
