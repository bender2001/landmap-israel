import { useRef, useCallback } from 'react'

/**
 * Touch swipe gesture hook for mobile scrolling.
 * Returns handlers to attach to a scrollable container.
 * Adds momentum/inertia scrolling for smooth card strip navigation.
 */
export function useSwipeGesture(scrollRef, { threshold = 50, momentum = 0.95 } = {}) {
  const touchState = useRef({ startX: 0, startY: 0, startScroll: 0, velocity: 0, lastX: 0, lastTime: 0, isTracking: false })
  const animFrame = useRef(null)

  const onTouchStart = useCallback((e) => {
    if (!scrollRef.current) return
    const touch = e.touches[0]
    const state = touchState.current
    state.startX = touch.clientX
    state.startY = touch.clientY
    state.startScroll = scrollRef.current.scrollLeft
    state.lastX = touch.clientX
    state.lastTime = Date.now()
    state.velocity = 0
    state.isTracking = true
    if (animFrame.current) cancelAnimationFrame(animFrame.current)
  }, [scrollRef])

  const onTouchMove = useCallback((e) => {
    if (!touchState.current.isTracking || !scrollRef.current) return
    const touch = e.touches[0]
    const state = touchState.current
    const now = Date.now()
    const dt = now - state.lastTime
    if (dt > 0) {
      state.velocity = (touch.clientX - state.lastX) / dt
    }
    state.lastX = touch.clientX
    state.lastTime = now
  }, [scrollRef])

  const onTouchEnd = useCallback(() => {
    const state = touchState.current
    state.isTracking = false
    if (!scrollRef.current || Math.abs(state.velocity) < 0.1) return

    // Apply momentum scrolling
    let vel = state.velocity * 15 // scale up for visible effect
    const decel = () => {
      if (Math.abs(vel) < 0.5 || !scrollRef.current) return
      scrollRef.current.scrollLeft -= vel
      vel *= momentum
      animFrame.current = requestAnimationFrame(decel)
    }
    animFrame.current = requestAnimationFrame(decel)
  }, [scrollRef, momentum])

  return { onTouchStart, onTouchMove, onTouchEnd }
}
