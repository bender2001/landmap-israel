import styled, { css } from 'styled-components'
import { media } from '../../styles/theme'
import { shimmerBg, cardLift } from './animations'

/* ── Badge ──────────────────────────────────────────────────── */

export const Badge = styled.span<{ $bg?: string; $color?: string; $size?: 'sm' | 'md' }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ $size = 'sm' }) => $size === 'sm' ? '4px' : '6px'};
  padding: ${({ $size = 'sm' }) => $size === 'sm' ? '2px 8px' : '4px 12px'};
  border-radius: 9999px;
  font-size: ${({ $size = 'sm' }) => $size === 'sm' ? '10px' : '12px'};
  font-weight: 500;
  background: ${({ $bg }) => $bg || 'rgba(255,255,255,0.05)'};
  color: ${({ $color }) => $color || 'inherit'};
  white-space: nowrap;
`

/* ── StatusBadge (colored with border) ──────────────────────── */

export const StatusBadge = styled.span<{ $bg: string; $border?: string; $color: string; $size?: 'sm' | 'md' }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ $size = 'sm' }) => $size === 'sm' ? '4px' : '6px'};
  padding: ${({ $size = 'sm' }) => $size === 'sm' ? '2px 8px' : '2px 10px'};
  border-radius: 9999px;
  font-size: ${({ $size = 'sm' }) => $size === 'sm' ? '10px' : '11px'};
  font-weight: 500;
  background: ${({ $bg }) => $bg};
  border: 1px solid ${({ $border, $bg }) => $border || $bg};
  color: ${({ $color }) => $color};
`

/* ── MetricCard ─────────────────────────────────────────────── */

export const MetricCard = styled.div<{
  $accentFrom: string
  $accentTo: string
  $borderColor: string
}>`
  border-radius: 16px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
  background: linear-gradient(
    to bottom,
    ${({ $accentFrom }) => $accentFrom}24,
    ${({ $accentFrom }) => $accentFrom}14
  );
  border: 1px solid ${({ $borderColor }) => $borderColor}33;
  position: relative;
  overflow: hidden;
  ${cardLift}

  ${media.sm} {
    padding: 16px;
    gap: 8px;
  }
`

export const MetricAccent = styled.div<{ $from: string; $to: string }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, ${({ $from }) => $from}, ${({ $to }) => $to});
`

export const MetricLabel = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[400]};
`

export const MetricValue = styled.div<{ $color: string }>`
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
  color: ${({ $color }) => $color};

  ${media.sm} {
    font-size: 18px;
  }
`

export const MetricSub = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[500]};
  display: none;
  ${media.sm} { display: block; }
`

/* ── DataRow ────────────────────────────────────────────────── */

export const DataRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
`

export const DataRowLabel = styled.span`
  color: ${({ theme }) => theme.colors.slate[400]};
`

export const DataRowValue = styled.span<{ $color?: string }>`
  color: ${({ $color, theme }) => $color || theme.colors.slate[300]};
  font-weight: ${({ $color }) => $color ? '500' : 'normal'};
`

/* ── ProgressBar ────────────────────────────────────────────── */

export const ProgressTrack = styled.div<{ $h?: number }>`
  height: ${({ $h = 8 }) => $h}px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

export const ProgressFill = styled.div<{ $width: number; $color?: string }>`
  height: 100%;
  border-radius: 9999px;
  width: ${({ $width }) => $width}%;
  background: ${({ $color }) =>
    $color || 'linear-gradient(90deg, #C8942A, #E5B94E)'};
  transition: width 0.7s ease;
`

/* ── Skeleton ───────────────────────────────────────────────── */

export const Skeleton = styled.div<{ $w?: string; $h?: string; $r?: string }>`
  width: ${({ $w = '100%' }) => $w};
  height: ${({ $h = '16px' }) => $h};
  border-radius: ${({ $r = '8px' }) => $r};
  ${shimmerBg}
`

/* ── InvestmentGradeBadge ───────────────────────────────────── */

export const InvestmentGradeBadge = styled.span<{ $bg: string; $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 900;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
`

/* ── StatCard (glass panel version) ─────────────────────────── */

export const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: ${({ theme }) => theme.radii.xl};
  backdrop-filter: blur(8px);
  padding: 16px;
`
