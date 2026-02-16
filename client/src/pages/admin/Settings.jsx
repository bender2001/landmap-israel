import { useAuth } from '../../hooks/useAuth.jsx'
import { Settings as SettingsIcon, Mail, Globe, Shield, Bell, Server } from 'lucide-react'

export default function Settings() {
  const { user } = useAuth()

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-gold" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100">הגדרות</h1>
      </div>

      <div className="space-y-4">
        {/* Account info */}
        <div className="glass-panel p-5">
          <h2 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-gold" />
            פרטי חשבון
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">אימייל</span>
              <span className="text-sm text-slate-200" dir="ltr">{user?.email || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">תפקיד</span>
              <span className="text-sm text-gold font-medium">מנהל מערכת</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">מזהה</span>
              <span className="text-xs text-slate-500 font-mono" dir="ltr">{user?.id?.slice(0, 12)}...</span>
            </div>
          </div>
        </div>

        {/* Notification preferences */}
        <div className="glass-panel p-5">
          <h2 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-gold" />
            התראות
          </h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-sm text-slate-300">התראת ליד חדש באימייל</span>
              <div className="w-10 h-6 bg-gold/30 rounded-full relative">
                <div className="w-4 h-4 bg-gold rounded-full absolute top-1 right-1" />
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-sm text-slate-300">סיכום שבועי</span>
              <div className="w-10 h-6 bg-white/10 rounded-full relative">
                <div className="w-4 h-4 bg-slate-400 rounded-full absolute top-1 left-1" />
              </div>
            </label>
          </div>
          <p className="text-[10px] text-slate-600 mt-3">* הגדרות התראות ישמרו בקרוב</p>
        </div>

        {/* Platform config */}
        <div className="glass-panel p-5">
          <h2 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-gold" />
            הגדרות פלטפורמה
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">שם הפלטפורמה</span>
              <span className="text-sm text-slate-200">LandMap</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">אימייל יצירת קשר</span>
              <span className="text-sm text-slate-200" dir="ltr">info@landmap.co.il</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">שפה</span>
              <span className="text-sm text-slate-200">עברית (RTL)</span>
            </div>
          </div>
        </div>

        {/* System info */}
        <div className="glass-panel p-5">
          <h2 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
            <Server className="w-4 h-4 text-gold" />
            מידע מערכת
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">הגבלת בקשות</span>
              <span className="text-sm text-slate-200">200 / 15 דקות</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">גרסה</span>
              <span className="text-sm text-slate-200">1.0.0-beta</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">סביבה</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                {import.meta.env.MODE}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
