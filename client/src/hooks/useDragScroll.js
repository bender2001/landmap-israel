import { useRef, useEffect, useCallback } from 'react'

/**
 * useDragScroll — enables click-and-drag horizontal scrolling on desktop.
 * Like Madlan/Airbnb card strips where you can grab and drag with the mouse.
 *
 * Features:
 * - Momentum/inertia scrolling after release (physics-based deceleration)
 * - Cursor changes to grab/grabbing for affordance
 * - Prevents child click events during drag (avoids accidental card selection)
 * - Passive event listeners for scroll performance
 * - Automatically handles RTL direction
 *
 * @param {React.RefObject} scrollRef - ref to the scrollable container
 * @param {Object} options
 * @param {boolean} options.disabled - disable drag scrolling
 * @param {number} options.momentum - momentum multiplier (0 = no inertia, 1 = full)
 * @param {number} options.dragThreshold - px moved before considered a drag (prevents click hijack)
 */
export function useDragScroll(scrollRef, { disabled = false, momentum = 0.92, dragThreshold = 5 } = {}) {
  const stateRef = useRef({
    isDragging: false,
    startX: 0,
    scrollLeft: 0,
    velocity: 0,
    lastX: 0,
    lastTime: 0,
    moved: 0,
    animFrame: null,
  })

  // Prevent click on children when user was dragging
  const preventClickRef = useRef(false)

  const handleClickCapture = useCallback((e) => {
    if (preventClickRef.current) {
      e.stopPropagation()
      e.preventDefault()
      preventClickRef.current = false
    }
  }, [])

  useEffect(() => {
    if (disabled) return
    const el = scrollRef.current
    if (!el) return

    const state = stateRef.current

    function onMouseDown(e) {
      // Only left mouse button
      if (e.button !== 0) return
      // Don't interfere with buttons, links, or interactive elements
      const tag = e.target.closest('button, a, input, [role="option"]')
      if (tag && (tag.tagName === 'BUTTON' || tag.tagName === 'A' || tag.tagName === 'INPUT')) return

      state.isDragging = true
      state.startX = e.pageX
      state.scrollLeft = el.scrollLeft
      state.velocity = 0
      state.lastX = e.pageX
      state.lastTime = Date.now()
      state.moved = 0

      if (state.animFrame) {
        cancelAnimationFrame(state.animFrame)
        state.animFrame = null
      }

      el.style.cursor = 'grabbing'
      el.style.userSelect = 'none'

      // Prevent text selection during drag
      e.preventDefault()
    }

    function onMouseMove(e) {
      if (!state.isDragging) return

      const dx = e.pageX - state.startX
      state.moved = Math.abs(dx)

      // Track velocity for momentum
      const now = Date.now()
      const dt = now - state.lastTime
      if (dt > 0) {
        state.velocity = (e.pageX - state.lastX) / dt
      }
      state.lastX = e.pageX
      state.lastTime = now

      el.scrollLeft = state.scrollLeft - dx
    }

    function onMouseUp() {
      if (!state.isDragging) return
      state.isDragging = false

      el.style.cursor = ''
      el.style.userSelect = ''

      // If user moved more than threshold, mark as drag to prevent click
      if (state.moved > dragThreshold) {
        preventClickRef.current = true
        // Reset after a tick to allow future clicks
        setTimeout(() => { preventClickRef.current = false }, 50)
      }

      // Apply momentum scrolling
      if (Math.abs(state.velocity) > 0.1 && momentum > 0) {
        let v = state.velocity * 15 // Scale velocity to pixels

        function animate() {
          if (Math.abs(v) < 0.5) return
          el.scrollLeft -= v
          v *= momentum
          state.animFrame = requestAnimationFrame(animate)
        }
        state.animFrame = requestAnimationFrame(animate)
      }
    }

    function onMouseLeave() {
      if (state.isDragging) {
        onMouseUp()
      }
    }

    // Add cursor hint on hover
    el.style.cursor = 'grab'

    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    el.addEventListener('mouseleave', onMouseLeave)
    el.addEventListener('click', handleClickCapture, true)

    return () => {
      el.style.cursor = ''
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      el.removeEventListener('mouseleave', onMouseLeave)
      el.removeEventListener('click', handleClickCapture, true)
      if (state.animFrame) cancelAnimationFrame(state.animFrame)
    }
  }, [scrollRef, disabled, momentum, dragThreshold, handleClickCapture])

  return {
    /** Whether a drag is currently in progress (for styling) */
    get isDragging() { return stateRef.current.isDragging },
  }
}
