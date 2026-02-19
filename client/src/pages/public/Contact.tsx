import { useState, useRef } from 'react'
import styled, { keyframes } from 'styled-components'
import { User, Phone, Mail, MessageSquare, Lock, Send, CheckCircle2 } from 'lucide-react'
import { useCreateLead } from '../../hooks/useLeads'
import { useMarketOverview } from '../../hooks/useMarket'
import { useToast } from '../../components/ui/ToastContainer'
import PublicNav from '../../components/PublicNav'
import PublicFooter from '../../components/PublicFooter'
import BackToTopButton from '../../components/ui/BackToTopButton'
import { useMetaTags } from '../../hooks/useSEO'
import { whatsappLink } from '../../utils/config'
import { theme, media } from '../../styles/theme'

const phoneRegex = /^(?:\+?972[-\s]?|0)(?:[2-9])[-\s]?\d{3}[-\s]?\d{4}$/
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type ToastVariant = 'success' | 'warning' | 'error' | 'info'

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void
}

type LeadFormData = {
  name: string
  phone: string
  email: string
  message: string
}

type LeadFormErrors = Partial<Record<keyof LeadFormData | 'form', string>>

type MarketOverview = {
  total?: number
  cities?: Array<{ name?: string }>
  avgRoi?: number
}

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`

const Page = styled.div`
  min-height: 100vh;
  background: ${theme.colors.navy};
  direction: rtl;
`

const Content = styled.div`
  padding: 112px 16px 64px;
`

const Inner = styled.div`
  max-width: 72rem;
  margin: 0 auto;
`

const Header = styled.div`
  text-align: center;
  margin-bottom: 48px;
`

const Title = styled.h1`
  font-size: clamp(28px, 3vw, 36px);
  font-weight: 700;
  color: ${theme.colors.slate[100]};
  margin-bottom: 12px;
  animation: ${fadeInUp} 0.6s ease both;
`

const Subtitle = styled.p`
  color: ${theme.colors.slate[400]};
  max-width: 32rem;
  margin: 0 auto;
  animation: ${fadeInUp} 0.7s ease both;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
  max-width: 64rem;
  margin: 0 auto;

  ${media.lg} {
    grid-template-columns: 2fr 3fr;
  }
`

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const Card = styled.div`
  background: ${theme.glass.bg};
  border: ${theme.glass.border};
  border-radius: ${theme.radii.lg};
  box-shadow: ${theme.shadows.glass};
  backdrop-filter: ${theme.glass.blur};
  -webkit-backdrop-filter: ${theme.glass.blur};
  padding: 24px;
`

const CardTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
  margin-bottom: 16px;
`

const ContactLink = styled.a<{ $accent: string }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid ${({ $accent }) => $accent}30;
  background: ${({ $accent }) => `${$accent}14`};
  text-decoration: none;
  transition: transform ${theme.transitions.normal}, background ${theme.transitions.normal};

  &:hover {
    transform: translateY(-2px);
    background: ${({ $accent }) => `${$accent}1f`};
  }
`

const ContactIcon = styled.div<{ $accent: string }>`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: ${({ $accent }) => `${$accent}2a`};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const ContactLabel = styled.div<{ $accent: string }>`
  font-size: 14px;
  font-weight: 700;
  color: ${({ $accent }) => $accent};
`

const ContactHint = styled.div`
  font-size: 11px;
  color: ${theme.colors.slate[400]};
`

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const InfoIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(200, 148, 42, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 20px;
    height: 20px;
    color: ${theme.colors.gold};
  }
`

const InfoLabel = styled.div`
  font-size: 12px;
  color: ${theme.colors.slate[400]};
`

const InfoValue = styled.div`
  font-size: 14px;
  color: ${theme.colors.slate[200]};
`

const HoursRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: ${theme.colors.slate[400]};
`

const HoursValue = styled.span<{ $muted?: boolean }>`
  color: ${({ $muted }) => ($muted ? theme.colors.slate[500] : theme.colors.slate[300])};
`

const StatsTitle = styled.h3`
  font-size: 12px;
  font-weight: 700;
  color: ${theme.colors.slate[400]};
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 12px;
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  text-align: center;
`

const StatCard = styled.div`
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
`

const StatValue = styled.div<{ $color: string }>`
  font-size: 18px;
  font-weight: 800;
  color: ${({ $color }) => $color};
`

const StatLabel = styled.div`
  font-size: 10px;
  color: ${theme.colors.slate[500]};
`

const FormCard = styled(Card)`
  padding: 0;
  overflow: hidden;
`

const FormBar = styled.div`
  height: 3px;
  background: linear-gradient(90deg, #C8942A, #E5B94E, #F0D078, #E5B94E, #C8942A);
`

const SuccessState = styled.div`
  padding: 48px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  svg {
    width: 64px;
    height: 64px;
    color: #4ade80;
  }
`

const SuccessTitle = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: #4ade80;
`

const SuccessText = styled.p`
  font-size: 14px;
  color: ${theme.colors.slate[400]};
`

const Form = styled.form`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const ErrorBanner = styled.p`
  color: #f87171;
  font-size: 14px;
  text-align: center;
`

const Field = styled.div``

const Label = styled.label`
  display: block;
  font-size: 12px;
  color: ${theme.colors.slate[400]};
  margin-bottom: 6px;
`

const InputWrap = styled.div`
  position: relative;
`

const InputIcon = styled.div`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${theme.colors.slate[400]};
  pointer-events: none;

  svg {
    width: 16px;
    height: 16px;
  }
`

const Input = styled.input`
  width: 100%;
  padding: 12px 40px 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(22, 42, 74, 0.6);
  color: ${theme.colors.slate[200]};
  outline: none;
  transition: border-color ${theme.transitions.normal};

  &::placeholder {
    color: ${theme.colors.slate[500]};
  }

  &:focus {
    border-color: rgba(200, 148, 42, 0.5);
  }
`

const Textarea = styled.textarea`
  width: 100%;
  padding: 12px 40px 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(22, 42, 74, 0.6);
  color: ${theme.colors.slate[200]};
  outline: none;
  resize: none;
  transition: border-color ${theme.transitions.normal};

  &::placeholder {
    color: ${theme.colors.slate[500]};
  }

  &:focus {
    border-color: rgba(200, 148, 42, 0.5);
  }
`

const ErrorText = styled.p`
  font-size: 12px;
  color: #f87171;
  margin-top: 6px;
`

const SubmitButton = styled.button`
  width: 100%;
  padding: 14px 0;
  border-radius: 14px;
  background: linear-gradient(90deg, ${theme.colors.gold}, ${theme.colors.goldBright});
  color: ${theme.colors.navy};
  font-size: 16px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: box-shadow ${theme.transitions.normal};

  &:hover {
    box-shadow: 0 12px 24px rgba(200, 148, 42, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    box-shadow: none;
  }
`

const SecureNote = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  color: ${theme.colors.slate[400]};

  svg {
    width: 14px;
    height: 14px;
    color: #4ade80;
  }
`

const Honeypot = styled.div`
  position: absolute;
  left: -9999px;
  top: -9999px;
  opacity: 0;
  height: 0;
  width: 0;
  overflow: hidden;
`

const SpinnerIcon = styled.svg`
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`

function ContactJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: 'LandMap Israel',
    description: 'פלטפורמת השקעות בקרקעות בישראל — מפות, ניתוח תשואות ומידע תכנוני למשקיעים',
    url: window.location.origin,
    logo: `${window.location.origin}/logo.png`,
    email: 'info@landmap.co.il',
    telephone: '+972-50-000-0000',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'IL',
      addressRegion: 'ישראל',
    },
    areaServed: {
      '@type': 'Country',
      name: 'Israel',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        opens: '09:00',
        closes: '18:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Friday',
        opens: '09:00',
        closes: '13:00',
      },
    ],
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      telephone: '+972-50-000-0000',
      email: 'info@landmap.co.il',
      availableLanguage: ['Hebrew', 'English', 'Russian'],
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export default function Contact() {
  useMetaTags({
    title: 'צור קשר — LandMap Israel | השאירו פרטים ונחזור אליכם',
    description: 'מעוניינים בהשקעה בקרקע? צרו קשר עם צוות LandMap. נחזור אליכם בהקדם עם מידע מותאם אישית.',
    url: `${window.location.origin}/contact`,
  })

  const { data: overview } = useMarketOverview() as { data?: MarketOverview }
  const { toast } = useToast() as ToastContextValue
  const [formData, setFormData] = useState<LeadFormData>({ name: '', phone: '', email: '', message: '' })
  const [errors, setErrors] = useState<LeadFormErrors>({})
  const [isSuccess, setIsSuccess] = useState(false)
  const createLead = useCreateLead()
  const honeypotRef = useRef<HTMLInputElement | null>(null)

  const handleChange = (field: keyof LeadFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const validate = (): LeadFormErrors => {
    const next: LeadFormErrors = {}
    if (!formData.name || formData.name.trim().length < 2) next.name = 'נא להזין שם מלא'
    if (!formData.phone || !phoneRegex.test(formData.phone.trim())) next.phone = 'נא להזין טלפון ישראלי תקין (למשל 050-1234567 או +972-50-1234567)'
    if (!formData.email || !emailRegex.test(formData.email)) next.email = 'נא להזין אימייל תקין'
    return next
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      const normalizedPhone = formData.phone
        .trim()
        .replace(/[-\s]/g, '')
        .replace(/^\+?972/, '0')
      await createLead.mutateAsync({
        name: formData.name.trim(),
        phone: normalizedPhone,
        email: formData.email.trim(),
        message: formData.message.trim(),
        website: honeypotRef.current?.value || '',
      })
      setIsSuccess(true)
      toast('הפרטים נשלחו בהצלחה! ניצור קשר בהקדם 🎉', 'success')
      setTimeout(() => {
        setIsSuccess(false)
        setFormData({ name: '', phone: '', email: '', message: '' })
        if (honeypotRef.current) honeypotRef.current.value = ''
        createLead.reset()
      }, 3000)
    } catch {
      setErrors({ form: 'אירעה שגיאה בשליחה. נסו שוב.' })
      toast('שגיאה בשליחת הפרטים — נסו שוב', 'error')
    }
  }

  return (
    <Page>
      <PublicNav />
      <ContactJsonLd />

      <Content>
        <Inner>
          <Header>
            <Title>צרו איתנו קשר</Title>
            <Subtitle>מעוניינים לשמוע עוד? השאירו פרטים ונחזור אליכם בהקדם.</Subtitle>
          </Header>

          <Grid>
            <Stack>
              <Card>
                <CardTitle>דברו איתנו ישירות</CardTitle>
                <Stack>
                  <ContactLink
                    href={whatsappLink('שלום, אני מעוניין במידע נוסף על קרקעות להשקעה')}
                    target="_blank"
                    rel="noopener noreferrer"
                    $accent="#25D366"
                  >
                    <ContactIcon $accent="#25D366">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" style={{ color: '#25D366' }}>
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </ContactIcon>
                    <div>
                      <ContactLabel $accent="#25D366">WhatsApp</ContactLabel>
                      <ContactHint>תשובה תוך דקות</ContactHint>
                    </div>
                  </ContactLink>
                  <ContactLink
                    href="https://t.me/LandMapIsraelBot"
                    target="_blank"
                    rel="noopener noreferrer"
                    $accent="#229ED9"
                  >
                    <ContactIcon $accent="#229ED9">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" style={{ color: '#229ED9' }}>
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                      </svg>
                    </ContactIcon>
                    <div>
                      <ContactLabel $accent="#229ED9">Telegram</ContactLabel>
                      <ContactHint>בוט אוטומטי + ייעוץ אישי</ContactHint>
                    </div>
                  </ContactLink>
                </Stack>
              </Card>

              <Card>
                <CardTitle>פרטי התקשרות</CardTitle>
                <Stack>
                  <InfoRow>
                    <InfoIcon><Phone /></InfoIcon>
                    <div>
                      <InfoLabel>טלפון</InfoLabel>
                      <InfoValue dir="ltr">+972-50-000-0000</InfoValue>
                    </div>
                  </InfoRow>
                  <InfoRow>
                    <InfoIcon><Mail /></InfoIcon>
                    <div>
                      <InfoLabel>אימייל</InfoLabel>
                      <InfoValue dir="ltr">info@landmap.co.il</InfoValue>
                    </div>
                  </InfoRow>
                </Stack>
              </Card>

              <Card>
                <CardTitle>שעות פעילות</CardTitle>
                <Stack>
                  <HoursRow><span>ראשון - חמישי</span><HoursValue>09:00 - 18:00</HoursValue></HoursRow>
                  <HoursRow><span>שישי</span><HoursValue>09:00 - 13:00</HoursValue></HoursRow>
                  <HoursRow><span>שבת</span><HoursValue $muted>סגור</HoursValue></HoursRow>
                </Stack>
              </Card>

              {overview && (
                <Card>
                  <StatsTitle>הפלטפורמה במספרים</StatsTitle>
                  <StatsGrid>
                    <StatCard>
                      <StatValue $color={theme.colors.gold}>{overview.total || 0}+</StatValue>
                      <StatLabel>חלקות</StatLabel>
                    </StatCard>
                    <StatCard>
                      <StatValue $color="#34d399">{overview.cities?.length || 0}</StatValue>
                      <StatLabel>ערים</StatLabel>
                    </StatCard>
                    <StatCard>
                      <StatValue $color="#60a5fa">+{overview.avgRoi || 0}%</StatValue>
                      <StatLabel>ROI ממוצע</StatLabel>
                    </StatCard>
                  </StatsGrid>
                </Card>
              )}
            </Stack>

            <div>
              <FormCard>
                <FormBar />
                {isSuccess ? (
                  <SuccessState>
                    <CheckCircle2 />
                    <SuccessTitle>הפרטים נשלחו בהצלחה!</SuccessTitle>
                    <SuccessText>ניצור אתך קשר בהקדם</SuccessText>
                  </SuccessState>
                ) : (
                  <Form onSubmit={handleSubmit}>
                    {errors.form && <ErrorBanner>{errors.form}</ErrorBanner>}

                    <Honeypot aria-hidden="true">
                      <label htmlFor="contact-website">Website</label>
                      <input
                        ref={honeypotRef}
                        id="contact-website"
                        type="text"
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                      />
                    </Honeypot>

                    <Field>
                      <Label htmlFor="contact-name">שם מלא</Label>
                      <InputWrap>
                        <InputIcon><User /></InputIcon>
                        <Input
                          id="contact-name"
                          type="text"
                          autoComplete="name"
                          aria-required="true"
                          aria-invalid={Boolean(errors.name)}
                          aria-describedby={errors.name ? 'contact-name-error' : undefined}
                          placeholder="הכנס שם מלא"
                          value={formData.name}
                          onChange={(event) => handleChange('name', event.target.value)}
                        />
                      </InputWrap>
                      {errors.name && <ErrorText id="contact-name-error" role="alert">{errors.name}</ErrorText>}
                    </Field>

                    <Field>
                      <Label htmlFor="contact-phone">טלפון</Label>
                      <InputWrap>
                        <InputIcon><Phone /></InputIcon>
                        <Input
                          id="contact-phone"
                          type="tel"
                          dir="ltr"
                          autoComplete="tel"
                          aria-required="true"
                          aria-invalid={Boolean(errors.phone)}
                          aria-describedby={errors.phone ? 'contact-phone-error' : undefined}
                          placeholder="050-0000000"
                          value={formData.phone}
                          onChange={(event) => handleChange('phone', event.target.value)}
                        />
                      </InputWrap>
                      {errors.phone && <ErrorText id="contact-phone-error" role="alert">{errors.phone}</ErrorText>}
                    </Field>

                    <Field>
                      <Label htmlFor="contact-email">אימייל</Label>
                      <InputWrap>
                        <InputIcon><Mail /></InputIcon>
                        <Input
                          id="contact-email"
                          type="email"
                          dir="ltr"
                          autoComplete="email"
                          aria-required="true"
                          aria-invalid={Boolean(errors.email)}
                          aria-describedby={errors.email ? 'contact-email-error' : undefined}
                          placeholder="email@example.com"
                          value={formData.email}
                          onChange={(event) => handleChange('email', event.target.value)}
                        />
                      </InputWrap>
                      {errors.email && <ErrorText id="contact-email-error" role="alert">{errors.email}</ErrorText>}
                    </Field>

                    <Field>
                      <Label htmlFor="contact-message">הודעה (אופציונלי)</Label>
                      <InputWrap>
                        <InputIcon><MessageSquare /></InputIcon>
                        <Textarea
                          id="contact-message"
                          autoComplete="off"
                          placeholder="ספרו לנו על הצרכים שלכם..."
                          rows={4}
                          value={formData.message}
                          onChange={(event) => handleChange('message', event.target.value)}
                        />
                      </InputWrap>
                    </Field>

                    <SubmitButton type="submit" disabled={createLead.isPending}>
                      {createLead.isPending ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <SpinnerIcon viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
                          </SpinnerIcon>
                          שולח...
                        </span>
                      ) : (
                        <>
                          <Send size={16} />
                          שלח פרטים
                        </>
                      )}
                    </SubmitButton>

                    <SecureNote>
                      <Lock />
                      המידע שלך מאובטח
                    </SecureNote>
                  </Form>
                )}
              </FormCard>
            </div>
          </Grid>
        </Inner>
      </Content>

      <BackToTopButton />
      <PublicFooter />
    </Page>
  )
}
