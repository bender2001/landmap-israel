import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'landmap_saved_searches'
const MAX_SAVED = 10

function loadSearches() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function persistSearches(searches) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(searches))
}

/**
 * Hook for managing saved search filter presets.
 * Like Madlan's "שמור חיפוש" — users can save, load, and delete filter combos.
 */
export function useSavedSearches() {
  const [searches, setSearches] = useState(loadSearches)

  // Sync across tabs
  useEffect(() => {
    const handler = (e) => {
      if (e.key === STORAGE_KEY) setSearches(loadSearches())
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const save = useCallback((name, filters, statusFilter, sortBy) => {
    setSearches(prev => {
      const entry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name,
        filters: { ...filters },
        statusFilter: [...(statusFilter || [])],
        sortBy: sortBy || 'default',
        createdAt: Date.now(),
      }
      const updated = [entry, ...prev].slice(0, MAX_SAVED)
      persistSearches(updated)
      return updated
    })
  }, [])

  const remove = useCallback((id) => {
    setSearches(prev => {
      const updated = prev.filter(s => s.id !== id)
      persistSearches(updated)
      return updated
    })
  }, [])

  const clear = useCallback(() => {
    setSearches([])
    persistSearches([])
  }, [])

  return { searches, save, remove, clear }
}
