import { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

const MAX_COMPARE = 3

export function useCompare() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Read IDs from URL params
  const compareIds = (searchParams.get('plots') || '')
    .split(',')
    .filter(Boolean)

  const addToCompare = useCallback((plotId) => {
    const current = (searchParams.get('plots') || '').split(',').filter(Boolean)
    if (current.includes(plotId) || current.length >= MAX_COMPARE) return
    const next = [...current, plotId]
    setSearchParams({ plots: next.join(',') }, { replace: true })
  }, [searchParams, setSearchParams])

  const removeFromCompare = useCallback((plotId) => {
    const current = (searchParams.get('plots') || '').split(',').filter(Boolean)
    const next = current.filter((id) => id !== plotId)
    if (next.length > 0) {
      setSearchParams({ plots: next.join(',') }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const isInCompare = useCallback((plotId) => {
    return compareIds.includes(plotId)
  }, [compareIds])

  const clearCompare = useCallback(() => {
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  return {
    compareIds,
    addToCompare,
    removeFromCompare,
    isInCompare,
    clearCompare,
    isFull: compareIds.length >= MAX_COMPARE,
  }
}
