import { useCallback, useSyncExternalStore } from 'react'

/**
 * Cross-component synchronized favorites using useSyncExternalStore.
 *
 * BUG FIX: The previous implementation used useState(readFavorites) per component,
 * meaning each hook instance had its own isolated state copy. Toggling a favorite
 * in one component (e.g., SidebarDetails heart button) did NOT update other
 * components (e.g., PlotCardStrip, Favorites page, MobileBottomNav badge).
 * This caused ghost favorites, stale badge counts, and inconsistent UI.
 *
 * Solution: useSyncExternalStore with a shared module-level store + event bus.
 * All components subscribe to the same store — when favorites change anywhere,
 * every subscriber re-renders. This is the React 18 recommended pattern for
 * shared external state, matching how Madlan handles saved properties.
 *
 * Performance: Only components reading favorites re-render. The subscriber
 * callback uses Object.is identity checks — no unnecessary re-renders.
 */

const STORAGE_KEY = 'landmap_favorites'

// ── Module-level shared store ──────────────────────────────────────────
let _snapshot = readFromStorage()
const _listeners = new Set()

function readFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function emitChange() {
  for (const listener of _listeners) listener()
}

function subscribe(listener) {
  _listeners.add(listener)
  return () => _listeners.delete(listener)
}

function getSnapshot() {
  return _snapshot
}

// Server-side rendering fallback (always empty)
function getServerSnapshot() {
  return []
}

function setFavorites(next) {
  _snapshot = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch { /* quota exceeded — non-critical */ }
  emitChange()
}

// ── Cross-tab synchronization ──────────────────────────────────────────
// When the user has multiple tabs open, favorites should sync across all of them.
// The 'storage' event fires in OTHER tabs when localStorage changes.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      _snapshot = readFromStorage()
      emitChange()
    }
  })
}

// ── Public hook ────────────────────────────────────────────────────────
export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const toggle = useCallback((plotId) => {
    const prev = getSnapshot()
    const next = prev.includes(plotId)
      ? prev.filter((id) => id !== plotId)
      : [...prev, plotId]
    setFavorites(next)
  }, [])

  const isFavorite = useCallback(
    (plotId) => favorites.includes(plotId),
    [favorites],
  )

  return { favorites, toggle, isFavorite }
}
