import { useQuery } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { adminDashboard } from '../../api/admin.js'
import { formatCurrency } from '../../utils/formatters.js'
import { leadStatusLabels, leadStatusColors, statusLabels, statusColors } from '../../utils/constants.js'
import { Map, Users, TrendingUp, BarChart3, Clock, ArrowLeft } from 'lucide-react'
import DashboardSkeleton from '../../components/ui/DashboardSkeleton.jsx'

function KPICard({ icon: Icon, label, value, color = 'text-gold', subtext, to }) {
  const content = (
    <>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/5`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {subtext && <div className="text-xs text-slate-500">{subtext}</div>}
    </>
  )

  if (to) {
    return (
      <Link to={to} className="glass-panel p-5 flex flex-col gap-3 hover:border-gold/30 transition-all cursor-pointer group">
        {content}
      </Link>
    )
  }

  return (
    <div className="glass-panel p-5 flex flex-col gap-3">
      {content}
    </div>
  )
}

// Simple bar chart using CSS
function LeadsBarChart({ data = [] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="glass-panel p-5">
      <h2 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-gold" />
        לידים — 30 ימים אחרונים
      </h2>
      <div className="flex items-end gap-[2px] h-32">
        {data.map((d, i) => {
          const h = maxCount > 0 ? (d.count / maxCount) * 100 : 0
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
              <div
                className="w-full rounded-t bg-gradient-to-t from-gold to-gold-bright transition-all hover:opacity-80"
                style={{ height: `${Math.max(h, 2)}%`, minHeight: d.count > 0 ? '4px' : '1px' }}
              />
              {/* Tooltip */}
              <div className="absolute -top-8 hidden group-hover:block bg-navy-mid border border-white/10 rounded px-2 py-1 text-[9px] text-slate-300 whitespace-nowrap z-10">
                {d.date.slice(5)}: {d.count}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between mt-2 text-[9px] text-slate-600">
        <span>{data[0]?.date?.slice(5)}</span>
        <span>{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  )
}

// Simple donut chart using SVG
function StatusDonut({ data = {}, labels = {}, colors = {}, title }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0)
  const total = entries.reduce((sum, [, v]) => sum + v, 0)

  if (total === 0) {
    return (
      <div className="glass-panel p-5">
        <h2 className="text-base font-bold text-slate-100 mb-4">{title}</h2>
        <p className="text-sm text-slate-500 text-center py-4">אין נתונים</p>
      </div>
    )
  }

  // Calculate arcs
  const size = 120
  const center = size / 2
  const radius = 45
  const strokeWidth = 16
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="glass-panel p-5">
      <h2 className="text-base font-bold text-slate-100 mb-4">{title}</h2>
      <div className="flex items-center gap-6">
        <svg width={size} height={size} className="flex-shrink-0">
          {entries.map(([key, count]) => {
            const pct = count / total
            const dashLength = pct * circumference
            const dashOffset = -offset
            offset += dashLength
            return (
              <circle
                key={key}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={colors[key] || '#64748b'}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${center} ${center})`}
                className="transition-all"
              />
            )
          })}
          <text x={center} y={center} textAnchor="middle" dominantBaseline="central" className="fill-slate-200 text-lg font-bold">
            {total}
          </text>
        </svg>
        <div className="space-y-1.5 flex-1 min-w-0">
          {entries.map(([key, count]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: colors[key] || '#64748b' }} />
              <span className="text-xs text-slate-400 flex-1 truncate">{labels[key] || key}</span>
              <span className="text-xs text-slate-300 font-medium">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Horizontal bar chart
function HorizontalBarChart({ data = {}, labels = {}, colors = {}, title }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0)
  const maxCount = Math.max(...entries.map(([, v]) => v), 1)

  return (
    <div className="glass-panel p-5">
      <h2 className="text-base font-bold text-slate-100 mb-4">{title}</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">אין נתונים</p>
      ) : (
        <div className="space-y-3">
          {entries.map(([key, count]) => (
            <div key={key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">{labels[key] || key}</span>
                <span className="text-slate-300 font-medium">{count}</span>
              </div>
              <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(count / maxCount) * 100}%`,
                    background: colors[key] || '#C8942A',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminDashboard.stats,
    staleTime: 60_000,
  })

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-400">שגיאה בטעינת נתונים</p>
      </div>
    )
  }

  const stats = data || {}
  const charts = stats.charts || {}

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
          to="/admin/plots"
        />
        <KPICard
          icon={Map}
          label="חלקות זמינות"
          value={stats.availablePlots ?? 0}
          color="text-emerald-400"
          to="/admin/plots"
        />
        <KPICard
          icon={Users}
          label="לידים החודש"
          value={stats.leadsThisMonth ?? 0}
          color="text-gold"
          to="/admin/leads"
        />
        <KPICard
          icon={TrendingUp}
          label="אחוז המרה"
          value={`${stats.conversionRate ?? 0}%`}
          color="text-purple-400"
          to="/admin/leads"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <LeadsBarChart data={charts.leadsByDay} />
        <StatusDonut
          data={charts.leadsByStatus}
          labels={leadStatusLabels}
          colors={leadStatusColors}
          title="לידים לפי סטטוס"
        />
      </div>

      <div className="mb-8">
        <HorizontalBarChart
          data={charts.plotsByStatus}
          labels={statusLabels}
          colors={statusColors}
          title="חלקות לפי סטטוס"
        />
      </div>

      {/* Recent Leads */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gold" />
            לידים אחרונים
          </h2>
          <Link to="/admin/leads" className="text-xs text-gold hover:underline flex items-center gap-1">
            הצג הכל
            <ArrowLeft className="w-3 h-3" />
          </Link>
        </div>

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
                  <tr
                    key={lead.id}
                    onClick={() => navigate(`/admin/leads/${lead.id}`)}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                  >
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
