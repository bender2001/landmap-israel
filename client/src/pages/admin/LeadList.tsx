import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'
import {
  Download,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  X,
} from 'lucide-react'
import { adminLeads } from '../../api/admin'
import { leadStatusLabels, leadStatusColors } from '../../utils/constants'
import { formatDate } from '../../utils/format'
import TableSkeleton from '../../components/ui/TableSkeleton'
import SortableHeader from '../../components/admin/SortableHeader'
import { default as usePagination } from '../../hooks/useUI'
import { useToast } from '../../components/ui/ToastContainer'
import { theme, media } from '../../styles/theme'

const statusOptions = [
  { value: '', label: 'כל הסטטוסים' },
  { value: 'new', label: 'חדש' },
  { value: 'contacted', label: 'נוצר קשר' },
  { value: 'qualified', label: 'מתאים' },
  { value: 'converted', label: 'הומר' },
  { value: 'lost', label: 'אבוד' },
]

type Id = number | string

type LeadRow = {
  id: Id
  full_name: string
  phone?: string | null
  email?: string | null
  status: string
  created_at: string
  plots?: {
    block_number?: number | null
    number?: number | null
  } | null
}

type LeadsResponse = {
  data: LeadRow[]
  total: number
}

export default function LeadList() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<Id>>(new Set())
  const { page, setPage, sortBy, sortDir, handleSort, params } = usePagination()

  const queryParams = {
    ...params,
    status: statusFilter || undefined,
    search: search || undefined,
  }

  const { data: result, isLoading } = useQuery<LeadsResponse>({
    queryKey: ['admin', 'leads', queryParams],
    queryFn: () => adminLeads.list(queryParams),
    keepPreviousData: true,
  })

  const leads = result?.data || []
  const total = result?.total || 0
  const totalPages = Math.ceil(total / params.limit)

  const updateStatus = useMutation({
    mutationFn: ({ id, status, notes }: { id: Id; status: string; notes?: string }) =>
      adminLeads.updateStatus(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'leads'] })
      toast('סטטוס עודכן', 'success')
    },
  })

  const bulkUpdateStatus = useMutation({
    mutationFn: ({ ids, status }: { ids: Id[]; status: string }) =>
      adminLeads.bulkUpdateStatus(ids, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'leads'] })
      setSelected(new Set())
      toast('סטטוס עודכן', 'success')
    },
  })

  const handleExport = async () => {
    try {
      const csv = await adminLeads.export()
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast('קובץ CSV יוצא בהצלחה', 'success')
    } catch {
      toast('שגיאה בייצוא', 'error')
    }
  }

  const toggleSelect = (id: Id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === leads.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(leads.map((lead) => lead.id)))
    }
  }

  if (isLoading) {
    return (
      <Page dir="rtl">
        <SkeletonHeader>
          <SkeletonTitle />
          <SkeletonButton />
        </SkeletonHeader>
        <TableSkeleton rows={8} cols={7} />
      </Page>
    )
  }

  return (
    <Page dir="rtl">
      <Header>
        <PageTitle>ניהול לידים</PageTitle>
        <ActionButton type="button" onClick={handleExport}>
          <Download size={16} />
          ייצוא CSV
        </ActionButton>
      </Header>

      <Filters>
        <SearchField>
          <Search size={16} />
          <input
            type="text"
            placeholder="חפש לפי שם, טלפון, אימייל..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </SearchField>

        <FilterSelect
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value)
            setPage(1)
          }}
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </FilterSelect>
      </Filters>

      {selected.size > 0 && (
        <BulkBar>
          <BulkCount>{selected.size} נבחרו</BulkCount>
          {statusOptions
            .filter((opt) => opt.value)
            .map((opt) => (
              <BulkAction
                key={opt.value}
                type="button"
                $color={leadStatusColors[opt.value] || theme.colors.slate[500]}
                onClick={() =>
                  bulkUpdateStatus.mutate({
                    ids: Array.from(selected),
                    status: opt.value,
                  })
                }
              >
                {opt.label}
              </BulkAction>
            ))}
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
                    {selected.size === leads.length && leads.length > 0 ? (
                      <CheckSquare size={16} />
                    ) : (
                      <Square size={16} />
                    )}
                  </IconButton>
                </HeaderCell>
                <SortableHeader label="שם" column="full_name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="טלפון" column="phone" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="אימייל" column="email" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <HeaderCell>חלקה</HeaderCell>
                <SortableHeader label="סטטוס" column="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="תאריך" column="created_at" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const isChecked = selected.has(lead.id)
                return (
                  <BodyRow key={lead.id} $active={isChecked}>
                    <BodyCell>
                      <IconButton type="button" onClick={() => toggleSelect(lead.id)}>
                        {isChecked ? (
                          <CheckSquare size={16} color={theme.colors.gold} />
                        ) : (
                          <Square size={16} />
                        )}
                      </IconButton>
                    </BodyCell>
                    <BodyCell>
                      <LeadLink to={`/admin/leads/${lead.id}`}>{lead.full_name}</LeadLink>
                    </BodyCell>
                    <BodyCell dir="ltr">{lead.phone}</BodyCell>
                    <BodyCell dir="ltr">{lead.email}</BodyCell>
                    <BodyCell>
                      {lead.plots?.block_number
                        ? `${lead.plots.block_number}/${lead.plots.number}`
                        : '—'}
                    </BodyCell>
                    <BodyCell>
                      <StatusDropdown
                        value={lead.status}
                        onChange={(status, notes) =>
                          updateStatus.mutate({ id: lead.id, status, notes })
                        }
                      />
                    </BodyCell>
                    <BodyCell $muted>{formatDate(lead.created_at)}</BodyCell>
                  </BodyRow>
                )
              })}
              {leads.length === 0 && (
                <EmptyRow>
                  <EmptyCell colSpan={7}>
                    {search || statusFilter ? 'לא נמצאו תוצאות' : 'אין לידים'}
                  </EmptyCell>
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

type StatusDropdownProps = {
  value: string
  onChange: (status: string, notes?: string) => void
}

function StatusDropdown({ value, onChange }: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
        setPendingStatus(null)
        setNotes('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleConfirm = () => {
    if (pendingStatus) {
      onChange(pendingStatus, notes.trim() || undefined)
    }
    setIsOpen(false)
    setPendingStatus(null)
    setNotes('')
  }

  const color = leadStatusColors[value] || theme.colors.slate[500]

  return (
    <Dropdown ref={ref}>
      <DropdownToggle
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev)
          setPendingStatus(null)
          setNotes('')
        }}
        $color={color}
      >
        {leadStatusLabels[value] || value}
        <ChevronDown size={12} />
      </DropdownToggle>
      {isOpen && (
        <DropdownMenu>
          {!pendingStatus ? (
            statusOptions
              .filter((opt) => opt.value)
              .map((opt) => (
                <DropdownItem
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    if (opt.value === value) return
                    setPendingStatus(opt.value)
                  }}
                  $active={value === opt.value}
                >
                  {opt.label}
                </DropdownItem>
              ))
          ) : (
            <DropdownStep>
              <StepLabel>
                שינוי ל: <strong>{leadStatusLabels[pendingStatus]}</strong>
              </StepLabel>
              <StepInput
                type="text"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="הערה (אופציונלי)..."
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleConfirm()
                }}
              />
              <StepActions>
                <ConfirmButton type="button" onClick={handleConfirm}>
                  אישור
                </ConfirmButton>
                <CancelButton
                  type="button"
                  onClick={() => {
                    setPendingStatus(null)
                    setNotes('')
                  }}
                >
                  ביטול
                </CancelButton>
              </StepActions>
            </DropdownStep>
          )}
        </DropdownMenu>
      )}
    </Dropdown>
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

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radii.xl};
  color: ${theme.colors.slate[300]};
  font-size: 0.875rem;
  transition: ${theme.transitions.fast};

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`

const Filters = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`

const SearchField = styled.label`
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 320px;
  background: rgba(22, 42, 74, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radii.xl};
  padding: 10px 12px;
  gap: 8px;
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

const FilterSelect = styled.select`
  padding: 10px 16px;
  background: rgba(22, 42, 74, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radii.xl};
  color: ${theme.colors.slate[200]};
  font-size: 0.875rem;
  transition: ${theme.transitions.fast};

  &:focus {
    outline: none;
    border-color: ${theme.colors.gold}80;
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

const BulkAction = styled.button<{ $color: string }>`
  padding: 6px 10px;
  font-size: 0.75rem;
  border-radius: ${theme.radii.md};
  background: ${({ $color }) => `${$color}15`};
  color: ${({ $color }) => $color};
  transition: ${theme.transitions.fast};

  &:hover {
    background: ${({ $color }) => `${$color}25`};
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

const BodyCell = styled.td<{ $muted?: boolean }>`
  padding: 12px 12px;
  color: ${({ $muted }) => ($muted ? theme.colors.slate[500] : theme.colors.slate[300])};
  font-size: ${({ $muted }) => ($muted ? '0.75rem' : '0.875rem')};
`

const LeadLink = styled(Link)`
  color: ${theme.colors.slate[200]};
  font-weight: 600;
  transition: ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.gold};
  }
`

const IconButton = styled.button`
  color: ${theme.colors.slate[400]};
  transition: ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.gold};
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

const Dropdown = styled.div`
  position: relative;
`

const DropdownToggle = styled.button<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: ${theme.radii.full};
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $color }) => `${$color}20`};
  color: ${({ $color }) => $color};
  transition: ${theme.transitions.fast};

  &:hover {
    opacity: 0.8;
  }
`

const DropdownMenu = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  min-width: 200px;
  background: ${theme.colors.navyMid};
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radii.xl};
  box-shadow: ${theme.shadows.popup};
  overflow: hidden;
  z-index: ${theme.zIndex.tooltip};
`

const DropdownItem = styled.button<{ $active?: boolean }>`
  display: block;
  width: 100%;
  text-align: right;
  padding: 8px 12px;
  font-size: 0.75rem;
  color: ${({ $active }) => ($active ? theme.colors.gold : theme.colors.slate[300])};
  background: ${({ $active }) => ($active ? `${theme.colors.gold}1A` : 'transparent')};
  transition: ${theme.transitions.fast};

  &:hover {
    background: ${({ $active }) => ($active ? `${theme.colors.gold}1A` : 'rgba(255, 255, 255, 0.05)')};
  }
`

const DropdownStep = styled.div`
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const StepLabel = styled.div`
  font-size: 0.75rem;
  color: ${theme.colors.slate[400]};

  strong {
    color: ${theme.colors.slate[200]};
    font-weight: 600;
  }
`

const StepInput = styled.input`
  padding: 6px 10px;
  border-radius: ${theme.radii.md};
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(22, 42, 74, 0.6);
  color: ${theme.colors.slate[200]};
  font-size: 0.75rem;

  &::placeholder {
    color: ${theme.colors.slate[500]};
  }

  &:focus {
    outline: none;
    border-color: ${theme.colors.gold}80;
  }
`

const StepActions = styled.div`
  display: flex;
  gap: 6px;
`

const ConfirmButton = styled.button`
  flex: 1;
  padding: 6px 10px;
  border-radius: ${theme.radii.md};
  background: ${theme.colors.gold}33;
  color: ${theme.colors.gold};
  font-size: 0.75rem;
  font-weight: 600;
  transition: ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.gold}4D;
  }
`

const CancelButton = styled.button`
  padding: 6px 10px;
  border-radius: ${theme.radii.md};
  color: ${theme.colors.slate[400]};
  font-size: 0.75rem;
  transition: ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.slate[200]};
  }
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
