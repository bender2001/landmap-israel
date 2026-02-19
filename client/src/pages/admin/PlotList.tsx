import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Search,
  CheckSquare,
  Square,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { adminPlots } from '../../api/admin'
import { statusColors, statusLabels, zoningLabels } from '../../utils/constants'
import { formatCurrency } from '../../utils/format'
import TableSkeleton from '../../components/ui/TableSkeleton'
import SortableHeader from '../../components/admin/SortableHeader'
import { default as usePagination } from '../../hooks/useUI'
import { useToast } from '../../components/ui/ToastContainer'
import { theme, media } from '../../styles/theme'

type Id = number | string

type PlotRow = {
  id: Id
  block_number: number
  number: number
  city: string
  total_price: number
  size_sqm?: number | null
  status: string
  zoning_stage: string
  is_published: boolean
}

type PlotsResponse = {
  data: PlotRow[]
  total: number
}

export default function PlotList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<Id>>(new Set())
  const { page, setPage, sortBy, sortDir, handleSort, params } = usePagination()

  const queryParams = { ...params, search: search || undefined }

  const { data: result, isLoading } = useQuery<PlotsResponse>({
    queryKey: ['admin', 'plots', queryParams],
    queryFn: () => adminPlots.list(queryParams),
    keepPreviousData: true,
  })

  const plots = result?.data || []
  const total = result?.total || 0
  const totalPages = Math.ceil(total / params.limit)

  const togglePublish = useMutation({
    mutationFn: ({ id, published }: { id: Id; published: boolean }) =>
      adminPlots.togglePublish(id, published),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plots'] })
      toast('סטטוס פרסום עודכן', 'success')
    },
  })

  const deletePlot = useMutation({
    mutationFn: (id: Id) => adminPlots.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plots'] })
      toast('חלקה נמחקה', 'success')
    },
  })

  const bulkDelete = useMutation({
    mutationFn: (ids: Id[]) => adminPlots.bulkDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plots'] })
      setSelected(new Set())
      toast('חלקות נמחקו', 'success')
    },
  })

  const bulkPublish = useMutation({
    mutationFn: ({ ids, published }: { ids: Id[]; published: boolean }) =>
      adminPlots.bulkPublish(ids, published),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plots'] })
      setSelected(new Set())
      toast('סטטוס פרסום עודכן', 'success')
    },
  })

  const toggleSelect = (id: Id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === plots.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(plots.map((plot) => plot.id)))
    }
  }

  if (isLoading) {
    return (
      <Page dir="rtl">
        <SkeletonHeader>
          <SkeletonTitle />
          <SkeletonButton />
        </SkeletonHeader>
        <TableSkeleton rows={8} cols={9} />
      </Page>
    )
  }

  return (
    <Page dir="rtl">
      <Header>
        <PageTitle>ניהול חלקות</PageTitle>
        <PrimaryButton type="button" onClick={() => navigate('/admin/plots/new')}>
          <Plus size={16} />
          חלקה חדשה
        </PrimaryButton>
      </Header>

      <SearchField>
        <Search size={16} />
        <input
          type="text"
          placeholder="חפש לפי עיר, גוש, חלקה..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
        />
      </SearchField>

      {selected.size > 0 && (
        <BulkBar>
          <BulkCount>{selected.size} נבחרו</BulkCount>
          <BulkButton
            type="button"
            $variant="success"
            onClick={() => bulkPublish.mutate({ ids: Array.from(selected), published: true })}
          >
            פרסם
          </BulkButton>
          <BulkButton
            type="button"
            $variant="neutral"
            onClick={() => bulkPublish.mutate({ ids: Array.from(selected), published: false })}
          >
            הסר פרסום
          </BulkButton>
          <BulkButton
            type="button"
            $variant="danger"
            onClick={() => {
              if (confirm(`האם למחוק ${selected.size} חלקות?`)) {
                bulkDelete.mutate(Array.from(selected))
              }
            }}
          >
            מחק
          </BulkButton>
          <ClearSelection type="button" onClick={() => setSelected(new Set())}>
            <X size={16} />
          </ClearSelection>
        </BulkBar>
      )}

      <TableCard>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <HeaderCell>
                  <IconButton type="button" onClick={toggleAll}>
                    {selected.size === plots.length && plots.length > 0 ? (
                      <CheckSquare size={16} />
                    ) : (
                      <Square size={16} />
                    )}
                  </IconButton>
                </HeaderCell>
                <SortableHeader label="גוש / חלקה" column="block_number" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="עיר" column="city" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="מחיר" column="total_price" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="שטח" column="size_sqm" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="סטטוס" column="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="ייעוד" column="zoning_stage" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <HeaderCell>פורסם</HeaderCell>
                <HeaderCell>פעולות</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {plots.map((plot) => {
                const color = statusColors[plot.status]
                const isChecked = selected.has(plot.id)
                return (
                  <BodyRow key={plot.id} $active={isChecked}>
                    <BodyCell>
                      <IconButton type="button" onClick={() => toggleSelect(plot.id)}>
                        {isChecked ? (
                          <CheckSquare size={16} color={theme.colors.gold} />
                        ) : (
                          <Square size={16} />
                        )}
                      </IconButton>
                    </BodyCell>
                    <BodyCell $strong>
                      {plot.block_number} / {plot.number}
                    </BodyCell>
                    <BodyCell>{plot.city}</BodyCell>
                    <BodyCell $gold>{formatCurrency(plot.total_price)}</BodyCell>
                    <BodyCell>{plot.size_sqm?.toLocaleString()} מ"ר</BodyCell>
                    <BodyCell>
                      <StatusPill $color={color}>
                        <StatusDot $color={color} />
                        {statusLabels[plot.status]}
                      </StatusPill>
                    </BodyCell>
                    <BodyCell $muted>{zoningLabels[plot.zoning_stage]}</BodyCell>
                    <BodyCell>
                      <PublishButton
                        type="button"
                        $active={plot.is_published}
                        onClick={() =>
                          togglePublish.mutate({ id: plot.id, published: !plot.is_published })
                        }
                        title={plot.is_published ? 'מפורסם' : 'טיוטה'}
                      >
                        {plot.is_published ? <Eye size={16} /> : <EyeOff size={16} />}
                      </PublishButton>
                    </BodyCell>
                    <BodyCell>
                      <Actions>
                        <IconButton
                          type="button"
                          onClick={() => navigate(`/admin/plots/${plot.id}/edit`)}
                          title="ערוך"
                        >
                          <Pencil size={16} />
                        </IconButton>
                        <IconButton
                          type="button"
                          onClick={() => {
                            if (confirm('האם למחוק את החלקה?')) {
                              deletePlot.mutate(plot.id)
                            }
                          }}
                          title="מחק"
                          $danger
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </Actions>
                    </BodyCell>
                  </BodyRow>
                )
              })}
              {plots.length === 0 && (
                <EmptyRow>
                  <EmptyCell colSpan={9}>{search ? 'לא נמצאו תוצאות' : 'אין חלקות'}</EmptyCell>
                </EmptyRow>
              )}
            </tbody>
          </Table>
        </TableWrap>
      </TableCard>

      {totalPages > 1 && (
        <Pagination>
          <PageButton
            type="button"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            <ChevronRight size={16} />
          </PageButton>
          <PageInfo>
            {page} / {totalPages}
          </PageInfo>
          <PageButton
            type="button"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            <ChevronLeft size={16} />
          </PageButton>
          <PageTotal>({total} סה"כ)</PageTotal>
        </Pagination>
      )}
    </Page>
  )
}

const Page = styled.div`
  padding: 16px;
  max-width: 72rem;
  margin: 0 auto;
  ${media.sm} {
    padding: 24px;
  }
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
`

const PageTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
`

const PrimaryButton = styled.button`
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

  &:hover {
    box-shadow: 0 12px 30px rgba(200, 148, 42, 0.3);
  }
`

const SearchField = styled.label`
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
    color: ${theme.colors.slate[200]};
    font-size: 0.875rem;

    &::placeholder {
      color: ${theme.colors.slate[500]};
    }

    &:focus {
      outline: none;
    }
  }
`

const BulkBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 16px;
  background: ${theme.colors.gold}0D;
  border: 1px solid ${theme.colors.gold}33;
  border-radius: ${theme.radii.xl};
  flex-wrap: wrap;
`

const BulkCount = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${theme.colors.gold};
`

const BulkButton = styled.button<{ $variant: 'success' | 'neutral' | 'danger' }>`
  padding: 6px 12px;
  font-size: 0.75rem;
  border-radius: ${theme.radii.md};
  transition: ${theme.transitions.fast};
  color: ${({ $variant }) =>
    $variant === 'success'
      ? theme.colors.emerald
      : $variant === 'danger'
        ? theme.colors.red
        : theme.colors.slate[400]};
  background: ${({ $variant }) =>
    $variant === 'success'
      ? `${theme.colors.emerald}26`
      : $variant === 'danger'
        ? `${theme.colors.red}26`
        : `${theme.colors.slate[500]}26`};

  &:hover {
    opacity: 0.85;
  }
`

const ClearSelection = styled.button`
  margin-right: auto;
  color: ${theme.colors.slate[400]};
  transition: ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.slate[200]};
  }
`

const TableCard = styled.div`
  background: ${theme.glass.bg};
  border: ${theme.glass.border};
  backdrop-filter: ${theme.glass.blur};
  border-radius: ${theme.radii.xl};
  box-shadow: ${theme.shadows.glass};
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
  padding: 12px 12px;
  color: ${theme.colors.slate[400]};
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`

const BodyRow = styled.tr<{ $active?: boolean }>`
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: ${({ $active }) => ($active ? `${theme.colors.gold}0D` : 'transparent')};
  transition: ${theme.transitions.fast};

  &:hover {
    background: ${({ $active }) => ($active ? `${theme.colors.gold}0D` : 'rgba(255, 255, 255, 0.05)')};
  }
`

const BodyCell = styled.td<{ $strong?: boolean; $gold?: boolean; $muted?: boolean }>`
  padding: 12px 12px;
  color: ${({ $gold, $muted }) =>
    $gold ? theme.colors.gold : $muted ? theme.colors.slate[400] : theme.colors.slate[300]};
  font-weight: ${({ $strong }) => ($strong ? 600 : 400)};
  font-size: ${({ $muted }) => ($muted ? '0.75rem' : '0.875rem')};
`

const StatusPill = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: ${theme.radii.full};
  font-size: 0.75rem;
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}20`};
`

const StatusDot = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: ${({ $color }) => $color};
`

const PublishButton = styled.button<{ $active?: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: ${theme.radii.md};
  display: grid;
  place-items: center;
  color: ${({ $active }) => ($active ? theme.colors.emerald : theme.colors.slate[500])};
  background: ${({ $active }) => ($active ? `${theme.colors.emerald}1A` : 'rgba(255, 255, 255, 0.05)')};
  transition: ${theme.transitions.fast};

  &:hover {
    background: ${({ $active }) => ($active ? `${theme.colors.emerald}33` : 'rgba(255, 255, 255, 0.1)')};
  }
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

const IconButton = styled.button<{ $danger?: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: ${theme.radii.md};
  display: grid;
  place-items: center;
  color: ${({ $danger }) => ($danger ? theme.colors.slate[400] : theme.colors.slate[400])};
  transition: ${theme.transitions.fast};

  &:hover {
    color: ${({ $danger }) => ($danger ? theme.colors.red : theme.colors.gold)};
    background: ${({ $danger }) => ($danger ? `${theme.colors.red}1A` : `${theme.colors.gold}1A`)};
  }
`

const EmptyRow = styled.tr``

const EmptyCell = styled.td`
  text-align: center;
  padding: 40px 12px;
  color: ${theme.colors.slate[500]};
`

const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
`

const PageButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: ${theme.radii.md};
  background: rgba(255, 255, 255, 0.05);
  color: ${theme.colors.slate[400]};
  display: grid;
  place-items: center;
  transition: ${theme.transitions.fast};

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`

const PageInfo = styled.span`
  font-size: 0.875rem;
  color: ${theme.colors.slate[400]};
`

const PageTotal = styled.span`
  font-size: 0.75rem;
  color: ${theme.colors.slate[600]};
`

const SkeletonHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
`

const SkeletonTitle = styled.div`
  width: 128px;
  height: 28px;
  border-radius: ${theme.radii.md};
  background: rgba(255, 255, 255, 0.05);
`

const SkeletonButton = styled.div`
  width: 112px;
  height: 40px;
  border-radius: ${theme.radii.xl};
  background: rgba(255, 255, 255, 0.05);
`
