import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'
import {
  ArrowRight,
  User,
  Phone,
  Mail,
  MessageSquare,
  MapPin,
  Clock,
  Save,
} from 'lucide-react'
import { adminLeads } from '../../api/admin'
import { leadStatusLabels, leadStatusColors } from '../../utils/constants'
import { formatDate } from '../../utils/format'
import Spinner from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/ToastContainer'
import { theme, media } from '../../styles/theme'

const statusOptions = [
  { value: 'new', label: 'חדש' },
  { value: 'contacted', label: 'נוצר קשר' },
  { value: 'qualified', label: 'מתאים' },
  { value: 'converted', label: 'הומר' },
  { value: 'lost', label: 'אבוד' },
]

type PlotSummary = {
  id: number | string
  block_number: number
  number: number
  city: string
  status?: string | null
}

type Lead = {
  id: number | string
  full_name: string
  phone: string
  email?: string | null
  message?: string | null
  status: string
  created_at: string
  updated_at?: string | null
  plots?: PlotSummary | null
}

type UpdateStatusPayload = {
  status: string
  notes?: string
}

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [newStatus, setNewStatus] = useState('')
  const [notes, setNotes] = useState('')

  const { data: lead, isLoading, error } = useQuery<Lead>({
    queryKey: ['admin', 'lead', id],
    queryFn: () => adminLeads.get(id as string),
    enabled: Boolean(id),
  })

  const updateStatus = useMutation({
    mutationFn: ({ status, notes }: UpdateStatusPayload) =>
      adminLeads.updateStatus(id as string, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'lead', id] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'leads'] })
      toast('סטטוס עודכן בהצלחה', 'success')
      setNotes('')
      setNewStatus('')
    },
    onError: () => {
      toast('שגיאה בעדכון סטטוס', 'error')
    },
  })

  const handleUpdateStatus = () => {
    if (!newStatus || !id) return
    updateStatus.mutate({ status: newStatus, notes: notes.trim() || undefined })
  }

  if (isLoading) {
    return (
      <LoadingWrap>
        <SpinnerIcon />
      </LoadingWrap>
    )
  }

  if (error || !lead) {
    return (
      <Page dir="rtl">
        <EmptyState>
          <ErrorText>ליד לא נמצא</ErrorText>
          <InlineButton type="button" onClick={() => navigate('/admin/leads')}>
            חזרה לרשימת הלידים
          </InlineButton>
        </EmptyState>
      </Page>
    )
  }

  const statusColor = leadStatusColors[lead.status] || theme.colors.slate[500]
  const plot = lead.plots

  return (
    <Page dir="rtl">
      <BackButton type="button" onClick={() => navigate('/admin/leads')}>
        <ArrowRight size={16} />
        חזרה לרשימת לידים
      </BackButton>

      <Header>
        <HeaderLeft>
          <LeadAvatar>
            <User size={28} color={theme.colors.gold} />
          </LeadAvatar>
          <div>
            <LeadName>{lead.full_name}</LeadName>
            <LeadMeta>
              <StatusBadge $color={statusColor}>
                {leadStatusLabels[lead.status] || lead.status}
              </StatusBadge>
              <LeadDate>{formatDate(lead.created_at)}</LeadDate>
            </LeadMeta>
          </div>
        </HeaderLeft>
      </Header>

      <ContentGrid>
        <ContentColumn>
          <SectionCard>
            <SectionTitle>פרטי ליד</SectionTitle>
            <DetailsList>
              <DetailRow>
                <DetailIcon $tone="blue">
                  <Phone size={20} />
                </DetailIcon>
                <DetailContent>
                  <DetailLabel>טלפון</DetailLabel>
                  <DetailLink href={`tel:${lead.phone}`} dir="ltr">
                    {lead.phone}
                  </DetailLink>
                </DetailContent>
              </DetailRow>

              {lead.email && (
                <DetailRow>
                  <DetailIcon $tone="purple">
                    <Mail size={20} />
                  </DetailIcon>
                  <DetailContent>
                    <DetailLabel>אימייל</DetailLabel>
                    <DetailLink href={`mailto:${lead.email}`} dir="ltr">
                      {lead.email}
                    </DetailLink>
                  </DetailContent>
                </DetailRow>
              )}

              {lead.message && (
                <MessageRow>
                  <DetailIcon $tone="gold">
                    <MessageSquare size={20} />
                  </DetailIcon>
                  <DetailContent>
                    <DetailLabel>הודעה</DetailLabel>
                    <MessageBox>{lead.message}</MessageBox>
                  </DetailContent>
                </MessageRow>
              )}

              <TimeRow>
                <Clock size={16} color={theme.colors.slate[500]} />
                <TimeText>
                  נוצר: {formatDate(lead.created_at)}
                  {lead.updated_at && lead.updated_at !== lead.created_at && (
                    <span>עודכן: {formatDate(lead.updated_at)}</span>
                  )}
                </TimeText>
              </TimeRow>
            </DetailsList>
          </SectionCard>

          <SectionCard>
            <SectionTitle>עדכון סטטוס</SectionTitle>
            <StatusGrid>
              {statusOptions.map((opt) => {
                const color = leadStatusColors[opt.value] || theme.colors.slate[500]
                const isSelected = newStatus === opt.value
                const isCurrent = lead.status === opt.value
                return (
                  <StatusOption
                    key={opt.value}
                    type="button"
                    onClick={() => setNewStatus(isSelected ? '' : opt.value)}
                    disabled={isCurrent}
                    $selected={isSelected}
                    $current={isCurrent}
                    $color={color}
                  >
                    {opt.label}
                    {isCurrent && ' (נוכחי)'}
                  </StatusOption>
                )
              })}
            </StatusGrid>

            {newStatus && (
              <StatusActions>
                <NotesArea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="הוסף הערה (אופציונלי)..."
                  rows={3}
                />
                <PrimaryButton
                  type="button"
                  onClick={handleUpdateStatus}
                  disabled={updateStatus.isPending}
                >
                  <Save size={16} />
                  {updateStatus.isPending ? 'מעדכן...' : 'עדכן סטטוס'}
                </PrimaryButton>
              </StatusActions>
            )}
          </SectionCard>
        </ContentColumn>

        <SidebarColumn>
          {plot ? (
            <SectionCard>
              <SectionTitle>
                <MapPin size={16} color={theme.colors.gold} />
                חלקה משויכת
              </SectionTitle>
              <SidebarList>
                <SidebarItem>
                  <SidebarLabel>גוש / חלקה</SidebarLabel>
                  <SidebarValue>
                    {plot.block_number} / {plot.number}
                  </SidebarValue>
                </SidebarItem>
                <SidebarItem>
                  <SidebarLabel>עיר</SidebarLabel>
                  <SidebarValue>{plot.city}</SidebarValue>
                </SidebarItem>
                {plot.status && (
                  <SidebarItem>
                    <SidebarLabel>סטטוס</SidebarLabel>
                    <SidebarValue>{plot.status}</SidebarValue>
                  </SidebarItem>
                )}
                <SecondaryLink to={`/admin/plots/${plot.id}/edit`}>
                  <MapPin size={14} />
                  ערוך חלקה
                </SecondaryLink>
              </SidebarList>
            </SectionCard>
          ) : (
            <SectionCard>
              <EmptyIcon>
                <MapPin size={32} color={theme.colors.slate[600]} />
              </EmptyIcon>
              <EmptyText>אין חלקה משויכת</EmptyText>
            </SectionCard>
          )}
        </SidebarColumn>
      </ContentGrid>
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
  padding: 32px;
`

const SpinnerIcon = styled(Spinner)`
  width: 40px;
  height: 40px;
  color: ${theme.colors.gold};
`

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  color: ${theme.colors.slate[400]};
  margin-bottom: 24px;
  transition: ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.gold};
  }
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
  gap: 16px;
`

const LeadAvatar = styled.div`
  width: 56px;
  height: 56px;
  border-radius: ${theme.radii.xxl};
  background: ${theme.colors.gold}1A;
  border: 1px solid ${theme.colors.gold}33;
  display: flex;
  align-items: center;
  justify-content: center;
`

const LeadName = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
`

const LeadMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
`

const StatusBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: ${theme.radii.full};
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $color }) => `${$color}20`};
  color: ${({ $color }) => $color};
`

const LeadDate = styled.span`
  font-size: 0.75rem;
  color: ${theme.colors.slate[500]};
`

const GlassPanel = styled.div`
  background: ${theme.glass.bg};
  border: ${theme.glass.border};
  backdrop-filter: ${theme.glass.blur};
  border-radius: ${theme.radii.xl};
  box-shadow: ${theme.shadows.glass};
`

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 24px;
  ${media.lg} {
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  }
`

const ContentColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const SidebarColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const SectionCard = styled(GlassPanel)`
  padding: 24px;
`

const SectionTitle = styled.h2`
  font-size: 1rem;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`

const DetailsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const DetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const MessageRow = styled.div`
  display: flex;
  gap: 12px;
`

const DetailIcon = styled.div<{ $tone: 'blue' | 'purple' | 'gold' }>`
  width: 40px;
  height: 40px;
  border-radius: ${theme.radii.xl};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: ${({ $tone }) =>
    $tone === 'blue'
      ? theme.colors.blue
      : $tone === 'purple'
        ? theme.colors.purple
        : theme.colors.gold};
  background: ${({ $tone }) =>
    $tone === 'blue'
      ? `${theme.colors.blue}1A`
      : $tone === 'purple'
        ? `${theme.colors.purple}1A`
        : `${theme.colors.gold}1A`};
`

const DetailContent = styled.div`
  flex: 1;
`

const DetailLabel = styled.div`
  font-size: 0.75rem;
  color: ${theme.colors.slate[400]};
  margin-bottom: 2px;
`

const DetailLink = styled.a`
  font-size: 0.875rem;
  color: ${theme.colors.slate[200]};
  transition: ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.gold};
  }
`

const MessageBox = styled.p`
  font-size: 0.875rem;
  color: ${theme.colors.slate[300]};
  line-height: 1.6;
  background: rgba(22, 42, 74, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${theme.radii.xl};
  padding: 12px;
`

const TimeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`

const TimeText = styled.div`
  font-size: 0.75rem;
  color: ${theme.colors.slate[500]};
  display: flex;
  gap: 16px;
`

const StatusGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
`

const StatusOption = styled.button<{ $selected?: boolean; $current?: boolean; $color: string }>`
  padding: 6px 12px;
  border-radius: ${theme.radii.md};
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid ${({ $color, $selected }) => ($selected ? `${$color}60` : `${$color}25`)};
  background: ${({ $color, $selected }) => ($selected ? `${$color}30` : `${$color}15`)};
  color: ${({ $color }) => $color};
  transition: ${theme.transitions.fast};

  ${({ $selected }) =>
    $selected &&
    `
      box-shadow: 0 0 0 2px ${theme.colors.gold}80;
      transform: scale(1.05);
    `}

  ${({ $current }) =>
    $current &&
    `
      opacity: 0.4;
      cursor: not-allowed;
    `}

  &:hover:not(:disabled) {
    opacity: 0.85;
  }
`

const StatusActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const NotesArea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  background: rgba(22, 42, 74, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radii.xl};
  color: ${theme.colors.slate[200]};
  font-size: 0.875rem;
  resize: none;
  transition: ${theme.transitions.fast};

  &::placeholder {
    color: ${theme.colors.slate[500]};
  }

  &:focus {
    outline: none;
    border-color: ${theme.colors.gold}80;
  }
`

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: ${theme.gradients.gold};
  border-radius: ${theme.radii.xl};
  color: ${theme.colors.navy};
  font-weight: 700;
  font-size: 0.875rem;
  transition: ${theme.transitions.smooth};

  &:hover:not(:disabled) {
    box-shadow: 0 12px 30px rgba(200, 148, 42, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const SidebarList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const SidebarItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const SidebarLabel = styled.span`
  font-size: 0.75rem;
  color: ${theme.colors.slate[400]};
`

const SidebarValue = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${theme.colors.slate[200]};
`

const SecondaryLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px;
  margin-top: 8px;
  border-radius: ${theme.radii.xl};
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: ${theme.colors.slate[300]};
  font-size: 0.875rem;
  transition: ${theme.transitions.fast};

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`

const EmptyIcon = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
`

const EmptyText = styled.p`
  text-align: center;
  color: ${theme.colors.slate[500]};
  font-size: 0.875rem;
`

const EmptyState = styled(SectionCard)`
  text-align: center;
`

const ErrorText = styled.p`
  color: ${theme.colors.red};
  margin-bottom: 16px;
`

const InlineButton = styled.button`
  font-size: 0.875rem;
  color: ${theme.colors.gold};
  transition: ${theme.transitions.fast};

  &:hover {
    text-decoration: underline;
  }
`
