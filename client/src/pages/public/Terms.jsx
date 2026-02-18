import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import PublicNav from '../../components/PublicNav'
import PublicFooter from '../../components/PublicFooter'
import { useMetaTags } from '../../hooks/useMetaTags'

export default function Terms() {
  useMetaTags({
    title: 'תנאי שימוש — LandMap Israel',
    description: 'תנאי השימוש באתר LandMap Israel — פלטפורמה דיגיטלית להשקעות קרקע. מקורות מידע, אחריות, ופרטיות.',
    url: `${window.location.origin}/terms`,
  })

  return (
    <div className="min-h-screen bg-navy" dir="rtl">
      <PublicNav />

      <div className="pt-28 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <Link to="/about" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-gold transition mb-6">
            <ArrowRight className="w-4 h-4" />
            חזרה
          </Link>

          <div className="glass-panel p-0 overflow-hidden">
            <div
              className="h-[3px]"
              style={{ background: 'linear-gradient(90deg, #C8942A, #E5B94E, #F0D078, #E5B94E, #C8942A)' }}
            />
            <div className="p-6 sm:p-8">
              <h1 className="text-3xl font-bold text-slate-100 mb-2">תנאי שימוש</h1>
              <p className="text-sm text-slate-500 mb-8">עדכון אחרון: פברואר 2026</p>

              <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">1. כללי</h2>
                  <p>
                    ברוכים הבאים לאתר LandMap Israel (להלן: &quot;האתר&quot; או &quot;השירות&quot;). השימוש באתר כפוף לתנאי השימוש המפורטים להלן. גלישה באתר מהווה הסכמה לתנאים אלו. האתר מופעל על-ידי LandMap Israel (להלן: &quot;החברה&quot;).
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">2. השירותים</h2>
                  <p>
                    האתר מספק פלטפורמה דיגיטלית להצגת מידע על קרקעות להשקעה בישראל, כולל נתונים תכנוניים, פיננסיים ומיקומיים, נתוני עסקאות מנדל&quot;ן נט, מידע תכנוני ממנהל התכנון, ומידע קדסטרלי. המידע המוצג באתר הינו לצורך מידע כללי בלבד ואינו מהווה ייעוץ השקעות, ייעוץ משפטי או ייעוץ מקצועי מכל סוג.
                  </p>
                </section>

                {/* ──────── DATA SOURCE ATTRIBUTION ──────── */}
                <section>
                  <h2 className="text-lg font-bold text-gold mb-2">3. מקורות מידע וייחוס</h2>
                  <p className="mb-3">
                    האתר משתמש במידע ממקורות ממשלתיים ציבוריים. להלן פירוט המקורות ותנאי השימוש בהם:
                  </p>

                  <div className="space-y-4 bg-white/[0.02] border border-white/5 rounded-xl p-4">
                    <div>
                      <h3 className="text-sm font-bold text-gold/90 mb-1">3.1 נדל&quot;ן נט (nadlan.gov.il) — משרד המשפטים</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        נתוני עסקאות נדל&quot;ן מתפרסמים על-ידי משרד המשפטים באמצעות מערכת נדל&quot;ן נט. מדובר במידע ציבורי המתעדכן באופן שוטף. הנתונים כוללים מחירי עסקאות, תאריכים, כתובות, גוש/חלקה, ושטח. ייתכנו עיכובים של מספר חודשים בין ביצוע העסקה לפרסומה.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-blue-400/90 mb-1">3.2 מנהל התכנון — GovMap (govmap.gov.il)</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        נתוני תכניות בניין עיר (תב&quot;עות) מתפרסמים על-ידי מנהל התכנון במשרד הפנים. המידע הינו ברשות הציבור (Public Domain) וכולל סטטוס תכניות, ייעודי קרקע, יחידות דיור מתוכננות, ותאריכי אישור/הפקדה. המידע עשוי להתעדכן ללא הודעה מוקדמת.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-purple-400/90 mb-1">3.3 רשם המקרקעין (טאבו) — משרד המשפטים</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        מידע מרשם המקרקעין (טאבו) הינו מידע ציבורי בהתאם לחוק המקרקעין, תשכ&quot;ט-1969, סעיף 119. השימוש במידע זה חייב לכלול ייחוס למקור. גישה מלאה לנתוני טאבו דורשת מנוי בתשלום מרשם המקרקעין.
                      </p>
                    </div>
                  </div>
                </section>

                {/* ──────── DATA ACCURACY DISCLAIMER ──────── */}
                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">4. דיוק הנתונים</h2>
                  <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4">
                    <p className="font-medium text-amber-300 mb-2">⚠️ אזהרה חשובה בנוגע לדיוק נתונים</p>
                    <ul className="space-y-1.5 text-xs text-slate-400">
                      <li>• <strong>נדל&quot;ן נט:</strong> נתוני עסקאות עשויים להתפרסם בעיכוב של 3-12 חודשים. ייתכנו אי-דיוקים בשטח, כתובת, או סוג עסקה.</li>
                      <li>• <strong>מנהל התכנון:</strong> סטטוס תכניות עשוי להשתנות בין מועד הפרסום למועד הצפייה. לאימות עדכני — פנו ישירות לוועדה לתכנון ובנייה.</li>
                      <li>• <strong>טאבו:</strong> לאימות בעלות וזכויות — יש לבצע בדיקה ישירה ברשם המקרקעין או באמצעות עו&quot;ד.</li>
                      <li>• <strong>הערכות שווי:</strong> כל הערכות השווי, תחזיות תשואה, וחישובי ROI באתר הם הערכות בלבד ואינם מבטיחים תוצאות בפועל.</li>
                      <li>• <strong>מחירים:</strong> כל המחירים באתר מוצגים בש&quot;ח (₪). שטחים מוצגים במ&quot;ר ודונם (1 דונם = 1,000 מ&quot;ר).</li>
                    </ul>
                  </div>
                </section>

                {/* ──────── INVESTMENT RISK DISCLAIMER ──────── */}
                <section>
                  <h2 className="text-lg font-bold text-red-400 mb-2">5. אי-מתן ייעוץ השקעות — אזהרת סיכונים</h2>
                  <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-4">
                    <p className="font-medium text-red-300 mb-3">🚫 המידע באתר אינו מהווה ייעוץ השקעות</p>
                    <div className="space-y-2 text-xs text-slate-400">
                      <p>
                        בהתאם ל<strong>חוק ניירות ערך, תשכ&quot;ח-1968</strong> ו<strong>חוק הסדרת העיסוק בייעוץ השקעות, בשיווק השקעות ובניהול תיקי השקעות, תשנ&quot;ה-1995</strong>, אנו מבהירים כי:
                      </p>
                      <ul className="space-y-1.5">
                        <li>• אין לראות במידע המוצג באתר, לרבות נתוני תשואה, תחזיות, הערכות שווי, וניתוחים פיננסיים, משום המלצה או ייעוץ להשקעה.</li>
                        <li>• השקעה בקרקעות כרוכה בסיכונים, כולל אובדן ההשקעה כולה. אין ערובה לתשואה או לרווח.</li>
                        <li>• כל החלטת השקעה צריכה להתבצע לאחר התייעצות עם אנשי מקצוע מוסמכים: עו&quot;ד, שמאי מקרקעין, יועץ מס, ויועץ השקעות בעל רישיון.</li>
                        <li>• החברה אינה מחזיקה ברישיון לייעוץ השקעות, שיווק השקעות, או ניהול תיקים.</li>
                        <li>• תשואות עבר אינן מעידות על תשואות עתידיות.</li>
                        <li>• חישובי רווח, מיסים (מס רכישה, מס שבח, היטל השבחה), ועלויות נלוות הם הערכות בלבד ועשויים להשתנות.</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* ──────── ISRAELI REAL ESTATE LAW ──────── */}
                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">6. רגולציה ודיני מקרקעין</h2>
                  <p className="mb-3">
                    עסקאות מקרקעין בישראל כפופות לחוקים הבאים (בין היתר):
                  </p>
                  <ul className="space-y-2 text-xs text-slate-400">
                    <li className="flex gap-2">
                      <span className="text-gold flex-shrink-0">⚖️</span>
                      <span><strong>חוק המקרקעין, תשכ&quot;ט-1969</strong> — מסדיר בעלות, רישום, והעברת זכויות במקרקעין. סעיף 7 קובע כי עסקה במקרקעין טעונה רישום. סעיף 119 מאפשר עיון במרשם המקרקעין.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-gold flex-shrink-0">⚖️</span>
                      <span><strong>חוק מיסוי מקרקעין (שבח ורכישה), תשכ&quot;ג-1963</strong> — מס רכישה (6% לקרקע חקלאית), מס שבח (25% על רווח ריאלי), היטל השבחה (50% מעליית ערך בגין תב&quot;ע).</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-gold flex-shrink-0">⚖️</span>
                      <span><strong>חוק התכנון והבנייה, תשכ&quot;ה-1965</strong> — מסדיר תכניות בניין עיר (תב&quot;עות), היתרי בנייה, שינויי ייעוד קרקע, וועדות תכנון.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-gold flex-shrink-0">⚖️</span>
                      <span><strong>חוק ניירות ערך, תשכ&quot;ח-1968</strong> — רלוונטי במקרה של הצעה לציבור של זכויות במקרקעין או קרנות נדל&quot;ן.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-gold flex-shrink-0">⚖️</span>
                      <span><strong>חוק רשות מקרקעי ישראל (רמ&quot;י)</strong> — רוב הקרקעות בישראל (93%) בבעלות רמ&quot;י. חכירה ארוכת טווח היא הנורמה, לא בעלות פרטית מלאה.</span>
                    </li>
                  </ul>
                </section>

                {/* ──────── SUBSCRIPTION & PAYMENTS ──────── */}
                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">7. מנויים ותשלומים</h2>
                  <p className="mb-2">
                    האתר מציע תוכניות מנוי ברמות שונות (חינם, בסיסי, מקצועי, ארגוני). לפרטים מלאים ראו את <Link to="/pricing" className="text-gold hover:underline">עמוד המחירים</Link>.
                  </p>
                  <ul className="space-y-1 text-xs text-slate-400">
                    <li>• תוכנית חינמית אינה דורשת כרטיס אשראי.</li>
                    <li>• ביטול מנוי בתשלום אפשרי בכל עת. המנוי יישאר פעיל עד סוף תקופת החיוב.</li>
                    <li>• מחירים אינם כוללים מע&quot;מ (17%).</li>
                    <li>• החברה שומרת לעצמה את הזכות לשנות מחירים בהודעה של 30 יום מראש.</li>
                  </ul>
                </section>

                {/* ──────── PRIVACY ──────── */}
                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">8. מידע אישי ופרטיות</h2>
                  <p>
                    פרטים אישיים שנמסרים דרך האתר (טפסי יצירת קשר, הרשמה, לידים) משמשים אך ורק ליצירת קשר ולמתן השירות. איננו מעבירים מידע אישי לצדדים שלישיים ללא הסכמה. בהתאם ל<strong>חוק הגנת הפרטיות, תשמ&quot;א-1981</strong> ותקנות הגנת הפרטיות. למידע נוסף ראו את <Link to="/privacy" className="text-gold hover:underline">מדיניות הפרטיות</Link>.
                  </p>
                </section>

                {/* ──────── IP ──────── */}
                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">9. קניין רוחני</h2>
                  <p>
                    כל התכנים באתר, לרבות טקסטים, עיצובים, תמונות, ניתוחים ונתונים מעובדים, מוגנים בזכויות יוצרים. נתונים ממקורות ממשלתיים מוצגים תחת רישיון שימוש ציבורי עם ייחוס למקור המקורי. אין להעתיק, לשכפל או להפיץ תכנים מהאתר ללא אישור מראש בכתב.
                  </p>
                </section>

                {/* ──────── LIABILITY ──────── */}
                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">10. הגבלת אחריות</h2>
                  <p>
                    האתר מוצע &quot;כמות שהוא&quot; (AS IS). אנו עושים מאמצים לוודא את דיוק המידע אך אינם אחראים לטעויות, אי-דיוקים, עיכובים בעדכון, או נזקים הנובעים מהסתמכות על המידע באתר. בפרט, אין אנו אחראים לנזק כלכלי הנובע מהחלטות השקעה שהתבססו על המידע באתר.
                  </p>
                </section>

                {/* ──────── CHANGES ──────── */}
                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">11. שינויים בתנאים</h2>
                  <p>
                    אנו שומרים לעצמנו את הזכות לעדכן תנאים אלו מעת לעת. המשך השימוש באתר לאחר עדכון מהווה הסכמה לתנאים המעודכנים. שינויים מהותיים יפורסמו באתר 14 ימים מראש.
                  </p>
                </section>

                {/* ──────── GOVERNING LAW ──────── */}
                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">12. דין חל וסמכות שיפוט</h2>
                  <p>
                    תנאי שימוש אלו כפופים לדיני מדינת ישראל. סמכות השיפוט הבלעדית נתונה לבתי המשפט בתל אביב-יפו.
                  </p>
                </section>

                {/* ──────── CONTACT ──────── */}
                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">13. יצירת קשר</h2>
                  <p>
                    לכל שאלה בנוגע לתנאי השימוש, מדיניות הפרטיות, או מקורות הנתונים, אנא <Link to="/contact" className="text-gold hover:underline">צרו קשר</Link>.
                  </p>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  )
}
