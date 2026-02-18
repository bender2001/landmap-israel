import { useState, useRef, useEffect } from 'react'
import { Bookmark, BookmarkPlus, X, Trash2, Clock, ChevronDown, Check } from 'lucide-react'

/**
 * Saved Searches panel — like Madlan's "שמור חיפוש".
 * Shows a dropdown of saved filter presets that users can save, load, and delete.
 */
export default function SavedSearches({
  searches,
  onSave,
  onLoad,
  onRemove,
  currentFilters,
  currentStatusFilter,
  currentSortBy,
  activeCount,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveName, setSaveName] = useState('')
  const ref = useRef(null)
  const inputRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false)
        setIsSaving(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Auto-focus input when saving
  useEffect(() => {
    if (isSaving && inputRef.current) inputRef.current.focus()
  }, [isSaving])

  const handleSave = () => {
    if (!saveName.trim()) return
    onSave(saveName.trim(), currentFilters, currentStatusFilter, currentSortBy)
    setSaveName('')
    setIsSaving(false)
  }

  const formatLabel = (search) => {
    const parts = []
    if (search.filters.city && search.filters.city !== 'all') parts.push(search.filters.city)
    if (search.filters.priceMin || search.filters.priceMax) parts.push('💰')
    if (search.filters.sizeMin || search.filters.sizeMax) parts.push('📐')
    if (search.statusFilter?.length > 0) parts.push(`${search.statusFilter.length} סטטוסים`)
    if (search.filters.minRoi && search.filters.minRoi !== 'all') parts.push(`ROI ${search.filters.minRoi}%+`)
    return parts.length > 0 ? parts.join(' · ') : 'כל החלקות'
  }

  const timeAgo = (ts) => {
    const diff = Date.now() - ts
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins} דק׳`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} שעות`
    const days = Math.floor(hours / 24)
    return `${days} ימים`
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setIsOpen(prev => !prev); setIsSaving(false) }}
        className={`filter-pill-trigger ${searches.length > 0 ? 'is-active' : ''} ${isOpen ? 'is-open' : ''}`}
        title="חיפושים שמורים"
      >
        <Bookmark className="filter-pill-icon" />
        <span className="filter-pill-label">שמורים</span>
        {searches.length > 0 && (
          <span className="bg-gold/20 text-gold text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {searches.length}
          </span>
        )}
        <ChevronDown className={`filter-pill-chevron ${isOpen ? 'rotated' : ''}`} />
      </button>

      {isOpen && (
        <div className="filter-pill-dropdown" style={{ minWidth: '280px' }}>
          <div className="filter-pill-dropdown-header flex items-center justify-between">
            <span>חיפושים שמורים</span>
            {activeCount > 0 && !isSaving && (
              <button
                onClick={() => setIsSaving(true)}
                className="flex items-center gap-1 text-[10px] text-gold hover:text-gold-bright transition-colors"
              >
                <BookmarkPlus className="w-3 h-3" />
                שמור חיפוש נוכחי
              </button>
            )}
          </div>

          {/* Save form */}
          {isSaving && (
            <div className="px-3 py-2 border-b border-white/5">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  placeholder="שם לחיפוש..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-gold/30"
                  maxLength={30}
                />
                <button
                  onClick={handleSave}
                  disabled={!saveName.trim()}
                  className="px-3 py-1.5 bg-gold/20 border border-gold/30 rounded-lg text-xs text-gold font-medium hover:bg-gold/30 transition-colors disabled:opacity-40"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={() => { setIsSaving(false); setSaveName('') }}
                  className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-400 hover:bg-white/10 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Saved list */}
          {searches.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <Bookmark className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <div className="text-xs text-slate-500">אין חיפושים שמורים</div>
              <div className="text-[10px] text-slate-600 mt-1">
                הגדר מסננים ולחץ ״שמור חיפוש נוכחי״
              </div>
            </div>
          ) : (
            <div className="max-h-[280px] overflow-y-auto">
              {searches.map((search) => (
                <div
                  key={search.id}
                  className="flex items-center gap-2 px-3 py-2.5 hover:bg-white/5 transition-colors group cursor-pointer"
                  onClick={() => {
                    onLoad(search)
                    setIsOpen(false)
                  }}
                >
                  <Bookmark className="w-3.5 h-3.5 text-gold/60 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-200 truncate">{search.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{formatLabel(search)}</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[9px] text-slate-600 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {timeAgo(search.createdAt)}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemove(search.id) }}
                      className="w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
                      title="מחק"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
