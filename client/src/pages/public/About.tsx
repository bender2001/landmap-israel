import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import styled, { css, keyframes } from 'styled-components'
import {
  Map,
  Shield,
  Brain,
  Eye,
  Compass,
  TrendingUp,
  BarChart3,
  MapPin,
  Ruler,
  ChevronDown,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react'
import PublicNav from '../../components/PublicNav'
import PublicFooter from '../../components/PublicFooter'
import BackToTopButton from '../../components/ui/BackToTopButton'
import { useMetaTags } from '../../hooks/useSEO'
import { useMarketOverview } from '../../hooks/useMarket'
import { formatDunam } from '../../utils/format'
import { theme, media } from '../../styles/theme'

type Step = {
  icon: LucideIcon
  title: string
  desc: string
}

type TrustSignal = {
  icon: LucideIcon
  title: string
  desc: string
}

type FaqItem = {
  q: string
  a: string
}

type MarketOverview = {
  total?: number
  cities?: Array<{ name?: string }>
  avgRoi?: number
  totalArea?: number
}

type AboutJsonLdProps = {
  stats?: MarketOverview | null
}

type FAQItemProps = {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}

type AnimatedStatProps = {
  icon: LucideIcon
  value: string | number
  label: string
  suffix?: string
  color?: 'gold' | 'green' | 'blue' | 'purple'
}

const steps: Step[] = [
  {
    icon: Compass,
    title: 'גלו קרקעות',
    desc: 'חפשו בין מגוון קרקעות להשקעה ברחבי ישראל עם מידע מלא על סטטוס תכנוני, מיקום ופוטנציאל.',
  },
  {
    icon: Brain,
    title: 'נתחו בעזרת AI',
    desc: 'קבלו ניתוח השקעה חכם, תחזיות תשואה, השוואות מחירים ונתוני ועדות — הכל במקום אחד.',
  },
  {
    icon: TrendingUp,
    title: 'השקיעו בביטחון',
    desc: 'קבלו החלטה מושכלת עם כל הנתונים הפיננסיים, שמאויות ומידע תכנוני מעודכן.',
  },
]

const trustSignals: TrustSignal[] = [
  {
    icon: Shield,
    title: 'אבטחה מלאה',
    desc: 'כל הנתונים מוצפנים ומאובטחים בתקני האבטחה המחמירים ביותר.',
  },
  {
    icon: Eye,
    title: 'אנונימיות מוחלטת',
    desc: 'פרטי המוכרים אינם מוצגים — כל הפניות עוברות דרך הפלטפורמה בלבד.',
  },
  {
    icon: Brain,
    title: 'בינה מלאכותית',
    desc: 'יועץ השקעות AI מנתח עבורכם נתוני שוק, תחזיות ומגמות בזמן אמת.',
  },
]

const investorFaq: FaqItem[] = [
  {
    q: 'מה ההבדל בין קרקע חקלאית לקרקע עם תב"ע מאושרת?',
    a: 'קרקע חקלאית היא במצבה הגולמי — הייעוד רשום כחקלאי ואין אפשרות לבנות עליה. קרקע עם תב"ע (תוכנית בניין עיר) מאושרת כבר עברה שינוי ייעוד ויש היתר לבנייה. המחיר עולה דרמטית ככל שהקרקע מתקדמת בשלבי התכנון — זו בדיוק התשואה שמשקיעי קרקע מחפשים.',
  },
  {
    q: 'מהם הסיכונים העיקריים בהשקעה בקרקע?',
    a: 'הסיכון המרכזי הוא עיכוב או כישלון בשינוי הייעוד — תהליכים תכנוניים יכולים לקחת שנים. סיכונים נוספים: שינויים רגולטוריים, ירידת ערך כללית בשוק, עלויות נלוות (ארנונה, שמירה), וחוסר נזילות — קרקע קשה למכירה מהירה בהשוואה לדירה. LandMap מציג עבורכם ניתוח סיכונים לכל חלקה כדי לעזור בקבלת החלטה מושכלת.',
  },
  {
    q: 'כמה זמן לוקח עד שקרקע חקלאית הופכת לבנייה?',
    a: 'התהליך בישראל אורך בדרך כלל 5–15 שנה, תלוי באזור ובשלב התכנוני. קרקע שכבר בשלב הפקדת מתאר קרובה יותר (3–7 שנים). קרקע חקלאית ללא כל תכנית יכולה לקחת עשור ומעלה. ב-LandMap תוכלו לראות את שלב התכנון המדויק של כל חלקה וההערכה לזמן הבשלה.',
  },
  {
    q: 'האם השקעה בקרקע בישראל חוקית?',
    a: 'כמובן. רכישת קרקע בישראל היא עסקה חוקית לחלוטין. חשוב לבצע בדיקת נסח טאבו לוודא שהחלקה נקייה מעיקולים, לבדוק את מצב התכנון ברשות המקומית, ולהיעזר בעורך דין המתמחה במקרקעין. עסקת קרקע חייבת במס רכישה (6% למשקיע) ובדיווח לרשות המיסים.',
  },
  {
    q: 'מה מס הרכישה על קרקע בישראל?',
    a: 'מס רכישה על קרקע הוא בדרך כלל 6% מהמחיר עבור משקיעים (דירה ראשונה נהנית ממדרגות מופחתות, אך קרקע לא נחשבת דירת מגורים). בנוסף, יש לחשב שכר טרחת עו"ד (0.5%–1.5%), שמאי (₪3,000–5,000), ודמי רישום. מחשבון ההשקעות של LandMap כולל את כל העלויות הנלוות.',
  },
  {
    q: 'איך LandMap שונה ממדלן או יד2?',
    a: 'מדלן ויד2 מתמקדים בדירות ונכסים בנויים. LandMap מתמחה בקרקעות להשקעה — עם ניתוח תשואה, מעקב שלבי תכנון, ציון השקעה AI, השוואת חלקות, ומידע על מגמות שוק. אנחנו הכלי היחיד בישראל שמאפשר למשקיע לראות על מפה אינטראקטיבית את כל נתוני הקרקע, התשואה הצפויה, וסטטוס התכנון — הכל במקום אחד.',
  },
  {
    q: 'מאיפה הנתונים של LandMap?',
    a: 'הנתונים מגיעים ממקורות ציבוריים רשמיים: רשות מקרקעי ישראל (רמ"י), נדל"ן נט (רשות המיסים), ועדות תכנון מקומיות ומחוזיות, ומאגר GovMap. הנתונים מתעדכנים באופן שוטף ומועשרים עם ניתוח AI. שימו לב שהנתונים הם להמחשה וייעוץ ראשוני — יש לבצע בדיקת נאותות עצמאית לפני כל עסקה.',
  },
  {
    q: 'מה זה "ציון השקעה" וכיצד הוא מחושב?',
    a: 'ציון ההשקעה (1–10) הוא מדד מורכב שמשקלל: תשואה צפויה (ROI), שלב תכנוני (בשלות), מחיר ביחס לממוצע באזור, קרבה לפיתוח עירוני, ורמת סיכון. ציון 8+ מצביע על עסקה אטרקטיבית. הציון מחושב אוטומטית באמצעות אלגוריתם AI ומתעדכן בזמן אמת.',
  },
]

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

const Page = styled.div`
  min-height: 100vh;
  background: ${theme.colors.navy};
  direction: rtl;
`

const HeroSection = styled.section`
  padding: 112px 16px 64px;
`

const HeroInner = styled.div`
  max-width: 64rem;
  margin: 0 auto;
  text-align: center;
`

const HeroBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(200, 148, 42, 0.1);
  border: 1px solid rgba(200, 148, 42, 0.2);
  border-radius: 999px;
  margin-bottom: 24px;
  animation: ${fadeIn} 0.6s ease both;
`

const HeroBadgeText = styled.span`
  font-size: 14px;
  color: ${theme.colors.gold};
  font-weight: 500;
`

const HeroTitle = styled.h1`
  font-size: clamp(2.5rem, 4vw, 3.2rem);
  font-weight: 900;
  color: ${theme.colors.slate[100]};
  margin-bottom: 24px;
  line-height: 1.2;
  animation: ${fadeInUp} 0.7s ease both;
`

const HeroHighlight = styled.span`
  background: linear-gradient(90deg, ${theme.colors.gold}, ${theme.colors.goldBright});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
`

const HeroLead = styled.p`
  font-size: 18px;
  color: ${theme.colors.slate[400]};
  max-width: 32rem;
  margin: 0 auto 32px;
  line-height: 1.8;
  animation: ${fadeInUp} 0.8s ease both;
`

const PrimaryCta = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 16px 32px;
  border-radius: 20px;
  background: linear-gradient(90deg, ${theme.colors.gold}, ${theme.colors.goldBright});
  color: ${theme.colors.navy};
  font-weight: 700;
  font-size: 18px;
  text-decoration: none;
  transition: transform ${theme.transitions.normal}, box-shadow ${theme.transitions.normal};
  animation: ${fadeInUp} 0.9s ease both;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(200, 148, 42, 0.3);
  }
`

const Section = styled.section<{ $border?: boolean }>`
  padding: 64px 16px;
  ${({ $border }) => $border && css`border-top: 1px solid rgba(255, 255, 255, 0.05);`}
`

const SectionInner = styled.div`
  max-width: 64rem;
  margin: 0 auto;
`

const SectionTitle = styled.h2`
  font-size: 28px;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
  text-align: center;
  margin-bottom: 48px;
`

const StatsTitle = styled.h2`
  font-size: 12px;
  font-weight: 700;
  color: ${theme.colors.slate[400]};
  text-align: center;
  margin-bottom: 32px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  ${media.sm} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 24px;

  ${media.md} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`

const GlassCard = styled.div<{ $delay?: number }>`
  background: ${theme.glass.bg};
  backdrop-filter: ${theme.glass.blur};
  -webkit-backdrop-filter: ${theme.glass.blur};
  border: ${theme.glass.border};
  border-radius: ${theme.radii.lg};
  box-shadow: ${theme.shadows.glass};
  padding: 24px;
  text-align: center;
  transition: transform ${theme.transitions.normal}, border-color ${theme.transitions.normal};
  animation: ${fadeInUp} 0.6s ease both;
  animation-delay: ${({ $delay }) => ($delay ? `${$delay}ms` : '0ms')};

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(200, 148, 42, 0.3);
  }
`

const IconTile = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: rgba(200, 148, 42, 0.1);
  border: 1px solid rgba(200, 148, 42, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  transition: transform ${theme.transitions.normal};

  ${GlassCard}:hover & {
    transform: scale(1.06);
  }
`

const StepBadge = styled.div`
  font-size: 12px;
  color: ${theme.colors.gold};
  font-weight: 700;
  margin-bottom: 8px;
`

const CardTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
  margin-bottom: 8px;
`

const CardDesc = styled.p`
  font-size: 14px;
  color: ${theme.colors.slate[400]};
  line-height: 1.7;
`

const FAQSectionWrap = styled.section`
  padding: 64px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`

const FAQHeader = styled.div`
  text-align: center;
  margin-bottom: 40px;
`

const FAQBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(200, 148, 42, 0.1);
  border: 1px solid rgba(200, 148, 42, 0.2);
  border-radius: 999px;
  margin-bottom: 16px;
`

const FAQBadgeText = styled.span`
  font-size: 14px;
  color: ${theme.colors.gold};
  font-weight: 500;
`

const FAQTitle = styled.h2`
  font-size: 28px;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
  margin-bottom: 12px;
`

const FAQSubtitle = styled.p`
  font-size: 14px;
  color: ${theme.colors.slate[400]};
`

const FAQList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const FAQCard = styled.div<{ $open: boolean }>`
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  overflow: hidden;
  transition: border-color ${theme.transitions.normal}, background ${theme.transitions.normal};
  background: ${({ $open }) => ($open ? 'rgba(255, 255, 255, 0.03)' : 'transparent')};

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`

const FAQButton = styled.button`
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 20px;
  background: none;
  border: none;
  text-align: right;
  cursor: pointer;
`

const FAQChevron = styled(ChevronDown)<{ $open: boolean }>`
  width: 20px;
  height: 20px;
  color: ${theme.colors.gold};
  flex-shrink: 0;
  margin-top: 2px;
  transition: transform ${theme.transitions.smooth};
  transform: ${({ $open }) => ($open ? 'rotate(180deg)' : 'rotate(0deg)')};
`

const FAQQuestion = styled.span<{ $open: boolean }>`
  font-size: 14px;
  font-weight: 700;
  color: ${({ $open }) => ($open ? theme.colors.gold : theme.colors.slate[200])};
  line-height: 1.7;
  transition: color ${theme.transitions.normal};
`

const FAQAnswerWrap = styled.div<{ $open: boolean }>`
  display: grid;
  grid-template-rows: ${({ $open }) => ($open ? '1fr' : '0fr')};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transition: grid-template-rows ${theme.transitions.smooth}, opacity ${theme.transitions.smooth};
`

const FAQAnswerInner = styled.div`
  overflow: hidden;
`

const FAQAnswer = styled.div`
  padding: 0 20px 20px 52px;
  font-size: 14px;
  color: ${theme.colors.slate[400]};
  line-height: 1.8;
`

const FAQFooter = styled.div`
  text-align: center;
  margin-top: 32px;
`

const FAQFooterText = styled.p`
  font-size: 12px;
  color: ${theme.colors.slate[500]};
  margin-bottom: 12px;
`

const FAQFooterLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: ${theme.colors.slate[300]};
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: color ${theme.transitions.normal}, border-color ${theme.transitions.normal}, background ${theme.transitions.normal};

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(200, 148, 42, 0.2);
    color: ${theme.colors.gold};
  }
`

const CTASection = styled.section`
  padding: 64px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`

const CTAInner = styled.div`
  max-width: 32rem;
  margin: 0 auto;
  text-align: center;
`

const CTATitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
  margin-bottom: 16px;
`

const CTAText = styled.p`
  color: ${theme.colors.slate[400]};
  margin-bottom: 32px;
`

const CTAButtons = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;

  ${media.sm} {
    flex-direction: row;
  }
`

const CTAButtonPrimary = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 32px;
  border-radius: 12px;
  background: linear-gradient(90deg, ${theme.colors.gold}, ${theme.colors.goldBright});
  color: ${theme.colors.navy};
  font-weight: 700;
  text-decoration: none;
  transition: box-shadow ${theme.transitions.normal};

  &:hover {
    box-shadow: 0 12px 24px rgba(200, 148, 42, 0.3);
  }
`

const CTAButtonSecondary = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 32px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: ${theme.colors.slate[300]};
  font-weight: 500;
  text-decoration: none;
  transition: background ${theme.transitions.normal};

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`

function AboutJsonLd({ stats }: AboutJsonLdProps) {
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'LandMap Israel',
    url: window.location.origin,
    logo: `${window.location.origin}/icons/icon-512.png`,
    description: 'פלטפורמת השקעות בקרקעות בישראל — מפות אינטראקטיביות, ניתוח AI ונתוני תכנון בזמן אמת.',
    foundingDate: '2025',
    areaServed: { '@type': 'Country', name: 'Israel' },
    knowsAbout: ['Real Estate Investment', 'Land Investment Israel', 'קרקעות להשקעה'],
    ...(stats ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        bestRating: '5',
        ratingCount: String(stats.total || 10),
      },
    } : {}),
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: investorFaq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </>
  )
}

function FAQItem({ question, answer, isOpen, onToggle }: FAQItemProps) {
  return (
    <FAQCard $open={isOpen}>
      <FAQButton onClick={onToggle} aria-expanded={isOpen} type="button">
        <FAQChevron $open={isOpen} />
        <FAQQuestion $open={isOpen}>{question}</FAQQuestion>
      </FAQButton>
      <FAQAnswerWrap $open={isOpen}>
        <FAQAnswerInner>
          <FAQAnswer>{answer}</FAQAnswer>
        </FAQAnswerInner>
      </FAQAnswerWrap>
    </FAQCard>
  )
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const handleToggle = useCallback((index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index))
  }, [])

  return (
    <FAQSectionWrap>
      <SectionInner>
        <FAQHeader>
          <FAQBadge>
            <HelpCircle size={16} color={theme.colors.gold} />
            <FAQBadgeText>שאלות נפוצות</FAQBadgeText>
          </FAQBadge>
          <FAQTitle>מדריך למשקיע</FAQTitle>
          <FAQSubtitle>תשובות לשאלות הנפוצות ביותר על השקעה בקרקעות בישראל</FAQSubtitle>
        </FAQHeader>
        <FAQList>
          {investorFaq.map((item, i) => (
            <FAQItem
              key={item.q}
              question={item.q}
              answer={item.a}
              isOpen={openIndex === i}
              onToggle={() => handleToggle(i)}
            />
          ))}
        </FAQList>
        <FAQFooter>
          <FAQFooterText>לא מצאתם תשובה?</FAQFooterText>
          <FAQFooterLink to="/contact">
            <HelpCircle size={16} />
            שאלו אותנו
          </FAQFooterLink>
        </FAQFooter>
      </SectionInner>
    </FAQSectionWrap>
  )
}

function AnimatedStat({ icon: Icon, value, label, suffix = '', color = 'gold' }: AnimatedStatProps) {
  const colorTokens = {
    gold: {
      bg: 'linear-gradient(135deg, rgba(200, 148, 42, 0.2), rgba(200, 148, 42, 0.06))',
      border: 'rgba(200, 148, 42, 0.2)',
      text: theme.colors.gold,
    },
    green: {
      bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.06))',
      border: 'rgba(16, 185, 129, 0.2)',
      text: '#34d399',
    },
    blue: {
      bg: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.06))',
      border: 'rgba(59, 130, 246, 0.2)',
      text: '#60a5fa',
    },
    purple: {
      bg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.06))',
      border: 'rgba(139, 92, 246, 0.2)',
      text: '#a78bfa',
    },
  } as const

  const tokens = colorTokens[color]

  return (
    <StatCard $bg={tokens.bg} $border={tokens.border} $text={tokens.text}>
      <StatIcon>
        <Icon />
      </StatIcon>
      <StatValue>
        {value}{suffix}
      </StatValue>
      <StatLabel>{label}</StatLabel>
    </StatCard>
  )
}

const StatCard = styled.div<{ $bg: string; $border: string; $text: string }>`
  background: ${({ $bg }) => $bg};
  border: 1px solid ${({ $border }) => $border};
  border-radius: 20px;
  padding: 24px;
  text-align: center;
  color: ${({ $text }) => $text};
  transition: transform ${theme.transitions.normal};

  &:hover {
    transform: translateY(-3px);
  }
`

const StatIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;

  svg {
    width: 24px;
    height: 24px;
  }
`

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 900;
  color: ${theme.colors.slate[100]};
  margin-bottom: 4px;
`

const StatLabel = styled.div`
  font-size: 12px;
  color: ${theme.colors.slate[400]};
`

export default function About() {
  const { data: overview } = useMarketOverview() as { data?: MarketOverview }

  useMetaTags({
    title: 'אודות LandMap — הפלטפורמה הדיגיטלית להשקעות קרקע בישראל',
    description: 'LandMap מחברת בין משקיעים לקרקעות פוטנציאליות ברחבי ישראל. ניתוח AI, השוואות מחירים ונתוני תכנון — הכל במקום אחד.',
    url: `${window.location.origin}/about`,
  })

  return (
    <Page>
      <PublicNav />
      <AboutJsonLd stats={overview} />

      <HeroSection>
        <HeroInner>
          <HeroBadge>
            <span>🏗️</span>
            <HeroBadgeText>ברוכים הבאים ל-LandMap</HeroBadgeText>
          </HeroBadge>
          <HeroTitle>
            הפלטפורמה הדיגיטלית
            <br />
            <HeroHighlight>להשקעות קרקע בישראל</HeroHighlight>
          </HeroTitle>
          <HeroLead>
            LandMap מחברת בין משקיעים לקרקעות פוטנציאליות ברחבי ישראל.
            כל המידע, הניתוחים והנתונים — במקום אחד, בלי מתווכים מיותרים.
          </HeroLead>
          <PrimaryCta to="/">
            <Map size={20} />
            גלו קרקעות עכשיו
          </PrimaryCta>
        </HeroInner>
      </HeroSection>

      {overview && (
        <Section $border>
          <SectionInner>
            <StatsTitle>הנתונים מדברים</StatsTitle>
            <StatsGrid>
              <AnimatedStat
                icon={BarChart3}
                value={overview.total || 0}
                suffix="+"
                label="חלקות במערכת"
                color="gold"
              />
              <AnimatedStat
                icon={MapPin}
                value={overview.cities?.length || 0}
                label="ערים פעילות"
                color="blue"
              />
              <AnimatedStat
                icon={TrendingUp}
                value={overview.avgRoi ? `+${overview.avgRoi}` : '0'}
                suffix="%"
                label="תשואה ממוצעת"
                color="green"
              />
              <AnimatedStat
                icon={Ruler}
                value={overview.totalArea ? formatDunam(overview.totalArea) : '0'}
                label="דונם סה״כ"
                color="purple"
              />
            </StatsGrid>
          </SectionInner>
        </Section>
      )}

      <Section>
        <SectionInner>
          <SectionTitle>איך זה עובד?</SectionTitle>
          <CardGrid>
            {steps.map((step, i) => (
              <GlassCard key={step.title} $delay={i * 100}>
                <IconTile>
                  <step.icon size={28} color={theme.colors.gold} />
                </IconTile>
                <StepBadge>שלב {i + 1}</StepBadge>
                <CardTitle>{step.title}</CardTitle>
                <CardDesc>{step.desc}</CardDesc>
              </GlassCard>
            ))}
          </CardGrid>
        </SectionInner>
      </Section>

      <Section $border>
        <SectionInner>
          <SectionTitle>למה LandMap?</SectionTitle>
          <CardGrid>
            {trustSignals.map((signal) => (
              <GlassCard key={signal.title}>
                <IconTile>
                  <signal.icon size={24} color={theme.colors.gold} />
                </IconTile>
                <CardTitle>{signal.title}</CardTitle>
                <CardDesc>{signal.desc}</CardDesc>
              </GlassCard>
            ))}
          </CardGrid>
        </SectionInner>
      </Section>

      <FAQSection />

      <CTASection>
        <CTAInner>
          <CTATitle>מוכנים להתחיל?</CTATitle>
          <CTAText>גלו את ההזדמנויות הטובות ביותר בשוק הקרקעות הישראלי</CTAText>
          <CTAButtons>
            <CTAButtonPrimary to="/">
              <Map size={20} />
              למפה
            </CTAButtonPrimary>
            <CTAButtonSecondary to="/contact">צרו קשר</CTAButtonSecondary>
          </CTAButtons>
        </CTAInner>
      </CTASection>

      <BackToTopButton />
      <PublicFooter />
    </Page>
  )
}
