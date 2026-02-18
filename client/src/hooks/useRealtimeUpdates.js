import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

const API_URL = import.meta.env.VITE_API_URL || ''

/**
 * Subscribe to Server-Sent Events for real-time plot updates.
 * When the server broadcasts a plot change, we invalidate the relevant
 * React Query cache so the UI refreshes without manual reload.
 * Includes automatic reconnection with exponential backoff,
 * online/offline awareness, and visibility-based reconnection.
 */
export function useRealtimeUpdates() {
  const queryClient = useQueryClient()
  const retryDelay = useRef(1000)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    let es = null
    let reconnectTimer = null
    let mounted = true

    function connect() {
      if (!mounted) return
      // Don't try to connect when browser is offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsConnected(false)
        return
      }
      try {
        es = new EventSource(`${API_URL}/api/events`)
      } catch {
        setIsConnected(false)
        scheduleReconnect()
        return
      }

      es.onopen = () => {
        retryDelay.current = 1000 // Reset backoff on successful open
        setIsConnected(true)
      }

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'connected') {
            retryDelay.current = 1000
            setIsConnected(true)
            return
          }

          // Invalidate queries based on event type
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
        } catch {
          // Ignore malformed events
        }
      }

      es.onerror = () => {
        es.close()
        setIsConnected(false)
        scheduleReconnect()
      }
    }

    function scheduleReconnect() {
      if (!mounted) return
      if (reconnectTimer) clearTimeout(reconnectTimer)
      reconnectTimer = setTimeout(() => {
        retryDelay.current = Math.min(retryDelay.current * 2, 30000) // Max 30s
        connect()
      }, retryDelay.current)
    }

    function disconnect() {
      if (es) { es.close(); es = null }
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
      setIsConnected(false)
    }

    // Reconnect immediately when the browser comes back online
    function handleOnline() {
      retryDelay.current = 1000
      disconnect()
      connect()
      // Also refetch stale data that may have changed while offline
      queryClient.invalidateQueries({ queryKey: ['plots'] })
      queryClient.invalidateQueries({ queryKey: ['plot-stats'] })
    }

    function handleOffline() {
      disconnect()
    }

    // Reconnect when tab becomes visible again (handles laptop sleep/wake)
    function handleVisibilityChange() {
      if (document.hidden) return
      // If we're not connected and we're online, reconnect
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
