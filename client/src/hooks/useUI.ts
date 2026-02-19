// ─── useUI.ts ─── Consolidated UI utility hooks
// Merges: useDebounce, useLazyVisible, useFocusTrap, useScrollDirection, useDragScroll, useSwipeGesture, usePagination

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

// ═══ useDebounce ═══

export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

// ═══ useLazyVisible ═══

type LazyVisibleOptions = {
  rootMargin?: string
  threshold?: number
  skip?: boolean
}

export function useLazyVisible({ rootMargin = '200px', threshold = 0, skip = false }: LazyVisibleOptions = {}): [React.RefObject<HTMLElement>, boolean] {
  const ref = useRef<HTMLElement | null>(null)
  const [isVisible, setIsVisible] = useState<boolean>(skip)

  useEffect(() => {
    if (skip || isVisible) return

    const el = ref.current
    if (!el) return

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin, threshold }
    )

    observer.observe(el)

    return () => observer.disconnect()
  }, [skip, isVisible, rootMargin, threshold])

  return [ref, isVisible]
}

// ═══ useFocusTrap ═══

type UseFocusTrapResult = {
  returnFocus: () => void
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[role="button"]:not([disabled])',
  ].join(', ')

  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter((el) => {
    if (el.offsetParent === null && el.tagName !== 'BODY') return false
    const style = getComputedStyle(el)
    if (style.visibility === 'hidden' || style.display === 'none') return false
    return true
  })
}

export function useFocusTrap(isActive: boolean, containerRef: React.RefObject<HTMLElement>): UseFocusTrapResult {
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isActive) {
      previousFocusRef.current = document.activeElement as HTMLElement | null

      const timer = requestAnimationFrame(() => {
        if (!containerRef?.current) return
        const focusable = getFocusableElements(containerRef.current)
        if (focusable.length > 0) {
          focusable[0].focus({ preventScroll: false })
        } else {
          containerRef.current.setAttribute('tabindex', '-1')
          containerRef.current.focus({ preventScroll: false })
        }
      })
      return () => cancelAnimationFrame(timer)
    }
  }, [isActive, containerRef])

  useEffect(() => {
    if (!isActive || !containerRef?.current) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const container = containerRef.current
      if (!container) return

      const focusable = getFocusableElements(container)
      if (focusable.length === 0) return

      const firstEl = focusable[0]
      const lastEl = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault()
          lastEl.focus()
        }
      } else if (document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isActive, containerRef])

  const returnFocus = useCallback(() => {
    if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
      requestAnimationFrame(() => {
        try {
          previousFocusRef.current?.focus({ preventScroll: true })
        } catch {}
      })
    }
  }, [])

  return { returnFocus }
}

// ═══ useScrollDirection ═══

type ScrollDirection = 'up' | 'down' | null

type ScrollDirectionOptions = {
  threshold?: number
}

export function useScrollDirection({ threshold = 15 }: ScrollDirectionOptions = {}): ScrollDirection {
  const [direction, setDirection] = useState<ScrollDirection>(null)
  const lastScrollY = useRef<number>(0)
  const ticking = useRef<boolean>(false)

  useEffect(() => {
    const updateDirection = () => {
      const scrollY = window.scrollY

      if (scrollY < 10) {
        setDirection(null)
        lastScrollY.current = scrollY
        ticking.current = false
        return
      }

      const diff = scrollY - lastScrollY.current

      if (Math.abs(diff) < threshold) {
        ticking.current = false
        return
      }

      setDirection(diff > 0 ? 'down' : 'up')
      lastScrollY.current = scrollY
      ticking.current = false
    }

    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true
        requestAnimationFrame(updateDirection)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return direction
}

// ═══ useDragScroll ═══

type DragScrollOptions = {
  disabled?: boolean
  momentum?: number
  dragThreshold?: number
}

type DragState = {
  isDragging: boolean
  startX: number
  scrollLeft: number
  velocity: number
  lastX: number
  lastTime: number
  moved: number
  animFrame: number | null
}

export function useDragScroll(
  scrollRef: React.RefObject<HTMLElement>,
  { disabled = false, momentum = 0.92, dragThreshold = 5 }: DragScrollOptions = {}
): { readonly isDragging: boolean } {
  const stateRef = useRef<DragState>({
    isDragging: false,
    startX: 0,
    scrollLeft: 0,
    velocity: 0,
    lastX: 0,
    lastTime: 0,
    moved: 0,
    animFrame: null,
  })

  const preventClickRef = useRef(false)

  const handleClickCapture = useCallback((e: MouseEvent) => {
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

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0) return
      const target = e.target as HTMLElement | null
      const tag = target?.closest('button, a, input, [role="option"]')
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
      e.preventDefault()
    }

    function onMouseMove(e: MouseEvent) {
      if (!state.isDragging) return
      const dx = e.pageX - state.startX
      state.moved = Math.abs(dx)

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

      if (state.moved > dragThreshold) {
        preventClickRef.current = true
        setTimeout(() => { preventClickRef.current = false }, 50)
      }

      if (Math.abs(state.velocity) > 0.1 && momentum > 0) {
        let v = state.velocity * 15

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
    get isDragging() { return stateRef.current.isDragging },
  }
}

// ═══ useSwipeGesture ═══

type SwipeGestureOptions = {
  threshold?: number
  momentum?: number
}

type TouchState = {
  startX: number
  startY: number
  startScroll: number
  velocity: number
  lastX: number
  lastTime: number
  isTracking: boolean
}

type SwipeGestureHandlers = {
  onTouchStart: (e: React.TouchEvent<HTMLElement>) => void
  onTouchMove: (e: React.TouchEvent<HTMLElement>) => void
  onTouchEnd: () => void
}

export function useSwipeGesture(
  scrollRef: React.RefObject<HTMLElement>,
  { threshold = 50, momentum = 0.95 }: SwipeGestureOptions = {}
): SwipeGestureHandlers {
  const touchState = useRef<TouchState>({ startX: 0, startY: 0, startScroll: 0, velocity: 0, lastX: 0, lastTime: 0, isTracking: false })
  const animFrame = useRef<number | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent<HTMLElement>) => {
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

  const onTouchMove = useCallback((e: React.TouchEvent<HTMLElement>) => {
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

    let vel = state.velocity * 15
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

// ═══ usePagination ═══

type PaginationOptions = {
  defaultLimit?: number
}

type PaginationParams = {
  page: number
  limit: number
  sort_by: string
  sort_dir: 'asc' | 'desc'
}

type UsePaginationResult = {
  page: number
  setPage: (page: number) => void
  limit: number
  sortBy: string
  sortDir: 'asc' | 'desc'
  handleSort: (column: string) => void
  params: PaginationParams
}

export default function usePagination({ defaultLimit = 25 }: PaginationOptions = {}): UsePaginationResult {
  const [page, setPage] = useState<number>(1)
  const [limit] = useState<number>(defaultLimit)
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const handleSort = useCallback((column: string) => {
    setSortBy((prev) => {
      if (prev === column) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDir('desc')
      return column
    })
    setPage(1)
  }, [])

  const params = useMemo<PaginationParams>(() => ({
    page,
    limit,
    sort_by: sortBy,
    sort_dir: sortDir,
  }), [page, limit, sortBy, sortDir])

  return {
    page,
    setPage,
    limit,
    sortBy,
    sortDir,
    handleSort,
    params,
  }
}
