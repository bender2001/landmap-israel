export default function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto animate-pulse" dir="rtl">
      {/* Title */}
      <div className="h-7 bg-white/5 rounded-lg w-32 mb-6" />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-panel p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5" />
              <div className="h-3 bg-white/5 rounded-full w-16" />
            </div>
            <div className="h-7 bg-white/5 rounded-lg w-20" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="glass-panel p-5">
          <div className="h-4 bg-white/5 rounded-full w-40 mb-4" />
          <div className="flex items-end gap-[2px] h-32">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-white/5 rounded-t"
                style={{ height: `${10 + Math.random() * 80}%` }}
              />
            ))}
          </div>
        </div>
        <div className="glass-panel p-5">
          <div className="h-4 bg-white/5 rounded-full w-32 mb-4" />
          <div className="flex items-center gap-6">
            <div className="w-[120px] h-[120px] rounded-full bg-white/5" />
            <div className="space-y-2 flex-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/5" />
                  <div className="h-3 bg-white/5 rounded-full flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel p-5">
        <div className="h-4 bg-white/5 rounded-full w-28 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-white/5 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
