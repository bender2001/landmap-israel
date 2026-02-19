import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import styled from 'styled-components'
import {
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  ExternalLink,
  AlertCircle,
  Database,
  RefreshCw,
  ChevronDown,
} from 'lucide-react'
import { API_BASE } from '../utils/config'
import { theme, media } from '../styles/theme'

type SortField = 'deal_date' | 'deal_amount' | 'price_per_sqm'
type FilterType = 'all' | 'land' | 'apartment'

type Transaction = {
  id?: string | number
  deal_date?: string
  deal_amount?: number
  size_sqm?: number
  price_per_sqm?: number
  address?: string
  property_type?: string
}

type Stats = {
  avg: number
  median: number
  min: number
  max: number
  count: number
  totalVolume: number
}

type RealTransactionsProps = {
  plotId?: string | number
  city?: string
  className?: string
}

const formatPrice = (amount?: number | null) => {
  if (!amount) return '—'
  if (amount >= 1_000_000) return `₪${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `₪${(amount / 1_000).toFixed(0)}K`
  return `₪${amount.toLocaleString()}`
}

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export default function RealTransactions({ plotId, city, className = '' }: RealTransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('deal_date')
  const [sortAsc, setSortAsc] = useState(false)
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [showAll, setShowAll] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(
    async (signal: AbortSignal) => {
      if (!plotId && !city) return
      setLoading(true)
      setError(null)
      try {
        const url = plotId
          ? `${API_BASE}/api/data/transactions/nearby/${plotId}?radius=2000`
          : `${API_BASE}/api/data/transactions?city=${encodeURIComponent(city || '')}&months=24`

        const res = await fetch(url, { signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as { transactions?: Transaction[] }
        setTransactions(data.transactions || [])
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError('לא הצלחנו לטעון נתוני עסקאות. נסה שוב מאוחר יותר.')
      } finally {
        setLoading(false)
      }
    },
    [plotId, city]
  )

  useEffect(() => {
    if (!plotId && !city) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    fetchData(controller.signal)
    return () => controller.abort()
  }, [plotId, city, fetchData])

  const handleRetry = useCallback(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    fetchData(controller.signal)
  }, [fetchData])

  const processedTx = useMemo(() => {
    let filtered = [...transactions]

    if (filterType !== 'all') {
      filtered = filtered.filter((t) => t.property_type === filterType)
    }

    filtered.sort((a, b) => {
      let valA: string | number | undefined = a[sortField]
      let valB: string | number | undefined = b[sortField]
      if (sortField === 'deal_date') {
        valA = new Date(valA || 0).getTime()
        valB = new Date(valB || 0).getTime()
      }
      if (typeof valA === 'string') valA = valA.toLowerCase()
      if (typeof valB === 'string') valB = valB.toLowerCase()
      if (valA < valB) return sortAsc ? -1 : 1
      if (valA > valB) return sortAsc ? 1 : -1
      return 0
    })

    return filtered
  }, [transactions, sortField, sortAsc, filterType])

  const stats = useMemo<Stats | null>(() => {
    const valid = processedTx.filter((t) => (t.deal_amount || 0) > 0 && (t.size_sqm || 0) > 0)
    if (valid.length === 0) return null

    const prices = valid.map((t) => (t.deal_amount || 0) / (t.size_sqm || 1))
    const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length)
    const sorted = [...prices].sort((a, b) => a - b)
    const med = Math.round(sorted[Math.floor(sorted.length / 2)])
    const min = Math.round(Math.min(...prices))
    const max = Math.round(Math.max(...prices))
    const totalVolume = valid.reduce((s, t) => s + (t.deal_amount || 0), 0)

    return { avg, median: med, min, max, count: valid.length, totalVolume }
  }, [processedTx])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  if (loading) {
    return (
      <Wrapper className={className}>
        <HeaderRow>
          <HeaderIcon>
            <Database size={14} />
          </HeaderIcon>
          <HeaderTitle>עסקאות בסביבה</HeaderTitle>
        </HeaderRow>
        <SkeletonStack>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </SkeletonStack>
      </Wrapper>
    )
  }

  if (error) {
    return (
      <Wrapper className={className}>
        <ErrorCard>
          <ErrorMessage>
            <AlertCircle size={16} />
            <span>{error}</span>
          </ErrorMessage>
          <RetryButton type="button" onClick={handleRetry}>
            <RefreshCw size={12} />
            נסה שוב
          </RetryButton>
        </ErrorCard>
      </Wrapper>
    )
  }

  if (transactions.length === 0) {
    return (
      <Wrapper className={className}>
        <HeaderRow>
          <HeaderIcon>
            <Database size={14} />
          </HeaderIcon>
          <HeaderTitle>עסקאות בסביבה</HeaderTitle>
        </HeaderRow>
        <EmptyState>
          <Database size={32} />
          <p>לא נמצאו עסקאות באזור</p>
          <EmptySub>נתונים מנדל"ן נט (nadlan.gov.il)</EmptySub>
        </EmptyState>
      </Wrapper>
    )
  }

  return (
    <Wrapper className={className}>
      <HeaderRow $spaceBetween>
        <HeaderGroup>
          <HeaderIcon>
            <Database size={14} />
          </HeaderIcon>
          <div>
            <HeaderTitle>עסקאות בסביבה</HeaderTitle>
            <HeaderMeta>({transactions.length})</HeaderMeta>
          </div>
        </HeaderGroup>
        <FilterPills>
          {[
            { key: 'all', label: 'הכל' },
            { key: 'land', label: 'קרקע' },
            { key: 'apartment', label: 'דירה' },
          ].map((filter) => (
            <FilterButton
              key={filter.key}
              type="button"
              $active={filterType === filter.key}
              onClick={() => setFilterType(filter.key as FilterType)}
            >
              {filter.label}
            </FilterButton>
          ))}
        </FilterPills>
      </HeaderRow>

      {stats && (
        <StatsGrid>
          <StatCard>
            <StatLabel>ממוצע/מ״ר</StatLabel>
            <StatValue $variant="gold">₪{stats.avg.toLocaleString()}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>חציון/מ״ר</StatLabel>
            <StatValue>₪{stats.median.toLocaleString()}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>טווח</StatLabel>
            <StatValue>
              {formatPrice(stats.min)}–{formatPrice(stats.max)}
            </StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>עסקאות</StatLabel>
            <StatValue $variant="blue">{stats.count}</StatValue>
          </StatCard>
        </StatsGrid>
      )}

      <TableWrap>
        <TransactionsTable>
          <thead>
            <tr>
              <TableHeader onClick={() => handleSort('deal_date')}>
                <HeaderCell>
                  תאריך
                  <ArrowUpDown size={10} />
                </HeaderCell>
              </TableHeader>
              <TableHeader onClick={() => handleSort('deal_amount')}>
                <HeaderCell>
                  מחיר
                  <ArrowUpDown size={10} />
                </HeaderCell>
              </TableHeader>
              <TableHeader>שטח</TableHeader>
              <TableHeader onClick={() => handleSort('price_per_sqm')}>
                <HeaderCell>
                  ₪/מ״ר
                  <ArrowUpDown size={10} />
                </HeaderCell>
              </TableHeader>
              <TableHeader>כתובת</TableHeader>
            </tr>
          </thead>
          <tbody>
            {processedTx.slice(0, showAll ? processedTx.length : 20).map((tx, i) => {
              const priceSqm = tx.size_sqm && tx.deal_amount ? Math.round(tx.deal_amount / tx.size_sqm) : null
              const isAboveAvg = stats && priceSqm && priceSqm > stats.avg

              return (
                <TableRow key={tx.id || i}>
                  <TableCell>{formatDate(tx.deal_date)}</TableCell>
                  <TableCell $strong>{formatPrice(tx.deal_amount)}</TableCell>
                  <TableCell>
                    {tx.size_sqm ? `${tx.size_sqm.toLocaleString()} מ״ר` : '—'}
                  </TableCell>
                  <TableCell>
                    {priceSqm ? (
                      <PricePerSqm $variant={isAboveAvg ? 'up' : 'down'}>
                        {isAboveAvg ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        ₪{priceSqm.toLocaleString()}
                      </PricePerSqm>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <AddressCell title={tx.address || ''}>{tx.address || '—'}</AddressCell>
                </TableRow>
              )
            })}
          </tbody>
        </TransactionsTable>
      </TableWrap>

      {processedTx.length > 20 && !showAll && (
        <ShowMoreButton type="button" $variant="gold" onClick={() => setShowAll(true)}>
          <ChevronDown size={12} />
          <span>הצג את כל {processedTx.length} העסקאות</span>
        </ShowMoreButton>
      )}
      {showAll && processedTx.length > 20 && (
        <ShowMoreButton type="button" $variant="slate" onClick={() => setShowAll(false)}>
          <ChevronDown size={12} style={{ transform: 'rotate(180deg)' }} />
          <span>הצג פחות</span>
        </ShowMoreButton>
      )}

      <Attribution>
        <AttributionText>מקור: נדל"ן נט (nadlan.gov.il) — משרד המשפטים</AttributionText>
        <AttributionLink href="https://www.nadlan.gov.il/" target="_blank" rel="noopener noreferrer">
          <ExternalLink size={10} />
          <span>למקור</span>
        </AttributionLink>
      </Attribution>
    </Wrapper>
  )
}

const Wrapper = styled.div`
  font-family: ${theme.fonts.primary};
  color: ${theme.colors.slate[200]};
`

const HeaderRow = styled.div<{ $spaceBetween?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  justify-content: ${({ $spaceBetween }) => ($spaceBetween ? 'space-between' : 'flex-start')};
`

const HeaderGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const HeaderIcon = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 10px;
  background: rgba(200, 148, 42, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.gold};
`

const HeaderTitle = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${theme.colors.slate[200]};
`

const HeaderMeta = styled.span`
  font-size: 9px;
  color: ${theme.colors.slate[500]};
  margin-right: 8px;
`

const FilterPills = styled.div`
  display: flex;
  gap: 4px;
`

const FilterButton = styled.button<{ $active: boolean }>`
  font-size: 9px;
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid ${({ $active }) => ($active ? 'rgba(200, 148, 42, 0.2)' : 'transparent')};
  color: ${({ $active }) => ($active ? theme.colors.gold : theme.colors.slate[500])};
  background: ${({ $active }) => ($active ? 'rgba(200, 148, 42, 0.15)' : 'transparent')};
  cursor: pointer;
  transition: ${theme.transitions.normal};

  &:hover {
    color: ${theme.colors.slate[300]};
  }
`

const SkeletonStack = styled.div`
  display: grid;
  gap: 8px;
`

const SkeletonCard = styled.div`
  height: 48px;
  border-radius: ${theme.radii.lg};
  background: rgba(241, 245, 249, 0.03);
  animation: pulse 1.6s ease-in-out infinite;

  @keyframes pulse {
    0%,
    100% {
      opacity: 0.7;
    }
    50% {
      opacity: 1;
    }
  }
`

const ErrorCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px;
  border-radius: ${theme.radii.lg};
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
`

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(248, 113, 113, 0.9);
  font-size: 12px;
  min-width: 0;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const RetryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 10px;
  font-weight: 600;
  color: rgba(248, 113, 113, 0.9);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: ${theme.radii.md};
  transition: ${theme.transitions.normal};
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    color: rgba(254, 202, 202, 0.95);
    background: rgba(239, 68, 68, 0.2);
  }
`

const EmptyState = styled.div`
  text-align: center;
  padding: 24px 0;
  color: ${theme.colors.slate[500]};
  font-size: 12px;

  svg {
    opacity: 0.3;
    margin-bottom: 8px;
  }
`

const EmptySub = styled.p`
  font-size: 10px;
  margin-top: 4px;
  color: ${theme.colors.slate[600]};
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;

  ${media.mobile} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const StatCard = styled.div`
  background: rgba(241, 245, 249, 0.03);
  border-radius: ${theme.radii.md};
  padding: 8px;
  text-align: center;
`

const StatLabel = styled.div`
  font-size: 8px;
  color: ${theme.colors.slate[500]};
`

const StatValue = styled.div<{ $variant?: 'gold' | 'blue' }>`
  font-size: 12px;
  font-weight: 700;
  color: ${({ $variant }) => {
    if ($variant === 'gold') return theme.colors.gold
    if ($variant === 'blue') return '#60A5FA'
    return theme.colors.slate[300]
  }};
`

const TableWrap = styled.div`
  overflow-x: auto;
  margin: 0 -4px;
`

const TransactionsTable = styled.table`
  width: 100%;
  font-size: 10px;
  border-collapse: collapse;
`

const TableHeader = styled.th`
  text-align: right;
  padding: 6px 4px;
  color: ${theme.colors.slate[500]};
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: ${theme.transitions.normal};

  &:hover {
    color: ${theme.colors.slate[300]};
  }
`

const HeaderCell = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const TableRow = styled.tr`
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  transition: ${theme.transitions.normal};

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`

const TableCell = styled.td<{ $strong?: boolean }>`
  padding: 6px 4px;
  color: ${({ $strong }) => ($strong ? theme.colors.slate[200] : theme.colors.slate[400])};
  font-weight: ${({ $strong }) => ($strong ? 600 : 400)};
`

const PricePerSqm = styled.span<{ $variant: 'up' | 'down' }>`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-weight: 600;
  color: ${({ $variant }) => ($variant === 'up' ? theme.colors.red : theme.colors.emerald)};
`

const AddressCell = styled.td`
  padding: 6px 4px;
  color: ${theme.colors.slate[500]};
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ShowMoreButton = styled.button<{ $variant: 'gold' | 'slate' }>`
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 0;
  margin-top: 4px;
  font-size: 10px;
  border-radius: ${theme.radii.md};
  border: none;
  cursor: pointer;
  background: transparent;
  color: ${({ $variant }) => ($variant === 'gold' ? 'rgba(200, 148, 42, 0.7)' : theme.colors.slate[500])};
  transition: ${theme.transitions.normal};

  &:hover {
    color: ${({ $variant }) => ($variant === 'gold' ? theme.colors.gold : theme.colors.slate[300])};
    background: ${({ $variant }) => ($variant === 'gold' ? 'rgba(200, 148, 42, 0.05)' : 'rgba(255, 255, 255, 0.05)')};
  }
`

const Attribution = styled.div`
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const AttributionText = styled.span`
  font-size: 8px;
  color: ${theme.colors.slate[600]};
`

const AttributionLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 8px;
  color: rgba(200, 148, 42, 0.6);
  text-decoration: none;
  transition: ${theme.transitions.normal};

  &:hover {
    color: rgba(200, 148, 42, 0.9);
  }
`
