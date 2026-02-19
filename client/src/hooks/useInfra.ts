// ─── useInfra.ts ─── Consolidated infrastructure hooks
// Merges: useLocalStorage, useNetworkStatus, useDataSaver, usePageVisibility, useVisibilityInterval, useViewportPrefetch, useHapticFeedback, useRealtimeUpdates

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'

// ═══ useLocalStorage ═══

type StorageEventDetail = { key: string }

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  options: { raw?: boolean } = {}
): [T, (valueOrUpdater: T | ((prev: T) => T)) => void, () => void] {
  const { raw = false } = options

  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') return defaultValue
    try {
      const item = localStorage.getItem(key)
      if (item === null) return defaultValue
      return (raw ? item : JSON.parse(item)) as T
    } catch {
      return defaultValue
    }
  }, [key, defaultValue, raw])

  const [storedValue, setStoredValue] = useState<T>(readValue)

  const setValue = useCallback((valueOrUpdater: T | ((prev: T) => T)) => {
    setStoredValue((prev) => {
      const nextValue = typeof valueOrUpdater === 'function'
        ? (valueOrUpdater as (prev: T) => T)(prev)
        : valueOrUpdater

      try {
        const serialized = raw ? String(nextValue) : JSON.stringify(nextValue)
        localStorage.setItem(key, serialized)
        window.dispatchEvent(new CustomEvent<StorageEventDetail>('landmap-storage', { detail: { key } }))
      } catch {}

      return nextValue
    })
  }, [key, raw])

  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key)
      window.dispatchEvent(new CustomEvent<StorageEventDetail>('landmap-storage', { detail: { key } }))
    } catch {}
    setStoredValue(defaultValue)
  }, [key, defaultValue])

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key || e.key === null) {
        setStoredValue(readValue())
      }
    }
    const handleCustom = (e: CustomEvent<StorageEventDetail>) => {
      if (e.detail?.key === key) {
        setStoredValue(readValue())
      }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('landmap-storage', handleCustom as EventListener)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('landmap-storage', handleCustom as EventListener)
    }
  }, [key, readValue])

  return [storedValue, setValue, removeValue]
}

export function useLocalStorageValue<T>(key: string, defaultValue: T): T {
  const subscribe = useCallback((callback: () => void) => {
    const handler = (e: StorageEvent) => {
      if (e.key === key || e.key === null) callback()
    }
    const customHandler = (e: CustomEvent<StorageEventDetail>) => {
      if (e.detail?.key === key) callback()
    }
    window.addEventListener('storage', handler)
    window.addEventListener('landmap-storage', customHandler as EventListener)
    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener('landmap-storage', customHandler as EventListener)
    }
  }, [key])

  const getSnapshot = useCallback((): T => {
    try {
      const item = localStorage.getItem(key)
      return item !== null ? (JSON.parse(item) as T) : defaultValue
    } catch {
      return defaultValue
    }
  }, [key, defaultValue])

  return useSyncExternalStore(subscribe, getSnapshot, () => defaultValue)
}

// ═══ useNetworkStatus ═══

type NetworkInformationLike = {
  effectiveType?: string
  downlink?: number
  rtt?: number
  saveData?: boolean
  addEventListener?: (type: 'change', listener: () => void) => void
  removeEventListener?: (type: 'change', listener: () => void) => void
}

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationLike
  mozConnection?: NetworkInformationLike
  webkitConnection?: NetworkInformationLike
}

type NetworkInfo = {
  online: boolean
  effectiveType: string
  downlink: number | null
  rtt: number | null
  saveData: boolean
}

function getConnection(): NetworkInformationLike | undefined {
  const nav = navigator as NavigatorWithConnection
  return nav.connection || nav.mozConnection || nav.webkitConnection
}

let cachedNetworkSnapshot: NetworkInfo | null = null

function getNetworkInfo(): NetworkInfo {
  const conn = getConnection()
  const online = navigator.onLine
  const effectiveType = conn?.effectiveType || '4g'
  const downlink = conn?.downlink ?? null
  const rtt = conn?.rtt ?? null
  const saveData = conn?.saveData || false

  if (
    cachedNetworkSnapshot &&
    cachedNetworkSnapshot.online === online &&
    cachedNetworkSnapshot.effectiveType === effectiveType &&
    cachedNetworkSnapshot.downlink === downlink &&
    cachedNetworkSnapshot.rtt === rtt &&
    cachedNetworkSnapshot.saveData === saveData
  ) {
    return cachedNetworkSnapshot
  }

  cachedNetworkSnapshot = { online, effectiveType, downlink, rtt, saveData }
  return cachedNetworkSnapshot
}

const NETWORK_SERVER_SNAPSHOT: NetworkInfo = {
  online: true,
  effectiveType: '4g',
  downlink: null,
  rtt: null,
  saveData: false,
}

function networkSubscribe(callback: () => void): () => void {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  const conn = getConnection()
  if (conn?.addEventListener) conn.addEventListener('change', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
    if (conn?.removeEventListener) conn.removeEventListener('change', callback)
  }
}

export function useNetworkStatus(): NetworkInfo {
  return useSyncExternalStore(networkSubscribe, getNetworkInfo, () => NETWORK_SERVER_SNAPSHOT)
}

export function useIsSlowConnection(): boolean {
  const { effectiveType, rtt, saveData } = useNetworkStatus()
  return saveData || effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g' || (rtt != null && rtt > 500)
}

// ═══ useDataSaver ═══

const DS_KEY = 'landmap_data_saver'

function getDataSaverSnapshot(): boolean {
  const conn = getConnection()
  const browserSaveData = conn?.saveData === true
  const userPref = localStorage.getItem(DS_KEY)
  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
  return browserSaveData || userPref === 'on' || prefersReduced
}

function getDataSaverServerSnapshot(): boolean {
  return false
}

function dataSaverSubscribe(callback: () => void): () => void {
  const conn = getConnection()
  if (conn?.addEventListener) conn.addEventListener('change', callback)
  const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  if (mq?.addEventListener) mq.addEventListener('change', callback)
  window.addEventListener('storage', callback)

  return () => {
    if (conn?.removeEventListener) conn.removeEventListener('change', callback)
    if (mq?.removeEventListener) mq.removeEventListener('change', callback)
    window.removeEventListener('storage', callback)
  }
}

export function useDataSaver(): boolean {
  return useSyncExternalStore(dataSaverSubscribe, getDataSaverSnapshot, getDataSaverServerSnapshot)
}

export function toggleDataSaver(enabled: boolean): void {
  localStorage.setItem(DS_KEY, enabled ? 'on' : 'off')
  window.dispatchEvent(new StorageEvent('storage', { key: DS_KEY }))
}

// ═══ usePageVisibility ═══

type PageVisibilityOptions = {
  staleDurationMs?: number
  enabled?: boolean
}

export function usePageVisibility(
  onReturn: (() => void) | undefined,
  { staleDurationMs = 120_000, enabled = true }: PageVisibilityOptions = {}
): void {
  const hiddenAtRef = useRef<number | null>(null)
  const callbackRef = useRef<(() => void) | undefined>(onReturn)

  useEffect(() => {
    callbackRef.current = onReturn
  }, [onReturn])

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      hiddenAtRef.current = Date.now()
    } else {
      const hiddenAt = hiddenAtRef.current
      hiddenAtRef.current = null

      if (hiddenAt && Date.now() - hiddenAt >= staleDurationMs) {
        callbackRef.current?.()
      }
    }
  }, [staleDurationMs])

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [handleVisibilityChange, enabled])
}

export function useRefreshOnReturn(refetchFn: (() => void) | undefined, options?: PageVisibilityOptions): void {
  usePageVisibility(
    useCallback(() => {
      refetchFn?.()
    }, [refetchFn]),
    options
  )
}

// ═══ useVisibilityInterval ═══

type VisibilityIntervalOptions = {
  enabled?: boolean
  catchUp?: boolean
}

export function useVisibilityInterval(
  callback: () => void,
  delayMs: number,
  { enabled = true, catchUp = true }: VisibilityIntervalOptions = {}
): void {
  const callbackRef = useRef(callback)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hiddenAtRef = useRef<number | null>(null)
  const lastFireRef = useRef<number>(Date.now())

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const startInterval = useCallback(() => {
    if (intervalRef.current) return
    intervalRef.current = setInterval(() => {
      callbackRef.current()
      lastFireRef.current = Date.now()
    }, delayMs)
  }, [delayMs])

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      stopInterval()
      return
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now()
        stopInterval()
      } else {
        const hiddenAt = hiddenAtRef.current
        hiddenAtRef.current = null

        if (catchUp && hiddenAt && Date.now() - lastFireRef.current >= delayMs) {
          callbackRef.current()
          lastFireRef.current = Date.now()
        }

        startInterval()
      }
    }

    if (!document.hidden) {
      startInterval()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stopInterval()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, delayMs, catchUp, startInterval, stopInterval])
}

// ═══ useViewportPrefetch ═══

function shouldSkipPrefetch(): boolean {
  const conn = getConnection()
  if (!conn) return false
  if (conn.saveData) return true
  const ect = conn.effectiveType
  if (ect === 'slow-2g' || ect === '2g') return true
  return false
}

type ViewportPrefetchOptions = {
  rootMargin?: string
  skip?: boolean
}

export function useViewportPrefetch(
  onVisible: () => void,
  { rootMargin = '200px', skip = false }: ViewportPrefetchOptions = {}
): React.RefObject<HTMLElement> {
  const ref = useRef<HTMLElement | null>(null)
  const triggeredRef = useRef<boolean>(false)
  const callbackRef = useRef<() => void>(onVisible)
  callbackRef.current = onVisible

  useEffect(() => {
    if (skip || triggeredRef.current) return
    const el = ref.current
    if (!el) return

    if (shouldSkipPrefetch()) return

    const conn = getConnection()
    const effectiveMargin = conn?.effectiveType === '3g' ? '50px' : rootMargin

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !triggeredRef.current) {
            triggeredRef.current = true
            callbackRef.current()
            observer.unobserve(entry.target)
          }
        }
      },
      { rootMargin: effectiveMargin, threshold: 0 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin, skip])

  return ref
}

// ═══ useHapticFeedback ═══

type VibrationPattern = number | number[]

type HapticFeedback = {
  light: () => void
  medium: () => void
  heavy: () => void
  success: () => void
  warning: () => void
  supported: boolean
}

export function useHapticFeedback(): HapticFeedback {
  const supported = useRef<boolean>(typeof navigator !== 'undefined' && 'vibrate' in navigator)

  const vibrate = useCallback((pattern: VibrationPattern) => {
    if (supported.current) {
      try {
        navigator.vibrate(pattern)
      } catch {}
    }
  }, [])

  const light = useCallback(() => vibrate(10), [vibrate])
  const medium = useCallback(() => vibrate(25), [vibrate])
  const heavy = useCallback(() => vibrate([30, 50, 30]), [vibrate])
  const success = useCallback(() => vibrate([15, 80, 15]), [vibrate])
  const warning = useCallback(() => vibrate([40, 30, 40, 30, 40]), [vibrate])

  return { light, medium, heavy, success, warning, supported: supported.current }
}

// ═══ useRealtimeUpdates ═══

const REALTIME_API_URL = import.meta.env.VITE_API_URL || ''

type RealtimeEvent = {
  type?: string
  plotId?: string
}

type RealtimeUpdatesResult = {
  isConnected: boolean
}

export function useRealtimeUpdates(): RealtimeUpdatesResult {
  const queryClient = useQueryClient()
  const retryDelay = useRef<number>(1000)
  const [isConnected, setIsConnected] = useState<boolean>(false)

  useEffect(() => {
    let es: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let mounted = true

    function connect() {
      if (!mounted) return
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsConnected(false)
        return
      }
      try {
        es = new EventSource(`${REALTIME_API_URL}/api/events`)
      } catch {
        setIsConnected(false)
        scheduleReconnect()
        return
      }

      es.onopen = () => {
        retryDelay.current = 1000
        setIsConnected(true)
      }

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as RealtimeEvent

          if (data.type === 'connected') {
            retryDelay.current = 1000
            setIsConnected(true)
            return
          }

          if (data.type === 'plot_updated' || data.type === 'plot_created' || data.type === 'plot_deleted') {
            queryClient.invalidateQueries({ queryKey: ['plots'] })
            if (data.plotId) {
              queryClient.invalidateQueries({ queryKey: ['plot', data.plotId] })
              queryClient.invalidateQueries({ queryKey: ['nearbyPlots', data.plotId] })
              queryClient.invalidateQueries({ queryKey: ['similarPlots', data.plotId] })
            }
            queryClient.invalidateQueries({ queryKey: ['plot-stats'] })
            queryClient.invalidateQueries({ queryKey: ['featuredPlots'] })
          }

          if (data.type === 'lead_created') {
            queryClient.invalidateQueries({ queryKey: ['leads'] })
            queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
          }
        } catch {}
      }

      es.onerror = () => {
        es?.close()
        setIsConnected(false)
        scheduleReconnect()
      }
    }

    function scheduleReconnect() {
      if (!mounted) return
      if (reconnectTimer) clearTimeout(reconnectTimer)
      reconnectTimer = setTimeout(() => {
        retryDelay.current = Math.min(retryDelay.current * 2, 30000)
        connect()
      }, retryDelay.current)
    }

    function disconnect() {
      if (es) { es.close(); es = null }
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
      setIsConnected(false)
    }

    function handleOnline() {
      retryDelay.current = 1000
      disconnect()
      connect()
      queryClient.invalidateQueries({ queryKey: ['plots'] })
      queryClient.invalidateQueries({ queryKey: ['plot-stats'] })
    }

    function handleOffline() {
      disconnect()
    }

    function handleVisibilityChange() {
      if (document.hidden) return
      if (!es || es.readyState === EventSource.CLOSED) {
        retryDelay.current = 1000
        connect()
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    connect()

    return () => {
      mounted = false
      disconnect()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [queryClient])

  return { isConnected }
}

// ═══ useWebVitals ═══

const ANALYTICS_ENDPOINT = '/api/vitals'

type MetricName = 'LCP' | 'FID' | 'INP' | 'CLS' | 'TTFB'
type MetricRating = 'good' | 'needs-improvement' | 'poor'

type WebVitalMetric = {
  name: MetricName
  value: number
  delta: number
  rating: MetricRating
  navigationType: string
  interactionCount?: number
}

type PerformanceEventTimingLike = PerformanceEntry & {
  processingStart?: number
  interactionId?: number
  duration?: number
}

type LayoutShiftLike = PerformanceEntry & {
  value?: number
  hadRecentInput?: boolean
}

function reportMetric(metric: WebVitalMetric): void {
  if (import.meta.env.DEV) {
    console.debug(
      `[WebVital] ${metric.name}: ${Math.round(metric.value)}${metric.name === 'CLS' ? '' : 'ms'}`,
      metric
    )
    return
  }

  const body = JSON.stringify({
    type: 'web-vital',
    name: metric.name,
    value: Math.round(metric.value * 100) / 100,
    rating: metric.rating,
    delta: Math.round(metric.delta * 100) / 100,
    navigationType: metric.navigationType,
    url: window.location.pathname,
    timestamp: Date.now(),
  })

  if (navigator.sendBeacon) {
    navigator.sendBeacon(ANALYTICS_ENDPOINT, new Blob([body], { type: 'application/json' }))
  } else {
    fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {})
  }
}

function observeLCP(callback: (metric: WebVitalMetric) => void): PerformanceObserver | null {
  if (!('PerformanceObserver' in window)) return null
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      if (lastEntry) {
        callback({
          name: 'LCP',
          value: lastEntry.startTime,
          delta: lastEntry.startTime,
          rating: lastEntry.startTime <= 2500 ? 'good' : lastEntry.startTime <= 4000 ? 'needs-improvement' : 'poor',
          navigationType: getNavigationType(),
        })
      }
    })
    observer.observe({ type: 'largest-contentful-paint', buffered: true })
    return observer
  } catch {
    return null
  }
}

function observeFID(callback: (metric: WebVitalMetric) => void): PerformanceObserver | null {
  if (!('PerformanceObserver' in window)) return null
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceEventTimingLike[]
      const firstEntry = entries[0]
      if (firstEntry && typeof firstEntry.processingStart === 'number') {
        const value = firstEntry.processingStart - firstEntry.startTime
        callback({
          name: 'FID',
          value,
          delta: value,
          rating: value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor',
          navigationType: getNavigationType(),
        })
      }
    })
    observer.observe({ type: 'first-input', buffered: true })
    return observer
  } catch {
    return null
  }
}

function observeINP(callback: (metric: WebVitalMetric) => void): PerformanceObserver | null {
  if (!('PerformanceObserver' in window)) return null
  try {
    let worstINP = 0
    let interactionCount = 0
    const interactionDurations: number[] = []
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceEventTimingLike[]) {
        if (!entry.interactionId) continue
        const duration = entry.duration || 0
        interactionCount++
        interactionDurations.push(duration)
        if (duration > worstINP) worstINP = duration
      }
      let inpValue: number
      if (interactionDurations.length >= 50) {
        const sorted = [...interactionDurations].sort((a, b) => a - b)
        const idx = Math.floor(sorted.length * 0.98) - 1
        inpValue = sorted[Math.max(0, idx)]
      } else {
        inpValue = worstINP
      }
      if (inpValue > 0) {
        callback({
          name: 'INP',
          value: inpValue,
          delta: inpValue,
          rating: inpValue <= 200 ? 'good' : inpValue <= 500 ? 'needs-improvement' : 'poor',
          navigationType: getNavigationType(),
          interactionCount,
        })
      }
    })
    observer.observe({ type: 'event', buffered: true, durationThreshold: 16 })
    return observer
  } catch {
    return null
  }
}

function observeCLS(callback: (metric: WebVitalMetric) => void): PerformanceObserver | null {
  if (!('PerformanceObserver' in window)) return null
  try {
    let clsValue = 0
    let sessionValue = 0
    let sessionEntries: LayoutShiftLike[] = []
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LayoutShiftLike[]) {
        if (!entry.hadRecentInput) {
          const firstSessionEntry = sessionEntries[0]
          const lastSessionEntry = sessionEntries[sessionEntries.length - 1]
          if (
            sessionValue &&
            lastSessionEntry && firstSessionEntry &&
            (entry.startTime - lastSessionEntry.startTime > 1000 ||
              entry.startTime - firstSessionEntry.startTime > 5000)
          ) {
            if (sessionValue > clsValue) clsValue = sessionValue
            sessionValue = entry.value || 0
            sessionEntries = [entry]
          } else {
            sessionValue += entry.value || 0
            sessionEntries.push(entry)
          }
        }
      }
      const finalValue = Math.max(clsValue, sessionValue)
      callback({
        name: 'CLS',
        value: finalValue,
        delta: finalValue,
        rating: finalValue <= 0.1 ? 'good' : finalValue <= 0.25 ? 'needs-improvement' : 'poor',
        navigationType: getNavigationType(),
      })
    })
    observer.observe({ type: 'layout-shift', buffered: true })
    return observer
  } catch {
    return null
  }
}

function measureTTFB(callback: (metric: WebVitalMetric) => void): void {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (nav) {
      const value = nav.responseStart - nav.requestStart
      callback({
        name: 'TTFB',
        value,
        delta: value,
        rating: value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor',
        navigationType: getNavigationType(),
      })
    }
  } catch {}
}

function getNavigationType(): string {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    return nav?.type || 'navigate'
  } catch {
    return 'navigate'
  }
}

export function useWebVitals(enabled = true): void {
  const reported = useRef<Set<MetricName>>(new Set())

  useEffect(() => {
    if (!enabled) return

    const observers: PerformanceObserver[] = []

    const report = (metric: WebVitalMetric) => {
      if (reported.current.has(metric.name)) return
      reported.current.add(metric.name)
      reportMetric(metric)
    }

    const lcpObs = observeLCP(report)
    if (lcpObs) observers.push(lcpObs)

    const fidObs = observeFID(report)
    if (fidObs) observers.push(fidObs)

    const inpObs = observeINP(report)
    if (inpObs) observers.push(inpObs)

    const clsObs = observeCLS(report)
    if (clsObs) observers.push(clsObs)

    measureTTFB(report)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        reported.current.delete('INP')
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      observers.forEach(obs => {
        try { obs.disconnect() } catch {}
      })
    }
  }, [enabled])
}
