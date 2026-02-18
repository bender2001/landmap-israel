import { X, Keyboard } from 'lucide-react'

const shortcuts = [
  { keys: ['Ctrl', 'K'], label: 'פתח חיפוש' },
  { keys: ['/'], label: 'פתח צ׳אט AI' },
  { keys: ['←', '→'], label: 'ניווט בין חלקות' },
  { keys: ['Enter'], label: 'פתח חלקה בדף מלא' },
  { keys: ['Esc'], label: 'סגירת חלון / סרגל צד' },
  { keys: ['F'], label: 'הוסף/הסר ממועדפים' },
  { keys: ['C'], label: 'הוסף/הסר מהשוואה' },
  { keys: ['P'], label: 'הדפס דו״ח השקעה' },
  { keys: ['?'], label: 'קיצורי מקלדת (עזרה זו)' },
]

export default function KeyboardShortcuts({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80]" onClick={onClose} />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[81] w-[340px] max-w-[90vw] bg-navy border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-gold" />
            <h3 className="text-sm font-bold text-slate-100">קיצורי מקלדת</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-4 space-y-3">
          {shortcuts.map((shortcut, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-slate-300">{shortcut.label}</span>
              <div className="flex items-center gap-1.5">
                {shortcut.keys.map((key, j) => (
                  <kbd
                    key={j}
                    className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-xs font-medium text-slate-200 bg-white/5 border border-white/10 rounded-lg"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-4 pb-3">
          <p className="text-[10px] text-slate-500 text-center">
            לחץ <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px]">?</kbd> או <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px]">Esc</kbd> לסגירה
          </p>
        </div>
      </div>
    </>
  )
}
