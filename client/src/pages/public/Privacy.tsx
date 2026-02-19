import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { ArrowRight } from 'lucide-react'
import PublicNav from '../../components/PublicNav'
import PublicFooter from '../../components/PublicFooter'
import { useMetaTags } from '../../hooks/useSEO'
import { theme, media } from '../../styles/theme'

const Page = styled.div`
  min-height: 100vh;
  background: ${theme.colors.navy};
  direction: rtl;
`

const Content = styled.div`
  padding: 112px 16px 64px;
`

const Inner = styled.div`
  max-width: 48rem;
  margin: 0 auto;
`

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: ${theme.colors.slate[400]};
  text-decoration: none;
  margin-bottom: 24px;
  transition: color ${theme.transitions.normal};

  &:hover {
    color: ${theme.colors.gold};
  }
`

const Card = styled.div`
  background: ${theme.glass.bg};
  backdrop-filter: ${theme.glass.blur};
  -webkit-backdrop-filter: ${theme.glass.blur};
  border: ${theme.glass.border};
  border-radius: ${theme.radii.lg};
  box-shadow: ${theme.shadows.glass};
  overflow: hidden;
`

const CardBar = styled.div`
  height: 3px;
  background: linear-gradient(90deg, #C8942A, #E5B94E, #F0D078, #E5B94E, #C8942A);
`

const CardBody = styled.div`
  padding: 24px;

  ${media.sm} {
    padding: 32px;
  }
`

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
  margin-bottom: 8px;
`

const Updated = styled.p`
  font-size: 12px;
  color: ${theme.colors.slate[500]};
  margin-bottom: 32px;
`

const SectionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  font-size: 14px;
  color: ${theme.colors.slate[300]};
  line-height: 1.8;
`

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
  margin-bottom: 8px;
`

const Paragraph = styled.p`
  margin: 0;
`

const BulletList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 12px 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: ${theme.colors.slate[400]};
`

const BulletItem = styled.li`
  display: flex;
  gap: 8px;
`

const BulletDot = styled.span`
  color: ${theme.colors.gold};
  flex-shrink: 0;
`

const InlineLink = styled(Link)`
  color: ${theme.colors.gold};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

export default function Privacy() {
  useMetaTags({
    title: 'מדיניות פרטיות — LandMap Israel',
    description: 'מדיניות הפרטיות של LandMap Israel — כיצד אנו שומרים על המידע שלך.',
    url: `${window.location.origin}/privacy`,
  })

  return (
    <Page>
      <PublicNav />

      <Content>
        <Inner>
          <BackLink to="/about">
            <ArrowRight size={16} />
            חזרה
          </BackLink>

          <Card>
            <CardBar />
            <CardBody>
              <Title>מדיניות פרטיות</Title>
              <Updated>עדכון אחרון: פברואר 2026</Updated>

              <SectionList>
                <section>
                  <SectionTitle>1. מידע שאנו אוספים</SectionTitle>
                  <Paragraph>
                    אנו אוספים מידע שאתם מוסרים לנו באופן ישיר בעת מילוי טפסי יצירת קשר: שם מלא, מספר טלפון, כתובת אימייל, ותוכן הודעות. בנוסף, אנו אוספים באופן אוטומטי מידע טכני כגון כתובת IP, סוג דפדפן ודפים שנצפו.
                  </Paragraph>
                </section>

                <section>
                  <SectionTitle>2. שימוש במידע</SectionTitle>
                  <Paragraph>המידע שנאסף משמש למטרות הבאות:</Paragraph>
                  <BulletList>
                    <BulletItem><BulletDot>•</BulletDot><span>יצירת קשר עם גולשים שהשאירו פרטים</span></BulletItem>
                    <BulletItem><BulletDot>•</BulletDot><span>שיפור חוויית המשתמש והשירותים שלנו</span></BulletItem>
                    <BulletItem><BulletDot>•</BulletDot><span>ניתוח סטטיסטי של שימוש באתר</span></BulletItem>
                    <BulletItem><BulletDot>•</BulletDot><span>עמידה בדרישות חוקיות</span></BulletItem>
                  </BulletList>
                </section>

                <section>
                  <SectionTitle>3. שיתוף מידע</SectionTitle>
                  <Paragraph>
                    איננו מוכרים, משכירים או מעבירים מידע אישי לצדדים שלישיים למטרות שיווקיות. מידע עשוי להיות משותף עם ספקי שירות הפועלים מטעמנו (אחסון, תמיכה טכנית) בכפוף להסכמי סודיות מתאימים.
                  </Paragraph>
                </section>

                <section>
                  <SectionTitle>4. אבטחת מידע</SectionTitle>
                  <Paragraph>
                    אנו נוקטים באמצעי אבטחה מקובלים להגנה על המידע האישי שלכם, כולל הצפנת נתונים, אימות דו-שלבי וניטור גישה. עם זאת, אין שיטת העברה או אחסון מקוונת בטוחה ב-100%.
                  </Paragraph>
                </section>

                <section>
                  <SectionTitle>5. עוגיות (Cookies)</SectionTitle>
                  <Paragraph>
                    האתר משתמש בעוגיות לצורך שמירת העדפות (כגון מועדפים), שיפור ביצועים וניתוח שימוש. ניתן לנהל את העדפות העוגיות דרך הגדרות הדפדפן שלכם.
                  </Paragraph>
                </section>

                <section>
                  <SectionTitle>6. זכויות המשתמש</SectionTitle>
                  <Paragraph>בהתאם לחוק, עומדות לכם הזכויות הבאות:</Paragraph>
                  <BulletList>
                    <BulletItem><BulletDot>•</BulletDot><span>זכות לעיין במידע האישי שנאסף אודותיכם</span></BulletItem>
                    <BulletItem><BulletDot>•</BulletDot><span>זכות לבקש תיקון מידע שגוי</span></BulletItem>
                    <BulletItem><BulletDot>•</BulletDot><span>זכות לבקש מחיקת המידע האישי שלכם</span></BulletItem>
                    <BulletItem><BulletDot>•</BulletDot><span>זכות להתנגד לעיבוד המידע</span></BulletItem>
                  </BulletList>
                </section>

                <section>
                  <SectionTitle>7. שמירת מידע</SectionTitle>
                  <Paragraph>
                    מידע אישי נשמר כל עוד הוא נדרש לצורך המטרות שלשמן נאסף, או כפי שנדרש על פי חוק. ניתן לבקש מחיקת מידע בכל עת.
                  </Paragraph>
                </section>

                <section>
                  <SectionTitle>8. עדכונים למדיניות</SectionTitle>
                  <Paragraph>
                    מדיניות זו עשויה להתעדכן מעת לעת. שינויים מהותיים יפורסמו באתר. המשך השימוש לאחר עדכון מהווה הסכמה למדיניות המעודכנת.
                  </Paragraph>
                </section>

                <section>
                  <SectionTitle>9. יצירת קשר</SectionTitle>
                  <Paragraph>
                    לשאלות בנושא פרטיות או למימוש זכויותיכם, <InlineLink to="/contact">צרו קשר</InlineLink>.
                  </Paragraph>
                </section>
              </SectionList>
            </CardBody>
          </Card>
        </Inner>
      </Content>

      <PublicFooter />
    </Page>
  )
}
