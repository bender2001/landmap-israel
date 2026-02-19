import { ChevronUp, ChevronDown } from 'lucide-react'
import styled, { css } from 'styled-components'
import { theme } from '../../styles/theme'

interface SortableHeaderProps {
  label: string
  column: string
  sortBy: string
  sortDir: 'asc' | 'desc'
  onSort: (column: string) => void
  className?: string
}

const Th = styled.th<{ $active: boolean }>`
  text-align: right;
  padding: 12px 16px;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  font-family: ${theme.fonts.primary};
  transition: color ${theme.transitions.fast};
  color: ${({ $active }) => $active ? theme.colors.gold : theme.colors.slate[400]};

  &:hover {
    color: ${theme.colors.gold};
  }

  &:hover .sort-icons svg {
    color: ${theme.colors.slate[400]};
  }
`

const Inner = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

const SortIcons = styled.span`
  display: flex;
  flex-direction: column;
  gap: -4px;
`

const SortIcon = styled.span<{ $active: boolean }>`
  display: flex;
  color: ${({ $active }) => $active ? theme.colors.gold : theme.colors.slate[600]};
  transition: color ${theme.transitions.fast};

  ${Th}:hover & {
    ${({ $active }) => !$active && css`color: ${theme.colors.slate[400]};`}
  }
`

export default function SortableHeader({
  label,
  column,
  sortBy,
  sortDir,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = sortBy === column
  const dir = isActive ? sortDir : null

  return (
    <Th
      $active={isActive}
      onClick={() => onSort(column)}
      className={className}
    >
      <Inner>
        <span>{label}</span>
        <SortIcons className="sort-icons">
          <SortIcon $active={dir === 'asc'}>
            <ChevronUp size={12} />
          </SortIcon>
          <SortIcon $active={dir === 'desc'}>
            <ChevronDown size={12} />
          </SortIcon>
        </SortIcons>
      </Inner>
    </Th>
  )
}
