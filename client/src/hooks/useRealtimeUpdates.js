import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

const API_URL = import.meta.env.VITE_API_URL || ''

/**
 * Subscribe to Server-Sent Events for real-time plot updates.
 * When the server broadcasts a plot change, we invalidate the relevant
 * React Query cache so the UI refreshes without manual reload.
 * Includes automatic reconnection with exponential backoff.
 */
export function useRealtimeUpdates() {
  const queryClient = useQueryClient()
  const retryDelay = useRef(1000)

  useEffect(() => {
    let es = null
    let reconnectTimer = null
    let mounted = true

    function connect() {
      if (!mounted) return
      try {
        es = new EventSource(`${API_URL}/api/events`)
      } catch {
        scheduleReconnect()
        return
      }

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'connected') {
            retryDelay.current = 1000 // Reset backoff on success
            return
          }

          // Invalidate queries based on event type
          if (data.type === 'plot_updated' || data.type === 'plot_created' || data.type === 'plot_deleted') {
            queryClient.invalidateQueries({ queryKey: ['plots'] })
            if (data.plotId) {
              queryClient.invalidateQueries({ queryKey: ['plot', data.plotId] })
              queryClient.invalidateQueries({ queryKey: ['nearbyPlots', data.plotId] })
            }
            queryClient.invalidateQueries({ queryKey: ['plot-stats'] })
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
        scheduleReconnect()
      }
    }

    function scheduleReconnect() {
      if (!mounted) return
      reconnectTimer = setTimeout(() => {
        retryDelay.current = Math.min(retryDelay.current * 2, 30000) // Max 30s
        connect()
      }, retryDelay.current)
    }

    connect()

    return () => {
      mounted = false
      if (es) es.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [queryClient])
}
