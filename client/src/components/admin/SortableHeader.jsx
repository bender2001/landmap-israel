import { ChevronUp, ChevronDown } from 'lucide-react'

export default function SortableHeader({ label, column, sortBy, sortDir, onSort, className = '' }) {
  const isActive = sortBy === column
  const dir = isActive ? sortDir : null

  return (
    <th
      className={`text-right py-3 px-4 font-medium cursor-pointer select-none group transition-colors hover:text-gold ${
        isActive ? 'text-gold' : 'text-slate-400'
      } ${className}`}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <span className="flex flex-col -space-y-1">
          <ChevronUp
            className={`w-3 h-3 transition-colors ${
              dir === 'asc' ? 'text-gold' : 'text-slate-600 group-hover:text-slate-400'
            }`}
          />
          <ChevronDown
            className={`w-3 h-3 transition-colors ${
              dir === 'desc' ? 'text-gold' : 'text-slate-600 group-hover:text-slate-400'
            }`}
          />
        </span>
      </div>
    </th>
  )
}
