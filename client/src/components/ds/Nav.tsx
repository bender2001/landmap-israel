import { useState, type ReactNode } from 'react'
import styled, { css } from 'styled-components'
import { ChevronDown } from 'lucide-react'
import { media } from '../../styles/theme'

/* ── Tabs ───────────────────────────────────────────────────── */

export const TabList = styled.div`
  display: flex;
  gap: 4px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`

export const Tab = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.15s ease;
  border: 1px solid transparent;

  ${({ $active, theme }) =>
    $active
      ? css`
          background: rgba(200, 148, 42, 0.15);
          border-color: rgba(200, 148, 42, 0.3);
          color: ${theme.colors.gold};
        `
      : css`
          background: rgba(255, 255, 255, 0.04);
          color: ${theme.colors.slate[400]};
          &:hover {
            background: rgba(255, 255, 255, 0.08);
            color: ${theme.colors.slate[200]};
          }
        `}
`

/* ── CollapsibleSection ─────────────────────────────────────── */

const SectionHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  border: none;
  background: none;
  cursor: pointer;
  text-align: right;
`

const SectionNumber = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.gold};
  opacity: 0.5;
  width: 20px;
  flex-shrink: 0;
`

const SectionLabel = styled.h3`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
  flex: 1;
  text-align: right;
`

const SectionChevron = styled(ChevronDown)<{ $collapsed?: boolean }>`
  width: 16px;
  height: 16px;
  color: ${({ theme }) => theme.colors.slate[400]};
  transition: transform 0.2s ease;
  ${({ $collapsed }) => $collapsed && css`transform: rotate(-90deg);`}
`

const CollapseBody = styled.div<{ $open: boolean; $maxH: string }>`
  max-height: ${({ $open, $maxH }) => $open ? $maxH : '0px'};
  opacity: ${({ $open }) => $open ? 1 : 0};
  overflow: hidden;
  transition:
    max-height 0.35s cubic-bezier(0.32, 0.72, 0, 1),
    opacity 0.25s ease;
`

interface CollapsibleSectionProps {
  number?: string
  icon?: React.ComponentType<any>
  title: string
  children: ReactNode
  defaultOpen?: boolean
  maxH?: string
  sectionId?: string
}

export function CollapsibleSection({
  number,
  icon: Icon,
  title,
  children,
  defaultOpen = true,
  maxH = '2000px',
  sectionId,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div id={sectionId}>
      <SectionHeader onClick={() => setOpen(o => !o)} aria-expanded={open}>
        {number && <SectionNumber>{number}</SectionNumber>}
        {Icon && <Icon size={16} style={{ color: 'rgba(200,148,42,0.7)', flexShrink: 0 }} />}
        <SectionLabel>{title}</SectionLabel>
        <SectionChevron $collapsed={!open} />
      </SectionHeader>
      <CollapseBody $open={open} $maxH={maxH}>
        {children}
      </CollapseBody>
    </div>
  )
}

/* ── QuickNavPill ───────────────────────────────────────────── */

export const NavPill = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  min-height: 32px;
  transition: all 0.15s ease;
  border: 1px solid transparent;

  ${({ $active, theme }) =>
    $active
      ? css`
          background: rgba(200, 148, 42, 0.15);
          border-color: rgba(200, 148, 42, 0.3);
          color: ${theme.colors.gold};
        `
      : css`
          background: rgba(255, 255, 255, 0.04);
          color: ${theme.colors.slate[500]};
          &:hover {
            background: rgba(255, 255, 255, 0.08);
            color: ${theme.colors.slate[300]};
          }
        `}
`
