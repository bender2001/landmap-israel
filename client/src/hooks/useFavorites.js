import { useState, useCallback } from 'react'

const STORAGE_KEY = 'landmap_favorites'

function readFavorites() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState(readFavorites)

  const toggle = useCallback((plotId) => {
    setFavorites((prev) => {
      const next = prev.includes(plotId)
        ? prev.filter((id) => id !== plotId)
        : [...prev, plotId]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const isFavorite = useCallback((plotId) => favorites.includes(plotId), [favorites])

  return { favorites, toggle, isFavorite }
}
