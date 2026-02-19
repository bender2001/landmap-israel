import { useState } from 'react'
import { Link } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { ArrowRight, Check, X, Crown, Star, ChevronDown, type LucideIcon } from 'lucide-react'
import PublicNav from '../../components/PublicNav'
import PublicFooter from '../../components/PublicFooter'
import DataDisclaimer from '../../components/DataDisclaimer'
import { useMetaTags } from '../../hooks/useSEO'
import { API_BASE } from '../../utils/config'
import { theme, media } from '../../styles/theme'

type TierFeature = {
  text: string
  included: boolean
}

type Tier = {
  id: string
  name: string
  nameEn: string
  price: number | null
  priceLabel: string
  period: string
  icon: string
  iconComponent: LucideIcon
  color: string
  popular: boolean
  cta: string
  features: TierFeature[]
}

type FaqItem = {
  q: string
  a: string
}

const TIERS: Tier[] = [
  {
    id: 'free',
    name: 'חינם',
    nameEn: 'Free',
    price: 0,
    priceLabel: '₪0',
    period: '',
    icon: '🆓',
    iconComponent: Crown,
    color: '#64748B',
    popular: false,
    cta: 'התחל בחינם',
    features: [
      { text: 'תצוגת מפה אינטראקטיבית', included: true },
      { text: 'מידע בסיסי על חלקות', included: true },
      { text: 'עד 3 חלקות בחודש', included: true },
      { text: 'מחשבון השקעות', included: true },
      { text: 'היסטוריית עסקאות מנדל"ן נט', included: false },
      { text: 'התראות דוא"ל', included: false },
      { text: 'ניתוח מתקדם', included: false },
      { text: 'גישת API', included: false },
      { text: 'התראות תכנון ותב"עות', included: false },
      { text: 'תמיכת עדיפות', included: false },
    ],
  },
  {
    id: 'basic',
    name: 'בסיסי',
    nameEn: 'Basic',
    price: 99,
    priceLabel: '₪99',
    period: '/חודש',
    icon: '⭐',
    iconComponent: Star,
    color: '#C8942A',
    popular: true,
    cta: 'שדרג עכשיו',
    features: [
      { text: 'תצוגת מפה אינטראקטיבית', included: true },
      { text: 'מידע בסיסי על חלקות', included: true },
      { text: 'גישה לכל החלקות — ללא הגבלה', included: true },
      { text: 'מחשבון השקעות', included: true },
      { text: 'היסטוריית עסקאות מנדל"ן נט', included: true },
      { text: 'התראות דוא"ל על שינויי מחיר', included: true },
      { text: 'ניתוח מתקדם', included: false },
      { text: 'גישת API', included: false },
      { text: 'התראות תכנון ותב"עות', included: false },
      { text: 'תמיכת עדיפות', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'מקצועי',
    nameEn: 'Pro',
    price: 299,
    priceLabel: '₪299',
    period: '/חודש',
    icon: '👑',
    iconComponent: Crown,
    color: '#A855F7',
    popular: false,
    cta: 'הצטרף כמקצוען',
    features: [
      { text: 'תצוגת מפה אינטראקטיבית', included: true },
      { text: 'מידע בסיסי על חלקות', included: true },
      { text: 'גישה לכל החלקות — ללא הגבלה', included: true },
      { text: 'מחשבון השקעות', included: true },
      { text: 'היסטוריית עסקאות מנדל"ן נט', included: true },
      { text: 'התראות דוא"ל על שינויי מחיר', included: true },
      { text: 'ניתוח השקעות מתקדם', included: true },
      { text: 'גישת API מלאה', included: true },
      { text: 'התראות תכנון ותב"עות', included: true },
      { text: 'תמיכת עדיפות', included: true },
    ],
  },
  {
    id: 'enterprise',
    name: 'ארגוני',
    nameEn: 'Enterprise',
    price: null,
    priceLabel: 'מותאם',
    period: 'אישית',
    icon: '🏢',
    iconComponent: Crown,
    color: '#3B82F6',
    popular: false,
    cta: 'צור קשר',
    features: [
      { text: 'כל תכונות מקצועי', included: true },
      { text: 'נתונים בכמות גדולה (Bulk)', included: true },
      { text: 'White-Label — מיתוג מותאם', included: true },
      { text: 'מנהל חשבון אישי', included: true },
      { text: 'אינטגרציית API מותאמת', included: true },
      { text: 'SLA מובטח', included: true },
      { text: 'הדרכה ועדכונים', included: true },
    ],
  },
]

const FAQ: FaqItem[] = [
  {
    q: 'האם אפשר להתחיל בחינם?',
    a: 'בהחלט! התוכנית החינמית כוללת תצוגת מפה, מידע בסיסי על חלקות ומחשבון השקעות. ניתן לשדרג בכל עת.',
  },
  {
    q: 'מהם מקורות הנתונים?',
    a: 'אנחנו משתמשים בנתונים ממקורות ממשלתיים רשמיים: נדל"ן נט (nadlan.gov.il) לעסקאות, מנהל התכנון (govmap.gov.il) לתב"עות, ורשם המקרקעין לנתוני טאבו.',
  },
  {
    q: 'האם אפשר לבטל בכל עת?',
    a: 'כן, ביטול מנוי בלחיצה. ללא תקופת התחייבות, ללא עלויות נסתרות. המנוי פעיל עד סוף תקופת החיוב.',
  },
  {
    q: 'מה כולל ה-API?',
    a: 'ממשק API מלא לגישה לנתוני חלקות, עסקאות ותכנון. תיעוד מלא, rate limiting סביר, ותמיכה טכנית.',
  },
  {
    q: 'מה ההבדל בין בסיסי למקצועי?',
    a: 'בסיסי מעניק גישה לכל החלקות ועסקאות. מקצועי מוסיף API, ניתוח מתקדם, התראות תכנון ותמיכת עדיפות.',
  },
]

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`

const Page = styled.div`
  min-height: 100vh;
  background: ${theme.colors.navy};
  direction: rtl;
`

const Hero = styled.section`
  padding: 112px 16px 48px;
  text-align: center;
`

const HeroBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border-radius: 999px;
  background: rgba(200, 148, 42, 0.1);
  border: 1px solid rgba(200, 148, 42, 0.2);
  margin-bottom: 24px;
`

const HeroTitle = styled.h1`
  font-size: clamp(32px, 4vw, 46px);
  font-weight: 900;
  margin-bottom: 16px;
`

const HeroTitleAccent = styled.span`
  display: block;
  background: linear-gradient(90deg, ${theme.colors.gold}, ${theme.colors.goldBright});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
`

const HeroSubtitle = styled.p`
  font-size: 18px;
  color: ${theme.colors.slate[400]};
  max-width: 32rem;
  margin: 0 auto;
`

const TierGrid = styled.div`
  max-width: 72rem;
  margin: 0 auto;
  padding: 0 16px 64px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  ${media.md} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  ${media.lg} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`

const TierCard = styled.div<{ $accent: string; $popular: boolean }>`
  position: relative;
  border-radius: ${theme.radii.lg};
  background: ${theme.glass.bg};
  border: ${theme.glass.border};
  box-shadow: ${theme.shadows.glass};
  overflow: hidden;
  transition: transform ${theme.transitions.normal}, box-shadow ${theme.transitions.normal};
  ${({ $popular, $accent }) => $popular && `box-shadow: 0 0 0 2px ${$accent}55, ${theme.shadows.glass};`}

  &:hover {
    transform: translateY(-3px);
  }
`

const TierBadge = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 6px 0;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  background: linear-gradient(90deg, ${theme.colors.gold}, ${theme.colors.goldBright});
  color: ${theme.colors.navy};
`

const TierBar = styled.div<{ $accent: string }>`
  height: 3px;
  background: ${({ $accent }) => `linear-gradient(90deg, ${$accent}33, ${$accent}, ${$accent}33)`};
`

const TierBody = styled.div<{ $hasBadge: boolean }>`
  padding: ${({ $hasBadge }) => ($hasBadge ? '40px 24px 24px' : '24px')};
`

const TierHeader = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
`

const TierIcon = styled.div<{ $accent: string }>`
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  background: ${({ $accent }) => `${$accent}1a`};
`

const TierName = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
`

const TierNameEn = styled.p`
  font-size: 12px;
  color: ${theme.colors.slate[500]};
`

const TierPrice = styled.div<{ $accent: string }>`
  font-size: 36px;
  font-weight: 900;
  color: ${({ $accent }) => $accent};
`

const TierPeriod = styled.span`
  font-size: 12px;
  color: ${theme.colors.slate[500]};
`

const TierNote = styled.p`
  font-size: 10px;
  color: ${theme.colors.slate[600]};
  margin-top: 6px;
`

const TierCta = styled.button<{ $accent: string }>`
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: none;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  background: ${({ $accent }) => `linear-gradient(90deg, ${$accent}, ${$accent})`};
  color: ${theme.colors.navy};
`

const TierCtaGhost = styled(Link)`
  display: block;
  text-align: center;
  padding: 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  background: linear-gradient(90deg, ${theme.colors.gold}, ${theme.colors.goldBright});
  color: ${theme.colors.navy};
`

const FeatureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
`

const FeatureRow = styled.div<{ $included: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: ${({ $included }) => ($included ? theme.colors.slate[300] : theme.colors.slate[600])};
`

const FeatureIcon = styled.div<{ $accent: string; $included: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $accent, $included }) => ($included ? `${$accent}1a` : 'rgba(255,255,255,0.04)')};

  svg {
    width: 12px;
    height: 12px;
    color: ${({ $accent, $included }) => ($included ? $accent : theme.colors.slate[600])};
  }
`

const RegisterSection = styled.section`
  max-width: 36rem;
  margin: 0 auto 64px;
  padding: 0 16px;
`

const RegisterCard = styled.div`
  background: ${theme.glass.bg};
  border: ${theme.glass.border};
  border-radius: ${theme.radii.lg};
  box-shadow: ${theme.shadows.glass};
  overflow: hidden;
`

const RegisterBody = styled.div`
  padding: 24px;
  text-align: center;

  ${media.sm} {
    padding: 32px;
  }
`

const RegisterTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
  margin-bottom: 8px;
`

const RegisterText = styled.p`
  font-size: 14px;
  color: ${theme.colors.slate[400]};
  margin-bottom: 24px;
`

const RegisterForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;

  ${media.sm} {
    flex-direction: row;
  }
`

const RegisterInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: ${theme.colors.slate[200]};
  font-size: 14px;
  outline: none;

  &::placeholder {
    color: ${theme.colors.slate[500]};
  }

  &:focus {
    border-color: rgba(200, 148, 42, 0.3);
    box-shadow: 0 0 0 1px rgba(200, 148, 42, 0.2);
  }
`

const RegisterButton = styled.button`
  padding: 12px 24px;
  border-radius: 12px;
  background: linear-gradient(90deg, ${theme.colors.gold}, ${theme.colors.goldBright});
  color: ${theme.colors.navy};
  font-weight: 700;
  border: none;
  cursor: pointer;
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

const RegisterFootnote = styled.p`
  font-size: 10px;
  color: ${theme.colors.slate[600]};
  margin-top: 12px;
`

const SuccessIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: rgba(16, 185, 129, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;

  svg {
    width: 32px;
    height: 32px;
    color: #34d399;
  }
`

const FAQSection = styled.section`
  max-width: 48rem;
  margin: 0 auto 64px;
  padding: 0 16px;
`

const FAQTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
  text-align: center;
  margin-bottom: 24px;
`

const FAQList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const FAQCard = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  overflow: hidden;
`

const FAQButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: none;
  border: none;
  text-align: right;
  cursor: pointer;
  color: ${theme.colors.slate[200]};
  font-size: 14px;
`

const FAQAnswer = styled.div`
  padding: 0 16px 16px;
  font-size: 14px;
  color: ${theme.colors.slate[400]};
  line-height: 1.7;
`

const DisclaimerWrap = styled.div`
  max-width: 48rem;
  margin: 0 auto 64px;
  padding: 0 16px;
`

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <FAQCard>
      <FAQButton onClick={() => setIsOpen((prev) => !prev)} type="button">
        <span>{question}</span>
        <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', color: theme.colors.slate[400] }} />
      </FAQButton>
      {isOpen && <FAQAnswer>{answer}</FAQAnswer>}
    </FAQCard>
  )
}

function PricingFaqJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

function PricingBreadcrumbJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'LandMap Israel', item: window.location.origin },
      { '@type': 'ListItem', position: 2, name: 'תוכניות מנוי' },
    ],
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export default function Pricing() {
  const [email, setEmail] = useState('')
  const [registering, setRegistering] = useState(false)
  const [registered, setRegistered] = useState(false)

  useMetaTags({
    title: 'מחירים — LandMap Israel | תוכניות מנוי',
    description: 'בחרו את התוכנית המתאימה לכם — חינם, בסיסי, מקצועי או ארגוני. גישה לנתוני עסקאות, תכנון וניתוח השקעות קרקע בישראל.',
    url: `${window.location.origin}/pricing`,
  })

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.includes('@')) return
    setRegistering(true)
    try {
      const res = await fetch(`${API_BASE}/api/subscription/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) setRegistered(true)
    } catch {
      return
    }
    setRegistering(false)
  }

  return (
    <Page>
      <PublicNav />
      <PricingFaqJsonLd />
      <PricingBreadcrumbJsonLd />

      <Hero>
        <HeroBadge>
          <Crown size={16} color={theme.colors.gold} />
          <span style={{ fontSize: 14, color: theme.colors.gold, fontWeight: 500 }}>תוכניות מנוי</span>
        </HeroBadge>
        <HeroTitle>
          <HeroTitleAccent>בחרו את התוכנית</HeroTitleAccent>
          <span style={{ color: theme.colors.slate[200] }}>המתאימה לכם</span>
        </HeroTitle>
        <HeroSubtitle>
          גישה לנתוני עסקאות אמיתיים מנדל"ן נט, תכניות בניין עיר,
          ניתוח השקעות מתקדם — הכל במקום אחד
        </HeroSubtitle>
      </Hero>

      <TierGrid>
        {TIERS.map((tier) => (
          <TierCard key={tier.id} $accent={tier.color} $popular={tier.popular}>
            {tier.popular && <TierBadge>⭐ הכי פופולרי</TierBadge>}
            <TierBar $accent={tier.color} />
            <TierBody $hasBadge={tier.popular}>
              <TierHeader>
                <TierIcon $accent={tier.color}>{tier.icon}</TierIcon>
                <div>
                  <TierName>{tier.name}</TierName>
                  <TierNameEn>{tier.nameEn}</TierNameEn>
                </div>
              </TierHeader>

              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <TierPrice $accent={tier.color}>{tier.priceLabel}</TierPrice>
                  {tier.period && <TierPeriod>{tier.period}</TierPeriod>}
                </div>
                {tier.price !== null && tier.price > 0 && <TierNote>לא כולל מע"מ · ביטול בכל עת</TierNote>}
              </div>

              {tier.id === 'enterprise' ? (
                <TierCtaGhost to="/contact">{tier.cta}</TierCtaGhost>
              ) : (
                <TierCta
                  $accent={tier.color}
                  type="button"
                  onClick={() => document.getElementById('register-section')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {tier.cta}
                </TierCta>
              )}

              <FeatureList>
                {tier.features.map((feature) => (
                  <FeatureRow key={feature.text} $included={feature.included}>
                    <FeatureIcon $accent={tier.color} $included={feature.included}>
                      {feature.included ? <Check /> : <X />}
                    </FeatureIcon>
                    <span>{feature.text}</span>
                  </FeatureRow>
                ))}
              </FeatureList>
            </TierBody>
          </TierCard>
        ))}
      </TierGrid>

      <RegisterSection id="register-section">
        <RegisterCard>
          <TierBar $accent={theme.colors.gold} />
          <RegisterBody>
            {registered ? (
              <>
                <SuccessIcon>
                  <Check />
                </SuccessIcon>
                <RegisterTitle>ברוך הבא! 🎉</RegisterTitle>
                <RegisterText>נרשמת בהצלחה לתוכנית החינמית. אפשר להתחיל לחקור חלקות!</RegisterText>
                <TierCtaGhost to="/">
                  למפת החלקות
                  <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
                </TierCtaGhost>
              </>
            ) : (
              <>
                <RegisterTitle>התחילו בחינם</RegisterTitle>
                <RegisterText>הירשמו עם כתובת דוא"ל וקבלו גישה מיידית למפת החלקות</RegisterText>
                <RegisterForm onSubmit={handleRegister}>
                  <RegisterInput
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="כתובת דוא״ל"
                    required
                    dir="ltr"
                  />
                  <RegisterButton type="submit" disabled={registering}>
                    {registering ? '...' : 'הרשמה'}
                  </RegisterButton>
                </RegisterForm>
                <RegisterFootnote>ללא כרטיס אשראי · ללא התחייבות · ביטול בכל עת</RegisterFootnote>
              </>
            )}
          </RegisterBody>
        </RegisterCard>
      </RegisterSection>

      <FAQSection>
        <FAQTitle>שאלות נפוצות</FAQTitle>
        <FAQList>
          {FAQ.map((item) => (
            <FAQItem key={item.q} question={item.q} answer={item.a} />
          ))}
        </FAQList>
      </FAQSection>

      <DisclaimerWrap>
        <DataDisclaimer variant="full" />
      </DisclaimerWrap>

      <PublicFooter />
    </Page>
  )
}
