import { useState, useRef } from 'react'
import { useLocation, Link } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { Shield, BarChart3, MapPin, Zap, Phone, Mail, Check, Send, MessageCircle, AlertCircle, CheckCircle, FileText, Lock, ExternalLink, Users, Globe, Eye, Trash2, Database } from 'lucide-react'
import { t, fadeInUp, sm, md } from '../theme'
import { PublicLayout } from '../components/Layout'
import { AnimatedCard, GoldButton } from '../components/UI'
import { useDocumentTitle, useMetaDescription } from '../hooks'
import { SITE_CONFIG } from '../utils'
import * as api from '../api'

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
const Tier = styled(AnimatedCard)<{$featured?:boolean}>`background:${p=>p.$featured?'linear-gradient(135deg,'+t.gold+','+t.goldBright+')':t.lSurface};color:${p=>p.$featured?t.bg:t.lText};border:1px solid ${p=>p.$featured?'transparent':t.lBorder};border-radius:${t.r.xl};padding:32px 24px;display:flex;flex-direction:column;align-items:center;gap:16px;transition:all ${t.tr};&:hover{transform:translateY(-4px);box-shadow:${t.sh.lg};}`
const TierName = styled.h3`font-size:20px;font-weight:800;`
const TierPrice = styled.div`font-size:32px;font-weight:900;`
const TierList = styled.ul`list-style:none;padding:0;display:flex;flex-direction:column;gap:8px;width:100%;`
const TierItem = styled.li`display:flex;align-items:center;gap:8px;font-size:13px;`
const Values = styled.div`margin-top:48px;text-align:center;`
const ValTitle = styled.h2`font-size:22px;font-weight:700;color:${t.lText};margin-bottom:8px;`
const ValDesc = styled.p`font-size:14px;color:${t.lTextSec};max-width:600px;margin:0 auto;line-height:1.7;`

/* ── Contact Form Styled ── */
const ContactGrid = styled.div`
  display:grid;grid-template-columns:1fr 1fr;gap:40px;max-width:800px;margin:0 auto;
  ${md}{grid-template-columns:1fr;gap:32px;}
`
const ContactForm = styled.form`
  display:flex;flex-direction:column;gap:16px;
  background:${t.lSurface};border:1px solid ${t.lBorder};border-radius:${t.r.xl};
  padding:32px 28px;box-shadow:${t.sh.md};transition:all ${t.tr};
  &:focus-within{border-color:${t.goldBorder};box-shadow:${t.sh.lg};}
`
const FormGroup = styled.div`display:flex;flex-direction:column;gap:6px;`
const FormLabel = styled.label`font-size:13px;font-weight:600;color:${t.lText};`
const FormInput = styled.input<{$error?:boolean}>`
  padding:12px 14px;border:1px solid ${p=>p.$error ? '#EF4444' : t.lBorder};border-radius:${t.r.md};
  font-size:14px;font-family:${t.font};color:${t.lText};background:${t.lBg};
  transition:all ${t.tr};outline:none;direction:rtl;
  &:focus{border-color:${p=>p.$error ? '#EF4444' : t.gold};box-shadow:0 0 0 3px ${p=>p.$error ? 'rgba(239,68,68,0.1)' : t.goldDim};}
  &::placeholder{color:#94A3B8;}
`
const FormTextarea = styled.textarea<{$error?:boolean}>`
  padding:12px 14px;border:1px solid ${p=>p.$error ? '#EF4444' : t.lBorder};border-radius:${t.r.md};
  font-size:14px;font-family:${t.font};color:${t.lText};background:${t.lBg};
  transition:all ${t.tr};outline:none;direction:rtl;resize:vertical;min-height:100px;
  &:focus{border-color:${p=>p.$error ? '#EF4444' : t.gold};box-shadow:0 0 0 3px ${p=>p.$error ? 'rgba(239,68,68,0.1)' : t.goldDim};}
  &::placeholder{color:#94A3B8;}
`
const FormError = styled.span`font-size:11px;color:#EF4444;font-weight:500;display:flex;align-items:center;gap:4px;`
const FormHoneypot = styled.div`position:absolute;left:-9999px;top:-9999px;opacity:0;height:0;width:0;overflow:hidden;`
const submitPulse = keyframes`0%{box-shadow:0 0 0 0 rgba(212,168,75,0.4)}70%{box-shadow:0 0 0 10px rgba(212,168,75,0)}100%{box-shadow:0 0 0 0 rgba(212,168,75,0)}`
const SubmitBtn = styled.button<{$loading?:boolean}>`
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  padding:14px 28px;border-radius:${t.r.full};border:none;
  background:linear-gradient(135deg,${t.gold},${t.goldBright});color:${t.black};
  font-size:15px;font-weight:700;font-family:${t.font};cursor:pointer;
  transition:all ${t.tr};align-self:flex-start;
  opacity:${p=>p.$loading ? 0.7 : 1};pointer-events:${p=>p.$loading ? 'none' : 'auto'};
  &:hover{transform:translateY(-2px);box-shadow:${t.sh.glow};animation:${submitPulse} 1.5s infinite;}
  &:active{transform:translateY(0);}
`
const successFade = keyframes`from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}`
const SuccessMsg = styled.div`
  display:flex;flex-direction:column;align-items:center;gap:16px;
  padding:40px 28px;text-align:center;animation:${successFade} 0.5s ease-out;
  background:${t.lSurface};border:1px solid #10B981;border-radius:${t.r.xl};
  box-shadow:0 4px 16px rgba(16,185,129,0.1);
`
const SuccessIcon = styled.div`
  width:64px;height:64px;border-radius:50%;background:rgba(16,185,129,0.1);
  border:2px solid #10B981;display:flex;align-items:center;justify-content:center;
`
const ContactInfo = styled.div`
  display:flex;flex-direction:column;gap:20px;
`
const ContactCard = styled.a`
  display:flex;align-items:center;gap:14px;padding:20px;
  background:${t.lSurface};border:1px solid ${t.lBorder};border-radius:${t.r.lg};
  text-decoration:none!important;color:${t.lText};transition:all ${t.tr};
  &:hover{transform:translateY(-2px);box-shadow:${t.sh.lg};border-color:${t.gold};}
`
const ContactCardIcon = styled.div<{$bg:string}>`
  width:44px;height:44px;border-radius:${t.r.md};display:flex;align-items:center;justify-content:center;
  background:${p=>p.$bg};flex-shrink:0;
`
const ContactCardLabel = styled.div`font-size:12px;color:${t.lTextSec};font-weight:500;`
const ContactCardValue = styled.div`font-size:15px;font-weight:700;color:${t.lText};`

/* ── Legal Pages Styled ── */
const LegalWrap = styled.div`max-width:720px;margin:0 auto;padding:64px 24px;direction:rtl;`
const LegalTitle = styled.h1`
  font-size:clamp(28px,4vw,38px);font-weight:800;color:${t.lText};margin-bottom:8px;
  font-family:${t.font};animation:${fadeInUp} 0.5s both;
`
const LegalUpdated = styled.p`font-size:13px;color:${t.lTextSec};margin-bottom:40px;animation:${fadeInUp} 0.5s 0.1s both;`
const LegalSection = styled.section`margin-bottom:32px;animation:${fadeInUp} 0.5s 0.15s both;`
const LegalH2 = styled.h2`
  font-size:18px;font-weight:700;color:${t.lText};margin-bottom:12px;
  display:flex;align-items:center;gap:8px;font-family:${t.font};
`
const LegalP = styled.p`font-size:14px;color:${t.lTextSec};line-height:1.8;margin-bottom:12px;`
const LegalUl = styled.ul`
  padding-right:20px;margin-bottom:16px;
  li{font-size:14px;color:${t.lTextSec};line-height:1.8;margin-bottom:6px;}
`
const LegalFooter = styled.div`
  margin-top:48px;padding:24px;background:${t.lSurface};border:1px solid ${t.lBorder};
  border-radius:${t.r.lg};text-align:center;
`

const FEATURES = [
  { icon: MapPin, title: 'מפה חכמה', desc: 'ניווט אינטואיטיבי על גבי מפה אינטראקטיבית עם שכבות לוויין, מפת חום וצביעה לפי ציון' },
  { icon: Zap, title: 'ניתוח AI', desc: 'ציון השקעה 1-10, תחזית תשואה, הערכת סיכון וניתוח תרחישי יציאה מבוסס בינה מלאכותית' },
  { icon: BarChart3, title: 'נתוני שוק', desc: 'מידע עדכני על ועדות תכנון, שומות, מגמות מחירים ואזורי פיתוח' },
  { icon: Shield, title: 'אבטחה ושקיפות', desc: 'שיטת הציון שלנו שקופה לחלוטין — כל גורם מוסבר, כל נתון ניתן לבדיקה' },
]

/* ── About Page: Methodology Section ── */
const MethodWrap = styled.div`margin-top:64px;`
const MethodTitle = styled.h2`font-size:clamp(20px,3vw,28px);font-weight:800;color:${t.lText};text-align:center;margin-bottom:8px;font-family:${t.font};`
const MethodSub = styled.p`text-align:center;color:${t.lTextSec};font-size:14px;margin-bottom:36px;max-width:600px;margin-left:auto;margin-right:auto;line-height:1.7;`
const MethodGrid = styled.div`display:grid;grid-template-columns:repeat(3,1fr);gap:20px;${md}{grid-template-columns:1fr;}margin-bottom:48px;`
const MethodCard = styled(AnimatedCard)`
  background:${t.lSurface};border:1px solid ${t.lBorder};border-radius:${t.r.lg};padding:24px 20px;
  position:relative;overflow:hidden;transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};transform:translateY(-3px);box-shadow:${t.sh.lg};}
  &::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;
    background:linear-gradient(90deg,transparent,${t.gold},transparent);}
`
const MethodCardNum = styled.span`
  display:inline-flex;align-items:center;justify-content:center;
  width:28px;height:28px;border-radius:50%;background:${t.goldDim};
  border:1px solid ${t.goldBorder};color:${t.gold};font-size:13px;font-weight:800;
  margin-bottom:10px;
`
const MethodCardTitle = styled.h4`font-size:15px;font-weight:700;color:${t.lText};margin-bottom:6px;`
const MethodCardDesc = styled.p`font-size:13px;color:${t.lTextSec};line-height:1.7;`

/* ── About: Scoring Breakdown ── */
const ScoreSection = styled.div`margin-top:48px;`
const ScoreGrid = styled.div`
  display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:680px;margin:0 auto;
  ${md}{grid-template-columns:1fr;}
`
const ScoreRow = styled.div`
  display:flex;align-items:center;gap:12px;padding:14px 16px;
  background:${t.lSurface};border:1px solid ${t.lBorder};border-radius:${t.r.md};
  transition:all ${t.tr};&:hover{border-color:${t.goldBorder};}
`
const ScoreEmoji = styled.span`font-size:20px;flex-shrink:0;`
const ScoreInfo = styled.div`flex:1;min-width:0;`
const ScoreFactor = styled.div`font-size:13px;font-weight:700;color:${t.lText};`
const ScoreWeight = styled.div`font-size:11px;color:${t.lTextSec};`
const ScoreBar = styled.div<{$pct:number}>`
  width:48px;height:6px;border-radius:3px;background:${t.lBorder};overflow:hidden;flex-shrink:0;
  position:relative;
  &::after{content:'';position:absolute;top:0;left:0;height:100%;
    width:${pr=>pr.$pct}%;background:linear-gradient(90deg,${t.gold},${t.goldBright});border-radius:3px;}
`

/* ── About: Data Sources ── */
const SourcesGrid = styled.div`
  display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:24px;
`
const SourceBadge = styled.div`
  display:flex;align-items:center;gap:8px;padding:10px 18px;
  background:${t.lSurface};border:1px solid ${t.lBorder};border-radius:${t.r.full};
  font-size:13px;font-weight:600;color:${t.lText};transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};box-shadow:${t.sh.sm};}
`
const SourceIcon = styled.span`font-size:16px;`

/* ── About: Stats Counter ── */
const StatsRow = styled.div`
  display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:48px auto 0;max-width:800px;
  @media(max-width:640px){grid-template-columns:repeat(2,1fr);}
`
const StatBox = styled.div`text-align:center;padding:16px;`
const StatNum = styled.div`font-size:clamp(28px,4vw,40px);font-weight:900;color:${t.gold};font-family:${t.font};`
const StatLabel = styled.div`font-size:12px;font-weight:600;color:${t.lTextSec};margin-top:4px;`

const METHODOLOGY = [
  { num: '1', title: 'איסוף נתונים', desc: 'אנו אוספים נתונים ממקורות רשמיים: רשות המסים, ועדות תכנון, מנהל מקרקעי ישראל, תוכניות מתאר ונתוני עסקאות היסטוריות.' },
  { num: '2', title: 'ניתוח ודירוג AI', desc: 'המערכת מנתחת כל חלקה לפי 3 גורמים מרכזיים: פוטנציאל תשואה (40%), שלב תכנוני (30%) וטווח זמן להפשרה (30%).' },
  { num: '3', title: 'עדכון שוטף', desc: 'הנתונים מתעדכנים באופן שוטף — מחירים, שלבי תכנון והחלטות ועדות. כל שינוי מותאם לציון ההשקעה בזמן אמת.' },
]

const SCORE_FACTORS = [
  { emoji: '📈', factor: 'פוטנציאל תשואה', weight: 'עד 4 נק׳ מתוך 10', pct: 40 },
  { emoji: '📋', factor: 'שלב תכנוני', weight: 'עד 3 נק׳ מתוך 10', pct: 30 },
  { emoji: '⏱️', factor: 'טווח זמן להפשרה', weight: 'עד 3 נק׳ מתוך 10', pct: 30 },
  { emoji: '🏗️', factor: 'היתר בנייה = ציון מקסימלי', weight: 'שלב מתקדם ביותר', pct: 100 },
]

const DATA_SOURCES = [
  { icon: '🏛️', label: 'רשות המסים — נדל״ן' },
  { icon: '📋', label: 'ועדות תכנון ובנייה' },
  { icon: '🗺️', label: 'מנהל מקרקעי ישראל' },
  { icon: '📊', label: 'נתוני עסקאות היסטוריות' },
  { icon: '🤖', label: 'ניתוח AI — Claude' },
  { icon: '🛰️', label: 'תצלומי לוויין' },
]
const TIERS = [
  { name: 'חינם', price: '₪0', featured: false, items: ['צפייה במפה', 'עד 5 מועדפים', 'ניתוח בסיסי'] },
  { name: 'משקיע', price: '₪149/חו׳', featured: true, items: ['מועדפים ללא הגבלה', 'השוואת חלקות', 'ניתוח AI מלא', 'התראות בזמן אמת'] },
  { name: 'מקצועי', price: '₪399/חו׳', featured: false, items: ['הכל ב-משקיע', 'ניהול לידים', 'אנליטיקס מתקדם', 'API גישה', 'תמיכה VIP'] },
]

/* ═══ PHONE VALIDATION ═══ */
const PHONE_RE = /^0[2-9]\d{7,8}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function About() {
  useDocumentTitle('אודות LandMap — שיטת הניתוח והדירוג שלנו')
  useMetaDescription('למדו על שיטת ניתוח ההשקעות של LandMap Israel — ציון השקעה שקוף, מקורות נתונים רשמיים וניתוח AI מתקדם.')
  return (
    <Wrap>
      <Title>אודות LandMap</Title>
      <Sub>הפלטפורמה המובילה להשקעות קרקע בישראל — שקיפות, נתונים אמינים ובינה מלאכותית</Sub>

      {/* Feature Cards */}
      <Grid4>
        {FEATURES.map((f, i) => (
          <Card key={i} $delay={i * 0.1}>
            <Icon><f.icon size={24} /></Icon>
            <CardTitle>{f.title}</CardTitle>
            <CardDesc>{f.desc}</CardDesc>
          </Card>
        ))}
      </Grid4>

      {/* Platform Stats */}
      <StatsRow>
        <StatBox><StatNum>12+</StatNum><StatLabel>חלקות במערכת</StatLabel></StatBox>
        <StatBox><StatNum>6</StatNum><StatLabel>מקורות נתונים</StatLabel></StatBox>
        <StatBox><StatNum>24/7</StatNum><StatLabel>עדכון אוטומטי</StatLabel></StatBox>
        <StatBox><StatNum>100%</StatNum><StatLabel>שקיפות ציון</StatLabel></StatBox>
      </StatsRow>

      {/* Methodology */}
      <MethodWrap>
        <MethodTitle>🔬 איך אנחנו מנתחים</MethodTitle>
        <MethodSub>כל חלקה עוברת תהליך ניתוח רב-שלבי שמשלב נתונים רשמיים עם ניתוח AI. התוצאה — ציון השקעה שקוף ומוסבר.</MethodSub>
        <MethodGrid>
          {METHODOLOGY.map((m, i) => (
            <MethodCard key={i} $delay={i * 0.12}>
              <MethodCardNum>{m.num}</MethodCardNum>
              <MethodCardTitle>{m.title}</MethodCardTitle>
              <MethodCardDesc>{m.desc}</MethodCardDesc>
            </MethodCard>
          ))}
        </MethodGrid>
      </MethodWrap>

      {/* Scoring Breakdown */}
      <ScoreSection>
        <MethodTitle>📊 פירוט ציון ההשקעה</MethodTitle>
        <MethodSub>ציון ההשקעה (1-10) מורכב מ-3 גורמים מרכזיים. כל גורם מחושב באופן עצמאי ומוצג בשקיפות מלאה בדף החלקה.</MethodSub>
        <ScoreGrid>
          {SCORE_FACTORS.map((sf, i) => (
            <ScoreRow key={i}>
              <ScoreEmoji>{sf.emoji}</ScoreEmoji>
              <ScoreInfo>
                <ScoreFactor>{sf.factor}</ScoreFactor>
                <ScoreWeight>{sf.weight}</ScoreWeight>
              </ScoreInfo>
              <ScoreBar $pct={sf.pct} />
            </ScoreRow>
          ))}
        </ScoreGrid>
      </ScoreSection>

      {/* Data Sources */}
      <MethodWrap>
        <MethodTitle>🏛️ מקורות הנתונים שלנו</MethodTitle>
        <MethodSub>אנו מסתמכים אך ורק על מקורות רשמיים ומוסדיים. הנתונים מצטלבים ומאומתים לפני כל עדכון.</MethodSub>
        <SourcesGrid>
          {DATA_SOURCES.map((ds, i) => (
            <SourceBadge key={i}>
              <SourceIcon>{ds.icon}</SourceIcon>
              {ds.label}
            </SourceBadge>
          ))}
        </SourcesGrid>
      </MethodWrap>

      {/* Values */}
      <Values>
        <ValTitle>הערכים שלנו</ValTitle>
        <ValDesc>שקיפות מלאה, נתונים אמינים והנגשת שוק הקרקעות לכל משקיע. אנו מחויבים להגן על פרטיות המוכרים ולספק ניתוח מקצועי שמאפשר קבלת החלטות מושכלת. המידע באתר אינו מהווה ייעוץ השקעות.</ValDesc>
      </Values>
    </Wrap>
  )
}

function ContactPage() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '', website: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [serverError, setServerError] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = 'נא להזין שם (לפחות 2 תווים)'
    if (!form.phone.trim() || !PHONE_RE.test(form.phone.replace(/[-\s]/g, ''))) errs.phone = 'מספר טלפון ישראלי לא תקין'
    if (!form.email.trim() || !EMAIL_RE.test(form.email.trim())) errs.email = 'כתובת אימייל לא תקינה'
    if (form.message.length > 500) errs.message = 'ההודעה ארוכה מדי (מקסימום 500 תווים)'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setStatus('loading')
    setServerError('')
    try {
      await api.createLead({
        name: form.name.trim(),
        phone: form.phone.replace(/[-\s]/g, ''),
        email: form.email.trim(),
        ...(form.message.trim() ? { message: form.message.trim() } : {}),
      })
      setStatus('success')
    } catch (err: unknown) {
      setStatus('error')
      setServerError((err as Error)?.message || 'שגיאה בשליחה, נסו שוב מאוחר יותר')
    }
  }

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    if (errors[field]) setErrors(errs => { const n = { ...errs }; delete n[field]; return n })
  }

  if (status === 'success') {
    return (
      <Wrap>
        <Title>צור קשר</Title>
        <Sub>תודה שפנית אלינו!</Sub>
        <SuccessMsg>
          <SuccessIcon><CheckCircle size={32} color="#10B981" /></SuccessIcon>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: t.lText, margin: 0 }}>ההודעה נשלחה בהצלחה!</h3>
          <p style={{ fontSize: 14, color: t.lTextSec, lineHeight: 1.7, maxWidth: 400 }}>
            קיבלנו את פנייתכם ונחזור אליכם בהקדם האפשרי. זמן תגובה ממוצע: עד 24 שעות בימי עסקים.
          </p>
          <GoldButton as={Link as any} to="/explore" style={{ textDecoration: 'none' }}>
            חזרה למפת החלקות
          </GoldButton>
        </SuccessMsg>
      </Wrap>
    )
  }

  return (
    <Wrap>
      <Title>צור קשר</Title>
      <Sub>נשמח לעמוד לרשותכם — מלאו את הטופס או פנו אלינו ישירות</Sub>
      <ContactGrid>
        <ContactForm onSubmit={handleSubmit} noValidate>
          <FormGroup>
            <FormLabel htmlFor="contact-name">שם מלא *</FormLabel>
            <FormInput
              id="contact-name" ref={nameRef} type="text" placeholder="ישראל ישראלי"
              value={form.name} onChange={handleChange('name')}
              $error={!!errors.name} autoComplete="name" maxLength={100}
            />
            {errors.name && <FormError><AlertCircle size={12} />{errors.name}</FormError>}
          </FormGroup>
          <FormGroup>
            <FormLabel htmlFor="contact-phone">טלפון *</FormLabel>
            <FormInput
              id="contact-phone" type="tel" placeholder="050-1234567" dir="ltr" style={{ textAlign: 'left' }}
              value={form.phone} onChange={handleChange('phone')}
              $error={!!errors.phone} autoComplete="tel" maxLength={12}
            />
            {errors.phone && <FormError><AlertCircle size={12} />{errors.phone}</FormError>}
          </FormGroup>
          <FormGroup>
            <FormLabel htmlFor="contact-email">אימייל *</FormLabel>
            <FormInput
              id="contact-email" type="email" placeholder="email@example.com" dir="ltr" style={{ textAlign: 'left' }}
              value={form.email} onChange={handleChange('email')}
              $error={!!errors.email} autoComplete="email" maxLength={100}
            />
            {errors.email && <FormError><AlertCircle size={12} />{errors.email}</FormError>}
          </FormGroup>
          <FormGroup>
            <FormLabel htmlFor="contact-message">הודעה (אופציונלי)</FormLabel>
            <FormTextarea
              id="contact-message" placeholder="ספרו לנו במה נוכל לעזור..."
              value={form.message} onChange={handleChange('message')}
              $error={!!errors.message} maxLength={500}
            />
            {errors.message && <FormError><AlertCircle size={12} />{errors.message}</FormError>}
            {form.message.length > 0 && (
              <span style={{ fontSize: 11, color: form.message.length > 450 ? '#F59E0B' : t.lTextSec, textAlign: 'left' }}>
                {form.message.length}/500
              </span>
            )}
          </FormGroup>
          {/* Honeypot — hidden from real users, bots fill it */}
          <FormHoneypot aria-hidden="true" tabIndex={-1}>
            <label htmlFor="contact-website">Website</label>
            <input id="contact-website" type="text" value={form.website}
              onChange={e => setForm(f => ({ ...f, website: e.target.value }))} tabIndex={-1} autoComplete="off" />
          </FormHoneypot>
          {status === 'error' && serverError && (
            <FormError style={{ fontSize: 13 }}><AlertCircle size={14} />{serverError}</FormError>
          )}
          <SubmitBtn type="submit" $loading={status === 'loading'}>
            {status === 'loading' ? (
              <>שולח...</>
            ) : (
              <><Send size={16} />שלח פנייה</>
            )}
          </SubmitBtn>
        </ContactForm>
        <ContactInfo>
          <ContactCard href={`tel:${SITE_CONFIG.phone}`}>
            <ContactCardIcon $bg="rgba(59,130,246,0.1)"><Phone size={20} color="#3B82F6" /></ContactCardIcon>
            <div>
              <ContactCardLabel>טלפון</ContactCardLabel>
              <ContactCardValue>{SITE_CONFIG.phone}</ContactCardValue>
            </div>
          </ContactCard>
          <ContactCard href="mailto:info@landmap.co.il">
            <ContactCardIcon $bg="rgba(139,92,246,0.1)"><Mail size={20} color="#8B5CF6" /></ContactCardIcon>
            <div>
              <ContactCardLabel>אימייל</ContactCardLabel>
              <ContactCardValue>info@landmap.co.il</ContactCardValue>
            </div>
          </ContactCard>
          <ContactCard href={SITE_CONFIG.waLink} target="_blank" rel="noopener noreferrer">
            <ContactCardIcon $bg="rgba(37,211,102,0.1)"><MessageCircle size={20} color="#25D366" /></ContactCardIcon>
            <div>
              <ContactCardLabel>WhatsApp</ContactCardLabel>
              <ContactCardValue>שלחו הודעה ב-WhatsApp</ContactCardValue>
            </div>
          </ContactCard>
          <div style={{ marginTop: 8, padding: '16px 20px', background: t.goldDim, borderRadius: t.r.lg, border: `1px solid ${t.goldBorder}` }}>
            <p style={{ fontSize: 13, color: t.lText, fontWeight: 600, marginBottom: 4 }}>⏰ זמני פעילות</p>
            <p style={{ fontSize: 12, color: t.lTextSec, lineHeight: 1.7 }}>
              ימים א׳-ה׳: 09:00 - 18:00<br />
              ימי ו׳: 09:00 - 13:00<br />
              תגובה לפניות: עד 24 שעות בימי עסקים
            </p>
          </div>
        </ContactInfo>
      </ContactGrid>
    </Wrap>
  )
}

/* ── Pricing: Feature Comparison Table ── */
const CompTable = styled.div`
  max-width:780px;margin:48px auto 0;border:1px solid ${t.lBorder};border-radius:${t.r.xl};
  overflow:hidden;background:${t.lSurface};
`
const CompRow = styled.div<{$header?:boolean}>`
  display:grid;grid-template-columns:2fr 1fr 1fr 1fr;
  border-bottom:1px solid ${t.lBorder};
  ${pr=>pr.$header?`background:${t.lBg};font-weight:700;font-size:13px;color:${t.lText};`:''}
  &:last-child{border-bottom:none;}
  @media(max-width:640px){grid-template-columns:1.5fr 1fr 1fr 1fr;}
`
const CompCell = styled.div<{$highlight?:boolean}>`
  padding:12px 16px;font-size:13px;color:${t.lTextSec};text-align:center;
  display:flex;align-items:center;justify-content:center;
  ${pr=>pr.$highlight?`background:rgba(212,168,75,0.04);`:''}
  &:first-child{text-align:right;justify-content:flex-start;font-weight:600;color:${t.lText};}
  @media(max-width:640px){padding:10px 8px;font-size:11px;}
`
const CompCheck = styled.span<{$yes:boolean}>`
  display:inline-flex;align-items:center;justify-content:center;
  width:22px;height:22px;border-radius:50%;
  background:${pr=>pr.$yes?'rgba(16,185,129,0.1)':'rgba(148,163,184,0.08)'};
  color:${pr=>pr.$yes?t.ok:'#CBD5E1'};font-size:12px;
`

/* ── Pricing: FAQ ── */
const FaqWrap = styled.div`max-width:680px;margin:56px auto 0;`
const FaqItem = styled.details`
  border:1px solid ${t.lBorder};border-radius:${t.r.md};margin-bottom:8px;
  background:${t.lSurface};transition:all ${t.tr};overflow:hidden;
  &[open]{border-color:${t.goldBorder};box-shadow:0 2px 8px rgba(212,168,75,0.08);}
`
const FaqSummary = styled.summary`
  display:flex;align-items:center;gap:10px;padding:16px 20px;cursor:pointer;
  font-size:14px;font-weight:700;color:${t.lText};font-family:${t.font};
  list-style:none;&::-webkit-details-marker{display:none;}
  &::after{content:'▾';margin-right:auto;color:${t.lTextSec};font-size:12px;transition:transform 0.2s;}
  [open] > &::after{transform:rotate(180deg);}
`
const FaqAnswer = styled.div`
  padding:0 20px 16px;font-size:13px;color:${t.lTextSec};line-height:1.8;
`

const COMPARISON_FEATURES = [
  { feature: 'צפייה במפה אינטראקטיבית', free: true, investor: true, pro: true },
  { feature: 'חיפוש וסינון מתקדם', free: true, investor: true, pro: true },
  { feature: 'ציון השקעה + פירוט', free: true, investor: true, pro: true },
  { feature: 'מועדפים', free: '5', investor: '∞', pro: '∞' },
  { feature: 'השוואת חלקות', free: false, investor: true, pro: true },
  { feature: 'ניתוח AI מלא', free: false, investor: true, pro: true },
  { feature: 'התראות בזמן אמת', free: false, investor: true, pro: true },
  { feature: 'דוח השקעה להורדה', free: false, investor: true, pro: true },
  { feature: 'ניהול לידים ו-CRM', free: false, investor: false, pro: true },
  { feature: 'אנליטיקס מתקדם', free: false, investor: false, pro: true },
  { feature: 'גישת API', free: false, investor: false, pro: true },
  { feature: 'תמיכה VIP', free: false, investor: false, pro: true },
]

const PRICING_FAQ = [
  { q: 'האם אפשר לנסות בחינם?', a: 'בהחלט! התוכנית החינמית כוללת גישה מלאה למפה, חיפוש וסינון, ציון השקעה ועד 5 מועדפים. ניתן לשדרג בכל עת.' },
  { q: 'האם ניתן לבטל בכל עת?', a: 'כן, ביטול חופשי בכל רגע ללא התחייבות. החשבון שלכם יעבור לתוכנית חינם בסיום תקופת החיוב.' },
  { q: 'מה ההבדל בין ניתוח בסיסי לניתוח AI מלא?', a: 'הניתוח הבסיסי כולל ציון השקעה ופירוט גורמים. ניתוח AI מלא מוסיף תחזיות תשואה, הערכת סיכון, תרחישי יציאה, והשוואה לשוק בזמן אמת.' },
  { q: 'האם המחירים כוללים מע״מ?', a: 'המחירים אינם כוללים מע״מ. חשבונית מס תופק אוטומטית בכל חידוש.' },
  { q: 'מה כוללת גישת API?', a: 'גישה לממשק תכנות (REST API) לשליפת נתוני חלקות, ציונים ותחזיות. אידיאלי ליזמים שרוצים לשלב את הנתונים במערכות שלהם.' },
]

function Pricing() {
  useDocumentTitle('מחירים — תוכניות LandMap Israel')
  useMetaDescription('השוו בין תוכניות LandMap Israel — חינם, משקיע ומקצועי. מצאו את התוכנית המתאימה להשקעות הקרקע שלכם.')
  return (
    <Wrap>
      <Title>מחירים</Title>
      <Sub>בחרו את התוכנית המתאימה לכם — שדרוג או ביטול בכל עת</Sub>
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

      {/* Feature Comparison Table */}
      <CompTable>
        <CompRow $header>
          <CompCell>תכונה</CompCell>
          <CompCell>חינם</CompCell>
          <CompCell $highlight>משקיע</CompCell>
          <CompCell>מקצועי</CompCell>
        </CompRow>
        {COMPARISON_FEATURES.map((f, i) => (
          <CompRow key={i}>
            <CompCell>{f.feature}</CompCell>
            <CompCell>{typeof f.free === 'string' ? f.free : <CompCheck $yes={!!f.free}>{f.free ? '✓' : '—'}</CompCheck>}</CompCell>
            <CompCell $highlight>{typeof f.investor === 'string' ? f.investor : <CompCheck $yes={!!f.investor}>{f.investor ? '✓' : '—'}</CompCheck>}</CompCell>
            <CompCell>{typeof f.pro === 'string' ? f.pro : <CompCheck $yes={!!f.pro}>{f.pro ? '✓' : '—'}</CompCheck>}</CompCell>
          </CompRow>
        ))}
      </CompTable>

      {/* FAQ */}
      <FaqWrap>
        <MethodTitle style={{marginBottom: 24}}>שאלות נפוצות</MethodTitle>
        {PRICING_FAQ.map((faq, i) => (
          <FaqItem key={i}>
            <FaqSummary>{faq.q}</FaqSummary>
            <FaqAnswer>{faq.a}</FaqAnswer>
          </FaqItem>
        ))}
      </FaqWrap>
    </Wrap>
  )
}

function Terms() {
  return (
    <LegalWrap>
      <LegalTitle>תנאי שימוש</LegalTitle>
      <LegalUpdated>עודכן לאחרונה: פברואר 2026</LegalUpdated>

      <LegalSection>
        <LegalH2><FileText size={18} color={t.gold} />1. כללי</LegalH2>
        <LegalP>ברוכים הבאים ל-LandMap Israel (להלן: "האתר" או "השירות"). השימוש באתר מהווה הסכמה לתנאי שימוש אלה. אם אינכם מסכימים לתנאים, אנא הימנעו משימוש באתר.</LegalP>
        <LegalP>LandMap Israel מספקת פלטפורמה טכנולוגית לצפייה, חיפוש וניתוח חלקות קרקע להשקעה בישראל. האתר מציג מידע שנאסף ממקורות ציבוריים ופרטיים ומשמש לצרכי מידע בלבד.</LegalP>
      </LegalSection>

      <LegalSection>
        <LegalH2><AlertCircle size={18} color={t.gold} />2. הגבלת אחריות</LegalH2>
        <LegalP>המידע באתר מוצג כפי שהוא ("AS IS") ואינו מהווה ייעוץ השקעות, ייעוץ משפטי, או ייעוץ מקצועי מכל סוג. אנו ממליצים להתייעץ עם אנשי מקצוע מוסמכים לפני קבלת החלטות השקעה.</LegalP>
        <LegalUl>
          <li>LandMap אינה אחראית לדיוק, שלמות או עדכניות המידע המוצג</li>
          <li>תחזיות תשואה מבוססות מודלים סטטיסטיים ואינן מהוות הבטחה לתוצאות</li>
          <li>ניתוח AI הוא כלי עזר בלבד ואינו מחליף שיקול דעת מקצועי</li>
          <li>מחירים ונתוני שוק עשויים להשתנות ללא הודעה מוקדמת</li>
        </LegalUl>
      </LegalSection>

      <LegalSection>
        <LegalH2><Users size={18} color={t.gold} />3. חשבון משתמש</LegalH2>
        <LegalP>חלק מהשירותים דורשים הרשמה. המשתמש אחראי לשמור על סודיות פרטי החשבון שלו ומתחייב לא לאפשר שימוש בלתי מורשה בחשבונו. LandMap שומרת על הזכות להשעות או לסגור חשבונות שמפרים את תנאי השימוש.</LegalP>
      </LegalSection>

      <LegalSection>
        <LegalH2><Shield size={18} color={t.gold} />4. קניין רוחני</LegalH2>
        <LegalP>כל התוכן באתר, לרבות עיצוב, קוד, טקסטים, גרפיקה, לוגואים, נתונים מעובדים וניתוחים, הם קניינה של LandMap Israel ומוגנים בזכויות יוצרים. חל איסור להעתיק, לשכפל, להפיץ או לעשות שימוש מסחרי בתכנים ללא אישור בכתב.</LegalP>
      </LegalSection>

      <LegalSection>
        <LegalH2><Globe size={18} color={t.gold} />5. שימוש מותר</LegalH2>
        <LegalP>השימוש באתר מותר לצרכים אישיים ומקצועיים לגיטימיים. חל איסור על:</LegalP>
        <LegalUl>
          <li>סריקה אוטומטית (scraping) של תוכן האתר</li>
          <li>שימוש בבוטים או כלים אוטומטיים ללא אישור</li>
          <li>ניסיון לפגוע באבטחת האתר או בתשתיותיו</li>
          <li>שימוש בשירות למטרות בלתי חוקיות</li>
        </LegalUl>
      </LegalSection>

      <LegalSection>
        <LegalH2><FileText size={18} color={t.gold} />6. שינויים בתנאים</LegalH2>
        <LegalP>LandMap שומרת על הזכות לעדכן את תנאי השימוש מעת לעת. שינויים מהותיים יפורסמו באתר. המשך השימוש באתר לאחר פרסום שינויים מהווה הסכמה לתנאים המעודכנים.</LegalP>
      </LegalSection>

      <LegalFooter>
        <LegalP style={{ marginBottom: 0 }}>
          לשאלות בנוגע לתנאי השימוש — <Link to="/contact" style={{ color: t.gold, fontWeight: 600 }}>צרו קשר</Link>
        </LegalP>
      </LegalFooter>
    </LegalWrap>
  )
}

function Privacy() {
  return (
    <LegalWrap>
      <LegalTitle>מדיניות פרטיות</LegalTitle>
      <LegalUpdated>עודכן לאחרונה: פברואר 2026</LegalUpdated>

      <LegalSection>
        <LegalH2><Lock size={18} color={t.gold} />1. מבוא</LegalH2>
        <LegalP>LandMap Israel ("אנחנו") מחויבת להגנה על פרטיותכם. מדיניות זו מסבירה כיצד אנו אוספים, משתמשים ומגנים על המידע שלכם בהתאם לחוק הגנת הפרטיות, תשמ"א-1981 ותקנות הגנת הפרטיות.</LegalP>
      </LegalSection>

      <LegalSection>
        <LegalH2><Database size={18} color={t.gold} />2. מידע שאנו אוספים</LegalH2>
        <LegalP>אנו אוספים את סוגי המידע הבאים:</LegalP>
        <LegalUl>
          <li><strong>מידע שאתם מספקים:</strong> שם, טלפון, אימייל בעת הרשמה או יצירת קשר</li>
          <li><strong>נתוני שימוש:</strong> דפים שצפיתם, חלקות שבדקתם, חיפושים שביצעתם</li>
          <li><strong>מידע טכני:</strong> כתובת IP, סוג דפדפן, מערכת הפעלה, רזולוציית מסך</li>
          <li><strong>מיקום (אופציונלי):</strong> מיקום גאוגרפי באם הסכמתם לכך</li>
          <li><strong>ביצועי אתר:</strong> Core Web Vitals לשיפור חוויית המשתמש</li>
        </LegalUl>
      </LegalSection>

      <LegalSection>
        <LegalH2><Eye size={18} color={t.gold} />3. שימוש במידע</LegalH2>
        <LegalP>אנו משתמשים במידע שנאסף למטרות הבאות:</LegalP>
        <LegalUl>
          <li>מתן שירותי האתר והתאמה אישית של החוויה</li>
          <li>שליחת עדכונים ומידע רלוונטי (באם הסכמתם)</li>
          <li>שיפור האתר, ניתוח מגמות שימוש וביצועים</li>
          <li>מניעת הונאות ושמירה על אבטחת המערכת</li>
          <li>עמידה בדרישות חוקיות ורגולטוריות</li>
        </LegalUl>
      </LegalSection>

      <LegalSection>
        <LegalH2><Shield size={18} color={t.gold} />4. אבטחת מידע</LegalH2>
        <LegalP>אנו נוקטים באמצעי אבטחה טכניים וארגוניים מקובלים להגנה על המידע שלכם, כולל הצפנת נתונים, בקרת גישה, ומדיניות Row Level Security (RLS) ברמת מסד הנתונים. עם זאת, אין שיטת אבטחה מושלמת ואיננו יכולים להבטיח אבטחה מוחלטת.</LegalP>
      </LegalSection>

      <LegalSection>
        <LegalH2><Trash2 size={18} color={t.gold} />5. זכויותיכם</LegalH2>
        <LegalP>על פי חוק הגנת הפרטיות, עומדות לכם הזכויות הבאות:</LegalP>
        <LegalUl>
          <li><strong>עיון:</strong> זכות לעיין במידע שנאסף עליכם</li>
          <li><strong>תיקון:</strong> זכות לבקש תיקון מידע שגוי</li>
          <li><strong>מחיקה:</strong> זכות לבקש מחיקת המידע שלכם</li>
          <li><strong>התנגדות:</strong> זכות להתנגד לדיוור ישיר</li>
        </LegalUl>
        <LegalP>לממוש זכויותיכם, פנו אלינו דרך <Link to="/contact" style={{ color: t.gold, fontWeight: 600 }}>עמוד יצירת הקשר</Link>.</LegalP>
      </LegalSection>

      <LegalSection>
        <LegalH2><ExternalLink size={18} color={t.gold} />6. צדדים שלישיים</LegalH2>
        <LegalP>האתר עשוי להכיל קישורים לאתרים חיצוניים. אין לנו שליטה על מדיניות הפרטיות של אתרים אלה ואיננו אחראים לפרקטיקות הפרטיות שלהם. אנו ממליצים לקרוא את מדיניות הפרטיות של כל אתר שאתם מבקרים.</LegalP>
      </LegalSection>

      <LegalSection>
        <LegalH2><FileText size={18} color={t.gold} />7. עוגיות (Cookies)</LegalH2>
        <LegalP>האתר משתמש בעוגיות ומנגנוני אחסון מקומי (localStorage) לצורך שמירת העדפותיכם, מועדפים, היסטוריית צפיות, ושיפור חוויית השימוש. באפשרותכם לנהל את הגדרות העוגיות דרך הדפדפן שלכם.</LegalP>
      </LegalSection>

      <LegalFooter>
        <LegalP style={{ marginBottom: 0 }}>
          לשאלות בנוגע לפרטיות — <Link to="/contact" style={{ color: t.gold, fontWeight: 600 }}>צרו קשר</Link> | <a href="mailto:privacy@landmap.co.il" style={{ color: t.gold, fontWeight: 600 }}>privacy@landmap.co.il</a>
        </LegalP>
      </LegalFooter>
    </LegalWrap>
  )
}

/* ══════ ACCESSIBILITY STATEMENT ══════ */
function Accessibility() {
  return (
    <LegalWrap>
      <LegalTitle>♿ הצהרת נגישות</LegalTitle>
      <LegalDate>עדכון אחרון: פברואר 2026</LegalDate>
      <LegalBody>
        <LegalSection>
          <LegalH2>מחויבות לנגישות</LegalH2>
          <LegalP>
            LandMap Israel מחויבת להנגשת האתר והשירותים שלנו לכלל האוכלוסייה, כולל אנשים עם מוגבלויות.
            אנו שואפים לעמוד בתקן הנגישות הישראלי (תקנות שוויון זכויות לאנשים עם מוגבלות, 2013)
            וב-WCAG 2.1 ברמת AA.
          </LegalP>
        </LegalSection>

        <LegalSection>
          <LegalH2>פעולות נגישות שביצענו</LegalH2>
          <LegalList>
            <li>קישור "דלג לתוכן הראשי" בכל עמוד</li>
            <li>תמיכה מלאה בניווט מקלדת (קיצורי מקלדת בעמוד המפה — לחצו ? לצפייה)</li>
            <li>תגיות ARIA מלאות לכל רכיבים אינטראקטיביים</li>
            <li>תמיכה בהגדלת טקסט (עד 200%) ללא אובדן תוכן</li>
            <li>יחסי ניגודיות צבע העומדים בתקן WCAG AA</li>
            <li>כיבוד הגדרת "הפחתת תנועה" (prefers-reduced-motion) במערכת ההפעלה</li>
            <li>כיבוד הגדרת "ניגודיות גבוהה" (prefers-contrast) במערכת ההפעלה</li>
            <li>כיבוד כיוון קריאה RTL (ימין לשמאל) לעברית</li>
            <li>טפסים עם שגיאות ברורות ותוויות מלאות</li>
            <li>תמיכה בגישה מכל מכשיר — נייד, טאבלט ומחשב</li>
            <li>מטא-תגיות SEO ונתונים מובנים (Schema.org) לנגישות מנועי חיפוש</li>
            <li>חלון חיפוש מהיר (Ctrl+K) נגיש לניווט מקלדת</li>
          </LegalList>
        </LegalSection>

        <LegalSection>
          <LegalH2>קיצורי מקלדת</LegalH2>
          <LegalP>בעמוד המפה האינטראקטיבית:</LegalP>
          <LegalList>
            <li><strong>/</strong> — מיקוד שדה חיפוש</li>
            <li><strong>?</strong> — הצגת כל קיצורי המקלדת</li>
            <li><strong>F</strong> — מפה במסך מלא</li>
            <li><strong>L</strong> — פתיחת/סגירת רשימת חלקות</li>
            <li><strong>Escape</strong> — סגירת חלוניות</li>
            <li><strong>←/→</strong> — ניווט בין חלקות</li>
            <li><strong>Ctrl+K</strong> — חיפוש מהיר (מכל עמוד)</li>
          </LegalList>
        </LegalSection>

        <LegalSection>
          <LegalH2>דפדפנים נתמכים</LegalH2>
          <LegalP>
            האתר נבדק ותומך בדפדפנים: Chrome, Firefox, Safari ו-Edge בגרסאותיהם האחרונות.
            מומלץ להשתמש בגרסה עדכנית לחוויה מיטבית.
          </LegalP>
        </LegalSection>

        <LegalSection>
          <LegalH2>נתקלתם בבעיית נגישות?</LegalH2>
          <LegalP>
            אנו עובדים ללא הרף לשפר את נגישות האתר. אם נתקלתם בבעיה או שיש לכם הצעות שיפור,
            נשמח לשמוע:
          </LegalP>
          <LegalList>
            <li>אימייל: <a href="mailto:accessibility@landmap.co.il">accessibility@landmap.co.il</a></li>
            <li>טלפון: <a href={`tel:${SITE_CONFIG.phone}`}>{SITE_CONFIG.phone}</a></li>
            <li><a href="/contact">טופס יצירת קשר</a></li>
          </LegalList>
          <LegalP>
            נשתדל לטפל בפניות נגישות תוך 5 ימי עסקים.
          </LegalP>
        </LegalSection>
      </LegalBody>
      <LegalFooter>
        © {new Date().getFullYear()} LandMap Israel · <a href="/terms">תנאי שימוש</a> · <a href="/privacy">מדיניות פרטיות</a>
      </LegalFooter>
    </LegalWrap>
  )
}

export default function Public() {
  const { pathname } = useLocation()
  const titleMap: Record<string, string> = {
    '/about': 'אודות', '/contact': 'צור קשר', '/pricing': 'תוכניות ומחירים',
    '/terms': 'תנאי שימוש', '/privacy': 'מדיניות פרטיות', '/accessibility': 'הצהרת נגישות',
  }
  const descMap: Record<string, string> = {
    '/about': 'LandMap Israel — פלטפורמת השקעות קרקעות מובילה בישראל עם מפה אינטראקטיבית וניתוח AI.',
    '/contact': 'צרו קשר עם צוות LandMap Israel — ייעוץ השקעות קרקע, תמיכה טכנית ושיתופי פעולה.',
    '/pricing': 'תוכניות מנוי LandMap Israel — גישה חינמית למפה, כלים מתקדמים למשקיעים ועסקים.',
    '/terms': 'תנאי השימוש באתר LandMap Israel — פלטפורמת השקעות קרקעות בישראל.',
    '/privacy': 'מדיניות הפרטיות של LandMap Israel — כיצד אנו אוספים, משתמשים ומגנים על המידע שלך.',
    '/accessibility': 'הצהרת נגישות — מחויבות LandMap Israel לנגישות אתר לאנשים עם מוגבלויות.',
  }
  useDocumentTitle(titleMap[pathname] || 'אודות')
  useMetaDescription(descMap[pathname])

  let page
  switch (pathname) {
    case '/contact': page = <ContactPage />; break
    case '/pricing': page = <Pricing />; break
    case '/terms': page = <Terms />; break
    case '/privacy': page = <Privacy />; break
    case '/accessibility': page = <Accessibility />; break
    default: page = <About />
  }
  return <PublicLayout>{page}</PublicLayout>
}
