/**
 * FilterSuggestions — smart filter-loosening suggestions when results are very few (<4).
 * Like Madlan's "הרחב חיפוש" nudge that keeps users engaged instead of hitting a dead end.
 *
 * When active filters produce very few results, this component suggests which specific
 * filter to loosen. Each suggestion shows which filter to remove and what effect it would have.
 * Includes a "clear all" option when multiple filters are active.
 *
 * Only shows when: results < 4 AND at least one filter is active AND total plots > 0.
 */
export default function FilterSuggestions({ filteredCount, totalCount, filters, statusFilter, onFilterChange, onToggleStatus, onClearFilters }) {
  // Count active filters
  const activeCount =
    (filters.city !== 'all' ? 1 : 0) +
    (filters.priceMin || filters.priceMax ? 1 : 0) +
    (filters.sizeMin || filters.sizeMax ? 1 : 0) +
    (filters.ripeness !== 'all' ? 1 : 0) +
    (filters.minRoi && filters.minRoi !== 'all' ? 1 : 0) +
    (filters.zoning && filters.zoning !== 'all' ? 1 : 0) +
    (filters.maxDays ? 1 : 0) +
    (filters.maxMonthly ? 1 : 0) +
    (filters.search ? 1 : 0) +
    statusFilter.length

  if (filteredCount >= 4 || activeCount === 0 || totalCount === 0) return null

  // Build suggestions: which filter, if removed, would improve results
  const suggestions = []
  if (filters.city !== 'all') suggestions.push({ label: `הסר סינון "${filters.city}"`, action: () => onFilterChange('city', 'all'), icon: '🏙️' })
  if (filters.priceMin || filters.priceMax) suggestions.push({ label: 'הרחב טווח מחירים', action: () => { onFilterChange('priceMin', ''); onFilterChange('priceMax', '') }, icon: '💰' })
  if (filters.sizeMin || filters.sizeMax) suggestions.push({ label: 'הרחב טווח שטח', action: () => { onFilterChange('sizeMin', ''); onFilterChange('sizeMax', '') }, icon: '📐' })
  if (filters.minRoi && filters.minRoi !== 'all') suggestions.push({ label: 'הסר סינון תשואה', action: () => onFilterChange('minRoi', 'all'), icon: '📈' })
  if (filters.zoning && filters.zoning !== 'all') suggestions.push({ label: 'הסר סינון תכנוני', action: () => onFilterChange('zoning', 'all'), icon: '🗺️' })
  if (filters.ripeness !== 'all') suggestions.push({ label: 'הסר סינון בשלות', action: () => onFilterChange('ripeness', 'all'), icon: '⏱️' })
  if (filters.maxDays) suggestions.push({ label: 'הסר סינון חדשות', action: () => onFilterChange('maxDays', ''), icon: '🆕' })
  if (filters.maxMonthly) suggestions.push({ label: 'הסר סינון תשלום חודשי', action: () => onFilterChange('maxMonthly', ''), icon: '🏦' })
  statusFilter.forEach(s => suggestions.push({ label: `הסר סטטוס "${s === 'AVAILABLE' ? 'זמין' : s === 'SOLD' ? 'נמכר' : s}"`, action: () => onToggleStatus(s), icon: '🏷️' }))

  if (suggestions.length === 0) return null

  return (
    <div className="fixed bottom-[18rem] sm:bottom-[19rem] left-1/2 -translate-x-1/2 z-[35] animate-bounce-in" dir="rtl">
      <div className="bg-navy/90 backdrop-blur-md border border-gold/15 rounded-2xl px-4 py-3 shadow-xl max-w-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">💡</span>
          <span className="text-[11px] text-gold font-medium">
            {filteredCount === 0 ? 'אין תוצאות' : `רק ${filteredCount} תוצאות`} — נסה להרחיב:
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {suggestions.slice(0, 3).map((s, i) => (
            <button
              key={i}
              onClick={s.action}
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-slate-300 bg-white/5 border border-white/10 rounded-lg hover:bg-gold/10 hover:border-gold/20 hover:text-gold transition-all"
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
          {activeCount > 1 && (
            <button
              onClick={onClearFilters}
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-gold bg-gold/10 border border-gold/20 rounded-lg hover:bg-gold/15 transition-all"
            >
              🔄 נקה הכל
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
