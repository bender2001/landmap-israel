import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import styled from 'styled-components'
import { Activity, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { adminActivity } from '../../api/admin'
import { formatDate } from '../../utils/format'
import Spinner from '../../components/ui/Spinner'
import { theme, media } from '../../styles/theme'

const entityTypes = [
  { value: '', label: 'הכל' },
  { value: 'plot', label: 'חלקות' },
  { value: 'lead', label: 'לידים' },
  { value: 'poi', label: 'נקודות עניין' },
  { value: 'user', label: 'משתמשים' },
]

const actionIcons: Record<string, string> = {
  create: '➕',
  update: '✏️',
  delete: '🗑️',
  publish: '👁️',
  unpublish: '🔒',
  status_change: '🔄',
}

const actionLabels: Record<string, string> = {
  create: 'נוצר',
  update: 'עודכן',
  delete: 'נמחק',
  publish: 'פורסם',
  unpublish: 'הוסר מפרסום',
  status_change: 'שינוי סטטוס',
}

type ActivityItem = {
  id: number | string
  action: string
  entity_type?: string | null
  description?: string | null
  entity_id?: number | string | null
  created_at: string
}

type ActivityResponse = {
  data: ActivityItem[]
  total: number
}

export default function ActivityLog() {
  const [entityFilter, setEntityFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery<ActivityResponse>({
    queryKey: ['admin', 'activity', entityFilter, page],
    queryFn: () => adminActivity.list({ entity_type: entityFilter || undefined, page, limit: 30 }),
  })

  const activities = data?.data || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / 30)

  if (isLoading) {
    return (
      <LoadingWrap>
        <SpinnerIcon />
      </LoadingWrap>
    )
  }

  return (
    <Page dir="rtl">
      <Header>
        <HeaderLeft>
          <HeaderIcon>
            <Activity size={20} />
          </HeaderIcon>
          <div>
            <Title>יומן פעילות</Title>
            <Subtitle>{total} רשומות</Subtitle>
          </div>
        </HeaderLeft>
      </Header>

      <Filters>
        <Filter size={16} color={theme.colors.slate[400]} />
        {entityTypes.map((type) => (
          <FilterButton
            key={type.value}
            $active={entityFilter === type.value}
            onClick={() => {
              setEntityFilter(type.value)
              setPage(1)
            }}
          >
            {type.label}
          </FilterButton>
        ))}
      </Filters>

      {activities.length === 0 ? (
        <EmptyState>
          <Activity size={48} color={theme.colors.slate[600]} />
          <EmptyText>אין רשומות פעילות</EmptyText>
        </EmptyState>
      ) : (
        <Timeline>
          {activities.map((item) => (
            <TimelineCard key={item.id}>
              <ActionIcon>{actionIcons[item.action] || '📋'}</ActionIcon>
              <TimelineContent>
                <TimelineHeader>
                  <ActionLabel>{actionLabels[item.action] || item.action}</ActionLabel>
                  {item.entity_type && <EntityTag>{item.entity_type}</EntityTag>}
                </TimelineHeader>
                {item.description && <Description>{item.description}</Description>}
                {item.entity_id && <EntityId dir="ltr">ID: {item.entity_id}</EntityId>}
              </TimelineContent>
              <TimeStamp>{formatDate(item.created_at)}</TimeStamp>
            </TimelineCard>
          ))}
        </Timeline>
      )}

      {totalPages > 1 && (
        <Pagination>
          <PageButton
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
            aria-label="הקודם"
          >
            <ChevronRight size={16} />
          </PageButton>
          <PageIndicator>
            {page} / {totalPages}
          </PageIndicator>
          <PageButton
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
            aria-label="הבא"
          >
            <ChevronLeft size={16} />
          </PageButton>
        </Pagination>
      )}
    </Page>
  )
}

const Page = styled.div`
  padding: 16px;
  max-width: 64rem;
  margin: 0 auto;
  ${media.sm} {
    padding: 24px;
  }
`

const LoadingWrap = styled.div`
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`

const SpinnerIcon = styled(Spinner)`
  width: 40px;
  height: 40px;
  color: ${theme.colors.gold};
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const HeaderIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${theme.radii.xl};
  background: ${theme.colors.gold}1A;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.gold};
`

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
`

const Subtitle = styled.p`
  font-size: 0.75rem;
  color: ${theme.colors.slate[500]};
`

const Filters = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`

const FilterButton = styled.button<{ $active?: boolean }>`
  padding: 6px 12px;
  border-radius: ${theme.radii.md};
  font-size: 0.75rem;
  transition: ${theme.transitions.fast};
  background: ${({ $active }) => ($active ? `${theme.colors.gold}26` : 'rgba(255,255,255,0.05)')};
  color: ${({ $active }) => ($active ? theme.colors.gold : theme.colors.slate[400])};
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  border: 1px solid transparent;

  &:hover {
    color: ${theme.colors.slate[200]};
    background: ${({ $active }) => ($active ? `${theme.colors.gold}26` : 'rgba(255,255,255,0.1)')};
  }
`

const GlassPanel = styled.div`
  background: ${theme.glass.bg};
  border: ${theme.glass.border};
  backdrop-filter: ${theme.glass.blur};
  border-radius: ${theme.radii.xl};
  box-shadow: ${theme.shadows.glass};
`

const EmptyState = styled(GlassPanel)`
  padding: 48px;
  text-align: center;
  display: grid;
  place-items: center;
  gap: 12px;
`

const EmptyText = styled.p`
  color: ${theme.colors.slate[500]};
`

const Timeline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const TimelineCard = styled(GlassPanel)`
  padding: 16px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  transition: ${theme.transitions.fast};

  &:hover {
    border-color: ${theme.colors.gold}33;
  }
`

const ActionIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${theme.radii.xl};
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
`

const TimelineContent = styled.div`
  flex: 1;
  min-width: 0;
`

const TimelineHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const ActionLabel = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${theme.colors.slate[200]};
`

const EntityTag = styled.span`
  padding: 2px 8px;
  border-radius: ${theme.radii.full};
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  color: ${theme.colors.slate[400]};
`

const Description = styled.p`
  margin-top: 4px;
  font-size: 0.75rem;
  color: ${theme.colors.slate[400]};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const EntityId = styled.p`
  margin-top: 4px;
  font-size: 0.625rem;
  color: ${theme.colors.slate[600]};
`

const TimeStamp = styled.div`
  font-size: 0.75rem;
  color: ${theme.colors.slate[500]};
  flex-shrink: 0;
`

const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
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

const PageIndicator = styled.span`
  font-size: 0.875rem;
  color: ${theme.colors.slate[400]};
`
