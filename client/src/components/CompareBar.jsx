import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, X, ArrowLeft, Share2, Check } from 'lucide-react'
import { statusColors } from '../utils/constants'
import { formatPriceShort } from '../utils/formatters'

export default function CompareBar({ compareIds, plots, onRemove, onClear }) {
  const navigate = useNavigate()
  const [linkCopied, setLinkCopied] = useState(false)

  if (!compareIds || compareIds.length === 0) return null

  const comparePlots = compareIds
    .map((id) => plots.find((p) => p.id === id))
    .filter(Boolean)

  return (
    <div className="compare-bar" dir="rtl">
      <div className="compare-bar-inner">
        {/* Label */}
        <div className="compare-bar-label">
          <BarChart3 className="w-4 h-4 text-gold" />
          <span className="text-sm font-medium text-slate-200">
            השוואה ({comparePlots.length}/3)
          </span>
        </div>

        {/* Plot chips */}
        <div className="compare-bar-chips">
          {comparePlots.map((plot) => {
            const color = statusColors[plot.status]
            const blockNum = plot.block_number ?? plot.blockNumber
            const price = plot.total_price ?? plot.totalPrice
            return (
              <div key={plot.id} className="compare-bar-chip" style={{ borderColor: `${color}40` }}>
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: color }}
                />
                <span className="text-xs text-slate-300 truncate">
                  {blockNum}/{plot.number} · {formatPriceShort(price)}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(plot.id) }}
                  className="w-4 h-4 rounded-full bg-white/10 hover:bg-red-500/30 flex items-center justify-center transition flex-shrink-0"
                >
                  <X className="w-2.5 h-2.5 text-slate-400" />
                </button>
              </div>
            )
          })}

          {/* Empty slots */}
          {Array.from({ length: 3 - comparePlots.length }).map((_, i) => (
            <div key={`empty-${i}`} className="compare-bar-chip-empty">
              <span className="text-[10px] text-slate-600">+ בחר חלקה</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="compare-bar-actions">
          <button
            onClick={onClear}
            className="text-xs text-slate-500 hover:text-red-400 transition"
          >
            נקה
          </button>
          {comparePlots.length >= 2 && (
            <button
              onClick={() => {
                const url = `${window.location.origin}/compare?plots=${compareIds.join(',')}`
                navigator.clipboard.writeText(url).then(() => {
                  setLinkCopied(true)
                  setTimeout(() => setLinkCopied(false), 2000)
                }).catch(() => {})
              }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-gold transition px-2 py-1 rounded-lg hover:bg-white/5"
              title="העתק קישור להשוואה"
            >
              {linkCopied ? <Check className="w-3 h-3 text-green-400" /> : <Share2 className="w-3 h-3" />}
              <span className="hidden sm:inline">{linkCopied ? 'הועתק!' : 'שתף'}</span>
            </button>
          )}
          <button
            onClick={() => navigate(`/compare?plots=${compareIds.join(',')}`)}
            disabled={comparePlots.length < 2}
            className="compare-bar-cta disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>השווה</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
