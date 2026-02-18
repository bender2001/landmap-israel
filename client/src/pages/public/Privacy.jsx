import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import PublicNav from '../../components/PublicNav'
import PublicFooter from '../../components/PublicFooter'
import { useMetaTags } from '../../hooks/useMetaTags'

export default function Privacy() {
  useMetaTags({
    title: 'מדיניות פרטיות — LandMap Israel',
    description: 'מדיניות הפרטיות של LandMap Israel — כיצד אנו שומרים על המידע שלך.',
    url: `${window.location.origin}/privacy`,
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
              <h1 className="text-3xl font-bold text-slate-100 mb-2">מדיניות פרטיות</h1>
              <p className="text-sm text-slate-500 mb-8">עדכון אחרון: פברואר 2026</p>

              <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">1. מידע שאנו אוספים</h2>
                  <p>
                    אנו אוספים מידע שאתם מוסרים לנו באופן ישיר בעת מילוי טפסי יצירת קשר: שם מלא, מספר טלפון, כתובת אימייל, ותוכן הודעות. בנוסף, אנו אוספים באופן אוטומטי מידע טכני כגון כתובת IP, סוג דפדפן ודפים שנצפו.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">2. שימוש במידע</h2>
                  <p>המידע שנאסף משמש למטרות הבאות:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400 mr-4">
                    <li>יצירת קשר עם גולשים שהשאירו פרטים</li>
                    <li>שיפור חוויית המשתמש והשירותים שלנו</li>
                    <li>ניתוח סטטיסטי של שימוש באתר</li>
                    <li>עמידה בדרישות חוקיות</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">3. שיתוף מידע</h2>
                  <p>
                    איננו מוכרים, משכירים או מעבירים מידע אישי לצדדים שלישיים למטרות שיווקיות. מידע עשוי להיות משותף עם ספקי שירות הפועלים מטעמנו (אחסון, תמיכה טכנית) בכפוף להסכמי סודיות מתאימים.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">4. אבטחת מידע</h2>
                  <p>
                    אנו נוקטים באמצעי אבטחה מקובלים להגנה על המידע האישי שלכם, כולל הצפנת נתונים, אימות דו-שלבי וניטור גישה. עם זאת, אין שיטת העברה או אחסון מקוונת בטוחה ב-100%.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">5. עוגיות (Cookies)</h2>
                  <p>
                    האתר משתמש בעוגיות לצורך שמירת העדפות (כגון מועדפים), שיפור ביצועים וניתוח שימוש. ניתן לנהל את העדפות העוגיות דרך הגדרות הדפדפן שלכם.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">6. זכויות המשתמש</h2>
                  <p>בהתאם לחוק, עומדות לכם הזכויות הבאות:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400 mr-4">
                    <li>זכות לעיין במידע האישי שנאסף אודותיכם</li>
                    <li>זכות לבקש תיקון מידע שגוי</li>
                    <li>זכות לבקש מחיקת המידע האישי שלכם</li>
                    <li>זכות להתנגד לעיבוד המידע</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">7. שמירת מידע</h2>
                  <p>
                    מידע אישי נשמר כל עוד הוא נדרש לצורך המטרות שלשמן נאסף, או כפי שנדרש על פי חוק. ניתן לבקש מחיקת מידע בכל עת.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">8. עדכונים למדיניות</h2>
                  <p>
                    מדיניות זו עשויה להתעדכן מעת לעת. שינויים מהותיים יפורסמו באתר. המשך השימוש לאחר עדכון מהווה הסכמה למדיניות המעודכנת.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">9. יצירת קשר</h2>
                  <p>
                    לשאלות בנושא פרטיות או למימוש זכויותיכם, <Link to="/contact" className="text-gold hover:underline">צרו קשר</Link>.
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
