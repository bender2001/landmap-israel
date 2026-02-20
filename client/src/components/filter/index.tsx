/**
 * filter/index.tsx — Orchestrator barrel for FilterBar decomposition.
 *
 * Re-exports the 3 named exports consumed by MapView.tsx:
 *   - SearchAutocomplete
 *   - ActiveFilterChips
 *   - FilterSuggestions
 *
 * And the default export: FilterBar
 */

export { SearchAutocomplete } from './SearchAutocomplete'
export type { SearchAutocompleteProps, SA_Plot } from './SearchAutocomplete'

export { ActiveFilterChips } from './ActiveFilterChips'
export type { ActiveFilterChipsProps, AFC_Filters, AFC_FilterKey } from './ActiveFilterChips'

export { FilterSuggestions } from './FilterSuggestions'
export type { FilterSuggestionsProps, FS_Filters, FS_FilterKey } from './FilterSuggestions'

export { default } from './FilterDrawer'
export type { FilterBarProps } from './FilterDrawer'
