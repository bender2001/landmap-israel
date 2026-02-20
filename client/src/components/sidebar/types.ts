// ─── Shared types for sidebar sub-components ────────────────────────────

export interface SidebarDetailsProps {
  plot: any
  onClose: () => void
  onOpenLeadModal: () => void
  favorites?: any
  compareIds?: string[]
  onToggleCompare?: (id: string) => void
  allPlots?: any[]
  onSelectPlot?: (plot: any) => void
  priceChange?: any
  personalNotes?: any
}

export interface PlotNavigationProps {
  currentPlot: any
  allPlots: any[]
  onSelectPlot: (plot: any) => void
}

export interface SimilarPlotsProps {
  currentPlot: any
  allPlots: any[]
  onSelectPlot: (plot: any) => void
}

export interface QuickNavBarProps {
  scrollRef: React.RefObject<HTMLElement>
}

export interface CommuteTimesSectionProps {
  coordinates: any[]
}

export interface MiniMortgageCalcProps {
  totalPrice: number
}

export interface NearbyPoisSectionProps {
  plotId: string
}
