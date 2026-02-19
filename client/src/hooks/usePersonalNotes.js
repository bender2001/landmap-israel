import { useState, useCallback, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'

/**
 * usePersonalNotes — private investor notes attached to specific plots.
 * 
 * Serious real estate investors evaluate 10-30 plots before buying. They need a way
 * to jot down thoughts like "spoke with attorney — title clean", "too close to highway",
 * "meet seller Thursday", etc. Neither Madlan nor Yad2 offers per-listing notes.
 * 
 * Stored in localStorage (private, no server needed). Structure:
 * { [plotId]: { text: string, updatedAt: number, tags: string[] } }
 * 
 * Tags enable quick categorization: "לבדוק", "מעניין", "לא רלוונטי", "להתקשר"
 */
const NOTE_TAGS = [
  { id: 'interesting', label: '⭐ מעניין', color: '#C8942A' },
  { id: 'check', label: '🔍 לבדוק', color: '#3B82F6' },
  { id: 'call', label: '📞 להתקשר', color: '#22C55E' },
  { id: 'not-relevant', label: '❌ לא רלוונטי', color: '#EF4444' },
  { id: 'negotiable', label: '💬 ניתן למו"מ', color: '#A855F7' },
  { id: 'attorney', label: '⚖️ עו"ד', color: '#F97316' },
]

export { NOTE_TAGS }

export function usePersonalNotes() {
  const [notes, setNotes] = useLocalStorage('landmap_notes', {})

  const getNote = useCallback((plotId) => {
    return notes[plotId] || null
  }, [notes])

  const setNote = useCallback((plotId, text) => {
    setNotes(prev => {
      const existing = prev[plotId] || {}
      if (!text && !existing.tags?.length) {
        // Remove entirely if both text and tags are empty
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

  const toggleTag = useCallback((plotId, tagId) => {
    setNotes(prev => {
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

  const removeNote = useCallback((plotId) => {
    setNotes(prev => {
      const { [plotId]: _, ...rest } = prev
      return rest
    })
  }, [setNotes])

  const hasNote = useCallback((plotId) => {
    const n = notes[plotId]
    return !!(n && (n.text || n.tags?.length))
  }, [notes])

  // Count of all plots with notes — for badge display
  const noteCount = useMemo(() => Object.keys(notes).length, [notes])

  // Get all plot IDs with notes — for filtering/highlighting
  const notedPlotIds = useMemo(() => new Set(Object.keys(notes)), [notes])

  // Export all notes as JSON string (for backup/sharing)
  const exportNotes = useCallback(() => {
    return JSON.stringify(notes, null, 2)
  }, [notes])

  // Import notes from JSON string (merge, don't overwrite)
  const importNotes = useCallback((jsonStr) => {
    try {
      const imported = JSON.parse(jsonStr)
      if (typeof imported !== 'object' || imported === null) return false
      setNotes(prev => ({ ...prev, ...imported }))
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
