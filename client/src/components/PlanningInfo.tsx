import { useState, useEffect, useCallback, useRef } from 'react'
import styled from 'styled-components'
import {
  MapPin,
  ExternalLink,
  AlertCircle,
  Clock,
  CheckCircle2,
  FileText,
  Building2,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react'
import { API_BASE } from '../utils/config'
import { theme, media } from '../styles/theme'

type StatusKey = 'approved' | 'deposited' | 'in_preparation' | 'in_discussion' | 'cancelled' | 'unknown'

type StatusEntry = {
  label: string
  labelLong: string
  color: string
  icon: LucideIcon
}

const STATUS_CONFIG: Record<StatusKey, StatusEntry> = {
  approved: {
    label: 'אושר',
    labelLong: 'אושרה למתן תוקף',
    color: '#22C55E',
    icon: CheckCircle2,
  },
  deposited: {
    label: 'הופקדה',
    labelLong: 'הופקדה',
    color: '#EAB308',
    icon: Clock,
  },
  in_preparation: {
    label: 'בהכנה',
    labelLong: 'בשלבי הכנה',
    color: '#3B82F6',
    icon: FileText,
  },
  in_discussion: {
    label: 'בדיון',
    labelLong: 'בדיון בוועדה',
    color: '#A855F7',
    icon: Building2,
  },
  cancelled: {
    label: 'בוטלה',
    labelLong: 'בוטלה',
    color: '#EF4444',
    icon: AlertCircle,
  },
  unknown: {
    label: 'לא ידוע',
    labelLong: 'סטטוס לא ידוע',
    color: '#64748B',
    icon: Clock,
  },
}

const PLAN_TYPE_LABELS: Record<string, string> = {
  national: 'ארצית',
  district: 'מחוזית',
  local: 'מקומית',
  detailed: 'מפורטת',
  point: 'נקודתית',
  other: 'אחר',
}

const USE_LABELS: Record<string, string> = {
  residential: 'מגורים',
  commercial: 'מסחרי',
  industrial: 'תעשייה',
  public: 'ציבורי',
  agricultural: 'חקלאי',
  tourism: 'תיירות',
  mixed: 'מעורב',
}

type Plan = {
  id?: string | number
  plan_name?: string
  plan_number?: string
  plan_type?: string
  status?: string
  status_date?: string
  area_description?: string
  total_units?: number
  main_uses?: string[]
  city?: string
  relevance?: 'direct' | 'nearby' | 'regional' | string
  govmap_link?: string
  documents_url?: string
}

type PlanningInfoProps = {
  plotId?: string | number
  city?: string
  className?: string
}

type StatusBadgeProps = {
  status?: string
}

type PlanCardProps = {
  plan: Plan
  isExpanded: boolean
  onToggle: () => void
}

const withAlpha = (hex: string, alpha: number) => {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return hex
  const r = Number.parseInt(clean.slice(0, 2), 16)
  const g = Number.parseInt(clean.slice(2, 4), 16)
  const b = Number.parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return null
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

function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[(status as StatusKey) || 'unknown'] || STATUS_CONFIG.unknown
  const Icon = config.icon
  const badgeStyle = {
    color: config.color,
    background: withAlpha(config.color, 0.15),
    borderColor: withAlpha(config.color, 0.25),
  }

  return (
    <StatusPill style={badgeStyle}>
      <Icon size={10} />
      {config.label}
    </StatusPill>
  )
}

function PlanCard({ plan, isExpanded, onToggle }: PlanCardProps) {
  const config = STATUS_CONFIG[(plan.status as StatusKey) || 'unknown'] || STATUS_CONFIG.unknown

  return (
    <PlanCardShell $active={isExpanded}>
      <PlanHeaderButton type="button" onClick={onToggle}>
        <PlanStatusBar style={{ background: config.color }} />
        <PlanHeaderContent>
          <PlanHeaderRow>
            <PlanTitle title={plan.plan_name || plan.plan_number || ''}>
              {plan.plan_name || plan.plan_number}
            </PlanTitle>
            <StatusBadge status={plan.status} />
          </PlanHeaderRow>
          <PlanMetaRow>
            {plan.plan_number && <span>תכנית {plan.plan_number}</span>}
            {plan.plan_type && (
              <>
                <PlanMetaDivider>·</PlanMetaDivider>
                <span>{PLAN_TYPE_LABELS[plan.plan_type] || plan.plan_type}</span>
              </>
            )}
            {plan.status_date && (
              <>
                <PlanMetaDivider>·</PlanMetaDivider>
                <span>{formatDate(plan.status_date)}</span>
              </>
            )}
          </PlanMetaRow>
        </PlanHeaderContent>
      </PlanHeaderButton>

      {isExpanded && (
        <PlanDetails>
          <PlanGrid>
            {plan.area_description && (
              <PlanGridItem $wide>
                <PlanLabel>שטח</PlanLabel>
                <PlanValue>{plan.area_description}</PlanValue>
              </PlanGridItem>
            )}
            {plan.total_units && (
              <PlanGridItem>
                <PlanLabel>יח׳ דיור</PlanLabel>
                <PlanValue>{plan.total_units.toLocaleString()}</PlanValue>
              </PlanGridItem>
            )}
            {plan.main_uses && plan.main_uses.length > 0 && (
              <PlanGridItem>
                <PlanLabel>ייעודים</PlanLabel>
                <UseTags>
                  {plan.main_uses.map((use, i) => (
                    <UseTag key={i}>{USE_LABELS[use] || use}</UseTag>
                  ))}
                </UseTags>
              </PlanGridItem>
            )}
            {plan.city && (
              <PlanGridItem>
                <PlanLabel>רשות</PlanLabel>
                <PlanValue>{plan.city}</PlanValue>
              </PlanGridItem>
            )}
            {plan.relevance && (
              <PlanGridItem>
                <PlanLabel>רלוונטיות</PlanLabel>
                <RelevanceText $variant={plan.relevance}>
                  {plan.relevance === 'direct'
                    ? 'ישירה'
                    : plan.relevance === 'nearby'
                      ? 'בסביבה'
                      : 'אזורית'}
                </RelevanceText>
              </PlanGridItem>
            )}
          </PlanGrid>

          <PlanLinks>
            {plan.govmap_link && (
              <PlanLink
                href={plan.govmap_link}
                target="_blank"
                rel="noopener noreferrer"
                $variant="gold"
              >
                <MapPin size={10} />
                GovMap
                <ExternalLink size={8} />
              </PlanLink>
            )}
            {plan.documents_url && (
              <PlanLink
                href={plan.documents_url}
                target="_blank"
                rel="noopener noreferrer"
                $variant="blue"
              >
                <FileText size={10} />
                מסמכים
                <ExternalLink size={8} />
              </PlanLink>
            )}
          </PlanLinks>
        </PlanDetails>
      )}
    </PlanCardShell>
  )
}

export default function PlanningInfo({ plotId, city, className = '' }: PlanningInfoProps) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(
    async (signal: AbortSignal) => {
      if (!plotId && !city) return
      setLoading(true)
      setError(null)
      try {
        const url = plotId
          ? `${API_BASE}/api/data/plans/plot/${plotId}`
          : `${API_BASE}/api/data/plans?city=${encodeURIComponent(city || '')}`

        const res = await fetch(url, { signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as { plans?: Plan[] }
        setPlans(data.plans || [])
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError('לא הצלחנו לטעון נתוני תכנון. נסה שוב מאוחר יותר.')
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

  const statusCounts = plans.reduce<Record<string, number>>((acc, plan) => {
    const status = plan.status || 'unknown'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  if (loading) {
    return (
      <Wrapper className={className}>
        <HeaderRow>
          <HeaderIcon>
            <MapPin size={14} />
          </HeaderIcon>
          <HeaderTitle>תכנון ותב"עות</HeaderTitle>
        </HeaderRow>
        <SkeletonStack>
          {[1, 2].map((i) => (
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

  if (plans.length === 0) {
    return (
      <Wrapper className={className}>
        <HeaderRow>
          <HeaderIcon>
            <MapPin size={14} />
          </HeaderIcon>
          <HeaderTitle>תכנון ותב"עות</HeaderTitle>
        </HeaderRow>
        <EmptyState>
          <MapPin size={32} />
          <p>לא נמצאו תכניות באזור</p>
          <EmptySub>נתונים ממנהל התכנון (govmap.gov.il)</EmptySub>
        </EmptyState>
      </Wrapper>
    )
  }

  return (
    <Wrapper className={className}>
      <HeaderRow $spaceBetween>
        <HeaderGroup>
          <HeaderIcon>
            <MapPin size={14} />
          </HeaderIcon>
          <div>
            <HeaderTitle>תכנון ותב"עות</HeaderTitle>
            <HeaderMeta>({plans.length} תכניות)</HeaderMeta>
          </div>
        </HeaderGroup>
      </HeaderRow>

      <StatusSummary>
        {Object.entries(statusCounts).map(([status, count]) => {
          const config = STATUS_CONFIG[(status as StatusKey) || 'unknown'] || STATUS_CONFIG.unknown
          return (
            <StatusSummaryPill
              key={status}
              style={{
                color: config.color,
                background: withAlpha(config.color, 0.15),
                borderColor: withAlpha(config.color, 0.25),
              }}
            >
              {config.label}: {count}
            </StatusSummaryPill>
          )
        })}
      </StatusSummary>

      <PlanList>
        {plans.map((plan, i) => {
          const id = plan.id ?? i
          return (
            <PlanCard
              key={id}
              plan={plan}
              isExpanded={expandedId === id}
              onToggle={() => setExpandedId(expandedId === id ? null : id)}
            />
          )
        })}
      </PlanList>

      <Attribution>
        <AttributionText>מקור: מנהל התכנון — govmap.gov.il</AttributionText>
        <AttributionLink href="https://www.govmap.gov.il/" target="_blank" rel="noopener noreferrer">
          <ExternalLink size={10} />
          <span>GovMap</span>
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
  background: rgba(59, 130, 246, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.blue};
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

const SkeletonStack = styled.div`
  display: grid;
  gap: 8px;
`

const SkeletonCard = styled.div`
  height: 64px;
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

const StatusSummary = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;

  ${media.mobile} {
    gap: 4px;
  }
`

const StatusSummaryPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 9px;
  border: 1px solid transparent;
`

const PlanList = styled.div`
  display: grid;
  gap: 8px;
`

const PlanCardShell = styled.div<{ $active: boolean }>`
  border-radius: ${theme.radii.lg};
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: ${({ $active }) => ($active ? 'rgba(241, 245, 249, 0.03)' : 'rgba(241, 245, 249, 0.01)')};
  transition: ${theme.transitions.normal};

  &:hover {
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(241, 245, 249, 0.02);
  }
`

const PlanHeaderButton = styled.button`
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  text-align: right;
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
`

const PlanStatusBar = styled.div`
  width: 4px;
  height: 32px;
  border-radius: 999px;
  flex-shrink: 0;
  margin-top: 2px;
`

const PlanHeaderContent = styled.div`
  flex: 1;
  min-width: 0;
`

const PlanHeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const PlanTitle = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${theme.colors.slate[200]};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  border: 1px solid transparent;
`

const PlanMetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 10px;
  color: ${theme.colors.slate[500]};
`

const PlanMetaDivider = styled.span`
  color: ${theme.colors.slate[700]};
`

const PlanDetails = styled.div`
  padding: 0 12px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`

const PlanGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
`

const PlanGridItem = styled.div<{ $wide?: boolean }>`
  grid-column: ${({ $wide }) => ($wide ? '1 / -1' : 'auto')};
`

const PlanLabel = styled.span`
  display: block;
  font-size: 9px;
  color: ${theme.colors.slate[500]};
`

const PlanValue = styled.span`
  font-size: 11px;
  color: ${theme.colors.slate[300]};
`

const UseTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
`

const UseTag = styled.span`
  font-size: 8px;
  color: rgba(200, 148, 42, 0.7);
  background: rgba(200, 148, 42, 0.08);
  padding: 2px 6px;
  border-radius: 8px;
`

const RelevanceText = styled.span<{ $variant: string }>`
  font-size: 11px;
  font-weight: 600;
  color: ${({ $variant }) => {
    if ($variant === 'direct') return theme.colors.gold
    if ($variant === 'nearby') return '#60A5FA'
    return theme.colors.slate[400]
  }};
`

const PlanLinks = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
`

const PlanLink = styled.a<{ $variant: 'gold' | 'blue' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 9px;
  padding: 4px 8px;
  border-radius: 10px;
  transition: ${theme.transitions.normal};
  text-decoration: none;
  color: ${({ $variant }) => ($variant === 'gold' ? 'rgba(200, 148, 42, 0.75)' : 'rgba(96, 165, 250, 0.75)')};
  background: ${({ $variant }) => ($variant === 'gold' ? 'rgba(200, 148, 42, 0.06)' : 'rgba(59, 130, 246, 0.08)')};

  &:hover {
    color: ${({ $variant }) => ($variant === 'gold' ? theme.colors.gold : '#60A5FA')};
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
  color: rgba(96, 165, 250, 0.6);
  text-decoration: none;
  transition: ${theme.transitions.normal};

  &:hover {
    color: rgba(96, 165, 250, 0.9);
  }
`
