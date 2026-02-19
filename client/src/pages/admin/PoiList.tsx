import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { adminPois } from '../../api/admin'
import { Plus, Pencil, Trash2, Search, MapPin } from 'lucide-react'
import { useState } from 'react'
import styled from 'styled-components'
import TableSkeleton from '../../components/ui/TableSkeleton'
import { useToast } from '../../components/ui/ToastContainer'
import { theme, media } from '../../styles/theme'

interface Poi {
  id: string
  name: string
  type?: string
  icon?: string
  lat?: number
  lng?: number
  [key: string]: any
}

export default function PoiList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState<string>('')

  const { data: pois = [], isLoading } = useQuery<Poi[]>({
    queryKey: ['admin', 'pois'],
    queryFn: adminPois.list,
  })

  const deletePoi = useMutation({
    mutationFn: (id: string) => adminPois.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pois'] })
      toast('נקודת עניין נמחקה', 'success')
    },
    onError: () => toast('שגיאה במחיקה', 'error'),
  })

  const filtered = pois.filter((p) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (p.name || '').toLowerCase().includes(s) || (p.type || '').toLowerCase().includes(s)
  })

  if (isLoading) {
    return (
      <Page dir="rtl">
        <SkeletonHeader>
          <SkeletonTitle />
          <SkeletonButton />
        </SkeletonHeader>
        <TableSkeleton rows={6} cols={5} />
      </Page>
    )
  }

  return (
    <Page dir="rtl">
      <Header>
        <Title>ניהול נקודות עניין</Title>
        <PrimaryButton type="button" onClick={() => navigate('/admin/pois/new')}>
          <Plus size={16} />
          נקודה חדשה
        </PrimaryButton>
      </Header>

      {/* Search */}
      <SearchField>
        <Search size={16} />
        <input
          type="text"
          placeholder="חפש לפי שם או סוג..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
        />
      </SearchField>

      {/* Table */}
      <TableCard>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <HeaderCell>אייקון</HeaderCell>
                <HeaderCell>שם</HeaderCell>
                <HeaderCell>סוג</HeaderCell>
                <HeaderCell>קואורדינטות</HeaderCell>
                <HeaderCell>פעולות</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {filtered.map((poi) => (
                <BodyRow key={poi.id}>
                  <BodyCell $icon>{poi.icon || '📍'}</BodyCell>
                  <BodyCell $strong>{poi.name}</BodyCell>
                  <BodyCell $muted>{poi.type || 'general'}</BodyCell>
                  <CoordCell dir="ltr">
                    {poi.lat?.toFixed(4)}, {poi.lng?.toFixed(4)}
                  </CoordCell>
                  <BodyCell>
                    <Actions>
                      <IconButton
                        type="button"
                        onClick={() => navigate(`/admin/pois/${poi.id}/edit`)}
                        title="ערוך"
                      >
                        <Pencil size={16} />
                      </IconButton>
                      <IconButton
                        type="button"
                        $danger
                        onClick={() => {
                          if (confirm('האם למחוק את נקודת העניין?')) {
                            deletePoi.mutate(poi.id)
                          }
                        }}
                        title="מחק"
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </Actions>
                  </BodyCell>
                </BodyRow>
              ))}
              {filtered.length === 0 && (
                <EmptyRow>
                  <EmptyCell colSpan={5}>
                    {search ? 'לא נמצאו תוצאות' : 'אין נקודות עניין'}
                  </EmptyCell>
                </EmptyRow>
              )}
            </tbody>
          </Table>
        </TableWrap>
      </TableCard>
    </Page>
  )
}

/* ── Styled Components ─────────────────────────────────── */

const Page = styled.div`
  padding: ${theme.space.md};
  max-width: 72rem;
  margin: 0 auto;
  ${media.sm} {
    padding: ${theme.space.lg};
  }
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.space.lg};
`

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${theme.colors.text};
`

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${theme.space.sm};
  padding: 10px ${theme.space.md};
  border-radius: ${theme.radii.xl};
  background: ${theme.gradients.primary};
  color: ${theme.colors.white};
  font-weight: 700;
  font-size: 0.875rem;
  border: none;
  cursor: pointer;
  transition: box-shadow ${theme.transitions.smooth};

  &:hover {
    box-shadow: ${theme.shadows.lg};
  }
`

const SearchField = styled.label`
  position: relative;
  display: flex;
  align-items: center;
  gap: ${theme.space.sm};
  max-width: 320px;
  padding: 10px 12px;
  margin-bottom: ${theme.space.md};
  background: ${theme.colors.bgSecondary};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.xl};
  color: ${theme.colors.textTertiary};

  input {
    flex: 1;
    background: transparent;
    border: none;
    color: ${theme.colors.text};
    font-size: 0.875rem;

    &::placeholder {
      color: ${theme.colors.textTertiary};
    }

    &:focus {
      outline: none;
    }
  }

  &:focus-within {
    border-color: ${theme.colors.primary};
  }
`

const TableCard = styled.div`
  background: ${theme.colors.bg};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.xl};
  box-shadow: ${theme.shadows.card};
  overflow: hidden;
`

const TableWrap = styled.div`
  overflow-x: auto;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
`

const HeaderCell = styled.th`
  text-align: right;
  padding: 12px ${theme.space.md};
  font-weight: 500;
  color: ${theme.colors.textSecondary};
  border-bottom: 1px solid ${theme.colors.border};
  background: ${theme.colors.bgSecondary};
`

const BodyRow = styled.tr`
  border-bottom: 1px solid ${theme.colors.borderLight};
  transition: background ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.bgTertiary};
  }
`

const BodyCell = styled.td<{ $strong?: boolean; $muted?: boolean; $icon?: boolean }>`
  padding: 12px ${theme.space.md};
  color: ${({ $muted }) => ($muted ? theme.colors.textSecondary : theme.colors.text)};
  font-weight: ${({ $strong }) => ($strong ? 500 : 400)};
  font-size: ${({ $icon }) => ($icon ? '1.25rem' : '0.875rem')};
`

const CoordCell = styled.td`
  padding: 12px ${theme.space.md};
  color: ${theme.colors.textSecondary};
  font-size: 0.75rem;
  font-family: ${theme.fonts.mono};
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.space.xs};
`

const IconButton = styled.button<{ $danger?: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: ${theme.radii.md};
  border: none;
  background: transparent;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: ${theme.colors.textSecondary};
  transition: all ${theme.transitions.fast};

  &:hover {
    color: ${({ $danger }) => ($danger ? theme.colors.danger : theme.colors.primary)};
    background: ${({ $danger }) =>
      $danger ? `${theme.colors.red[50]}` : `${theme.colors.primaryLight}`};
  }
`

const EmptyRow = styled.tr``

const EmptyCell = styled.td`
  text-align: center;
  padding: 40px ${theme.space.md};
  color: ${theme.colors.textTertiary};
`

const SkeletonHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.space.lg};
`

const SkeletonTitle = styled.div`
  width: 160px;
  height: 28px;
  border-radius: ${theme.radii.lg};
  background: ${theme.colors.bgTertiary};
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`

const SkeletonButton = styled.div`
  width: 112px;
  height: 40px;
  border-radius: ${theme.radii.xl};
  background: ${theme.colors.bgTertiary};
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`
