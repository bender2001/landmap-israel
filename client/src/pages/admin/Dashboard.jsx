import { useQuery } from '@tanstack/react-query'
import { adminDashboard } from '../../api/admin.js'
import { formatCurrency } from '../../utils/formatters.js'
import { leadStatusLabels, leadStatusColors } from '../../utils/constants.js'
import { Map, Users, TrendingUp, BarChart3, Clock } from 'lucide-react'
import Spinner from '../../components/ui/Spinner.jsx'

function KPICard({ icon: Icon, label, value, color = 'text-gold', subtext }) {
  return (
    <div className="glass-panel p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/5`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {subtext && <div className="text-xs text-slate-500">{subtext}</div>}
    </div>
  )
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminDashboard.stats,
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="w-10 h-10 text-gold" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-400">שגיאה בטעינת נתונים</p>
      </div>
    )
  }

  const stats = data || {}

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold text-slate-100 mb-6">דשבורד</h1>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          icon={Map}
          label="סה&quot;כ חלקות"
          value={stats.totalPlots ?? 0}
          color="text-blue-400"
        />
        <KPICard
          icon={Map}
          label="חלקות זמינות"
          value={stats.availablePlots ?? 0}
          color="text-emerald-400"
        />
        <KPICard
          icon={Users}
          label="לידים החודש"
          value={stats.leadsThisMonth ?? 0}
          color="text-gold"
        />
        <KPICard
          icon={TrendingUp}
          label="אחוז המרה"
          value={`${stats.conversionRate ?? 0}%`}
          color="text-purple-400"
        />
      </div>

      {/* Recent Leads */}
      <div className="glass-panel p-5">
        <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gold" />
          לידים אחרונים
        </h2>

        {stats.recentLeads?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="text-right py-2 px-3 font-medium">שם</th>
                  <th className="text-right py-2 px-3 font-medium">טלפון</th>
                  <th className="text-right py-2 px-3 font-medium">חלקה</th>
                  <th className="text-right py-2 px-3 font-medium">סטטוס</th>
                  <th className="text-right py-2 px-3 font-medium">תאריך</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-3 text-slate-200">{lead.full_name}</td>
                    <td className="py-2.5 px-3 text-slate-300" dir="ltr">{lead.phone}</td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {lead.plots?.block_number ? `גוש ${lead.plots.block_number}` : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background: (leadStatusColors[lead.status] || '#64748b') + '20',
                          color: leadStatusColors[lead.status] || '#94a3b8',
                        }}
                      >
                        {leadStatusLabels[lead.status] || lead.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-xs">
                      {new Date(lead.created_at).toLocaleDateString('he-IL')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-8">אין לידים עדיין</p>
        )}
      </div>
    </div>
  )
}
