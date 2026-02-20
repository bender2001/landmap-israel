import { Link, useLocation } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { ArrowRight, MapPin, Phone, Mail, Shield, FileText, Zap, Users, Award, ChevronLeft } from 'lucide-react'
import { t, media } from '../theme'
import { GoldButton, GhostButton } from '../components/UI'

const fadeIn = keyframes`from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); }`
const Page = styled.div`min-height: 100vh; background: ${t.colors.bg}; padding: 24px;`
const Container = styled.div`max-width: 720px; margin: 0 auto;`
const BackLink = styled(Link)`display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: ${t.colors.textDim}; text-decoration: none; margin-bottom: 20px; &:hover { color: ${t.colors.gold}; }`
const Title = styled.h1`font-size: 28px; font-weight: 800; color: ${t.colors.text}; margin-bottom: 8px; animation: ${fadeIn} 0.4s ease;`
const Sub = styled.p`font-size: 14px; color: ${t.colors.textSec}; margin-bottom: 32px; line-height: 1.7;`
const Section = styled.div`margin-bottom: 32px; animation: ${fadeIn} 0.4s ease both;`
const H2 = styled.h2`font-size: 18px; font-weight: 700; color: ${t.colors.text}; margin-bottom: 12px;`
const P = styled.p`font-size: 14px; color: ${t.colors.textSec}; line-height: 1.8; margin-bottom: 12px;`
const FeatureGrid = styled.div`display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 24px;`
const FeatureCard = styled.div`
  padding: 20px; border-radius: ${t.radius.lg};
  background: ${t.colors.surface}; border: 1px solid ${t.colors.border};
  transition: all ${t.transition};
  &:hover { border-color: ${t.colors.goldBorder}; }
`
const FIcon = styled.div`
  width: 40px; height: 40px; border-radius: ${t.radius.md};
  background: ${t.colors.goldDim}; border: 1px solid ${t.colors.goldBorder};
  display: flex; align-items: center; justify-content: center; margin-bottom: 12px;
`
const FTitle = styled.h3`font-size: 14px; font-weight: 700; color: ${t.colors.text}; margin-bottom: 4px;`
const FDesc = styled.p`font-size: 12px; color: ${t.colors.textSec}; line-height: 1.6;`

const ContactCard = styled.div`
  padding: 24px; border-radius: ${t.radius.lg};
  background: ${t.colors.surface}; border: 1px solid ${t.colors.border};
  text-align: center;
`

const Legal = styled.div`font-size: 13px; color: ${t.colors.textSec}; line-height: 2;`

// ── About ──
function About() {
  return (
    <>
      <Title>LandMap Israel</Title>
      <Sub>פלטפורמת השקעות הקרקעות המובילה בישראל. מפה אינטראקטיבית, נתוני תכנון בזמן אמת, ויועץ AI חכם.</Sub>
      <FeatureGrid>
        {[
          { icon: <MapPin size={18} />, title: 'מפה אינטראקטיבית', desc: 'צפו בחלקות על המפה עם נתונים חיים' },
          { icon: <Zap size={18} />, title: 'AI יועץ השקעות', desc: 'ניתוח אוטומטי של כל חלקה' },
          { icon: <Shield size={18} />, title: 'נתונים מאומתים', desc: 'מידע תכנוני ושמאי עדכני' },
          { icon: <Users size={18} />, title: 'ליווי מקצועי', desc: 'צוות מומחים ללוות את ההשקעה' },
        ].map(f => (
          <FeatureCard key={f.title}>
            <FIcon>{f.icon}</FIcon>
            <FTitle>{f.title}</FTitle>
            <FDesc>{f.desc}</FDesc>
          </FeatureCard>
        ))}
      </FeatureGrid>
    </>
  )
}

// ── Contact ──
function Contact() {
  return (
    <>
      <Title>צור קשר</Title>
      <Sub>נשמח לעזור! צרו איתנו קשר בכל שאלה.</Sub>
      <ContactCard>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <Phone size={16} color={t.colors.gold} /> 03-1234567
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <Mail size={16} color={t.colors.gold} /> info@landmap.co.il
          </div>
          <GoldButton as="a" href="mailto:info@landmap.co.il" style={{ marginTop: 8, textDecoration: 'none' }}>
            שלח הודעה
          </GoldButton>
        </div>
      </ContactCard>
    </>
  )
}

// ── Terms/Privacy ──
function Terms() {
  return (
    <>
      <Title>תנאי שימוש</Title>
      <Legal>
        <H2>כללי</H2>
        <P>האתר מספק מידע על השקעות קרקעות בישראל למטרות מידע בלבד. אין לראות במידע המוצג באתר כהמלצה או ייעוץ להשקעה.</P>
        <H2>הגבלת אחריות</H2>
        <P>LandMap Israel אינה אחראית לנזקים שנגרמו כתוצאה משימוש במידע המוצג באתר. כל השקעה היא על אחריות המשקיע בלבד.</P>
        <H2>קניין רוחני</H2>
        <P>כל התכנים, העיצובים, והנתונים באתר שייכים ל-LandMap Israel ומוגנים בחוק.</P>
      </Legal>
    </>
  )
}

function Privacy() {
  return (
    <>
      <Title>מדיניות פרטיות</Title>
      <Legal>
        <H2>מידע שנאסף</H2>
        <P>אנו אוספים מידע שנמסר מרצון (שם, טלפון, אימייל) ומידע טכני (כתובת IP, סוג דפדפן).</P>
        <H2>שימוש במידע</H2>
        <P>המידע משמש ליצירת קשר, שיפור השירות, ושליחת עדכונים. לא נעביר פרטים אישיים לצד שלישי ללא הסכמה.</P>
        <H2>אבטחת מידע</H2>
        <P>אנו נוקטים באמצעי אבטחה סבירים להגנה על המידע שנאסף.</P>
      </Legal>
    </>
  )
}

function Pricing() {
  return (
    <>
      <Title>תוכניות מחיר</Title>
      <Sub>בחרו את התוכנית המתאימה לכם</Sub>
      <FeatureGrid>
        {[
          { name: 'חינם', price: '₪0', features: ['צפייה במפה', '3 חלקות לצפייה', 'מחשבון בסיסי'] },
          { name: 'משקיע', price: '₪149/חודש', features: ['גישה מלאה', 'יועץ AI', 'התראות', 'ניתוחים מתקדמים'] },
          { name: 'מקצועי', price: '₪399/חודש', features: ['הכל מ"משקיע"', 'API גישה', 'דוחות מותאמים', 'תמיכה VIP'] },
        ].map(plan => (
          <FeatureCard key={plan.name} style={{ textAlign: 'center' }}>
            <FTitle style={{ fontSize: 16 }}>{plan.name}</FTitle>
            <div style={{ fontSize: 28, fontWeight: 800, color: t.colors.goldBright, margin: '12px 0' }}>{plan.price}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {plan.features.map(f => <div key={f} style={{ fontSize: 13, color: t.colors.textSec }}>✓ {f}</div>)}
            </div>
          </FeatureCard>
        ))}
      </FeatureGrid>
    </>
  )
}

// ── Router ──
const pages: Record<string, () => React.JSX.Element> = { '/about': About, '/contact': Contact, '/terms': Terms, '/privacy': Privacy, '/pricing': Pricing }

export default function StaticPage() {
  const { pathname } = useLocation()
  const PageContent = pages[pathname] || About
  return (
    <Page>
      <Container>
        <BackLink to="/"><ArrowRight size={15} /> חזרה למפה</BackLink>
        <PageContent />
      </Container>
    </Page>
  )
}
