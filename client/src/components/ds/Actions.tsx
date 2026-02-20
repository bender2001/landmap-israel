import styled, { css } from 'styled-components'
import { media } from '../../styles/theme'

/* ── Button variants ────────────────────────────────────────── */

type ButtonVariant = 'gold' | 'ghost' | 'danger' | 'subtle'

const variants: Record<ButtonVariant, ReturnType<typeof css>> = {
  gold: css`
    background: linear-gradient(135deg,
      ${({ theme }) => theme.colors.gold},
      ${({ theme }) => theme.colors.goldBright}
    );
    color: ${({ theme }) => theme.colors.navy};
    font-weight: 700;
    border: none;
    &:hover { box-shadow: 0 4px 20px rgba(200, 148, 42, 0.3); }
  `,
  ghost: css`
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: ${({ theme }) => theme.colors.slate[300]};
    &:hover {
      border-color: rgba(200, 148, 42, 0.3);
      color: ${({ theme }) => theme.colors.gold};
    }
  `,
  danger: css`
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: ${({ theme }) => theme.colors.red[400]};
    &:hover {
      background: rgba(239, 68, 68, 0.2);
    }
  `,
  subtle: css`
    background: transparent;
    border: none;
    color: ${({ theme }) => theme.colors.slate[400]};
    &:hover {
      color: ${({ theme }) => theme.colors.slate[200]};
      background: rgba(255, 255, 255, 0.05);
    }
  `,
}

export const Button = styled.button<{
  $variant?: ButtonVariant
  $full?: boolean
  $sm?: boolean
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: ${({ $sm }) => $sm ? '8px 16px' : '12px 24px'};
  border-radius: ${({ theme }) => theme.radii.xl};
  font-size: ${({ $sm }) => $sm ? '12px' : '14px'};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.normal};
  min-height: 44px;
  min-width: 44px;
  ${({ $full }) => $full && css`width: 100%;`}
  ${({ $variant = 'gold' }) => variants[$variant]}
`

/* ── IconButton ─────────────────────────────────────────────── */

export const IconButton = styled.button<{
  $size?: number
  $variant?: 'ghost' | 'subtle' | 'glass'
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size = 40 }) => $size}px;
  height: ${({ $size = 40 }) => $size}px;
  min-width: 44px;
  min-height: 44px;
  border-radius: ${({ theme }) => theme.radii.lg};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  border: none;

  ${({ $variant = 'ghost' }) =>
    $variant === 'ghost'
      ? css`
          background: rgba(255, 255, 255, 0.05);
          color: ${({ theme }) => theme.colors.slate[300]};
          &:hover {
            background: rgba(255, 255, 255, 0.1);
            color: ${({ theme }) => theme.colors.slate[100]};
          }
        `
      : $variant === 'glass'
        ? css`
            background: rgba(10, 22, 40, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(8px);
            color: ${({ theme }) => theme.colors.slate[300]};
            &:hover {
              border-color: rgba(200, 148, 42, 0.3);
              color: ${({ theme }) => theme.colors.gold};
            }
          `
        : css`
            background: transparent;
            color: ${({ theme }) => theme.colors.slate[400]};
            &:hover {
              color: ${({ theme }) => theme.colors.slate[200]};
            }
          `}
`

/* ── IconBox (colored rounded icon container) ───────────────── */

export const IconBox = styled.div<{ $bg: string; $size?: number }>`
  width: ${({ $size = 32 }) => $size}px;
  height: ${({ $size = 32 }) => $size}px;
  border-radius: ${({ theme }) => theme.radii.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $bg }) => $bg};
  flex-shrink: 0;
`

/* ── ExternalChip (link chip) ───────────────────────────────── */

export const ExternalChip = styled.a<{ $borderColor?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(to right, rgba(10,22,40,0.5), rgba(10,22,40,0.6));
  border: 1px solid ${({ $borderColor }) => $borderColor || 'rgba(255,255,255,0.1)'};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 8px 16px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.slate[300]};
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  min-height: 44px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    text-decoration: none;
  }
`

/* ── DistanceChip ───────────────────────────────────────────── */

export const DistanceChip = styled.div<{ $borderColor: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(to right, rgba(10,22,40,0.5), rgba(10,22,40,0.6));
  border: 1px solid ${({ $borderColor }) => $borderColor};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 8px 16px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.slate[300]};
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }
`
