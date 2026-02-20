/**
 * Backward-compatibility re-exports from Design System.
 * New code should import from 'components/ds' directly.
 */
import styled from 'styled-components'
import { media } from './theme'

// Re-export DS primitives under their original names
export {
  fadeIn, pulse, spin, shimmer, cardLift as CardLift,
} from '../components/ds/animations'

export {
  PageShell as PageWrapper, Container,
  Row as FlexRow, Stack as FlexCol,
  RowBetween as FlexBetween, RowCenter as FlexCenter,
  Grid, Divider,
} from '../components/ds/Layout'

export {
  Label, SmallLabel, Muted, BrandGradient as BrandText, SectionTitle,
} from '../components/ds/Typography'

export {
  GlassCard as GlassPanel, GlassCard as GlassPanelPadded,
} from '../components/ds/Surfaces'

export {
  StatCard as StatCardWrap,
  Badge, ProgressTrack, ProgressFill,
} from '../components/ds/Feedback'

export { Button as GoldButton } from '../components/ds/Actions'
export { Input, Select } from '../components/ds/Inputs'

// Legacy layout wrappers that don't map 1:1 to DS
export const PageContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 16px 64px;
  ${media.sm} { padding-left: 24px; padding-right: 24px; }
`

export const PageContentNarrow = styled(PageContent)`
  max-width: 960px;
`

export const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.slate[100]};
  ${media.sm} { font-size: 36px; }
`

// Legacy grid helpers
export const Grid2 = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
`

export const Grid3 = styled.div`
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 12px;
  ${media.sm} { grid-template-columns: repeat(2, 1fr); }
  ${media.lg} { grid-template-columns: repeat(3, 1fr); }
`

// Legacy ghost button (DS Button $variant="ghost" is the replacement)
export { Button as GhostButton } from '../components/ds/Actions'
