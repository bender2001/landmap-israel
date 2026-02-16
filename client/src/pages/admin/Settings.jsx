import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminSettings } from '../../api/admin.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import { Settings as SettingsIcon, Globe, Shield, Bell, Server, Save, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useToast } from '../../components/ui/ToastContainer.jsx'

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-10 h-6 rounded-full relative transition-colors ${
        checked ? 'bg-gold/30' : 'bg-white/10'
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full absolute top-1 transition-all ${
          checked ? 'right-1 bg-gold' : 'left-1 bg-slate-400'
        }`}
      />
    </button>
  )
}

export default function Settings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [localSettings, setLocalSettings] = useState(null)
  const [dirty, setDirty] = useState(false)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: adminSettings.get,
  })

  useEffect(() => {
    if (settings && !localSettings) {
      setLocalSettings(settings)
    }
  }, [settings, localSettings])

  const saveMutation = useMutation({
    mutationFn: (data) => adminSettings.update(data),
    onSuccess: (data) => {
      queryClient.setQueryData(['admin', 'settings'], data)
      setLocalSettings(data)
      setDirty(false)
      toast('הגדרות נשמרו', 'success')
    },
    onError: () => toast('שגיאה בשמירה', 'error'),
  })

  const handleToggle = (key, value) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const handleTextChange = (key, value) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const handleSave = () => {
    if (!localSettings) return
    saveMutation.mutate(localSettings)
  }

  const s = localSettings || settings || {}

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-gold" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">הגדרות</h1>
        </div>
        {dirty && (
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold to-gold-bright rounded-xl text-navy font-bold text-sm hover:shadow-lg hover:shadow-gold/30 transition disabled:opacity-60"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            שמור שינויים
          </button>
        )}
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
            <label className="flex items-center justify-between">
              <span className="text-sm text-slate-300">התראת ליד חדש באימייל</span>
              <Toggle
                checked={!!s.notify_new_lead}
                onChange={(v) => handleToggle('notify_new_lead', v)}
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-slate-300">סיכום שבועי</span>
              <Toggle
                checked={!!s.notify_weekly_summary}
                onChange={(v) => handleToggle('notify_weekly_summary', v)}
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-slate-300">הקצאת לידים אוטומטית</span>
              <Toggle
                checked={!!s.lead_auto_assign}
                onChange={(v) => handleToggle('lead_auto_assign', v)}
              />
            </label>
          </div>
        </div>

        {/* Platform config */}
        <div className="glass-panel p-5">
          <h2 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-gold" />
            הגדרות פלטפורמה
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">שם הפלטפורמה</label>
              <input
                type="text"
                value={s.platform_name || ''}
                onChange={(e) => handleTextChange('platform_name', e.target.value)}
                className="w-full px-3 py-2.5 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 focus:border-gold/50 focus:outline-none transition text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">אימייל יצירת קשר</label>
              <input
                type="email"
                dir="ltr"
                value={s.contact_email || ''}
                onChange={(e) => handleTextChange('contact_email', e.target.value)}
                className="w-full px-3 py-2.5 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 focus:border-gold/50 focus:outline-none transition text-sm"
              />
            </div>
            <label className="flex items-center justify-between">
              <span className="text-sm text-slate-300">מצב תחזוקה</span>
              <Toggle
                checked={!!s.maintenance_mode}
                onChange={(v) => handleToggle('maintenance_mode', v)}
              />
            </label>
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
