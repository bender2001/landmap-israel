import styled from 'styled-components'
import { theme, media } from '../../styles/theme'

export const AdminPage = styled.div`
  padding: 16px;
  max-width: 72rem;
  margin: 0 auto;
  ${media.sm} { padding: 24px; }
`

export const AdminHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
`

export const AdminHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

export const AdminPageTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
`

export const AdminCard = styled.div`
  background: ${theme.glass.bg};
  border: ${theme.glass.border};
  backdrop-filter: ${theme.glass.blur};
  border-radius: ${theme.radii.xl};
  box-shadow: ${theme.shadows.glass};
  overflow: hidden;
`

export const AdminTableWrap = styled.div`
  overflow-x: auto;
`

export const AdminTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
`

export const AdminHeaderCell = styled.th`
  text-align: right;
  padding: 12px;
  color: ${theme.colors.slate[400]};
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`

export const AdminBodyRow = styled.tr<{ $active?: boolean }>`
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: ${({ $active }) => ($active ? `${theme.colors.gold}0D` : 'transparent')};
  transition: ${theme.transitions.fast};
  &:hover {
    background: ${({ $active }) => ($active ? `${theme.colors.gold}0D` : 'rgba(255, 255, 255, 0.05)')};
  }
`

export const AdminBodyCell = styled.td<{ $strong?: boolean; $gold?: boolean; $muted?: boolean }>`
  padding: 12px;
  color: ${({ $gold, $muted }) =>
    $gold ? theme.colors.gold : $muted ? theme.colors.slate[400] : theme.colors.slate[300]};
  font-weight: ${({ $strong }) => ($strong ? 600 : 400)};
  font-size: ${({ $muted }) => ($muted ? '0.75rem' : '0.875rem')};
`

export const AdminEmptyRow = styled.tr``

export const AdminEmptyCell = styled.td`
  padding: 40px 16px;
  text-align: center;
  color: ${theme.colors.slate[400]};
`

export const AdminPrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: ${theme.radii.xl};
  background: ${theme.gradients.gold};
  color: ${theme.colors.navy};
  font-weight: 700;
  font-size: 0.875rem;
  transition: ${theme.transitions.smooth};
  &:hover { box-shadow: 0 12px 30px rgba(200, 148, 42, 0.3); }
`

export const AdminIconButton = styled.button<{ $danger?: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: ${theme.radii.md};
  display: grid;
  place-items: center;
  color: ${theme.colors.slate[400]};
  transition: ${theme.transitions.fast};
  &:hover {
    color: ${({ $danger }) => ($danger ? theme.colors.red[500] : theme.colors.gold)};
    background: ${({ $danger }) => ($danger ? `${theme.colors.red[500]}1A` : `${theme.colors.gold}1A`)};
  }
`

export const AdminBackButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: ${theme.radii.md};
  display: grid;
  place-items: center;
  color: ${theme.colors.slate[400]};
  transition: ${theme.transitions.fast};
  &:hover { color: ${theme.colors.gold}; }
`

export const AdminSearchField = styled.label`
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 320px;
  padding: 10px 12px;
  margin-bottom: 16px;
  background: rgba(22, 42, 74, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radii.xl};
  color: ${theme.colors.slate[400]};
  input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: ${theme.colors.slate[200]};
    font-size: 0.875rem;
    &::placeholder { color: ${theme.colors.slate[500]}; }
  }
`

export const AdminPagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
`

export const AdminPageButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: ${theme.radii.md};
  background: rgba(255, 255, 255, 0.05);
  color: ${theme.colors.slate[400]};
  display: grid;
  place-items: center;
  transition: ${theme.transitions.fast};
  &:hover:not(:disabled) {
    color: ${theme.colors.gold};
    background: rgba(255, 255, 255, 0.1);
  }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
`

export const AdminLoadingWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px 0;
  color: ${theme.colors.gold};
`

export const AdminErrorText = styled.div`
  text-align: center;
  padding: 32px;
  color: ${theme.colors.red[400]};
  font-size: 0.875rem;
`

export const AdminBadge = styled.span<{ $color?: string; $bg?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: ${theme.radii.full};
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ $color }) => $color || theme.colors.gold};
  background: ${({ $bg }) => $bg || `${theme.colors.gold}1A`};
`
