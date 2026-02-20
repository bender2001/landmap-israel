import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { MapPin, Zap, TrendingUp, ChevronLeft, Phone, Bell, Smartphone, Briefcase, Star, Shield, FileText, Building2, MessageCircle } from 'lucide-react'
import { t, fadeInUp, fadeInScale, shimmer, float, gradientShift, sm, md, lg, mobile } from '../theme'
import { PublicLayout } from '../components/Layout'
import { GoldButton, GhostButton, AnimatedCard, CountUpNumber } from '../components/UI'

/* ── extra keyframes ── */
const glow = keyframes`0%,100%{box-shadow:0 0 20px rgba(212,168,75,0.15)}50%{box-shadow:0 0 50px rgba(212,168,75,0.35)}`
const orbFloat = keyframes`0%{transform:translate(0,0) scale(1)}33%{transform:translate(14px,-20px) scale(1.06)}66%{transform:translate(-10px,12px) scale(0.96)}100%{transform:translate(0,0) scale(1)}`
const meshMove = keyframes`0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}`
const particleDrift = keyframes`0%{transform:translateY(0) scale(1);opacity:0.7}50%{opacity:1}100%{transform:translateY(-100vh) scale(0.3);opacity:0}`
const slideInLeft = keyframes`from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}`

/* ── base ── */
const Dark = styled.div`background:${t.bg};color:${t.text};overflow-x:hidden;`

/* ══════ HERO ══════ */
const Hero = styled.section`
  position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;
  padding:100px 24px 80px;direction:rtl;overflow:hidden;
  background:
    radial-gradient(ellipse 90% 70% at 50% 35%,rgba(212,168,75,0.07),transparent 70%),
    radial-gradient(ellipse 50% 50% at 80% 80%,rgba(212,168,75,0.04),transparent),
    linear-gradient(180deg,${t.bg} 0%,#0d1526 50%,${t.bg} 100%);
`
const MeshBg = styled.div`
  position:absolute;inset:0;opacity:0.03;pointer-events:none;
  background:linear-gradient(45deg,${t.gold},transparent 40%,${t.goldBright},transparent 70%,${t.gold});
  background-size:400% 400%;animation:${meshMove} 15s ease infinite;
`
const Particle = styled.div<{$x:number;$size:number;$dur:number;$delay:number}>`
  position:absolute;bottom:-20px;left:${p=>p.$x}%;
  width:${p=>p.$size}px;height:${p=>p.$size}px;border-radius:50%;pointer-events:none;
  background:radial-gradient(circle,rgba(212,168,75,0.5),transparent 70%);
  animation:${particleDrift} ${p=>p.$dur}s linear ${p=>p.$delay}s infinite;
`
const Orb = styled.div<{$size:number;$top:string;$left:string;$delay:number}>`
  position:absolute;width:${p=>p.$size}px;height:${p=>p.$size}px;border-radius:50%;
  background:radial-gradient(circle,rgba(212,168,75,0.1),transparent 70%);
  top:${p=>p.$top};left:${p=>p.$left};pointer-events:none;
  animation:${orbFloat} ${p=>6+p.$delay}s ease-in-out infinite;animation-delay:${p=>p.$delay}s;
`
const HeroContent = styled.div`
  position:relative;z-index:2;text-align:center;max-width:780px;
  display:flex;flex-direction:column;align-items:center;gap:28px;
`
const Headline = styled.h1`
  font-size:clamp(38px,7vw,72px);font-weight:900;line-height:1.1;font-family:${t.font};
  background:linear-gradient(135deg,${t.gold} 0%,${t.goldBright} 35%,#fff 50%,${t.goldBright} 65%,${t.gold} 100%);
  background-size:300% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;
  animation:${gradientShift} 5s ease infinite;
`
const Sub = styled.p`
  font-size:clamp(16px,2.5vw,20px);color:${t.textSec};line-height:1.8;max-width:580px;
  animation:${fadeInUp} 0.6s ease-out 0.15s both;
`
const SocialProof = styled.div`
  display:flex;align-items:center;gap:12px;animation:${fadeInUp} 0.6s ease-out 0.25s both;
`
const AvatarStack = styled.div`display:flex;direction:ltr;`
const Avatar = styled.div<{$i:number;$hue:number}>`
  width:36px;height:36px;border-radius:50%;border:2px solid ${t.bg};
  background:linear-gradient(135deg,hsl(${p=>p.$hue},60%,45%),hsl(${p=>p.$hue+30},60%,55%));
  margin-right:${p=>p.$i>0?'-10px':'0'};position:relative;z-index:${p=>5-p.$i};
  display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;
`
const ProofText = styled.span`font-size:14px;color:${t.textSec};font-weight:500;`
const CTAs = styled.div`
  display:flex;gap:14px;flex-wrap:wrap;justify-content:center;
  animation:${fadeInUp} 0.6s ease-out 0.35s both;
`
const HeroGold = styled(GoldButton).attrs({as:Link})`
  padding:16px 40px;font-size:17px;border-radius:${t.r.full};text-decoration:none !important;
  animation:${glow} 3s ease-in-out infinite;
` as any
const HeroGhost = styled(GhostButton).attrs({as:Link})`
  padding:16px 40px;font-size:17px;border-radius:${t.r.full};text-decoration:none !important;
` as any
const TrustRow = styled.div`
  display:flex;gap:24px;flex-wrap:wrap;justify-content:center;margin-top:8px;
  animation:${fadeInUp} 0.6s ease-out 0.45s both;
`
const TrustBadge = styled.div`
  display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:${t.r.full};
  background:rgba(255,255,255,0.04);border:1px solid ${t.border};font-size:12px;color:${t.textSec};
`

/* ══════ STATS ══════ */
const StatsStrip = styled.section`
  padding:48px 24px;direction:rtl;position:relative;
  background:linear-gradient(135deg,rgba(212,168,75,0.06),rgba(212,168,75,0.02));
  border-top:1px solid ${t.goldBorder};border-bottom:1px solid ${t.goldBorder};
  &::before{content:'';position:absolute;inset:0;
    background:linear-gradient(90deg,transparent,rgba(212,168,75,0.06),transparent);
    background-size:200% 100%;animation:${shimmer} 4s linear infinite;}
`
const StatsGrid = styled.div`
  max-width:1000px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:20px;text-align:center;
  position:relative;z-index:1;
  ${sm}{grid-template-columns:repeat(2,1fr);}
  @media(max-width:480px){grid-template-columns:1fr;}
`
const StatItem = styled(AnimatedCard)`display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px;`
const StatNum = styled.div`font-size:36px;font-weight:900;color:${t.goldBright};font-family:${t.font};`
const StatLabel = styled.div`font-size:14px;color:${t.textSec};font-weight:500;`

/* ══════ HOW IT WORKS ══════ */
const HowSection = styled.section`padding:80px 24px;direction:rtl;position:relative;`
const SectionHead = styled.h2`
  text-align:center;font-size:clamp(26px,4vw,40px);font-weight:800;color:${t.text};
  margin-bottom:56px;font-family:${t.font};animation:${fadeInUp} 0.5s ease-out both;
`
const StepsRow = styled.div`
  max-width:900px;margin:0 auto;display:flex;align-items:flex-start;justify-content:center;gap:20px;
  position:relative;${md}{flex-direction:column;align-items:center;}
`
const StepCard = styled(AnimatedCard)<{$delay:number}>`
  flex:1;max-width:260px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:16px;
  padding:32px 20px;background:${t.surface};border:1px solid ${t.border};border-radius:${t.r.xl};
  transition:all ${t.tr};animation:${slideInLeft} 0.6s ease-out ${p=>p.$delay}s both;
  &:hover{border-color:${t.goldBorder};transform:translateY(-6px);box-shadow:${t.sh.glow};}
`
const StepNum = styled.div`
  width:48px;height:48px;border-radius:50%;
  background:linear-gradient(135deg,${t.gold},${t.goldBright});
  display:flex;align-items:center;justify-content:center;
  font-size:20px;font-weight:900;color:${t.bg};font-family:${t.font};
`
const StepIcon = styled.div`
  width:64px;height:64px;border-radius:${t.r.xl};
  background:linear-gradient(135deg,rgba(212,168,75,0.15),rgba(212,168,75,0.04));
  border:1px solid ${t.goldBorder};display:flex;align-items:center;justify-content:center;
  color:${t.gold};animation:${float} 4s ease-in-out infinite;
`
const Connector = styled.div`
  display:flex;align-items:center;padding-top:60px;color:${t.goldBorder};
  ${md}{display:none;}
`

/* ══════ FEATURES ══════ */
const Features = styled.section`
  padding:80px 24px;direction:rtl;
  background:linear-gradient(180deg,transparent,rgba(212,168,75,0.02),transparent);
`
const FeatGrid = styled.div`
  max-width:1060px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:24px;
  ${md}{grid-template-columns:repeat(2,1fr);}
  ${mobile}{grid-template-columns:1fr;}
`
const Card = styled(AnimatedCard)`
  background:${t.surface};border:1px solid ${t.border};border-radius:${t.r.lg};padding:28px 22px;
  text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px;
  transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};transform:translateY(-4px);box-shadow:${t.sh.glow};}
`
const IconWrap = styled.div`
  width:52px;height:52px;border-radius:${t.r.lg};
  background:linear-gradient(135deg,rgba(212,168,75,0.12),rgba(212,168,75,0.04));
  border:1px solid ${t.goldBorder};display:flex;align-items:center;justify-content:center;
  color:${t.gold};animation:${float} 4s ease-in-out infinite;
`
const CardTitle = styled.h3`font-size:17px;font-weight:700;color:${t.text};font-family:${t.font};`
const CardDesc = styled.p`font-size:13px;color:${t.textSec};line-height:1.7;`

/* ══════ TESTIMONIALS ══════ */
const TestSection = styled.section`padding:80px 24px;direction:rtl;`
const TestGrid = styled.div`
  max-width:1060px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:24px;
  ${md}{grid-template-columns:1fr;}
`
const TestCard = styled(AnimatedCard)`
  background:${t.surface};border:1px solid ${t.border};border-radius:${t.r.xl};padding:28px;
  display:flex;flex-direction:column;gap:16px;transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};box-shadow:${t.sh.glow};}
`
const TestHeader = styled.div`display:flex;align-items:center;gap:12px;`
const TestAvatar = styled.div<{$hue:number}>`
  width:44px;height:44px;border-radius:50%;
  background:linear-gradient(135deg,hsl(${p=>p.$hue},55%,40%),hsl(${p=>p.$hue+30},55%,50%));
  display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;
`
const TestName = styled.div`font-size:15px;font-weight:700;color:${t.text};`
const TestCity = styled.div`font-size:12px;color:${t.textDim};`
const TestStars = styled.div`display:flex;gap:2px;color:${t.goldBright};`
const TestQuote = styled.p`font-size:14px;color:${t.textSec};line-height:1.8;font-style:italic;`

/* ══════ WHATSAPP CTA ══════ */
const WaSection = styled.section`
  padding:64px 24px;direction:rtl;text-align:center;
  background:${t.surface};border-top:1px solid ${t.border};border-bottom:1px solid ${t.border};
`
const WaBtn = styled.a`
  display:inline-flex;align-items:center;gap:10px;padding:16px 40px;border-radius:${t.r.full};
  background:#25D366;color:#fff;font-size:17px;font-weight:700;font-family:${t.font};
  text-decoration:none !important;transition:all ${t.tr};cursor:pointer;
  &:hover{background:#20bd5a;transform:translateY(-2px);box-shadow:0 8px 32px rgba(37,211,102,0.3);}
`
const PhoneLink = styled.a`
  display:inline-flex;align-items:center;gap:6px;color:${t.textSec};font-size:14px;
  text-decoration:none !important;transition:color ${t.tr};margin-top:16px;
  &:hover{color:${t.gold};}
`

/* ══════ FINAL CTA ══════ */
const FinalCTA = styled.section`
  padding:80px 24px;direction:rtl;text-align:center;position:relative;overflow:hidden;
  background:linear-gradient(135deg,rgba(212,168,75,0.1),rgba(212,168,75,0.04));
  border-top:1px solid ${t.goldBorder};
`
const FinalTitle = styled.h2`
  font-size:clamp(26px,4vw,40px);font-weight:900;color:${t.text};margin-bottom:12px;
  font-family:${t.font};animation:${fadeInScale} 0.5s ease-out both;
`
const FinalSub = styled.p`
  font-size:16px;color:${t.textSec};margin-bottom:32px;
  animation:${fadeInUp} 0.5s ease-out 0.15s both;
`
const FinalBtns = styled.div`
  display:flex;gap:14px;justify-content:center;flex-wrap:wrap;
  animation:${fadeInUp} 0.5s ease-out 0.25s both;
`
const CtaLink = styled(GoldButton).attrs({as:Link})`
  padding:16px 36px;font-size:16px;border-radius:${t.r.full};text-decoration:none !important;
` as any
const CtaGhost = styled(GhostButton).attrs({as:Link})`
  padding:16px 36px;font-size:16px;border-radius:${t.r.full};text-decoration:none !important;
` as any

/* ── data ── */
const PARTICLES = Array.from({length:8},(_,i)=>({x:Math.random()*100,size:3+Math.random()*4,dur:8+Math.random()*7,delay:i*1.5}))
const STATS = [
  {value:500,suffix:'+',label:'משקיעים פעילים'},
  {value:850,suffix:'M',label:'₪ שווי חלקות'},
  {value:247,suffix:'%',label:'תשואה ממוצעת'},
  {value:15,suffix:'+',label:'ערים מכוסות'},
]
const STEPS = [
  {num:'1',icon:MapPin,title:'בחרו אזור',desc:'סננו לפי עיר, מחיר ופוטנציאל על מפה אינטראקטיבית'},
  {num:'2',icon:TrendingUp,title:'נתחו השקעה',desc:'קבלו ניתוח AI, נתוני ועדות ותחזית תשואה מדויקת'},
  {num:'3',icon:Zap,title:'התחילו להרוויח',desc:'השאירו פרטים ומומחה קרקע יחזור אליכם תוך שעה'},
]
const FEATURES = [
  {icon:MapPin,title:'מפה אינטראקטיבית',desc:'שכבות גוש/חלקה, סינון מתקדם וצפייה בכל אזור בארץ.'},
  {icon:MessageCircle,title:'יועץ AI חכם',desc:'בינה מלאכותית שמנתחת כל חלקה ומספקת תחזיות מותאמות אישית.'},
  {icon:TrendingUp,title:'נתונים בזמן אמת',desc:'סטטוס ועדות, שומות שמאי, מגמות שוק ונתוני תקן 22.'},
  {icon:Bell,title:'התראות מותאמות',desc:'קבלו התראות מיידיות על שינויי מחיר והזדמנויות חדשות.'},
  {icon:Smartphone,title:'גישה מכל מכשיר',desc:'חוויית שימוש מושלמת במובייל, טאבלט ודסקטופ.'},
  {icon:Briefcase,title:'כלים מקצועיים',desc:'מחשבון תשואה, השוואת חלקות ודוחות PDF לאנשי עסקים.'},
]
const TESTIMONIALS = [
  {name:'יוסי כהן',city:'תל אביב',hue:210,initials:'יכ',quote:'LandMap שינתה לי את הגישה להשקעות קרקע. המידע כאן חסך לי חודשים של מחקר ועשרות אלפי שקלים.',stars:5},
  {name:'מיכל לוי',city:'הרצליה',hue:340,initials:'מל',quote:'הכלי הכי מקצועי שפגשתי בתחום. הנתונים מדויקים, האנליזה של ה-AI פשוט מדהימה, והתמיכה אישית.',stars:5},
  {name:'אבי ברק',city:'ירושלים',hue:150,initials:'אב',quote:'מצאתי חלקה עם פוטנציאל ענק דרך הפלטפורמה. תוך 18 חודשים הכפלתי את ההשקעה. תודה LandMap!',stars:5},
]
const AVATARS = [{initials:'דכ',hue:220},{initials:'רמ',hue:330},{initials:'אל',hue:160},{initials:'שב',hue:30}]

/* ══════ PAGE ══════ */
export default function Landing(){
  const [vis,setVis]=useState(false)
  useEffect(()=>{setVis(true)},[])

  return(
    <PublicLayout>
      <Dark>
        {/* ── Hero ── */}
        <Hero>
          <MeshBg/>
          {PARTICLES.map((p,i)=><Particle key={i} $x={p.x} $size={p.size} $dur={p.dur} $delay={p.delay}/>)}
          <Orb $size={340} $top="8%" $left="3%" $delay={0}/>
          <Orb $size={220} $top="55%" $left="82%" $delay={2}/>
          <Orb $size={160} $top="20%" $left="68%" $delay={4}/>
          <Orb $size={120} $top="70%" $left="15%" $delay={3}/>
          <HeroContent>
            <Headline>המקום שבו קרקע הופכת לזהב</Headline>
            <Sub>פלטפורמת הנדל"ן המובילה בישראל &mdash; מפה אינטראקטיבית, ניתוח AI, נתוני ועדות ותקן 22 במקום אחד</Sub>
            <SocialProof>
              <AvatarStack>
                {AVATARS.map((a,i)=><Avatar key={i} $i={i} $hue={a.hue}>{a.initials}</Avatar>)}
              </AvatarStack>
              <ProofText>מעל 500 משקיעים כבר בפלטפורמה</ProofText>
            </SocialProof>
            <CTAs>
              <HeroGold to="/explore">גלו את ההזדמנויות <ChevronLeft size={18}/></HeroGold>
              <HeroGhost to="/login">הרשמה חינם</HeroGhost>
            </CTAs>
            <TrustRow>
              <TrustBadge><Shield size={14}/> מידע מאובטח</TrustBadge>
              <TrustBadge><FileText size={14}/> נתוני תקן 22</TrustBadge>
              <TrustBadge><Building2 size={14}/> נתוני ועדות</TrustBadge>
            </TrustRow>
          </HeroContent>
        </Hero>

        {/* ── Stats ── */}
        <StatsStrip>
          <StatsGrid>
            {STATS.map((s,i)=>(
              <StatItem key={i} $delay={i*0.1}>
                <StatNum><CountUpNumber value={s.value}/>{s.suffix}</StatNum>
                <StatLabel>{s.label}</StatLabel>
              </StatItem>
            ))}
          </StatsGrid>
        </StatsStrip>

        {/* ── How It Works ── */}
        <HowSection>
          <SectionHead>איך זה עובד?</SectionHead>
          <StepsRow>
            {STEPS.map((s,i)=>(
              <React.Fragment key={i}>
                {i>0 && <Connector><svg width="40" height="2" viewBox="0 0 40 2"><line x1="0" y1="1" x2="40" y2="1" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4"/></svg></Connector>}
                <StepCard $delay={i*0.2}>
                  <StepNum>{s.num}</StepNum>
                  <StepIcon><s.icon size={28}/></StepIcon>
                  <CardTitle>{s.title}</CardTitle>
                  <CardDesc>{s.desc}</CardDesc>
                </StepCard>
              </React.Fragment>
            ))}
          </StepsRow>
        </HowSection>

        {/* ── Features ── */}
        <Features id="features">
          <SectionHead>למה LandMap?</SectionHead>
          <FeatGrid>
            {FEATURES.map((f,i)=>(
              <Card key={i} $delay={i*0.1}>
                <IconWrap><f.icon size={24}/></IconWrap>
                <CardTitle>{f.title}</CardTitle>
                <CardDesc>{f.desc}</CardDesc>
              </Card>
            ))}
          </FeatGrid>
        </Features>

        {/* ── Testimonials ── */}
        <TestSection>
          <SectionHead>מה אומרים המשקיעים שלנו</SectionHead>
          <TestGrid>
            {TESTIMONIALS.map((tt,i)=>(
              <TestCard key={i} $delay={i*0.15}>
                <TestHeader>
                  <TestAvatar $hue={tt.hue}>{tt.initials}</TestAvatar>
                  <div><TestName>{tt.name}</TestName><TestCity>{tt.city}</TestCity></div>
                </TestHeader>
                <TestStars>{Array.from({length:tt.stars}).map((_,j)=><Star key={j} size={16} fill={t.goldBright} strokeWidth={0}/>)}</TestStars>
                <TestQuote>"{tt.quote}"</TestQuote>
              </TestCard>
            ))}
          </TestGrid>
        </TestSection>

        {/* ── WhatsApp ── */}
        <WaSection>
          <SectionHead style={{marginBottom:24}}>רוצים לדבר עם מומחה?</SectionHead>
          <p style={{color:t.textSec,marginBottom:28,fontSize:16}}>צוות מומחי הקרקע שלנו זמין עבורכם לכל שאלה</p>
          <WaBtn href="https://wa.me/9720521234567" target="_blank" rel="noopener">
            <MessageCircle size={22}/> שלח הודעה בוואטסאפ
          </WaBtn>
          <br/>
          <PhoneLink href="tel:052-1234567"><Phone size={15}/> 052-1234567</PhoneLink>
        </WaSection>

        {/* ── Final CTA ── */}
        <FinalCTA>
          <FinalTitle>אל תפספסו את ההזדמנות הבאה</FinalTitle>
          <FinalSub>הצטרפו ל-500+ משקיעים חכמים שכבר מרוויחים עם LandMap</FinalSub>
          <FinalBtns>
            <CtaLink to="/login">הרשמה חינם <ChevronLeft size={16}/></CtaLink>
            <CtaGhost to="/login">כניסה למערכת</CtaGhost>
          </FinalBtns>
        </FinalCTA>
      </Dark>
    </PublicLayout>
  )
}
