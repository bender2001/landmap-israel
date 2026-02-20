import styled, { css } from 'styled-components'
import { media } from '../../styles/theme'

/* ── Heading ────────────────────────────────────────────────── */

const headingSizes = {
  1: { mobile: '28px', desktop: '36px', weight: 900 },
  2: { mobile: '22px', desktop: '28px', weight: 800 },
  3: { mobile: '16px', desktop: '18px', weight: 700 },
  4: { mobile: '14px', desktop: '14px', weight: 700 },
} as const

export const Heading = styled.h2<{ $level?: 1 | 2 | 3 | 4; $gold?: boolean }>`
  ${({ $level = 2 }) => {
    const s = headingSizes[$level]
    return css`
      font-size: ${s.mobile};
      font-weight: ${s.weight};
      ${media.sm} { font-size: ${s.desktop}; }
    `
  }}
  color: ${({ $gold, theme }) =>
    $gold ? theme.colors.gold : theme.colors.slate[100]};
  line-height: 1.3;
  display: flex;
  align-items: center;
  gap: 8px;
`

/* ── Text ───────────────────────────────────────────────────── */

type TextSize = 'xs' | 'sm' | 'md' | 'lg'

const textSizes: Record<TextSize, string> = {
  xs: '10px',
  sm: '12px',
  md: '14px',
  lg: '16px',
}

export const Text = styled.span<{ $size?: TextSize; $color?: string; $weight?: number; $block?: boolean }>`
  font-size: ${({ $size = 'sm' }) => textSizes[$size]};
  color: ${({ $color, theme }) => $color || theme.colors.slate[300]};
  ${({ $weight }) => $weight && css`font-weight: ${$weight};`}
  ${({ $block }) => $block && css`display: block;`}
`

/* ── Label ──────────────────────────────────────────────────── */

export const Label = styled.span<{ $muted?: boolean }>`
  font-size: ${({ $muted }) => $muted ? '10px' : '12px'};
  color: ${({ $muted, theme }) =>
    $muted ? theme.colors.slate[600] : theme.colors.slate[400]};
`

/* ── SmallLabel ─────────────────────────────────────────────── */

export const SmallLabel = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[500]};
`

/* ── Muted ──────────────────────────────────────────────────── */

export const Muted = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.colors.slate[600]};
`

/* ── BrandGradient ──────────────────────────────────────────── */

export const BrandGradient = styled.span`
  background: linear-gradient(135deg,
    ${({ theme }) => theme.colors.gold},
    ${({ theme }) => theme.colors.goldBright}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

/* ── SectionTitle (with icon slot) ──────────────────────────── */

export const SectionTitle = styled.h3<{ $mb?: number }>`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: ${({ $mb = 16 }) => $mb}px;
`
