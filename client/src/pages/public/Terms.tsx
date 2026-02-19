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

const Section = styled.section``

const SectionTitle = styled.h2<{ $accent?: string }>`
  font-size: 18px;
  font-weight: 700;
  color: ${({ $accent }) => $accent || theme.colors.slate[100]};
  margin-bottom: 8px;
`

const SectionText = styled.p`
  margin-bottom: 0;
`

const HighlightBox = styled.div<{ $tone: 'warning' | 'danger' }>`
  border-radius: 12px;
  padding: 16px;
  border: 1px solid ${({ $tone }) => ($tone === 'warning' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)')};
  background: ${({ $tone }) => ($tone === 'warning' ? 'rgba(245, 158, 11, 0.06)' : 'rgba(239, 68, 68, 0.06)')};
`

const HighlightTitle = styled.p<{ $tone: 'warning' | 'danger' }>`
  font-weight: 600;
  color: ${({ $tone }) => ($tone === 'warning' ? '#fbbf24' : '#fca5a5')};
  margin-bottom: 8px;
`

const BulletList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
  color: ${theme.colors.slate[400]};
`

const BulletItem = styled.li`
  display: flex;
  gap: 8px;
`

const BulletMark = styled.span`
  color: ${theme.colors.gold};
  flex-shrink: 0;
`

const InfoBlock = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const InfoItemTitle = styled.h3<{ $color?: string }>`
  font-size: 12px;
  font-weight: 700;
  color: ${({ $color }) => $color || theme.colors.gold};
  margin-bottom: 4px;
`

const InfoItemText = styled.p`
  font-size: 12px;
  color: ${theme.colors.slate[400]};
  line-height: 1.7;
`

const InlineLink = styled(Link)`
  color: ${theme.colors.gold};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const InlineStrong = styled.strong`
  color: ${theme.colors.slate[200]};
`

const LawList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 12px;
  color: ${theme.colors.slate[400]};
`

const LawItem = styled.li`
  display: flex;
  gap: 8px;
`

const LawIcon = styled.span`
  color: ${theme.colors.gold};
  flex-shrink: 0;
`

export default function Terms() {
  useMetaTags({
    title: 'תנאי שימוש — LandMap Israel',
    description: 'תנאי השימוש באתר LandMap Israel — פלטפורמה דיגיטלית להשקעות קרקע. מקורות מידע, אחריות, ופרטיות.',
    url: `${window.location.origin}/terms`,
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
              <Title>תנאי שימוש</Title>
              <Updated>עדכון אחרון: פברואר 2026</Updated>

              <SectionList>
                <Section>
                  <SectionTitle>1. כללי</SectionTitle>
                  <SectionText>
                    ברוכים הבאים לאתר LandMap Israel (להלן: &quot;האתר&quot; או &quot;השירות&quot;). השימוש באתר כפוף לתנאי השימוש המפורטים להלן. גלישה באתר מהווה הסכמה לתנאים אלו. האתר מופעל על-ידי LandMap Israel (להלן: &quot;החברה&quot;).
                  </SectionText>
                </Section>

                <Section>
                  <SectionTitle>2. השירותים</SectionTitle>
                  <SectionText>
                    האתר מספק פלטפורמה דיגיטלית להצגת מידע על קרקעות להשקעה בישראל, כולל נתונים תכנוניים, פיננסיים ומיקומיים, נתוני עסקאות מנדל&quot;ן נט, מידע תכנוני ממנהל התכנון, ומידע קדסטרלי. המידע המוצג באתר הינו לצורך מידע כללי בלבד ואינו מהווה ייעוץ השקעות, ייעוץ משפטי או ייעוץ מקצועי מכל סוג.
                  </SectionText>
                </Section>

                <Section>
                  <SectionTitle $accent={theme.colors.gold}>3. מקורות מידע וייחוס</SectionTitle>
                  <SectionText>
                    האתר משתמש במידע ממקורות ממשלתיים ציבוריים. להלן פירוט המקורות ותנאי השימוש בהם:
                  </SectionText>
                  <InfoBlock>
                    <div>
                      <InfoItemTitle>3.1 נדל&quot;ן נט (nadlan.gov.il) — משרד המשפטים</InfoItemTitle>
                      <InfoItemText>
                        נתוני עסקאות נדל&quot;ן מתפרסמים על-ידי משרד המשפטים באמצעות מערכת נדל&quot;ן נט. מדובר במידע ציבורי המתעדכן באופן שוטף. הנתונים כוללים מחירי עסקאות, תאריכים, כתובות, גוש/חלקה, ושטח. ייתכנו עיכובים של מספר חודשים בין ביצוע העסקה לפרסומה.
                      </InfoItemText>
                    </div>
                    <div>
                      <InfoItemTitle $color="#60a5fa">3.2 מנהל התכנון — GovMap (govmap.gov.il)</InfoItemTitle>
                      <InfoItemText>
                        נתוני תכניות בניין עיר (תב&quot;עות) מתפרסמים על-ידי מנהל התכנון במשרד הפנים. המידע הינו ברשות הציבור (Public Domain) וכולל סטטוס תכניות, ייעודי קרקע, יחידות דיור מתוכננות, ותאריכי אישור/הפקדה. המידע עשוי להתעדכן ללא הודעה מוקדמת.
                      </InfoItemText>
                    </div>
                    <div>
                      <InfoItemTitle $color="#a78bfa">3.3 רשם המקרקעין (טאבו) — משרד המשפטים</InfoItemTitle>
                      <InfoItemText>
                        מידע מרשם המקרקעין (טאבו) הינו מידע ציבורי בהתאם לחוק המקרקעין, תשכ&quot;ט-1969, סעיף 119. השימוש במידע זה חייב לכלול ייחוס למקור. גישה מלאה לנתוני טאבו דורשת מנוי בתשלום מרשם המקרקעין.
                      </InfoItemText>
                    </div>
                  </InfoBlock>
                </Section>

                <Section>
                  <SectionTitle>4. דיוק הנתונים</SectionTitle>
                  <HighlightBox $tone="warning">
                    <HighlightTitle $tone="warning">⚠️ אזהרה חשובה בנוגע לדיוק נתונים</HighlightTitle>
                    <BulletList>
                      <BulletItem><BulletMark>•</BulletMark><span><InlineStrong>נדל&quot;ן נט:</InlineStrong> נתוני עסקאות עשויים להתפרסם בעיכוב של 3-12 חודשים. ייתכנו אי-דיוקים בשטח, כתובת, או סוג עסקה.</span></BulletItem>
                      <BulletItem><BulletMark>•</BulletMark><span><InlineStrong>מנהל התכנון:</InlineStrong> סטטוס תכניות עשוי להשתנות בין מועד הפרסום למועד הצפייה. לאימות עדכני — פנו ישירות לוועדה לתכנון ובנייה.</span></BulletItem>
                      <BulletItem><BulletMark>•</BulletMark><span><InlineStrong>טאבו:</InlineStrong> לאימות בעלות וזכויות — יש לבצע בדיקה ישירה ברשם המקרקעין או באמצעות עו&quot;ד.</span></BulletItem>
                      <BulletItem><BulletMark>•</BulletMark><span><InlineStrong>הערכות שווי:</InlineStrong> כל הערכות השווי, תחזיות תשואה, וחישובי ROI באתר הם הערכות בלבד ואינם מבטיחים תוצאות בפועל.</span></BulletItem>
                      <BulletItem><BulletMark>•</BulletMark><span><InlineStrong>מחירים:</InlineStrong> כל המחירים באתר מוצגים בש&quot;ח (₪). שטחים מוצגים במ&quot;ר ודונם (1 דונם = 1,000 מ&quot;ר).</span></BulletItem>
                    </BulletList>
                  </HighlightBox>
                </Section>

                <Section>
                  <SectionTitle $accent="#f87171">5. אי-מתן ייעוץ השקעות — אזהרת סיכונים</SectionTitle>
                  <HighlightBox $tone="danger">
                    <HighlightTitle $tone="danger">🚫 המידע באתר אינו מהווה ייעוץ השקעות</HighlightTitle>
                    <BulletList>
                      <BulletItem>
                        <span>
                          בהתאם ל<InlineStrong>חוק ניירות ערך, תשכ&quot;ח-1968</InlineStrong> ו<InlineStrong>חוק הסדרת העיסוק בייעוץ השקעות, בשיווק השקעות ובניהול תיקי השקעות, תשנ&quot;ה-1995</InlineStrong>, אנו מבהירים כי:
                        </span>
                      </BulletItem>
                      <BulletItem><BulletMark>•</BulletMark><span>אין לראות במידע המוצג באתר, לרבות נתוני תשואה, תחזיות, הערכות שווי, וניתוחים פיננסיים, משום המלצה או ייעוץ להשקעה.</span></BulletItem>
                      <BulletItem><BulletMark>•</BulletMark><span>השקעה בקרקעות כרוכה בסיכונים, כולל אובדן ההשקעה כולה. אין ערובה לתשואה או לרווח.</span></BulletItem>
                      <BulletItem><BulletMark>•</BulletMark><span>כל החלטת השקעה צריכה להתבצע לאחר התייעצות עם אנשי מקצוע מוסמכים: עו&quot;ד, שמאי מקרקעין, יועץ מס, ויועץ השקעות בעל רישיון.</span></BulletItem>
                      <BulletItem><BulletMark>•</BulletMark><span>החברה אינה מחזיקה ברישיון לייעוץ השקעות, שיווק השקעות, או ניהול תיקים.</span></BulletItem>
                      <BulletItem><BulletMark>•</BulletMark><span>תשואות עבר אינן מעידות על תשואות עתידיות.</span></BulletItem>
                      <BulletItem><BulletMark>•</BulletMark><span>חישובי רווח, מיסים (מס רכישה, מס שבח, היטל השבחה), ועלויות נלוות הם הערכות בלבד ועשויים להשתנות.</span></BulletItem>
                    </BulletList>
                  </HighlightBox>
                </Section>

                <Section>
                  <SectionTitle>6. רגולציה ודיני מקרקעין</SectionTitle>
                  <SectionText>עסקאות מקרקעין בישראל כפופות לחוקים הבאים (בין היתר):</SectionText>
                  <LawList>
                    <LawItem>
                      <LawIcon>⚖️</LawIcon>
                      <span><InlineStrong>חוק המקרקעין, תשכ&quot;ט-1969</InlineStrong> — מסדיר בעלות, רישום, והעברת זכויות במקרקעין. סעיף 7 קובע כי עסקה במקרקעין טעונה רישום. סעיף 119 מאפשר עיון במרשם המקרקעין.</span>
                    </LawItem>
                    <LawItem>
                      <LawIcon>⚖️</LawIcon>
                      <span><InlineStrong>חוק מיסוי מקרקעין (שבח ורכישה), תשכ&quot;ג-1963</InlineStrong> — מס רכישה (6% לקרקע חקלאית), מס שבח (25% על רווח ריאלי), היטל השבחה (50% מעליית ערך בגין תב&quot;ע).</span>
                    </LawItem>
                    <LawItem>
                      <LawIcon>⚖️</LawIcon>
                      <span><InlineStrong>חוק התכנון והבנייה, תשכ&quot;ה-1965</InlineStrong> — מסדיר תכניות בניין עיר (תב&quot;עות), היתרי בנייה, שינויי ייעוד קרקע, וועדות תכנון.</span>
                    </LawItem>
                    <LawItem>
                      <LawIcon>⚖️</LawIcon>
                      <span><InlineStrong>חוק ניירות ערך, תשכ&quot;ח-1968</InlineStrong> — רלוונטי במקרה של הצעה לציבור של זכויות במקרקעין או קרנות נדל&quot;ן.</span>
                    </LawItem>
                    <LawItem>
                      <LawIcon>⚖️</LawIcon>
                      <span><InlineStrong>חוק רשות מקרקעי ישראל (רמ&quot;י)</InlineStrong> — רוב הקרקעות בישראל (93%) בבעלות רמ&quot;י. חכירה ארוכת טווח היא הנורמה, לא בעלות פרטית מלאה.</span>
                    </LawItem>
                  </LawList>
                </Section>

                <Section>
                  <SectionTitle>7. מנויים ותשלומים</SectionTitle>
                  <SectionText>
                    האתר מציע תוכניות מנוי ברמות שונות (חינם, בסיסי, מקצועי, ארגוני). לפרטים מלאים ראו את <InlineLink to="/pricing">עמוד המחירים</InlineLink>.
                  </SectionText>
                  <BulletList>
                    <BulletItem><BulletMark>•</BulletMark><span>תוכנית חינמית אינה דורשת כרטיס אשראי.</span></BulletItem>
                    <BulletItem><BulletMark>•</BulletMark><span>ביטול מנוי בתשלום אפשרי בכל עת. המנוי יישאר פעיל עד סוף תקופת החיוב.</span></BulletItem>
                    <BulletItem><BulletMark>•</BulletMark><span>מחירים אינם כוללים מע&quot;מ (17%).</span></BulletItem>
                    <BulletItem><BulletMark>•</BulletMark><span>החברה שומרת לעצמה את הזכות לשנות מחירים בהודעה של 30 יום מראש.</span></BulletItem>
                  </BulletList>
                </Section>

                <Section>
                  <SectionTitle>8. מידע אישי ופרטיות</SectionTitle>
                  <SectionText>
                    פרטים אישיים שנמסרים דרך האתר (טפסי יצירת קשר, הרשמה, לידים) משמשים אך ורק ליצירת קשר ולמתן השירות. איננו מעבירים מידע אישי לצדדים שלישיים ללא הסכמה. בהתאם ל<InlineStrong>חוק הגנת הפרטיות, תשמ&quot;א-1981</InlineStrong> ותקנות הגנת הפרטיות. למידע נוסף ראו את <InlineLink to="/privacy">מדיניות הפרטיות</InlineLink>.
                  </SectionText>
                </Section>

                <Section>
                  <SectionTitle>9. קניין רוחני</SectionTitle>
                  <SectionText>
                    כל התכנים באתר, לרבות טקסטים, עיצובים, תמונות, ניתוחים ונתונים מעובדים, מוגנים בזכויות יוצרים. נתונים ממקורות ממשלתיים מוצגים תחת רישיון שימוש ציבורי עם ייחוס למקור המקורי. אין להעתיק, לשכפל או להפיץ תכנים מהאתר ללא אישור מראש בכתב.
                  </SectionText>
                </Section>

                <Section>
                  <SectionTitle>10. הגבלת אחריות</SectionTitle>
                  <SectionText>
                    האתר מוצע &quot;כמות שהוא&quot; (AS IS). אנו עושים מאמצים לוודא את דיוק המידע אך אינם אחראים לטעויות, אי-דיוקים, עיכובים בעדכון, או נזקים הנובעים מהסתמכות על המידע באתר. בפרט, אין אנו אחראים לנזק כלכלי הנובע מהחלטות השקעה שהתבססו על המידע באתר.
                  </SectionText>
                </Section>

                <Section>
                  <SectionTitle>11. שינויים בתנאים</SectionTitle>
                  <SectionText>
                    אנו שומרים לעצמנו את הזכות לעדכן תנאים אלו מעת לעת. המשך השימוש באתר לאחר עדכון מהווה הסכמה לתנאים המעודכנים. שינויים מהותיים יפורסמו באתר 14 ימים מראש.
                  </SectionText>
                </Section>

                <Section>
                  <SectionTitle>12. דין חל וסמכות שיפוט</SectionTitle>
                  <SectionText>
                    תנאי שימוש אלו כפופים לדיני מדינת ישראל. סמכות השיפוט הבלעדית נתונה לבתי המשפט בתל אביב-יפו.
                  </SectionText>
                </Section>

                <Section>
                  <SectionTitle>13. יצירת קשר</SectionTitle>
                  <SectionText>
                    לכל שאלה בנוגע לתנאי השימוש, מדיניות הפרטיות, או מקורות הנתונים, אנא <InlineLink to="/contact">צרו קשר</InlineLink>.
                  </SectionText>
                </Section>
              </SectionList>
            </CardBody>
          </Card>
        </Inner>
      </Content>

      <PublicFooter />
    </Page>
  )
}
