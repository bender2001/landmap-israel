import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import PublicNav from '../../components/PublicNav'

export default function Terms() {
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
                    ברוכים הבאים לאתר LandMap (להלן: &quot;האתר&quot;). השימוש באתר כפוף לתנאי השימוש המפורטים להלן. גלישה באתר מהווה הסכמה לתנאים אלו.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">2. השירותים</h2>
                  <p>
                    האתר מספק פלטפורמה דיגיטלית להצגת מידע על קרקעות להשקעה בישראל, כולל נתונים תכנוניים, פיננסיים ומיקומיים. המידע המוצג באתר הינו לצורך מידע כללי בלבד ואינו מהווה ייעוץ השקעות, ייעוץ משפטי או ייעוץ מקצועי מכל סוג.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">3. אי-מתן ייעוץ</h2>
                  <p>
                    אין לראות במידע המוצג באתר, לרבות נתוני תשואה, תחזיות והערכות שווי, משום המלצה או ייעוץ להשקעה. כל החלטת השקעה צריכה להתבצע לאחר התייעצות עם אנשי מקצוע מוסמכים.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">4. מידע אישי</h2>
                  <p>
                    פרטים אישיים שנמסרים דרך האתר (טפסי יצירת קשר, לידים) משמשים אך ורק ליצירת קשר עם הגולש. איננו מעבירים מידע אישי לצדדים שלישיים ללא הסכמה. למידע נוסף ראו את <Link to="/privacy" className="text-gold hover:underline">מדיניות הפרטיות</Link> שלנו.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">5. קניין רוחני</h2>
                  <p>
                    כל התכנים באתר, לרבות טקסטים, עיצובים, תמונות ונתונים, מוגנים בזכויות יוצרים. אין להעתיק, לשכפל או להפיץ תכנים מהאתר ללא אישור מראש בכתב.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">6. הגבלת אחריות</h2>
                  <p>
                    האתר מוצע &quot;כמות שהוא&quot; (AS IS). אנו עושים מאמצים לוודא את דיוק המידע אך אינם אחראים לטעויות, אי-דיוקים או נזקים הנובעים מהסתמכות על המידע באתר.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">7. שינויים בתנאים</h2>
                  <p>
                    אנו שומרים לעצמנו את הזכות לעדכן תנאים אלו מעת לעת. המשך השימוש באתר לאחר עדכון מהווה הסכמה לתנאים המעודכנים.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-bold text-slate-100 mb-2">8. יצירת קשר</h2>
                  <p>
                    לכל שאלה בנוגע לתנאי השימוש, אנא <Link to="/contact" className="text-gold hover:underline">צרו קשר</Link>.
                  </p>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
