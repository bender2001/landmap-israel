import { useLocation } from 'react-router-dom'
import styled from 'styled-components'
import { Shield, BarChart3, MapPin, Zap, Phone, Mail, Check } from 'lucide-react'
import { t, fadeInUp, sm, md } from '../theme'
import { PublicLayout } from '../components/Layout'
import { AnimatedCard, GoldButton } from '../components/UI'

/* ── styled ── */
const Wrap = styled.div`max-width:960px;margin:0 auto;padding:64px 24px;direction:rtl;`
const Title = styled.h1`font-size:clamp(28px,4vw,42px);font-weight:800;color:${t.lText};text-align:center;margin-bottom:12px;font-family:${t.font};animation:${fadeInUp} 0.5s both;`
const Sub = styled.p`text-align:center;color:${t.lTextSec};font-size:16px;margin-bottom:48px;animation:${fadeInUp} 0.5s 0.1s both;`
const Grid4 = styled.div`display:grid;grid-template-columns:repeat(4,1fr);gap:20px;${md}{grid-template-columns:repeat(2,1fr);}@media(max-width:480px){grid-template-columns:1fr;}`
const Grid3 = styled.div`display:grid;grid-template-columns:repeat(3,1fr);gap:24px;${md}{grid-template-columns:1fr;}`
const Card = styled(AnimatedCard)`background:${t.lSurface};border:1px solid ${t.lBorder};border-radius:${t.r.lg};padding:28px 20px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px;transition:all ${t.tr};&:hover{transform:translateY(-4px);box-shadow:${t.sh.lg};border-color:${t.gold};}`
const Icon = styled.div`width:52px;height:52px;border-radius:${t.r.lg};background:${t.goldDim};border:1px solid ${t.goldBorder};display:flex;align-items:center;justify-content:center;color:${t.gold};`
const CardTitle = styled.h3`font-size:16px;font-weight:700;color:${t.lText};`
const CardDesc = styled.p`font-size:13px;color:${t.lTextSec};line-height:1.6;`
const Contact = styled(AnimatedCard)`max-width:480px;margin:0 auto;background:${t.lSurface};border:1px solid ${t.lBorder};border-radius:${t.r.xl};padding:40px 32px;text-align:center;display:flex;flex-direction:column;gap:20px;`
const Row = styled.div`display:flex;align-items:center;gap:12px;justify-content:center;font-size:15px;color:${t.lText};`
const Tier = styled(AnimatedCard)<{$featured?:boolean}>`background:${p=>p.$featured?'linear-gradient(135deg,'+t.gold+','+t.goldBright+')':t.lSurface};color:${p=>p.$featured?t.bg:t.lText};border:1px solid ${p=>p.$featured?'transparent':t.lBorder};border-radius:${t.r.xl};padding:32px 24px;display:flex;flex-direction:column;align-items:center;gap:16px;transition:all ${t.tr};&:hover{transform:translateY(-4px);box-shadow:${t.sh.lg};}`
const TierName = styled.h3`font-size:20px;font-weight:800;`
const TierPrice = styled.div`font-size:32px;font-weight:900;`
const TierList = styled.ul`list-style:none;padding:0;display:flex;flex-direction:column;gap:8px;width:100%;`
const TierItem = styled.li`display:flex;align-items:center;gap:8px;font-size:13px;`
const Values = styled.div`margin-top:48px;text-align:center;`
const ValTitle = styled.h2`font-size:22px;font-weight:700;color:${t.lText};margin-bottom:8px;`
const ValDesc = styled.p`font-size:14px;color:${t.lTextSec};max-width:600px;margin:0 auto;line-height:1.7;`

const FEATURES = [
  { icon: MapPin, title: 'מפה חכמה', desc: 'ניווט אינטואיטיבי על גבי מפה אינטראקטיבית' },
  { icon: Zap, title: 'ניתוח AI', desc: 'תחזיות תשואה מבוססות בינה מלאכותית' },
  { icon: BarChart3, title: 'נתוני שוק', desc: 'מידע עדכני על ועדות, שומות ומגמות' },
  { icon: Shield, title: 'אבטחה', desc: 'פרטי המוכר מוגנים, כל הפניות דרך הפלטפורמה' },
]
const TIERS = [
  { name: 'חינם', price: '₪0', featured: false, items: ['צפייה במפה', 'עד 5 מועדפים', 'ניתוח בסיסי'] },
  { name: 'משקיע', price: '₪149/חו׳', featured: true, items: ['מועדפים ללא הגבלה', 'השוואת חלקות', 'ניתוח AI מלא', 'התראות בזמן אמת'] },
  { name: 'מקצועי', price: '₪399/חו׳', featured: false, items: ['הכל ב-משקיע', 'ניהול לידים', 'אנליטיקס מתקדם', 'API גישה', 'תמיכה VIP'] },
]

function About() {
  return (
    <Wrap>
      <Title>אודות LandMap</Title>
      <Sub>הפלטפורמה המובילה להשקעות קרקע בישראל</Sub>
      <Grid4>
        {FEATURES.map((f, i) => (
          <Card key={i} $delay={i * 0.1}>
            <Icon><f.icon size={24} /></Icon>
            <CardTitle>{f.title}</CardTitle>
            <CardDesc>{f.desc}</CardDesc>
          </Card>
        ))}
      </Grid4>
      <Values>
        <ValTitle>הערכים שלנו</ValTitle>
        <ValDesc>שקיפות מלאה, נתונים אמינים והנגשת שוק הקרקעות לכל משקיע. אנו מחויבים להגן על פרטיות המוכרים ולספק ניתוח מקצועי שמאפשר קבלת החלטות מושכלת.</ValDesc>
      </Values>
    </Wrap>
  )
}

function ContactPage() {
  return (
    <Wrap>
      <Title>צור קשר</Title>
      <Sub>נשמח לעמוד לרשותכם</Sub>
      <Contact>
        <Row><Phone size={20} color={t.gold} /> 03-1234567</Row>
        <Row><Mail size={20} color={t.gold} /> info@landmap.co.il</Row>
        <GoldButton style={{ alignSelf: 'center', marginTop: 8 }}>שלח הודעה</GoldButton>
      </Contact>
    </Wrap>
  )
}

function Pricing() {
  return (
    <Wrap>
      <Title>מחירים</Title>
      <Sub>בחרו את התוכנית המתאימה לכם</Sub>
      <Grid3>
        {TIERS.map((tier, i) => (
          <Tier key={i} $delay={i * 0.12} $featured={tier.featured}>
            <TierName>{tier.name}</TierName>
            <TierPrice>{tier.price}</TierPrice>
            <TierList>
              {tier.items.map((it, j) => (
                <TierItem key={j}><Check size={16} color={tier.featured ? t.bg : t.ok} />{it}</TierItem>
              ))}
            </TierList>
            <GoldButton style={tier.featured ? { background: t.bg, color: t.goldBright } : undefined}>בחר תוכנית</GoldButton>
          </Tier>
        ))}
      </Grid3>
    </Wrap>
  )
}

export default function Public() {
  const { pathname } = useLocation()
  const page = pathname === '/contact' ? <ContactPage /> : pathname === '/pricing' ? <Pricing /> : <About />
  return <PublicLayout>{page}</PublicLayout>
}
