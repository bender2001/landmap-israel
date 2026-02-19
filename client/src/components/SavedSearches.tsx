import { useEffect, useRef, useState } from 'react'
import { Bookmark, BookmarkPlus, X, Trash2, Clock, ChevronDown, Check } from 'lucide-react'
import styled from 'styled-components'
import { theme } from '../styles/theme'

type Filters = {
  city?: string
  priceMin?: string | number
  priceMax?: string | number
  sizeMin?: string | number
  sizeMax?: string | number
  minRoi?: string | number
}

type SavedSearch = {
  id: string
  name: string
  createdAt: number
  filters: Filters
  statusFilter?: string[]
  sortBy?: string
}

type SavedSearchesProps = {
  searches: SavedSearch[]
  onSave: (name: string, filters: Filters, statusFilter: string[], sortBy?: string) => void
  onLoad: (search: SavedSearch) => void
  onRemove: (id: string) => void
  currentFilters: Filters
  currentStatusFilter: string[]
  currentSortBy?: string
  activeCount: number
}

export default function SavedSearches({
  searches,
  onSave,
  onLoad,
  onRemove,
  currentFilters,
  currentStatusFilter,
  currentSortBy,
  activeCount,
}: SavedSearchesProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveName, setSaveName] = useState('')
  const ref = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
        setIsSaving(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (isSaving && inputRef.current) inputRef.current.focus()
  }, [isSaving])

  const handleSave = () => {
    if (!saveName.trim()) return
    onSave(saveName.trim(), currentFilters, currentStatusFilter, currentSortBy)
    setSaveName('')
    setIsSaving(false)
  }

  const formatLabel = (search: SavedSearch) => {
    const parts: string[] = []
    if (search.filters.city && search.filters.city !== 'all') parts.push(search.filters.city)
    if (search.filters.priceMin || search.filters.priceMax) parts.push('💰')
    if (search.filters.sizeMin || search.filters.sizeMax) parts.push('📐')
    if (search.statusFilter?.length) parts.push(`${search.statusFilter.length} סטטוסים`)
    if (search.filters.minRoi && search.filters.minRoi !== 'all') parts.push(`ROI ${search.filters.minRoi}%+`)
    return parts.length > 0 ? parts.join(' · ') : 'כל החלקות'
  }

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins} דק׳`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} שעות`
    const days = Math.floor(hours / 24)
    return `${days} ימים`
  }

  return (
    <Wrapper ref={ref}>
      <TriggerButton
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev)
          setIsSaving(false)
        }}
        $active={searches.length > 0}
        $open={isOpen}
        title="חיפושים שמורים"
      >
        <Bookmark aria-hidden />
        <span>שמורים</span>
        {searches.length > 0 && <CountBadge>{searches.length}</CountBadge>}
        <ChevronDown aria-hidden />
      </TriggerButton>

      {isOpen && (
        <Dropdown style={{ minWidth: '280px' }}>
          <DropdownHeader>
            <span>חיפושים שמורים</span>
            {activeCount > 0 && !isSaving && (
              <SaveToggle type="button" onClick={() => setIsSaving(true)}>
                <BookmarkPlus aria-hidden />
                שמור חיפוש נוכחי
              </SaveToggle>
            )}
          </DropdownHeader>

          {isSaving && (
            <SaveForm>
              <SaveInput
                ref={inputRef}
                type="text"
                value={saveName}
                onChange={(event) => setSaveName(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleSave()}
                placeholder="שם לחיפוש..."
                maxLength={30}
              />
              <SaveAction type="button" onClick={handleSave} disabled={!saveName.trim()}>
                <Check aria-hidden />
              </SaveAction>
              <CancelAction
                type="button"
                onClick={() => {
                  setIsSaving(false)
                  setSaveName('')
                }}
              >
                <X aria-hidden />
              </CancelAction>
            </SaveForm>
          )}

          {searches.length === 0 ? (
            <EmptyState>
              <Bookmark aria-hidden />
              <div>אין חיפושים שמורים</div>
              <p>הגדר מסננים ולחץ ״שמור חיפוש נוכחי״</p>
            </EmptyState>
          ) : (
            <List>
              {searches.map((search) => (
                <ListItem
                  key={search.id}
                  onClick={() => {
                    onLoad(search)
                    setIsOpen(false)
                  }}
                >
                  <Bookmark aria-hidden />
                  <ItemInfo>
                    <strong>{search.name}</strong>
                    <span>{formatLabel(search)}</span>
                  </ItemInfo>
                  <ItemMeta>
                    <small>
                      <Clock aria-hidden />
                      {timeAgo(search.createdAt)}
                    </small>
                    <IconOnly
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onRemove(search.id)
                      }}
                      title="מחק"
                    >
                      <Trash2 aria-hidden />
                    </IconOnly>
                  </ItemMeta>
                </ListItem>
              ))}
            </List>
          )}
        </Dropdown>
      )}
    </Wrapper>
  )
}

const Wrapper = styled.div`
  position: relative;
`

const TriggerButton = styled.button<{ $active: boolean; $open: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: ${theme.radii.lg};
  border: 1px solid ${({ $active }) => ($active ? 'rgba(200, 148, 42, 0.2)' : 'rgba(255, 255, 255, 0.08)')};
  background: ${({ $open }) => ($open ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.04)')};
  color: ${theme.colors.slate[300]};
  transition: ${theme.transitions.fast};

  svg {
    width: 14px;
    height: 14px;
  }

  span {
    font-size: 12px;
  }

  &:hover,
  &:focus-visible {
    background: rgba(255, 255, 255, 0.08);
  }

  svg:last-child {
    margin-left: 2px;
    transition: ${theme.transitions.fast};
    transform: ${({ $open }) => ($open ? 'rotate(180deg)' : 'rotate(0deg)')};
  }
`

const CountBadge = styled.span`
  padding: 2px 6px;
  min-width: 18px;
  border-radius: ${theme.radii.full};
  font-size: 10px;
  font-weight: 700;
  text-align: center;
  color: ${theme.colors.gold};
  background: rgba(200, 148, 42, 0.2);
`

const Dropdown = styled.div`
  position: absolute;
  top: 3rem;
  right: 0;
  z-index: 60;
  background: rgba(10, 22, 40, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radii.xl};
  box-shadow: ${theme.shadows.popup};
  overflow: hidden;
`

const DropdownHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0.75rem 0.5rem;
  font-size: 12px;
  color: ${theme.colors.slate[200]};
`

const SaveToggle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 10px;
  color: ${theme.colors.gold};
  background: transparent;
  border: none;
  transition: ${theme.transitions.fast};

  svg {
    width: 12px;
    height: 12px;
  }

  &:hover,
  &:focus-visible {
    color: ${theme.colors.goldBright};
  }
`

const SaveForm = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`

const SaveInput = styled.input`
  flex: 1;
  border-radius: ${theme.radii.md};
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  padding: 0.375rem 0.75rem;
  font-size: 12px;
  color: ${theme.colors.slate[200]};

  &::placeholder {
    color: ${theme.colors.slate[500]};
  }

  &:focus {
    outline: none;
    border-color: rgba(200, 148, 42, 0.3);
  }
`

const SaveAction = styled.button`
  padding: 0.375rem 0.75rem;
  border-radius: ${theme.radii.md};
  border: 1px solid rgba(200, 148, 42, 0.3);
  background: rgba(200, 148, 42, 0.2);
  color: ${theme.colors.gold};
  font-size: 12px;
  transition: ${theme.transitions.fast};

  svg {
    width: 12px;
    height: 12px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const CancelAction = styled.button`
  padding: 0.375rem 0.5rem;
  border-radius: ${theme.radii.md};
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: ${theme.colors.slate[400]};
  transition: ${theme.transitions.fast};

  svg {
    width: 12px;
    height: 12px;
  }

  &:hover,
  &:focus-visible {
    background: rgba(255, 255, 255, 0.1);
  }
`

const EmptyState = styled.div`
  padding: 1.5rem 1rem;
  text-align: center;
  color: ${theme.colors.slate[500]};
  font-size: 12px;

  svg {
    width: 32px;
    height: 32px;
    color: ${theme.colors.slate[600]};
    margin-bottom: 0.5rem;
  }

  p {
    margin: 0.25rem 0 0;
    font-size: 10px;
    color: ${theme.colors.slate[600]};
  }
`

const List = styled.div`
  max-height: 280px;
  overflow-y: auto;
`

const ListItem = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: transparent;
  border: none;
  text-align: right;
  cursor: pointer;
  transition: ${theme.transitions.fast};

  svg {
    width: 14px;
    height: 14px;
    color: rgba(200, 148, 42, 0.6);
    flex-shrink: 0;
  }

  &:hover,
  &:focus-visible {
    background: rgba(255, 255, 255, 0.05);
  }
`

const ItemInfo = styled.div`
  flex: 1;
  min-width: 0;

  strong {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: ${theme.colors.slate[200]};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    display: block;
    font-size: 10px;
    color: ${theme.colors.slate[500]};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const ItemMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;

  small {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 9px;
    color: ${theme.colors.slate[600]};
  }

  small svg {
    width: 10px;
    height: 10px;
  }
`

const IconOnly = styled.button`
  width: 24px;
  height: 24px;
  border-radius: ${theme.radii.md};
  border: none;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: ${theme.transitions.fast};

  svg {
    width: 12px;
    height: 12px;
    color: #f87171;
  }

  ${ListItem}:hover & {
    opacity: 1;
  }

  &:hover,
  &:focus-visible {
    background: rgba(239, 68, 68, 0.2);
  }
`
