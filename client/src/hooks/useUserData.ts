// ─── useUserData.ts ─── Consolidated user data hooks
// Merges: useFavorites, useRecentlyViewed, useCompare, usePersonalNotes, useSavedSearches

import { useState, useCallback, useMemo, useEffect, useSyncExternalStore } from 'react'
import { useSearchParams } from 'react-router-dom'
import { showToast } from '../components/ui/ToastContainer'
import { useLocalStorage } from './useInfra'

// ═══ useFavorites ═══

const FAV_KEY = 'landmap_favorites'

let _favSnapshot: string[] = readFavStorage()
const _favListeners = new Set<() => void>()

function readFavStorage(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) || '[]') as string[]
  } catch {
    return []
  }
}

function favEmitChange(): void {
  for (const listener of _favListeners) listener()
}

function favSubscribe(listener: () => void): () => void {
  _favListeners.add(listener)
  return () => _favListeners.delete(listener)
}

function getFavSnapshot(): string[] {
  return _favSnapshot
}

function getFavServerSnapshot(): string[] {
  return []
}

function setFavoritesStore(next: string[]): void {
  _favSnapshot = next
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(next))
  } catch {}
  favEmitChange()
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === FAV_KEY) {
      _favSnapshot = readFavStorage()
      favEmitChange()
    }
  })
}

type UseFavoritesResult = {
  favorites: string[]
  toggle: (plotId: string) => void
  isFavorite: (plotId: string) => boolean
}

export function useFavorites(): UseFavoritesResult {
  const favorites = useSyncExternalStore(favSubscribe, getFavSnapshot, getFavServerSnapshot)
  const favoriteSet = useMemo(() => new Set(favorites), [favorites])

  const toggle = useCallback((plotId: string) => {
    const prev = getFavSnapshot()
    const wasInFavorites = prev.includes(plotId)
    const next = wasInFavorites
      ? prev.filter((id) => id !== plotId)
      : [...prev, plotId]
    setFavoritesStore(next)
    showToast(
      wasInFavorites ? '💔 הוסר מהמועדפים' : '❤️ נוסף למועדפים',
      wasInFavorites ? 'info' : 'success',
      { duration: 2000 }
    )
  }, [])

  const isFavorite = useCallback(
    (plotId: string) => favoriteSet.has(plotId),
    [favoriteSet]
  )

  return { favorites, toggle, isFavorite }
}

// ═══ useRecentlyViewed ═══

const RECENT_KEY = 'landmap_recently_viewed'
const RECENT_MAX = 20

let _recentSnapshot: string[] = readRecentStorage()
const _recentListeners = new Set<() => void>()

function readRecentStorage(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as string[]
  } catch {
    return []
  }
}

function recentEmitChange(): void {
  for (const listener of _recentListeners) listener()
}

function recentSubscribe(listener: () => void): () => void {
  _recentListeners.add(listener)
  return () => _recentListeners.delete(listener)
}

function getRecentSnapshot(): string[] {
  return _recentSnapshot
}

function getRecentServerSnapshot(): string[] {
  return []
}

function setRecentStore(next: string[]): void {
  _recentSnapshot = next
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {}
  recentEmitChange()
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === RECENT_KEY) {
      _recentSnapshot = readRecentStorage()
      recentEmitChange()
    }
  })
}

type UseRecentlyViewedResult = {
  recentIds: string[]
  recentSet: Set<string>
  recordView: (plotId: string) => void
  wasViewed: (plotId: string) => boolean
}

export function useRecentlyViewed(): UseRecentlyViewedResult {
  const recentIds = useSyncExternalStore(recentSubscribe, getRecentSnapshot, getRecentServerSnapshot)
  const recentSet = useMemo(() => new Set(recentIds), [recentIds])

  const recordView = useCallback((plotId: string) => {
    if (!plotId) return
    const prev = getRecentSnapshot()
    if (prev[0] === plotId) return
    const next = [plotId, ...prev.filter(id => id !== plotId)].slice(0, RECENT_MAX)
    setRecentStore(next)
  }, [])

  const wasViewed = useCallback(
    (plotId: string) => recentSet.has(plotId),
    [recentSet],
  )

  return { recentIds, recentSet, recordView, wasViewed }
}

// ═══ useCompare ═══

const MAX_COMPARE = 3

type UseCompareResult = {
  compareIds: string[]
  addToCompare: (plotId: string) => void
  removeFromCompare: (plotId: string) => void
  isInCompare: (plotId: string) => boolean
  clearCompare: () => void
  isFull: boolean
}

export function useCompare(): UseCompareResult {
  const [searchParams, setSearchParams] = useSearchParams()

  const compareIds = (searchParams.get('plots') || '').split(',').filter(Boolean)

  const addToCompare = useCallback((plotId: string) => {
    const current = (searchParams.get('plots') || '').split(',').filter(Boolean)
    if (current.includes(plotId) || current.length >= MAX_COMPARE) return
    const next = [...current, plotId]
    setSearchParams({ plots: next.join(',') }, { replace: true })
  }, [searchParams, setSearchParams])

  const removeFromCompare = useCallback((plotId: string) => {
    const current = (searchParams.get('plots') || '').split(',').filter(Boolean)
    const next = current.filter((id) => id !== plotId)
    if (next.length > 0) {
      setSearchParams({ plots: next.join(',') }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const isInCompare = useCallback((plotId: string) => {
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

// ═══ usePersonalNotes ═══

type NoteTag = {
  id: string
  label: string
  color: string
}

type NoteEntry = {
  text?: string
  updatedAt?: number
  tags?: string[]
}

type NotesStore = Record<string, NoteEntry>

export const NOTE_TAGS: NoteTag[] = [
  { id: 'interesting', label: '⭐ מעניין', color: '#C8942A' },
  { id: 'check', label: '🔍 לבדוק', color: '#3B82F6' },
  { id: 'call', label: '📞 להתקשר', color: '#22C55E' },
  { id: 'not-relevant', label: '❌ לא רלוונטי', color: '#EF4444' },
  { id: 'negotiable', label: '💬 ניתן למו"מ', color: '#A855F7' },
  { id: 'attorney', label: '⚖️ עו"ד', color: '#F97316' },
]

type UsePersonalNotesResult = {
  getNote: (plotId: string) => NoteEntry | null
  setNote: (plotId: string, text: string) => void
  toggleTag: (plotId: string, tagId: string) => void
  removeNote: (plotId: string) => void
  hasNote: (plotId: string) => boolean
  noteCount: number
  notedPlotIds: Set<string>
  exportNotes: () => string
  importNotes: (jsonStr: string) => boolean
  allNotes: NotesStore
}

export function usePersonalNotes(): UsePersonalNotesResult {
  const [notes, setNotes] = useLocalStorage<NotesStore>('landmap_notes', {})

  const getNote = useCallback((plotId: string) => {
    return notes[plotId] || null
  }, [notes])

  const setNote = useCallback((plotId: string, text: string) => {
    setNotes((prev) => {
      const existing = prev[plotId] || {}
      if (!text && !existing.tags?.length) {
        const { [plotId]: _, ...rest } = prev
        return rest
      }
      return {
        ...prev,
        [plotId]: {
          ...existing,
          text: text || '',
          updatedAt: Date.now(),
        },
      }
    })
  }, [setNotes])

  const toggleTag = useCallback((plotId: string, tagId: string) => {
    setNotes((prev) => {
      const existing = prev[plotId] || { text: '', tags: [] }
      const tags = existing.tags || []
      const newTags = tags.includes(tagId)
        ? tags.filter(t => t !== tagId)
        : [...tags, tagId]

      if (!existing.text && newTags.length === 0) {
        const { [plotId]: _, ...rest } = prev
        return rest
      }
      return {
        ...prev,
        [plotId]: {
          ...existing,
          tags: newTags,
          updatedAt: Date.now(),
        },
      }
    })
  }, [setNotes])

  const removeNote = useCallback((plotId: string) => {
    setNotes((prev) => {
      const { [plotId]: _, ...rest } = prev
      return rest
    })
  }, [setNotes])

  const hasNote = useCallback((plotId: string) => {
    const n = notes[plotId]
    return !!(n && (n.text || n.tags?.length))
  }, [notes])

  const noteCount = useMemo(() => Object.keys(notes).length, [notes])
  const notedPlotIds = useMemo(() => new Set(Object.keys(notes)), [notes])

  const exportNotes = useCallback(() => {
    return JSON.stringify(notes, null, 2)
  }, [notes])

  const importNotes = useCallback((jsonStr: string) => {
    try {
      const imported = JSON.parse(jsonStr) as NotesStore
      if (typeof imported !== 'object' || imported === null) return false
      setNotes((prev) => ({ ...prev, ...imported }))
      return true
    } catch {
      return false
    }
  }, [setNotes])

  return {
    getNote,
    setNote,
    toggleTag,
    removeNote,
    hasNote,
    noteCount,
    notedPlotIds,
    exportNotes,
    importNotes,
    allNotes: notes,
  }
}

// ═══ useSavedSearches ═══

const SEARCH_KEY = 'landmap_saved_searches'
const MAX_SAVED = 10

type SavedSearch = {
  id: string
  name: string
  filters: Record<string, unknown>
  statusFilter: string[]
  sortBy: string
  createdAt: number
}

function loadSearches(): SavedSearch[] {
  try {
    return JSON.parse(localStorage.getItem(SEARCH_KEY) || '[]') as SavedSearch[]
  } catch {
    return []
  }
}

function persistSearches(searches: SavedSearch[]): void {
  localStorage.setItem(SEARCH_KEY, JSON.stringify(searches))
}

type UseSavedSearchesResult = {
  searches: SavedSearch[]
  save: (name: string, filters: Record<string, unknown>, statusFilter?: string[], sortBy?: string) => void
  remove: (id: string) => void
  clear: () => void
}

export function useSavedSearches(): UseSavedSearchesResult {
  const [searches, setSearches] = useState<SavedSearch[]>(loadSearches)

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === SEARCH_KEY) setSearches(loadSearches())
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const save = useCallback((name: string, filters: Record<string, unknown>, statusFilter?: string[], sortBy?: string) => {
    setSearches((prev) => {
      const entry: SavedSearch = {
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

  const remove = useCallback((id: string) => {
    setSearches((prev) => {
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
