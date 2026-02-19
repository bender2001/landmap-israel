import { useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { useVisibilityInterval } from '../hooks/useInfra'
import { theme, media } from '../styles/theme'

type DataFreshnessIndicatorProps = {
  updatedAt: number
  onRefresh: () => void
}

export default function DataFreshnessIndicator({ updatedAt, onRefresh }: DataFreshnessIndicatorProps) {
  const [, setTick] = useState(0)
  useVisibilityInterval(() => setTick((tick) => tick + 1), 30000)

  const ago = Math.round((Date.now() - updatedAt) / 1000)
  const label = ago < 60 ? 'עכשיו' : ago < 3600 ? `לפני ${Math.floor(ago / 60)} דק׳` : `לפני ${Math.floor(ago / 3600)} שע׳`
  const isStale = ago > 300

  return (
    <IndicatorButton type="button" onClick={onRefresh} $stale={isStale} title="לחץ לרענון הנתונים">
      <StatusDot $stale={isStale} />
      {label}
    </IndicatorButton>
  )
}

const pulse = keyframes`
  0% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
  100% {
    opacity: 0.6;
    transform: scale(1);
  }
`

const IndicatorButton = styled.button<{ $stale: boolean }>`
  position: fixed;
  top: 4rem;
  left: 1rem;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: ${theme.radii.md};
  font-size: 9px;
  background: ${({ $stale }) => ($stale ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255, 255, 255, 0.05)')};
  border: 1px solid ${({ $stale }) => ($stale ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255, 255, 255, 0.1)')};
  color: ${({ $stale }) => ($stale ? theme.colors.orange : theme.colors.slate[500])};
  backdrop-filter: blur(16px);
  transition: ${theme.transitions.normal};

  &:hover,
  &:focus-visible {
    transform: scale(1.05);
    color: ${({ $stale }) => ($stale ? theme.colors.orange : theme.colors.slate[400])};
  }

  ${media.sm} {
    top: auto;
    left: auto;
    bottom: 5.5rem;
    right: 1.5rem;
    padding: 0.375rem 0.75rem;
    font-size: 10px;
  }
`

const StatusDot = styled.span<{ $stale: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: ${theme.radii.full};
  flex-shrink: 0;
  background: ${({ $stale }) => ($stale ? theme.colors.orange : theme.colors.emerald)};
  animation: ${({ $stale }) => ($stale ? pulse : 'none')} 1.2s ease-in-out infinite;
`
