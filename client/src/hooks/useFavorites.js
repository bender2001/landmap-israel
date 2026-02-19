import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { showToast } from '../components/ui/ToastContainer'

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
 *
 * PERF v2: isFavorite now uses a derived Set for O(1) lookups instead of
 * Array.includes() which was O(n). In PlotCardStrip, isFavorite is called for
 * every card (12+ times per render cycle). With a typical 10-item favorites list,
 * this reduces comparison work from 120 ops (12×10 linear scans) to 12 ops
 * (12 × O(1) Set.has). The Set is derived via useMemo — only recomputed when
 * the favorites array reference changes (which only happens on toggle).
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

  // Derived Set for O(1) lookups — only recomputed when favorites array changes.
  // Previously, isFavorite used Array.includes() which is O(n) per call.
  // With 12+ plots rendered in PlotCardStrip, each checking isFavorite,
  // this was 12 × O(n) = O(12n) per render. Now it's 12 × O(1) = O(12).
  const favoriteSet = useMemo(() => new Set(favorites), [favorites])

  const toggle = useCallback((plotId) => {
    const prev = getSnapshot()
    const wasInFavorites = prev.includes(plotId)
    const next = wasInFavorites
      ? prev.filter((id) => id !== plotId)
      : [...prev, plotId]
    setFavorites(next)
    // Toast feedback — like Madlan's "נשמר במועדפים" / "הוסר מהמועדפים" confirmation.
    // Users need immediate visual confirmation that their action registered,
    // especially on mobile where the heart icon might be small and hard to see.
    showToast(
      wasInFavorites ? '💔 הוסר מהמועדפים' : '❤️ נוסף למועדפים',
      wasInFavorites ? 'info' : 'success',
      { duration: 2000 }
    )
  }, [])

  const isFavorite = useCallback(
    (plotId) => favoriteSet.has(plotId),
    [favoriteSet],
  )

  return { favorites, toggle, isFavorite }
}
