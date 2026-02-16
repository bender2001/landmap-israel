export default function TableSkeleton({ rows = 8, cols = 6 }) {
  return (
    <div className="glass-panel overflow-hidden animate-pulse">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="py-3 px-4">
                  <div className="h-3 bg-white/5 rounded-full w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r} className="border-b border-white/5">
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c} className="py-3 px-4">
                    <div
                      className="h-3 bg-white/5 rounded-full"
                      style={{ width: `${40 + Math.random() * 40}%` }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
