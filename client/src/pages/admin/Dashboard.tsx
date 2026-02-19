import { useQuery } from '@tanstack/react-query'
import type { ComponentType, SVGProps } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import {
  Map,
  Users,
  TrendingUp,
  BarChart3,
  Clock,
  ArrowLeft,
} from 'lucide-react'
import { adminDashboard } from '../../api/admin'
import { leadStatusLabels, leadStatusColors, statusLabels, statusColors } from '../../utils/constants'
import { theme, media } from '../../styles/theme'

// ─── Inline: DashboardSkeleton (was components/ui/DashboardSkeleton.tsx) ─
const skelPulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`

const SkelWrapper = styled.div`
  padding: 16px;
  max-width: 72rem;
  margin: 0 auto;
  animation: ${skelPulse} 1.5s ease-in-out infinite;
  direction: rtl;

  ${media.sm} {
    padding: 24px;
  }
`

const SkelTitle = styled.div`
  height: 28px;
  width: 128px;
  border-radius: ${theme.radii.md};
  background: rgba(255, 255, 255, 0.05);
  margin-bottom: 24px;
`

const SkelGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-bottom: 32px;

  ${media.sm} {
    grid-template-columns: repeat(2, 1fr);
  }

  ${media.lg} {
    grid-template-columns: repeat(4, 1fr);
  }
`

const SkelPanel = styled.div`
  background: ${theme.glass.bg};
  backdrop-filter: ${theme.glass.blur};
  border: ${theme.glass.border};
  border-radius: ${theme.radii.lg};
  box-shadow: ${theme.shadows.glass};
  padding: 20px;
`

const SkelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const SkelBox = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${theme.radii.md};
  background: rgba(255, 255, 255, 0.05);
`

const SkelLine = styled.div<{ $width: number; $height?: number }>`
  height: ${({ $height }) => `${$height || 12}px`};
  width: ${({ $width }) => `${$width}px`};
  border-radius: ${theme.radii.full};
  background: rgba(255, 255, 255, 0.05);
`

const SkelChartGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-bottom: 32px;

  ${media.lg} {
    grid-template-columns: repeat(2, 1fr);
  }
`

const SkelBarRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 128px;
`

const SkelBar = styled.div<{ $height: number }>`
  flex: 1;
  height: ${({ $height }) => `${$height}%`};
  border-radius: 4px 4px 0 0;
  background: rgba(255, 255, 255, 0.05);
`

const SkelDonutRow = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
`

const SkelDonut = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
`

const SkelLegend = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
`

const SkelLegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const SkelDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
`

const SkelTable = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const SkelRowBox = styled.div`
  height: 40px;
  border-radius: ${theme.radii.md};
  background: rgba(255, 255, 255, 0.05);
`

function DashboardSkeleton() {
  return (
    <SkelWrapper>
      <SkelTitle />

      <SkelGrid>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkelPanel key={i}>
            <SkelRow>
              <SkelBox />
              <SkelLine $width={64} $height={12} />
            </SkelRow>
            <SkelLine $width={80} $height={28} />
          </SkelPanel>
        ))}
      </SkelGrid>

      <SkelChartGrid>
        <SkelPanel>
          <SkelLine $width={160} $height={16} />
          <SkelBarRow>
            {Array.from({ length: 30 }).map((_, i) => (
              <SkelBar key={i} $height={10 + Math.random() * 80} />
            ))}
          </SkelBarRow>
        </SkelPanel>
        <SkelPanel>
          <SkelLine $width={120} $height={16} />
          <SkelDonutRow>
            <SkelDonut />
            <SkelLegend>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkelLegendItem key={i}>
                  <SkelDot />
                  <SkelLine $width={120} $height={12} />
                </SkelLegendItem>
              ))}
            </SkelLegend>
          </SkelDonutRow>
        </SkelPanel>
      </SkelChartGrid>

      <SkelPanel>
        <SkelLine $width={112} $height={16} />
        <SkelTable>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkelRowBox key={i} />
          ))}
        </SkelTable>
      </SkelPanel>
    </SkelWrapper>
  )
}

type LeadChartPoint = {
  date: string
  count: number
}

type LeadSummary = {
  id: number | string
  full_name: string
  phone?: string | null
  status: string
  created_at: string
  plots?: {
    block_number?: number | null
  } | null
}

type DashboardStats = {
  totalPlots?: number
  availablePlots?: number
  leadsThisMonth?: number
  conversionRate?: number
  charts?: {
    leadsByDay?: LeadChartPoint[]
    leadsByStatus?: Record<string, number>
    plotsByStatus?: Record<string, number>
  }
  recentLeads?: LeadSummary[]
}

type KpiCardProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  value: string | number
  color?: string
  subtext?: string
  to?: string
}

function KPICard({ icon: Icon, label, value, color = theme.colors.gold, subtext, to }: KpiCardProps) {
  const content = (
    <KpiContent>
      <KpiHeader>
        <KpiIconWrap>
          <Icon size={20} color={color} />
        </KpiIconWrap>
        <KpiLabel>{label}</KpiLabel>
      </KpiHeader>
      <KpiValue $color={color}>{value}</KpiValue>
      {subtext && <KpiSubtext>{subtext}</KpiSubtext>}
    </KpiContent>
  )

  if (to) {
    return <KpiLink to={to}>{content}</KpiLink>
  }

  return <KpiCardShell>{content}</KpiCardShell>
}

type LeadsBarChartProps = {
  data?: LeadChartPoint[]
}

function LeadsBarChart({ data = [] }: LeadsBarChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <ChartCard>
      <ChartTitle>
        <BarChart3 size={20} color={theme.colors.gold} />
        לידים — 30 ימים אחרונים
      </ChartTitle>
      <BarChartRow>
        {data.map((d, index) => {
          const height = maxCount > 0 ? (d.count / maxCount) * 100 : 0
          return (
            <BarGroup key={`${d.date}-${index}`}>
              <Bar
                style={{
                  height: `${Math.max(height, 2)}%`,
                  minHeight: d.count > 0 ? '4px' : '1px',
                }}
              />
              <BarTooltip>{d.date.slice(5)}: {d.count}</BarTooltip>
            </BarGroup>
          )
        })}
      </BarChartRow>
      <ChartFooter>
        <span>{data[0]?.date?.slice(5)}</span>
        <span>{data[data.length - 1]?.date?.slice(5)}</span>
      </ChartFooter>
    </ChartCard>
  )
}

type StatusDonutProps = {
  data?: Record<string, number>
  labels?: Record<string, string>
  colors?: Record<string, string>
  title: string
}

function StatusDonut({ data = {}, labels = {}, colors = {}, title }: StatusDonutProps) {
  const entries = Object.entries(data).filter(([, value]) => value > 0)
  const total = entries.reduce((sum, [, value]) => sum + value, 0)

  if (total === 0) {
    return (
      <ChartCard>
        <ChartTitle>{title}</ChartTitle>
        <EmptyChart>אין נתונים</EmptyChart>
      </ChartCard>
    )
  }

  const size = 120
  const center = size / 2
  const radius = 45
  const strokeWidth = 16
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <ChartCard>
      <ChartTitle>{title}</ChartTitle>
      <DonutLayout>
        <svg width={size} height={size}>
          {entries.map(([key, count]) => {
            const pct = count / total
            const dashLength = pct * circumference
            const dashOffset = -offset
            offset += dashLength
            return (
              <DonutArc
                key={key}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={colors[key] || theme.colors.slate[500]}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${center} ${center})`}
              />
            )
          })}
          <DonutText x={center} y={center} textAnchor="middle" dominantBaseline="central">
            {total}
          </DonutText>
        </svg>
        <Legend>
          {entries.map(([key, count]) => (
            <LegendRow key={key}>
              <LegendDot style={{ background: colors[key] || theme.colors.slate[500] }} />
              <LegendLabel>{labels[key] || key}</LegendLabel>
              <LegendValue>{count}</LegendValue>
            </LegendRow>
          ))}
        </Legend>
      </DonutLayout>
    </ChartCard>
  )
}

type HorizontalBarChartProps = {
  data?: Record<string, number>
  labels?: Record<string, string>
  colors?: Record<string, string>
  title: string
}

function HorizontalBarChart({ data = {}, labels = {}, colors = {}, title }: HorizontalBarChartProps) {
  const entries = Object.entries(data).filter(([, value]) => value > 0)
  const maxCount = Math.max(...entries.map(([, value]) => value), 1)

  return (
    <ChartCard>
      <ChartTitle>{title}</ChartTitle>
      {entries.length === 0 ? (
        <EmptyChart>אין נתונים</EmptyChart>
      ) : (
        <HorizontalList>
          {entries.map(([key, count]) => (
            <HorizontalRow key={key}>
              <HorizontalHeader>
                <span>{labels[key] || key}</span>
                <strong>{count}</strong>
              </HorizontalHeader>
              <BarTrack>
                <BarFill
                  style={{
                    width: `${(count / maxCount) * 100}%`,
                    background: colors[key] || theme.colors.gold,
                  }}
                />
              </BarTrack>
            </HorizontalRow>
          ))}
        </HorizontalList>
      )}
    </ChartCard>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { data, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminDashboard.stats,
    staleTime: 60_000,
  })

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <CenterMessage>
        <ErrorText>שגיאה בטעינת נתונים</ErrorText>
      </CenterMessage>
    )
  }

  const stats = data || {}
  const charts = stats.charts || {}

  return (
    <Page dir="rtl">
      <PageTitle>דשבורד</PageTitle>

      <KpiGrid>
        <KPICard
          icon={Map}
          label="סה&quot;כ חלקות"
          value={stats.totalPlots ?? 0}
          color={theme.colors.blue}
          to="/admin/plots"
        />
        <KPICard
          icon={Map}
          label="חלקות זמינות"
          value={stats.availablePlots ?? 0}
          color={theme.colors.emerald}
          to="/admin/plots"
        />
        <KPICard
          icon={Users}
          label="לידים החודש"
          value={stats.leadsThisMonth ?? 0}
          color={theme.colors.gold}
          to="/admin/leads"
        />
        <KPICard
          icon={TrendingUp}
          label="אחוז המרה"
          value={`${stats.conversionRate ?? 0}%`}
          color={theme.colors.purple}
          to="/admin/leads"
        />
      </KpiGrid>

      <ChartsGrid>
        <LeadsBarChart data={charts.leadsByDay} />
        <StatusDonut
          data={charts.leadsByStatus}
          labels={leadStatusLabels}
          colors={leadStatusColors}
          title="לידים לפי סטטוס"
        />
      </ChartsGrid>

      <Section>
        <HorizontalBarChart
          data={charts.plotsByStatus}
          labels={statusLabels}
          colors={statusColors}
          title="חלקות לפי סטטוס"
        />
      </Section>

      <ChartCard>
        <RecentHeader>
          <RecentTitle>
            <Clock size={20} color={theme.colors.gold} />
            לידים אחרונים
          </RecentTitle>
          <RecentLink to="/admin/leads">
            הצג הכל
            <ArrowLeft size={12} />
          </RecentLink>
        </RecentHeader>

        {stats.recentLeads?.length ? (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <HeaderCell>שם</HeaderCell>
                  <HeaderCell>טלפון</HeaderCell>
                  <HeaderCell>חלקה</HeaderCell>
                  <HeaderCell>סטטוס</HeaderCell>
                  <HeaderCell>תאריך</HeaderCell>
                </tr>
              </thead>
              <tbody>
                {stats.recentLeads.map((lead) => {
                  const color = leadStatusColors[lead.status] || theme.colors.slate[500]
                  return (
                    <BodyRow
                      key={lead.id}
                      onClick={() => navigate(`/admin/leads/${lead.id}`)}
                    >
                      <BodyCell>{lead.full_name}</BodyCell>
                      <BodyCell dir="ltr">{lead.phone}</BodyCell>
                      <BodyCell>
                        {lead.plots?.block_number ? `גוש ${lead.plots.block_number}` : '—'}
                      </BodyCell>
                      <BodyCell>
                        <StatusPill $color={color}>
                          {leadStatusLabels[lead.status] || lead.status}
                        </StatusPill>
                      </BodyCell>
                      <DateCell>{new Date(lead.created_at).toLocaleDateString('he-IL')}</DateCell>
                    </BodyRow>
                  )
                })}
              </tbody>
            </Table>
          </TableWrap>
        ) : (
          <EmptyChart>אין לידים עדיין</EmptyChart>
        )}
      </ChartCard>
    </Page>
  )
}

const Page = styled.div`
  padding: 12px;
  max-width: 72rem;
  margin: 0 auto;
  ${media.sm} {
    padding: 16px;
  }
  ${media.md} {
    padding: 24px;
  }
`

const PageTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
  margin-bottom: 24px;
`

const CenterMessage = styled.div`
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`

const ErrorText = styled.p`
  color: ${theme.colors.red};
`

const GlassPanel = styled.div`
  background: ${theme.glass.bg};
  border: ${theme.glass.border};
  backdrop-filter: ${theme.glass.blur};
  border-radius: ${theme.radii.xl};
  box-shadow: ${theme.shadows.glass};
`

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 32px;
  ${media.sm} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  ${media.lg} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`

const KpiCardShell = styled(GlassPanel)`
  padding: 20px;
`

const KpiLink = styled(Link)`
  display: block;
  padding: 20px;
  transition: ${theme.transitions.smooth};
  background: ${theme.glass.bg};
  border: ${theme.glass.border};
  backdrop-filter: ${theme.glass.blur};
  border-radius: ${theme.radii.xl};
  box-shadow: ${theme.shadows.glass};

  &:hover {
    border-color: ${theme.colors.gold}4D;
    transform: translateY(-2px);
  }
`

const KpiContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const KpiHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const KpiIconWrap = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${theme.radii.xl};
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
`

const KpiLabel = styled.span`
  font-size: 0.875rem;
  color: ${theme.colors.slate[400]};
`

const KpiValue = styled.div<{ $color: string }>`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ $color }) => $color};
`

const KpiSubtext = styled.div`
  font-size: 0.75rem;
  color: ${theme.colors.slate[500]};
`

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 32px;
  ${media.lg} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const ChartCard = styled(GlassPanel)`
  padding: 20px;
`

const ChartTitle = styled.h2`
  font-size: 1rem;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`

const BarChartRow = styled.div`
  height: 128px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
`

const BarGroup = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  position: relative;

  &:hover span {
    display: block;
  }
`

const Bar = styled.div`
  width: 100%;
  border-radius: 6px 6px 0 0;
  background: linear-gradient(180deg, ${theme.colors.goldBright}, ${theme.colors.gold});
  transition: ${theme.transitions.fast};

  ${BarGroup}:hover & {
    opacity: 0.85;
  }
`

const BarTooltip = styled.span`
  position: absolute;
  top: -28px;
  display: none;
  background: ${theme.colors.navyMid};
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radii.sm};
  padding: 4px 8px;
  font-size: 0.55rem;
  color: ${theme.colors.slate[300]};
  white-space: nowrap;
  z-index: ${theme.zIndex.tooltip};
`

const ChartFooter = styled.div`
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  font-size: 0.55rem;
  color: ${theme.colors.slate[600]};
`

const DonutLayout = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
`

const DonutArc = styled.circle`
  transition: ${theme.transitions.fast};
`

const DonutText = styled.text`
  fill: ${theme.colors.slate[200]};
  font-size: 1rem;
  font-weight: 700;
`

const Legend = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
`

const LegendRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const LegendDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex-shrink: 0;
`

const LegendLabel = styled.span`
  font-size: 0.75rem;
  color: ${theme.colors.slate[400]};
  flex: 1;
  min-width: 0;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`

const LegendValue = styled.span`
  font-size: 0.75rem;
  color: ${theme.colors.slate[300]};
  font-weight: 600;
`

const HorizontalList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const HorizontalRow = styled.div``

const HorizontalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: ${theme.colors.slate[400]};
  margin-bottom: 4px;

  strong {
    color: ${theme.colors.slate[300]};
    font-weight: 600;
  }
`

const BarTrack = styled.div`
  height: 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

const BarFill = styled.div`
  height: 100%;
  border-radius: inherit;
  transition: ${theme.transitions.fast};
`

const Section = styled.div`
  margin-bottom: 32px;
`

const RecentHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`

const RecentTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
  display: flex;
  align-items: center;
  gap: 8px;
`

const RecentLink = styled(Link)`
  font-size: 0.75rem;
  color: ${theme.colors.gold};
  display: flex;
  align-items: center;
  gap: 4px;

  &:hover {
    text-decoration: underline;
  }
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
  padding: 8px 12px;
  font-weight: 600;
  color: ${theme.colors.slate[400]};
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`

const BodyRow = styled.tr`
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: ${theme.transitions.fast};

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`

const BodyCell = styled.td`
  padding: 10px 12px;
  color: ${theme.colors.slate[300]};
`

const DateCell = styled(BodyCell)`
  font-size: 0.75rem;
  color: ${theme.colors.slate[500]};
`

const StatusPill = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: ${theme.radii.full};
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $color }) => `${$color}20`};
  color: ${({ $color }) => $color};
`

const EmptyChart = styled.p`
  text-align: center;
  color: ${theme.colors.slate[500]};
  padding: 16px 0;
`
