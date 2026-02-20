import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminSettings } from '../../api/admin'
import { useAuth } from '../../hooks/useAuth'
import { Settings as SettingsIcon, Globe, Shield, Bell, Server, Save, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useToast } from '../../components/ui/ToastContainer'
import styled from 'styled-components'
import { media } from '../../styles/theme'
import { GlassPanelPadded, spin } from '../../styles/shared'

/* ── Interfaces ───────────────────────────────────────── */

interface ToggleProps {
  checked: boolean
  onChange: (value: boolean) => void
}

interface SettingsData {
  notify_new_lead?: boolean
  notify_weekly_summary?: boolean
  lead_auto_assign?: boolean
  platform_name?: string
  contact_email?: string
  maintenance_mode?: boolean
  [key: string]: any
}

/* ── Styled components ────────────────────────────────── */

const PageContainer = styled.div`
  padding: 16px;
  max-width: 768px;
  margin: 0 auto;
  direction: rtl;
  ${media.sm} {
    padding: 24px;
  }
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const IconBox = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radii.xl};
  background: rgba(200, 148, 42, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.gold};
`

const PageHeading = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
`

const SaveButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.gold}, ${({ theme }) => theme.colors.goldBright});
  border: none;
  border-radius: ${({ theme }) => theme.radii.xl};
  color: ${({ theme }) => theme.colors.navy};
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: box-shadow ${({ theme }) => theme.transitions.normal};

  &:hover {
    box-shadow: 0 4px 20px rgba(200, 148, 42, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const SectionsStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const SectionHeading = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`

const FieldsStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const InfoLabel = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.slate[400]};
`

const InfoValue = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.slate[200]};
`

const GoldValue = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.gold};
  font-weight: 500;
`

const MonoValue = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.slate[500]};
  font-family: ${({ theme }) => theme.fonts.mono};
`

const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const ToggleLabelText = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.slate[300]};
`

const ToggleTrack = styled.button<{ $checked: boolean }>`
  width: 40px;
  height: 24px;
  border-radius: ${({ theme }) => theme.radii.full};
  border: none;
  position: relative;
  cursor: pointer;
  transition: background-color ${({ theme }) => theme.transitions.normal};
  background-color: ${({ $checked }) =>
    $checked ? 'rgba(200, 148, 42, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
`

const ToggleThumb = styled.div<{ $checked: boolean }>`
  width: 16px;
  height: 16px;
  border-radius: ${({ theme }) => theme.radii.full};
  position: absolute;
  top: 4px;
  transition: all ${({ theme }) => theme.transitions.normal};
  ${({ $checked, theme }) =>
    $checked
      ? `right: 4px; left: auto; background-color: ${theme.colors.gold};`
      : `left: 4px; right: auto; background-color: ${theme.colors.slate[400]};`}
`

const InputLabel = styled.label`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.slate[400]};
  margin-bottom: 6px;
  display: block;
`

const TextInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  background: rgba(10, 22, 40, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${({ theme }) => theme.radii.xl};
  color: ${({ theme }) => theme.colors.slate[200]};
  font-size: 14px;
  transition: border-color ${({ theme }) => theme.transitions.normal};

  &:focus {
    border-color: rgba(200, 148, 42, 0.5);
    outline: none;
  }
`

const EnvBadge = styled.span`
  font-size: 12px;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: rgba(16, 185, 129, 0.1);
  color: ${({ theme }) => theme.colors.emerald[400]};
`

const GoldIcon = styled.span`
  color: ${({ theme }) => theme.colors.gold};
  display: flex;
  align-items: center;
`

const SpinnerIcon = styled(Loader2)`
  width: 16px;
  height: 16px;
  animation: ${spin} 1s linear infinite;
`

const SaveIcon = styled(Save)`
  width: 16px;
  height: 16px;
`

/* ── Toggle component ─────────────────────────────────── */

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <ToggleTrack
      type="button"
      onClick={() => onChange(!checked)}
      $checked={checked}
    >
      <ToggleThumb $checked={checked} />
    </ToggleTrack>
  )
}

/* ── Main component ───────────────────────────────────── */

export default function Settings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [localSettings, setLocalSettings] = useState<SettingsData | null>(null)
  const [dirty, setDirty] = useState<boolean>(false)

  const { data: settings, isLoading } = useQuery<SettingsData>({
    queryKey: ['admin', 'settings'],
    queryFn: adminSettings.get,
  })

  useEffect(() => {
    if (settings && !localSettings) {
      setLocalSettings(settings)
    }
  }, [settings, localSettings])

  const saveMutation = useMutation({
    mutationFn: (data: SettingsData) => adminSettings.update(data),
    onSuccess: (data: SettingsData) => {
      queryClient.setQueryData(['admin', 'settings'], data)
      setLocalSettings(data)
      setDirty(false)
      toast('הגדרות נשמרו', 'success')
    },
    onError: () => toast('שגיאה בשמירה', 'error'),
  })

  const handleToggle = (key: string, value: boolean) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const handleTextChange = (key: string, value: string) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const handleSave = () => {
    if (!localSettings) return
    saveMutation.mutate(localSettings)
  }

  const s: SettingsData = localSettings || settings || {}

  return (
    <PageContainer>
      <HeaderRow>
        <HeaderLeft>
          <IconBox>
            <SettingsIcon size={20} />
          </IconBox>
          <PageHeading>הגדרות</PageHeading>
        </HeaderLeft>
        {dirty && (
          <SaveButton
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <SpinnerIcon />
            ) : (
              <SaveIcon />
            )}
            שמור שינויים
          </SaveButton>
        )}
      </HeaderRow>

      <SectionsStack>
        {/* Account info */}
        <GlassPanelPadded>
          <SectionHeading>
            <GoldIcon><Shield size={16} /></GoldIcon>
            פרטי חשבון
          </SectionHeading>
          <FieldsStack>
            <InfoRow>
              <InfoLabel>אימייל</InfoLabel>
              <InfoValue dir="ltr">{user?.email || '—'}</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>תפקיד</InfoLabel>
              <GoldValue>מנהל מערכת</GoldValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>מזהה</InfoLabel>
              <MonoValue dir="ltr">{user?.id?.slice(0, 12)}...</MonoValue>
            </InfoRow>
          </FieldsStack>
        </GlassPanelPadded>

        {/* Notification preferences */}
        <GlassPanelPadded>
          <SectionHeading>
            <GoldIcon><Bell size={16} /></GoldIcon>
            התראות
          </SectionHeading>
          <FieldsStack>
            <ToggleLabel>
              <ToggleLabelText>התראת ליד חדש באימייל</ToggleLabelText>
              <Toggle
                checked={!!s.notify_new_lead}
                onChange={(v) => handleToggle('notify_new_lead', v)}
              />
            </ToggleLabel>
            <ToggleLabel>
              <ToggleLabelText>סיכום שבועי</ToggleLabelText>
              <Toggle
                checked={!!s.notify_weekly_summary}
                onChange={(v) => handleToggle('notify_weekly_summary', v)}
              />
            </ToggleLabel>
            <ToggleLabel>
              <ToggleLabelText>הקצאת לידים אוטומטית</ToggleLabelText>
              <Toggle
                checked={!!s.lead_auto_assign}
                onChange={(v) => handleToggle('lead_auto_assign', v)}
              />
            </ToggleLabel>
          </FieldsStack>
        </GlassPanelPadded>

        {/* Platform config */}
        <GlassPanelPadded>
          <SectionHeading>
            <GoldIcon><Globe size={16} /></GoldIcon>
            הגדרות פלטפורמה
          </SectionHeading>
          <FieldsStack>
            <div>
              <InputLabel>שם הפלטפורמה</InputLabel>
              <TextInput
                type="text"
                value={s.platform_name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTextChange('platform_name', e.target.value)}
              />
            </div>
            <div>
              <InputLabel>אימייל יצירת קשר</InputLabel>
              <TextInput
                type="email"
                dir="ltr"
                value={s.contact_email || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTextChange('contact_email', e.target.value)}
              />
            </div>
            <ToggleLabel>
              <ToggleLabelText>מצב תחזוקה</ToggleLabelText>
              <Toggle
                checked={!!s.maintenance_mode}
                onChange={(v) => handleToggle('maintenance_mode', v)}
              />
            </ToggleLabel>
          </FieldsStack>
        </GlassPanelPadded>

        {/* System info */}
        <GlassPanelPadded>
          <SectionHeading>
            <GoldIcon><Server size={16} /></GoldIcon>
            מידע מערכת
          </SectionHeading>
          <FieldsStack>
            <InfoRow>
              <InfoLabel>הגבלת בקשות</InfoLabel>
              <InfoValue>200 / 15 דקות</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>גרסה</InfoLabel>
              <InfoValue>1.0.0-beta</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>סביבה</InfoLabel>
              <EnvBadge>
                {import.meta.env.MODE}
              </EnvBadge>
            </InfoRow>
          </FieldsStack>
        </GlassPanelPadded>
      </SectionsStack>
    </PageContainer>
  )
}
