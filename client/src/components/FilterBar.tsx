/**
 * FilterBar.tsx — Thin re-export wrapper.
 *
 * The implementation has been decomposed into filter/ sub-modules:
 *   filter/SearchAutocomplete.tsx  — Search with autocomplete + debounce
 *   filter/ActiveFilterChips.tsx   — Active filter chip display (map overlay)
 *   filter/FilterSuggestions.tsx   — Smart filter suggestions
 *   filter/FilterDrawer.tsx        — Mobile filter overlay + groups + sort + main FilterBar
 *   filter/index.tsx               — Orchestrator barrel
 */

export { SearchAutocomplete, ActiveFilterChips, FilterSuggestions } from './filter'
export type { SearchAutocompleteProps, ActiveFilterChipsProps, FilterSuggestionsProps } from './filter'
export type { FilterBarProps } from './filter'
export { default } from './filter'
