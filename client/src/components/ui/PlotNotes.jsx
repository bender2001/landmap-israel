import { useState, useCallback, useRef, useEffect } from 'react'
import { StickyNote, Tag, Trash2, Check } from 'lucide-react'
import { NOTE_TAGS } from '../../hooks/usePersonalNotes'

/**
 * PlotNotes — inline personal notes widget for the sidebar/detail page.
 * Investors can type freeform notes and tag plots with quick-select labels.
 * 
 * Design: compact by default (just a "Add note..." prompt), expands on click.
 * Tags are always visible when set — they act as quick visual labels on the sidebar.
 * 
 * Unique to LandMap — neither Madlan nor Yad2 offers per-listing private notes.
 * This feature alone can differentiate us for serious investors evaluating multiple plots.
 */
export default function PlotNotes({ plotId, notes }) {
  const note = notes.getNote(plotId)
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(note?.text || '')
  const textareaRef = useRef(null)
  const hasContent = note && (note.text || note.tags?.length)

  // Sync text state when plotId changes (navigating between plots)
  useEffect(() => {
    const current = notes.getNote(plotId)
    setText(current?.text || '')
    setIsEditing(false)
  }, [plotId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartEdit = useCallback(() => {
    setIsEditing(true)
    // Focus textarea after render
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
    })
  }, [])

  const handleSave = useCallback(() => {
    notes.setNote(plotId, text.trim())
    setIsEditing(false)
  }, [plotId, text, notes])

  const handleKeyDown = useCallback((e) => {
    // Ctrl+Enter or Cmd+Enter to save
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    }
    // Escape to cancel
    if (e.key === 'Escape') {
      setText(note?.text || '')
      setIsEditing(false)
    }
  }, [handleSave, note?.text])

  const handleDelete = useCallback(() => {
    notes.removeNote(plotId)
    setText('')
    setIsEditing(false)
  }, [plotId, notes])

  const activeTags = note?.tags || []

  return (
    <div className="bg-navy-light/30 border border-white/5 rounded-xl p-3 transition-all hover:border-white/10" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <StickyNote className="w-3.5 h-3.5 text-amber-400/70" />
        <span className="text-[11px] font-medium text-slate-400">הערות אישיות</span>
        {hasContent && (
          <button
            onClick={handleDelete}
            className="mr-auto text-slate-600 hover:text-red-400 transition-colors p-0.5"
            title="מחק הערה"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Quick tags — always visible, toggleable */}
      <div className="flex flex-wrap gap-1 mb-2">
        {NOTE_TAGS.map(tag => {
          const isActive = activeTags.includes(tag.id)
          return (
            <button
              key={tag.id}
              onClick={() => notes.toggleTag(plotId, tag.id)}
              className={`flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[9px] font-medium transition-all border ${
                isActive
                  ? 'border-current bg-current/10'
                  : 'border-white/5 bg-white/[0.02] text-slate-500 hover:bg-white/[0.05] hover:text-slate-300'
              }`}
              style={isActive ? { color: tag.color, borderColor: `${tag.color}40`, background: `${tag.color}15` } : undefined}
            >
              {tag.label}
            </button>
          )
        })}
      </div>

      {/* Note text — compact prompt or expanded editor */}
      {isEditing ? (
        <div className="space-y-1.5">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="רשום הערה... (למשל: דיברתי עם עו״ד, נסח נקי)"
            rows={3}
            className="w-full bg-navy/60 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 resize-none outline-none focus:border-gold/30 transition-colors"
            maxLength={500}
          />
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-600">{text.length}/500 · Ctrl+Enter לשמירה</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { setText(note?.text || ''); setIsEditing(false) }}
                className="px-2.5 py-1 text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-3 py-1 bg-gold/15 border border-gold/25 rounded-lg text-[10px] font-bold text-gold hover:bg-gold/25 transition-colors"
              >
                <Check className="w-3 h-3" />
                שמור
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={handleStartEdit}
          className={`w-full text-right px-3 py-2 rounded-lg border border-dashed transition-all text-xs ${
            note?.text
              ? 'border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.04]'
              : 'border-white/5 text-slate-600 hover:border-gold/20 hover:text-slate-400'
          }`}
        >
          {note?.text || '✏️ הוסף הערה אישית...'}
        </button>
      )}

      {/* Timestamp */}
      {note?.updatedAt && (
        <div className="text-[8px] text-slate-700 mt-1 text-left" dir="ltr">
          {new Date(note.updatedAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  )
}
