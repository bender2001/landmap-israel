import styled, { css } from 'styled-components'
import { media } from '../../styles/theme'

/* ── PageShell ──────────────────────────────────────────────── */

export const PageShell = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.navy};
  direction: rtl;
`

/* ── Container ──────────────────────────────────────────────── */

export const Container = styled.div<{ $narrow?: boolean; $noPad?: boolean }>`
  max-width: ${({ $narrow }) => $narrow ? '960px' : '1200px'};
  margin: 0 auto;
  padding: ${({ $noPad }) => $noPad ? '0' : '80px 16px 64px'};
  ${media.sm} {
    padding-left: ${({ $noPad }) => $noPad ? '0' : '24px'};
    padding-right: ${({ $noPad }) => $noPad ? '0' : '24px'};
  }
`

/* ── Stack (vertical flex) ──────────────────────────────────── */

export const Stack = styled.div<{ $gap?: number; $align?: string }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $gap = 8 }) => $gap}px;
  ${({ $align }) => $align && css`align-items: ${$align};`}
`

/* ── Row (horizontal flex) ──────────────────────────────────── */

export const Row = styled.div<{
  $gap?: number
  $align?: string
  $justify?: string
  $wrap?: boolean
}>`
  display: flex;
  align-items: ${({ $align = 'center' }) => $align};
  gap: ${({ $gap = 8 }) => $gap}px;
  ${({ $justify }) => $justify && css`justify-content: ${$justify};`}
  ${({ $wrap }) => $wrap && css`flex-wrap: wrap;`}
`

/** Convenience: Row with space-between */
export const RowBetween = styled(Row)`
  justify-content: space-between;
`

/** Convenience: Row centered both ways */
export const RowCenter = styled(Row)`
  justify-content: center;
`

/* ── Grid ───────────────────────────────────────────────────── */

export const Grid = styled.div<{ $cols?: number; $sm?: number; $lg?: number; $gap?: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $cols = 1 }) => $cols}, 1fr);
  gap: ${({ $gap = 12 }) => $gap}px;
  ${({ $sm }) => $sm && css`
    ${media.sm} { grid-template-columns: repeat(${$sm}, 1fr); }
  `}
  ${({ $lg }) => $lg && css`
    ${media.lg} { grid-template-columns: repeat(${$lg}, 1fr); }
  `}
`

/* ── Divider ────────────────────────────────────────────────── */

export const Divider = styled.div<{ $spacing?: number }>`
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: ${({ $spacing = 12 }) => $spacing}px 0;
`

/* ── Spacer ─────────────────────────────────────────────────── */

export const Spacer = styled.div<{ $h?: number }>`
  height: ${({ $h = 16 }) => $h}px;
  flex-shrink: 0;
`
