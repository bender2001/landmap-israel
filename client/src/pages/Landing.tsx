import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import styled, { keyframes, css } from 'styled-components'
import { MapPin, Bot, TrendingUp, Zap, ChevronLeft } from 'lucide-react'
import { t, fadeInUp, fadeInScale, shimmer, float, gradientShift, sm, md, lg } from '../theme'
import { PublicLayout } from '../components/Layout'
import { GoldButton, GhostButton, AnimatedCard, CountUpNumber } from '../components/UI'

/* ── keyframes ── */
const glow = keyframes`0%,100%{box-shadow:0 0 20px rgba(212,168,75,0.15)}50%{box-shadow:0 0 40px rgba(212,168,75,0.3)}`
const orbFloat = keyframes`0%{transform:translate(0,0) scale(1)}33%{transform:translate(12px,-18px) scale(1.05)}66%{transform:translate(-8px,10px) scale(0.97)}100%{transform:translate(0,0) scale(1)}`

/* ── dark section wrapper ── */
const Dark = styled.div`background:${t.bg};color:${t.text};overflow:hidden;`

/* ── HERO ── */
const Hero = styled.section`
  position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;
  padding:80px 24px;direction:rtl;
  background:radial-gradient(ellipse 80% 60% at 50% 40%,rgba(212,168,75,0.06),transparent 70%),
             linear-gradient(180deg,${t.bg} 0%,#0d1526 50%,${t.bg} 100%);
`
const Orb = styled.div<{$size:number;$top:string;$left:string;$delay:number}>`
  position:absolute;width:${p=>p.$size}px;height:${p=>p.$size}px;border-radius:50%;
  background:radial-gradient(circle,rgba(212,168,75,0.12),transparent 70%);
  top:${p=>p.$top};left:${p=>p.$left};pointer-events:none;
  animation:${orbFloat} ${p=>6+p.$delay}s ease-in-out infinite;animation-delay:${p=>p.$delay}s;
`
const HeroContent = styled.div`
  position:relative;z-index:2;text-align:center;max-width:720px;
  display:flex;flex-direction:column;align-items:center;gap:24px;
`
const Headline = styled.h1`
  font-size:clamp(36px,6vw,64px);font-weight:900;line-height:1.15;font-family:${t.font};
  background:linear-gradient(135deg,${t.gold} 0%,${t.goldBright} 40%,${t.gold} 80%);
  background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;
  animation:${gradientShift} 4s ease infinite;
`
const Sub = styled.p`
  font-size:clamp(16px,2.5vw,20px);color:${t.textSec};line-height:1.7;max-width:560px;
  animation:${fadeInUp} 0.6s ease-out 0.2s both;
`
const CTAs = styled.div`
  display:flex;gap:14px;flex-wrap:wrap;justify-content:center;
  animation:${fadeInUp} 0.6s ease-out 0.4s both;
`
const HeroGold = styled(GoldButton).attrs({as:Link})`
  padding:14px 36px;font-size:16px;border-radius:${t.r.full};text-decoration:none !important;
  animation:${glow} 3s ease-in-out infinite;
` as any
const HeroGhost = styled(GhostButton).attrs({as:Link})`
  padding:14px 36px;font-size:16px;border-radius:${t.r.full};text-decoration:none !important;
` as any

/* ── STATS BAR ── */
const StatsStrip = styled.section`
  padding:40px 24px;direction:rtl;
  background:linear-gradient(135deg,rgba(212,168,75,0.05),rgba(212,168,75,0.02));
  border-top:1px solid ${t.goldBorder};border-bottom:1px solid ${t.goldBorder};
`
const StatsGrid = styled.div`
  max-width:960px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:16px;text-align:center;
  ${sm}{grid-template-columns:repeat(2,1fr);}
  @media(max-width:480px){grid-template-columns:1fr;}
`
const StatItem = styled(AnimatedCard)`display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px;`
const StatNum = styled.div`font-size:28px;font-weight:800;color:${t.goldBright};font-family:${t.font};`
const StatLabel = styled.div`font-size:13px;color:${t.textSec};`

/* ── FEATURES ── */
const Features = styled.section`padding:80px 24px;direction:rtl;`
const FeatTitle = styled.h2`
  text-align:center;font-size:clamp(24px,4vw,36px);font-weight:800;color:${t.text};
  margin-bottom:48px;font-family:${t.font};animation:${fadeInUp} 0.5s ease-out both;
`
const FeatGrid = styled.div`
  max-width:960px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:24px;
  ${md}{grid-template-columns:1fr;}
`
const Card = styled(AnimatedCard)`
  background:${t.surface};border:1px solid ${t.border};border-radius:${t.r.lg};padding:32px 24px;
  text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px;
  transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};transform:translateY(-4px);box-shadow:${t.sh.glow};}
`
const IconWrap = styled.div`
  width:56px;height:56px;border-radius:${t.r.lg};
  background:linear-gradient(135deg,rgba(212,168,75,0.12),rgba(212,168,75,0.04));
  border:1px solid ${t.goldBorder};display:flex;align-items:center;justify-content:center;
  color:${t.gold};animation:${float} 4s ease-in-out infinite;
`
const CardTitle = styled.h3`font-size:18px;font-weight:700;color:${t.text};font-family:${t.font};`
const CardDesc = styled.p`font-size:14px;color:${t.textSec};line-height:1.7;`

/* ── CTA SECTION ── */
const CTASection = styled.section`
  padding:64px 24px;direction:rtl;text-align:center;position:relative;
  background:linear-gradient(135deg,rgba(212,168,75,0.08),rgba(212,168,75,0.03));
  border-top:1px solid ${t.goldBorder};
`
const CTATitle = styled.h2`
  font-size:clamp(24px,4vw,32px);font-weight:800;color:${t.text};margin-bottom:24px;
  font-family:${t.font};animation:${fadeInScale} 0.5s ease-out both;
`
const CTAButtons = styled.div`
  display:flex;gap:14px;justify-content:center;flex-wrap:wrap;
  animation:${fadeInUp} 0.5s ease-out 0.2s both;
`
const CTAGold = styled(GoldButton).attrs({as:Link})`
  padding:14px 32px;font-size:15px;border-radius:${t.r.full};text-decoration:none !important;
` as any
const CTAGhost = styled(GhostButton).attrs({as:Link})`
  padding:14px 32px;font-size:15px;border-radius:${t.r.full};text-decoration:none !important;
` as any

/* ── features data ── */
const FEATURES = [
  { icon: MapPin, title: 'מפה אינטראקטיבית', desc: 'צפו בחלקות על מפה חכמה עם שכבות מידע, תקריב לכל אזור וסינון מתקדם בזמן אמת.' },
  { icon: Zap, title: 'ניתוח AI חכם', desc: 'יועץ דיגיטלי מבוסס בינה מלאכותית שמנתח כל חלקה ומספק תחזיות תשואה מותאמות אישית.' },
  { icon: TrendingUp, title: 'נתונים בזמן אמת', desc: 'מעקב אחר סטטוס ועדות, מחירי שוק, שומות שמאי ומגמות השקעה מעודכנות.' },
]
const STATS = [
  { value: 3, suffix: '+', label: 'חלקות זמינות' },
  { value: 400, suffix: 'K+', label: '₪ מחיר מינימום' },
  { value: 200, suffix: '%+', label: 'תשואה מקסימלית' },
  { value: 0, suffix: 'AI', label: 'יועץ חכם' },
]

/* ── page ── */
export default function Landing() {
  const [visible, setVisible] = useState(false)
  useEffect(() => { setVisible(true) }, [])

  return (
    <PublicLayout>
      <Dark>
        {/* Hero */}
        <Hero>
          <Orb $size={300} $top="10%" $left="5%" $delay={0} />
          <Orb $size={200} $top="60%" $left="80%" $delay={2} />
          <Orb $size={150} $top="25%" $left="70%" $delay={4} />
          <HeroContent>
            <Headline>השקעות קרקע חכמות</Headline>
            <Sub>פלטפורמת הנדל״ן המובילה בישראל &mdash; מפה אינטראקטיבית, ניתוח AI ונתונים בזמן אמת</Sub>
            <CTAs>
              <HeroGold to="/explore">התחל לחפש <ChevronLeft size={18}/></HeroGold>
              <HeroGhost to="#features">למידע נוסף</HeroGhost>
            </CTAs>
          </HeroContent>
        </Hero>

        {/* Stats */}
        <StatsStrip>
          <StatsGrid>
            {STATS.map((s, i) => (
              <StatItem key={i} $delay={i * 0.12}>
                <StatNum>{s.value ? <CountUpNumber value={s.value} /> : ''}{s.suffix}</StatNum>
                <StatLabel>{s.label}</StatLabel>
              </StatItem>
            ))}
          </StatsGrid>
        </StatsStrip>

        {/* Features */}
        <Features id="features">
          <FeatTitle>למה LandMap?</FeatTitle>
          <FeatGrid>
            {FEATURES.map((f, i) => (
              <Card key={i} $delay={i * 0.15}>
                <IconWrap><f.icon size={26} /></IconWrap>
                <CardTitle>{f.title}</CardTitle>
                <CardDesc>{f.desc}</CardDesc>
              </Card>
            ))}
          </FeatGrid>
        </Features>

        {/* CTA */}
        <CTASection>
          <CTATitle>מוכנים להתחיל?</CTATitle>
          <CTAButtons>
            <CTAGold to="/register">הרשמה חינם</CTAGold>
            <CTAGhost to="/login">התחברות</CTAGhost>
          </CTAButtons>
        </CTASection>
      </Dark>
    </PublicLayout>
  )
}
